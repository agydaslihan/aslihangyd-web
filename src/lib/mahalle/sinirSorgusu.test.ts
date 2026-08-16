import { describe, expect, it } from 'vitest'

import {
  adiSadelestir,
  geometriKur,
  geometriMerkezi,
  yuzeydeNokta,
  halkaAlani,
  halkaMerkezi,
  halkalariBirlestir,
  noktaHalkadaMi,
  gruplaraBol,
  GRUP_BOYUTU,
  merkezAdaylariniCoz,
  sinirCevabiniCoz,
  sinirGeometriSorgusu,
  sinirKimlikleriniCoz,
  sinirKimlikSorgusu,
  type Nokta,
} from './sinirSorgusu'

/** Yardımcı: [boylam, enlem] çiftlerinden nokta dizisi. */
function noktalar(...ciftler: [number, number][]): Nokta[] {
  return ciftler.map(([boylam, enlem]) => ({ boylam, enlem }))
}

describe('sinirKimlikSorgusu — 1. faz', () => {
  it('ilçe adını ve mahalle idari seviyelerini sorguya koyar', () => {
    const sorgu = sinirKimlikSorgusu('Çorlu')
    expect(sorgu).toContain('"name"="Çorlu"')
    expect(sorgu).toContain('"admin_level"="6"')
    // Çorlu mahalleleri fiilen 8'de; 9 ve 10 da taranıyor.
    expect(sorgu).toContain('"admin_level"~"^(8|9|10)$"')
  })

  /**
   * ⚠️ 1. FAZ GEOMETRİ İSTEMEZ — 504'ÜN ASIL SEBEBİ BUYDU.
   *
   * Ağır olan üye koordinatları. Kimlikleri ucuza alıp geometriyi gruplar
   * hâlinde çekmek, tek büyük sorgunun zaman aşımına uğramasını önlüyor.
   */
  it('geometri istemez — yalnızca kimlik, etiket ve yer merkezleri', () => {
    const sorgu = sinirKimlikSorgusu('Çorlu')
    expect(sorgu).toContain('out tags;')
    expect(sorgu).toContain('out center tags;')
    expect(sorgu).not.toContain('geom')
  })

  it('yer düğümlerini aynı fazda ister', () => {
    expect(sinirKimlikSorgusu('Çorlu')).toContain(
      '"place"~"^(suburb|neighbourhood|quarter|village|town|hamlet)$"',
    )
  })

  /**
   * ⚠️ `locality` merkez kaynağı OLAMAZ.
   *
   * Çorlu içinde 142 tane var; bunlar mevkî ve tarla adları. Bir mahalleyle
   * adaş olan biri, o mahallenin merkezini kilometrelerce öteye taşırdı.
   */
  it('locality yer türü sorguya girmez', () => {
    expect(sinirKimlikSorgusu('Çorlu')).not.toContain('locality')
  })

  it('adsız sınır parçalarını sorguda eler', () => {
    // Adsız yollar ilişkilerin parçalarıdır; geometrileri üye olarak geliyor.
    expect(sinirKimlikSorgusu('Çorlu')).toContain('["name"];')
  })

  it('ilçe adındaki tırnak sorguyu kıramaz', () => {
    expect(sinirKimlikSorgusu('Çor"lu')).toContain('"name"="Çorlu"')
  })
})

describe('sinirGeometriSorgusu — 2. faz', () => {
  const kimlikler = [
    { tur: 'relation' as const, kimlik: 11833266, osmAdi: 'Muhittin Mahallesi' },
    { tur: 'relation' as const, kimlik: 11833268, osmAdi: 'Alipaşa Mahallesi' },
    { tur: 'way' as const, kimlik: 851326754, osmAdi: 'Bir yol' },
  ]

  it('kimlikleri türüne göre ayırıp sorar', () => {
    const sorgu = sinirGeometriSorgusu(kimlikler)
    expect(sorgu).toContain('relation(id:11833266,11833268);')
    expect(sorgu).toContain('way(id:851326754);')
  })

  /**
   * ⚠️ Alan taraması YOK. `map_to_area` ve `area.ilce` bu sorguda
   * bulunmuyor; yalnızca sayılı kimliklerin geometrisi isteniyor. Sorgunun
   * ucuz olmasının sebebi bu.
   */
  it('alan taraması yapmaz', () => {
    const sorgu = sinirGeometriSorgusu(kimlikler)
    expect(sorgu).not.toContain('map_to_area')
    expect(sorgu).not.toContain('area.ilce')
  })

  it('tek türde kimlik varsa boş satır üretmez', () => {
    const yalnizIliski = sinirGeometriSorgusu([kimlikler[0]!])
    expect(yalnizIliski).toContain('relation(id:11833266);')
    expect(yalnizIliski).not.toContain('way(id:)')
  })

  /**
   * ─────────────────────────────────────────────────────────────────────
   * ⚠️ BU KORUMA İKİ KEZ YANLIŞ KURULDU — ÜÇÜNCÜSÜNDE YERİNİ BULDU.
   *
   * 1. hâli: `toContain('out geom tags;')` — HATAYI KORUYORDU. `tags` bir
   *    ayrıntı seviyesidir ve ilişkilerin `members` alanını bastırır; `geom`
   *    de kaba `bounds` döndürür. Yeşil bir test, 26 mahallenin sessizce
   *    düşürüldüğü gerçeğine mühür basıyordu.
   * 2. hâli: `/^out\b.*\btags\b/m` eşleşmesin — DOĞRU KODU ENGELLEDİ. Yer
   *    düğümleri için `out center tags;` doğrudur; `center` üye geometrisine
   *    ihtiyaç duymaz.
   * 3. hâli (bu): koruma, geometriyi İSTEYEN sorgunun testine taşındı.
   *    Değişmez artık tam yerinde ifade ediliyor — 1. faz zaten `out tags;`
   *    kullanıyor ve kullanmalı.
   *
   * Ders: bir koruma testi yanlış nesneye bağlanırsa ya hatayı korur ya
   * doğru kodu engeller. İkisini de yaşadı.
   * ─────────────────────────────────────────────────────────────────────
   */
  it('üye geometrisi ister — `geom` ile `tags` bir arada olamaz', () => {
    const sorgu = sinirGeometriSorgusu(kimlikler)

    expect(sorgu).toContain('out body geom;')

    const outSatirlari = sorgu.split('\n').filter((satir: string) => satir.startsWith('out'))
    const zehirli = outSatirlari.filter(
      (satir: string) => /\bgeom\b/.test(satir) && /\btags\b/.test(satir),
    )

    expect(
      zehirli,
      '`geom` ile `tags` aynı `out` ifadesinde birleşince `tags` ayrıntı seviyesi ' +
        'ilişkilerin `members` alanını bastırır; `geom` de kaba `bounds` döndürür. ' +
        'Sınır poligonu kurulamaz ve içe aktarma sessizce sıfır sonuç verir.',
    ).toEqual([])
  })
})

describe('gruplaraBol', () => {
  it('grup boyutuna göre böler, son grup eksik kalabilir', () => {
    expect(gruplaraBol([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([[1, 2, 3], [4, 5, 6], [7]])
  })

  it('boş listede boş sonuç', () => {
    expect(gruplaraBol([], 5)).toEqual([])
  })

  /**
   * ⚠️ Grup boyutu KÜÇÜK olmalı. Amaç hızı en üst düzeye çıkarmak değil,
   * tek bir isteğin zaman aşımına uğrama olasılığını ve düştüğünde
   * kaybedilen işi küçük tutmak.
   */
  it('varsayılan grup boyutu makul küçüklükte', () => {
    expect(GRUP_BOYUTU).toBeLessThanOrEqual(10)
    expect(GRUP_BOYUTU).toBeGreaterThan(0)
  })
})

describe('sinirKimlikleriniCoz', () => {
  it('sınır öğelerini toplar, yer öğelerini almaz', () => {
    const kimlikler = sinirKimlikleriniCoz({
      elements: [
        {
          type: 'relation',
          id: 1,
          tags: { name: 'Muhittin Mahallesi', boundary: 'administrative', admin_level: '8' },
        },
        { type: 'node', id: 2, tags: { name: 'Yenice', place: 'village' } },
        { type: 'way', id: 3, tags: { name: 'Zafer', boundary: 'administrative' } },
      ],
    })

    expect(kimlikler).toEqual([
      { tur: 'relation', kimlik: 1, osmAdi: 'Muhittin Mahallesi' },
      { tur: 'way', kimlik: 3, osmAdi: 'Zafer' },
    ])
  })

  it('adsız sınırı almaz', () => {
    expect(
      sinirKimlikleriniCoz({
        elements: [{ type: 'relation', id: 1, tags: { boundary: 'administrative' } }],
      }),
    ).toEqual([])
  })

  it('bozuk cevapta çökmez', () => {
    expect(sinirKimlikleriniCoz(null)).toEqual([])
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

describe('merkezAdaylariniCoz — ikinci kademe', () => {
  it('yerleşim düğümünü merkez adayına çevirir', () => {
    const adaylar = merkezAdaylariniCoz({
      elements: [
        {
          type: 'node',
          id: 555,
          lat: 41.15282,
          lon: 27.81037,
          tags: { name: 'Muhittin Mahallesi', place: 'suburb' },
        },
      ],
    })

    expect(adaylar).toHaveLength(1)
    expect(adaylar[0]?.slug).toBe('muhittin')
    expect(adaylar[0]?.yerTuru).toBe('suburb')
    // [boylam, enlem] — Payload `point` sırası.
    expect(adaylar[0]?.merkez[0]).toBeCloseTo(27.81037, 5)
    expect(adaylar[0]?.merkez[1]).toBeCloseTo(41.15282, 5)
  })

  it('alan ve ilişkide `out center` merkezini kullanır', () => {
    const adaylar = merkezAdaylariniCoz({
      elements: [
        {
          type: 'way',
          id: 9,
          center: { lat: 41.1, lon: 27.8 },
          tags: { name: 'Önerler', place: 'village' },
        },
      ],
    })
    expect(adaylar).toHaveLength(1)
    expect(adaylar[0]?.osmKimlik).toBe('way/9')
  })

  /**
   * ⚠️ `locality` MERKEZ KAYNAĞI OLAMAZ.
   *
   * Çorlu içinde 142 tane var ve bunlar mevkî/tarla adları. Bir mahalleyle
   * adaş olan biri, mahallenin merkezini kilometrelerce öteye taşırdı.
   * Yanlış merkez, eksik merkezden kötüdür: eksik olan panelde görünür,
   * yanlış olan sessizce yanlış harita gösterir.
   */
  it('locality türünü merkez kaynağı saymaz', () => {
    const adaylar = merkezAdaylariniCoz({
      elements: [
        {
          type: 'node',
          id: 1,
          lat: 41.5,
          lon: 27.2,
          tags: { name: 'Muhittin', place: 'locality' },
        },
      ],
    })
    expect(adaylar).toEqual([])
  })

  it('koordinatı olmayan öğeyi atar — sıfır sıfır uydurmaz', () => {
    const adaylar = merkezAdaylariniCoz({
      elements: [{ type: 'node', id: 2, tags: { name: 'Zafer', place: 'suburb' } }],
    })
    expect(adaylar).toEqual([])
  })

  it('adı olmayan yerleşimi atar', () => {
    const adaylar = merkezAdaylariniCoz({
      elements: [{ type: 'node', id: 3, lat: 41.1, lon: 27.8, tags: { place: 'suburb' } }],
    })
    expect(adaylar).toEqual([])
  })

  it('bozuk cevapta çökmez', () => {
    expect(merkezAdaylariniCoz(null)).toEqual([])
    expect(merkezAdaylariniCoz({ elements: 'olmaz' })).toEqual([])
  })
})

/**
 * ⚠️ İKİ KADEME AYNI CEVAPTAN OKUNUYOR — BİRBİRİNİ KİRLETMEMELİ.
 *
 * Yer öğelerinin üye geometrisi yok (`out center` ile geldiler). Sınır
 * çözümleyicisinde elenmezlerse hepsi "geometrisiz atlandı" sayacına düşer
 * ve panelde gerçek bir sorun varmış gibi görünür.
 */
describe('iki kademenin ayrışması', () => {
  const karisikCevap = {
    elements: [
      {
        type: 'relation',
        id: 100,
        tags: { name: 'Muhittin Mahallesi', boundary: 'administrative', admin_level: '8' },
        members: [
          {
            type: 'way',
            role: 'outer',
            geometry: [
              { lat: 41.1, lon: 27.8 },
              { lat: 41.1, lon: 27.9 },
              { lat: 41.2, lon: 27.9 },
              { lat: 41.1, lon: 27.8 },
            ],
          },
        ],
      },
      {
        type: 'node',
        id: 200,
        lat: 41.15,
        lon: 27.85,
        tags: { name: 'Yenice', place: 'village' },
      },
      {
        type: 'way',
        id: 300,
        center: { lat: 41.16, lon: 27.86 },
        tags: { name: 'Seymen', place: 'village' },
      },
    ],
  }

  it('yer öğeleri geometrisiz sayacını şişirmez', () => {
    const sinir = sinirCevabiniCoz(karisikCevap)
    expect(sinir.adaylar).toHaveLength(1)
    expect(sinir.adaylar[0]?.slug).toBe('muhittin')
    expect(sinir.geometrisizAtlandi).toBe(0)
    expect(sinir.adsizAtlandi).toBe(0)
  })

  it('sınır ilişkisi merkez adayı olarak sayılmaz', () => {
    const merkezler = merkezAdaylariniCoz(karisikCevap)
    expect(merkezler.map((aday) => aday.slug).sort()).toEqual(['seymen', 'yenice'])
  })
})

/**
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ALAN MERKEZİ POLİGONUN İÇİNDE OLMAK ZORUNDA DEĞİL.
 *
 * 16 Ağustos 2026'da PostGIS ile ölçüldü: Çorlu'nun 26 mahallesinden
 * birinin (Zafer) alan merkezi kendi sınırının DIŞINA düşüyordu. İçbükey
 * şekillerde bu olağan bir geometri özelliği, hata değil.
 *
 * Sonuçları gerçekti: mahalle haritası komşu mahalleye odaklanır, POI
 * arama kutusu yanlış yerde kurulur, "en yakın mahalle" eşleştirmesi
 * yanlış mahalleyi seçer. Hiçbiri hata vermez, hepsi sessizce yanlıştır.
 *
 * Düzeltme sonrası ölçüm: 26/26 merkez kendi poligonunun içinde.
 * ─────────────────────────────────────────────────────────────────────────
 */
describe('yuzeydeNokta', () => {
  /** U şekli: alan merkezi boşluğa, yani şeklin dışına düşer. */
  const uHalkasi = noktalar([0, 0], [3, 0], [3, 3], [2, 3], [2, 1], [1, 1], [1, 3], [0, 3], [0, 0])

  it('içbükey şekilde merkez dışarıdaysa içeri çeker', () => {
    const merkez = halkaMerkezi(uHalkasi)
    expect(merkez).not.toBeNull()
    // Önce dışarıda olduğunu KANITLA — yoksa test bir şey sınamıyor olurdu.
    expect(noktaHalkadaMi(merkez as Nokta, uHalkasi)).toBe(false)

    const icerde = yuzeydeNokta(uHalkasi, merkez as Nokta)
    expect(noktaHalkadaMi(icerde, uHalkasi)).toBe(true)
  })

  /**
   * ⚠️ Merkez zaten içerideyse DOKUNULMUYOR. Alan merkezi, "içeride
   * herhangi bir nokta"dan daha anlamlıdır — mahallenin ağırlık noktasıdır.
   */
  it('merkez zaten içerideyse olduğu gibi bırakır', () => {
    const kare = noktalar([0, 0], [2, 0], [2, 2], [0, 2], [0, 0])
    const merkez = halkaMerkezi(kare) as Nokta
    expect(yuzeydeNokta(kare, merkez)).toEqual(merkez)
  })

  it('dejenere halkada merkezi bozmaz', () => {
    const cizgi = noktalar([0, 0], [1, 0], [2, 0], [0, 0])
    const tercih = { boylam: 1, enlem: 0 }
    expect(yuzeydeNokta(cizgi, tercih)).toEqual(tercih)
  })

  it('geometriMerkezi içbükey şekilde içeride bir nokta döndürüyor', () => {
    const merkez = geometriMerkezi([uHalkasi])
    expect(merkez).not.toBeNull()
    const [boylam, enlem] = merkez as [number, number]
    expect(noktaHalkadaMi({ boylam, enlem }, uHalkasi)).toBe(true)
  })
})
