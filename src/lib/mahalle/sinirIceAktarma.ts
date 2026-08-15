import type { Payload, TypedUser } from 'payload'

import { ILCE_ADI, sinirCevabiniCoz, sinirSorgusu, type SinirAdayi } from './sinirSorgusu'
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

const OVERPASS_ADRESI =
  process.env.OVERPASS_ADRESI?.trim() || 'https://overpass-api.de/api/interpreter'

/**
 * Ağ zaman aşımı.
 *
 * POI sorgusundan uzun: sınır sorgusu üye yolların bütün koordinatlarını
 * (`out geom`) getiriyor ve `map_to_area` ilçe poligonunu ayrıca çözüyor.
 */
const ZAMAN_ASIMI_MS = 180_000

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
  ozet: SinirCozumlemesi
  /** Gönderilen sorgu — panelde gösterilir, ne sorduğumuz görünür olsun. */
  sorgu: string
}

export type SinirDurumu =
  | { durum: 'hata'; mesaj: string }
  | { durum: 'mahalle_yok' }
  | { durum: 'hazir'; onizleme: SinirOnizlemesi }

/** Overpass'a sorar ve cevabı çözer. */
async function overpasstanGetir(sorgu: string): Promise<SinirCozumlemesi> {
  const kontrol = new AbortController()
  const zamanlayici = setTimeout(() => kontrol.abort(), ZAMAN_ASIMI_MS)

  try {
    const cevap = await fetch(OVERPASS_ADRESI, {
      method: 'POST',
      body: new URLSearchParams({ data: sorgu }),
      headers: {
        // ⚠️ Overpass kullanım politikası kendini tanıtmayı istiyor.
        'User-Agent': 'aslihangyd.com mahalle siniri ice aktarma (iletisim: site sahibi)',
      },
      signal: kontrol.signal,
    })

    if (!cevap.ok) throw new Error(`Overpass ${cevap.status} döndü.`)

    return sinirCevabiniCoz(await cevap.json())
  } finally {
    clearTimeout(zamanlayici)
  }
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
  ilceAdi: string = ILCE_ADI,
): Promise<SinirDurumu> {
  const mahalleler = await mahalleleriGetir(payload, user)
  if (mahalleler.length === 0) return { durum: 'mahalle_yok' }

  const sorgu = sinirSorgusu(ilceAdi)

  let ozet: SinirCozumlemesi
  try {
    ozet = await overpasstanGetir(sorgu)
  } catch (hata) {
    return {
      durum: 'hata',
      mesaj:
        hata instanceof Error && hata.name === 'AbortError'
          ? 'OpenStreetMap sunucusu zamanında yanıt vermedi. Sınır sorgusu ağırdır; ' +
            'birkaç dakika sonra tekrar deneyin.'
          : `OpenStreetMap sunucusuna ulaşılamadı: ${hata instanceof Error ? hata.message : 'bilinmeyen hata'}`,
    }
  }

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

  return {
    durum: 'hazir',
    onizleme: {
      satirlar,
      sorgu,
      ozet,
      yeniSayisi: satirlar.filter((satir) => satir.islem === 'yeni').length,
      guncellenecekSayisi: satirlar.filter((satir) => satir.islem === 'guncellenecek').length,
      korunacakSayisi: satirlar.filter((satir) => satir.islem === 'korunacak').length,
      eslesmeyenSayisi: satirlar.filter((satir) => satir.islem === 'eslesmedi').length,
      sinirsizMahalleler: mahalleler
        .filter((mahalle) => !eslesenIdler.has(mahalle.id))
        .map(({ id, ad }) => ({ id, ad })),
    },
  }
}

export interface SinirYazmaSonucu {
  yazilan: number
  korunan: number
  eslesmeyen: number
  merkeziKorunan: number
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
  ilceAdi: string = ILCE_ADI,
): Promise<{ basarili: boolean; mesaj?: string; sonuc?: SinirYazmaSonucu }> {
  const durum = await sinirOnizlemesiHazirla(payload, user, ilceAdi)

  if (durum.durum === 'mahalle_yok') {
    return { basarili: false, mesaj: 'Sistemde hiç mahalle kaydı yok.' }
  }
  if (durum.durum === 'hata') return { basarili: false, mesaj: durum.mesaj }

  const sonuc: SinirYazmaSonucu = {
    yazilan: 0,
    korunan: 0,
    eslesmeyen: 0,
    merkeziKorunan: 0,
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

  return { basarili: true, sonuc }
}
