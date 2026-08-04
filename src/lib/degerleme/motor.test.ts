import { describe, expect, it } from 'vitest'

import {
  ARALIK_GENISLIKLERI,
  BOS_KATSAYILAR,
  degerlemeYap,
  GUVEN_ESIKLERI,
  type DegerlemeKatsayilari,
} from './motor'

/**
 * ⚠️ Buradaki katsayılar UYDURMADIR ve yalnızca model mantığını sınamak
 * içindir. Gerçek katsayılar CMS'ten gelir ve Aslıhan'ın saha bilgisiyle
 * belirlenir. Testler katsayıların DEĞERİNİ değil, DOĞRU UYGULANDIĞINI
 * kanıtlar.
 */
const katsayilar: DegerlemeKatsayilari = {
  kat: { bodrum: 0.85, zemin: 0.92, ara: 1, yuksek: 1.03, en_ust: 0.97 },
  durum: { sifir: 1.08, iyi: 1, ortalama: 0.95, tadilat: 0.85 },
  yas: [
    { ustYas: 5, katsayi: 1.05 },
    { ustYas: 10, katsayi: 1 },
    { ustYas: 20, katsayi: 0.92 },
    { ustYas: null, katsayi: 0.8 },
  ],
}

function girdi(degisiklik: Record<string, unknown> = {}) {
  return {
    mahalleM2Fiyati: 40_000,
    gozlemSayisi: 30,
    brutM2: 100,
    kat: 'ara' as const,
    binaYasi: 8,
    durum: 'iyi' as const,
    ...degisiklik,
  }
}

describe('degerlemeYap — temel model', () => {
  it('taban fiyat × m² × katsayılar çarpımını uygular', () => {
    // 40.000 × 1 (ara kat) × 1 (8 yaş) × 1 (iyi) = 40.000 /m² × 100 = 4.000.000
    const sonuc = degerlemeYap(girdi(), katsayilar)
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    expect(sonuc.veri.m2BirimFiyati).toBe(40_000)
    expect(sonuc.veri.ortaDeger).toBe(4_000_000)
  })

  it('katsayılar çarpımsal uygulanır', () => {
    // 40.000 × 1,03 (yüksek kat) × 1,05 (3 yaş) × 1,08 (sıfır) = 46.732,32
    const sonuc = degerlemeYap(girdi({ kat: 'yuksek', binaYasi: 3, durum: 'sifir' }), katsayilar)
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    expect(sonuc.veri.m2BirimFiyati).toBeCloseTo(40_000 * 1.03 * 1.05 * 1.08, 0)
  })

  it('her katsayının etkisi ayrı ayrı raporlanır — kara kutu değil', () => {
    const sonuc = degerlemeYap(girdi(), katsayilar)
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    expect(sonuc.veri.etkiler.map((etki) => etki.ad)).toEqual([
      'Bulunduğu kat',
      'Bina yaşı',
      'Yapı durumu',
    ])
  })
})

describe('⚠️ degerlemeYap — veri yoksa tahmin üretilmez', () => {
  it.each([null, undefined, 0, -1, Number.NaN])(
    'mahalle m² fiyatı %j ise değerleme YAPILMAZ',
    (deger) => {
      const sonuc = degerlemeYap(girdi({ mahalleM2Fiyati: deger }), katsayilar)

      expect(sonuc.durum).toBe('veri_yok')
      if (sonuc.durum !== 'veri_yok') return
      expect(sonuc.sebep).toBe('mahalle_verisi_yok')
    },
  )

  it('m² girilmemişse değerleme yapılmaz', () => {
    const sonuc = degerlemeYap(girdi({ brutM2: null }), katsayilar)

    expect(sonuc.durum).toBe('veri_yok')
    if (sonuc.durum !== 'veri_yok') return
    expect(sonuc.sebep).toBe('m2_girilmedi')
  })
})

describe('degerlemeYap — aralık, nokta değer değil', () => {
  it('alt ve üst değer üretir', () => {
    const sonuc = degerlemeYap(girdi(), katsayilar)
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    expect(sonuc.veri.altDeger).toBeLessThan(sonuc.veri.ortaDeger)
    expect(sonuc.veri.ustDeger).toBeGreaterThan(sonuc.veri.ortaDeger)
  })

  it('aralık, güven düzeyine göre belirlenen genişliktedir', () => {
    const sonuc = degerlemeYap(girdi(), katsayilar)
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    const beklenenAlt = Math.round(sonuc.veri.ortaDeger * (1 - ARALIK_GENISLIKLERI.yuksek))
    expect(sonuc.veri.altDeger).toBe(beklenenAlt)
  })
})

describe('⚠️ degerlemeYap — az veri, geniş aralık', () => {
  it(`${GUVEN_ESIKLERI.orta} gözlemden az ise güven DÜŞÜK`, () => {
    const sonuc = degerlemeYap(girdi({ gozlemSayisi: 3 }), katsayilar)
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    expect(sonuc.veri.guvenDuzeyi).toBe('dusuk')
  })

  it('gözlem sayısı hiç bilinmiyorsa güven DÜŞÜK', () => {
    const sonuc = degerlemeYap(girdi({ gozlemSayisi: null }), katsayilar)
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    expect(sonuc.veri.guvenDuzeyi).toBe('dusuk')
  })

  it(`${GUVEN_ESIKLERI.yuksek} ve üzeri gözlemde güven YÜKSEK`, () => {
    const sonuc = degerlemeYap(girdi({ gozlemSayisi: GUVEN_ESIKLERI.yuksek }), katsayilar)
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    expect(sonuc.veri.guvenDuzeyi).toBe('yuksek')
  })

  it('düşük güvende aralık, yüksek güvendekinden GENİŞTİR', () => {
    const az = degerlemeYap(girdi({ gozlemSayisi: 3 }), katsayilar)
    const cok = degerlemeYap(girdi({ gozlemSayisi: 50 }), katsayilar)

    if (az.durum !== 'hesaplandi' || cok.durum !== 'hesaplandi') {
      throw new Error('hesaplanmalıydı')
    }

    const azGenislik = az.veri.ustDeger - az.veri.altDeger
    const cokGenislik = cok.veri.ustDeger - cok.veri.altDeger

    expect(azGenislik).toBeGreaterThan(cokGenislik)
  })
})

describe('⚠️ degerlemeYap — tanımsız katsayı uydurulmaz', () => {
  it('katsayı yoksa o faktör hesaba KATILMAZ, 1.0 varsayılmaz', () => {
    const sonuc = degerlemeYap(girdi(), BOS_KATSAYILAR)
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    expect(sonuc.veri.etkiler).toHaveLength(0)
    // Taban fiyat aynen kalır — sessizce ayarlama yapılmış gibi görünmez.
    expect(sonuc.veri.m2BirimFiyati).toBe(40_000)
  })

  it('hesaba katılamayan faktörler kullanıcıya bildirilir', () => {
    const sonuc = degerlemeYap(girdi(), BOS_KATSAYILAR)
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    expect(sonuc.veri.katilmayanFaktorler).toEqual([
      'Kat etkisi',
      'Bina yaşı etkisi',
      'Yapı durumu etkisi',
    ])
  })

  it('iki veya daha fazla faktör eksikse gözlem bol olsa bile güven DÜŞER', () => {
    const sonuc = degerlemeYap(girdi({ gozlemSayisi: 100 }), BOS_KATSAYILAR)
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    expect(sonuc.veri.guvenDuzeyi).toBe('dusuk')
  })
})

describe('degerlemeYap — yaş dilimleri', () => {
  it.each([
    [0, 1.05],
    [5, 1.05],
    [6, 1],
    [10, 1],
    [11, 0.92],
    [20, 0.92],
    [21, 0.8],
    [60, 0.8],
  ])('bina yaşı %i → katsayı %f', (yas, beklenen) => {
    const sonuc = degerlemeYap(girdi({ binaYasi: yas, kat: null, durum: null }), katsayilar)
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    expect(sonuc.veri.etkiler[0]?.katsayi).toBe(beklenen)
  })

  it('dilimler karışık sırada verilse de doğru çalışır', () => {
    const karisik: DegerlemeKatsayilari = {
      ...katsayilar,
      yas: [
        { ustYas: null, katsayi: 0.8 },
        { ustYas: 20, katsayi: 0.92 },
        { ustYas: 5, katsayi: 1.05 },
        { ustYas: 10, katsayi: 1 },
      ],
    }

    const sonuc = degerlemeYap(girdi({ binaYasi: 3, kat: null, durum: null }), karisik)
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    expect(sonuc.veri.etkiler[0]?.katsayi).toBe(1.05)
  })
})
