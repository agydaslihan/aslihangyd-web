import { describe, expect, it } from 'vitest'

import {
  adayGenislik,
  ERTELEMESIZ_KART,
  ERTELENEN_SIZES,
  HERO_SIZES,
  inecekGenislik,
  KART_SIZES,
  sizesCssPiksel,
} from './boyutlar'

/**
 * `sizes` → inecek genişlik türetmesini sınar.
 *
 * ⚠️ Bu testin işi, bütçe rozetindeki sayıların GERÇEK indirmelerle aynı
 * kalmasını sağlamak. Rozet önce 480/828/1920 sabitlerini kullanıyordu;
 * Lighthouse'un ağ kayıtları kart görsellerinin 640, hero görsellerinin
 * 750 ile indiğini gösterdi. Sabit sayı ile gerçek arasındaki fark
 * panelde sessizce yanlış rakam demekti.
 */

describe('sizes ayrıştırma', () => {
  it('koşullu vw değerini görünüm genişliğine göre çözer', () => {
    expect(sizesCssPiksel('(max-width: 640px) 78vw, 260px', 412)).toBeCloseTo(321.36)
  })

  it('eşiğin üstünde bir sonraki kurala geçer', () => {
    expect(sizesCssPiksel('(max-width: 640px) 78vw, (max-width: 1024px) 40vw, 260px', 800)).toBe(
      320,
    )
  })

  it('hiçbir koşul tutmazsa son koşulsuz değeri alır', () => {
    expect(sizesCssPiksel(KART_SIZES, 1350)).toBe(260)
  })

  it('koşulsuz vw', () => {
    expect(sizesCssPiksel('100vw', 412)).toBe(412)
  })

  /**
   * ⚠️ Anlaşılmayan bir dize sessizce 0 ya da tahmin dönmemeli.
   * Yanlış bir sayı, sayı olmamasından daha tehlikeli.
   */
  it('desteklenmeyen biçimde null döner', () => {
    expect(sizesCssPiksel('(min-resolution: 2dppx) 50em', 412)).toBeNull()
    expect(sizesCssPiksel('calc(100vw - 2rem)', 412)).toBeNull()
  })
})

describe('aday genişlik', () => {
  it('yeterli olan en küçük adaya yuvarlar', () => {
    expect(adayGenislik(563)).toBe(640)
    expect(adayGenislik(640)).toBe(640)
    expect(adayGenislik(641)).toBe(750)
  })

  it('en büyük adayı aşamaz', () => {
    expect(adayGenislik(99_999)).toBe(3840)
  })
})

describe('inecek genişlik — gözlemle kilitli', () => {
  /**
   * ⚠️ BU DÖRT SAYI ÖLÇÜLDÜ, VARSAYILMADI.
   *
   * Lighthouse'un gerçek ağ isteklerinde:
   *   · anasayfa hero  → `w=750`
   *   · /portfoy kart  → `w=640`
   * Türetme bu değerleri birebir üretiyor. `sizes` bilinçli değişirse bu
   * test de değişmeli; sessizce kaymamalı.
   */
  it('hero ve kart, mobil ve masaüstü', () => {
    expect(inecekGenislik(HERO_SIZES, 'mobil')).toBe(750)
    expect(inecekGenislik(HERO_SIZES, 'masaustu')).toBe(1920)
    expect(inecekGenislik(KART_SIZES, 'mobil')).toBe(640)
    expect(inecekGenislik(KART_SIZES, 'masaustu')).toBe(384)
  })

  it('ertelenen kart en küçük adaylardan birini seçer', () => {
    const genislik = inecekGenislik(ERTELENEN_SIZES, 'mobil')
    expect(genislik).not.toBeNull()
    // Kart genişliğinin çok altında olmalı; erteleme bunun için var.
    expect(genislik!).toBeLessThan(inecekGenislik(KART_SIZES, 'mobil')!)
    expect(genislik!).toBeLessThanOrEqual(128)
  })
})

describe('erteleme sınırı', () => {
  /**
   * ⚠️ En az iki kart ertelemesiz kalmalı: mobilde sıranın görünen kısmı
   * bu kadar ve JavaScript çalışmazsa yalnızca bunlar net görünüyor.
   */
  it('görünen kartlar erteleme dışında', () => {
    expect(ERTELEMESIZ_KART).toBeGreaterThanOrEqual(2)
  })
})
