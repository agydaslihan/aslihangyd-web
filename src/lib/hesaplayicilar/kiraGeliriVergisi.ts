import type { VergiParametreKumesi } from '@/lib/vergi/parametreler'

import { gelirVergisiHesapla, type DilimHesabi } from './gelirVergisi'
import {
  girdiEksik,
  hesaplandi,
  kurusaYuvarla,
  negatifDegilMi,
  parametreEksik,
  pozitifMi,
  type HesapSonucu,
} from './tipler'

/**
 * Konut kira geliri vergisi hesaplayıcı.
 *
 * Akış:
 *   yıllık kira geliri
 *   − istisna tutarı            (yalnızca konut kira gelirinde)
 *   = istisna sonrası hasılat
 *   − gider (götürü veya gerçek)
 *   = vergi matrahı
 *   → artan oranlı tarife
 *
 * ⚠️ Basitleştirmeler — arayüzde açıkça yazılır:
 *  - İstisnadan yararlanma şartları (ticari kazanç, beyan zorunluluğu,
 *    birden fazla konut vb.) burada değerlendirilmez.
 *  - Diğer gelir unsurlarıyla toplulaştırma yapılmaz; tarife yalnızca bu
 *    kira matrahına uygulanır. Başka geliri olan için gerçek vergi daha
 *    yüksek çıkar.
 * Bu yüzden sonuç ekranında "mali müşavirinize danışın" ibaresi zorunludur.
 */

export const KIRA_GELIRI_PARAMETRELERI = [
  'kira_geliri_istisna_tutari',
  'goturu_gider_orani',
  'gelir_vergisi_dilimleri',
] as const

export type GiderYontemi = 'goturu' | 'gercek'

export interface KiraGeliriGirdisi {
  /** Yıllık toplam kira geliri. */
  yillikKiraGeliri?: number | null
  giderYontemi?: GiderYontemi
  /** Gerçek gider yöntemi seçildiyse belgelendirilen yıllık gider. */
  gercekGider?: number | null
  /** İstisnadan yararlanılabiliyor mu. Varsayılan: evet. */
  istisnadanYararlanir?: boolean
}

export interface KiraGeliriSonucu {
  yillikKiraGeliri: number
  uygulananIstisna: number
  istisnaSonrasiHasilat: number
  giderYontemi: GiderYontemi
  dusulenGider: number
  matrah: number
  toplamVergi: number
  dilimler: DilimHesabi[]
  etkinOran: number
  /** Vergi sonrası elde kalan yıllık tutar. */
  netKalan: number
}

export function kiraGeliriVergisiHesapla(
  girdi: KiraGeliriGirdisi,
  parametreler: VergiParametreKumesi,
): HesapSonucu<KiraGeliriSonucu> {
  // ⚠️ Parametre kontrolü GİRDİ kontrolünden ÖNCE — eksik parametre aracın
  // eksikliğidir, kullanıcıya önce emek harcatıp sonra duvar göstermeyiz.
  const eksikler: string[] = []
  if (typeof parametreler.sayilar.kira_geliri_istisna_tutari !== 'number') {
    eksikler.push('kira_geliri_istisna_tutari')
  }
  if (typeof parametreler.sayilar.goturu_gider_orani !== 'number') {
    eksikler.push('goturu_gider_orani')
  }
  const dilimler = parametreler.dilimler.gelir_vergisi_dilimleri
  if (!dilimler || dilimler.length === 0) eksikler.push('gelir_vergisi_dilimleri')

  if (eksikler.length > 0) return parametreEksik(eksikler)

  if (!pozitifMi(girdi.yillikKiraGeliri)) {
    return girdiEksik([{ anahtar: 'yillikKiraGeliri', etiket: 'Yıllık kira geliri' }])
  }

  const yillikKiraGeliri = girdi.yillikKiraGeliri
  const istisnaTutari = parametreler.sayilar.kira_geliri_istisna_tutari as number
  const goturuOran = parametreler.sayilar.goturu_gider_orani as number
  const giderYontemi: GiderYontemi = girdi.giderYontemi ?? 'goturu'

  const istisnadanYararlanir = girdi.istisnadanYararlanir !== false
  // İstisna hasılattan büyükse tamamı istisna edilir, negatif hasılat oluşmaz.
  const uygulananIstisna = istisnadanYararlanir ? Math.min(istisnaTutari, yillikKiraGeliri) : 0

  const istisnaSonrasiHasilat = kurusaYuvarla(yillikKiraGeliri - uygulananIstisna)

  let dusulenGider: number
  if (giderYontemi === 'gercek') {
    if (!negatifDegilMi(girdi.gercekGider)) {
      return girdiEksik([{ anahtar: 'gercekGider', etiket: 'Belgelendirilen yıllık gider' }])
    }
    // Gerçek gider hasılatı aşarsa matrah sıfırlanır, negatife düşmez.
    dusulenGider = Math.min(girdi.gercekGider, istisnaSonrasiHasilat)
  } else {
    dusulenGider = kurusaYuvarla(istisnaSonrasiHasilat * goturuOran)
  }

  const matrah = Math.max(kurusaYuvarla(istisnaSonrasiHasilat - dusulenGider), 0)
  const vergi = gelirVergisiHesapla(matrah, dilimler!)

  return hesaplandi({
    yillikKiraGeliri,
    uygulananIstisna: kurusaYuvarla(uygulananIstisna),
    istisnaSonrasiHasilat,
    giderYontemi,
    dusulenGider: kurusaYuvarla(dusulenGider),
    matrah,
    toplamVergi: vergi.toplamVergi,
    dilimler: vergi.dilimler,
    etkinOran: vergi.etkinOran,
    netKalan: kurusaYuvarla(yillikKiraGeliri - vergi.toplamVergi),
  })
}
