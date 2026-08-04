import { describe, expect, it } from 'vitest'

import {
  AYKIRI_SAPMA_ORANI,
  aykiriDegerKontrol,
  BAYAT_VERI_GUNU,
  bayatVeriKontrol,
  girdiAklaYatkinMi,
  m2FiyatiHesapla,
  MUKERRER_GUN_PENCERESI,
  mukerrerKontrol,
  type MevcutGozlem,
} from './kalite'

function aday(degisiklik: Record<string, unknown> = {}) {
  return {
    mahalleSlug: 'muhittin',
    odaTipi: '3+1',
    tip: 'satilik',
    m2: 135,
    fiyat: 4_300_000,
    m2Fiyati: 31_852,
    ...degisiklik,
  }
}

describe('m2FiyatiHesapla', () => {
  it('fiyatı metrekareye böler', () => {
    expect(m2FiyatiHesapla(4_300_000, 135)).toBeCloseTo(31_851.85, 1)
  })

  it.each([
    [0, 135],
    [4_300_000, 0],
    [-1, 135],
    [Number.NaN, 135],
  ])('geçersiz girdide (%j, %j) null döner', (fiyat, m2) => {
    expect(m2FiyatiHesapla(fiyat, m2)).toBeNull()
  })
})

describe('mukerrerKontrol', () => {
  const mevcut: MevcutGozlem = {
    mahalleSlug: 'muhittin',
    odaTipi: '3+1',
    tip: 'satilik',
    m2: 135,
    fiyat: 4_300_000,
    gunOnce: 12,
  }

  it('aynı gözlemi kısa süre içinde yakalar', () => {
    const uyari = mukerrerKontrol(aday(), [mevcut])

    expect(uyari?.kod).toBe('mukerrer')
    expect(uyari?.mesaj).toContain('12 gün önce')
  })

  it(`${MUKERRER_GUN_PENCERESI} günden eski kayıt mükerrer sayılmaz`, () => {
    const eski = { ...mevcut, gunOnce: MUKERRER_GUN_PENCERESI + 1 }
    expect(mukerrerKontrol(aday(), [eski])).toBeNull()
  })

  it('farklı fiyat mükerrer değildir — fiyat güncellenmiş olabilir', () => {
    expect(mukerrerKontrol(aday({ fiyat: 4_400_000 }), [mevcut])).toBeNull()
  })

  it('farklı mahalle mükerrer değildir', () => {
    expect(mukerrerKontrol(aday({ mahalleSlug: 'seyhsinan' }), [mevcut])).toBeNull()
  })

  it('satılık ve kiralık ayrı değerlendirilir', () => {
    expect(mukerrerKontrol(aday({ tip: 'kiralik' }), [mevcut])).toBeNull()
  })
})

describe('aykiriDegerKontrol', () => {
  it('medyandan belirgin sapan değeri işaretler', () => {
    const uyari = aykiriDegerKontrol(60_000, 40_000)

    expect(uyari?.kod).toBe('aykiri_deger')
    expect(uyari?.mesaj).toContain('%50')
    expect(uyari?.mesaj).toContain('üstünde')
  })

  it('düşük yönde sapmayı da yakalar', () => {
    const uyari = aykiriDegerKontrol(20_000, 40_000)
    expect(uyari?.mesaj).toContain('altında')
  })

  it(`%${AYKIRI_SAPMA_ORANI * 100} altındaki sapmada uyarmaz`, () => {
    expect(aykiriDegerKontrol(45_000, 40_000)).toBeNull()
  })

  it('katman medyanı bilinmiyorsa kontrol yapılmaz', () => {
    expect(aykiriDegerKontrol(99_999, null)).toBeNull()
  })

  it('⚠️ uyarır ama engellemez — karar insanın', () => {
    const uyari = aykiriDegerKontrol(80_000, 40_000)

    expect(uyari?.onayIster).toBe(true)
    // Uyarı bir soru sorar, hüküm vermez.
    expect(uyari?.mesaj).toContain('Doğru mu?')
  })
})

describe('girdiAklaYatkinMi — tuş hatası yakalama', () => {
  it('olağandışı küçük metrekareyi işaretler', () => {
    const uyarilar = girdiAklaYatkinMi(aday({ m2: 5 }))
    expect(uyarilar.map((u) => u.kod)).toContain('supheli_m2')
  })

  it('olağandışı büyük metrekareyi işaretler', () => {
    const uyarilar = girdiAklaYatkinMi(aday({ m2: 5000 }))
    expect(uyarilar.map((u) => u.kod)).toContain('supheli_m2')
  })

  it('eksik girilmiş fiyatı yakalar', () => {
    // 4.300.000 yerine 4300 yazılmış → m² fiyatı 32 TL çıkar.
    const uyarilar = girdiAklaYatkinMi(aday({ fiyat: 4_300, m2Fiyati: 32 }))
    expect(uyarilar.map((u) => u.kod)).toContain('supheli_fiyat')
  })

  it('normal girdide uyarı üretmez', () => {
    expect(girdiAklaYatkinMi(aday())).toEqual([])
  })

  it('depo gibi büyük ticari alanları engellemez', () => {
    // 2000 m² sınırın içinde; ticari portföy bu aracı da kullanabilmeli.
    expect(girdiAklaYatkinMi(aday({ m2: 1800, m2Fiyati: 15_000 }))).toEqual([])
  })
})

describe('bayatVeriKontrol', () => {
  it(`${BAYAT_VERI_GUNU} günden uzun süredir gözlem olmayan mahalleyi bildirir`, () => {
    const uyarilar = bayatVeriKontrol([
      { slug: 'muhittin', ad: 'Muhittin', sonGozlemGunOnce: 3 },
      { slug: 'hidiraga', ad: 'Hıdırağa', sonGozlemGunOnce: 47 },
    ])

    expect(uyarilar).toHaveLength(1)
    expect(uyarilar[0]?.mesaj).toContain('Hıdırağa')
    expect(uyarilar[0]?.mesaj).toContain('47 gün')
  })

  it('hiç gözlem olmayan mahalleyi ayrı ifadeyle bildirir', () => {
    const uyarilar = bayatVeriKontrol([{ slug: 'onerler', ad: 'Önerler', sonGozlemGunOnce: null }])

    expect(uyarilar[0]?.mesaj).toContain('hiç gözlem yok')
  })

  it('bayat veri uyarısı onay istemez — bilgilendirmedir', () => {
    const uyarilar = bayatVeriKontrol([{ slug: 'onerler', ad: 'Önerler', sonGozlemGunOnce: null }])

    expect(uyarilar[0]?.onayIster).toBe(false)
  })

  it('güncel mahalleler için uyarı üretmez', () => {
    expect(bayatVeriKontrol([{ slug: 'muhittin', ad: 'Muhittin', sonGozlemGunOnce: 5 }])).toEqual(
      [],
    )
  })
})
