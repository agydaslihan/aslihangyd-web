import type { Payload, TypedUser } from 'payload'

import { overpassDene } from '@/lib/osm/istemci'
import { HazirlikDeposu } from '@/lib/osm/hazirlikDeposu'

import {
  gruplaraBol,
  ILCE_ADI,
  merkezAdaylariniCoz,
  sinirCevabiniCoz,
  sinirGeometriSorgusu,
  sinirKimlikleriniCoz,
  sinirKimlikSorgusu,
  type MerkezAdayi,
  type SinirAdayi,
  type SinirKimligi,
} from './sinirSorgusu'
import { AZAMI_SINIR, type SinirCozumlemesi } from './sinirSorgusu'

/**
 * Mahalle sınırı içe aktarma — çekirdek.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ LİSANS — ODbL, ATIF ZORUNLU
 *
 * Sınır poligonları da POI'ler gibi OpenStreetMap verisidir. Türetilmiş
 * veriyi yayınlamak serbest ama atıf zorunlu: sınırların göründüğü her
 * yerde "© OpenStreetMap katkıcıları" ibaresi var ve lisans açıklaması
 * `/veri-kaynaklari` sayfasında yayınlanıyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ELLE ÇİZİLEN YA DA DÜZELTİLEN SINIR EZİLMEZ
 *
 * İki ayrı koruma var ve ikisi de gerekli:
 *  · `sinirElleDuzenlendi` — OSM'den gelmiş bir sınır sonradan düzeltilmiş
 *  · `sinirKaynagi !== 'osm'` ve sınır dolu — sınır en baştan elle çizilmiş
 *
 * İkincisi olmasaydı geojson.io'da çizilmiş bir sınır ilk içe aktarmada
 * sessizce silinirdi; birincisi olmasaydı düzeltme emeği her seferinde
 * çöpe giderdi.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type SinirIslemi =
  /** Mahallede sınır yok — yazılacak. */
  | 'yeni'
  /** Sınır OSM'den gelmişti — tazelenecek. */
  | 'guncellenecek'
  /** Elle çizilmiş ya da düzeltilmiş — dokunulmayacak. */
  | 'korunacak'
  /** Bu adla sistemde mahalle yok — yazılmayacak. */
  | 'eslesmedi'

export interface SinirSatiri {
  aday: SinirAdayi
  islem: SinirIslemi
  mahalleId?: number
  mahalleAdi?: string
  /** Merkez noktası da yazılacak mı — elle girilmiş merkez korunur. */
  merkeziYaz: boolean
}

export interface SinirOnizlemesi {
  satirlar: SinirSatiri[]
  yeniSayisi: number
  guncellenecekSayisi: number
  korunacakSayisi: number
  eslesmeyenSayisi: number
  /**
   * Sistemde olup OSM'de sınırı bulunamayan mahalleler.
   *
   * ⚠️ Sessizce geçilmiyor: OSM'de Türkiye mahalle sınırı kapsaması
   * düzensizdir ve eksik kalan mahalleyi bilmek, elle çizme kararının
   * girdisidir.
   */
  sinirsizMahalleler: { id: number; ad: string }[]
  /**
   * İkinci kademe: sınırı yok ama merkezi yerleşim noktasından gelecek olanlar.
   *
   * ⚠️ Bunlar `sinirsizMahalleler` içinde de görünür — orası "poligonu yok"
   * listesi, burası "yine de merkezi olacak" listesi. İkisi farklı soruların
   * cevabı ve birbirinin yerine geçmez.
   */
  merkezSatirlari: MerkezSatiri[]
  /**
   * Hiçbir kaynaktan konum bulunamayan mahalleler.
   *
   * ⚠️ Bu liste boş bırakılan veridir, uydurulmayan veridir. Koordinat
   * tahmin etmektense mahalleyi konumsuz bırakmak tercih ediliyor.
   */
  kaynaksizMahalleler: { id: number; ad: string }[]
  ozet: SinirCozumlemesi
  /** Gönderilen sorgu — panelde gösterilir, ne sorduğumuz görünür olsun. */
  sorgu: string
}

/** Sınırı olmayan ama yerleşim noktasından merkezi çözülen mahalle. */
export interface MerkezSatiri {
  aday: MerkezAdayi
  mahalleId: number
  mahalleAdi: string
}

export type SinirDurumu =
  | { durum: 'hata'; mesaj: string }
  | { durum: 'mahalle_yok' }
  | { durum: 'hazir'; onizleme: SinirOnizlemesi }

/* ══════════════════════════════════════════════════════════════════════════
   Parçalı hazırlık — 1. faz kimlikler, 2. faz gruplu geometri
   ══════════════════════════════════════════════════════════════════════════ */

/** Bir kullanıcının yarım kalmış içe aktarması. */
export interface SinirHazirligi {
  ilceAdi: string
  gruplar: SinirKimligi[][]
  /** Sırası tamamlanan grupların indeksi. */
  tamamlanan: Set<number>
  /** Şimdiye kadar çözülen sınır adayları — grup indeksine göre. */
  adaylar: Map<number, SinirAdayi[]>
  merkezAdaylari: MerkezAdayi[]
  ozet: SinirCozumlemesi
  sorgu: string
}

const depo = new HazirlikDeposu<SinirHazirligi>()

export type HazirlikDurumu =
  | { durum: 'mahalle_yok' }
  | { durum: 'yeniden_denenebilir'; mesaj: string }
  | { durum: 'hata'; mesaj: string }
  | { durum: 'hazir'; grupSayisi: number; sinirSayisi: number; merkezSayisi: number; sorgu: string }

/**
 * 1. faz — ilçedeki sınır kimlikleri ve yer düğümleri.
 *
 * ⚠️ Bu sorgu geometri İSTEMİYOR (`out tags;`). Ağır olan üye koordinatları
 * 2. fazda, gruplar hâlinde çekiliyor. 504'ün asıl sebebi tek büyük sorguydu.
 */
export async function sinirHazirligiBaslat(
  payload: Payload,
  user: TypedUser,
  denemeSirasi = 1,
  ilceAdi: string = ILCE_ADI,
): Promise<HazirlikDurumu> {
  const mahalleler = await mahalleleriGetir(payload, user)
  if (mahalleler.length === 0) return { durum: 'mahalle_yok' }

  const sorgu = sinirKimlikSorgusu(ilceAdi)
  const cevap = await overpassDene(sorgu, { denemeSirasi, zamanAsimiMs: 90_000 })

  if (cevap.durum !== 'tamam') return { durum: cevap.durum, mesaj: cevap.mesaj }

  const kimlikler = sinirKimlikleriniCoz(cevap.veri)
  if (kimlikler.length > AZAMI_SINIR) {
    return {
      durum: 'hata',
      mesaj:
        `Sorgu ${kimlikler.length} sınır döndürdü; tek seferde en fazla ${AZAMI_SINIR} ` +
        'işleniyor. İlçe adı yanlış yazılmış olabilir.',
    }
  }

  const gruplar = gruplaraBol(kimlikler)
  const merkezAdaylari = merkezAdaylariniCoz(cevap.veri)

  depo.yaz(kullaniciAnahtari(user), {
    ilceAdi,
    gruplar,
    tamamlanan: new Set(),
    adaylar: new Map(),
    merkezAdaylari,
    ozet: { adaylar: [], adsizAtlandi: 0, geometrisizAtlandi: 0 },
    sorgu,
  })

  return {
    durum: 'hazir',
    grupSayisi: gruplar.length,
    sinirSayisi: kimlikler.length,
    merkezSayisi: merkezAdaylari.length,
    sorgu,
  }
}

export type GrupDurumu =
  | { durum: 'hazirlik_yok' }
  | { durum: 'yeniden_denenebilir'; mesaj: string }
  | { durum: 'hata'; mesaj: string }
  | { durum: 'tamam'; gelen: number; atlanan: number }

/**
 * 2. faz — tek grubun geometrisi.
 *
 * ⚠️ Sonuç istemciye DÖNMÜYOR, depoda birikiyor. İstemci yalnızca sayıları
 * görüyor; poligonlar sunucudan hiç çıkmıyor.
 */
export async function sinirGrubunuGetir(
  user: TypedUser,
  grupSirasi: number,
  denemeSirasi = 1,
): Promise<GrupDurumu> {
  const hazirlik = depo.oku(kullaniciAnahtari(user))
  if (!hazirlik) return { durum: 'hazirlik_yok' }

  const grup = hazirlik.gruplar[grupSirasi]
  if (!grup) return { durum: 'hata', mesaj: `${grupSirasi}. grup bulunamadı.` }

  // Zaten gelmişse tekrar sorma — nezaket ve hız.
  if (hazirlik.tamamlanan.has(grupSirasi)) {
    return { durum: 'tamam', gelen: hazirlik.adaylar.get(grupSirasi)?.length ?? 0, atlanan: 0 }
  }

  // `dagitim`: her grup farklı aynadan başlasın; hepsi birinci sunucuya
  // yığılmasın. Ölçümde 429'un sebebi tam olarak buydu.
  const cevap = await overpassDene(sinirGeometriSorgusu(grup), {
    denemeSirasi,
    dagitim: grupSirasi,
    zamanAsimiMs: 120_000,
  })
  if (cevap.durum !== 'tamam') return { durum: cevap.durum, mesaj: cevap.mesaj }

  /**
   * ─────────────────────────────────────────────────────────────────────
   * ⚠️ BOŞ CEVAP BAŞARI DEĞİLDİR — BÖLGESEL AYNA KAPISI.
   *
   * Bu sorgu ADI SANI BELLİ kimlikleri istiyor; onların var olduğunu 1.
   * fazda gördük. Sıfır öğe dönmesinin tek makul açıklaması, sorulan
   * sunucunun o bölgeyi hiç tanımaması.
   *
   * Gerçekten yaşandı: `overpass.osm.ch` Türkiye kimlikleri için HTTP 200
   * ve boş `elements` döndürüyor — hata yok, `remark` yok. Bu kapı olmasa
   * o cevap "grup başarıyla geldi, içinde sınır yokmuş" diye kaydedilir ve
   * mahalleler sessizce sınırsız kalırdı.
   *
   * Geçici sayılıyor: bir sonraki deneme başka aynaya gidiyor ve oradan
   * gerçek veri geliyor.
   * ─────────────────────────────────────────────────────────────────────
   */
  const gelenOgeSayisi = Array.isArray((cevap.veri as { elements?: unknown })?.elements)
    ? ((cevap.veri as { elements: unknown[] }).elements.length ?? 0)
    : 0

  if (gelenOgeSayisi === 0 && grup.length > 0) {
    return {
      durum: 'yeniden_denenebilir',
      mesaj:
        `${cevap.sunucu} istenen ${grup.length} kaydın hiçbirini döndürmedi. ` +
        'Bu sunucu bölgesel olabilir (yalnızca belirli bir ülkeyi sunuyor); başka ayna deneniyor.',
    }
  }

  const cozum = sinirCevabiniCoz(cevap.veri)

  hazirlik.adaylar.set(grupSirasi, cozum.adaylar)
  hazirlik.tamamlanan.add(grupSirasi)
  hazirlik.ozet = {
    adaylar: [...hazirlik.adaylar.values()].flat(),
    adsizAtlandi: hazirlik.ozet.adsizAtlandi + cozum.adsizAtlandi,
    geometrisizAtlandi: hazirlik.ozet.geometrisizAtlandi + cozum.geometrisizAtlandi,
  }

  return {
    durum: 'tamam',
    gelen: cozum.adaylar.length,
    atlanan: cozum.adsizAtlandi + cozum.geometrisizAtlandi,
  }
}

/** Payload kullanıcısının depo anahtarı. */
function kullaniciAnahtari(user: TypedUser): string | number {
  const kimlik = (user as { id?: string | number } | null)?.id
  return kimlik ?? 'oturumsuz'
}

interface MahalleKaydi {
  id: number
  ad: string
  slug: string
  sinirVar: boolean
  merkezVar: boolean
  sinirKaynagi: unknown
  sinirElleDuzenlendi: boolean
}

async function mahalleleriGetir(payload: Payload, user: TypedUser): Promise<MahalleKaydi[]> {
  const sonuc = await payload.find({
    collection: 'mahalleler',
    limit: 500,
    depth: 0,
    sort: 'ad',
    user,
    overrideAccess: false,
  })

  return sonuc.docs.map((kayit) => ({
    id: kayit.id as number,
    ad: String(kayit.ad ?? ''),
    slug: String(kayit.slug ?? ''),
    sinirVar: kayit.sinir !== null && kayit.sinir !== undefined,
    merkezVar: Array.isArray(kayit.merkez) && kayit.merkez.length >= 2,
    sinirKaynagi: kayit.sinirKaynagi,
    sinirElleDuzenlendi: kayit.sinirElleDuzenlendi === true,
  }))
}

/** Bir mahalle kaydına hangi işlem uygulanmalı? */
function islemiBelirle(mahalle: MahalleKaydi): SinirIslemi {
  if (mahalle.sinirElleDuzenlendi) return 'korunacak'
  // Elle çizilmiş sınır — kaynağı OSM değil ve dolu.
  if (mahalle.sinirVar && mahalle.sinirKaynagi !== 'osm') return 'korunacak'
  return mahalle.sinirVar ? 'guncellenecek' : 'yeni'
}

/**
 * Önizleme hazırlar — hiçbir şey yazmaz.
 */
export async function sinirOnizlemesiHazirla(
  payload: Payload,
  user: TypedUser,
): Promise<SinirDurumu> {
  const mahalleler = await mahalleleriGetir(payload, user)
  if (mahalleler.length === 0) return { durum: 'mahalle_yok' }

  /**
   * ⚠️ Overpass'a BURADA SORULMUYOR. Veri parçalı hazırlıkta toplandı ve
   * depoda duruyor. Eski akış önizlemede bir kez, yazmada bir kez daha
   * sorguluyordu — paylaşımlı bir kaynağa iki kat yük ve 504 için iki kat
   * fırsat.
   */
  const hazirlik = depo.oku(kullaniciAnahtari(user))
  if (!hazirlik) {
    return {
      durum: 'hata',
      mesaj:
        'Hazırlık bulunamadı ya da zaman aşımına uğradı. "Sınırları önizle" ile baştan başlayın.',
    }
  }

  const ozet = hazirlik.ozet
  const merkezAdaylari = hazirlik.merkezAdaylari
  const sorgu = hazirlik.sorgu

  if (ozet.adaylar.length > AZAMI_SINIR) {
    return {
      durum: 'hata',
      mesaj:
        `Sorgu ${ozet.adaylar.length} sınır döndürdü; tek seferde en fazla ${AZAMI_SINIR} ` +
        'işleniyor. İlçe adı yanlış yazılmış olabilir.',
    }
  }

  const slugHaritasi = new Map(mahalleler.map((mahalle) => [mahalle.slug, mahalle]))
  const eslesenIdler = new Set<number>()

  const satirlar: SinirSatiri[] = ozet.adaylar.map((aday) => {
    const mahalle = slugHaritasi.get(aday.slug)
    if (!mahalle) return { aday, islem: 'eslesmedi' as const, merkeziYaz: false }

    eslesenIdler.add(mahalle.id)
    const islem = islemiBelirle(mahalle)

    return {
      aday,
      islem,
      mahalleId: mahalle.id,
      mahalleAdi: mahalle.ad,
      /**
       * ⚠️ Elle girilmiş merkez korunur.
       *
       * Merkez, mahalle sayfasındaki haritanın odağıdır ve Aslıhan onu
       * "meydanın orası" diye bilinçli seçmiş olabilir. Sınırın geometrik
       * merkezi ile bu aynı nokta değildir; birini diğerinin üzerine
       * yazmak bir düzeltme değil, bir bilgi kaybı olurdu.
       */
      merkeziYaz: !mahalle.merkezVar || mahalle.sinirKaynagi === 'osm',
    }
  })

  const sinirsiz = mahalleler.filter((mahalle) => !eslesenIdler.has(mahalle.id))

  /**
   * İkinci kademe — sınırı olmayana yerleşim noktasından merkez.
   *
   * ⚠️ Yalnızca merkezi BOŞ olanlara bakılıyor. Elle girilmiş bir merkezin
   * üzerine yer düğümü yazmak, bilinçli bir seçimi (Aslıhan "meydanın orası"
   * demiş olabilir) gönüllü katkısıyla ezmek olurdu — sınır tarafındaki
   * `merkeziYaz` korumasının aynısı.
   */
  const merkezHaritasi = new Map(merkezAdaylari.map((aday) => [aday.slug, aday]))
  const merkezSatirlari: MerkezSatiri[] = []

  for (const mahalle of sinirsiz) {
    if (mahalle.merkezVar) continue
    const aday = merkezHaritasi.get(mahalle.slug)
    if (!aday) continue
    merkezSatirlari.push({ aday, mahalleId: mahalle.id, mahalleAdi: mahalle.ad })
  }

  const merkezliIdler = new Set(merkezSatirlari.map((satir) => satir.mahalleId))

  return {
    durum: 'hazir',
    onizleme: {
      satirlar,
      sorgu,
      ozet,
      merkezSatirlari,
      yeniSayisi: satirlar.filter((satir) => satir.islem === 'yeni').length,
      guncellenecekSayisi: satirlar.filter((satir) => satir.islem === 'guncellenecek').length,
      korunacakSayisi: satirlar.filter((satir) => satir.islem === 'korunacak').length,
      eslesmeyenSayisi: satirlar.filter((satir) => satir.islem === 'eslesmedi').length,
      sinirsizMahalleler: sinirsiz.map(({ id, ad }) => ({ id, ad })),
      /**
       * ⚠️ Ne sınırı ne yer düğümü olan — ve merkezi de zaten boş olan.
       * Merkezi dolu olan bir mahalle burada listelenmez: konumu vardır,
       * yalnızca poligonu yoktur.
       */
      kaynaksizMahalleler: sinirsiz
        .filter((mahalle) => !mahalle.merkezVar && !merkezliIdler.has(mahalle.id))
        .map(({ id, ad }) => ({ id, ad })),
    },
  }
}

export interface SinirYazmaSonucu {
  yazilan: number
  korunan: number
  eslesmeyen: number
  merkeziKorunan: number
  /** Sınırı olmadığı hâlde yerleşim noktasından merkezi yazılanlar. */
  merkezYazilan: number
  /** Hiçbir kaynaktan konum bulunamayanlar — boş bırakıldı, uydurulmadı. */
  kaynaksiz: { id: number; ad: string }[]
  hatalar: { ad: string; mesaj: string }[]
}

/**
 * Sınırları yazar.
 *
 * ⚠️ Önizleme İSTEMCİDEN GELMEZ — sunucuda yeniden kuruluyor. Aksi hâlde
 * ağ isteğini düzenleyen biri, panelde gördüğünden bambaşka bir poligonu
 * mahalleye yazdırabilirdi. İstemcinin tek etkisi düğmeye basmak.
 *
 * ⚠️ `context.sinirIceAktarma = true`: bu bayrak olmadan
 * `sinirElleDuzenlemeIzi` kancası içe aktarıcının kendi yazmasını "insan
 * düzeltmesi" sanar ve her mahalleyi elle düzeltilmiş işaretlerdi — ikinci
 * içe aktarmada hiçbir sınır güncellenemezdi.
 */
export async function sinirlariYaz(
  payload: Payload,
  user: TypedUser,
): Promise<{ basarili: boolean; mesaj?: string; sonuc?: SinirYazmaSonucu }> {
  const durum = await sinirOnizlemesiHazirla(payload, user)

  if (durum.durum === 'mahalle_yok') {
    return { basarili: false, mesaj: 'Sistemde hiç mahalle kaydı yok.' }
  }
  if (durum.durum === 'hata') return { basarili: false, mesaj: durum.mesaj }

  const sonuc: SinirYazmaSonucu = {
    yazilan: 0,
    korunan: 0,
    eslesmeyen: 0,
    merkeziKorunan: 0,
    merkezYazilan: 0,
    kaynaksiz: durum.onizleme.kaynaksizMahalleler,
    hatalar: [],
  }

  for (const satir of durum.onizleme.satirlar) {
    if (satir.islem === 'korunacak') {
      sonuc.korunan += 1
      continue
    }
    if (satir.islem === 'eslesmedi' || satir.mahalleId === undefined) {
      sonuc.eslesmeyen += 1
      continue
    }

    if (!satir.merkeziYaz) sonuc.merkeziKorunan += 1

    try {
      await payload.update({
        collection: 'mahalleler',
        id: satir.mahalleId,
        data: {
          // Payload'ın `json` alanı düz bir kayıt bekliyor; ayrık birleşim
          // tipi oraya doğrudan geçmiyor. Alanlar tek tek yazılıyor ki
          // dönüşüm `as any` ile değil, görünür biçimde yapılsın.
          sinir: {
            type: satir.aday.geometri.type,
            coordinates: satir.aday.geometri.coordinates,
          },
          sinirKaynagi: 'osm',
          sinirOsmKimlik: satir.aday.osmKimlik,
          ...(satir.merkeziYaz ? { merkez: satir.aday.merkez } : {}),
        },
        user,
        overrideAccess: false,
        context: { sinirIceAktarma: true },
      })
      sonuc.yazilan += 1
    } catch (hata) {
      sonuc.hatalar.push({
        ad: satir.mahalleAdi ?? satir.aday.osmAdi,
        mesaj: hata instanceof Error ? hata.message : 'bilinmeyen hata',
      })
    }
  }

  /**
   * ── İkinci kademe: yalnızca merkez ──
   *
   * ⚠️ `sinir` alanına DOKUNULMUYOR. Yer düğümü bir noktadır; ondan poligon
   * uydurmak (örneğin çevresine bir daire çizmek) haritada gerçek sanılan
   * sahte bir alan gösterirdi. Merkez var, sınır yok — ekranda da böyle
   * görünüyor.
   */
  for (const satir of durum.onizleme.merkezSatirlari) {
    try {
      await payload.update({
        collection: 'mahalleler',
        id: satir.mahalleId,
        data: { merkez: satir.aday.merkez },
        user,
        overrideAccess: false,
        context: { sinirIceAktarma: true },
      })
      sonuc.merkezYazilan += 1
    } catch (hata) {
      sonuc.hatalar.push({
        ad: satir.mahalleAdi,
        mesaj: hata instanceof Error ? hata.message : 'bilinmeyen hata',
      })
    }
  }

  /**
   * ⚠️ Hazırlık yazıldıktan sonra düşürülüyor.
   *
   * Kalsaydı ikinci kez "Yaz" basmak aynı bayat geometriyi tekrar yazardı
   * ve panel bunu yeni bir içe aktarma sanardı. Bir sonraki içe aktarma
   * OSM'e yeniden sorsun.
   */
  depo.sil(kullaniciAnahtari(user))

  return { basarili: true, sonuc }
}
