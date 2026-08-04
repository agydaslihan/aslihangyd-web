import { describe, expect, it } from 'vitest'

import { saklamaBitisi, VARSAYILAN_SAKLAMA_AYI } from './saklama'

describe('saklamaBitisi', () => {
  it(`varsayılan olarak ${VARSAYILAN_SAKLAMA_AYI} ay ekler`, () => {
    const bitis = saklamaBitisi(new Date('2026-08-04T10:00:00Z'))
    expect(bitis.toISOString()).toBe('2028-08-04T10:00:00.000Z')
  })

  it('özel süre kabul eder', () => {
    const bitis = saklamaBitisi(new Date('2026-08-04T00:00:00Z'), 6)
    expect(bitis.toISOString().slice(0, 10)).toBe('2027-02-04')
  })

  it('ay sonlarında taşma yapmaz — süreyi uzatmaz', () => {
    // 31 Ocak + 1 ay, saf toplamada 3 Mart'a taşardı.
    const bitis = saklamaBitisi(new Date('2026-01-31T00:00:00Z'), 1)
    expect(bitis.toISOString().slice(0, 10)).toBe('2026-02-28')
  })

  it("artık yılda 29 Şubat'a sabitler", () => {
    const bitis = saklamaBitisi(new Date('2028-01-31T00:00:00Z'), 1)
    expect(bitis.toISOString().slice(0, 10)).toBe('2028-02-29')
  })

  it('yıl sınırını doğru geçer', () => {
    const bitis = saklamaBitisi(new Date('2026-12-15T00:00:00Z'), 24)
    expect(bitis.toISOString().slice(0, 10)).toBe('2028-12-15')
  })

  it('girdiyi değiştirmez', () => {
    const onay = new Date('2026-08-04T00:00:00Z')
    saklamaBitisi(onay)
    expect(onay.toISOString()).toBe('2026-08-04T00:00:00.000Z')
  })
})
