import { describe, expect, it } from 'vitest'

import {
  ASGARI_KAPSAM,
  arzBaskisiPuani,
  donatiPuani,
  fiyatTrendiPuani,
  kiraCarpaniPuani,
  mesafePuani,
  SKOR_AGIRLIKLARI,
  yatirimSkoruHesapla,
  type SkorGirdisi,
} from './yatirimSkoru'

function girdi(degisiklik: SkorGirdisi = {}): SkorGirdisi {
  return {
    fiyatTrendi: 70,
    kiraCarpani: 60,
    sanayiYakinligi: 80,
    ulasim: 50,
    sosyalDonati: 65,
    arzBaskisi: 40,
    ...degisiklik,
  }
}

describe('yatirimSkoruHesapla — ağırlıklandırma', () => {
  it('CLAUDE.md ağırlıkları toplamı 100 eder', () => {
    const toplam = Object.values(SKOR_AGIRLIKLARI).reduce((t, a) => t + a, 0)
    expect(toplam).toBe(100)
  })

  it('tüm bileşenler 100 ise skor 100 olur', () => {
    const sonuc = yatirimSkoruHesapla({
      fiyatTrendi: 100,
      kiraCarpani: 100,
      sanayiYakinligi: 100,
      ulasim: 100,
      sosyalDonati: 100,
      arzBaskisi: 100,
    })

    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')
    expect(sonuc.veri.toplam).toBe(100)
  })

  it('ağırlıklı ortalamayı doğru hesaplar', () => {
    const sonuc = yatirimSkoruHesapla(girdi())
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    // 70×25 + 60×20 + 80×15 + 50×15 + 65×15 + 40×10
    // = 1750 + 1200 + 1200 + 750 + 975 + 400 = 6275 → /100 = 62,75 → 63
    expect(sonuc.veri.toplam).toBe(63)
  })

  it('en ağır bileşen skoru en çok etkiler', () => {
    const fiyatYuksek = yatirimSkoruHesapla(girdi({ fiyatTrendi: 100 }))
    const arzYuksek = yatirimSkoruHesapla(girdi({ arzBaskisi: 100 }))

    if (fiyatYuksek.durum !== 'hesaplandi' || arzYuksek.durum !== 'hesaplandi') {
      throw new Error('hesaplanmalıydı')
    }

    expect(fiyatYuksek.veri.toplam).toBeGreaterThan(arzYuksek.veri.toplam)
  })

  it('ham puan 0-100 dışına taşarsa kırpılır', () => {
    const sonuc = yatirimSkoruHesapla(girdi({ fiyatTrendi: 250 }))
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    const fiyat = sonuc.veri.bilesenler.find((b) => b.ad === 'fiyatTrendi')
    expect(fiyat?.hamPuan).toBe(100)
  })
})

describe('⚠️ yatirimSkoruHesapla — yetersiz veriyle skor üretilmez', () => {
  it(`kapsam %${ASGARI_KAPSAM * 100} altındaysa SKOR VERİLMEZ`, () => {
    // Yalnızca fiyat trendi (%25) var → kapsam %25
    const sonuc = yatirimSkoruHesapla({ fiyatTrendi: 90 })

    expect(sonuc.durum).toBe('yetersiz_veri')
    if (sonuc.durum !== 'yetersiz_veri') return
    expect(sonuc.kapsam).toBeCloseTo(0.25, 2)
  })

  it('en ağır iki bileşen tek başına yetmez', () => {
    // fiyatTrendi (25) + kiraCarpani (20) = %45
    const sonuc = yatirimSkoruHesapla({ fiyatTrendi: 90, kiraCarpani: 90 })
    expect(sonuc.durum).toBe('yetersiz_veri')
  })

  it('kapsam eşiği tam sağlanınca skor üretilir', () => {
    // 25 + 20 + 15 + 15 = %75 ≥ %70
    const sonuc = yatirimSkoruHesapla({
      fiyatTrendi: 80,
      kiraCarpani: 80,
      sanayiYakinligi: 80,
      ulasim: 80,
    })
    expect(sonuc.durum).toBe('hesaplandi')
  })

  it('eksik bileşenler adıyla bildirilir', () => {
    const sonuc = yatirimSkoruHesapla({ fiyatTrendi: 90 })
    if (sonuc.durum !== 'yetersiz_veri') throw new Error('yetersiz olmalıydı')

    expect(sonuc.eksikBilesenler).toContain('Kira çarpanı')
    expect(sonuc.eksikBilesenler).toHaveLength(5)
  })

  it('⚠️ eksik bileşen SIFIR sayılmaz — mahalle haksız cezalandırılmaz', () => {
    const tamVeri = yatirimSkoruHesapla({
      fiyatTrendi: 80,
      kiraCarpani: 80,
      sanayiYakinligi: 80,
      ulasim: 80,
      sosyalDonati: 80,
      arzBaskisi: 80,
    })
    const eksikVeri = yatirimSkoruHesapla({
      fiyatTrendi: 80,
      kiraCarpani: 80,
      sanayiYakinligi: 80,
      ulasim: 80,
    })

    if (tamVeri.durum !== 'hesaplandi' || eksikVeri.durum !== 'hesaplandi') {
      throw new Error('hesaplanmalıydı')
    }

    // Eksik bileşenler sıfır sayılsaydı skor 60'a düşerdi.
    expect(eksikVeri.veri.toplam).toBe(tamVeri.veri.toplam)
  })

  it('kapsam bilgisi kullanıcıya döner — şeffaflık', () => {
    const sonuc = yatirimSkoruHesapla({
      fiyatTrendi: 80,
      kiraCarpani: 80,
      sanayiYakinligi: 80,
      ulasim: 80,
    })
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    expect(sonuc.veri.kapsam).toBeCloseTo(0.75, 2)
    expect(sonuc.veri.eksikBilesenler).toHaveLength(2)
  })
})

describe('yatirimSkoruHesapla — kırılım her zaman gösterilir', () => {
  it('altı bileşenin hepsi raporlanır (verisi olmayanlar dahil)', () => {
    const sonuc = yatirimSkoruHesapla(girdi({ arzBaskisi: null }))
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    expect(sonuc.veri.bilesenler).toHaveLength(6)
    const arz = sonuc.veri.bilesenler.find((b) => b.ad === 'arzBaskisi')
    expect(arz?.hamPuan).toBeNull()
  })

  it('her bileşen etiketini ve açıklamasını taşır — kara kutu yok', () => {
    const sonuc = yatirimSkoruHesapla(girdi())
    if (sonuc.durum !== 'hesaplandi') throw new Error('hesaplanmalıydı')

    for (const bilesen of sonuc.veri.bilesenler) {
      expect(bilesen.etiket.length).toBeGreaterThan(3)
      expect(bilesen.aciklama.length).toBeGreaterThan(10)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('fiyatTrendiPuani', () => {
  it('⚠️ göreli ölçer — bölge ortalamasıyla aynıysa 50 puan', () => {
    // Yüksek enflasyonda her mahalle "yükselmiş" görünür; mutlak değişim
    // ölçmek her mahalleye yüksek puan verirdi.
    expect(fiyatTrendiPuani(45, 45)).toBe(50)
  })

  it('bölge ortalamasının üstünde performans yüksek puan alır', () => {
    expect(fiyatTrendiPuani(55, 45)).toBe(75)
  })

  it('bölge ortalamasının altında performans düşük puan alır', () => {
    expect(fiyatTrendiPuani(35, 45)).toBe(25)
  })

  it.each([
    [null, 45],
    [45, null],
    [Number.NaN, 45],
  ])('veri eksikse (%j, %j) null döner', (mahalle, bolge) => {
    expect(fiyatTrendiPuani(mahalle, bolge)).toBeNull()
  })
})

describe('kiraCarpaniPuani', () => {
  it('⚠️ ters yönlü — düşük çarpan yüksek puan alır', () => {
    const iyi = kiraCarpaniPuani(12)
    const kotu = kiraCarpaniPuani(30)

    expect(iyi).toBe(100)
    expect(kotu).toBe(0)
  })

  it('aradaki değerleri doğrusal ölçekler', () => {
    expect(kiraCarpaniPuani(21)).toBe(50)
  })

  it('sınırların dışında kırpılır', () => {
    expect(kiraCarpaniPuani(8)).toBe(100)
    expect(kiraCarpaniPuani(50)).toBe(0)
  })

  it.each([null, 0, -5, Number.NaN])('geçersiz çarpanda (%j) null döner', (carpan) => {
    expect(kiraCarpaniPuani(carpan)).toBeNull()
  })
})

describe('mesafePuani', () => {
  it('ideal mesafe içinde tam puan', () => {
    expect(mesafePuani(500, 1000, 5000)).toBe(100)
  })

  it('azami mesafe dışında sıfır', () => {
    expect(mesafePuani(8000, 1000, 5000)).toBe(0)
  })

  it('arada doğrusal azalır', () => {
    expect(mesafePuani(3000, 1000, 5000)).toBe(50)
  })

  it('mesafe bilinmiyorsa null döner', () => {
    expect(mesafePuani(null, 1000, 5000)).toBeNull()
  })
})

describe('donatiPuani', () => {
  it('doygunluk sayısında tam puan', () => {
    expect(donatiPuani(15, 15)).toBe(100)
  })

  it('doygunluğun üstünde de 100 — 30 market, 10 markete üstünlük sağlamaz', () => {
    expect(donatiPuani(40, 15)).toBe(100)
  })

  it('yarısında yarı puan', () => {
    expect(donatiPuani(7, 14)).toBe(50)
  })

  it('hiç donatı yoksa 0 puan (veri yok değil — gerçek sıfır)', () => {
    expect(donatiPuani(0)).toBe(0)
  })

  it('sayı bilinmiyorsa null döner', () => {
    expect(donatiPuani(null)).toBeNull()
  })
})

describe('arzBaskisiPuani', () => {
  it('⚠️ ters yönlü — çok yeni arz düşük puan alır', () => {
    // Stokun %20'si yeni arz → 0 puan
    expect(arzBaskisiPuani(200, 1000)).toBe(0)
  })

  it('yeni arz yoksa tam puan', () => {
    expect(arzBaskisiPuani(0, 1000)).toBe(100)
  })

  it("stokun %10'u yeni arz → 50 puan", () => {
    expect(arzBaskisiPuani(100, 1000)).toBe(50)
  })

  it('aşırı arzda sıfırda kırpılır', () => {
    expect(arzBaskisiPuani(900, 1000)).toBe(0)
  })

  it.each([
    [null, 1000],
    [100, null],
    [100, 0],
  ])('veri eksikse (%j, %j) null döner', (proje, stok) => {
    expect(arzBaskisiPuani(proje, stok)).toBeNull()
  })
})
