import { describe, expect, it } from 'vitest'

import { slugUret } from './slug'

describe('slugUret', () => {
  it.each([
    ['Hıdırağa', 'hidiraga'],
    ['Şeyhsinan', 'seyhsinan'],
    ['Muhittin Mahallesi', 'muhittin-mahallesi'],
    ['Çorlu', 'corlu'],
    ['İstasyon Caddesi', 'istasyon-caddesi'],
    ['Alipaşa', 'alipasa'],
    ['Önerler', 'onerler'],
    ['Velimeşe', 'velimese'],
  ])('Türkçe karakterleri doğru çevirir: %s → %s', (girdi, beklenen) => {
    expect(slugUret(girdi)).toBe(beklenen)
  })

  it('büyük İ harfini birleştirici nokta bırakmadan çevirir', () => {
    expect(slugUret('İZMİR')).toBe('izmir')
    expect(slugUret('İzmir')).not.toContain('̇')
  })

  it('noktalama ve fazla boşlukları tek tireye indirger', () => {
    expect(slugUret('3+1  Daire — Muhittin!')).toBe('3-1-daire-muhittin')
  })

  it('baştaki ve sondaki tireleri kırpar', () => {
    expect(slugUret('  --Çorlu--  ')).toBe('corlu')
  })

  it('rakamları korur', () => {
    expect(slugUret('135 m2 3+1')).toBe('135-m2-3-1')
  })

  it('yalnızca çevrilemeyen karakterlerden oluşan metinde boş döner', () => {
    expect(slugUret('!!!')).toBe('')
  })
})
