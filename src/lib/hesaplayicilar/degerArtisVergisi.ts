import type { VergiParametreKumesi } from '@/lib/vergi/parametreler'
import { gunAnahtari, gunFarki } from '@/lib/tarih'

import { gelirVergisiHesapla, type DilimHesabi } from './gelirVergisi'
import {
  girdiEksik,
  hesaplandi,
  kurusaYuvarla,
  parametreEksik,
  pozitifMi,
  type HesapSonucu,
} from './tipler'

/**
 * Değer artış kazancı vergisi hesaplayıcı.
 *
 * İki kritik kural:
 *
 * 1. **Elde tutma süresi.** Taşınmaz, muafiyet süresinden uzun elde
 *    tutulduktan sonra satılırsa değer artış kazancı vergisi doğmaz.
 *    Bu, hesaplayıcının en değerli çıktısı — çoğu kişi süreyi bilmez ve
 *    birkaç ay bekleyerek ciddi bir vergiden kurtulabilir.
 *
 * 2. **Enflasyon endekslemesi.** Alış bedeli, satıştan önceki aya ait
 *    Yİ-ÜFE ile endekslenir. Endeksleme yapılmazsa vergi, enflasyondan
 *    kaynaklanan nominal artış üzerinden hesaplanır ve gerçek kazancın
 *    çok üzerinde çıkar.
 *
 * ⚠️ Yİ-ÜFE değerleri KULLANICIDAN alınır, koda gömülmez ve CMS'te de
 * tutulmaz: aylık yayınlanan resmî bir seridir, her ay güncellenmesi
 * gereken yüzlerce değerdir ve eskimiş bir seri yanlış vergi üretir.
 * Arayüz kullanıcıyı TÜİK'in yayınladığı değeri girmeye yönlendirir.
 *
 * Endeksleme yalnızca artış oranı belirli bir eşiği aşarsa uygulanabilir —
 * bu eşik de bir parametredir, ama şu an kapsam dışında tutuldu ve
 * arayüzde belirtiliyor.
 */

export const DEGER_ARTIS_PARAMETRELERI = [
  'deger_artis_muafiyet_yili',
  'deger_artis_istisna_tutari',
  'gelir_vergisi_dilimleri',
] as const

export interface DegerArtisGirdisi {
  alisFiyati?: number | null
  satisFiyati?: number | null
  /** Alış ve satış tarihleri — 'YYYY-MM-DD' veya Date. */
  alisTarihi?: string | Date | null
  satisTarihi?: string | Date | null
  /** Alış ayına ait Yİ-ÜFE endeks değeri. */
  alisUfe?: number | null
  /** Satıştan önceki aya ait Yİ-ÜFE endeks değeri. */
  satisUfe?: number | null
  /** Tapu harcı, komisyon gibi belgelendirilmiş satış giderleri. */
  giderler?: number | null
}

export interface DegerArtisSonucu {
  /** Muafiyet süresi dolmuşsa vergi doğmaz. */
  muafMi: boolean
  eldeTutmaGunu: number
  eldeTutmaYili: number
  muafiyetYili: number
  /** Muafiyete kaç gün kaldı. Muafsa `null`. */
  muafiyeteKalanGun: number | null

  alisFiyati: number
  /** Yİ-ÜFE ile endekslenmiş alış bedeli. Endeksleme yapılmadıysa alış fiyatına eşit. */
  endekslenmisAlisFiyati: number
  endekslemeYapildi: boolean

  satisFiyati: number
  giderler: number

  /** Endeksleme ve giderler sonrası brüt kazanç. */
  brutKazanc: number
  uygulananIstisna: number
  matrah: number

  toplamVergi: number
  dilimler: DilimHesabi[]
  etkinOran: number
  /** Vergi sonrası elde kalan kazanç. */
  netKazanc: number
}

export function degerArtisVergisiHesapla(
  girdi: DegerArtisGirdisi,
  parametreler: VergiParametreKumesi,
): HesapSonucu<DegerArtisSonucu> {
  // ⚠️ Parametre kontrolü GİRDİ kontrolünden ÖNCE gelir. Eksik parametre
  // aracın eksikliğidir; kullanıcıya dört alan doldurtup sonra "bu araç
  // çalışmıyor" demek boşa emek ve haklı bir sinirdir.
  const eksikParametreler: string[] = []
  if (typeof parametreler.sayilar.deger_artis_muafiyet_yili !== 'number') {
    eksikParametreler.push('deger_artis_muafiyet_yili')
  }
  if (typeof parametreler.sayilar.deger_artis_istisna_tutari !== 'number') {
    eksikParametreler.push('deger_artis_istisna_tutari')
  }
  const dilimler = parametreler.dilimler.gelir_vergisi_dilimleri
  if (!dilimler || dilimler.length === 0) eksikParametreler.push('gelir_vergisi_dilimleri')

  if (eksikParametreler.length > 0) return parametreEksik(eksikParametreler)

  const girdiEksikleri: { anahtar: string; etiket: string }[] = []
  if (!pozitifMi(girdi.alisFiyati)) {
    girdiEksikleri.push({ anahtar: 'alisFiyati', etiket: 'Alış fiyatı' })
  }
  if (!pozitifMi(girdi.satisFiyati)) {
    girdiEksikleri.push({ anahtar: 'satisFiyati', etiket: 'Satış fiyatı' })
  }

  const alisGunu = gunAnahtari(girdi.alisTarihi)
  const satisGunu = gunAnahtari(girdi.satisTarihi)
  if (alisGunu === null) girdiEksikleri.push({ anahtar: 'alisTarihi', etiket: 'Alış tarihi' })
  if (satisGunu === null) girdiEksikleri.push({ anahtar: 'satisTarihi', etiket: 'Satış tarihi' })

  if (girdiEksikleri.length > 0) return girdiEksik(girdiEksikleri)

  const alisFiyati = girdi.alisFiyati as number
  const satisFiyati = girdi.satisFiyati as number
  const muafiyetYili = parametreler.sayilar.deger_artis_muafiyet_yili as number
  const istisnaTutari = parametreler.sayilar.deger_artis_istisna_tutari as number

  const eldeTutmaGunu = gunFarki(alisGunu!, satisGunu!)

  if (eldeTutmaGunu < 0) {
    return girdiEksik([
      { anahtar: 'satisTarihi', etiket: 'Satış tarihi alış tarihinden önce olamaz' },
    ])
  }

  // Yıl hesabı takvim üzerinden yapılıyor; 365 güne bölmek artık yıllarda
  // birkaç günlük hata üretir ve muafiyet sınırında bu fark önemlidir.
  const muafiyetGunu = takvimYiliEkle(alisGunu!, muafiyetYili)
  const muafMi = satisGunu! >= muafiyetGunu

  const bos: Omit<
    DegerArtisSonucu,
    | 'brutKazanc'
    | 'uygulananIstisna'
    | 'matrah'
    | 'toplamVergi'
    | 'dilimler'
    | 'etkinOran'
    | 'netKazanc'
  > = {
    muafMi,
    eldeTutmaGunu,
    eldeTutmaYili: kurusaYuvarla(eldeTutmaGunu / 365.25),
    muafiyetYili,
    muafiyeteKalanGun: muafMi ? null : gunFarki(satisGunu!, muafiyetGunu),
    alisFiyati,
    endekslenmisAlisFiyati: alisFiyati,
    endekslemeYapildi: false,
    satisFiyati,
    giderler: pozitifMi(girdi.giderler) ? girdi.giderler : 0,
  }

  if (muafMi) {
    // Muafiyet süresi dolmuş: vergi doğmaz, hesabın gerisi anlamsız.
    return hesaplandi({
      ...bos,
      brutKazanc: 0,
      uygulananIstisna: 0,
      matrah: 0,
      toplamVergi: 0,
      dilimler: [],
      etkinOran: 0,
      netKazanc: kurusaYuvarla(satisFiyati - alisFiyati - bos.giderler),
    })
  }

  // Yİ-ÜFE endekslemesi — iki değer de girilmişse uygulanır.
  let endekslenmisAlisFiyati = alisFiyati
  let endekslemeYapildi = false

  if (pozitifMi(girdi.alisUfe) && pozitifMi(girdi.satisUfe)) {
    endekslenmisAlisFiyati = kurusaYuvarla(alisFiyati * (girdi.satisUfe / girdi.alisUfe))
    endekslemeYapildi = true
  }

  const giderler = bos.giderler
  const brutKazanc = Math.max(kurusaYuvarla(satisFiyati - endekslenmisAlisFiyati - giderler), 0)

  const uygulananIstisna = Math.min(istisnaTutari, brutKazanc)
  const matrah = Math.max(kurusaYuvarla(brutKazanc - uygulananIstisna), 0)
  const vergi = gelirVergisiHesapla(matrah, dilimler!)

  return hesaplandi({
    ...bos,
    endekslenmisAlisFiyati,
    endekslemeYapildi,
    brutKazanc,
    uygulananIstisna: kurusaYuvarla(uygulananIstisna),
    matrah,
    toplamVergi: vergi.toplamVergi,
    dilimler: vergi.dilimler,
    etkinOran: vergi.etkinOran,
    netKazanc: kurusaYuvarla(satisFiyati - alisFiyati - giderler - vergi.toplamVergi),
  })
}

/**
 * Gün anahtarına takvim yılı ekler.
 *
 * 29 Şubat + 1 yıl = 28 Şubat (ertesi yıl artık yıl değilse). Bunu 365'e
 * bölerek yapmak muafiyet sınırında hatalı sonuç verirdi.
 */
function takvimYiliEkle(gun: string, yil: number): string {
  const [yilStr, ayStr, gunStr] = gun.split('-')
  const hedefYil = Number(yilStr) + Math.trunc(yil)
  const ay = Number(ayStr)
  const gunSayisi = Number(gunStr)

  const aydakiSonGun = new Date(Date.UTC(hedefYil, ay, 0)).getUTCDate()
  const guvenliGun = Math.min(gunSayisi, aydakiSonGun)

  return `${String(hedefYil).padStart(4, '0')}-${String(ay).padStart(2, '0')}-${String(guvenliGun).padStart(2, '0')}`
}
