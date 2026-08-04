import { describe, expect, it } from 'vitest'

import {
  carpanYaz,
  degisimYaz,
  m2Yaz,
  paraKisaYaz,
  paraYaz,
  sayiYaz,
  whatsappBaglantisi,
  yilYaz,
  yuzdeYaz,
} from './bicimlendirme'

describe('paraYaz', () => {
  it('Türkçe binlik ayracıyla biçimlendirir', () => {
    expect(paraYaz(4_800_000)).toBe('4.800.000 ₺')
  })

  it('para birimi sembolünü değiştirir', () => {
    expect(paraYaz(250_000, 'USD')).toBe('250.000 $')
    expect(paraYaz(250_000, 'EUR')).toBe('250.000 €')
  })

  it('bilinmeyen para biriminde kodu kullanır', () => {
    expect(paraYaz(100, 'GBP')).toBe('100 GBP')
  })

  it('ondalıkları yuvarlar', () => {
    expect(paraYaz(4_800_000.7)).toBe('4.800.001 ₺')
  })
})

describe('paraKisaYaz', () => {
  it.each([
    [4_800_000, '4,8 M ₺'],
    [12_000_000, '12 M ₺'],
    [1_000_000, '1,0 M ₺'],
    [850_000, '850 B ₺'],
    [999, '999 ₺'],
  ])('%i → %s', (deger, beklenen) => {
    expect(paraKisaYaz(deger)).toBe(beklenen)
  })
})

describe('yuzdeYaz', () => {
  it('yüzde işaretini Türkçe kuralına göre öne koyar', () => {
    expect(yuzdeYaz(5.2)).toBe('%5,2')
  })

  it('ondalık basamak sayısı ayarlanabilir', () => {
    expect(yuzdeYaz(5.234, 2)).toBe('%5,23')
    expect(yuzdeYaz(5.234, 0)).toBe('%5')
  })
})

describe('degisimYaz', () => {
  it('artışa artı işareti koyar', () => {
    expect(degisimYaz(5.2)).toBe('+%5,2')
  })

  it('azalışta gerçek eksi işareti kullanır', () => {
    expect(degisimYaz(-3.1)).toBe('−%3,1')
  })

  it('sıfırda işaret koymaz', () => {
    expect(degisimYaz(0)).toBe('%0,0')
  })
})

describe('m2Yaz / yilYaz / carpanYaz / sayiYaz', () => {
  it('birimleri doğru ekler', () => {
    expect(m2Yaz(135)).toBe('135 m²')
    expect(yilYaz(17.42)).toBe('17,42 yıl')
    expect(carpanYaz(17.4)).toBe('17,4')
    expect(sayiYaz(12_500)).toBe('12.500')
  })

  it('tam sayı çarpanda gereksiz ondalık göstermez', () => {
    expect(carpanYaz(20)).toBe('20')
  })
})

describe('veri yoksa null döner — sıfır veya tire uydurulmaz', () => {
  const bicimlendiriciler = [
    paraYaz,
    paraKisaYaz,
    yuzdeYaz,
    degisimYaz,
    sayiYaz,
    m2Yaz,
    yilYaz,
    carpanYaz,
  ]

  it.each([null, undefined, Number.NaN, Number.POSITIVE_INFINITY])(
    'girdi %j için tüm biçimlendiriciler null döner',
    (girdi) => {
      for (const bicimlendir of bicimlendiriciler) {
        expect(bicimlendir(girdi as number | null | undefined)).toBeNull()
      }
    },
  )

  it('sıfır geçerli bir değerdir, null değildir', () => {
    expect(paraYaz(0)).toBe('0 ₺')
    expect(sayiYaz(0)).toBe('0')
  })
})

describe('whatsappBaglantisi', () => {
  it('geçerli numaradan bağlantı üretir', () => {
    expect(whatsappBaglantisi('905321234567')).toBe('https://wa.me/905321234567')
  })

  it('biçimlendirilmiş numaradaki işaretleri temizler', () => {
    expect(whatsappBaglantisi('+90 (532) 123 45 67')).toBe('https://wa.me/905321234567')
  })

  it('mesajı URL güvenli biçimde ekler', () => {
    const baglanti = whatsappBaglantisi('905321234567', 'Merhaba, ilgileniyorum')
    expect(baglanti).toContain('?text=')
    expect(baglanti).not.toContain(' ')
  })

  it.each([null, undefined, '', '123', 'numara yok'])(
    'geçersiz numarada (%j) null döner — buton gizlenir',
    (girdi) => {
      expect(whatsappBaglantisi(girdi)).toBeNull()
    },
  )
})
