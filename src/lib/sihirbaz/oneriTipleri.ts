/**
 * Benzer ilan önerilerinin tipleri ve eşiği.
 *
 * ⚠️ AYRI DOSYA — ZORUNLU. Sunucu eylemi dosyaları yalnızca asenkron
 * fonksiyon dışa aktarabiliyor; bir sabit ya da tip oradan çıkarsa derleme
 * "modülün hiç dışa aktarımı yok" diyor ve ekran 500 veriyor. Hata mesajı
 * sebebi göstermiyordu; kayda değer.
 */

export interface Oneri {
  alan: 'isinma' | 'kullanimDurumu' | 'tapuDurumu'
  deger: string
  etiket: string
  /** Kaç benzer ilanda bu değer görüldü. */
  adet: number
  toplam: number
}

/**
 * Öneri üretmek için gereken en az benzer ilan sayısı.
 *
 * ⚠️ Üçün altında "genelde" diye bir şey yok. İki ilana bakıp "bu
 * mahallede ısıtma genelde şudur" demek, veriden çok tahmin üretmek olurdu.
 */
export const ASGARI_BENZER = 3
