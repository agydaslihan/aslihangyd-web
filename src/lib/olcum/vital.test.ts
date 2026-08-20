import { describe, expect, it } from 'vitest'

import {
  ESIKLER,
  KOVALAR,
  VITAL_ADLARI,
  gecerliVitalMi,
  karne,
  karneDagilimi,
  kovaSirasi,
  p75,
  type VitalAdi,
} from './vital'

describe('kova sınırları', () => {
  /**
   * ⚠️ ASIL DENETİM BU. Google'ın eşiği bir kova kenarına denk gelmezse
   * karne oranı interpolasyonla TAHMİN edilir; kenara oturunca kesin olur.
   * Eşik değişirse (Google zaman zaman değiştiriyor) bu test kırılır ve
   * kovalar da güncellenmek zorunda kalır.
   */
  it.each(VITAL_ADLARI)('%s eşikleri kova kenarına oturuyor', (ad) => {
    const kenarlar = KOVALAR[ad]
    expect(kenarlar, `${ad}: "iyi" eşiği kova kenarı değil`).toContain(ESIKLER[ad].iyi)
    expect(kenarlar, `${ad}: "zayıf" eşiği kova kenarı değil`).toContain(ESIKLER[ad].zayif)
  })

  it.each(VITAL_ADLARI)('%s kovaları artan ve son kova sınırsız', (ad) => {
    const kenarlar = KOVALAR[ad]
    for (let i = 1; i < kenarlar.length; i += 1) {
      expect(kenarlar[i]!).toBeGreaterThan(kenarlar[i - 1]!)
    }
    expect(kenarlar[kenarlar.length - 1]).toBe(Infinity)
  })
})

describe('kovaSirasi', () => {
  it('değeri doğru kovaya koyuyor', () => {
    expect(kovaSirasi('LCP', 400)).toBe(0)
    expect(kovaSirasi('LCP', 2499)).toBe(4) // 2000–2500
    expect(kovaSirasi('LCP', 2500)).toBe(5) // eşiğin üstü artık "orta"
    expect(kovaSirasi('CLS', 0.09)).toBe(2)
  })

  it('çok büyük değer son kovaya düşüyor', () => {
    expect(kovaSirasi('LCP', 120_000)).toBe(KOVALAR.LCP.length - 1)
  })

  /**
   * ⚠️ Uca elle istek atan biri `-1` gönderip histogramı kirletebilirdi;
   * bozuk bir tarayıcı değeri de sessizce ilk kovaya düşerse "site çok
   * hızlı" yanılsaması üretir.
   */
  it('geçersiz değeri reddediyor', () => {
    expect(kovaSirasi('LCP', -1)).toBeNull()
    expect(kovaSirasi('LCP', Number.NaN)).toBeNull()
    expect(kovaSirasi('LCP', Number.POSITIVE_INFINITY)).toBeNull()
  })
})

describe('karne', () => {
  it('Google eşiklerine uyuyor', () => {
    expect(karne('LCP', 2500)).toBe('iyi')
    expect(karne('LCP', 2501)).toBe('orta')
    expect(karne('LCP', 4001)).toBe('zayif')
    expect(karne('CLS', 0.1)).toBe('iyi')
    expect(karne('INP', 200)).toBe('iyi')
    expect(karne('INP', 501)).toBe('zayif')
  })
})

/** Belirli kovaya n adet koyan yardımcı. */
function histogram(ad: VitalAdi, dagitim: Record<number, number>): number[] {
  const dizi = new Array<number>(KOVALAR[ad].length).fill(0)
  for (const [sira, adet] of Object.entries(dagitim)) dizi[Number(sira)] = adet
  return dizi
}

describe('p75', () => {
  it('veri yoksa null', () => {
    expect(p75('LCP', histogram('LCP', {}))).toBeNull()
  })

  it('tek kovada toplanan veride kova aralığını veriyor', () => {
    // Hepsi 2000–2500 kovasında → p75 o aralıkta olmalı.
    const sonuc = p75('LCP', histogram('LCP', { 4: 100 }))
    expect(sonuc).not.toBeNull()
    expect(sonuc!.deger).toBeGreaterThanOrEqual(2000)
    expect(sonuc!.deger).toBeLessThanOrEqual(2500)
    expect(sonuc!.asgari).toBe(false)
  })

  it('dağılımda doğru kovayı buluyor', () => {
    // %80 hızlı (0–500), %20 yavaş → p75 ilk kovada.
    const sonuc = p75('LCP', histogram('LCP', { 0: 80, 6: 20 }))
    expect(sonuc!.deger).toBeLessThanOrEqual(500)
  })

  /**
   * ⚠️ Son kova üst sınırsız: interpolasyon yapılamaz, alt kenar "en az"
   * olarak dönüyor. Sonsuzu interpolasyona sokmak anlamsız bir sayı üretirdi.
   */
  it('p75 sınırsız kovaya düşerse asgari işaretliyor', () => {
    const son = KOVALAR.LCP.length - 1
    const sonuc = p75('LCP', histogram('LCP', { [son]: 100 }))
    expect(sonuc!.asgari).toBe(true)
    expect(sonuc!.deger).toBe(10_000)
  })
})

describe('karneDagilimi', () => {
  it('kovaları üç sınıfa doğru bölüyor', () => {
    // 0. kova (<500) iyi, 6. kova (<4000) orta, son kova zayıf.
    const d = karneDagilimi('LCP', histogram('LCP', { 0: 60, 6: 30, 9: 10 }))
    expect(d).toEqual({ iyi: 60, orta: 30, zayif: 10, toplam: 100 })
  })

  /**
   * ⚠️ Hiçbir kova iki karneye birden yayılmamalı — eşikler kova kenarına
   * oturduğu için bu garanti. Toplam, girdilerin toplamına eşit olmalı.
   */
  it.each(VITAL_ADLARI)('%s: her kova tek bir karneye düşüyor', (ad) => {
    const kenarlar = KOVALAR[ad]
    for (let i = 0; i < kenarlar.length; i += 1) {
      const d = karneDagilimi(ad, histogram(ad, { [i]: 7 }))
      expect(d.toplam, `${ad} kova ${i} kaybolmuş`).toBe(7)
    }
  })
})

describe('gecerliVitalMi', () => {
  it('sözlük dışı ad reddediliyor', () => {
    expect(gecerliVitalMi('LCP')).toBe(true)
    expect(gecerliVitalMi('FID')).toBe(false)
    expect(gecerliVitalMi('')).toBe(false)
  })
})
