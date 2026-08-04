import { describe, expect, it } from 'vitest'

import { bugununAnahtari, gunAnahtari, gunFarki, tarihiYaz } from './tarih'

describe('gunAnahtari', () => {
  it('Date nesnesini Türkiye saatindeki güne çevirir', () => {
    expect(gunAnahtari(new Date('2026-08-04T09:00:00Z'))).toBe('2026-08-04')
  })

  it('UTC gecesi Türkiye sabahıysa günü ileri alır', () => {
    // 21:30 UTC = ertesi gün 00:30 Türkiye.
    expect(gunAnahtari(new Date('2026-08-04T21:30:00Z'))).toBe('2026-08-05')
  })

  it('zaten gün anahtarı biçimindeki metni olduğu gibi bırakır', () => {
    // Bu değeri Date'e verip geri almak bir gün geri atardı.
    expect(gunAnahtari('2026-01-01')).toBe('2026-01-01')
  })

  it('ISO zaman damgasını ayrıştırır', () => {
    expect(gunAnahtari('2026-12-31T22:00:00.000Z')).toBe('2027-01-01')
  })

  it.each([null, undefined, '', 'yakında', 'AslihanTarafindanDoldurulacak'])(
    'geçersiz girdide (%j) null döner',
    (deger) => {
      expect(gunAnahtari(deger)).toBeNull()
    },
  )
})

describe('gunFarki', () => {
  it('aynı gün için sıfır döner', () => {
    expect(gunFarki('2026-08-04', '2026-08-04')).toBe(0)
  })

  it('ileri tarih için pozitif döner', () => {
    expect(gunFarki('2026-08-04', '2026-08-14')).toBe(10)
  })

  it('geri tarih için negatif döner', () => {
    expect(gunFarki('2026-08-14', '2026-08-04')).toBe(-10)
  })

  it('yaz saati geçişini içeren aralıkta tam gün sayar', () => {
    // Avrupa'da yaz saati geçişi olan hafta; Türkiye kalıcı UTC+3 olsa da
    // hesabın saat diliminden tamamen bağımsız olduğunu doğruluyoruz.
    expect(gunFarki('2026-03-25', '2026-04-01')).toBe(7)
  })

  it('artık yılı doğru sayar', () => {
    expect(gunFarki('2028-02-28', '2028-03-01')).toBe(2)
  })

  it('geçersiz anahtarda hata fırlatır', () => {
    expect(() => gunFarki('bugün', '2026-08-04')).toThrow(TypeError)
  })
})

describe('bugununAnahtari', () => {
  it('verilen anı Türkiye gününe çevirir', () => {
    expect(bugununAnahtari(new Date('2026-08-04T09:00:00Z'))).toBe('2026-08-04')
  })
})

describe('tarihiYaz', () => {
  it('Türkçe uzun tarih biçimi üretir', () => {
    expect(tarihiYaz('2026-08-04')).toBe('4 Ağustos 2026')
  })

  it('veri yoksa null döner — çağıran boş durum gösterebilsin', () => {
    expect(tarihiYaz(null)).toBeNull()
  })
})
