/**
 * Hero slaytlarının paylaşılan tipleri ve sınırları.
 *
 * ⚠️ İstemci ve sunucu ortak okuyor; bu dosyada ağ ya da veritabanı kodu
 * YOK. Sınırlar tek yerde çünkü panel doğrulaması ile çizim aynı sayıları
 * kullanmalı.
 */

/** Karartma yüzdesi sınırları. */
export const ASGARI_OVERLAY = 0
export const AZAMI_OVERLAY = 80

/**
 * Hero'nun en-boy oranı.
 *
 * ⚠️ SABİT VE SLAYTA GÖRE DEĞİŞMİYOR — CLS'i sıfırda tutan şey bu.
 *
 * Slayt başına yükseklik açılsaydı geçişte düzen zıplardı ve Cumulative
 * Layout Shift ölçümü bozulurdu. Oran sabit olduğu için tarayıcı yeri
 * görsel inmeden ayırıyor.
 */
export const HERO_ORANI = { en: 16, boy: 9 } as const

/** Mobilde hero'nun kaplayacağı azami yükseklik (dvh). */
export const HERO_AZAMI_YUKSEKLIK_DVH = 78

export interface HeroSlayti {
  anahtar: string
  gorselUrl: string
  gorselAlt: string
  gorselEn: number | null
  gorselBoy: number | null
  baslik: string
  altBaslik: string | null
  butonMetni: string | null
  butonLink: string | null
  metinHizasi: 'sol' | 'orta'
  overlayKoyulugu: number
}

export interface HeroAyarlari {
  slaytlar: HeroSlayti[]
  otomatikGecis: boolean
  gecisSuresiMs: number
}

/** Karartma yüzdesini CSS opaklığına çevirir. */
export function overlayOpakligi(yuzde: number): number {
  const sinirli = Math.min(AZAMI_OVERLAY, Math.max(ASGARI_OVERLAY, yuzde))
  return sinirli / 100
}
