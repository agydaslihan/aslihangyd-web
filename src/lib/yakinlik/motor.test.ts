import { describe, expect, it } from 'vitest'

import type { PoiTipi } from '@/collections/IlgiNoktalari'

import { ASGARI_KARSILASTIRMA, SANAYI_EGRISI, egriPuani, skorOnerileriHesapla } from './motor'
import type { BilesenOnerisi, MahalleYakinligi, PoiMesafesi, YakinlikBileseni } from './tipler'

/**
 * ⚠️ Buradaki mahalle adları, POI adları ve mesafeler UYDURMADIR; hesabın
 * doğruluğunu sınamak içindir. Gerçek Çorlu verisi CMS'ten gelir
 * (CLAUDE.md kural 2).
 */
function mesafe(tip: PoiTipi, metre: number, yakindaSayi = 1): PoiMesafesi {
  return {
    tip,
    enYakinAd: `${tip} noktası`,
    enYakinMetre: metre,
    yakindaSayi,
    onemli: false,
    kaynak: 'elle',
  }
}

function mahalle(slug: string, mesafeler: PoiMesafesi[]): MahalleYakinligi {
  return { slug, ad: slug.toUpperCase(), mesafeler }
}

function oneri(
  sonuc: Map<string, BilesenOnerisi[]>,
  slug: string,
  bilesen: YakinlikBileseni,
): BilesenOnerisi {
  const bulunan = sonuc.get(slug)?.find((o) => o.bilesen === bilesen)
  if (!bulunan) throw new Error(`${slug} için ${bilesen} önerisi yok`)
  return bulunan
}

const TUM_TIPLER = new Set<PoiTipi>([
  'okul',
  'universite',
  'hastane',
  'market',
  'avm',
  'park',
  'sanayi',
  'durak',
  'istasyon',
  'havalimani',
  'resmi',
])

// ═══════════════════════════════════════════════════════════════════════════
describe('egriPuani', () => {
  const egri = [
    { metre: 300, puan: 100 },
    { metre: 2_000, puan: 0 },
  ]

  it('ilk noktanın altında ilk puanı verir (yatay uç)', () => {
    expect(egriPuani(0, egri)).toBe(100)
    expect(egriPuani(299, egri)).toBe(100)
  })

  it('son noktanın üstünde son puanı verir (yatay uç)', () => {
    expect(egriPuani(2_000, egri)).toBe(0)
    expect(egriPuani(50_000, egri)).toBe(0)
  })

  it('aralıkta doğrusal geçiş yapar', () => {
    // 300 → 2000 arası 1700 m; tam ortası 1150 m → 50 puan
    expect(egriPuani(1_150, egri)).toBe(50)
  })

  it('geçersiz mesafede null döner — sıfır DEĞİL', () => {
    expect(egriPuani(Number.NaN, egri)).toBeNull()
    expect(egriPuani(-1, egri)).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('sanayi eğrisi', () => {
  it("OSB'nin dibi tam puan almaz — gürültü ve ağır trafik bedeli", () => {
    const dibinde = egriPuani(200, SANAYI_EGRISI)
    const idealBant = egriPuani(4_000, SANAYI_EGRISI)

    expect(dibinde).toBeLessThan(idealBant as number)
    expect(idealBant).toBe(100)
  })

  it('çok uzakta sıfırlanır', () => {
    expect(egriPuani(15_000, SANAYI_EGRISI)).toBe(0)
    expect(egriPuani(40_000, SANAYI_EGRISI)).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('skorOnerileriHesapla — veri kapsamı koruması', () => {
  const mahalleler = [
    mahalle('a', [mesafe('okul', 400)]),
    mahalle('b', [mesafe('okul', 800)]),
    mahalle('c', [mesafe('okul', 600)]),
  ]

  it('hiç sanayi kaydı yoksa SIFIR değil NULL öneri üretir', () => {
    const sonuc = skorOnerileriHesapla(mahalleler, new Set<PoiTipi>(['okul']))
    const sanayi = oneri(sonuc, 'a', 'sanayiYakinligi')

    expect(sanayi.puan).toBeNull()
    expect(sanayi.eksikler.join(' ')).toContain('Sanayi')
  })

  it('hiç ulaşım kaydı yoksa ulaşım önerisi üretilmez', () => {
    const sonuc = skorOnerileriHesapla(mahalleler, new Set<PoiTipi>(['okul']))
    expect(oneri(sonuc, 'a', 'ulasim').puan).toBeNull()
  })

  it('verisi olan ulaşım kalemi tek başına puan üretebilir', () => {
    const veri = [mahalle('a', [mesafe('durak', 300)])]
    const sonuc = skorOnerileriHesapla(veri, new Set<PoiTipi>(['durak']))
    const ulasim = oneri(sonuc, 'a', 'ulasim')

    // Durak 300 m → 100 puan. İstasyon ve havalimanı verisi yok; bunlar
    // puanı DÜŞÜRMEZ, yalnızca eksik olarak bildirilir.
    expect(ulasim.puan).toBe(100)
    expect(ulasim.eksikler.length).toBeGreaterThan(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('ulaşım önerisi', () => {
  it('kalemleri ağırlıklarıyla harmanlar', () => {
    const veri = [
      mahalle('a', [
        mesafe('durak', 300), // 100 puan, ağırlık 40
        mesafe('istasyon', 8_000), // 0 puan, ağırlık 40
      ]),
    ]
    const sonuc = skorOnerileriHesapla(veri, new Set<PoiTipi>(['durak', 'istasyon']))

    // (100×40 + 0×40) / 80 = 50
    expect(oneri(sonuc, 'a', 'ulasim').puan).toBe(50)
  })

  it('gerekçe her kalemi tek tek gösterir — kara kutu yok', () => {
    const veri = [mahalle('a', [mesafe('durak', 300), mesafe('istasyon', 2_000)])]
    const sonuc = skorOnerileriHesapla(veri, new Set<PoiTipi>(['durak', 'istasyon']))
    const gerekce = oneri(sonuc, 'a', 'ulasim').gerekce

    expect(gerekce.some((s) => s.includes('Toplu taşıma durağı'))).toBe(true)
    expect(gerekce.some((s) => s.includes('Tren istasyonu'))).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('sosyal donatı önerisi', () => {
  it(`${ASGARI_KARSILASTIRMA} mahalleden az veriyle karşılaştırmalı puan üretmez`, () => {
    const veri = [mahalle('a', [mesafe('okul', 400, 5)]), mahalle('b', [mesafe('okul', 500, 3)])]
    const sonuc = skorOnerileriHesapla(veri, TUM_TIPLER)
    const donati = oneri(sonuc, 'a', 'sosyalDonati')

    expect(donati.puan).toBeNull()
    expect(donati.eksikler.join(' ')).toContain('en az')
  })

  it('en yoğun mahalle yoğunluk kaleminde tam puan alır', () => {
    const veri = [
      mahalle('yogun', [mesafe('okul', 300, 10), mesafe('market', 200, 10)]),
      mahalle('orta', [mesafe('okul', 300, 5), mesafe('market', 200, 5)]),
      mahalle('seyrek', [mesafe('okul', 300, 1), mesafe('market', 200, 1)]),
    ]
    const sonuc = skorOnerileriHesapla(veri, new Set<PoiTipi>(['okul', 'market']))

    const yogun = oneri(sonuc, 'yogun', 'sosyalDonati')
    const seyrek = oneri(sonuc, 'seyrek', 'sosyalDonati')

    expect(yogun.puan).toBe(100)
    expect(seyrek.puan as number).toBeLessThan(yogun.puan as number)
  })

  it('kaydı az olan mahallede düşük puanı veri eksikliği olarak işaretler', () => {
    const veri = [
      mahalle('yogun', [mesafe('okul', 300, 20)]),
      mahalle('orta', [mesafe('okul', 300, 10)]),
      mahalle('kayitsiz', [mesafe('okul', 900, 1)]),
    ]
    const sonuc = skorOnerileriHesapla(veri, new Set<PoiTipi>(['okul']))
    const kayitsiz = oneri(sonuc, 'kayitsiz', 'sosyalDonati')

    expect(kayitsiz.eksikler.join(' ')).toContain('kaydın azlığından')
  })

  it('yürüme mesafesinin dışındaki tür çeşitliliğe sayılmaz', () => {
    const uzak = [
      mahalle('a', [mesafe('okul', 5_000, 1)]),
      mahalle('b', [mesafe('okul', 5_000, 1)]),
      mahalle('c', [mesafe('okul', 5_000, 1)]),
    ]
    const sonuc = skorOnerileriHesapla(uzak, new Set<PoiTipi>(['okul']))

    // Çeşitlilik 0, yoğunluk 100 (hepsi eşit) → (100×50 + 0×50)/100 = 50
    expect(oneri(sonuc, 'a', 'sosyalDonati').puan).toBe(50)
  })
})
