import { describe, expect, it } from 'vitest'

import {
  AZAMI_DENEME,
  BEKLEME_MS,
  beklemeSuresi,
  KOTA_BEKLEME_MS,
  kotaMetni,
  sureMetni,
  yenidenDenemeMetni,
} from './yenidenDeneme'

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

describe('kota (429) bekleme merdiveni', () => {
  it('kota beklemesi normalden belirgin biçimde uzun', () => {
    for (let deneme = 2; deneme <= AZAMI_DENEME; deneme += 1) {
      expect(beklemeSuresi(deneme, true)).toBeGreaterThan(beklemeSuresi(deneme, false))
    }
  })

  it('ilk kota beklemesi en az bir dakika', () => {
    expect(beklemeSuresi(2, true)).toBeGreaterThanOrEqual(60_000)
  })

  /**
   * ⚠️ 429'DA AGRESİF OLMAK YANLIŞ YÖN.
   *
   * Doğru tepki daha çok denemek değil, daha çok beklemek. Bu test deneme
   * sayısının kota yüzünden artırılmadığını kilitliyor: merdiven uzadı,
   * merdivenin basamak sayısı değil.
   */
  it('kota deneme SAYISINI artırmıyor — yalnızca beklemeyi', () => {
    expect(KOTA_BEKLEME_MS.length).toBe(BEKLEME_MS.length)
    expect(AZAMI_DENEME).toBeLessThanOrEqual(4)
  })

  /**
   * ⚠️ Kota metni bunun bir ARIZA OLMADIĞINI söylemeli. "Hata" diye okuyan
   * biri butona tekrar tekrar basar ve tam olarak yapılmaması gerekeni yapar.
   */
  it('kota metni hata olmadığını ve ısrarın zararını söylüyor', () => {
    const metin = kotaMetni(2, 60)
    expect(metin).toContain('hata değil')
    expect(metin).toContain('uzatır')
    expect(metin).not.toBe(yenidenDenemeMetni(2, 60))
  })

  it('uzun süreler dakikayla yazılıyor', () => {
    expect(sureMetni(45)).toBe('45 sn')
    expect(sureMetni(180)).toBe('3 dk')
  })
})
