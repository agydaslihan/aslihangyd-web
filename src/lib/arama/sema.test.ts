import { describe, expect, it } from 'vitest'

import {
  AZAMI_FIYAT,
  aramaFiltresiSemasi,
  filtreBosMu,
  filtreyiParametrelereCevir,
  sorguSemasi,
  type AramaFiltresi,
} from './sema'

/**
 * ⚠️ Bu testler AI aramanın güvenlik sınırını koruyor: modelin ürettiği
 * hiçbir değer doğrulanmadan URL'ye geçemez. Testlerin çoğu "model kötü
 * niyetli ya da halüsinasyon görmüş" varsayımıyla yazıldı.
 */
function filtre(ek: Partial<AramaFiltresi> = {}): AramaFiltresi {
  return {
    tip: null,
    kategori: null,
    mahalle: null,
    odaSayisi: null,
    enAzFiyat: null,
    enCokFiyat: null,
    siralama: null,
    anlasilmayan: [],
    ...ek,
  }
}

const MAHALLELER = ['muhittin', 'seyhsinan', 'alipasa']

// ═══════════════════════════════════════════════════════════════════════════
describe('sorguSemasi', () => {
  it('çok kısa sorguyu reddeder', () => {
    expect(sorguSemasi.safeParse('ev').success).toBe(false)
  })

  it('çok uzun sorguyu reddeder', () => {
    expect(sorguSemasi.safeParse('a'.repeat(500)).success).toBe(false)
  })

  it('normal sorguyu kabul eder ve kırpar', () => {
    const sonuc = sorguSemasi.safeParse('  Muhittin de 3+1 daire  ')
    expect(sonuc.success).toBe(true)
    if (sonuc.success) expect(sonuc.data).toBe('Muhittin de 3+1 daire')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('aramaFiltresiSemasi', () => {
  it('geçerli filtreyi kabul eder', () => {
    const sonuc = aramaFiltresiSemasi.safeParse(filtre({ tip: 'satilik', odaSayisi: '3+1' }))
    expect(sonuc.success).toBe(true)
  })

  it('listede olmayan tip değerini reddeder', () => {
    // Model "devren" uydurursa şema onu geçirmez.
    const sonuc = aramaFiltresiSemasi.safeParse({ ...filtre(), tip: 'devren' })
    expect(sonuc.success).toBe(false)
  })

  it('listede olmayan oda tipini reddeder', () => {
    const sonuc = aramaFiltresiSemasi.safeParse({ ...filtre(), odaSayisi: '7+2' })
    expect(sonuc.success).toBe(false)
  })

  it('bilinmeyen sıralama değerini reddeder', () => {
    const sonuc = aramaFiltresiSemasi.safeParse({ ...filtre(), siralama: 'rastgele' })
    expect(sonuc.success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('filtreyiParametrelereCevir', () => {
  it('anlaşılan alanları URL parametresine yazar', () => {
    const p = filtreyiParametrelereCevir(
      filtre({ tip: 'satilik', odaSayisi: '3+1', enCokFiyat: 5_000_000 }),
      MAHALLELER,
    )

    expect(p.get('tip')).toBe('satilik')
    expect(p.get('odaSayisi')).toBe('3+1')
    expect(p.get('enCokFiyat')).toBe('5000000')
  })

  it("UYDURULMUŞ mahalleyi URL'ye yazmaz", () => {
    // Model olmayan bir mahalle üretirse arama o mahalleyle yapılmamalı.
    const p = filtreyiParametrelereCevir(filtre({ mahalle: 'kazimiye' }), MAHALLELER)
    expect(p.has('mahalle')).toBe(false)
  })

  it('gerçek mahalleyi yazar', () => {
    const p = filtreyiParametrelereCevir(filtre({ mahalle: 'muhittin' }), MAHALLELER)
    expect(p.get('mahalle')).toBe('muhittin')
  })

  it('saçma fiyatı eler', () => {
    expect(
      filtreyiParametrelereCevir(filtre({ enCokFiyat: -5 }), MAHALLELER).has('enCokFiyat'),
    ).toBe(false)
    expect(
      filtreyiParametrelereCevir(filtre({ enCokFiyat: AZAMI_FIYAT * 10 }), MAHALLELER).has(
        'enCokFiyat',
      ),
    ).toBe(false)
    expect(
      filtreyiParametrelereCevir(filtre({ enAzFiyat: Number.NaN }), MAHALLELER).has('enAzFiyat'),
    ).toBe(false)
  })

  it('ters çevrilmiş fiyat aralığında İKİSİNİ birden atar', () => {
    // "5 milyondan fazla, 3 milyondan az" sıfır sonuç üretirdi ve sebebi
    // görünmezdi; aralığı hiç uygulamamak dürüst olan.
    const p = filtreyiParametrelereCevir(
      filtre({ enAzFiyat: 5_000_000, enCokFiyat: 3_000_000 }),
      MAHALLELER,
    )

    expect(p.has('enAzFiyat')).toBe(false)
    expect(p.has('enCokFiyat')).toBe(false)
  })

  it('geçerli aralığı korur', () => {
    const p = filtreyiParametrelereCevir(
      filtre({ enAzFiyat: 3_000_000, enCokFiyat: 5_000_000 }),
      MAHALLELER,
    )

    expect(p.get('enAzFiyat')).toBe('3000000')
    expect(p.get('enCokFiyat')).toBe('5000000')
  })

  it('fiyatı tam sayıya yuvarlar', () => {
    const p = filtreyiParametrelereCevir(filtre({ enCokFiyat: 4_999_999.7 }), MAHALLELER)
    expect(p.get('enCokFiyat')).toBe('5000000')
  })

  it("anlasilmayan alanını URL'ye taşımaz", () => {
    // Bu alan arayüzde gösterilir, filtreye dönüşmez.
    const p = filtreyiParametrelereCevir(
      filtre({ tip: 'satilik', anlasilmayan: ['güney cephe'] }),
      MAHALLELER,
    )

    expect([...p.keys()]).toEqual(['tip'])
  })

  it('hiçbir şey anlaşılmadıysa boş kalır', () => {
    expect(filtreBosMu(filtreyiParametrelereCevir(filtre(), MAHALLELER))).toBe(true)
  })
})
