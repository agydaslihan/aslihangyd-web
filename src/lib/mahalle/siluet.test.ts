import { describe, expect, it } from 'vitest'

import { sadelestir, siluetUret, SILUET_KUTUSU, TOLERANS } from './siluet'

/** Kare — dört köşe, kapalı. */
const KARE = {
  type: 'Polygon' as const,
  coordinates: [
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ],
  ],
}

describe('sadelestir — Douglas-Peucker', () => {
  it('düz çizgideki ara noktaları atar', () => {
    const duz = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 10, y: 0 },
    ]
    expect(sadelestir(duz, 0.5)).toHaveLength(2)
  })

  /**
   * ⚠️ NOKTA ATLAMA İLE KARIŞTIRILMAMALI.
   *
   * "Her n'inciyi al" keskin köşeleri rastgele siler ve şekli tanınmaz
   * hâle getirir. Douglas-Peucker en çok sapan noktayı korur — yani şeklin
   * karakterini taşıyan köşeler kalır.
   */
  it('keskin köşeyi korur', () => {
    const koseli = [
      { x: 0, y: 0 },
      { x: 5, y: 0.1 },
      { x: 10, y: 10 },
      { x: 20, y: 10 },
    ]
    const sade = sadelestir(koseli, 0.5)
    // Köşe noktası (10,10) mutlaka kalmalı.
    expect(sade.some((n) => n.x === 10 && n.y === 10)).toBe(true)
  })

  it('iki noktalı girdiyi bozmaz', () => {
    const iki = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]
    expect(sadelestir(iki, 1)).toEqual(iki)
  })

  it('uç noktaları daima korur', () => {
    const noktalar = Array.from({ length: 50 }, (_, i) => ({ x: i, y: Math.sin(i) * 3 }))
    const sade = sadelestir(noktalar, TOLERANS)
    expect(sade[0]).toEqual(noktalar[0])
    expect(sade[sade.length - 1]).toEqual(noktalar[noktalar.length - 1])
  })
})

describe('siluetUret', () => {
  it('poligondan kapalı bir SVG yolu üretir', () => {
    const siluet = siluetUret(KARE)
    expect(siluet).not.toBeNull()
    expect(siluet?.yol).toMatch(/^M[\d. ]+L.*Z$/)
  })

  /**
   * ⚠️ ENLEM TERS ÇEVRİLMELİ.
   *
   * Coğrafyada enlem yukarı artar, SVG'de y aşağı artar. Çevrilmezse her
   * mahalle dikey aynada çizilir — tanınır ama YANLIŞ, ve yanlışlığı ancak
   * haritayla yan yana koyunca fark edilir.
   *
   * Test: kuzeydeki nokta (yüksek enlem) SVG'de KÜÇÜK y almalı.
   */
  it('enlemi ters çevirir — kuzey yukarıda', () => {
    const ucgen = {
      type: 'Polygon' as const,
      coordinates: [
        [
          [0, 0],
          [10, 0],
          [5, 10], // en kuzeydeki nokta
          [0, 0],
        ],
      ],
    }
    const yol = siluetUret(ucgen)?.yol ?? ''
    const yler = [...yol.matchAll(/[ML](\d+\.?\d*) (\d+\.?\d*)/g)].map((m) => Number(m[2]))

    // En kuzeydeki nokta en küçük y'ye sahip olmalı.
    const enKucukY = Math.min(...yler)
    expect(enKucukY).toBeLessThan(SILUET_KUTUSU / 2)
    expect(Math.max(...yler)).toBeGreaterThan(SILUET_KUTUSU / 2)
  })

  /**
   * ⚠️ ORAN KORUNMALI. Kutuya germek her mahalleyi kareye yayardı ve
   * şekiller birbirine benzerdi — silüetin bütün amacı ayırt edilebilirlik.
   */
  it('oranı korur — uzun bir şekil kareye yayılmıyor', () => {
    const uzun = {
      type: 'Polygon' as const,
      coordinates: [
        [
          [0, 0],
          [100, 0],
          [100, 10],
          [0, 10],
          [0, 0],
        ],
      ],
    }
    const yol = siluetUret(uzun)?.yol ?? ''
    const yler = [...yol.matchAll(/[ML](\d+\.?\d*) (\d+\.?\d*)/g)].map((m) => Number(m[2]))
    const yayilim = Math.max(...yler) - Math.min(...yler)

    // 10:1 oranlı şekil, 100'lük kutuda ~10 birim yükseklik kaplamalı.
    expect(yayilim).toBeLessThan(20)
  })

  it('çok parçalı geometride her parçayı çizer', () => {
    const cokParcali = {
      type: 'MultiPolygon' as const,
      coordinates: [KARE.coordinates, [KARE.coordinates[0]!.map(([x, y]) => [x! + 40, y!])]],
    }
    const yol = siluetUret(cokParcali)?.yol ?? ''
    expect((yol.match(/M/g) ?? []).length).toBe(2)
  })

  /**
   * ⚠️ KULLANILAMAZ GEOMETRİDE `null` — yarım çizim YOK.
   *
   * Kart, `null` gelince eski konum ikonuna düşüyor. Yarım bir silüet
   * çizmek, mahallenin şekli buymuş gibi gösterirdi.
   */
  it('bozuk girdide null döner', () => {
    for (const bozuk of [
      null,
      undefined,
      {},
      { type: 'Point', coordinates: [1, 2] },
      { type: 'Polygon', coordinates: [] },
      { type: 'Polygon', coordinates: [[[0, 0]]] },
      // Sıfır alanlı: bütün noktalar aynı
      {
        type: 'Polygon',
        coordinates: [
          [
            [5, 5],
            [5, 5],
            [5, 5],
          ],
        ],
      },
    ]) {
      expect(siluetUret(bozuk), JSON.stringify(bozuk)).toBeNull()
    }
  })

  /**
   * ⚠️ SADELEŞTİRME GERÇEKTEN KÜÇÜLTMELİ.
   *
   * Sunucuda üretmenin sebebi bu: poligonlar yüzlerce noktalı ve ham hâli
   * kart başına kilobaytlar eder. Küçültmüyorsa işlem boşuna.
   */
  it('yoğun bir halkayı belirgin biçimde inceltir', () => {
    const cember = {
      type: 'Polygon' as const,
      coordinates: [
        Array.from({ length: 400 }, (_, i) => {
          const aci = (i / 400) * Math.PI * 2
          return [Math.cos(aci) * 100, Math.sin(aci) * 100]
        }),
      ],
    }
    const siluet = siluetUret(cember)
    expect(siluet).not.toBeNull()
    expect(siluet!.hamNokta).toBe(400)
    expect(siluet!.sadeNokta).toBeLessThan(120)
    // Yine de çember tanınır kalmalı — aşırı inceltme de hata.
    expect(siluet!.sadeNokta).toBeGreaterThan(12)
  })

  it('üretilen yol makul boyutta kalıyor', () => {
    const cember = {
      type: 'Polygon' as const,
      coordinates: [
        Array.from({ length: 600 }, (_, i) => {
          const aci = (i / 600) * Math.PI * 2
          return [Math.cos(aci) * 50, Math.sin(aci) * 50]
        }),
      ],
    }
    // Kart başına birkaç yüz bayt hedefleniyor; kilobaytlar değil.
    expect((siluetUret(cember)?.yol ?? '').length).toBeLessThan(1500)
  })
})
