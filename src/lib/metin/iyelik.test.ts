import { describe, expect, it } from 'vitest'

import { sayiIyelik } from './iyelik'

describe('sayıya iyelik eki', () => {
  /** ⚠️ EİDS sayacının kullandığı aralık — altı gerekliliğin hepsi. */
  it('0–6 arası sayaç değerleri', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(sayiIyelik)).toEqual([
      '0’ı',
      '1’i',
      '2’si',
      '3’ü',
      '4’ü',
      '5’i',
      '6’sı',
    ])
  })

  it('7–9', () => {
    expect([7, 8, 9].map(sayiIyelik)).toEqual(['7’si', '8’i', '9’u'])
  })

  it('onlar basamağı son kelimeyse ona uyuyor', () => {
    expect([10, 20, 30, 40, 50, 60, 70, 80, 90].map(sayiIyelik)).toEqual([
      '10’u',
      '20’si',
      '30’u',
      '40’ı',
      '50’si',
      '60’ı',
      '70’i',
      '80’i',
      '90’ı',
    ])
  })

  it('bileşik sayıda son kelimeye uyuyor', () => {
    expect(sayiIyelik(16)).toBe('16’sı')
    expect(sayiIyelik(43)).toBe('43’ü')
    expect(sayiIyelik(100)).toBe('100’ü')
    expect(sayiIyelik(2000)).toBe('2000’i')
    expect(sayiIyelik(3_000_000)).toBe('3000000’u')
  })

  it('negatif ya da ondalık sayı sessizce yanlış ek almıyor', () => {
    expect(() => sayiIyelik(-1)).toThrow()
    expect(() => sayiIyelik(1.5)).toThrow()
  })
})
