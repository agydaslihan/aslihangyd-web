import { describe, expect, it } from 'vitest'

import { BOS_PARAMETRE_KUMESI, type VergiParametreKumesi } from '@/lib/vergi/parametreler'

import { yatirimSimulasyonuYap, type YatirimSimulatoruGirdisi } from './yatirimSimulatoru'

/**
 * ⚠️ Buradaki rakamlar UYDURMADIR ve yalnızca hesap mantığını sınamak
 * içindir; gerçek Çorlu verisi veya gerçek vergi oranı değildir
 * (CLAUDE.md kural 2 ve 4).
 */
const VERGILI: VergiParametreKumesi = {
  sayilar: {
    kira_geliri_istisna_tutari: 100_000,
    goturu_gider_orani: 0.15,
  },
  dilimler: {
    gelir_vergisi_dilimleri: [
      { ustSinir: 200_000, oran: 0.15 },
      { ustSinir: null, oran: 0.35 },
    ],
  },
  gecerlilikTarihi: '2026-01-01',
}

function girdi(degisiklik: Partial<YatirimSimulatoruGirdisi> = {}): YatirimSimulatoruGirdisi {
  return {
    konutFiyati: 4_000_000,
    pesinat: 1_200_000,
    aylikFaizYuzdesi: 2.4,
    vadeAy: 120,
    aylikKira: 18_000,
    sureYil: 10,
    yillikKiraArtisiYuzdesi: 25,
    yillikDegerArtisiYuzdesi: 25,
    ...degisiklik,
  }
}

function hesapla(
  degisiklik: Partial<YatirimSimulatoruGirdisi> = {},
  parametreler: VergiParametreKumesi = BOS_PARAMETRE_KUMESI,
) {
  const sonuc = yatirimSimulasyonuYap(girdi(degisiklik), parametreler)
  if (sonuc.durum !== 'hesaplandi') {
    throw new Error(`Hesaplanamadı: ${sonuc.durum} — ${JSON.stringify(sonuc.eksikler)}`)
  }
  return sonuc.veri
}

// ═══════════════════════════════════════════════════════════════════════════
describe('yatirimSimulasyonuYap — girdi doğrulama', () => {
  it('büyüme varsayımları girilmeden hesap yapmaz', () => {
    const sonuc = yatirimSimulasyonuYap(
      { konutFiyati: 4_000_000, pesinat: 1_200_000, aylikKira: 18_000, sureYil: 10 },
      BOS_PARAMETRE_KUMESI,
    )

    expect(sonuc.durum).toBe('girdi_eksik')
    if (sonuc.durum !== 'girdi_eksik') return

    const anahtarlar = sonuc.eksikler.map((e) => e.anahtar)
    expect(anahtarlar).toContain('yillikKiraArtisiYuzdesi')
    expect(anahtarlar).toContain('yillikDegerArtisiYuzdesi')
  })

  it('peşinat fiyattan büyükse hata döner', () => {
    const sonuc = yatirimSimulasyonuYap(girdi({ pesinat: 5_000_000 }), BOS_PARAMETRE_KUMESI)
    expect(sonuc.durum).toBe('girdi_eksik')
  })

  it('kredi varsa faiz ve vade zorunludur', () => {
    const sonuc = yatirimSimulasyonuYap(
      girdi({ aylikFaizYuzdesi: null, vadeAy: null }),
      BOS_PARAMETRE_KUMESI,
    )

    expect(sonuc.durum).toBe('girdi_eksik')
    if (sonuc.durum !== 'girdi_eksik') return
    expect(sonuc.eksikler.map((e) => e.anahtar)).toEqual(['aylikFaizYuzdesi', 'vadeAy'])
  })

  it('boşluk ayı 0–12 aralığına kısılır', () => {
    const veri = hesapla({ yillikBoslukAyi: 20, aylikKira: 10_000 })
    // 12 ay boşsa kira geliri sıfır olur.
    expect(veri.yillar[0]?.kiraGeliri).toBe(0)
  })

  it('süre 30 yılla sınırlanır', () => {
    expect(hesapla({ sureYil: 45 }).yillar).toHaveLength(30)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('yatirimSimulasyonuYap — nakit akışı', () => {
  it('boşluk beklentisi kira gelirinden düşülür', () => {
    const tam = hesapla({ aylikKira: 10_000 })
    const bosluklu = hesapla({ aylikKira: 10_000, yillikBoslukAyi: 1 })

    expect(tam.yillar[0]?.kiraGeliri).toBe(120_000)
    expect(bosluklu.yillar[0]?.kiraGeliri).toBe(110_000)
  })

  it('kredi ödemesi nakit akışından düşülür, faiz ayrıca gösterilir', () => {
    const veri = hesapla()
    const ilk = veri.yillar[0]

    expect(ilk?.krediOdemesi).toBeGreaterThan(0)
    expect(ilk?.odenenFaiz).toBeGreaterThan(0)
    // İlk yılda anaparanın küçük bir kısmı ödenir; faiz baskındır.
    expect(ilk?.odenenFaiz).toBeGreaterThan((ilk?.krediOdemesi ?? 0) / 2)
  })

  it('vade bitince kredi ödemesi durur ve nakit akışı sıçrar', () => {
    const veri = hesapla({ vadeAy: 60, sureYil: 10 })

    expect(veri.yillar[4]?.krediOdemesi).toBeGreaterThan(0)
    expect(veri.yillar[5]?.krediOdemesi).toBe(0)
    expect(veri.yillar[5]?.netNakitAkisi).toBeGreaterThan(veri.yillar[4]?.netNakitAkisi ?? 0)
  })

  it('kümülatif nakit akışı, yıllık akışların toplamıdır', () => {
    const veri = hesapla({ sureYil: 5 })
    const toplam = veri.yillar.reduce((t, y) => t + y.netNakitAkisi, 0)

    expect(veri.son.kumulatifNakitAkisi).toBeCloseTo(toplam, 0)
  })

  it('giderler girilen oranda artar', () => {
    const veri = hesapla({ yillikIsletmeGideri: 20_000, yillikGiderArtisiYuzdesi: 10, sureYil: 3 })

    expect(veri.yillar[0]?.isletmeGideri).toBe(20_000)
    expect(veri.yillar[2]?.isletmeGideri).toBeCloseTo(20_000 * 1.1 ** 2, 0)
  })

  it('nakit başabaş yılı, akışın ilk pozitife döndüğü yıldır', () => {
    const veri = hesapla()

    if (veri.nakitBasabasYili === null) {
      expect(veri.yillar.every((y) => y.netNakitAkisi <= 0)).toBe(true)
      return
    }
    const oncesi = veri.yillar.filter((y) => y.yil < (veri.nakitBasabasYili as number))
    expect(oncesi.every((y) => y.netNakitAkisi <= 0)).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('yatirimSimulasyonuYap — öz sermaye ve varlık', () => {
  it('öz sermaye, konut değeri eksi kalan borçtur', () => {
    const veri = hesapla()

    for (const yil of veri.yillar) {
      expect(yil.ozSermaye).toBeCloseTo(yil.konutDegeri - yil.kalanBorc, 0)
    }
  })

  it('vade sonunda borç kapanır', () => {
    expect(hesapla({ vadeAy: 120, sureYil: 10 }).son.kalanBorc).toBe(0)
  })

  it('satış masrafı net satış gelirinden düşülür', () => {
    const masrafsiz = hesapla()
    const masrafli = hesapla({ satisMasrafiYuzdesi: 4 })

    expect(masrafsiz.netSatisGeliri - masrafli.netSatisGeliri).toBeCloseTo(
      masrafsiz.son.konutDegeri * 0.04,
      0,
    )
  })

  it('son net varlık = net satış geliri + biriken nakit', () => {
    const veri = hesapla()
    expect(veri.sonNetVarlik).toBeCloseTo(veri.netSatisGeliri + veri.son.kumulatifNakitAkisi, 0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('yatirimSimulasyonuYap — getiri ölçüleri', () => {
  /**
   * IRR'nin tanımı: bu oranla iskonto edildiğinde nakit akışlarının bugünkü
   * değeri sıfır olur. Test tanımı doğrudan sınıyor — motorun kendi
   * hesabını tekrar etmiyor.
   */
  it('IRR, nakit akışlarının net bugünkü değerini sıfırlar', () => {
    const veri = hesapla({ sureYil: 10, alimMasraflari: 150_000 })
    expect(veri.ircOrani).not.toBeNull()

    const oran = (veri.ircOrani as number) / 100
    const akislar = [-veri.baslangicYatirimi, ...veri.yillar.map((y) => y.netNakitAkisi)]
    akislar[akislar.length - 1] = (akislar[akislar.length - 1] ?? 0) + veri.netSatisGeliri

    const npv = akislar.reduce((toplam, akis, t) => toplam + akis / (1 + oran) ** t, 0)

    // Oran %0,1 hassasiyetle yuvarlandığı için tam sıfır beklenmiyor;
    // başlangıç yatırımının %1'inden küçük olmalı.
    expect(Math.abs(npv)).toBeLessThan(veri.baslangicYatirimi * 0.01)
  })

  it('reel getiri Fisher denklemiyle hesaplanır, çıkarmayla değil', () => {
    const veri = hesapla({ yillikEnflasyonYuzdesi: 30 })

    expect(veri.reelIrcOrani).not.toBeNull()
    const nominal = (veri.ircOrani as number) / 100
    const beklenen = ((1 + nominal) / 1.3 - 1) * 100

    expect(veri.reelIrcOrani).toBeCloseTo(Math.round(beklenen * 10) / 10, 1)
    // Basit çıkarma ile arasında anlamlı fark olmalı — testin varlık sebebi bu.
    expect(veri.reelIrcOrani).not.toBeCloseTo((veri.ircOrani as number) - 30, 1)
  })

  it('enflasyon girilmezse reel getiri gösterilmez — sıfır varsayılmaz', () => {
    const veri = hesapla()
    expect(veri.reelIrcOrani).toBeNull()
    expect(veri.bugunkuParaylaNetVarlik).toBeNull()
  })

  it('getiri katı, son varlığın başlangıç yatırımına oranıdır', () => {
    const veri = hesapla({ alimMasraflari: 150_000 })
    expect(veri.baslangicYatirimi).toBe(1_350_000)
    expect(veri.getiriKati).toBeCloseTo(veri.sonNetVarlik / 1_350_000, 2)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('yatirimSimulasyonuYap — vergi', () => {
  it('vergi parametreleri yoksa hesap durmaz, vergisiz devam eder ve söyler', () => {
    const veri = hesapla({}, BOS_PARAMETRE_KUMESI)

    expect(veri.vergiHesaplandi).toBe(false)
    expect(veri.yillar[0]?.vergi).toBeNull()
    expect(veri.uyarilar.some((u) => u.includes('vergi öncesidir'))).toBe(true)
  })

  it('parametreler varsa vergi hesaplanır ve nakit akışını düşürür', () => {
    const vergisiz = hesapla({}, BOS_PARAMETRE_KUMESI)
    const vergili = hesapla({}, VERGILI)

    expect(vergili.vergiHesaplandi).toBe(true)
    expect(vergili.yillar[0]?.vergi).toBeGreaterThan(0)
    expect(vergili.son.kumulatifNakitAkisi).toBeLessThan(vergisiz.son.kumulatifNakitAkisi)
  })

  /**
   * Dilim kayması: bugünün dilimlerini 10 yıl sonrasının nominal kirasına
   * uygulamak vergiyi sistematik olarak şişirir. Enflasyon girildiğinde
   * kira bugünkü paraya indirgenip vergi öyle hesaplanıyor.
   */
  it('enflasyon girilince dilim kayması düzeltilir ve vergi düşer', () => {
    const duzeltmesiz = hesapla({ sureYil: 10 }, VERGILI)
    const duzeltmeli = hesapla({ sureYil: 10, yillikEnflasyonYuzdesi: 25 }, VERGILI)

    const sonVergisiz = duzeltmesiz.son.vergi as number
    const sonVergili = duzeltmeli.son.vergi as number

    expect(sonVergili).toBeLessThan(sonVergisiz)
  })

  it('enflasyon girilmezse dilim kayması uyarısı verilir', () => {
    const veri = hesapla({}, VERGILI)
    expect(veri.uyarilar.some((u) => u.includes('dilim'))).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('yatirimSimulasyonuYap — şeffaflık', () => {
  it('girilmeyen gider ve boşluk kalemleri için uyarı üretir', () => {
    const veri = hesapla()

    expect(veri.uyarilar.some((u) => u.includes('Alım masrafları'))).toBe(true)
    expect(veri.uyarilar.some((u) => u.includes('İşletme gideri'))).toBe(true)
    expect(veri.uyarilar.some((u) => u.includes('Boş kalma'))).toBe(true)
    expect(veri.uyarilar.some((u) => u.includes('Gider artışı'))).toBe(true)
  })

  it('kalemler girilince o uyarılar kalkar', () => {
    const veri = hesapla({
      alimMasraflari: 150_000,
      yillikIsletmeGideri: 24_000,
      yillikBoslukAyi: 1,
      yillikGiderArtisiYuzdesi: 20,
      satisMasrafiYuzdesi: 3,
    })

    expect(veri.uyarilar.some((u) => u.includes('Alım masrafları'))).toBe(false)
    expect(veri.uyarilar.some((u) => u.includes('İşletme gideri'))).toBe(false)
    expect(veri.uyarilar.some((u) => u.includes('Boş kalma'))).toBe(false)
    expect(veri.uyarilar.some((u) => u.includes('Gider artışı'))).toBe(false)
  })

  it('gerçek gider yönteminde mali müşavir uyarısı eklenir', () => {
    const veri = hesapla({ giderYontemi: 'gercek', yillikIsletmeGideri: 24_000 }, VERGILI)
    expect(veri.uyarilar.some((u) => u.includes('mali müşavirinize'))).toBe(true)
  })
})
