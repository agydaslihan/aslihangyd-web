import { describe, expect, it } from 'vitest'

import { kontrastOrani, oraniYuvarla } from '@/lib/tasarim/kontrast'

import { ctaKenari } from './ctaKenari'

/**
 * ⚠️ NEDEN VAR: ALTIN BUTONUN SINIRI GÖRÜNMÜYORDU.
 *
 * Aurora'nın eylem rengi altın ve sayfa zemininden 2,28:1 ayrışıyor —
 * WCAG 1.4.11'in 3:1 eşiğinin altında. Kenarlık bu açığı kapatıyor ve
 * marka panelinden seçilen HER renk için kapatmak zorunda.
 */
describe('CTA kenarlığı', () => {
  const ZEMIN = '#fcfbf8'
  const KOYU_ZEMIN = '#1c1c1c'

  it('altın buton açık zeminde eşiği geçen bir kenarlık üretiyor', () => {
    const kenar = ctaKenari('#c7a36b', ZEMIN)
    expect(oraniYuvarla(kontrastOrani('#c7a36b', ZEMIN))).toBeLessThan(3)
    expect(kontrastOrani(kenar, ZEMIN)).toBeGreaterThanOrEqual(3)
  })

  it('zaten ayrışan buton için kenarlık üretilmiyor', () => {
    // Mürekkep buton açık zeminde 16,46:1 — kenarlığa gerek yok.
    expect(ctaKenari('#1c1c1c', ZEMIN)).toBe('#1c1c1c')
  })

  /**
   * ⚠️ Tek yönlü koyulaştırma koyu temada işe yaramaz: butonu zemine
   * yaklaştırır. Yön zemine göre seçiliyor.
   */
  it('koyu zeminde kenarlık AÇILIYOR', () => {
    const kenar = ctaKenari('#3a2b10', KOYU_ZEMIN)
    expect(kontrastOrani(kenar, KOYU_ZEMIN)).toBeGreaterThanOrEqual(3)
  })

  it('panelden gelebilecek rastgele renklerde de eşiği tutturuyor', () => {
    const adaylar = ['#c7a36b', '#f5f0e8', '#8b8378', '#d5b98d', '#ffffff', '#7a5e2e']
    for (const renk of adaylar) {
      const kenar = ctaKenari(renk, ZEMIN)
      expect(kontrastOrani(kenar, ZEMIN), `${renk} → ${kenar}`).toBeGreaterThanOrEqual(2.99)
    }
  })

  it('geçersiz değerde kendi girdisini döndürüyor', () => {
    expect(ctaKenari('mavi', ZEMIN)).toBe('mavi')
  })
})
