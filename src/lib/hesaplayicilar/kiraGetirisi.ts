import {
  girdiEksik,
  hesaplandi,
  kurusaYuvarla,
  negatifDegilMi,
  pozitifMi,
  type HesapSonucu,
} from './tipler'

/**
 * Kira getiri hesaplayıcı.
 *
 * Vergi parametresi GEREKTİRMEZ — bu bilinçli. Brüt getiri, kira çarpanı ve
 * amortisman süresi yalnızca fiyat ve kiradan türer. Hesaplayıcının vergi
 * oranlarına bağlı olması, oranlar CMS'e girilene kadar en çok aranan aracın
 * çalışmaması demek olurdu.
 *
 * Net getiri isteğe bağlı giderlerle hesaplanır; gider girilmezse net
 * gösterilmez (sıfır gider varsayılmaz — bu, net getiriyi olduğundan yüksek
 * gösterirdi).
 */

export interface KiraGetirisiGirdisi {
  /** Taşınmazın satış fiyatı. */
  fiyat?: number | null
  /** Aylık kira geliri. */
  aylikKira?: number | null
  /** Aylık aidat (varsa). */
  aylikAidat?: number | null
  /** Yıllık emlak vergisi, sigorta, bakım gibi diğer giderler. */
  yillikGiderler?: number | null
  /**
   * Yıllık boşluk oranı (ondalık). Örn. yılda 1 ay boş kalma beklentisi
   * için 0,0833. Girilmezse boşluk hesaba katılmaz.
   */
  boslukOrani?: number | null
}

export interface KiraGetirisiSonucu {
  yillikBrutKira: number
  brutGetiri: number
  kiraCarpani: number
  amortismanYili: number

  /** Gider bilgisi girilmişse dolu. */
  net: {
    yillikNetKira: number
    yillikToplamGider: number
    netGetiri: number
    netAmortismanYili: number
  } | null
}

export function kiraGetirisiHesapla(girdi: KiraGetirisiGirdisi): HesapSonucu<KiraGetirisiSonucu> {
  const eksikler: { anahtar: string; etiket: string }[] = []
  if (!pozitifMi(girdi.fiyat)) eksikler.push({ anahtar: 'fiyat', etiket: 'Satış fiyatı' })
  if (!pozitifMi(girdi.aylikKira)) {
    eksikler.push({ anahtar: 'aylikKira', etiket: 'Aylık kira' })
  }
  if (eksikler.length > 0) return girdiEksik(eksikler)

  const fiyat = girdi.fiyat as number
  const aylikKira = girdi.aylikKira as number

  const boslukOrani = negatifDegilMi(girdi.boslukOrani) ? Math.min(girdi.boslukOrani, 1) : 0

  const yillikBrutKira = kurusaYuvarla(aylikKira * 12 * (1 - boslukOrani))
  const brutGetiri = kurusaYuvarla((yillikBrutKira / fiyat) * 100)
  const kiraCarpani = kurusaYuvarla(fiyat / yillikBrutKira)

  const giderVar = negatifDegilMi(girdi.aylikAidat) || negatifDegilMi(girdi.yillikGiderler)

  let net: KiraGetirisiSonucu['net'] = null
  if (giderVar) {
    const aidat = negatifDegilMi(girdi.aylikAidat) ? girdi.aylikAidat * 12 : 0
    const digerGiderler = negatifDegilMi(girdi.yillikGiderler) ? girdi.yillikGiderler : 0
    const yillikToplamGider = kurusaYuvarla(aidat + digerGiderler)
    const yillikNetKira = kurusaYuvarla(yillikBrutKira - yillikToplamGider)

    net = {
      yillikNetKira,
      yillikToplamGider,
      netGetiri: kurusaYuvarla((yillikNetKira / fiyat) * 100),
      // Net kira sıfır veya negatifse amortisman anlamsızdır; sonsuz yerine
      // sıfır dönmek de yanıltıcı olurdu. Bu durumda Infinity dönüyoruz ve
      // arayüz "giderler kirayı aşıyor" mesajı gösteriyor.
      netAmortismanYili:
        yillikNetKira > 0 ? kurusaYuvarla(fiyat / yillikNetKira) : Number.POSITIVE_INFINITY,
    }
  }

  return hesaplandi({
    yillikBrutKira,
    brutGetiri,
    kiraCarpani,
    amortismanYili: kiraCarpani,
    net,
  })
}
