import { SOSYAL_DONATI_TIPLERI, ULASIM_TIPLERI, type PoiTipi } from '@/collections/IlgiNoktalari'
import { mesafeYaz } from '@/lib/bicimlendirme'

import {
  BILESEN_ETIKETLERI,
  YOGUNLUK_YARICAPI_METRE,
  type BilesenOnerisi,
  type MahalleYakinligi,
  type PoiMesafesi,
  type YakinlikBileseni,
} from './tipler'

/**
 * Yakınlık → yatırım skoru bileşeni önerisi motoru.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN "ÖNERİ", NEDEN OTOMATİK SKOR DEĞİL
 *
 * Bu motor gerçek koordinatlardan gerçek mesafeler türetir — burada uydurma
 * yok. Ama **POI kaydının yokluğu, donatının yokluğu değildir.** Hıdırağa'ya
 * henüz tek bir okul girilmediyse, mahalle otomatik olarak "sosyal donatısı
 * zayıf" damgası yer. Bu, veri eksikliğini olguya çevirmek olurdu.
 *
 * Bu yüzden:
 *  1. Motor puanı **panele yazmaz.** Öneri üretir, Aslıhan görür ve karar verir.
 *  2. Veri kapsamı zayıfsa öneri üretilmez; `eksikler` doldurulur.
 *  3. Her önerinin yanında nasıl çıktığı satır satır gösterilir.
 *
 * Aynı ilkenin diğer örnekleri: yatırım skorunda %70 kapsam eşiği,
 * eşleştirmede %60 eşiği, endekste katman başına 8 gözlem.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ─────────────────────────────────────────────────────────────────────────
 * BU DOSYADAKİ RAKAMLAR METODOLOJİDİR, ÖLÇÜM DEĞİLDİR
 *
 * Eğri kırılım noktaları ve ağırlıklar Çorlu'da ölçülmüş değerler değil;
 * aracın **ilan ettiği** değerlendirme yöntemidir ve
 * /yatirim-skoru-metodolojisi sayfasında aynen yayınlanır. Değiştirilirse
 * o sayfa da değişir — kaynağı burasıdır.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Parçalı doğrusal eğrinin bir kırılım noktası. */
export interface EgriNoktasi {
  metre: number
  puan: number
}

/**
 * Sanayi yakınlığı eğrisi.
 *
 * Monoton DEĞİL — bilinçli. Sanayi yakınlığı bu skorda "kira talebinin
 * motoru" olarak ölçülür (PROJE-PLANI.md §1.5): OSB'ye işe gidilebilir
 * mesafede olmak değerlidir. Ama OSB'nin dibinde oturmak gürültü, ağır
 * araç trafiği ve hava kalitesi demektir. Bu yüzden 1 km'nin altı tam puan
 * almaz; en yüksek puan 2–7 km bandındadır.
 */
export const SANAYI_EGRISI: readonly EgriNoktasi[] = [
  { metre: 1_000, puan: 70 },
  { metre: 2_000, puan: 100 },
  { metre: 7_000, puan: 100 },
  { metre: 15_000, puan: 0 },
]

/**
 * Ulaşım bileşeninin alt kalemleri.
 *
 * Ağırlıklar Çorlu'nun değer sürücülerine göre: tren istasyonu
 * (Halkalı–Kapıkule hattı) ve günlük toplu taşıma eşit ağırlıkta;
 * havalimanı erişimi ikisinden hafif.
 */
export const ULASIM_KALEMLERI: Record<
  (typeof ULASIM_TIPLERI)[number],
  { etiket: string; agirlik: number; egri: readonly EgriNoktasi[] }
> = {
  durak: {
    etiket: 'Toplu taşıma durağı',
    agirlik: 40,
    // 300 m ≈ 4 dakikalık yürüyüş; 2 km'de durak "yürünebilir" olmaktan çıkar.
    egri: [
      { metre: 300, puan: 100 },
      { metre: 2_000, puan: 0 },
    ],
  },
  istasyon: {
    etiket: 'Tren istasyonu',
    agirlik: 40,
    egri: [
      { metre: 1_000, puan: 100 },
      { metre: 8_000, puan: 0 },
    ],
  },
  havalimani: {
    etiket: 'Havalimanı',
    agirlik: 20,
    // Sanayideki gerekçenin aynısı: erişim değerli, pist ucu değil.
    egri: [
      { metre: 1_500, puan: 70 },
      { metre: 4_000, puan: 100 },
      { metre: 15_000, puan: 100 },
      { metre: 35_000, puan: 0 },
    ],
  },
}

/**
 * Sosyal donatı puanının iki bileşeni ve ağırlıkları.
 *
 * `yogunluk` KARŞILAŞTIRMALIDIR: "1 km içinde 8 donatı iyidir" gibi mutlak
 * bir eşik kullanılmıyor, çünkü böyle bir eşiği biz uydurmuş oluruz.
 * Bunun yerine en yoğun mahalle 100 puan alır, diğerleri ona oranlanır —
 * eşleştirme motorundaki bütçe puanıyla aynı yöntem.
 *
 * `cesitlilik` ise mutlak ama uydurma değil: "elimizde verisi olan donatı
 * türlerinden kaçı yürüme mesafesinde?" sorusunun cevabı bir olgudur.
 */
export const SOSYAL_DONATI_AGIRLIKLARI = { yogunluk: 50, cesitlilik: 50 } as const

/**
 * Karşılaştırmalı puanlama için gereken asgari mahalle sayısı.
 *
 * İki mahalleyle "en yoğun olan 100 puan" demek, kıyas değil etiketlemedir.
 * Bölge Radarı'ndaki 4 mahalle eşiğiyle aynı gerekçe.
 */
export const ASGARI_KARSILASTIRMA = 3

/**
 * Bir mahallenin POI kaydı bu sayının altındaysa öneri "zayıf kapsam"
 * uyarısıyla birlikte verilir. Eşik bir kalite yargısı değil, dikkat
 * çağrısıdır: 3 kayıtla bir mahallenin donatısı hakkında konuşulmaz.
 */
export const ZAYIF_KAPSAM_ESIGI = 5

/**
 * Parçalı doğrusal eğri değeri.
 *
 * İlk noktanın altında ilk puan, son noktanın üstünde son puan verilir
 * (yatay uçlar). Aradaki her aralıkta doğrusal geçiş yapılır.
 */
export function egriPuani(metre: number, egri: readonly EgriNoktasi[]): number | null {
  if (!Number.isFinite(metre) || metre < 0 || egri.length === 0) return null

  const ilk = egri[0]
  const son = egri[egri.length - 1]
  if (!ilk || !son) return null

  if (metre <= ilk.metre) return ilk.puan
  if (metre >= son.metre) return son.puan

  for (let i = 1; i < egri.length; i += 1) {
    const onceki = egri[i - 1]
    const simdiki = egri[i]
    if (!onceki || !simdiki) continue
    if (metre > simdiki.metre) continue

    const aralik = simdiki.metre - onceki.metre
    if (aralik <= 0) return simdiki.puan

    const oran = (metre - onceki.metre) / aralik
    return Math.round(onceki.puan + (simdiki.puan - onceki.puan) * oran)
  }

  return son.puan
}

/** Tip → mesafe kaydı araması için küçük yardımcı. */
function mesafeBul(mesafeler: readonly PoiMesafesi[], tip: PoiTipi): PoiMesafesi | null {
  return mesafeler.find((m) => m.tip === tip) ?? null
}

function metreYaz(metre: number): string {
  return mesafeYaz(metre) ?? `${Math.round(metre)} m`
}

/**
 * Tüm mahalleler için bileşen önerileri.
 *
 * Karşılaştırmalı puanlama gerektiği için mahalleler **birlikte** işlenir;
 * tek mahalleyi tek başına puanlamak mümkün değildir.
 *
 * @param mahalleler  Merkez noktası tanımlı mahallelerin yakınlık özetleri
 * @param veriKapsami Veri tabanında **hiç** kaydı bulunan POI tipleri.
 *                    Hiç istasyon kaydı yoksa hiçbir mahalle için istasyon
 *                    erişimi hakkında konuşulmaz — sıfır puan verilmez.
 */
export function skorOnerileriHesapla(
  mahalleler: readonly MahalleYakinligi[],
  veriKapsami: ReadonlySet<PoiTipi>,
): Map<string, BilesenOnerisi[]> {
  const sonuc = new Map<string, BilesenOnerisi[]>()
  const yogunlukPuanlari = yogunlukPuanlariHesapla(mahalleler)

  for (const mahalle of mahalleler) {
    sonuc.set(mahalle.slug, [
      sanayiOnerisi(mahalle, veriKapsami),
      ulasimOnerisi(mahalle, veriKapsami),
      sosyalDonatiOnerisi(mahalle, veriKapsami, yogunlukPuanlari),
    ])
  }

  return sonuc
}

function bosOneri(bilesen: YakinlikBileseni, eksikler: string[]): BilesenOnerisi {
  return { bilesen, puan: null, gerekce: [], eksikler }
}

function sanayiOnerisi(
  mahalle: MahalleYakinligi,
  veriKapsami: ReadonlySet<PoiTipi>,
): BilesenOnerisi {
  if (!veriKapsami.has('sanayi')) {
    return bosOneri('sanayiYakinligi', [
      'Veri tabanında hiç "Sanayi / OSB" kaydı yok. Kayıt girilmeden bu bileşen hakkında konuşulamaz.',
    ])
  }

  const sanayi = mesafeBul(mahalle.mesafeler, 'sanayi')
  if (!sanayi) {
    return bosOneri('sanayiYakinligi', [
      'Bu mahallenin merkezine göre en yakın sanayi noktası bulunamadı.',
    ])
  }

  const puan = egriPuani(sanayi.enYakinMetre, SANAYI_EGRISI)
  if (puan === null) {
    return bosOneri('sanayiYakinligi', ['Mesafe hesaplanamadı.'])
  }

  return {
    bilesen: 'sanayiYakinligi',
    puan,
    gerekce: [
      `En yakın sanayi noktası: ${sanayi.enYakinAd} — ${metreYaz(sanayi.enYakinMetre)} (kuş uçuşu)`,
      `Eğriye göre: ${puan} puan`,
    ],
    eksikler: [],
  }
}

function ulasimOnerisi(
  mahalle: MahalleYakinligi,
  veriKapsami: ReadonlySet<PoiTipi>,
): BilesenOnerisi {
  const gerekce: string[] = []
  const eksikler: string[] = []

  let toplamAgirlik = 0
  let agirlikliToplam = 0

  for (const tip of ULASIM_TIPLERI) {
    const kalem = ULASIM_KALEMLERI[tip]

    if (!veriKapsami.has(tip)) {
      eksikler.push(`Veri tabanında hiç "${kalem.etiket}" kaydı yok — bu kalem hesaba katılmadı.`)
      continue
    }

    const mesafe = mesafeBul(mahalle.mesafeler, tip)
    if (!mesafe) {
      eksikler.push(`${kalem.etiket}: bu mahalleye göre en yakın kayıt bulunamadı.`)
      continue
    }

    const puan = egriPuani(mesafe.enYakinMetre, kalem.egri)
    if (puan === null) continue

    toplamAgirlik += kalem.agirlik
    agirlikliToplam += puan * kalem.agirlik
    gerekce.push(
      `${kalem.etiket}: ${mesafe.enYakinAd} — ${metreYaz(mesafe.enYakinMetre)} → ${puan} puan (ağırlık %${kalem.agirlik})`,
    )
  }

  if (toplamAgirlik === 0) {
    return bosOneri('ulasim', eksikler.length > 0 ? eksikler : ['Ulaşım verisi yok.'])
  }

  // Mevcut kalemler kendi içinde normalize edilir: verisi olmayan kalem
  // puanı düşürmez, yalnızca kapsamı daraltır ve `eksikler`de görünür.
  const puan = Math.round(agirlikliToplam / toplamAgirlik)
  gerekce.push(`Mevcut kalemlerin ağırlıklı ortalaması: ${puan} puan`)

  return { bilesen: 'ulasim', puan, gerekce, eksikler }
}

/**
 * Karşılaştırmalı yoğunluk puanları.
 *
 * En yoğun mahalle 100, diğerleri ona oranlanır. Mutlak eşik yok.
 */
function yogunlukPuanlariHesapla(mahalleler: readonly MahalleYakinligi[]): Map<string, number> {
  const sayilar = new Map<string, number>()

  for (const mahalle of mahalleler) {
    let toplam = 0
    for (const tip of SOSYAL_DONATI_TIPLERI) {
      toplam += mesafeBul(mahalle.mesafeler, tip)?.yakindaSayi ?? 0
    }
    sayilar.set(mahalle.slug, toplam)
  }

  const puanlar = new Map<string, number>()
  const enYuksek = Math.max(0, ...sayilar.values())
  if (enYuksek <= 0) return puanlar

  for (const [slug, sayi] of sayilar) {
    puanlar.set(slug, Math.round((sayi / enYuksek) * 100))
  }

  return puanlar
}

function sosyalDonatiOnerisi(
  mahalle: MahalleYakinligi,
  veriKapsami: ReadonlySet<PoiTipi>,
  yogunlukPuanlari: Map<string, number>,
): BilesenOnerisi {
  const kapsamdakiTipler = SOSYAL_DONATI_TIPLERI.filter((tip) => veriKapsami.has(tip))

  if (kapsamdakiTipler.length === 0) {
    return bosOneri('sosyalDonati', [
      'Veri tabanında hiç sosyal donatı kaydı (okul, sağlık, market, AVM, park) yok.',
    ])
  }

  if (yogunlukPuanlari.size < ASGARI_KARSILASTIRMA) {
    return bosOneri('sosyalDonati', [
      `Karşılaştırmalı puanlama en az ${ASGARI_KARSILASTIRMA} mahalle ister; ` +
        `şu an merkez noktası tanımlı ${yogunlukPuanlari.size} mahalle var.`,
    ])
  }

  const yogunluk = yogunlukPuanlari.get(mahalle.slug)
  if (yogunluk === undefined) {
    return bosOneri('sosyalDonati', ['Bu mahalle için yoğunluk hesaplanamadı.'])
  }

  const yurumeMesafesindeki = kapsamdakiTipler.filter((tip) => {
    const mesafe = mesafeBul(mahalle.mesafeler, tip)
    return mesafe !== null && mesafe.enYakinMetre <= YOGUNLUK_YARICAPI_METRE
  })

  const cesitlilik = Math.round((yurumeMesafesindeki.length / kapsamdakiTipler.length) * 100)

  const puan = Math.round(
    (yogunluk * SOSYAL_DONATI_AGIRLIKLARI.yogunluk +
      cesitlilik * SOSYAL_DONATI_AGIRLIKLARI.cesitlilik) /
      (SOSYAL_DONATI_AGIRLIKLARI.yogunluk + SOSYAL_DONATI_AGIRLIKLARI.cesitlilik),
  )

  const eksikler: string[] = []
  const eksikTipler = SOSYAL_DONATI_TIPLERI.filter((tip) => !veriKapsami.has(tip))
  if (eksikTipler.length > 0) {
    eksikler.push(`Hiç kaydı olmayan donatı türleri hesaba katılmadı: ${eksikTipler.join(', ')}.`)
  }

  const toplamKayit = SOSYAL_DONATI_TIPLERI.reduce(
    (t, tip) => t + (mesafeBul(mahalle.mesafeler, tip)?.yakindaSayi ?? 0),
    0,
  )
  if (toplamKayit < ZAYIF_KAPSAM_ESIGI) {
    eksikler.push(
      `⚠️ Bu mahallenin ${YOGUNLUK_YARICAPI_METRE / 1_000} km yarıçapında yalnızca ${toplamKayit} donatı kaydı var. ` +
        'Düşük puan, donatının azlığından değil kaydın azlığından kaynaklanıyor olabilir.',
    )
  }

  return {
    bilesen: 'sosyalDonati',
    puan,
    gerekce: [
      `Yoğunluk: ${YOGUNLUK_YARICAPI_METRE / 1_000} km içinde ${toplamKayit} donatı → ` +
        `en yoğun mahalleye oranla ${yogunluk} puan (ağırlık %${SOSYAL_DONATI_AGIRLIKLARI.yogunluk})`,
      `Çeşitlilik: verisi olan ${kapsamdakiTipler.length} türden ${yurumeMesafesindeki.length} tanesi ` +
        `${YOGUNLUK_YARICAPI_METRE / 1_000} km içinde → ${cesitlilik} puan (ağırlık %${SOSYAL_DONATI_AGIRLIKLARI.cesitlilik})`,
      `Ağırlıklı ortalama: ${puan} puan`,
    ],
    eksikler,
  }
}

export { BILESEN_ETIKETLERI }
