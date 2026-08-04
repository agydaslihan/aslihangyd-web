import { describe, expect, it } from 'vitest'

import type { VergiParametreKumesi } from '@/lib/vergi/parametreler'

import { alimMaliyetiHesapla } from './alimMaliyeti'
import { degerArtisVergisiHesapla } from './degerArtisVergisi'
import { gelirVergisiHesapla } from './gelirVergisi'
import { kiraGeliriVergisiHesapla } from './kiraGeliriVergisi'
import { kiraGetirisiHesapla } from './kiraGetirisi'
import { krediHesapla } from './kredi'

/**
 * ⚠️ Buradaki parametre değerleri UYDURMADIR ve yalnızca hesap mantığını
 * sınamak içindir. Gerçek oranlar CMS'ten gelir (CLAUDE.md kural 4).
 * Testler oranların DEĞERİNİ değil, oranların DOĞRU UYGULANDIĞINI kanıtlar.
 */
function parametreler(degisiklik: Partial<VergiParametreKumesi> = {}): VergiParametreKumesi {
  return {
    sayilar: {
      tapu_harci_orani_alici: 0.02,
      doner_sermaye_ucreti: 1000,
      dask_tahmini_prim: 500,
      ekspertiz_ucreti: 2000,
      emlak_komisyon_orani: 0.02,
      komisyon_kdv_orani: 0.2,
      kira_geliri_istisna_tutari: 100_000,
      goturu_gider_orani: 0.15,
      deger_artis_istisna_tutari: 200_000,
      deger_artis_muafiyet_yili: 5,
      ...degisiklik.sayilar,
    },
    dilimler: {
      gelir_vergisi_dilimleri: [
        { ustSinir: 100_000, oran: 0.15 },
        { ustSinir: 200_000, oran: 0.2 },
        { ustSinir: 500_000, oran: 0.27 },
        { ustSinir: null, oran: 0.35 },
      ],
      ...degisiklik.dilimler,
    },
    gecerlilikTarihi: '2026-01-01',
  }
}

// ═══════════════════════════════════════════════════════════════════════════
describe('kiraGetirisiHesapla', () => {
  it('brüt getiriyi ve kira çarpanını hesaplar', () => {
    const sonuc = kiraGetirisiHesapla({ fiyat: 4_800_000, aylikKira: 20_000 })

    expect(sonuc.durum).toBe('hesaplandi')
    if (sonuc.durum !== 'hesaplandi') return

    expect(sonuc.veri.yillikBrutKira).toBe(240_000)
    expect(sonuc.veri.brutGetiri).toBe(5)
    expect(sonuc.veri.kiraCarpani).toBe(20)
    expect(sonuc.veri.amortismanYili).toBe(20)
  })

  it('gider girilmemişse net getiri gösterilmez — sıfır gider varsayılmaz', () => {
    const sonuc = kiraGetirisiHesapla({ fiyat: 4_800_000, aylikKira: 20_000 })
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    expect(sonuc.veri.net).toBeNull()
  })

  it('aidat ve giderlerle net getiriyi hesaplar', () => {
    const sonuc = kiraGetirisiHesapla({
      fiyat: 4_800_000,
      aylikKira: 20_000,
      aylikAidat: 1_500,
      yillikGiderler: 12_000,
    })
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    // 240.000 − (1.500×12 + 12.000) = 210.000
    expect(sonuc.veri.net?.yillikToplamGider).toBe(30_000)
    expect(sonuc.veri.net?.yillikNetKira).toBe(210_000)
    expect(sonuc.veri.net?.netGetiri).toBeCloseTo(4.38, 2)
  })

  it('boşluk oranını brüt kiradan düşer', () => {
    const sonuc = kiraGetirisiHesapla({
      fiyat: 4_800_000,
      aylikKira: 20_000,
      boslukOrani: 0.25,
    })
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    expect(sonuc.veri.yillikBrutKira).toBe(180_000)
  })

  it('giderler kirayı aşarsa amortisman sonsuzdur — sıfır veya negatif değil', () => {
    const sonuc = kiraGetirisiHesapla({
      fiyat: 4_800_000,
      aylikKira: 10_000,
      yillikGiderler: 200_000,
    })
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    expect(sonuc.veri.net?.netAmortismanYili).toBe(Number.POSITIVE_INFINITY)
  })

  it.each([
    ['fiyat yok', { aylikKira: 20_000 }],
    ['kira yok', { fiyat: 4_800_000 }],
    ['fiyat sıfır', { fiyat: 0, aylikKira: 20_000 }],
  ])('%s → girdi eksik bildirir, sayı uydurmaz', (_ad, girdi) => {
    const sonuc = kiraGetirisiHesapla(girdi)
    expect(sonuc.durum).toBe('girdi_eksik')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('krediHesapla', () => {
  it('anüite taksitini doğru hesaplar', () => {
    // 1.000.000 TL, %2,89 aylık, 120 ay
    const sonuc = krediHesapla({ tutar: 1_000_000, aylikFaizYuzdesi: 2.89, vadeAy: 120 })
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    // Bağımsız kontrol: i=0.0289, n=120
    const i = 0.0289
    const beklenen = (1_000_000 * (i * (1 + i) ** 120)) / ((1 + i) ** 120 - 1)
    expect(sonuc.veri.aylikTaksit).toBeCloseTo(beklenen, 1)
  })

  it('ödeme planı vade kadar satır üretir', () => {
    const sonuc = krediHesapla({ tutar: 500_000, aylikFaizYuzdesi: 2, vadeAy: 36 })
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    expect(sonuc.veri.odemePlani).toHaveLength(36)
  })

  it('son taksitte kalan anapara sıfırlanır — yuvarlama artığı bırakmaz', () => {
    const sonuc = krediHesapla({ tutar: 1_000_000, aylikFaizYuzdesi: 2.89, vadeAy: 120 })
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    expect(sonuc.veri.odemePlani.at(-1)?.kalanAnapara).toBe(0)
  })

  it('anapara geri ödemelerinin toplamı krediye eşittir', () => {
    const sonuc = krediHesapla({ tutar: 750_000, aylikFaizYuzdesi: 3.1, vadeAy: 60 })
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    const toplamAnapara = sonuc.veri.odemePlani.reduce((t, s) => t + s.anapara, 0)
    expect(toplamAnapara).toBeCloseTo(750_000, 0)
  })

  it('faizsiz kredide taksit anapara/vade olur — sıfıra bölme yok', () => {
    const sonuc = krediHesapla({ tutar: 120_000, aylikFaizYuzdesi: 0, vadeAy: 12 })
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    expect(sonuc.veri.aylikTaksit).toBe(10_000)
    expect(sonuc.veri.toplamFaiz).toBe(0)
  })

  it('faiz oranı girilmemişse hesap yapmaz', () => {
    const sonuc = krediHesapla({ tutar: 500_000, vadeAy: 60 })
    expect(sonuc.durum).toBe('girdi_eksik')
  })

  it('vade 360 ayla sınırlanır', () => {
    const sonuc = krediHesapla({ tutar: 500_000, aylikFaizYuzdesi: 2, vadeAy: 600 })
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    expect(sonuc.veri.odemePlani).toHaveLength(360)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('alimMaliyetiHesapla', () => {
  it('tapu harcı ve döner sermayeyi ekler', () => {
    const sonuc = alimMaliyetiHesapla({ fiyat: 5_000_000 }, parametreler())
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    const harc = sonuc.veri.kalemler.find((k) => k.anahtar === 'tapu_harci')
    expect(harc?.tutar).toBe(100_000) // 5.000.000 × %2
    expect(sonuc.veri.gercekToplamMaliyet).toBeGreaterThan(5_000_000)
  })

  it('kredi kullanılmıyorsa ekspertiz eklenmez', () => {
    const sonuc = alimMaliyetiHesapla({ fiyat: 5_000_000 }, parametreler())
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    expect(sonuc.veri.kalemler.some((k) => k.anahtar === 'ekspertiz')).toBe(false)
  })

  it('kredi kullanılıyorsa ekspertiz eklenir', () => {
    const sonuc = alimMaliyetiHesapla({ fiyat: 5_000_000, krediKullanilacak: true }, parametreler())
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    expect(sonuc.veri.kalemler.some((k) => k.anahtar === 'ekspertiz')).toBe(true)
  })

  it('komisyona KDV uygular', () => {
    const sonuc = alimMaliyetiHesapla({ fiyat: 5_000_000, komisyonDahil: true }, parametreler())
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    // 5.000.000 × %2 = 100.000, + %20 KDV = 120.000
    const komisyon = sonuc.veri.kalemler.find((k) => k.anahtar === 'komisyon')
    expect(komisyon?.tutar).toBe(120_000)
  })

  it('her kalem nasıl hesaplandığını açıklar', () => {
    const sonuc = alimMaliyetiHesapla({ fiyat: 5_000_000 }, parametreler())
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    for (const kalem of sonuc.veri.kalemler) {
      expect(kalem.aciklama.length).toBeGreaterThan(3)
    }
  })

  it('⚠️ zorunlu parametre eksikse HESAP YAPMAZ', () => {
    const eksik = parametreler()
    const sonuc = alimMaliyetiHesapla(
      { fiyat: 5_000_000 },
      { ...eksik, sayilar: { doner_sermaye_ucreti: 1000 } },
    )

    expect(sonuc.durum).toBe('parametre_eksik')
    if (sonuc.durum !== 'parametre_eksik') return
    expect(sonuc.eksikler[0]?.anahtar).toBe('tapu_harci_orani_alici')
    // Eksik parametre kullanıcıya ADIYLA bildirilir.
    expect(sonuc.eksikler[0]?.etiket).toMatch(/[Tt]apu harcı/)
  })

  it('isteğe bağlı parametre eksikse hesap yapılır, o satır gösterilmez', () => {
    const sonuc = alimMaliyetiHesapla(
      { fiyat: 5_000_000 },
      {
        sayilar: { tapu_harci_orani_alici: 0.02, doner_sermaye_ucreti: 1000 },
        dilimler: {},
        gecerlilikTarihi: null,
      },
    )

    expect(sonuc.durum).toBe('hesaplandi')
    if (sonuc.durum !== 'hesaplandi') return
    expect(sonuc.veri.kalemler.some((k) => k.anahtar === 'dask')).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('gelirVergisiHesapla — artan oranlı tarife', () => {
  const dilimler = parametreler().dilimler.gelir_vergisi_dilimleri!

  it('ilk dilimin içinde kalan matrahı tek oranla vergilendirir', () => {
    const sonuc = gelirVergisiHesapla(50_000, dilimler)
    expect(sonuc.toplamVergi).toBe(7_500) // 50.000 × %15
  })

  it('⚠️ dilimleri KÜMÜLATİF uygular — tamamına en yüksek oranı uygulamaz', () => {
    // 150.000 → ilk 100.000 %15 (15.000) + kalan 50.000 %20 (10.000) = 25.000
    // Yaygın yanlış: 150.000 × %20 = 30.000
    const sonuc = gelirVergisiHesapla(150_000, dilimler)

    expect(sonuc.toplamVergi).toBe(25_000)
    expect(sonuc.toplamVergi).not.toBe(30_000)
  })

  it('en üst dilimde (üst sınırı olmayan) doğru hesaplar', () => {
    // 100.000×.15 + 100.000×.20 + 300.000×.27 + 400.000×.35
    // = 15.000 + 20.000 + 81.000 + 140.000 = 256.000
    const sonuc = gelirVergisiHesapla(900_000, dilimler)
    expect(sonuc.toplamVergi).toBe(256_000)
  })

  it('etkin oran, en yüksek dilim oranından düşüktür', () => {
    const sonuc = gelirVergisiHesapla(900_000, dilimler)
    expect(sonuc.etkinOran).toBeLessThan(35)
    expect(sonuc.etkinOran).toBeGreaterThan(15)
  })

  it('dilimler karışık sırada verilse de doğru hesaplar', () => {
    const karisik = [
      { ustSinir: null, oran: 0.35 },
      { ustSinir: 200_000, oran: 0.2 },
      { ustSinir: 100_000, oran: 0.15 },
      { ustSinir: 500_000, oran: 0.27 },
    ]
    expect(gelirVergisiHesapla(150_000, karisik).toplamVergi).toBe(25_000)
  })

  it('sıfır veya negatif matrahta vergi yoktur', () => {
    expect(gelirVergisiHesapla(0, dilimler).toplamVergi).toBe(0)
    expect(gelirVergisiHesapla(-5000, dilimler).toplamVergi).toBe(0)
  })

  it('dilim tanımlı değilse vergi sıfırdır', () => {
    expect(gelirVergisiHesapla(500_000, []).toplamVergi).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('kiraGeliriVergisiHesapla', () => {
  it('istisnayı düşer ve götürü gideri uygular', () => {
    const sonuc = kiraGeliriVergisiHesapla({ yillikKiraGeliri: 300_000 }, parametreler())
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    expect(sonuc.veri.uygulananIstisna).toBe(100_000)
    expect(sonuc.veri.istisnaSonrasiHasilat).toBe(200_000)
    expect(sonuc.veri.dusulenGider).toBe(30_000) // 200.000 × %15
    expect(sonuc.veri.matrah).toBe(170_000)
  })

  it('istisna hasılattan büyükse tamamı istisna edilir, negatif oluşmaz', () => {
    const sonuc = kiraGeliriVergisiHesapla({ yillikKiraGeliri: 60_000 }, parametreler())
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    expect(sonuc.veri.uygulananIstisna).toBe(60_000)
    expect(sonuc.veri.matrah).toBe(0)
    expect(sonuc.veri.toplamVergi).toBe(0)
  })

  it('istisnadan yararlanılmıyorsa düşülmez', () => {
    const sonuc = kiraGeliriVergisiHesapla(
      { yillikKiraGeliri: 300_000, istisnadanYararlanir: false },
      parametreler(),
    )
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    expect(sonuc.veri.uygulananIstisna).toBe(0)
    expect(sonuc.veri.matrah).toBe(255_000) // 300.000 − %15
  })

  it('gerçek gider yöntemi belgelendirilen gideri kullanır', () => {
    const sonuc = kiraGeliriVergisiHesapla(
      { yillikKiraGeliri: 300_000, giderYontemi: 'gercek', gercekGider: 80_000 },
      parametreler(),
    )
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    expect(sonuc.veri.dusulenGider).toBe(80_000)
    expect(sonuc.veri.matrah).toBe(120_000)
  })

  it('gerçek gider hasılatı aşarsa matrah sıfırlanır, negatife düşmez', () => {
    const sonuc = kiraGeliriVergisiHesapla(
      { yillikKiraGeliri: 300_000, giderYontemi: 'gercek', gercekGider: 500_000 },
      parametreler(),
    )
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    expect(sonuc.veri.matrah).toBe(0)
  })

  it('gerçek gider seçilip tutar girilmemişse hesap yapmaz', () => {
    const sonuc = kiraGeliriVergisiHesapla(
      { yillikKiraGeliri: 300_000, giderYontemi: 'gercek' },
      parametreler(),
    )
    expect(sonuc.durum).toBe('girdi_eksik')
  })

  it('⚠️ parametre eksikse hesap yapmaz', () => {
    const sonuc = kiraGeliriVergisiHesapla(
      { yillikKiraGeliri: 300_000 },
      { sayilar: {}, dilimler: {}, gecerlilikTarihi: null },
    )

    expect(sonuc.durum).toBe('parametre_eksik')
    if (sonuc.durum !== 'parametre_eksik') return
    expect(sonuc.eksikler).toHaveLength(3)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('degerArtisVergisiHesapla', () => {
  it('⚠️ muafiyet süresi dolmuşsa vergi doğmaz', () => {
    const sonuc = degerArtisVergisiHesapla(
      {
        alisFiyati: 2_000_000,
        satisFiyati: 6_000_000,
        alisTarihi: '2019-01-01',
        satisTarihi: '2026-01-01',
      },
      parametreler(),
    )
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    expect(sonuc.veri.muafMi).toBe(true)
    expect(sonuc.veri.toplamVergi).toBe(0)
    expect(sonuc.veri.muafiyeteKalanGun).toBeNull()
  })

  it('muafiyet gününde satış muaftır (5 yıl tam dolmuş)', () => {
    const sonuc = degerArtisVergisiHesapla(
      {
        alisFiyati: 2_000_000,
        satisFiyati: 6_000_000,
        alisTarihi: '2021-03-15',
        satisTarihi: '2026-03-15',
      },
      parametreler(),
    )
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    expect(sonuc.veri.muafMi).toBe(true)
  })

  it('muafiyetten bir gün önce satış vergiye tabidir ve kalan gün bildirilir', () => {
    const sonuc = degerArtisVergisiHesapla(
      {
        alisFiyati: 2_000_000,
        satisFiyati: 6_000_000,
        alisTarihi: '2021-03-15',
        satisTarihi: '2026-03-14',
      },
      parametreler(),
    )
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    expect(sonuc.veri.muafMi).toBe(false)
    // Bu, hesaplayıcının en değerli çıktısı: "1 gün bekle, vergi ödeme".
    expect(sonuc.veri.muafiyeteKalanGun).toBe(1)
  })

  it('artık yılda 29 Şubat alışını doğru taşır', () => {
    // 29 Şubat 2024 + 5 yıl → 28 Şubat 2029 (2029 artık yıl değil)
    const sonuc = degerArtisVergisiHesapla(
      {
        alisFiyati: 1_000_000,
        satisFiyati: 2_000_000,
        alisTarihi: '2024-02-29',
        satisTarihi: '2029-02-28',
      },
      parametreler(),
    )
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    expect(sonuc.veri.muafMi).toBe(true)
  })

  it('Yİ-ÜFE endekslemesi alış bedelini yükseltir ve matrahı düşürür', () => {
    const endekssiz = degerArtisVergisiHesapla(
      {
        alisFiyati: 2_000_000,
        satisFiyati: 6_000_000,
        alisTarihi: '2024-01-01',
        satisTarihi: '2026-01-01',
      },
      parametreler(),
    )
    const endeksli = degerArtisVergisiHesapla(
      {
        alisFiyati: 2_000_000,
        satisFiyati: 6_000_000,
        alisTarihi: '2024-01-01',
        satisTarihi: '2026-01-01',
        alisUfe: 100,
        satisUfe: 200,
      },
      parametreler(),
    )

    if (endekssiz.durum !== 'hesaplandi' || endeksli.durum !== 'hesaplandi') {
      throw new Error('hesaplanmalıydı')
    }

    expect(endeksli.veri.endekslemeYapildi).toBe(true)
    expect(endeksli.veri.endekslenmisAlisFiyati).toBe(4_000_000)
    expect(endeksli.veri.matrah).toBeLessThan(endekssiz.veri.matrah)
  })

  it('istisna tutarını kazançtan düşer', () => {
    const sonuc = degerArtisVergisiHesapla(
      {
        alisFiyati: 2_000_000,
        satisFiyati: 3_000_000,
        alisTarihi: '2024-01-01',
        satisTarihi: '2026-01-01',
      },
      parametreler(),
    )
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    expect(sonuc.veri.brutKazanc).toBe(1_000_000)
    expect(sonuc.veri.uygulananIstisna).toBe(200_000)
    expect(sonuc.veri.matrah).toBe(800_000)
  })

  it('zarar edilmişse matrah negatife düşmez', () => {
    const sonuc = degerArtisVergisiHesapla(
      {
        alisFiyati: 5_000_000,
        satisFiyati: 4_000_000,
        alisTarihi: '2024-01-01',
        satisTarihi: '2026-01-01',
      },
      parametreler(),
    )
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    expect(sonuc.veri.brutKazanc).toBe(0)
    expect(sonuc.veri.toplamVergi).toBe(0)
  })

  it('satış tarihi alıştan önceyse hata bildirir', () => {
    const sonuc = degerArtisVergisiHesapla(
      {
        alisFiyati: 2_000_000,
        satisFiyati: 3_000_000,
        alisTarihi: '2026-01-01',
        satisTarihi: '2024-01-01',
      },
      parametreler(),
    )
    expect(sonuc.durum).toBe('girdi_eksik')
  })

  it('⚠️ parametre eksikse hesap yapmaz', () => {
    const sonuc = degerArtisVergisiHesapla(
      {
        alisFiyati: 2_000_000,
        satisFiyati: 3_000_000,
        alisTarihi: '2024-01-01',
        satisTarihi: '2026-01-01',
      },
      { sayilar: {}, dilimler: {}, gecerlilikTarihi: null },
    )
    expect(sonuc.durum).toBe('parametre_eksik')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('⚠️ parametre kontrolü girdi kontrolünden ÖNCE gelir', () => {
  /**
   * Sıra ters olsaydı kullanıcı önce bütün alanları doldurur, sonra "bu
   * hesaplayıcı çalışmıyor" duvarına çarpardı. Eksik parametre aracın
   * eksikliğidir, kullanıcının değil — ilk anda söylenmeli.
   */
  const bosParametre = { sayilar: {}, dilimler: {}, gecerlilikTarihi: null }

  it('alım maliyeti: girdi boşken bile parametre eksikliğini bildirir', () => {
    const sonuc = alimMaliyetiHesapla({}, bosParametre)
    expect(sonuc.durum).toBe('parametre_eksik')
  })

  it('kira geliri vergisi: girdi boşken bile parametre eksikliğini bildirir', () => {
    const sonuc = kiraGeliriVergisiHesapla({}, bosParametre)
    expect(sonuc.durum).toBe('parametre_eksik')
  })

  it('değer artış vergisi: girdi boşken bile parametre eksikliğini bildirir', () => {
    const sonuc = degerArtisVergisiHesapla({}, bosParametre)
    expect(sonuc.durum).toBe('parametre_eksik')
  })

  it('parametreler tamken boş girdi normal şekilde girdi eksikliği bildirir', () => {
    expect(alimMaliyetiHesapla({}, parametreler()).durum).toBe('girdi_eksik')
    expect(kiraGeliriVergisiHesapla({}, parametreler()).durum).toBe('girdi_eksik')
    expect(degerArtisVergisiHesapla({}, parametreler()).durum).toBe('girdi_eksik')
  })
})
