import { describe, expect, it } from 'vitest'

import { AZAMI_DENEME, BEKLEME_MS, beklemeSuresi, yenidenDenemeMetni } from './yenidenDeneme'

describe('yeniden deneme politikası', () => {
  it('ilk deneme beklemesiz', () => {
    expect(beklemeSuresi(1)).toBe(0)
  })

  it('bekleme üstel artıyor', () => {
    expect(beklemeSuresi(2)).toBe(5_000)
    expect(beklemeSuresi(3)).toBe(15_000)
    expect(beklemeSuresi(4)).toBe(45_000)
  })

  /**
   * ⚠️ NEZAKET SINIRI — PAYLAŞIMLI KAYNAĞA ISRAR ETMEK KÖTÜYE KULLANIMDIR.
   *
   * Overpass'ın açık örnekleri ücretsiz. Dörtten fazla deneme ya da sabit
   * kısa aralık, sunucuyu herkes için yavaşlatır. Bu iki test o kararı
   * kilitliyor: biri sayıyı, diğeri artışın gerçekten üstel olduğunu.
   */
  it('deneme sayısı nezaket sınırında kalıyor', () => {
    expect(AZAMI_DENEME).toBeLessThanOrEqual(4)
    expect(AZAMI_DENEME).toBeGreaterThanOrEqual(2)
  })

  it('bekleme dizisi azalmıyor — sabit kısa aralık yok', () => {
    for (let i = 1; i < BEKLEME_MS.length; i += 1) {
      expect(BEKLEME_MS[i]).toBeGreaterThan(BEKLEME_MS[i - 1] as number)
    }
    // İlk bekleme bile hemen tekrar denemek sayılmayacak kadar uzun.
    expect(BEKLEME_MS[0]).toBeGreaterThanOrEqual(5_000)
  })

  it('dizinin sonundan taşan deneme son değeri kullanır', () => {
    expect(beklemeSuresi(99)).toBe(BEKLEME_MS[BEKLEME_MS.length - 1])
  })

  it('mesaj deneme sayısını ve kalan süreyi içerir', () => {
    const metin = yenidenDenemeMetni(2, 15)
    expect(metin).toContain('15 sn')
    expect(metin).toContain(`2/${AZAMI_DENEME}`)
  })
})
