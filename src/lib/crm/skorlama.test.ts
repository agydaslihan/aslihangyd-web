import { describe, expect, it } from 'vitest'

import { talepSkorla, type SkorGirdisi } from './skorlama'

function girdi(degisiklik: Partial<SkorGirdisi> = {}): SkorGirdisi {
  return {
    telefon: '05321234567',
    eposta: 'ad@ornek.com',
    mesaj: 'Muhittin Mahallesi civarında 3+1 bir daire arıyorum, bütçem esnek.',
    tip: 'alici',
    butceMin: 3_000_000,
    butceMax: 5_000_000,
    ilgiliIlanVar: false,
    ilgiliMahalleVar: true,
    ...degisiklik,
  }
}

describe('talepSkorla — sıralama mantığı', () => {
  it('skoru 0–100 aralığında tutar', () => {
    const enIyi = talepSkorla(girdi({ tip: 'satici', ilgiliIlanVar: true, mesaj: 'a'.repeat(300) }))
    const enKotu = talepSkorla({})

    expect(enIyi.toplam).toBeLessThanOrEqual(100)
    expect(enKotu.toplam).toBeGreaterThanOrEqual(0)
  })

  it('boş talepte skor sıfıra yakındır ama negatif değildir', () => {
    const sonuc = talepSkorla({})
    expect(sonuc.toplam).toBeGreaterThanOrEqual(0)
    expect(sonuc.seviye).toBe('dusuk')
  })

  it('telefon bırakmak en ağırlıklı bileşendir', () => {
    const telefonlu = talepSkorla(girdi({ eposta: null }))
    const epostali = talepSkorla(girdi({ telefon: null }))

    expect(telefonlu.toplam).toBeGreaterThan(epostali.toplam)
  })

  it('ayrıntılı mesaj kısa mesajdan yüksek puan alır', () => {
    const ayrintili = talepSkorla(girdi({ mesaj: 'a'.repeat(200) }))
    const kisa = talepSkorla(girdi({ mesaj: 'merhaba' }))
    const bos = talepSkorla(girdi({ mesaj: '' }))

    expect(ayrintili.toplam).toBeGreaterThan(kisa.toplam)
    expect(kisa.toplam).toBeGreaterThan(bos.toplam)
  })

  it('bütçe belirtmek puan getirir', () => {
    const butceli = talepSkorla(girdi())
    const butcesiz = talepSkorla(girdi({ butceMin: null, butceMax: null }))

    expect(butceli.toplam).toBeGreaterThan(butcesiz.toplam)
  })

  it('belirli bir ilana yazmak, mahalleye yazmaktan yüksek puan alır', () => {
    const ilan = talepSkorla(girdi({ ilgiliIlanVar: true, ilgiliMahalleVar: false }))
    const mahalle = talepSkorla(girdi({ ilgiliIlanVar: false, ilgiliMahalleVar: true }))
    const genel = talepSkorla(girdi({ ilgiliIlanVar: false, ilgiliMahalleVar: false }))

    expect(ilan.toplam).toBeGreaterThan(mahalle.toplam)
    expect(mahalle.toplam).toBeGreaterThan(genel.toplam)
  })
})

describe('⚠️ talepSkorla — portföy en kıt kaynaktır', () => {
  it('satıcı talebi, alıcı talebinden yüksek skorlanır', () => {
    const satici = talepSkorla(girdi({ tip: 'satici' }))
    const alici = talepSkorla(girdi({ tip: 'alici' }))

    expect(satici.toplam).toBeGreaterThan(alici.toplam)
  })

  it('değerleme talebi de portföy getirme potansiyeli taşır', () => {
    const degerleme = talepSkorla(girdi({ tip: 'degerleme' }))
    const kiraci = talepSkorla(girdi({ tip: 'kiraci' }))

    expect(degerleme.toplam).toBeGreaterThan(kiraci.toplam)
  })

  it('tanınmayan talep tipi genel gibi puanlanır, hata vermez', () => {
    const sonuc = talepSkorla(girdi({ tip: 'bilinmeyen-tip' }))
    expect(sonuc.toplam).toBeGreaterThan(0)
  })
})

describe('talepSkorla — şeffaflık', () => {
  it('her bileşen kendi puanını ve gerekçesini bildirir', () => {
    const sonuc = talepSkorla(girdi())

    for (const bilesen of sonuc.bilesenler) {
      expect(bilesen.puan).toBeLessThanOrEqual(bilesen.azamiPuan)
      expect(bilesen.puan).toBeGreaterThanOrEqual(0)
      expect(bilesen.aciklama.length).toBeGreaterThan(5)
    }
  })

  it('bileşen puanlarının toplamı toplam skora eşittir', () => {
    const sonuc = talepSkorla(girdi())
    const toplam = sonuc.bilesenler.reduce((t, b) => t + b.puan, 0)

    expect(sonuc.toplam).toBe(Math.min(toplam, 100))
  })

  it('azami puanların toplamı 100 eder — ölçek tutarlı', () => {
    const sonuc = talepSkorla(girdi())
    const azami = sonuc.bilesenler.reduce((t, b) => t + b.azamiPuan, 0)

    expect(azami).toBe(100)
  })
})

describe('talepSkorla — seviye eşikleri', () => {
  it('tam donanımlı satıcı talebi yüksek seviyededir', () => {
    const sonuc = talepSkorla(girdi({ tip: 'satici', ilgiliIlanVar: true, mesaj: 'a'.repeat(200) }))
    expect(sonuc.seviye).toBe('yuksek')
  })

  it('yalnızca e-posta bırakılmış genel talep düşük seviyededir', () => {
    const sonuc = talepSkorla({ eposta: 'a@b.com', tip: 'genel' })
    expect(sonuc.seviye).toBe('dusuk')
  })
})
