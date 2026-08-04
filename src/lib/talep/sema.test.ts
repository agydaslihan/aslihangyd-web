import { describe, expect, it } from 'vitest'

import { hatalariCoz, talepSemasi } from './sema'

function gecerliTalep(degisiklik: Record<string, unknown> = {}) {
  return {
    adSoyad: 'Deneme Kişi',
    telefon: '0532 123 45 67',
    eposta: '',
    tip: 'genel',
    mesaj: 'Merhaba',
    kvkkOnay: true,
    ...degisiklik,
  }
}

function hatalar(girdi: Record<string, unknown>) {
  const sonuc = talepSemasi.safeParse(girdi)
  return sonuc.success ? {} : hatalariCoz(sonuc.error)
}

describe('talepSemasi — geçerli girdiler', () => {
  it('telefonla gönderilen talebi kabul eder', () => {
    expect(talepSemasi.safeParse(gecerliTalep()).success).toBe(true)
  })

  it('e-postayla gönderilen talebi kabul eder', () => {
    const sonuc = talepSemasi.safeParse(gecerliTalep({ telefon: '', eposta: 'ad@ornek.com' }))
    expect(sonuc.success).toBe(true)
  })

  it.each([
    '0532 123 45 67',
    '05321234567',
    '+90 532 123 45 67',
    '+905321234567',
    '(532) 123 45 67',
    '532 123 45 67',
  ])('yaygın telefon yazımını kabul eder: %s', (telefon) => {
    expect(talepSemasi.safeParse(gecerliTalep({ telefon })).success).toBe(true)
  })

  it('baştaki ve sondaki boşlukları kırpar', () => {
    const sonuc = talepSemasi.safeParse(gecerliTalep({ adSoyad: '  Deneme Kişi  ' }))
    expect(sonuc.success && sonuc.data.adSoyad).toBe('Deneme Kişi')
  })
})

describe('talepSemasi — KVKK', () => {
  it('onay verilmeden talep kabul edilmez', () => {
    expect(hatalar(gecerliTalep({ kvkkOnay: false }))).toHaveProperty('kvkkOnay')
  })

  it('onay hatası çözüm önerir', () => {
    expect(hatalar(gecerliTalep({ kvkkOnay: false })).kvkkOnay).toMatch(/onayla/i)
  })

  it('pazarlama onayı ayrıdır ve varsayılanı kapalıdır', () => {
    const sonuc = talepSemasi.safeParse(gecerliTalep())
    expect(sonuc.success && sonuc.data.pazarlamaOnayi).toBe(false)
  })
})

describe('talepSemasi — iletişim bilgisi zorunluluğu', () => {
  it('telefon ve e-posta ikisi de boşsa reddeder', () => {
    const sonuc = hatalar(gecerliTalep({ telefon: '', eposta: '' }))
    expect(sonuc.telefon).toMatch(/telefon veya e-posta/i)
  })

  it('geçersiz telefonu reddeder', () => {
    expect(hatalar(gecerliTalep({ telefon: '123' }))).toHaveProperty('telefon')
  })

  it('geçersiz e-postayı reddeder', () => {
    const sonuc = hatalar(gecerliTalep({ telefon: '', eposta: 'ad@' }))
    expect(sonuc.eposta).toMatch(/e-posta/i)
  })
})

describe('talepSemasi — sınırlar', () => {
  it('çok kısa adı reddeder', () => {
    expect(hatalar(gecerliTalep({ adSoyad: 'A' }))).toHaveProperty('adSoyad')
  })

  it('çok uzun mesajı reddeder', () => {
    expect(hatalar(gecerliTalep({ mesaj: 'a'.repeat(2001) }))).toHaveProperty('mesaj')
  })

  it('tanınmayan talep tipini reddeder', () => {
    expect(hatalar(gecerliTalep({ tip: 'bilinmeyen' }))).toHaveProperty('tip')
  })
})

describe('hatalariCoz', () => {
  it('alan başına tek mesaj döner', () => {
    const sonuc = talepSemasi.safeParse({ tip: 'genel' })
    const cozulen = sonuc.success ? {} : hatalariCoz(sonuc.error)

    for (const mesaj of Object.values(cozulen)) {
      expect(typeof mesaj).toBe('string')
      expect(mesaj.length).toBeGreaterThan(5)
    }
  })

  it('tüm hata mesajları Türkçe ve insanidir', () => {
    const sonuc = talepSemasi.safeParse({})
    const cozulen = sonuc.success ? {} : hatalariCoz(sonuc.error)

    // Zod'un varsayılan İngilizce mesajları sızmamalı.
    for (const mesaj of Object.values(cozulen)) {
      expect(mesaj).not.toMatch(/required|invalid|expected/i)
    }
  })
})
