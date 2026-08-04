import type { VergiParametreKumesi } from '@/lib/vergi/parametreler'

import { kiraGeliriVergisiHesapla, type GiderYontemi } from './kiraGeliriVergisi'
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
 * Yatırım simülatörü — kiraya verilecek bir taşınmazın çok yıllı projeksiyonu.
 *
 * Kira getirisi hesaplayıcı tek yılın fotoğrafını çeker: "brüt getiri %5".
 * Bu araç filmi oynatır. Kredili bir yatırımda ilk yılların nakit akışı
 * genellikle negatiftir ve getirinin büyük kısmı borcun kirayla ödenmesinden
 * gelir — tek yıllık bir oran bunu göstermez.
 *
 * ⚠️ Tüm büyüme varsayımları (kira artışı, değer artışı, gider artışı)
 * KULLANICIDAN alınır. Bunlar veri değil beklentidir; bizim "makul" bir
 * rakam yazmamız tahminimizi veri kılığında sunmak olurdu (CLAUDE.md kural 2).
 *
 * ⚠️ Vergi, `VergiParametreleri` koleksiyonundan gelen güncel oranlarla
 * hesaplanır. Parametreler girilmemişse hesap YAPILIR ama sonuç açıkça
 * "vergi öncesi" olarak etiketlenir — vergi uydurmaktansa vergisiz göstermek
 * ve bunu söylemek doğru.
 */

export interface YatirimSimulatoruGirdisi {
  /** Taşınmazın alış fiyatı. */
  konutFiyati?: number | null
  /** Tapu harcı, komisyon, ekspertiz gibi alım anındaki masraflar. */
  alimMasraflari?: number | null
  /** Peşin ödenen tutar. Fiyata eşitse kredi kullanılmaz. */
  pesinat?: number | null
  /** Kredinin aylık faiz oranı, yüzde. */
  aylikFaizYuzdesi?: number | null
  /** Kredi vadesi, ay. */
  vadeAy?: number | null

  /** Başlangıçtaki aylık kira geliri. */
  aylikKira?: number | null
  /** Yılda kaç ay boş kalacağı beklentisi (0–12). */
  yillikBoslukAyi?: number | null
  /** Aidat, emlak vergisi, DASK, bakım — yıllık toplam işletme gideri. */
  yillikIsletmeGideri?: number | null

  /** Projeksiyon süresi, yıl. */
  sureYil?: number | null

  // — Varsayımlar: hepsi kullanıcıdan, yıllık yüzde —
  yillikKiraArtisiYuzdesi?: number | null
  yillikDegerArtisiYuzdesi?: number | null
  /** Girilmezse giderler sabit kalır ve bu uyarı olarak bildirilir. */
  yillikGiderArtisiYuzdesi?: number | null
  /** Girilirse reel getiri ve bugünkü para karşılıkları hesaplanır. */
  yillikEnflasyonYuzdesi?: number | null

  /** Süre sonunda satış varsayılıyorsa masraf oranı, yüzde. */
  satisMasrafiYuzdesi?: number | null
  /** Kira geliri vergisinde gider yöntemi. Varsayılan: götürü. */
  giderYontemi?: GiderYontemi
}

export interface SimulasyonYili {
  yil: number
  /** Boşluk düşülmüş yıllık kira geliri. */
  kiraGeliri: number
  /** İşletme giderleri (aidat, vergi, bakım). */
  isletmeGideri: number
  /** O yıl ödenen toplam kredi taksiti. */
  krediOdemesi: number
  /** Taksitin faiz kısmı — anapara servet, faiz maliyettir. */
  odenenFaiz: number
  /** Kira geliri vergisi. Hesaplanamadıysa `null`. */
  vergi: number | null
  /** Vergi düşülmüş yıllık net nakit akışı. Vergi yoksa vergi öncesi. */
  netNakitAkisi: number
  /** Yıl sonuna kadar biriken net nakit akışı. */
  kumulatifNakitAkisi: number
  /** Konutun yıl sonundaki tahmini değeri. */
  konutDegeri: number
  /** Kredinin kalan anaparası. */
  kalanBorc: number
  /** Konut değeri − kalan borç. */
  ozSermaye: number
  /** Öz sermaye + biriken nakit. */
  toplamVarlik: number
}

export interface YatirimSimulatoruSonucu {
  yillar: SimulasyonYili[]
  son: SimulasyonYili
  /** Başlangıçta yatırılan nakit: peşinat + alım masrafları. */
  baslangicYatirimi: number
  /** Kredi kullanıldıysa aylık taksit. */
  aylikTaksit: number | null
  /** Süre sonunda satılırsa eldeki net tutar (masraf düşülmüş, borç kapatılmış). */
  netSatisGeliri: number
  /** Süre sonundaki toplam net varlık: net satış geliri + biriken nakit. */
  sonNetVarlik: number
  /** Nakit akışının ilk kez pozitife döndüğü yıl. Dönmüyorsa `null`. */
  nakitBasabasYili: number | null
  /**
   * Yıllık iç verim oranı (IRR), yüzde. Kaldıraçlı ve ara nakit akışlı bir
   * yatırımda tek anlamlı getiri ölçüsü budur; "toplam getiri" süreyi ve
   * paranın ne zaman girdiğini görmezden gelir.
   */
  ircOrani: number | null
  /** Enflasyon girildiyse enflasyondan arındırılmış IRR, yüzde. */
  reelIrcOrani: number | null
  /** Toplam getiri katı: son net varlık / başlangıç yatırımı. */
  getiriKati: number
  /** Enflasyon girildiyse son net varlığın bugünkü para karşılığı. */
  bugunkuParaylaNetVarlik: number | null
  /** Vergi hesaplanabildi mi — arayüz sonucu buna göre etiketler. */
  vergiHesaplandi: boolean
  uyarilar: string[]
}

/** Projeksiyon ufku üst sınırı. Daha uzunu varsayım yığınına dönüşür. */
export const AZAMI_SURE_YIL = 30

/** IRR aramasında taranan aralık (ondalık oran). */
const IRC_ALT_SINIR = -0.99
const IRC_UST_SINIR = 10
const IRC_ADIM_SAYISI = 100

function yuzdeGecerliMi(deger: number | null | undefined): deger is number {
  return typeof deger === 'number' && Number.isFinite(deger)
}

export function yatirimSimulasyonuYap(
  girdi: YatirimSimulatoruGirdisi,
  parametreler: VergiParametreKumesi,
): HesapSonucu<YatirimSimulatoruSonucu> {
  const eksikler: { anahtar: string; etiket: string }[] = []

  if (!pozitifMi(girdi.konutFiyati)) {
    eksikler.push({ anahtar: 'konutFiyati', etiket: 'Taşınmazın alış fiyatı' })
  }
  if (!negatifDegilMi(girdi.pesinat)) {
    eksikler.push({ anahtar: 'pesinat', etiket: 'Peşinat' })
  }
  if (!pozitifMi(girdi.aylikKira)) {
    eksikler.push({ anahtar: 'aylikKira', etiket: 'Aylık kira geliri' })
  }
  if (!pozitifMi(girdi.sureYil)) {
    eksikler.push({ anahtar: 'sureYil', etiket: 'Projeksiyon süresi (yıl)' })
  }
  if (!yuzdeGecerliMi(girdi.yillikKiraArtisiYuzdesi)) {
    eksikler.push({ anahtar: 'yillikKiraArtisiYuzdesi', etiket: 'Yıllık kira artışı beklentiniz' })
  }
  if (!yuzdeGecerliMi(girdi.yillikDegerArtisiYuzdesi)) {
    eksikler.push({
      anahtar: 'yillikDegerArtisiYuzdesi',
      etiket: 'Yıllık değer artışı beklentiniz',
    })
  }

  if (eksikler.length > 0) return girdiEksik(eksikler)

  const konutFiyati = girdi.konutFiyati as number
  const pesinat = girdi.pesinat as number

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

  const boslukAyi = Math.min(Math.max(girdi.yillikBoslukAyi ?? 0, 0), 12)
  const sureYil = Math.min(Math.round(girdi.sureYil as number), AZAMI_SURE_YIL)
  const aylikFaizOrani = krediTutari > 0 ? (girdi.aylikFaizYuzdesi as number) / 100 : 0
  const vadeAy = krediTutari > 0 ? Math.round(girdi.vadeAy as number) : 0

  const aylikTaksit = anuiteTaksiti(krediTutari, aylikFaizOrani, vadeAy)
  if (aylikTaksit === null) {
    return girdiEksik([
      { anahtar: 'aylikFaizYuzdesi', etiket: 'Bu faiz ve vade birleşimiyle hesap yapılamıyor' },
    ])
  }

  // — Vergi hesaplanabilir mi? —
  //
  // Denemeden anlaşılmaz: parametre kümesi eksikse hesaplayıcı
  // 'parametre_eksik' döner. Vergiyi uydurmak yerine vergisiz devam edip
  // sonucu açıkça etiketliyoruz.
  const vergiDenemesi = kiraGeliriVergisiHesapla(
    { yillikKiraGeliri: 1, giderYontemi: girdi.giderYontemi },
    parametreler,
  )
  const vergiHesaplandi = vergiDenemesi.durum === 'hesaplandi'

  const yillikGiderArtisi = girdi.yillikGiderArtisiYuzdesi ?? 0
  const enflasyon = girdi.yillikEnflasyonYuzdesi

  let aylikKira = girdi.aylikKira as number
  let isletmeGideri = girdi.yillikIsletmeGideri ?? 0
  let konutDegeri = konutFiyati
  let kalanBorc = krediTutari
  let kumulatif = 0

  const yillar: SimulasyonYili[] = []

  for (let yil = 1; yil <= sureYil; yil += 1) {
    // — Kredi: bu yılın 12 ayı —
    let yilKrediOdemesi = 0
    let yilFaiz = 0
    for (let ay = (yil - 1) * 12 + 1; ay <= yil * 12; ay += 1) {
      if (kalanBorc <= 0 || ay > vadeAy) break
      const faiz = kalanBorc * aylikFaizOrani
      const anapara = Math.min(aylikTaksit - faiz, kalanBorc)
      yilKrediOdemesi += faiz + anapara
      yilFaiz += faiz
      kalanBorc = Math.max(kalanBorc - anapara, 0)
    }

    const kiraGeliri = aylikKira * (12 - boslukAyi)

    // — Vergi —
    //
    // ⚠️ Vergi dilimleri ve istisna tutarı her yıl yeniden belirlenir.
    // Bugünün dilimlerini 10 yıl sonrasının nominal kirasına uygulamak,
    // vergiyi sistematik olarak OLDUĞUNDAN YÜKSEK gösterir (dilim kayması).
    // Enflasyon beklentisi girilmişse kira bugünkü paraya indirgenip vergi
    // öyle hesaplanıyor; bu, dilimlerin enflasyona endekslendiği gerçeğine
    // çok daha yakın. Enflasyon girilmemişse bu düzeltme yapılamaz ve
    // durum uyarı olarak bildirilir.
    let vergi: number | null = null
    if (vergiHesaplandi) {
      const indirgemeCarpani = yuzdeGecerliMi(enflasyon) ? (1 + enflasyon / 100) ** yil : 1
      const bugunkuKira = kiraGeliri / indirgemeCarpani
      const bugunkuGider = isletmeGideri / indirgemeCarpani

      const hesap = kiraGeliriVergisiHesapla(
        {
          yillikKiraGeliri: bugunkuKira,
          giderYontemi: girdi.giderYontemi,
          gercekGider: girdi.giderYontemi === 'gercek' ? bugunkuGider : undefined,
        },
        parametreler,
      )
      vergi = hesap.durum === 'hesaplandi' ? hesap.veri.toplamVergi * indirgemeCarpani : null
    }

    const netNakitAkisi = kiraGeliri - isletmeGideri - yilKrediOdemesi - (vergi ?? 0)
    kumulatif += netNakitAkisi

    konutDegeri *= 1 + (girdi.yillikDegerArtisiYuzdesi as number) / 100
    const ozSermaye = konutDegeri - kalanBorc

    yillar.push({
      yil,
      kiraGeliri: kurusaYuvarla(kiraGeliri),
      isletmeGideri: kurusaYuvarla(isletmeGideri),
      krediOdemesi: kurusaYuvarla(yilKrediOdemesi),
      odenenFaiz: kurusaYuvarla(yilFaiz),
      vergi: vergi === null ? null : kurusaYuvarla(vergi),
      netNakitAkisi: kurusaYuvarla(netNakitAkisi),
      kumulatifNakitAkisi: kurusaYuvarla(kumulatif),
      konutDegeri: kurusaYuvarla(konutDegeri),
      kalanBorc: kurusaYuvarla(kalanBorc),
      ozSermaye: kurusaYuvarla(ozSermaye),
      toplamVarlik: kurusaYuvarla(ozSermaye + kumulatif),
    })

    aylikKira *= 1 + (girdi.yillikKiraArtisiYuzdesi as number) / 100
    isletmeGideri *= 1 + yillikGiderArtisi / 100
  }

  const son = yillar[yillar.length - 1]
  if (son === undefined) {
    return girdiEksik([{ anahtar: 'sureYil', etiket: 'Projeksiyon süresi en az 1 yıl olmalı' }])
  }

  const baslangicYatirimi = pesinat + (girdi.alimMasraflari ?? 0)
  const satisMasrafi = son.konutDegeri * ((girdi.satisMasrafiYuzdesi ?? 0) / 100)
  const netSatisGeliri = son.konutDegeri - satisMasrafi - son.kalanBorc
  const sonNetVarlik = netSatisGeliri + son.kumulatifNakitAkisi

  // IRR için nakit akışı serisi: t0 negatif (yatırım), t1..tn yıllık net
  // akışlar, son yıla satış geliri eklenir.
  const nakitAkislari = [-baslangicYatirimi, ...yillar.map((y) => y.netNakitAkisi)]
  const sonIndeks = nakitAkislari.length - 1
  nakitAkislari[sonIndeks] = (nakitAkislari[sonIndeks] ?? 0) + netSatisGeliri

  const irc = ircBul(nakitAkislari)

  return hesaplandi({
    yillar,
    son,
    baslangicYatirimi: kurusaYuvarla(baslangicYatirimi),
    aylikTaksit: aylikTaksit === 0 ? null : kurusaYuvarla(aylikTaksit),
    netSatisGeliri: kurusaYuvarla(netSatisGeliri),
    sonNetVarlik: kurusaYuvarla(sonNetVarlik),
    nakitBasabasYili: yillar.find((y) => y.netNakitAkisi > 0)?.yil ?? null,
    ircOrani: irc === null ? null : Math.round(irc * 1000) / 10,
    reelIrcOrani: reelIrcHesapla(irc, enflasyon),
    getiriKati:
      baslangicYatirimi > 0 ? kurusaYuvarla(sonNetVarlik / baslangicYatirimi) : Number.NaN,
    bugunkuParaylaNetVarlik: yuzdeGecerliMi(enflasyon)
      ? kurusaYuvarla(sonNetVarlik / (1 + enflasyon / 100) ** sureYil)
      : null,
    vergiHesaplandi,
    uyarilar: uyarilariTopla(girdi, vergiHesaplandi, krediTutari, sureYil, vadeAy),
  })
}

/**
 * İç verim oranını (IRR) ikiye bölme ile bulur.
 *
 * Newton yerine ikiye bölme tercih edildi: yakınsaması garantili ve
 * başlangıç tahminine duyarlı değil. Hız burada sorun değil, doğruluk sorun.
 */
function ircBul(nakitAkislari: number[]): number | null {
  const npv = (oran: number): number =>
    nakitAkislari.reduce((toplam, akis, t) => toplam + akis / (1 + oran) ** t, 0)

  let alt = IRC_ALT_SINIR
  let ust = IRC_UST_SINIR

  const altNpv = npv(alt)
  const ustNpv = npv(ust)
  if (!Number.isFinite(altNpv) || !Number.isFinite(ustNpv)) return null

  // İşaret değişimi yoksa bu aralıkta kök yok. Uydurmaktansa null döndürülür.
  if (altNpv * ustNpv > 0) return null

  for (let adim = 0; adim < IRC_ADIM_SAYISI; adim += 1) {
    const orta = (alt + ust) / 2
    if (npv(orta) * altNpv > 0) {
      alt = orta
    } else {
      ust = orta
    }
  }

  return (alt + ust) / 2
}

/**
 * Enflasyondan arındırılmış getiri.
 *
 * ⚠️ (nominal − enflasyon) çıkarması yüksek enflasyonda ciddi biçimde
 * yanıltır. Fisher denklemi kullanılıyor: (1+n)/(1+e) − 1.
 */
function reelIrcHesapla(
  irc: number | null,
  yillikEnflasyonYuzdesi: number | null | undefined,
): number | null {
  if (irc === null || !yuzdeGecerliMi(yillikEnflasyonYuzdesi)) return null
  const reel = (1 + irc) / (1 + yillikEnflasyonYuzdesi / 100) - 1
  return Number.isFinite(reel) ? Math.round(reel * 1000) / 10 : null
}

function uyarilariTopla(
  girdi: YatirimSimulatoruGirdisi,
  vergiHesaplandi: boolean,
  krediTutari: number,
  sureYil: number,
  vadeAy: number,
): string[] {
  const uyarilar: string[] = []

  if (!vergiHesaplandi) {
    uyarilar.push(
      'Kira geliri vergisi hesaba KATILMADI: güncel istisna tutarı ve vergi dilimleri sisteme ' +
        'henüz girilmedi. Buradaki nakit akışları vergi öncesidir ve gerçek getiri daha düşük olacaktır.',
    )
  } else if (!yuzdeGecerliMi(girdi.yillikEnflasyonYuzdesi)) {
    uyarilar.push(
      'Vergi, bugünün dilimleriyle hesaplandı. Dilimler ve istisna tutarı her yıl yeniden ' +
        'belirlendiği için uzun projeksiyonlarda vergi olduğundan yüksek çıkar. Enflasyon ' +
        'beklentinizi girerseniz bu sapma düzeltilir.',
    )
  }

  if ((girdi.alimMasraflari ?? 0) === 0) {
    uyarilar.push(
      'Alım masrafları (tapu harcı, komisyon, ekspertiz) girilmedi; getiri olduğundan yüksek görünür.',
    )
  }

  if ((girdi.yillikIsletmeGideri ?? 0) === 0) {
    uyarilar.push(
      'İşletme gideri (aidat, emlak vergisi, DASK, bakım) girilmedi. Bu kalemler kira gelirinin ' +
        'küçümsenmeyecek bir kısmını götürür.',
    )
  }

  if ((girdi.yillikBoslukAyi ?? 0) === 0) {
    uyarilar.push(
      'Boş kalma süresi girilmedi; evin projeksiyon boyunca hiç boş kalmayacağı varsayıldı.',
    )
  }

  if ((girdi.yillikGiderArtisiYuzdesi ?? 0) === 0) {
    uyarilar.push(
      'Gider artışı girilmedi; giderler yıllar boyunca sabit varsayıldı. Kira artarken giderin ' +
        'sabit kalması getiriyi olduğundan iyi gösterir.',
    )
  }

  if ((girdi.satisMasrafiYuzdesi ?? 0) === 0) {
    uyarilar.push(
      'Süre sonunda satış masrafı ve doğabilecek değer artış kazancı vergisi hesaba katılmadı.',
    )
  }

  if (krediTutari > 0 && vadeAy > sureYil * 12) {
    uyarilar.push(
      'Kredi vadesi projeksiyon süresinden uzun. Süre sonunda kalan borç, satış gelirinden düşülüyor.',
    )
  }

  if (girdi.giderYontemi === 'gercek') {
    uyarilar.push(
      'Gerçek gider yönteminde hangi kalemlerin indirilebileceği kişisel duruma göre değişir; ' +
        'mali müşavirinize danışın.',
    )
  }

  return uyarilar
}
