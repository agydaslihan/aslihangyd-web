import type { Payload, TypedUser } from 'payload'

import { HazirlikDeposu } from './hazirlikDeposu'
import { overpassDene } from './istemci'
import { merkezlerdenKutu, kutuMakulMu, overpassCevabiniCoz, overpassSorgusu } from './sorgu'
import type { CozumlemeOzeti, Kutu, OsmAdayi } from './sorgu'

/**
 * OpenStreetMap POI içe aktarma — çekirdek.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ LİSANS — ODbL, ATIF ZORUNLU
 *
 * OpenStreetMap verisi Open Database License altında. Türetilmiş veriyi
 * yayınlamak serbest ama **atıf zorunlu**: POI verisinin göründüğü her
 * yerde "© OpenStreetMap katkıcıları" ibaresi var ve lisans açıklaması
 * `/veri-kaynaklari` sayfasında yayınlanıyor.
 *
 * ⚠️ Bu, CLAUDE.md kural 6'daki scraping yasağıyla çelişmez. Yasak, ilan
 * platformlarının kullanım koşullarını ihlal eden otomatik veri çekmeye
 * ait. OSM açık veridir ve yeniden kullanım için lisanslanmıştır; üstelik
 * Overpass API bu iş için yapılmış resmî arayüzdür.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ELLE DÜZELTİLEN KAYIT EZİLMEZ
 *
 * OSM'de eksik ve yanlış kayıt olur. Bir noktanın adını ya da konumunu
 * düzelttiğinizde, bir sonraki içe aktarma onu OSM'deki hâline geri
 * çevirseydi düzeltme emeği her seferinde çöpe giderdi.
 *
 * `elleDuzenlendi` işaretli kayıtlar ATLANIR ve raporda "korundu" olarak
 * sayılır. İşaret, kaydı panelden düzenleyen ilk kişide kendiliğinden
 * konur (`osmElleDuzenlemeIzi` kancası).
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Overpass uç noktası — ayarlanmadıysa herkese açık sunucu.
 *
 * ⚠️ `??` DEĞİL `||` — fark burada gerçek bir arızaya karşılık geliyor.
 *
 * `compose.prod.yml` bu değişkeni `${OVERPASS_ADRESI:-}` ile geçiyor, yani
 * ayarlanmadığında kaba **boş dize** olarak ulaşıyor. `??` yalnızca
 * `undefined`/`null` durumunda yedeğe düşer; boş dize "tanımlı" sayılır ve
 * varsayılan atlanırdı. Sonuç `fetch('')` olurdu — içe aktarma, sebebi
 * görünmeyen bir hatayla ölürdü.
 *
 * `.trim()` de bilinçli: `.env` dosyasına yanlışlıkla boşluk yazmak
 * (`OVERPASS_ADRESI= `) aynı sonucu verirdi.
 */
/** Tek seferde alınacak azami POI — kaza koruması. */
export const AZAMI_ADAY = 3_000

export type IceAktarmaDurumu =
  | { durum: 'merkez_yok' }
  | { durum: 'kutu_gecersiz'; mesaj: string }
  | { durum: 'hata'; mesaj: string }
  | { durum: 'hazir'; onizleme: Onizleme }

export interface OnizlemeSatiri {
  aday: OsmAdayi
  /** `yeni` eklenecek · `guncellenecek` üzerine yazılacak · `korunacak` elle düzeltilmiş */
  islem: 'yeni' | 'guncellenecek' | 'korunacak'
  /** Mevcut kaydın kimliği (varsa). */
  mevcutId?: number
}

export interface Onizleme {
  kutu: Kutu
  satirlar: OnizlemeSatiri[]
  yeniSayisi: number
  guncellenecekSayisi: number
  korunacakSayisi: number
  ozet: CozumlemeOzeti
  /** Sorgu, panelde gösterilir — ne sorduğumuz görünür olsun. */
  sorgu: string
}

/** Mahalle merkezlerinden kutu kurar. */
export async function kutuyuHesapla(
  payload: Payload,
  user: TypedUser,
  marjMetre?: number,
): Promise<Kutu | null> {
  const mahalleler = await payload.find({
    collection: 'mahalleler',
    limit: 500,
    depth: 0,
    user,
    overrideAccess: false,
  })

  const noktalar = mahalleler.docs
    .map((m) => m.merkez)
    .filter((m): m is [number, number] => Array.isArray(m) && m.length >= 2)
    .map(([boylam, enlem]) => ({ boylam, enlem }))

  return merkezlerdenKutu(noktalar, marjMetre)
}

/**
 * Mahalle merkezlerini gruplayıp her gruba ayrı kutu hesaplar.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN PARÇALI: TEK BÜYÜK KUTU 504'ÜN EN SIK SEBEBİYDİ
 *
 * POI sorgusu ilçenin tamamını kapsayan tek bir kutu için onlarca etiket
 * filtresi çalıştırıyordu. Küçük kutular hem çok daha hızlı dönüyor hem de
 * biri düştüğünde yalnızca o bölge yeniden isteniyor.
 *
 * ⚠️ Kutular ÜST ÜSTE BİNER — mahalleler komşu ve her birine marj ekleniyor.
 * Aynı POI birden çok grupta gelebilir; birleştirme OSM kimliğine göre
 * tekilleştiriyor. Bu bir kayıp değil, kaçınılmaz ve zararsız bir örtüşme.
 * ─────────────────────────────────────────────────────────────────────────
 */
export async function kutulariHesapla(
  payload: Payload,
  user: TypedUser,
  marjMetre?: number,
  grupBoyutu: number = POI_GRUP_BOYUTU,
): Promise<Kutu[]> {
  const mahalleler = await payload.find({
    collection: 'mahalleler',
    limit: 500,
    depth: 0,
    sort: 'ad',
    user,
    overrideAccess: false,
  })

  const noktalar = mahalleler.docs
    .map((m) => m.merkez)
    .filter((m): m is [number, number] => Array.isArray(m) && m.length >= 2)
    .map(([boylam, enlem]) => ({ boylam, enlem }))

  if (noktalar.length === 0) return []

  const kutular: Kutu[] = []
  for (let i = 0; i < noktalar.length; i += grupBoyutu) {
    const kutu = merkezlerdenKutu(noktalar.slice(i, i + grupBoyutu), marjMetre)
    if (kutu) kutular.push(kutu)
  }
  return kutular
}

/**
 * Bir kutuda kaç mahalle merkezi toplanacağı.
 *
 * ⚠️ Sınır içe aktarmadaki grup boyutuyla aynı gerekçe: amaç hızı en üst
 * düzeye çıkarmak değil, tek isteğin zaman aşımına uğrama olasılığını ve
 * düştüğünde kaybedilen işi küçük tutmak.
 */
export const POI_GRUP_BOYUTU = 3

/* ══════════════════════════════════════════════════════════════════════════
   Parçalı hazırlık — kutu kutu
   ══════════════════════════════════════════════════════════════════════════ */

interface PoiHazirligi {
  kutular: Kutu[]
  marjMetre: number | undefined
  /** Kutu sırasına göre gelen adaylar. */
  adaylar: Map<number, OsmAdayi[]>
  tamamlanan: Set<number>
  ozet: CozumlemeOzeti
}

const depo = new HazirlikDeposu<PoiHazirligi>()

function kullaniciAnahtari(user: TypedUser): string | number {
  return (user as { id?: string | number } | null)?.id ?? 'oturumsuz'
}

export type PoiHazirlikDurumu =
  | { durum: 'merkez_yok' }
  | { durum: 'kutu_gecersiz'; mesaj: string }
  | { durum: 'hazir'; kutuSayisi: number; ornekSorgu: string }

/**
 * Kutuları hesaplar — AĞ İSTEĞİ YOK.
 *
 * ⚠️ Bu adım Overpass'a hiç dokunmuyor; yalnızca mahalle merkezlerinden
 * kutuları çıkarıp depoya yazıyor. Sorgular kutu kutu, sonraki adımda.
 */
export async function poiHazirligiBaslat(
  payload: Payload,
  user: TypedUser,
  marjMetre?: number,
): Promise<PoiHazirlikDurumu> {
  const kutular = await kutulariHesapla(payload, user, marjMetre)
  if (kutular.length === 0) return { durum: 'merkez_yok' }

  const gecersiz = kutular.find((kutu) => !kutuMakulMu(kutu))
  if (gecersiz) {
    return {
      durum: 'kutu_gecersiz',
      mesaj:
        'Mahalle merkezlerinden hesaplanan alan olağandışı büyük. Bir mahallenin merkez ' +
        'noktası yanlış girilmiş olabilir (örn. Çorlu yerine başka bir il). ' +
        'Mahalleler → Konum sekmesinden merkezleri kontrol edin.',
    }
  }

  depo.yaz(kullaniciAnahtari(user), {
    kutular,
    marjMetre,
    adaylar: new Map(),
    tamamlanan: new Set(),
    ozet: { adaylar: [], eslenmeyenler: [], adsizAtlandi: 0, konumsuzAtlandi: 0 },
  })

  return {
    durum: 'hazir',
    kutuSayisi: kutular.length,
    ornekSorgu: overpassSorgusu(kutular[0] as Kutu),
  }
}

export type PoiGrupDurumu =
  | { durum: 'hazirlik_yok' }
  | { durum: 'yeniden_denenebilir'; mesaj: string }
  | { durum: 'hata'; mesaj: string }
  | { durum: 'tamam'; gelen: number }

/** Tek kutunun POI'lerini indirir; sonuç depoda birikir. */
export async function poiKutusunuGetir(
  user: TypedUser,
  kutuSirasi: number,
  denemeSirasi = 1,
): Promise<PoiGrupDurumu> {
  const hazirlik = depo.oku(kullaniciAnahtari(user))
  if (!hazirlik) return { durum: 'hazirlik_yok' }

  const kutu = hazirlik.kutular[kutuSirasi]
  if (!kutu) return { durum: 'hata', mesaj: `${kutuSirasi}. kutu bulunamadı.` }

  if (hazirlik.tamamlanan.has(kutuSirasi)) {
    return { durum: 'tamam', gelen: hazirlik.adaylar.get(kutuSirasi)?.length ?? 0 }
  }

  const cevap = await overpassDene(overpassSorgusu(kutu), {
    denemeSirasi,
    dagitim: kutuSirasi,
    zamanAsimiMs: 90_000,
  })
  if (cevap.durum !== 'tamam') return { durum: cevap.durum, mesaj: cevap.mesaj }

  const cozum = overpassCevabiniCoz(cevap.veri)
  hazirlik.adaylar.set(kutuSirasi, cozum.adaylar)
  hazirlik.tamamlanan.add(kutuSirasi)
  hazirlik.ozet = birlestir(hazirlik.adaylar, hazirlik.ozet, cozum)

  return { durum: 'tamam', gelen: cozum.adaylar.length }
}

/**
 * Kutu sonuçlarını birleştirir.
 *
 * ⚠️ TEKİLLEŞTİRME ZORUNLU: kutular üst üste biniyor, aynı POI birden çok
 * kutuda geliyor. Tekilleştirilmeseydi panel gerçekte olduğundan çok daha
 * fazla nokta gösterir ve aynı kayda arka arkaya yazılırdı.
 */
function birlestir(
  adaylar: Map<number, OsmAdayi[]>,
  onceki: CozumlemeOzeti,
  yeni: CozumlemeOzeti,
): CozumlemeOzeti {
  const tekil = new Map<string, OsmAdayi>()
  for (const liste of adaylar.values()) {
    for (const aday of liste) tekil.set(aday.osmKimlik, aday)
  }

  // Eşlenmeyen tür raporu da birikmeli: hangi kutuda çıktığı önemli değil.
  const turler = new Map<string, number>()
  for (const kayit of [...onceki.eslenmeyenler, ...yeni.eslenmeyenler]) {
    turler.set(kayit.etiket, (turler.get(kayit.etiket) ?? 0) + kayit.sayi)
  }

  return {
    adaylar: [...tekil.values()],
    eslenmeyenler: [...turler]
      .map(([etiket, sayi]) => ({ etiket, sayi }))
      .sort((a, b) => b.sayi - a.sayi),
    adsizAtlandi: onceki.adsizAtlandi + yeni.adsizAtlandi,
    konumsuzAtlandi: onceki.konumsuzAtlandi + yeni.konumsuzAtlandi,
  }
}

/**
 * Önizleme hazırlar — hiçbir şey yazmaz.
 *
 * CSV içe aktarmadaki ilkenin aynısı: önce gör, sonra yaz.
 */
export async function onizlemeHazirla(
  payload: Payload,
  user: TypedUser,
): Promise<IceAktarmaDurumu> {
  /**
   * ⚠️ Overpass'a BURADA SORULMUYOR — veri kutu kutu indirildi ve depoda
   * duruyor. Eski akış önizlemede bir kez, yazmada bir kez daha bütün
   * ilçeyi sorguluyordu.
   */
  const hazirlik = depo.oku(kullaniciAnahtari(user))
  if (!hazirlik) {
    return {
      durum: 'hata',
      mesaj: 'Hazırlık bulunamadı ya da zaman aşımına uğradı. "Önizle" ile baştan başlayın.',
    }
  }

  const kutu = hazirlik.kutular[0]
  if (!kutu) return { durum: 'merkez_yok' }

  const ozet = hazirlik.ozet
  const sorgu = overpassSorgusu(kutu)

  if (ozet.adaylar.length > AZAMI_ADAY) {
    return {
      durum: 'kutu_gecersiz',
      mesaj:
        `Sorgu ${ozet.adaylar.length} nokta döndürdü; tek seferde en fazla ${AZAMI_ADAY} ` +
        'aktarılıyor. Marjı küçültüp tekrar deneyin.',
    }
  }

  const satirlar = await satirlariEslestir(payload, user, ozet.adaylar)

  return {
    durum: 'hazir',
    onizleme: {
      kutu,
      sorgu,
      ozet,
      satirlar,
      yeniSayisi: satirlar.filter((s) => s.islem === 'yeni').length,
      guncellenecekSayisi: satirlar.filter((s) => s.islem === 'guncellenecek').length,
      korunacakSayisi: satirlar.filter((s) => s.islem === 'korunacak').length,
    },
  }
}

/** Her adayı mevcut kayıtlarla eşleştirir. */
async function satirlariEslestir(
  payload: Payload,
  user: TypedUser,
  adaylar: readonly OsmAdayi[],
): Promise<OnizlemeSatiri[]> {
  if (adaylar.length === 0) return []

  const mevcutlar = await payload.find({
    collection: 'ilgi-noktalari',
    where: { osmKimlik: { in: adaylar.map((a) => a.osmKimlik) } },
    limit: AZAMI_ADAY,
    depth: 0,
    user,
    overrideAccess: false,
  })

  const kimlikHaritasi = new Map(
    mevcutlar.docs
      .filter((k) => typeof k.osmKimlik === 'string')
      .map((k) => [k.osmKimlik as string, k]),
  )

  return adaylar.map((aday) => {
    const mevcut = kimlikHaritasi.get(aday.osmKimlik)

    if (!mevcut) return { aday, islem: 'yeni' as const }

    // ⚠️ Elle düzeltilmiş kayıt ezilmez.
    if (mevcut.elleDuzenlendi === true) {
      return { aday, islem: 'korunacak' as const, mevcutId: mevcut.id as number }
    }

    return { aday, islem: 'guncellenecek' as const, mevcutId: mevcut.id as number }
  })
}

export interface YazmaSonucu {
  eklenen: number
  guncellenen: number
  korunan: number
  hatalar: { ad: string; mesaj: string }[]
}

/**
 * Önizlemedeki satırları yazar.
 *
 * ⚠️ `context.osmIceAktarma = true`: bu bayrak olmadan
 * `osmElleDuzenlemeIzi` kancası içe aktarıcının kendi yazmasını "insan
 * düzenlemesi" sanır ve her kaydı elle düzeltilmiş işaretlerdi — ikinci
 * içe aktarmada hiçbir şey güncellenmezdi.
 */
export async function satirlariYaz(
  payload: Payload,
  user: TypedUser,
  satirlar: readonly OnizlemeSatiri[],
): Promise<YazmaSonucu> {
  const sonuc: YazmaSonucu = { eklenen: 0, guncellenen: 0, korunan: 0, hatalar: [] }

  for (const satir of satirlar) {
    if (satir.islem === 'korunacak') {
      sonuc.korunan += 1
      continue
    }

    const veri = {
      ad: satir.aday.ad,
      tip: satir.aday.tip,
      konum: [satir.aday.boylam, satir.aday.enlem] as [number, number],
      onemli: satir.aday.onemli,
      kaynak: 'osm' as const,
      osmKimlik: satir.aday.osmKimlik,
    }

    try {
      if (satir.islem === 'yeni') {
        await payload.create({
          collection: 'ilgi-noktalari',
          data: veri,
          user,
          overrideAccess: false,
          context: { osmIceAktarma: true },
        })
        sonuc.eklenen += 1
      } else if (satir.mevcutId !== undefined) {
        await payload.update({
          collection: 'ilgi-noktalari',
          id: satir.mevcutId,
          data: veri,
          user,
          overrideAccess: false,
          context: { osmIceAktarma: true },
        })
        sonuc.guncellenen += 1
      }
    } catch (hata) {
      sonuc.hatalar.push({
        ad: satir.aday.ad,
        mesaj: hata instanceof Error ? hata.message : 'bilinmeyen hata',
      })
    }
  }

  return sonuc
}
