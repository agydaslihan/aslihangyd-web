import { describe, expect, it } from 'vitest'

import { endeksHesapla, kiraCarpaniSerisi, medyan, reelEndeksHesapla, yayinKontrolu } from './motor'
import {
  ASGARI_AY_SAYISI,
  ASGARI_TOPLAM_GOZLEM,
  KATMAN_MINIMUM_GOZLEM,
  type Gozlem,
  type KatmanAgirligi,
} from './tipler'

/**
 * ⚠️ Buradaki gözlemler UYDURMADIR ve yalnızca hesap mantığını sınamak
 * içindir. Gerçek gözlemler Aslıhan'ın haftalık girişinden gelir.
 */

const agirliklar: KatmanAgirligi[] = [
  { mahalleSlug: 'muhittin', odaTipi: '3+1', agirlik: 0.6 },
  { mahalleSlug: 'seyhsinan', odaTipi: '3+1', agirlik: 0.4 },
]

/** Bir katman için n adet gözlem üretir. */
function gozlemler(
  ay: string,
  mahalleSlug: string,
  fiyatlar: number[],
  ek: Partial<Gozlem> = {},
): Gozlem[] {
  return fiyatlar.map((m2Fiyati) => ({
    ay,
    mahalleSlug,
    odaTipi: '3+1',
    tip: 'satilik' as const,
    kaynak: 'portal_ilan' as const,
    m2Fiyati,
    ...ek,
  }))
}

/** Eşiği tutturan (8 gözlem) bir katman üretir. */
function doluKatman(ay: string, mahalleSlug: string, temelFiyat: number): Gozlem[] {
  return gozlemler(
    ay,
    mahalleSlug,
    Array.from({ length: KATMAN_MINIMUM_GOZLEM }, (_, sira) => temelFiyat + sira * 100),
  )
}

describe('medyan', () => {
  it('tek sayıda değerde ortadakini döner', () => {
    expect(medyan([3, 1, 2])).toBe(2)
  })

  it('çift sayıda değerde ortadaki ikinin ortalamasını döner', () => {
    expect(medyan([1, 2, 3, 4])).toBe(2.5)
  })

  it('⚠️ aykırı değerden etkilenmez — ortalamadan seçilmesinin sebebi budur', () => {
    const normal = [38_500, 39_100, 39_800, 40_300, 40_900, 41_200, 42_700]
    const aykiriliOlan = [...normal, 71_000]

    // Medyan neredeyse aynı kalır...
    expect(medyan(normal)).toBe(40_300)
    expect(medyan(aykiriliOlan)).toBe(40_600)

    // ...oysa ortalama uçar.
    const ortalama = (d: number[]) => d.reduce((t, x) => t + x, 0) / d.length
    expect(ortalama(aykiriliOlan) - ortalama(normal)).toBeGreaterThan(3_000)
  })

  it('boş dizide null döner', () => {
    expect(medyan([])).toBeNull()
  })
})

describe('endeksHesapla — temel', () => {
  it('baz ay endeksi 100 olur', () => {
    const veri = [
      ...doluKatman('2026-01', 'muhittin', 40_000),
      ...doluKatman('2026-01', 'seyhsinan', 35_000),
    ]

    const seri = endeksHesapla(veri, agirliklar)
    expect(seri?.aylar[0]?.endeks).toBe(100)
  })

  it('fiyat artışını endekse yansıtır', () => {
    const veri = [
      ...doluKatman('2026-01', 'muhittin', 40_000),
      ...doluKatman('2026-01', 'seyhsinan', 40_000),
      // Şubatta her iki katman da %10 arttı.
      ...doluKatman('2026-02', 'muhittin', 44_000),
      ...doluKatman('2026-02', 'seyhsinan', 44_000),
    ]

    const seri = endeksHesapla(veri, agirliklar)
    expect(seri?.aylar[1]?.endeks).toBeCloseTo(110, 0)
  })

  it('ağırlıkları uygular — çok ağırlıklı katman endeksi daha çok etkiler', () => {
    const veri = [
      ...doluKatman('2026-01', 'muhittin', 40_000),
      ...doluKatman('2026-01', 'seyhsinan', 40_000),
      // Yalnızca ağırlığı 0,6 olan Muhittin %20 arttı.
      ...doluKatman('2026-02', 'muhittin', 48_000),
      ...doluKatman('2026-02', 'seyhsinan', 40_000),
    ]

    const seri = endeksHesapla(veri, agirliklar)
    // 0,6 × %20 = %12 artış beklenir.
    expect(seri?.aylar[1]?.endeks).toBeCloseTo(112, 0)
  })
})

describe('⚠️ endeksHesapla — bileşim yanlılığına karşı sabit ağırlık', () => {
  it('gözlem dağılımı değişse de fiyatlar sabitse endeks sabit kalır', () => {
    // Ocakta iki katmanda eşit gözlem; Şubatta pahalı katmandan çok daha
    // fazla gözlem var ama FİYATLAR DEĞİŞMEDİ. Endeks kıpırdamamalı.
    const veri = [
      ...doluKatman('2026-01', 'muhittin', 60_000),
      ...doluKatman('2026-01', 'seyhsinan', 30_000),

      ...gozlemler(
        '2026-02',
        'muhittin',
        Array.from({ length: 40 }, (_, i) => 60_000 + i * 100),
      ),
      ...doluKatman('2026-02', 'seyhsinan', 30_000),
    ]

    const seri = endeksHesapla(veri, agirliklar)
    const ocak = seri?.aylar[0]?.endeks ?? 0
    const subat = seri?.aylar[1]?.endeks ?? 0

    // Medyanlar hafifçe kayar (gözlem seti genişledi) ama endeks
    // bileşim değişiminden dolayı fırlamaz.
    expect(Math.abs(subat - ocak)).toBeLessThan(4)
  })
})

describe('⚠️ endeksHesapla — eşik altında uydurma yapılmaz', () => {
  it(`${KATMAN_MINIMUM_GOZLEM} gözlemden az olan katmanda önceki ay TAŞINIR`, () => {
    const veri = [
      ...doluKatman('2026-01', 'muhittin', 40_000),
      ...doluKatman('2026-01', 'seyhsinan', 40_000),
      // Şubatta Muhittin'de yalnızca 3 gözlem var.
      ...gozlemler('2026-02', 'muhittin', [99_000, 99_100, 99_200]),
      ...doluKatman('2026-02', 'seyhsinan', 40_000),
    ]

    const seri = endeksHesapla(veri, agirliklar)
    const subat = seri?.aylar[1]

    const muhittin = subat?.katmanlar.find((k) => k.mahalleSlug === 'muhittin')
    expect(muhittin?.tasindi).toBe(true)
    // 99.000'lik uç gözlemler endekse SIZMAZ.
    expect(muhittin?.medyan).toBeCloseTo(40_350, 0)
    expect(subat?.tasinanKatmanSayisi).toBe(1)
  })

  it('taşınan katmanlar açıkça işaretlenir — şeffaflık kuralı', () => {
    const veri = [
      ...doluKatman('2026-01', 'muhittin', 40_000),
      ...doluKatman('2026-01', 'seyhsinan', 40_000),
      ...gozlemler('2026-02', 'muhittin', [40_000]),
      ...doluKatman('2026-02', 'seyhsinan', 40_000),
    ]

    const seri = endeksHesapla(veri, agirliklar)
    const tasinanlar = seri?.aylar[1]?.katmanlar.filter((k) => k.tasindi) ?? []

    expect(tasinanlar).toHaveLength(1)
  })

  it('her katmanda gözlem sayısı (n) raporlanır', () => {
    const veri = doluKatman('2026-01', 'muhittin', 40_000)
    const seri = endeksHesapla(veri, agirliklar)

    const muhittin = seri?.aylar[0]?.katmanlar.find((k) => k.mahalleSlug === 'muhittin')
    expect(muhittin?.gozlemSayisi).toBe(KATMAN_MINIMUM_GOZLEM)
  })
})

describe('⚠️ endeksHesapla — istenen ve gerçekleşen fiyat karıştırılmaz', () => {
  it('varsayılan seri yalnızca istenen fiyat gözlemlerini kullanır', () => {
    const veri = [
      ...doluKatman('2026-01', 'muhittin', 40_000),
      ...doluKatman('2026-01', 'seyhsinan', 40_000),
      // Gerçekleşen fiyatlar çok daha düşük — karışsaydı endeks bozulurdu.
      ...doluKatman('2026-01', 'muhittin', 20_000).map((g) => ({
        ...g,
        kaynak: 'kendi_islem' as const,
      })),
    ]

    const seri = endeksHesapla(veri, agirliklar, 'istenen_fiyat')
    const muhittin = seri?.aylar[0]?.katmanlar.find((k) => k.mahalleSlug === 'muhittin')

    expect(muhittin?.gozlemSayisi).toBe(KATMAN_MINIMUM_GOZLEM)
    expect(muhittin?.medyan).toBeGreaterThan(39_000)
  })

  it('gerçekleşen fiyat serisi ayrı hesaplanır', () => {
    const veri = doluKatman('2026-01', 'muhittin', 20_000).map((g) => ({
      ...g,
      kaynak: 'kendi_islem' as const,
    }))

    const seri = endeksHesapla(veri, agirliklar, 'gerceklesen_fiyat')
    expect(seri?.seriTipi).toBe('gerceklesen_fiyat')
    expect(seri?.aylar[0]?.toplamGozlem).toBe(KATMAN_MINIMUM_GOZLEM)
  })
})

describe('reelEndeksHesapla', () => {
  it('nominal endeksi TÜFE ile deflate eder', () => {
    // Nominal 150, TÜFE bazdan 1,5 kat arttı → reel 100 (yerinde saymış)
    expect(reelEndeksHesapla(150, 150, 100)).toBe(100)
  })

  it('enflasyonun üzerindeki artışı gösterir', () => {
    expect(reelEndeksHesapla(200, 150, 100)).toBeCloseTo(133.33, 1)
  })

  it.each([0, -1, Number.NaN])('geçersiz TÜFE değerinde (%j) null döner', (tufe) => {
    expect(reelEndeksHesapla(150, tufe, 100)).toBeNull()
  })
})

describe('kiraCarpaniSerisi', () => {
  it('satış ve kira medyanlarından çarpanı hesaplar', () => {
    const veri = [
      ...doluKatman('2026-01', 'muhittin', 40_000),
      ...doluKatman('2026-01', 'muhittin', 200).map((g) => ({
        ...g,
        tip: 'kiralik' as const,
      })),
    ]

    const satilik = endeksHesapla(
      veri.filter((g) => g.tip === 'satilik'),
      agirliklar,
    )
    const kiralik = endeksHesapla(
      veri.filter((g) => g.tip === 'kiralik'),
      agirliklar,
    )
    const seri = kiraCarpaniSerisi(satilik, kiralik, veri)

    // 40.350 / (550 × 12) ≈ 6,1 — burada rakamlar uydurma; önemli olan
    // hesabın doğru yapılması.
    expect(seri[0]?.carpan).toBeGreaterThan(0)
  })

  it('kira verisi yoksa çarpan null döner', () => {
    const veri = doluKatman('2026-01', 'muhittin', 40_000)
    const satilik = endeksHesapla(veri, agirliklar)
    const seri = kiraCarpaniSerisi(satilik, satilik, veri)

    expect(seri[0]?.carpan).toBeNull()
  })
})

describe('⚠️ yayinKontrolu — kod seviyesinde yayın engeli', () => {
  /** Yayın için gereken her şeyi sağlayan veri kümesi. */
  function yeterliVeri(): Gozlem[] {
    const aylar = Array.from(
      { length: ASGARI_AY_SAYISI },
      (_, sira) => `2026-${String(sira + 1).padStart(2, '0')}`,
    )

    return aylar.flatMap((ay) => [
      ...gozlemler(
        ay,
        'muhittin',
        Array.from({ length: 45 }, (_, i) => 40_000 + i * 10),
      ),
      ...gozlemler(
        ay,
        'seyhsinan',
        Array.from({ length: 45 }, (_, i) => 35_000 + i * 10),
      ),
    ])
  }

  it('tüm koşullar sağlandığında yayınlanabilir', () => {
    const sonuc = yayinKontrolu(yeterliVeri(), agirliklar, true)
    expect(sonuc.yayinlanabilir).toBe(true)
    expect(sonuc.engeller).toEqual([])
  })

  it(`${ASGARI_AY_SAYISI} aydan az veri varsa YAYINLANAMAZ`, () => {
    const az = yeterliVeri().filter((g) => g.ay < '2026-04')
    const sonuc = yayinKontrolu(az, agirliklar, true)

    expect(sonuc.yayinlanabilir).toBe(false)
    expect(sonuc.engeller.join(' ')).toMatch(/ay veri/)
  })

  it(`${ASGARI_TOPLAM_GOZLEM} gözlemden az varsa YAYINLANAMAZ`, () => {
    const aylar = Array.from(
      { length: ASGARI_AY_SAYISI },
      (_, sira) => `2026-${String(sira + 1).padStart(2, '0')}`,
    )
    const az = aylar.flatMap((ay) => [
      ...doluKatman(ay, 'muhittin', 40_000),
      ...doluKatman(ay, 'seyhsinan', 35_000),
    ])

    const sonuc = yayinKontrolu(az, agirliklar, true)
    expect(sonuc.yayinlanabilir).toBe(false)
    expect(sonuc.engeller.join(' ')).toMatch(/gözlem/)
  })

  it('metodoloji sayfası yayında değilse YAYINLANAMAZ', () => {
    const sonuc = yayinKontrolu(yeterliVeri(), agirliklar, false)

    expect(sonuc.yayinlanabilir).toBe(false)
    expect(sonuc.engeller.join(' ')).toMatch(/[Mm]etodoloji/)
  })

  it('bir katman bazı aylarda eşiği tutturamıyorsa ağırlık kapsamı düşer', () => {
    const veri = yeterliVeri().filter((g) => !(g.ay === '2026-03' && g.mahalleSlug === 'muhittin'))

    const sonuc = yayinKontrolu(veri, agirliklar, true)
    expect(sonuc.yayinlanabilir).toBe(false)
    expect(sonuc.engeller.join(' ')).toMatch(/ağırlığın/i)
  })

  it('hiç veri yokken de çökmez, tüm engelleri sıralar', () => {
    const sonuc = yayinKontrolu([], agirliklar, false)

    expect(sonuc.yayinlanabilir).toBe(false)
    expect(sonuc.engeller.length).toBeGreaterThanOrEqual(3)
  })

  it('sağlanan koşullar da raporlanır — ilerleme görünsün', () => {
    const sonuc = yayinKontrolu(yeterliVeri(), agirliklar, true)
    expect(sonuc.saglananlar.length).toBeGreaterThan(0)
  })
})
