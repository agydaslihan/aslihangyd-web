import { anuiteTaksiti } from './kredi'
import {
  girdiEksik,
  hesaplandi,
  kurusaYuvarla,
  negatifDegilMi,
  pozitifMi,
  type HesapSonucu,
} from './tipler'

/**
 * "Kiralasam mı, satın alsam mı?" karşılaştırıcı.
 *
 * ⚠️ Bu aracın en kolay yanlış yapılan hâli, aylık taksiti aylık kirayla
 * yan yana koymaktır. O karşılaştırma ya satın almayı haksız yere kötü
 * gösterir (peşinatın alternatif getirisi görünmez) ya da haksız yere iyi
 * gösterir (kiracının biriktirdiği para görünmez). İkisi de yanlış.
 *
 * Doğru soru şu: **N yıl sonra hangi senaryoda net varlığım daha yüksek?**
 *
 * Bu yüzden hesap iki senaryoyu simetrik kurar:
 *
 *   Satın alan  → peşinat + alım masrafları peşin çıkar, aylık taksit ve
 *                 mülkiyet giderleri ödenir. Varlığı: konut değeri − kalan borç.
 *   Kiracı      → aynı tutarı YATIRIMDA tutar, aylık kira öder.
 *                 Varlığı: yatırım portföyünün değeri.
 *
 * Ve her ay **az ödeyen taraf aradaki farkı yatırır.** Bu adım atlanırsa
 * karşılaştırma dürüst olmaz: "kiralamak daha ucuz" derken kiracının o
 * parayı harcadığını varsaymış oluruz.
 *
 * ⚠️ Değer artışı, kira artışı ve alternatif getiri oranları KULLANICIDAN
 * alınır; ne koda gömülüdür ne de varsayılanı vardır (CLAUDE.md kural 2).
 * Bunlar veri değil, kullanıcının kendi beklentisidir. Bizim "makul" bir
 * rakam yazmamız, tahminimizi veri kılığında sunmak olurdu.
 */

export interface KiraMiSatinAlmaMiGirdisi {
  /** Taşınmazın satış fiyatı. */
  konutFiyati?: number | null
  /** Peşin ödenecek tutar. Fiyata eşitse kredi kullanılmaz. */
  pesinat?: number | null
  /** Alım anında ödenen harç ve masraflar (tapu harcı, komisyon, ekspertiz…). */
  alimMasraflari?: number | null
  /** Kredinin aylık faiz oranı, yüzde (örn. 2,89 → %2,89). */
  aylikFaizYuzdesi?: number | null
  /** Kredi vadesi, ay. */
  vadeAy?: number | null

  /** Aynı taşınmazın aylık kira bedeli. */
  aylikKira?: number | null
  /** Kiracının bağladığı depozito. Süre sonunda nominal olarak geri alınır. */
  depozito?: number | null

  /** Karşılaştırma ufku, yıl. */
  sureYil?: number | null

  // — Varsayımlar: hepsi kullanıcıdan, yıllık yüzde —
  /** Konutun yıllık nominal değer artışı beklentisi. */
  yillikDegerArtisiYuzdesi?: number | null
  /** Yıllık kira artışı beklentisi. */
  yillikKiraArtisiYuzdesi?: number | null
  /** Peşinat kiralama senaryosunda yatırılsaydı beklenen yıllık getiri. */
  yillikAlternatifGetiriYuzdesi?: number | null
  /** Girilirse sonuçlar bugünkü paraya da indirgenir. */
  yillikEnflasyonYuzdesi?: number | null

  // — İsteğe bağlı gider kalemleri —
  /** Aylık aidat. Her iki senaryoda da ödenir. */
  aylikAidat?: number | null
  /** Yalnızca mal sahibinin ödediği yıllık giderler: emlak vergisi, DASK, bakım. */
  yillikMulkiyetGideri?: number | null
  /** Süre sonunda satış yapılacaksa satış masrafı oranı, yüzde. */
  satisMasrafiYuzdesi?: number | null
}

export interface YilSatiri {
  yil: number
  /** Konutun o yılın sonundaki tahmini değeri. */
  konutDegeri: number
  /** Kredinin kalan anaparası. */
  kalanBorc: number
  /** Satın alanın biriken yatırımı (kira, taksitten yüksekse oluşur). */
  satinAlanYatirimi: number
  /** Kiracının biriken yatırımı. */
  kiraciYatirimi: number
  /** Satın alanın net varlığı. */
  satinAlanNetVarlik: number
  /** Kiracının net varlığı. */
  kiraciNetVarlik: number
  /** Satın alan lehine fark. Negatifse kiralama önde. */
  fark: number
  /** O yıl satın alanın ödediği toplam. */
  satinAlanYillikOdeme: number
  /** O yıl kiracının ödediği toplam. */
  kiraciYillikOdeme: number
}

export interface KiraMiSatinAlmaMiSonucu {
  /** Yıl yıl karşılaştırma. */
  yillar: YilSatiri[]
  /** Satın almanın öne geçtiği ilk yıl. Hiç geçmiyorsa `null`. */
  basabasYili: number | null
  /** Süre sonundaki durum. */
  son: YilSatiri
  /** Kredi kullanıldıysa aylık taksit. Kredisizse `null`. */
  aylikTaksit: number | null
  /** Başlangıçta satın alanın cebinden çıkan toplam nakit. */
  baslangicNakitCikisi: number
  /**
   * Satın almanın kiralamayla başabaş olması için gereken yıllık değer
   * artışı, yüzde. Bu aracın en değerli çıktısı: kullanıcıya bir tahmin
   * dayatmaz, kendi tahminiyle kıyaslayacağı bir EŞİK verir.
   * Aranan aralıkta bulunamazsa `null`.
   */
  basabasDegerArtisi: number | null
  /** Enflasyon girildiyse süre sonu farkın bugünkü para karşılığı. */
  bugunkuParaylaFark: number | null
  /** Hesaba katılamayan veya basitleştirilen noktalar — arayüzde gösterilir. */
  uyarilar: string[]
}

/** Karşılaştırma ufku için üst sınır. Daha uzun projeksiyon anlamsızlaşır. */
export const AZAMI_SURE_YIL = 30

/** Başabaş değer artışı aramasında taranan aralık, yıllık yüzde. */
const BASABAS_ALT_SINIR = -20
const BASABAS_UST_SINIR = 100
const BASABAS_ADIM_SAYISI = 60

function yuzdeGecerliMi(deger: number | null | undefined): deger is number {
  return typeof deger === 'number' && Number.isFinite(deger)
}

/** Yıllık nominal oranı bileşik olarak aylık orana çevirir. */
function aylikOrana(yillikYuzde: number): number {
  return (1 + yillikYuzde / 100) ** (1 / 12) - 1
}

/** Doğrulanmış girdi — simülasyon bu tiple çalışır, `null` kontrolü yapmaz. */
interface CozulmusGirdi {
  konutFiyati: number
  pesinat: number
  krediTutari: number
  alimMasraflari: number
  aylikFaizOrani: number
  vadeAy: number
  aylikKira: number
  depozito: number
  sureYil: number
  yillikDegerArtisiYuzdesi: number
  yillikKiraArtisiYuzdesi: number
  yillikAlternatifGetiriYuzdesi: number
  aylikAidat: number
  yillikMulkiyetGideri: number
  satisMasrafiOrani: number
}

export function kiraMiSatinAlmaMiHesapla(
  girdi: KiraMiSatinAlmaMiGirdisi,
): HesapSonucu<KiraMiSatinAlmaMiSonucu> {
  const eksikler: { anahtar: string; etiket: string }[] = []

  if (!pozitifMi(girdi.konutFiyati)) {
    eksikler.push({ anahtar: 'konutFiyati', etiket: 'Taşınmazın fiyatı' })
  }
  if (!negatifDegilMi(girdi.pesinat)) {
    eksikler.push({ anahtar: 'pesinat', etiket: 'Peşinat' })
  }
  if (!pozitifMi(girdi.aylikKira)) {
    eksikler.push({ anahtar: 'aylikKira', etiket: 'Aylık kira bedeli' })
  }
  if (!pozitifMi(girdi.sureYil)) {
    eksikler.push({ anahtar: 'sureYil', etiket: 'Karşılaştırma süresi (yıl)' })
  }
  if (!yuzdeGecerliMi(girdi.yillikDegerArtisiYuzdesi)) {
    eksikler.push({
      anahtar: 'yillikDegerArtisiYuzdesi',
      etiket: 'Yıllık değer artışı beklentiniz',
    })
  }
  if (!yuzdeGecerliMi(girdi.yillikKiraArtisiYuzdesi)) {
    eksikler.push({ anahtar: 'yillikKiraArtisiYuzdesi', etiket: 'Yıllık kira artışı beklentiniz' })
  }
  if (!yuzdeGecerliMi(girdi.yillikAlternatifGetiriYuzdesi)) {
    eksikler.push({
      anahtar: 'yillikAlternatifGetiriYuzdesi',
      etiket: 'Peşinatı yatırsanız beklediğiniz yıllık getiri',
    })
  }

  if (eksikler.length > 0) return girdiEksik(eksikler)

  const konutFiyati = girdi.konutFiyati as number
  const pesinat = girdi.pesinat as number

  // Peşinat fiyattan büyükse hesap anlamsızlaşır. Sessizce kırpmak,
  // kullanıcının yazım hatasını doğru bir sonuç kılığında geri vermek olurdu.
  if (pesinat > konutFiyati) {
    return girdiEksik([
      { anahtar: 'pesinat', etiket: 'Peşinat, taşınmazın fiyatından büyük olamaz' },
    ])
  }

  const krediTutari = konutFiyati - pesinat
  if (krediTutari > 0) {
    if (!yuzdeGecerliMi(girdi.aylikFaizYuzdesi)) {
      eksikler.push({ anahtar: 'aylikFaizYuzdesi', etiket: 'Aylık kredi faiz oranı' })
    }
    if (!pozitifMi(girdi.vadeAy)) {
      eksikler.push({ anahtar: 'vadeAy', etiket: 'Kredi vadesi (ay)' })
    }
    if (eksikler.length > 0) return girdiEksik(eksikler)
  }

  const cozulmus: CozulmusGirdi = {
    konutFiyati,
    pesinat,
    krediTutari,
    alimMasraflari: girdi.alimMasraflari ?? 0,
    aylikFaizOrani: krediTutari > 0 ? (girdi.aylikFaizYuzdesi as number) / 100 : 0,
    vadeAy: krediTutari > 0 ? Math.round(girdi.vadeAy as number) : 0,
    aylikKira: girdi.aylikKira as number,
    depozito: girdi.depozito ?? 0,
    sureYil: Math.min(Math.round(girdi.sureYil as number), AZAMI_SURE_YIL),
    yillikDegerArtisiYuzdesi: girdi.yillikDegerArtisiYuzdesi as number,
    yillikKiraArtisiYuzdesi: girdi.yillikKiraArtisiYuzdesi as number,
    yillikAlternatifGetiriYuzdesi: girdi.yillikAlternatifGetiriYuzdesi as number,
    aylikAidat: girdi.aylikAidat ?? 0,
    yillikMulkiyetGideri: girdi.yillikMulkiyetGideri ?? 0,
    satisMasrafiOrani: (girdi.satisMasrafiYuzdesi ?? 0) / 100,
  }

  const taksit = anuiteTaksiti(cozulmus.krediTutari, cozulmus.aylikFaizOrani, cozulmus.vadeAy)
  if (taksit === null) {
    return girdiEksik([
      { anahtar: 'aylikFaizYuzdesi', etiket: 'Bu faiz ve vade birleşimiyle hesap yapılamıyor' },
    ])
  }

  const yillar = simulasyonYap(cozulmus, taksit, cozulmus.yillikDegerArtisiYuzdesi)
  const son = yillar[yillar.length - 1]
  if (son === undefined) {
    return girdiEksik([{ anahtar: 'sureYil', etiket: 'Karşılaştırma süresi en az 1 yıl olmalı' }])
  }

  return hesaplandi({
    yillar,
    basabasYili: yillar.find((satir) => satir.fark >= 0)?.yil ?? null,
    son,
    aylikTaksit: taksit === 0 ? null : kurusaYuvarla(taksit),
    baslangicNakitCikisi: kurusaYuvarla(cozulmus.pesinat + cozulmus.alimMasraflari),
    basabasDegerArtisi: basabasDegerArtisiBul(cozulmus, taksit),
    bugunkuParaylaFark: bugunkuParayaIndirge(
      son.fark,
      girdi.yillikEnflasyonYuzdesi,
      cozulmus.sureYil,
    ),
    uyarilar: uyarilariTopla(cozulmus),
  })
}

/**
 * Ay ay ilerleyen simülasyon; yıl sonlarında satır üretir.
 *
 * Zamanlama kararları:
 * - Konut değeri AYLIK bileşiklenir (sürekli bir süreç).
 * - Kira yılda bir kez zamlanır (sözleşme 12 ay sabit kalır).
 * Bu ayrım gerçeğe daha yakın; ikisini de aylık yapmak kirayı olduğundan
 * hızlı artırırdı.
 */
function simulasyonYap(
  g: CozulmusGirdi,
  aylikTaksit: number,
  degerArtisiYuzdesi: number,
): YilSatiri[] {
  const toplamAy = g.sureYil * 12
  const aylikDegerArtisi = aylikOrana(degerArtisiYuzdesi)
  const aylikGetiri = aylikOrana(g.yillikAlternatifGetiriYuzdesi)

  // Başlangıç: satın alan peşinatı ve masrafları öder; kiracı aynı tutarı
  // elinde tutar. Depozito bağlandığı için yatırıma girmez, ayrı durur.
  const baslangicNakit = g.pesinat + g.alimMasraflari
  let kiraciYatirimi = Math.max(baslangicNakit - g.depozito, 0)
  let satinAlanYatirimi = 0

  let konutDegeri = g.konutFiyati
  let kalanBorc = g.krediTutari
  let aylikKira = g.aylikKira

  const yillar: YilSatiri[] = []
  let yilSatinAlanOdeme = 0
  let yilKiraciOdeme = 0

  for (let ay = 1; ay <= toplamAy; ay += 1) {
    let buAyTaksit = 0
    if (kalanBorc > 0 && ay <= g.vadeAy) {
      const faiz = kalanBorc * g.aylikFaizOrani
      const anaparaOdemesi = Math.min(aylikTaksit - faiz, kalanBorc)
      buAyTaksit = faiz + anaparaOdemesi
      kalanBorc = Math.max(kalanBorc - anaparaOdemesi, 0)
    }

    // Aidat iki senaryoda da var; mülkiyet gideri yalnız satın alanda.
    const satinAlanGider = buAyTaksit + g.aylikAidat + g.yillikMulkiyetGideri / 12
    const kiraciGider = aylikKira + g.aylikAidat

    // Simetrik fark yatırımı: az ödeyen, farkı yatırır. Karşılaştırmayı
    // dürüst kılan adım burasıdır.
    const fark = satinAlanGider - kiraciGider
    if (fark > 0) {
      kiraciYatirimi += fark
    } else if (fark < 0) {
      satinAlanYatirimi += -fark
    }

    kiraciYatirimi *= 1 + aylikGetiri
    satinAlanYatirimi *= 1 + aylikGetiri
    konutDegeri *= 1 + aylikDegerArtisi

    yilSatinAlanOdeme += satinAlanGider
    yilKiraciOdeme += kiraciGider

    if (ay % 12 === 0) {
      const satisMasrafi = konutDegeri * g.satisMasrafiOrani
      const satinAlanNetVarlik = konutDegeri - kalanBorc - satisMasrafi + satinAlanYatirimi
      // Kiracı süre sonunda depozitosunu nominal olarak geri alır.
      const kiraciNetVarlik = kiraciYatirimi + g.depozito

      yillar.push({
        yil: ay / 12,
        konutDegeri: kurusaYuvarla(konutDegeri),
        kalanBorc: kurusaYuvarla(kalanBorc),
        satinAlanYatirimi: kurusaYuvarla(satinAlanYatirimi),
        kiraciYatirimi: kurusaYuvarla(kiraciYatirimi),
        satinAlanNetVarlik: kurusaYuvarla(satinAlanNetVarlik),
        kiraciNetVarlik: kurusaYuvarla(kiraciNetVarlik),
        fark: kurusaYuvarla(satinAlanNetVarlik - kiraciNetVarlik),
        satinAlanYillikOdeme: kurusaYuvarla(yilSatinAlanOdeme),
        kiraciYillikOdeme: kurusaYuvarla(yilKiraciOdeme),
      })

      yilSatinAlanOdeme = 0
      yilKiraciOdeme = 0
      aylikKira *= 1 + g.yillikKiraArtisiYuzdesi / 100
    }
  }

  return yillar
}

/**
 * Satın almanın kiralamayla başabaş olduğu yıllık değer artışını arar.
 *
 * İkiye bölme kullanılıyor: süre sonu fark, değer artışı oranına göre
 * monoton artar (yüksek değer artışı → satın alan daha zengin; kiracının
 * durumu bu orandan hiç etkilenmez), bu yüzden ikiye bölme güvenli.
 */
function basabasDegerArtisiBul(g: CozulmusGirdi, aylikTaksit: number): number | null {
  const sonFark = (oran: number): number => {
    const yillar = simulasyonYap(g, aylikTaksit, oran)
    return yillar[yillar.length - 1]?.fark ?? Number.NaN
  }

  let alt = BASABAS_ALT_SINIR
  let ust = BASABAS_UST_SINIR

  const altFark = sonFark(alt)
  const ustFark = sonFark(ust)
  if (!Number.isFinite(altFark) || !Number.isFinite(ustFark)) return null

  // İki uç da aynı işaretteyse başabaş bu aralıkta yok. Uydurma bir rakam
  // döndürmektense "bulunamadı" demek doğru.
  if (altFark > 0 || ustFark < 0) return null

  for (let adim = 0; adim < BASABAS_ADIM_SAYISI; adim += 1) {
    const orta = (alt + ust) / 2
    if (sonFark(orta) < 0) {
      alt = orta
    } else {
      ust = orta
    }
  }

  return Math.round(((alt + ust) / 2) * 10) / 10
}

/**
 * Nominal tutarı bugünkü paraya indirger.
 *
 * ⚠️ Türkiye bağlamında bu bir süs değil. Yüksek enflasyonda "10 yıl sonra
 * 12 milyon TL öndesiniz" cümlesi, o 12 milyonun bugünkü karşılığı
 * söylenmezse anlamsızdır.
 */
function bugunkuParayaIndirge(
  nominalTutar: number,
  yillikEnflasyonYuzdesi: number | null | undefined,
  sureYil: number,
): number | null {
  if (!yuzdeGecerliMi(yillikEnflasyonYuzdesi)) return null
  const carpan = (1 + yillikEnflasyonYuzdesi / 100) ** sureYil
  if (!Number.isFinite(carpan) || carpan <= 0) return null
  return kurusaYuvarla(nominalTutar / carpan)
}

/**
 * Hesabın kapsamadığı şeyler.
 *
 * Bunları saklamak aracı daha güvenilir göstermez, tam tersi: kullanıcı
 * eksiği kendi fark ettiğinde tüm sonuca olan güvenini kaybeder.
 */
function uyarilariTopla(g: CozulmusGirdi): string[] {
  const uyarilar: string[] = []

  if (g.alimMasraflari === 0) {
    uyarilar.push(
      'Alım masrafları (tapu harcı, komisyon, ekspertiz) hesaba katılmadı. Alım Maliyeti ' +
        'Hesaplayıcı ile bulup buraya girerseniz karşılaştırma gerçeğe yaklaşır.',
    )
  }

  if (g.yillikMulkiyetGideri === 0) {
    uyarilar.push(
      'Emlak vergisi, DASK ve bakım gideri girilmedi. Bunlar yalnızca ev sahibinin giderdir ' +
        've satın alma senaryosunu olduğundan iyi gösterir.',
    )
  }

  if (g.satisMasrafiOrani === 0) {
    uyarilar.push(
      'Süre sonunda satış yapılacağı varsayılmadı; satış masrafı ve doğabilecek değer artış ' +
        'kazancı vergisi hesaba katılmadı.',
    )
  }

  if (g.krediTutari > 0 && g.vadeAy > g.sureYil * 12) {
    uyarilar.push(
      'Kredi vadesi karşılaştırma süresinden uzun. Süre sonunda kalan borç, satın alanın net ' +
        'varlığından düşülüyor.',
    )
  }

  if (g.depozito > 0) {
    uyarilar.push('Depozitonun süre sonunda nominal olarak geri alındığı varsayıldı.')
  }

  uyarilar.push(
    'Her iki senaryoda da aynı evde oturduğunuz varsayılıyor; bu bir kira geliri hesabı değildir.',
  )

  uyarilar.push(
    'Bankaların KKDF/BSMV, dosya masrafı ve hayat sigortası kalemleri kredi taksitine dahil değildir.',
  )

  uyarilar.push(
    'Konut kirası artış oranı mevzuatla sınırlanmış olabilir; girdiğiniz artış beklentisinin ' +
      'güncel üst sınırla uyumlu olduğunu kontrol edin.',
  )

  return uyarilar
}
