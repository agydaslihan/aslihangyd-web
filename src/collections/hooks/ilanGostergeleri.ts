import type { CollectionBeforeChangeHook } from 'payload'

import { gostergeleriHesapla } from '@/lib/ilan/hesaplamalar'

/**
 * Kira çarpanı, brüt getiri ve amortisman yılını her kayıtta yeniden hesaplar.
 *
 * Bu alanlar panelde salt okunurdur — elle girilemez. Sebebi: elle girilmiş
 * bir kira çarpanı, fiyat değiştiğinde sessizce yanlışa döner. Yatırımcının
 * ilk baktığı rakamın yanlış olması en pahalı hatadır.
 *
 * Kiralık ilanlarda hesaplanmaz: kiralık ilanın `fiyat` alanı zaten aylık
 * kiradır; "kiranın kira çarpanı" anlamsızdır.
 */
export const ilanGostergeleri: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const kayit = { ...(originalDoc ?? {}), ...data } as Record<string, unknown>

  if (kayit.tip !== 'satilik') {
    return { ...data, kiraCarpani: null, brutGetiri: null, amortismanYili: null }
  }

  const gostergeler = gostergeleriHesapla({
    fiyat: typeof kayit.fiyat === 'number' ? kayit.fiyat : null,
    tahminiKira: typeof kayit.tahminiKira === 'number' ? kayit.tahminiKira : null,
  })

  return { ...data, ...gostergeler }
}
