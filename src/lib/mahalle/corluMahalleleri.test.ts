import { describe, expect, it } from 'vitest'

import {
  CORLU_MAHALLELERI,
  mahalleSlugu,
  yerlesimTuruEtiketi,
  YERLESIM_TURU_SECENEKLERI,
} from './corluMahalleleri'

describe('Çorlu mahalle listesi', () => {
  /**
   * ⚠️ ERGENE'YE GEÇEN YERLEŞİMLER LİSTEYE GERİ SIZMASIN.
   *
   * İkisi de aynı sebeple burada değil: 6360 sayılı kanunla Ergene ilçesi
   * kurulurken oraya geçtiler. İkisi de listeye bir kez yanlışlıkla girdi
   * ve ikisi de ancak veri işi yapılırken fark edildi — Velimeşe elle,
   * Yeşiltepe sınır içe aktarmasının onu hiçbir kaynakta bulamamasıyla.
   *
   * Yanlış ilçenin mahallesi listede kalırsa görünür bir hata vermez:
   * sessizce konumsuz bir kayıt olarak durur ve her içe aktarmada
   * "bulunamadı" listesini kirletir.
   */
  it('Ergene mahalleleri listede YOK — Velimeşe ve Yeşiltepe', () => {
    const adlar = CORLU_MAHALLELERI.map((mahalle) => mahalle.ad)
    const sluglar = adlar.map(mahalleSlugu)

    for (const [ad, slug] of [
      ['Velimeşe', 'velimese'],
      ['Yeşiltepe', 'yesiltepe'],
    ] as const) {
      expect(adlar, `${ad} Ergene ilçesine bağlı, Çorlu listesinde olamaz`).not.toContain(ad)
      expect(sluglar).not.toContain(slug)
    }
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
