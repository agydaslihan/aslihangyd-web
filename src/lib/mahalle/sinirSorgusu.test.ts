import { describe, expect, it } from 'vitest'

import {
  adiSadelestir,
  geometriKur,
  geometriMerkezi,
  halkaAlani,
  halkaMerkezi,
  halkalariBirlestir,
  noktaHalkadaMi,
  sinirCevabiniCoz,
  sinirSorgusu,
  type Nokta,
} from './sinirSorgusu'

/** Yardımcı: [boylam, enlem] çiftlerinden nokta dizisi. */
function noktalar(...ciftler: [number, number][]): Nokta[] {
  return ciftler.map(([boylam, enlem]) => ({ boylam, enlem }))
}

describe('sinirSorgusu', () => {
  it('ilçe adını ve mahalle idari seviyelerini sorguya koyar', () => {
    const sorgu = sinirSorgusu('Çorlu')
    expect(sorgu).toContain('"name"="Çorlu"')
    expect(sorgu).toContain('"admin_level"="6"')
    // Çorlu mahalleleri fiilen 8'de; 9 ve 10 da taranıyor.
    expect(sorgu).toContain('"admin_level"~"^(8|9|10)$"')
  })

  /**
   * ─────────────────────────────────────────────────────────────────────
   * ⚠️ BU TEST DAHA ÖNCE HATAYI KORUYORDU.
   *
   * Eski hâli `expect(sorgu).toContain('out geom tags;')` idi ve yanına
   * "geometri olmadan poligon kurulamaz" yorumu yazılmıştı. Yorum doğruydu,
   * beklenen değer yanlıştı: Overpass'te `tags` bir ayrıntı seviyesidir ve
   * ilişkinin ÜYELERİNİ bastırır. `geom` üye bulamayınca yalnızca `bounds`
   * döndürür, çözümleyici de haklı olarak "geometrisiz" deyip atlar.
   *
   * Yani yeşil bir test, sorgunun 26 mahallenin hepsini sessizce düşürdüğü
   * gerçeğini üstüne mühür basarak koruyordu. Testin doğrulaması gereken
   * şey "bu dize burada mı" değil, "sorgu üye geometrisi istiyor mu"ydu.
   *
   * Şimdi iki yönlü: doğru kipin varlığı VE yanlış kipin yokluğu.
   * ─────────────────────────────────────────────────────────────────────
   */
  it('üye geometrisi ister — `tags` ayrıntı seviyesine geri dönülemez', () => {
    const sorgu = sinirSorgusu('Çorlu')

    expect(sorgu).toContain('out body geom;')
    expect(
      /^out\b.*\btags\b/m.test(sorgu),
      '`out` ifadesinde `tags` ayrıntı seviyesi ilişkilerin `members` alanını ' +
        'bastırır; sınır poligonu kurulamaz ve içe aktarma sessizce sıfır sonuç verir.',
    ).toBe(false)
  })

  it('adsız sınır parçalarını sorguda eler', () => {
    // Adsız yollar ilişkilerin parçalarıdır; geometrileri üye olarak geliyor.
    // Şartsız hâlinde cevabın üçte ikisi bu parçalardı.
    expect(sinirSorgusu('Çorlu')).toContain('["name"];')
  })

  it('ilçe adındaki tırnak sorguyu kıramaz', () => {
    const sorgu = sinirSorgusu('Çor"lu')
    expect(sorgu).toContain('"name"="Çorlu"')
  })
})

describe('adiSadelestir', () => {
  it('idari ekleri atar', () => {
    expect(adiSadelestir('Muhittin Mahallesi')).toBe('Muhittin')
    expect(adiSadelestir('Şeyhsinan Mah.')).toBe('Şeyhsinan')
    expect(adiSadelestir('Şeyhsinan Mah')).toBe('Şeyhsinan')
    expect(adiSadelestir('Türkgücü Köyü')).toBe('Türkgücü')
  })

  it('eki olmayan adı bozmaz', () => {
    expect(adiSadelestir('Önerler')).toBe('Önerler')
  })

  it('adın içindeki "mahalle" kelimesini atmaz', () => {
    expect(adiSadelestir('Yeni Mahalle Sokağı')).toBe('Yeni Mahalle Sokağı')
  })
})

describe('halkalariBirlestir', () => {
  it('rastgele sıradaki ve ters yöndeki parçaları kapalı halkaya birleştirir', () => {
    // Kare: (0,0) → (1,0) → (1,1) → (0,1) → (0,0), parçalar karışık.
    const sonuc = halkalariBirlestir([
      noktalar([1, 1], [0, 1]),
      noktalar([0, 0], [1, 0]),
      // Bilinçli ters yönde — algoritma çevirmek zorunda.
      noktalar([1, 1], [1, 0]),
      noktalar([0, 1], [0, 0]),
    ])

    expect(sonuc.kapanmayan).toBe(0)
    expect(sonuc.halkalar).toHaveLength(1)

    const halka = sonuc.halkalar[0] as Nokta[]
    expect(halka[0]).toEqual(halka[halka.length - 1])
    expect(halka).toHaveLength(5)
  })

  it('kapanmayan parçayı düşürür ve sayar', () => {
    const sonuc = halkalariBirlestir([noktalar([0, 0], [1, 0], [1, 1])])
    expect(sonuc.halkalar).toHaveLength(0)
    expect(sonuc.kapanmayan).toBe(1)
  })

  it('iki ayrı kapalı halkayı ayrı ayrı döndürür', () => {
    const sonuc = halkalariBirlestir([
      noktalar([0, 0], [1, 0], [1, 1], [0, 1], [0, 0]),
      noktalar([5, 5], [6, 5], [6, 6], [5, 6], [5, 5]),
    ])
    expect(sonuc.halkalar).toHaveLength(2)
    expect(sonuc.kapanmayan).toBe(0)
  })
})

describe('halkaMerkezi', () => {
  it('alan ağırlıklı merkezi verir — köşe ortalamasını DEĞİL', () => {
    /**
     * Sol kenarı sık noktalanmış kare. Köşe ortalaması sola kayar;
     * alan merkezi karenin ortasında kalmalı.
     */
    const halka = noktalar(
      [0, 0],
      [0, 0.1],
      [0, 0.2],
      [0, 0.4],
      [0, 0.6],
      [0, 0.8],
      [0, 1],
      [1, 1],
      [1, 0],
      [0, 0],
    )

    const merkez = halkaMerkezi(halka)
    expect(merkez?.boylam).toBeCloseTo(0.5, 6)
    expect(merkez?.enlem).toBeCloseTo(0.5, 6)
  })

  it('dejenere halkada köşe ortalamasına düşer', () => {
    const merkez = halkaMerkezi(noktalar([0, 0], [1, 0], [2, 0], [0, 0]))
    expect(merkez).not.toBeNull()
    expect(Number.isFinite(merkez?.boylam ?? Number.NaN)).toBe(true)
  })
})

describe('halkaAlani', () => {
  it('birim karenin alanı 1', () => {
    const alan = halkaAlani(noktalar([0, 0], [1, 0], [1, 1], [0, 1], [0, 0]))
    expect(Math.abs(alan)).toBeCloseTo(1, 9)
  })
})

describe('noktaHalkadaMi', () => {
  const kare = noktalar([0, 0], [2, 0], [2, 2], [0, 2], [0, 0])

  it('içerideki noktayı bulur', () => {
    expect(noktaHalkadaMi({ boylam: 1, enlem: 1 }, kare)).toBe(true)
  })

  it('dışarıdaki noktayı bulur', () => {
    expect(noktaHalkadaMi({ boylam: 5, enlem: 5 }, kare)).toBe(false)
  })
})

describe('geometriKur', () => {
  it('tek dış halkadan Polygon üretir', () => {
    const geometri = geometriKur([noktalar([0, 0], [1, 0], [1, 1], [0, 1], [0, 0])])
    expect(geometri?.type).toBe('Polygon')
    expect(geometri?.coordinates).toHaveLength(1)
  })

  it('iç halkayı doğru dış halkanın deliği yapar', () => {
    const disA = noktalar([0, 0], [10, 0], [10, 10], [0, 10], [0, 0])
    const disB = noktalar([20, 20], [30, 20], [30, 30], [20, 30], [20, 20])
    // Delik B'nin içinde.
    const ic = noktalar([22, 22], [24, 22], [24, 24], [22, 24], [22, 22])

    const geometri = geometriKur([disA, disB], [ic])
    expect(geometri?.type).toBe('MultiPolygon')

    const poligonlar = geometri?.coordinates as number[][][][]
    expect(poligonlar[0]).toHaveLength(1)
    expect(poligonlar[1]).toHaveLength(2)
  })

  it('dış halka yoksa null', () => {
    expect(geometriKur([])).toBeNull()
  })
})

describe('geometriMerkezi', () => {
  it('en büyük halkayı seçer — parçaların ortasına düşmez', () => {
    const buyuk = noktalar([0, 0], [10, 0], [10, 10], [0, 10], [0, 0])
    const kucuk = noktalar([40, 40], [41, 40], [41, 41], [40, 41], [40, 40])

    const merkez = geometriMerkezi([buyuk, kucuk])
    expect(merkez?.[0]).toBeCloseTo(5, 4)
    expect(merkez?.[1]).toBeCloseTo(5, 4)
  })
})

describe('sinirCevabiniCoz', () => {
  const kareUyeleri = [
    {
      type: 'way',
      role: 'outer',
      geometry: [
        { lat: 41.1, lon: 27.8 },
        { lat: 41.1, lon: 27.9 },
      ],
    },
    {
      type: 'way',
      role: 'outer',
      geometry: [
        { lat: 41.1, lon: 27.9 },
        { lat: 41.2, lon: 27.9 },
        { lat: 41.2, lon: 27.8 },
        { lat: 41.1, lon: 27.8 },
      ],
    },
  ]

  it('ilişkiyi poligona ve merkeze çevirir', () => {
    const sonuc = sinirCevabiniCoz({
      elements: [
        { type: 'relation', id: 42, tags: { name: 'Muhittin Mahallesi' }, members: kareUyeleri },
      ],
    })

    expect(sonuc.adaylar).toHaveLength(1)
    const aday = sonuc.adaylar[0]
    expect(aday?.osmKimlik).toBe('relation/42')
    expect(aday?.sadeAd).toBe('Muhittin')
    expect(aday?.slug).toBe('muhittin')
    expect(aday?.geometri.type).toBe('Polygon')
    // Merkez [boylam, enlem] sırasında — Payload `point` böyle bekler.
    expect(aday?.merkez[0]).toBeCloseTo(27.85, 4)
    expect(aday?.merkez[1]).toBeCloseTo(41.15, 4)
  })

  /**
   * ⚠️ GERÇEK ARIZANIN CEVAP BİÇİMİ — 15 Ağustos 2026.
   *
   * `out geom tags` ile Overpass tam olarak bunu döndürüyordu: doğru ad,
   * doğru kimlik, `bounds` var, **`members` yok.** Çözümleyicinin bunu
   * atlaması DOĞRUDUR — kaba bir dikdörtgeni mahalle sınırı diye yazmak,
   * haritada sessizce yanlış alan göstermek olurdu.
   *
   * Test çözümleyiciyi değil, `bounds`'un asla poligona terfi
   * ettirilmemesini koruyor. Sorgu tarafındaki karşılığı yukarıdaki
   * "üye geometrisi ister" testi.
   */
  it('yalnızca `bounds` gelen ilişkiyi poligona TERFİ ETTİRMEZ', () => {
    const sonuc = sinirCevabiniCoz({
      elements: [
        {
          type: 'relation',
          id: 11833266,
          bounds: { minlat: 41.146, minlon: 27.807, maxlat: 41.159, maxlon: 27.819 },
          tags: { name: 'Muhittin Mahallesi', boundary: 'administrative', admin_level: '8' },
        },
      ],
    })

    expect(sonuc.adaylar).toHaveLength(0)
    expect(sonuc.geometrisizAtlandi).toBe(1)
  })

  it('rolü boş üyeleri de dış sınır sayar', () => {
    const rolsuz = kareUyeleri.map(({ type, geometry }) => ({ type, geometry }))
    const sonuc = sinirCevabiniCoz({
      elements: [{ type: 'relation', id: 7, tags: { name: 'Zafer' }, members: rolsuz }],
    })
    expect(sonuc.adaylar).toHaveLength(1)
  })

  it('adsız sınırı atlar ve sayar', () => {
    const sonuc = sinirCevabiniCoz({
      elements: [{ type: 'relation', id: 9, tags: {}, members: kareUyeleri }],
    })
    expect(sonuc.adaylar).toHaveLength(0)
    expect(sonuc.adsizAtlandi).toBe(1)
  })

  it('kapanmayan geometriyi atlar — yarım sınır yazılmaz', () => {
    const sonuc = sinirCevabiniCoz({
      elements: [
        {
          type: 'relation',
          id: 11,
          tags: { name: 'Yarım' },
          members: [
            {
              type: 'way',
              role: 'outer',
              geometry: [
                { lat: 41.1, lon: 27.8 },
                { lat: 41.1, lon: 27.9 },
              ],
            },
          ],
        },
      ],
    })

    expect(sonuc.adaylar).toHaveLength(0)
    expect(sonuc.geometrisizAtlandi).toBe(1)
  })

  it('kapalı bir yolu tek başına poligona çevirir', () => {
    const sonuc = sinirCevabiniCoz({
      elements: [
        {
          type: 'way',
          id: 5,
          tags: { name: 'Hatip' },
          geometry: [
            { lat: 41.1, lon: 27.8 },
            { lat: 41.1, lon: 27.9 },
            { lat: 41.2, lon: 27.9 },
            { lat: 41.1, lon: 27.8 },
          ],
        },
      ],
    })

    expect(sonuc.adaylar).toHaveLength(1)
    expect(sonuc.adaylar[0]?.osmKimlik).toBe('way/5')
  })

  it('bozuk cevapta çökmez', () => {
    expect(sinirCevabiniCoz(null).adaylar).toHaveLength(0)
    expect(sinirCevabiniCoz({ elements: 'metin' }).adaylar).toHaveLength(0)
    expect(sinirCevabiniCoz({ elements: [null, 3, {}] }).adaylar).toHaveLength(0)
  })
})
