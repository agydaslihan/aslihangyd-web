import { harcMatrahi } from '@/lib/rayic/tipler'
import type { VergiParametreKumesi } from '@/lib/vergi/parametreler'

import {
  girdiEksik,
  hesaplandi,
  kurusaYuvarla,
  parametreEksik,
  pozitifMi,
  type HesapSonucu,
} from './tipler'

/**
 * Alım maliyeti hesaplayıcı — "bu ev bana gerçekte kaça mal olur?"
 *
 * Alıcıların en sık yanıldığı yer burasıdır: ilan fiyatına odaklanılır,
 * harç ve masraflar hesaba katılmaz. Fiyatın üzerine gelen kalemler
 * genellikle ilk beklentinin çok üzerinde çıkar.
 *
 * ⚠️ Tüm oran ve sabit tutarlar `VergiParametreleri` koleksiyonundan gelir.
 * Parametre eksikse hesap YAPILMAZ — eksik olan kalem adıyla bildirilir.
 */

export const ALIM_MALIYETI_PARAMETRELERI = [
  'tapu_harci_orani_alici',
  'doner_sermaye_ucreti',
] as const

/** Bunlar olmadan da hesap yapılır; girilmemişse ilgili satır gösterilmez. */
export const ALIM_MALIYETI_ISTEGE_BAGLI = [
  'dask_tahmini_prim',
  'ekspertiz_ucreti',
  'emlak_komisyon_orani',
  'komisyon_kdv_orani',
] as const

export interface AlimMaliyetiGirdisi {
  /** Taşınmazın satış bedeli. */
  fiyat?: number | null
  /** Kredi kullanılacaksa ekspertiz ücreti eklenir. */
  krediKullanilacak?: boolean
  /** Komisyon hesaba dahil edilsin mi. */
  komisyonDahil?: boolean
  /**
   * Taşınmazın toplam rayiç bedeli (m² rayiç × m²).
   *
   * ⚠️ Bilinmiyorsa boş bırakılır ve hesap satış bedeli üzerinden yapılır —
   * uydurulmaz. Doluysa tapu harcı, ikisinin BÜYÜĞÜ üzerinden hesaplanır.
   */
  rayicBedel?: number | null
}

export interface MaliyetKalemi {
  anahtar: string
  etiket: string
  tutar: number
  /** Hesabın nasıl yapıldığı — şeffaflık için arayüzde gösterilir. */
  aciklama: string
}

export interface AlimMaliyetiSonucu {
  fiyat: number
  kalemler: MaliyetKalemi[]
  ekMaliyetToplami: number
  gercekToplamMaliyet: number
  /** Ek maliyetlerin fiyata oranı, yüzde. */
  ekMaliyetOrani: number
  /** Tapu harcının hesaplandığı matrah — satış bedeli ya da rayiç bedel. */
  harcMatrahi: number
  /**
   * Harcı rayiç bedel mi belirledi?
   *
   * ⚠️ `true` ise arayüz bunu AÇIKÇA söyler. Kullanıcı satış bedelini
   * yazdığı hâlde harcın daha yüksek çıktığını görüp "hesap yanlış"
   * demesin: sebebi rayiç bedelin satış bedelinin üzerinde olması ve bu
   * yasal bir taban.
   */
  harciRayicBelirledi: boolean
}

export function alimMaliyetiHesapla(
  girdi: AlimMaliyetiGirdisi,
  parametreler: VergiParametreKumesi,
): HesapSonucu<AlimMaliyetiSonucu> {
  // ⚠️ Parametre kontrolü GİRDİ kontrolünden ÖNCE gelir.
  //
  // Eksik parametre aracın kendi eksikliğidir, kullanıcının değil. Önce
  // girdi istenirse kullanıcı fiyatı yazar, sonra "bu hesaplayıcı
  // çalışmıyor" duvarına çarpar — boşa emek ve haklı bir sinir.
  const eksikParametreler = ALIM_MALIYETI_PARAMETRELERI.filter(
    (anahtar) => typeof parametreler.sayilar[anahtar] !== 'number',
  )
  if (eksikParametreler.length > 0) return parametreEksik(eksikParametreler)

  if (!pozitifMi(girdi.fiyat)) {
    return girdiEksik([{ anahtar: 'fiyat', etiket: 'Taşınmazın fiyatı' }])
  }

  const fiyat = girdi.fiyat
  const kalemler: MaliyetKalemi[] = []

  /**
   * ⚠️ TAPU HARCI RAYİÇ BEDELİN ALTINA DÜŞEMEZ.
   *
   * Beyan edilen değer emlak vergisi değerinden (rayiç bedel) düşük
   * olamaz; düşük beyan edilirse harç yine rayiç üzerinden hesaplanır ve
   * aradaki fark cezasıyla istenir. Yalnızca satış bedelini kullansaydık,
   * düşük beyanla alım düşünen birine gerçekte ödeyeceğinden az bir rakam
   * gösterirdik.
   */
  const { matrah, rayicMiBelirledi } = harcMatrahi(fiyat, girdi.rayicBedel)

  const tapuHarciOrani = parametreler.sayilar.tapu_harci_orani_alici as number
  kalemler.push({
    anahtar: 'tapu_harci',
    etiket: 'Tapu harcı (alıcı payı)',
    tutar: kurusaYuvarla(matrah * tapuHarciOrani),
    aciklama: rayicMiBelirledi
      ? `Rayiç bedelin (${matrah.toLocaleString('tr-TR')} ₺) ` +
        `%${(tapuHarciOrani * 100).toLocaleString('tr-TR')}'i — ` +
        'harç, rayiç bedelin altına düşemez'
      : `Satış bedelinin %${(tapuHarciOrani * 100).toLocaleString('tr-TR')}'i`,
  })

  kalemler.push({
    anahtar: 'doner_sermaye',
    etiket: 'Tapu döner sermaye ücreti',
    tutar: parametreler.sayilar.doner_sermaye_ucreti as number,
    aciklama: 'Sabit tutar',
  })

  const dask = parametreler.sayilar.dask_tahmini_prim
  if (typeof dask === 'number') {
    kalemler.push({
      anahtar: 'dask',
      etiket: 'DASK (zorunlu deprem sigortası)',
      tutar: dask,
      aciklama: 'Tahmini yıllık prim — gerçek tutar konuma ve yapıya göre değişir',
    })
  }

  if (girdi.krediKullanilacak) {
    const ekspertiz = parametreler.sayilar.ekspertiz_ucreti
    if (typeof ekspertiz === 'number') {
      kalemler.push({
        anahtar: 'ekspertiz',
        etiket: 'Ekspertiz (değerleme) ücreti',
        tutar: ekspertiz,
        aciklama: 'Kredi kullanımında zorunlu',
      })
    }
  }

  if (girdi.komisyonDahil) {
    const komisyonOrani = parametreler.sayilar.emlak_komisyon_orani
    if (typeof komisyonOrani === 'number') {
      const komisyon = fiyat * komisyonOrani
      const kdvOrani = parametreler.sayilar.komisyon_kdv_orani ?? 0
      const kdvliKomisyon = komisyon * (1 + kdvOrani)

      kalemler.push({
        anahtar: 'komisyon',
        etiket: 'Emlak komisyonu (KDV dahil)',
        tutar: kurusaYuvarla(kdvliKomisyon),
        aciklama:
          `Satış bedelinin %${(komisyonOrani * 100).toLocaleString('tr-TR')}'i` +
          (kdvOrani > 0 ? ` + %${(kdvOrani * 100).toLocaleString('tr-TR')} KDV` : ''),
      })
    }
  }

  const ekMaliyetToplami = kurusaYuvarla(
    kalemler.reduce((toplam, kalem) => toplam + kalem.tutar, 0),
  )

  return hesaplandi({
    fiyat,
    kalemler,
    ekMaliyetToplami,
    gercekToplamMaliyet: kurusaYuvarla(fiyat + ekMaliyetToplami),
    ekMaliyetOrani: kurusaYuvarla((ekMaliyetToplami / fiyat) * 100),
    harcMatrahi: matrah,
    harciRayicBelirledi: rayicMiBelirledi,
  })
}
