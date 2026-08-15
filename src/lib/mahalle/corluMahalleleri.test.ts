import { describe, expect, it } from 'vitest'

import {
  CORLU_MAHALLELERI,
  mahalleSlugu,
  yerlesimTuruEtiketi,
  YERLESIM_TURU_SECENEKLERI,
} from './corluMahalleleri'

describe('Çorlu mahalle listesi', () => {
  it('Velimeşe listede YOK — Ergene ilçesine bağlı', () => {
    const adlar = CORLU_MAHALLELERI.map((mahalle) => mahalle.ad)
    expect(adlar).not.toContain('Velimeşe')
    expect(adlar.map(mahalleSlugu)).not.toContain('velimese')
  })

  it('aynı mahalle iki kez geçmez', () => {
    const sluglar = CORLU_MAHALLELERI.map((mahalle) => mahalleSlugu(mahalle.ad))
    expect(new Set(sluglar).size).toBe(sluglar.length)
  })

  it('her mahallenin slug’ı üretilebiliyor', () => {
    for (const mahalle of CORLU_MAHALLELERI) {
      expect(mahalleSlugu(mahalle.ad)).not.toBe('')
    }
  })

  it('Türkçe harfler slug’da doğru karşılanıyor', () => {
    expect(mahalleSlugu('Hıdırağa')).toBe('hidiraga')
    expect(mahalleSlugu('Şeyhsinan')).toBe('seyhsinan')
    expect(mahalleSlugu('Çobançeşme')).toBe('cobancesme')
    expect(mahalleSlugu('Deregündüzlü')).toBe('deregunduzlu')
  })

  it('yerleşim türü yalnızca tanımlı iki değerden biri', () => {
    const gecerli = new Set(YERLESIM_TURU_SECENEKLERI.map((secenek) => secenek.value))
    for (const mahalle of CORLU_MAHALLELERI) {
      expect(gecerli.has(mahalle.tur)).toBe(true)
    }
  })

  it('hem merkez hem kırsal mahalle içeriyor', () => {
    expect(CORLU_MAHALLELERI.some((m) => m.tur === 'merkez')).toBe(true)
    expect(CORLU_MAHALLELERI.some((m) => m.tur === 'kirsal')).toBe(true)
  })

  it('bilinmeyen yerleşim türü etiketi üretmez', () => {
    expect(yerlesimTuruEtiketi('kirsal')).toBe('Kırsal (eski köy)')
    expect(yerlesimTuruEtiketi('merkez')).toBe('Merkez mahalle')
    expect(yerlesimTuruEtiketi(null)).toBeNull()
    expect(yerlesimTuruEtiketi('bilinmeyen')).toBeNull()
  })
})
