import { describe, expect, it } from 'vitest'

import { KATMAN_MINIMUM_GOZLEM } from '@/lib/endeks/tipler'

import { ASGARI_MAHALLE, bolgeyiTara, medyanBul, type RadarMahallesi } from './motor'

/**
 * ⚠️ Buradaki mahalle adları ve rakamlar UYDURMADIR; hesap mantığını
 * sınamak içindir. Gerçek Çorlu verisi CMS'ten gelir (CLAUDE.md kural 2).
 */
function mahalle(slug: string, alanlar: Partial<RadarMahallesi> = {}): RadarMahallesi {
  return {
    slug,
    ad: slug.toUpperCase(),
    kiraCarpani: 20,
    degisim12Ay: 30,
    yatirimSkoru: 60,
    ortalamaM2Satis: 30_000,
    gozlemSayisi: 20,
    arzBaskisiPuani: 70,
    ...alanlar,
  }
}

/** Sinyal üretmeyen, medyanı oluşturan dolgu mahalleler. */
function taban(): RadarMahallesi[] {
  return [mahalle('t1'), mahalle('t2'), mahalle('t3'), mahalle('t4')]
}

function tara(mahalleler: RadarMahallesi[]) {
  const sonuc = bolgeyiTara(mahalleler)
  if (sonuc.durum !== 'tarandi') throw new Error(`Taranamadı: ${sonuc.durum}`)
  return sonuc.veri
}

// ═══════════════════════════════════════════════════════════════════════════
describe('medyanBul', () => {
  it('yetersiz mahallede medyan üretmez', () => {
    expect(medyanBul([1, 2, 3])).toBeNull()
    expect(medyanBul([1, 2, 3, 4])).not.toBeNull()
  })

  it('null ve tanımsız değerleri saymaz', () => {
    const olcut = medyanBul([10, null, 20, undefined, 30, 40])
    expect(olcut?.mahalleSayisi).toBe(4)
    expect(olcut?.medyan).toBe(25)
  })

  it('tek sayıda değerde ortadaki değeri döner', () => {
    expect(medyanBul([10, 20, 30, 40, 50])?.medyan).toBe(30)
  })

  /** Medyan tercihinin varlık sebebi: aykırı değere dayanıklılık. */
  it('tek bir aykırı değer medyanı sürüklemez', () => {
    const normal = medyanBul([10, 20, 30, 40])?.medyan
    const aykirili = medyanBul([10, 20, 30, 100_000])?.medyan

    expect(normal).toBe(aykirili)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('bolgeyiTara — kapı', () => {
  it('yeterli mahalle yoksa tarama yapılmaz', () => {
    const sonuc = bolgeyiTara([mahalle('a'), mahalle('b')])

    expect(sonuc.durum).toBe('yetersiz_veri')
    if (sonuc.durum !== 'yetersiz_veri') return
    expect(sonuc.gereken).toBe(ASGARI_MAHALLE)
    expect(sonuc.taranan).toBe(2)
  })

  it('tüm mahalleler ortalamadaysa hiç sinyal üretilmez', () => {
    const veri = tara(taban())

    expect(veri.sinyaller).toHaveLength(0)
    expect(veri.sinyalsizMahalleler).toHaveLength(4)
    expect(veri.taranan).toBe(4)
  })

  it('karşılaştırmada kullanılan medyanlar sonuçla birlikte döner', () => {
    const veri = tara(taban())

    const carpan = veri.olcutler.find((o) => o.ad === 'Kira çarpanı')
    expect(carpan?.medyan).toBe(20)
    expect(carpan?.mahalleSayisi).toBe(4)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('bolgeyiTara — kira çarpanı sinyalleri', () => {
  it('medyanın belirgin altındaki çarpan fırsat sinyali üretir', () => {
    const veri = tara([...taban(), mahalle('ucuz', { kiraCarpani: 14 })])
    const sinyal = veri.sinyaller.find((s) => s.mahalleSlug === 'ucuz')

    expect(sinyal?.kod).toBe('dusuk_carpan')
    expect(sinyal?.tur).toBe('firsat')
    // Gerekçe hem mahallenin hem medyanın rakamını içermeli.
    expect(sinyal?.gerekce).toContain('14')
    expect(sinyal?.gerekce).toContain('20')
  })

  it('medyanın belirgin üstündeki çarpan risk sinyali üretir', () => {
    const veri = tara([...taban(), mahalle('pahali', { kiraCarpani: 28 })])
    const sinyal = veri.sinyaller.find((s) => s.mahalleSlug === 'pahali')

    expect(sinyal?.kod).toBe('yuksek_carpan')
    expect(sinyal?.tur).toBe('risk')
  })

  it('küçük sapmalar sinyal üretmez — gürültü elenir', () => {
    const veri = tara([...taban(), mahalle('hafif', { kiraCarpani: 19 })])
    expect(veri.sinyaller.filter((s) => s.mahalleSlug === 'hafif')).toHaveLength(0)
  })

  it('çarpan verisi olmayan mahalle için çarpan sinyali üretilmez', () => {
    const veri = tara([...taban(), mahalle('verisiz', { kiraCarpani: null })])
    const kodlar = veri.sinyaller.filter((s) => s.mahalleSlug === 'verisiz').map((s) => s.kod)

    expect(kodlar).not.toContain('dusuk_carpan')
    expect(kodlar).not.toContain('yuksek_carpan')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('bolgeyiTara — fiyat değişimi sinyalleri', () => {
  it('medyanın üstünde artış ivme sinyali üretir', () => {
    const veri = tara([...taban(), mahalle('hizli', { degisim12Ay: 45 })])
    const sinyal = veri.sinyaller.find((s) => s.mahalleSlug === 'hizli' && s.kod === 'fiyat_ivmesi')

    expect(sinyal?.tur).toBe('firsat')
    // Geçmiş verinin geleceği garanti etmediği sinyalin içinde yazmalı.
    expect(sinyal?.gerekce).toContain('güvencesi değildir')
  })

  it('medyanın altında artış uyarı sinyali üretir ve tek yönlü yorumlamaz', () => {
    const veri = tara([...taban(), mahalle('yavas', { degisim12Ay: 15 })])
    const sinyal = veri.sinyaller.find(
      (s) => s.mahalleSlug === 'yavas' && s.kod === 'fiyat_gerilemesi',
    )

    expect(sinyal?.tur).toBe('uyari')
    expect(sinyal?.gerekce).toContain('giriş noktası')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('bolgeyiTara — fiyatlanmamış skor', () => {
  it('skoru yüksek fiyatı düşük mahalle fırsat sinyali alır', () => {
    const veri = tara([...taban(), mahalle('gizli', { yatirimSkoru: 85, ortalamaM2Satis: 24_000 })])
    const sinyal = veri.sinyaller.find((s) => s.kod === 'fiyatlanmamis_skor')

    expect(sinyal?.mahalleSlug).toBe('gizli')
    expect(sinyal?.tur).toBe('firsat')
  })

  it('skoru yüksek ama fiyatı da yüksekse sinyal üretilmez', () => {
    const veri = tara([
      ...taban(),
      mahalle('pahali', { yatirimSkoru: 85, ortalamaM2Satis: 40_000 }),
    ])
    expect(veri.sinyaller.some((s) => s.kod === 'fiyatlanmamis_skor')).toBe(false)
  })

  it('skoru medyanın altındaysa fiyat düşük olsa da sinyal üretilmez', () => {
    const veri = tara([...taban(), mahalle('zayif', { yatirimSkoru: 40, ortalamaM2Satis: 20_000 })])
    expect(veri.sinyaller.some((s) => s.kod === 'fiyatlanmamis_skor')).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('bolgeyiTara — veri zayıflığı', () => {
  it('gözlem sayısı endeks eşiğinin altındaysa uyarı üretilir', () => {
    const veri = tara([...taban(), mahalle('az', { gozlemSayisi: KATMAN_MINIMUM_GOZLEM - 1 })])
    const sinyal = veri.sinyaller.find((s) => s.kod === 'zayif_veri')

    expect(sinyal?.mahalleSlug).toBe('az')
    expect(sinyal?.tur).toBe('uyari')
    expect(sinyal?.gerekce).toContain(String(KATMAN_MINIMUM_GOZLEM))
  })

  it('eşiği karşılayan mahalle için uyarı üretilmez', () => {
    const veri = tara([...taban(), mahalle('yeterli', { gozlemSayisi: KATMAN_MINIMUM_GOZLEM })])
    expect(veri.sinyaller.some((s) => s.mahalleSlug === 'yeterli')).toBe(false)
  })

  it('gözlem sayısı hiç bildirilmemişse bu da uyarı olarak gösterilir', () => {
    const veri = tara([...taban(), mahalle('bilinmez', { gozlemSayisi: null })])
    const sinyal = veri.sinyaller.find((s) => s.mahalleSlug === 'bilinmez')

    expect(sinyal?.kod).toBe('zayif_veri')
    expect(sinyal?.baslik).toContain('bildirilmemiş')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('bolgeyiTara — arz baskısı ve sıralama', () => {
  it('düşük arz baskısı puanı risk sinyali üretir', () => {
    const veri = tara([...taban(), mahalle('insaat', { arzBaskisiPuani: 15 })])
    const sinyal = veri.sinyaller.find((s) => s.kod === 'arz_baskisi')

    expect(sinyal?.mahalleSlug).toBe('insaat')
    expect(sinyal?.tur).toBe('risk')
  })

  it('sinyaller güce göre azalan sıralanır', () => {
    const veri = tara([
      ...taban(),
      mahalle('hafifUcuz', { kiraCarpani: 17 }),
      mahalle('cokUcuz', { kiraCarpani: 8 }),
    ])

    for (let i = 1; i < veri.sinyaller.length; i += 1) {
      expect(veri.sinyaller[i - 1]!.guc).toBeGreaterThanOrEqual(veri.sinyaller[i]!.guc)
    }
  })

  it('bir mahalle birden fazla sinyal alabilir', () => {
    const veri = tara([
      ...taban(),
      mahalle('karisik', { kiraCarpani: 12, arzBaskisiPuani: 10, gozlemSayisi: 3 }),
    ])
    const kodlar = veri.sinyaller.filter((s) => s.mahalleSlug === 'karisik').map((s) => s.kod)

    expect(kodlar).toContain('dusuk_carpan')
    expect(kodlar).toContain('arz_baskisi')
    expect(kodlar).toContain('zayif_veri')
  })

  it('her sinyalin gerekçesi doludur — kara kutu sinyal yok', () => {
    const veri = tara([
      ...taban(),
      mahalle('a', { kiraCarpani: 10 }),
      mahalle('b', { degisim12Ay: 50 }),
      mahalle('c', { gozlemSayisi: 2 }),
    ])

    expect(veri.sinyaller.length).toBeGreaterThan(0)
    for (const sinyal of veri.sinyaller) {
      expect(sinyal.gerekce.length).toBeGreaterThan(30)
      expect(sinyal.baslik).toBeTruthy()
    }
  })
})
