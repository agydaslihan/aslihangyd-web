import { describe, expect, it } from 'vitest'

import {
  BILINCLI_DISARIDA,
  bilincliDisaridaGerekcesi,
  ESLEME_KURALLARI,
  eslenmeyenEtiket,
  sorguFiltreleri,
  tipiEslestir,
} from './eslesme'
import {
  AZAMI_KENAR_DERECE,
  kutuMakulMu,
  merkezlerdenKutu,
  overpassCevabiniCoz,
  overpassSorgusu,
} from './sorgu'

// ═══════════════════════════════════════════════════════════════════════════
describe('kategori eşlemesi', () => {
  it('okul, hastane ve marketi tanır', () => {
    expect(tipiEslestir({ amenity: 'school' })?.tip).toBe('okul')
    expect(tipiEslestir({ amenity: 'hospital' })?.tip).toBe('hastane')
    expect(tipiEslestir({ shop: 'supermarket' })?.tip).toBe('market')
  })

  it('değer sürücülerini "önemli" işaretler', () => {
    // OSB, tren istasyonu, havalimanı, hastane, AVM, üniversite: bunlar
    // Çorlu'nun değer sürücüleri ve skor önerisinde en ağır kalemler.
    expect(tipiEslestir({ landuse: 'industrial' })?.onemli).toBe(true)
    expect(tipiEslestir({ railway: 'station' })?.onemli).toBe(true)
    expect(tipiEslestir({ aeroway: 'aerodrome' })?.onemli).toBe(true)
    // Sıradan bir otobüs durağı değer sürücüsü değil.
    expect(tipiEslestir({ highway: 'bus_stop' })?.onemli).toBe(false)
  })

  it('eşleşmeyen etikette null döner — uydurma tip atamaz', () => {
    expect(tipiEslestir({ shop: 'bakery' })).toBeNull()
    expect(tipiEslestir({ amenity: 'bank' })).toBeNull()
    expect(tipiEslestir({})).toBeNull()
    expect(tipiEslestir(undefined)).toBeNull()
  })

  /**
   * ⚠️ Bu iki tip, eşlenmeyen tür raporuna bakılarak eklendi (12 Ağustos
   * 2026). Rapor tam olarak bunun için var; test o kararın kodda kaldığını
   * güvenceye alıyor.
   */
  it('eczane ve çocuk oyun alanı eşleniyor — rapordan gelen karar', () => {
    expect(tipiEslestir({ amenity: 'pharmacy' })?.tip).toBe('eczane')
    expect(tipiEslestir({ leisure: 'playground' })?.tip).toBe('oyun_alani')
  })

  /**
   * ⚠️ Oyun alanı parktan AYRI sayılıyor: her park oyun alanı içermiyor ve
   * çocuklu aile için ikisi aynı şey değil. Etiket sırası da önemli —
   * `leisure=park` kuralı `leisure=playground`u yutmamalı.
   */
  it('oyun alanı parka düşmüyor', () => {
    expect(tipiEslestir({ leisure: 'park' })?.tip).toBe('park')
    expect(tipiEslestir({ leisure: 'playground' })?.tip).not.toBe('park')
  })

  /**
   * ⚠️ Restoran bilinçli olarak dışarıda. Kararın kendisi kadar
   * GEREKÇESİNİN yazılı olması da şart: bu liste `/veri-kaynaklari`
   * sayfasında yayınlanıyor ve içe aktarma raporunda gösteriliyor.
   */
  it('restoran bilinçli dışarıda ve gerekçesi yazılı', () => {
    expect(tipiEslestir({ amenity: 'restaurant' })).toBeNull()

    const gerekce = bilincliDisaridaGerekcesi('amenity=restaurant')
    expect(gerekce).not.toBeNull()
    expect(gerekce!.length).toBeGreaterThan(20)

    // Eşlenen bir tür bu listede olmamalı — ikisi birbirini dışlar.
    expect(bilincliDisaridaGerekcesi('amenity=pharmacy')).toBeNull()
  })

  it('bilinçli dışarıda listesindeki hiçbir tür eşleme tablosunda değil', () => {
    for (const disarida of BILINCLI_DISARIDA) {
      const cakisma = ESLEME_KURALLARI.find(
        (kural) => kural.anahtar === disarida.anahtar && kural.deger === disarida.deger,
      )
      expect(cakisma, `${disarida.anahtar}=${disarida.deger} hem eşleniyor hem dışarıda`).toBe(
        undefined,
      )
    }
  })

  it('eşleşmeyen etiketi raporlanabilir biçimde özetler', () => {
    expect(eslenmeyenEtiket({ shop: 'bakery' })).toBe('shop=bakery')
    expect(eslenmeyenEtiket({ name: 'X' })).toBe('(tanınmayan etiket)')
    expect(eslenmeyenEtiket(undefined)).toBe('(etiketsiz)')
  })

  it('her kuralın gerekçesi var — yayınlanacak', () => {
    for (const kural of ESLEME_KURALLARI) {
      expect(kural.gerekce.length, `${kural.anahtar}=${kural.deger}`).toBeGreaterThan(3)
    }
  })

  it('aynı anahtar/değer çifti iki kez tanımlanmamış', () => {
    const anahtarlar = ESLEME_KURALLARI.map((k) => `${k.anahtar}=${k.deger}`)
    expect(new Set(anahtarlar).size).toBe(anahtarlar.length)
  })

  it('sorgu filtreleri eşleme tablosundan türer', () => {
    expect(sorguFiltreleri().length).toBe(ESLEME_KURALLARI.length)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('merkezlerdenKutu', () => {
  // ⚠️ Buradaki koordinatlar UYDURMA; kutu hesabını sınamak için.
  const noktalar = [
    { boylam: 27.8, enlem: 41.16 },
    { boylam: 27.85, enlem: 41.2 },
  ]

  it('noktaları çevreler', () => {
    const kutu = merkezlerdenKutu(noktalar, 0)
    expect(kutu).not.toBeNull()
    expect(kutu!.guney).toBeCloseTo(41.16, 5)
    expect(kutu!.kuzey).toBeCloseTo(41.2, 5)
    expect(kutu!.bati).toBeCloseTo(27.8, 5)
    expect(kutu!.dogu).toBeCloseTo(27.85, 5)
  })

  it('marj ekler', () => {
    const kutu = merkezlerdenKutu(noktalar, 5_000)!
    expect(kutu.guney).toBeLessThan(41.16)
    expect(kutu.kuzey).toBeGreaterThan(41.2)
  })

  it('boylam marjını enleme göre düzeltir', () => {
    // Kutuplara doğru boylam dereceleri daralır; aynı metre marjı daha
    // büyük bir derece farkı demektir.
    const ekvator = merkezlerdenKutu([{ boylam: 0, enlem: 0 }], 10_000)!
    const kuzey = merkezlerdenKutu([{ boylam: 0, enlem: 60 }], 10_000)!

    expect(kuzey.dogu - kuzey.bati).toBeGreaterThan(ekvator.dogu - ekvator.bati)
  })

  it('nokta yoksa null — sessizce tüm dünyayı sorgulamaz', () => {
    expect(merkezlerdenKutu([], 5_000)).toBeNull()
    expect(merkezlerdenKutu([{ boylam: Number.NaN, enlem: 41 }], 5_000)).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('kutuMakulMu', () => {
  it('normal boyutu kabul eder', () => {
    expect(kutuMakulMu({ guney: 41.1, kuzey: 41.3, bati: 27.7, dogu: 27.9 })).toBe(true)
  })

  it('⚠️ ülke ölçeğine şişmiş kutuyu reddeder', () => {
    // Bir mahallenin merkezi yanlışlıkla başka bir ile girildiyse kutu
    // devasa olur ve Overpass'a saçma bir sorgu gider.
    expect(kutuMakulMu({ guney: 36, kuzey: 42, bati: 26, dogu: 45 }), 'ülke ölçeği').toBe(false)
    expect(
      kutuMakulMu({ guney: 41, kuzey: 41 + AZAMI_KENAR_DERECE + 0.1, bati: 27, dogu: 27.5 }),
    ).toBe(false)
  })

  it('ters ya da sıfır kutuyu reddeder', () => {
    expect(kutuMakulMu({ guney: 41.3, kuzey: 41.1, bati: 27.7, dogu: 27.9 })).toBe(false)
    expect(kutuMakulMu({ guney: 41.1, kuzey: 41.1, bati: 27.7, dogu: 27.9 })).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('overpassSorgusu', () => {
  const kutu = { guney: 41.1, kuzey: 41.3, bati: 27.7, dogu: 27.9 }

  it('kutuyu güney,batı,kuzey,doğu sırasıyla yazar', () => {
    // ⚠️ Sıra Overpass'ın beklediği sıradır; karışırsa sorgu boş döner.
    expect(overpassSorgusu(kutu)).toContain('(41.1,27.7,41.3,27.9)')
  })

  it('nokta, alan ve ilişkiyi birlikte sorar', () => {
    const sorgu = overpassSorgusu(kutu)
    expect(sorgu).toContain('node[')
    expect(sorgu).toContain('way[')
    expect(sorgu).toContain('relation[')
  })

  it('alanların merkezini ister', () => {
    // Veri modelimiz tek nokta tutuyor; OSB bir alan olarak gelir.
    expect(overpassSorgusu(kutu)).toContain('out center')
  })

  it('eşleme tablosundaki her anahtarı kapsar', () => {
    const sorgu = overpassSorgusu(kutu)
    for (const anahtar of new Set(ESLEME_KURALLARI.map((k) => k.anahtar))) {
      expect(sorgu, anahtar).toContain(`"${anahtar}"`)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('overpassCevabiniCoz', () => {
  it('noktayı çözer', () => {
    const sonuc = overpassCevabiniCoz({
      elements: [
        {
          type: 'node',
          id: 1,
          lat: 41.16,
          lon: 27.8,
          tags: { amenity: 'school', name: 'X İlkokulu' },
        },
      ],
    })

    expect(sonuc.adaylar).toHaveLength(1)
    expect(sonuc.adaylar[0]).toMatchObject({
      osmKimlik: 'node/1',
      ad: 'X İlkokulu',
      tip: 'okul',
      enlem: 41.16,
      boylam: 27.8,
    })
  })

  it('alanın MERKEZİNİ kullanır', () => {
    const sonuc = overpassCevabiniCoz({
      elements: [
        {
          type: 'way',
          id: 5,
          center: { lat: 41.2, lon: 27.85 },
          tags: { landuse: 'industrial', name: 'Çorlu OSB' },
        },
      ],
    })

    expect(sonuc.adaylar[0]?.osmKimlik).toBe('way/5')
    expect(sonuc.adaylar[0]?.enlem).toBe(41.2)
    expect(sonuc.adaylar[0]?.onemli).toBe(true)
  })

  it('ADSIZ öğeyi atlar ve sayar', () => {
    // "en yakın okul: (isimsiz)" bilgi değil gürültü.
    const sonuc = overpassCevabiniCoz({
      elements: [{ type: 'node', id: 2, lat: 41, lon: 27, tags: { amenity: 'school' } }],
    })

    expect(sonuc.adaylar).toHaveLength(0)
    expect(sonuc.adsizAtlandi).toBe(1)
  })

  it('konumu çözülemeyeni atlar ve sayar', () => {
    const sonuc = overpassCevabiniCoz({
      elements: [{ type: 'way', id: 3, tags: { amenity: 'school', name: 'Y' } }],
    })

    expect(sonuc.adaylar).toHaveLength(0)
    expect(sonuc.konumsuzAtlandi).toBe(1)
  })

  it('⭐ eşlenmeyeni SESSİZCE ATMAZ — etikete göre sayar', () => {
    const sonuc = overpassCevabiniCoz({
      elements: [
        { type: 'node', id: 4, lat: 41, lon: 27, tags: { amenity: 'bank', name: 'Banka A' } },
        { type: 'node', id: 5, lat: 41, lon: 27, tags: { amenity: 'bank', name: 'Banka B' } },
        { type: 'node', id: 6, lat: 41, lon: 27, tags: { shop: 'bakery', name: 'Fırın' } },
      ],
    })

    expect(sonuc.adaylar).toHaveLength(0)
    expect(sonuc.eslenmeyenler[0]).toEqual({ etiket: 'amenity=bank', sayi: 2 })
    expect(sonuc.eslenmeyenler[1]).toEqual({ etiket: 'shop=bakery', sayi: 1 })
  })

  /**
   * ⚠️ Bilinçli dışarıda bırakılan türler de RAPORDA GÖRÜNÜR.
   *
   * Raporu okuyan kişi "bu tür neden yok?" diye sorabilmeli ve cevabı
   * orada bulabilmeli. Sessizce filtrelenselerdi karar görünmez olurdu.
   */
  it('bilinçli dışarıda bırakılan tür de raporda sayılır', () => {
    const sonuc = overpassCevabiniCoz({
      elements: [
        { type: 'node', id: 7, lat: 41, lon: 27, tags: { amenity: 'restaurant', name: 'Lokanta' } },
      ],
    })

    expect(sonuc.adaylar).toHaveLength(0)
    expect(sonuc.eslenmeyenler).toEqual([{ etiket: 'amenity=restaurant', sayi: 1 }])
  })

  it('eczane ve oyun alanı artık aday olarak geliyor', () => {
    const sonuc = overpassCevabiniCoz({
      elements: [
        { type: 'node', id: 8, lat: 41, lon: 27, tags: { amenity: 'pharmacy', name: 'Eczane A' } },
        {
          type: 'node',
          id: 9,
          lat: 41,
          lon: 27,
          tags: { leisure: 'playground', name: 'Oyun Alanı' },
        },
      ],
    })

    expect(sonuc.eslenmeyenler).toEqual([])
    expect(sonuc.adaylar.map((aday) => aday.tip).sort()).toEqual(['eczane', 'oyun_alani'])
  })

  it('bozuk cevapta çökmez', () => {
    expect(overpassCevabiniCoz(null).adaylar).toEqual([])
    expect(overpassCevabiniCoz({}).adaylar).toEqual([])
    expect(overpassCevabiniCoz({ elements: 'x' }).adaylar).toEqual([])
  })
})
