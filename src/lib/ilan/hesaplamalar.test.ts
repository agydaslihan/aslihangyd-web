import { describe, expect, it } from 'vitest'

import { gostergeleriHesapla } from './hesaplamalar'

describe('gostergeleriHesapla', () => {
  it('kira çarpanını fiyat / (kira × 12) olarak hesaplar', () => {
    // 4.800.000 / (20.000 × 12) = 20
    const sonuc = gostergeleriHesapla({ fiyat: 4_800_000, tahminiKira: 20_000 })
    expect(sonuc.kiraCarpani).toBe(20)
  })

  it('brüt getiriyi yüzde olarak hesaplar', () => {
    // (20.000 × 12) / 4.800.000 × 100 = %5
    const sonuc = gostergeleriHesapla({ fiyat: 4_800_000, tahminiKira: 20_000 })
    expect(sonuc.brutGetiri).toBe(5)
  })

  it('amortisman yılı, tanım gereği kira çarpanına eşittir', () => {
    const sonuc = gostergeleriHesapla({ fiyat: 3_150_000, tahminiKira: 14_500 })
    expect(sonuc.amortismanYili).toBe(sonuc.kiraCarpani)
  })

  it('iki ondalık basamağa yuvarlar', () => {
    const sonuc = gostergeleriHesapla({ fiyat: 1_000_000, tahminiKira: 3_333 })
    // 1.000.000 / 39.996 = 25.0025 → 25
    expect(sonuc.kiraCarpani).toBe(25)
    expect(sonuc.brutGetiri).toBe(4)
  })

  it('kira çarpanı ile brüt getiri birbirinin tersidir', () => {
    const { kiraCarpani, brutGetiri } = gostergeleriHesapla({
      fiyat: 5_000_000,
      tahminiKira: 18_000,
    })

    expect(kiraCarpani).not.toBeNull()
    expect(brutGetiri).not.toBeNull()
    expect(100 / kiraCarpani!).toBeCloseTo(brutGetiri!, 1)
  })
})

describe('gostergeleriHesapla — eksik veri (sayı uydurulmaz)', () => {
  it.each([
    ['fiyat yok', { tahminiKira: 20_000 }],
    ['kira yok', { fiyat: 4_800_000 }],
    ['ikisi de yok', {}],
    ['fiyat null', { fiyat: null, tahminiKira: 20_000 }],
    ['kira null', { fiyat: 4_800_000, tahminiKira: null }],
    ['fiyat sıfır', { fiyat: 0, tahminiKira: 20_000 }],
    ['kira sıfır', { fiyat: 4_800_000, tahminiKira: 0 }],
    ['negatif fiyat', { fiyat: -1, tahminiKira: 20_000 }],
    ['NaN', { fiyat: Number.NaN, tahminiKira: 20_000 }],
    ['Infinity', { fiyat: Number.POSITIVE_INFINITY, tahminiKira: 20_000 }],
  ])('%s → tüm göstergeler null', (_ad, girdi) => {
    expect(gostergeleriHesapla(girdi)).toEqual({
      kiraCarpani: null,
      brutGetiri: null,
      amortismanYili: null,
    })
  })
})
