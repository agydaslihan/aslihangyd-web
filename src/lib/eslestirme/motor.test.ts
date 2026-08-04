import { describe, expect, it } from 'vitest'

import { agirliklariHesapla, kusUcusuMesafe, mahalleEslestir } from './motor'
import type { MahalleProfili, OlcutAdi, TestCevaplari } from './tipler'

/**
 * ⚠️ Buradaki mahalle adları ve puanlar UYDURMADIR; hesap mantığını
 * sınamak içindir. Gerçek Çorlu verisi CMS'ten gelir (CLAUDE.md kural 2).
 */
function mahalle(
  slug: string,
  ozellikler: Partial<Record<OlcutAdi, number | null>>,
  ek: Partial<MahalleProfili> = {},
): MahalleProfili {
  return {
    slug,
    ad: slug.toUpperCase(),
    ozellikler: {
      yatirimPotansiyeli: 50,
      sanayiYakinligi: 50,
      ulasim: 50,
      topluTasima: 50,
      sosyalDonati: 50,
      okulErisimi: 50,
      sessizlik: 50,
      merkezeYakinlik: 50,
      ...ozellikler,
    },
    ...ek,
  }
}

const CEVAPLAR: TestCevaplari = { amac: 'oturmak' }

// ═══════════════════════════════════════════════════════════════════════════
describe('agirliklariHesapla', () => {
  it('ağırlıklar 100e normalize edilir', () => {
    const toplam = Object.values(agirliklariHesapla({ amac: 'yatirim' })).reduce((t, a) => t + a, 0)
    expect(toplam).toBeCloseTo(100, 0)
  })

  it('yatırım amacında yatırım potansiyeli en ağır ölçüttür', () => {
    const agirliklar = agirliklariHesapla({ amac: 'yatirim' })
    const enAgir = (Object.keys(agirliklar) as OlcutAdi[]).sort(
      (a, b) => agirliklar[b] - agirliklar[a],
    )[0]

    expect(enAgir).toBe('yatirimPotansiyeli')
  })

  it('oturmak amacında sosyal donatı, yatırım potansiyelinden ağırdır', () => {
    const agirliklar = agirliklariHesapla({ amac: 'oturmak' })
    expect(agirliklar.sosyalDonati).toBeGreaterThan(agirliklar.yatirimPotansiyeli)
  })

  it('"ikisi" seçeneği iki profilin ortasında durur', () => {
    const oturmak = agirliklariHesapla({ amac: 'oturmak' })
    const yatirim = agirliklariHesapla({ amac: 'yatirim' })
    const ikisi = agirliklariHesapla({ amac: 'ikisi' })

    expect(ikisi.yatirimPotansiyeli).toBeGreaterThan(oturmak.yatirimPotansiyeli)
    expect(ikisi.yatirimPotansiyeli).toBeLessThan(yatirim.yatirimPotansiyeli)
  })

  it('çocuk varsa okul erişimi ağırlığı belirgin biçimde artar', () => {
    const cocuksuz = agirliklariHesapla({ amac: 'oturmak', cocukVar: false })
    const cocuklu = agirliklariHesapla({ amac: 'oturmak', cocukVar: true })

    expect(cocuklu.okulErisimi).toBeGreaterThan(cocuksuz.okulErisimi * 2)
  })

  it('araç kullanmayanda toplu taşıma ağırlığı artar', () => {
    const araclı = agirliklariHesapla({ amac: 'oturmak', aracKullaniyor: true })
    const aracsiz = agirliklariHesapla({ amac: 'oturmak', aracKullaniyor: false })

    expect(aracsiz.topluTasima).toBeGreaterThan(araclı.topluTasima)
  })

  it('sessizlik ve merkez öncelikleri zıt yönde çalışır', () => {
    const sessiz = agirliklariHesapla({ amac: 'oturmak', oncelik: 'sessizlik' })
    const merkez = agirliklariHesapla({ amac: 'oturmak', oncelik: 'merkez' })

    expect(sessiz.sessizlik).toBeGreaterThan(merkez.sessizlik)
    expect(merkez.merkezeYakinlik).toBeGreaterThan(sessiz.merkezeYakinlik)
  })

  it('bütçe girilmezse bütçe uygunluğu ölçütü tamamen devre dışı kalır', () => {
    expect(agirliklariHesapla({ amac: 'oturmak' }).erisilebilirlik).toBe(0)
    expect(
      agirliklariHesapla({ amac: 'oturmak', butce: 3_000_000 }).erisilebilirlik,
    ).toBeGreaterThan(0)
  })

  it('zaman ufku eşleştirmeyi etkilemez', () => {
    const yakin = agirliklariHesapla({ amac: 'oturmak', zamanUfku: 'yakin' })
    const arastiran = agirliklariHesapla({ amac: 'oturmak', zamanUfku: 'arastiriyorum' })

    expect(yakin).toEqual(arastiran)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('mahalleEslestir — temel davranış', () => {
  it('amaç seçilmeden eşleştirme yapılmaz', () => {
    const sonuc = mahalleEslestir({}, [mahalle('a', {})])
    expect(sonuc.durum).toBe('cevap_eksik')
  })

  it('en fazla 3 mahalle önerir, uyuma göre sıralı', () => {
    const sonuc = mahalleEslestir(CEVAPLAR, [
      mahalle('a', { sosyalDonati: 20 }),
      mahalle('b', { sosyalDonati: 90 }),
      mahalle('c', { sosyalDonati: 60 }),
      mahalle('d', { sosyalDonati: 40 }),
      mahalle('e', { sosyalDonati: 10 }),
    ])

    expect(sonuc.durum).toBe('eslesti')
    if (sonuc.durum !== 'eslesti') return

    expect(sonuc.eslesmeler).toHaveLength(3)
    expect(sonuc.eslesmeler.map((e) => e.slug)).toEqual(['b', 'c', 'd'])
    expect(sonuc.eslesmeler[0]!.uyum).toBeGreaterThan(sonuc.eslesmeler[1]!.uyum)
  })

  it('kırılım her ölçütün ağırlığını ve puanını gösterir — kara kutu yok', () => {
    const sonuc = mahalleEslestir(CEVAPLAR, [mahalle('a', {})])
    if (sonuc.durum !== 'eslesti') throw new Error('eşleşme bekleniyordu')

    const kirilim = sonuc.eslesmeler[0]!.kirilim
    expect(kirilim.length).toBeGreaterThan(0)
    for (const satir of kirilim) {
      expect(satir.agirlik).toBeGreaterThan(0)
      expect(satir.etiket).toBeTruthy()
      expect(satir.aciklama).toBeTruthy()
    }
  })

  it('kullanılan ağırlıklar sonuçla birlikte döner', () => {
    const sonuc = mahalleEslestir({ amac: 'yatirim' }, [mahalle('a', {})])
    if (sonuc.durum !== 'eslesti') throw new Error('eşleşme bekleniyordu')

    expect(sonuc.agirliklar.length).toBeGreaterThan(0)
    expect(sonuc.agirliklar[0]!.olcut).toBe('yatirimPotansiyeli')
  })

  it('ağırlığı sıfırlanan ölçüt kırılımda görünmez', () => {
    const sonuc = mahalleEslestir({ amac: 'yatirim' }, [mahalle('a', {})])
    if (sonuc.durum !== 'eslesti') throw new Error('eşleşme bekleniyordu')

    const olcutler = sonuc.eslesmeler[0]!.kirilim.map((k) => k.olcut)
    // Yatırım profilinde okul erişimi ve sakinlik ağırlığı sıfır.
    expect(olcutler).not.toContain('okulErisimi')
    expect(olcutler).not.toContain('sessizlik')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('mahalleEslestir — veri yetersizliği', () => {
  it('mahalle listesi boşsa yetersiz veri döner', () => {
    const sonuc = mahalleEslestir(CEVAPLAR, [])
    expect(sonuc.durum).toBe('yetersiz_veri')
  })

  it('ölçütlerin çoğu boşsa o mahalle için uyum üretilmez', () => {
    const sonuc = mahalleEslestir(CEVAPLAR, [
      mahalle('bos', {
        sosyalDonati: null,
        ulasim: null,
        sessizlik: null,
        merkezeYakinlik: null,
        topluTasima: null,
        okulErisimi: null,
      }),
    ])

    expect(sonuc.durum).toBe('yetersiz_veri')
    if (sonuc.durum !== 'yetersiz_veri') return
    expect(sonuc.degerlendirilenMahalle).toBe(1)
    expect(sonuc.eksikOlcutler.length).toBeGreaterThan(0)
  })

  it('eksik ölçüt sıfır sayılmaz — mahalle haksız cezalandırılmaz', () => {
    const tam = mahalleEslestir(CEVAPLAR, [mahalle('a', {})])
    const eksikBir = mahalleEslestir(CEVAPLAR, [mahalle('a', { okulErisimi: null })])

    if (tam.durum !== 'eslesti' || eksikBir.durum !== 'eslesti') {
      throw new Error('eşleşme bekleniyordu')
    }

    // Tüm puanlar 50 iken bir ölçütün eksilmesi uyumu değiştirmemeli.
    expect(eksikBir.eslesmeler[0]!.uyum).toBe(tam.eslesmeler[0]!.uyum)
    expect(eksikBir.eslesmeler[0]!.kapsam).toBeLessThan(1)
    expect(eksikBir.eslesmeler[0]!.eksikOlcutler).toContain('Okul erişimi')
  })

  it('eksik ölçütler kullanıcıya adıyla bildirilir', () => {
    const sonuc = mahalleEslestir(CEVAPLAR, [mahalle('a', { sessizlik: null })])
    if (sonuc.durum !== 'eslesti') throw new Error('eşleşme bekleniyordu')

    expect(sonuc.eslesmeler[0]!.eksikOlcutler).toContain('Sakinlik')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('mahalleEslestir — bütçe uygunluğu', () => {
  const MAHALLELER = [
    mahalle('ucuz', {}, { ortalamaM2Satis: 20_000 }),
    mahalle('pahali', {}, { ortalamaM2Satis: 40_000 }),
  ]

  it('bütçeyle daha çok m² alınan mahalle tam puan alır', () => {
    const sonuc = mahalleEslestir({ amac: 'oturmak', butce: 4_000_000 }, MAHALLELER)
    if (sonuc.durum !== 'eslesti') throw new Error('eşleşme bekleniyordu')

    const ucuz = sonuc.eslesmeler.find((e) => e.slug === 'ucuz')!
    const pahali = sonuc.eslesmeler.find((e) => e.slug === 'pahali')!

    expect(ucuz.kirilim.find((k) => k.olcut === 'erisilebilirlik')?.puan).toBe(100)
    expect(pahali.kirilim.find((k) => k.olcut === 'erisilebilirlik')?.puan).toBe(50)
  })

  it('bütçeyle alınabilecek m² gerçek fiyattan hesaplanır', () => {
    const sonuc = mahalleEslestir({ amac: 'oturmak', butce: 4_000_000 }, MAHALLELER)
    if (sonuc.durum !== 'eslesti') throw new Error('eşleşme bekleniyordu')

    expect(sonuc.eslesmeler.find((e) => e.slug === 'ucuz')?.butceyleAlinabilirM2).toBe(200)
    expect(sonuc.eslesmeler.find((e) => e.slug === 'pahali')?.butceyleAlinabilirM2).toBe(100)
  })

  it('m² fiyatı olmayan mahalle için bütçe puanı üretilmez', () => {
    const sonuc = mahalleEslestir({ amac: 'oturmak', butce: 4_000_000 }, [
      mahalle('verisiz', {}),
      ...MAHALLELER,
    ])
    if (sonuc.durum !== 'eslesti') throw new Error('eşleşme bekleniyordu')

    const verisiz = sonuc.eslesmeler.find((e) => e.slug === 'verisiz')
    expect(verisiz?.butceyleAlinabilirM2).toBeNull()
    expect(verisiz?.eksikOlcutler).toContain('Bütçenize uygunluk')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('mahalleEslestir — hedef noktaya yakınlık', () => {
  it('hedefe yakın mahalle, ulaşım puanında öne geçer', () => {
    const yakin = mahalle('yakin', { ulasim: 50 }, { hedefeMesafe: 1_000 })
    const uzak = mahalle('uzak', { ulasim: 50 }, { hedefeMesafe: 15_000 })

    const sonuc = mahalleEslestir(CEVAPLAR, [yakin, uzak])
    if (sonuc.durum !== 'eslesti') throw new Error('eşleşme bekleniyordu')

    const yakinPuan = sonuc.eslesmeler
      .find((e) => e.slug === 'yakin')!
      .kirilim.find((k) => k.olcut === 'ulasim')!.puan
    const uzakPuan = sonuc.eslesmeler
      .find((e) => e.slug === 'uzak')!
      .kirilim.find((k) => k.olcut === 'ulasim')!.puan

    expect(yakinPuan).toBeGreaterThan(uzakPuan!)
  })

  it('hedef seçilmezse ulaşım puanı olduğu gibi kalır', () => {
    const sonuc = mahalleEslestir(CEVAPLAR, [mahalle('a', { ulasim: 70 })])
    if (sonuc.durum !== 'eslesti') throw new Error('eşleşme bekleniyordu')

    expect(sonuc.eslesmeler[0]!.kirilim.find((k) => k.olcut === 'ulasim')?.puan).toBe(70)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('kusUcusuMesafe', () => {
  it('aynı nokta için sıfır döner', () => {
    const nokta = { boylam: 27.8, enlem: 41.16 }
    expect(kusUcusuMesafe(nokta, nokta)).toBe(0)
  })

  it('bilinen bir mesafeyi makul hatayla hesaplar', () => {
    // 1 derece enlem ≈ 111 km.
    const mesafe = kusUcusuMesafe({ boylam: 27.8, enlem: 41 }, { boylam: 27.8, enlem: 42 })
    expect(mesafe).toBeGreaterThan(110_000)
    expect(mesafe).toBeLessThan(112_000)
  })

  it('simetriktir', () => {
    const a = { boylam: 27.8, enlem: 41.16 }
    const b = { boylam: 27.9, enlem: 41.2 }
    expect(kusUcusuMesafe(a, b)).toBe(kusUcusuMesafe(b, a))
  })
})
