/**
 * KVKK korumalarının gerçek veritabanına karşı doğrulanması.
 *
 * Buradaki iddia: açık rıza olmadan kişisel veri kaydı OLUŞTURULAMAZ ve
 * saklama süresi kaydın kendisine yazılır. Arayüzdeki onay kutusu tek başına
 * bir koruma değildir — API'ye doğrudan istek atan biri onu atlar.
 */

import config from '@payload-config'
import { getPayload, type Payload, type RequiredDataFromCollectionSlug } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { VARSAYILAN_SAKLAMA_AYI } from '@/lib/kvkk/saklama'

let payload: Payload

const ONEK = 'TEST-KVKK'

/**
 * `kvkkOnayTarihi` / `saklamaBitis` alanları hook tarafından yazılır; testler
 * bunları bilerek göndermez. Üretilen tip yine de bekleyeceği için tek
 * noktada gerekçeli dönüşüm yapılıyor.
 */
function temelTalep(ek: Record<string, unknown> = {}): RequiredDataFromCollectionSlug<'talepler'> {
  return {
    adSoyad: `${ONEK} Deneme Kişi`,
    tip: 'genel',
    durum: 'yeni',
    mesaj: 'Deneme mesajı',
    kvkkOnay: true,
    ...ek,
  } as RequiredDataFromCollectionSlug<'talepler'>
}

beforeAll(async () => {
  payload = await getPayload({ config })
})

afterAll(async () => {
  if (!payload) return
  await payload.delete({ collection: 'talepler', where: { adSoyad: { like: ONEK } } })
  await payload.destroy?.()
})

describe('KVKK — açık rıza zorunluluğu', () => {
  it('onay verilmeden talep OLUŞTURULAMAZ', async () => {
    await expect(
      payload.create({ collection: 'talepler', data: temelTalep({ kvkkOnay: false }) }),
    ).rejects.toThrow(/onay/i)
  })

  it('onay alanı hiç gönderilmezse de oluşturulamaz', async () => {
    await expect(
      payload.create({
        collection: 'talepler',
        // Zorunlu alan doğrulaması da, hook da bu isteği reddetmeli.
        data: {
          adSoyad: `${ONEK} Onaysız`,
          tip: 'genel',
          durum: 'yeni',
        } as RequiredDataFromCollectionSlug<'talepler'>,
      }),
    ).rejects.toThrow()
  })

  it('onay verildiğinde talep oluşturulur', async () => {
    const talep = await payload.create({ collection: 'talepler', data: temelTalep() })
    expect(talep.kvkkOnay).toBe(true)
  })
})

describe('KVKK — saklama süresi', () => {
  it('onay tarihi ve saklama bitişi otomatik yazılır', async () => {
    const talep = await payload.create({ collection: 'talepler', data: temelTalep() })

    expect(talep.kvkkOnayTarihi).toBeTruthy()
    expect(talep.saklamaBitis).toBeTruthy()
  })

  it(`saklama bitişi, onaydan ${VARSAYILAN_SAKLAMA_AYI} ay sonradır`, async () => {
    const talep = await payload.create({ collection: 'talepler', data: temelTalep() })

    const onay = new Date(talep.kvkkOnayTarihi as string)
    const bitis = new Date(talep.saklamaBitis as string)
    const ayFarki =
      (bitis.getUTCFullYear() - onay.getUTCFullYear()) * 12 +
      (bitis.getUTCMonth() - onay.getUTCMonth())

    expect(ayFarki).toBe(VARSAYILAN_SAKLAMA_AYI)
  })

  it('istemcinin gönderdiği saklama tarihi dikkate alınmaz', async () => {
    const talep = await payload.create({
      collection: 'talepler',
      data: temelTalep({ saklamaBitis: '2099-01-01T00:00:00.000Z' }),
    })

    expect(new Date(talep.saklamaBitis as string).getUTCFullYear()).toBeLessThan(2099)
  })

  it('güncellemede onay bilgileri geçmişe dönük değiştirilemez', async () => {
    const talep = await payload.create({ collection: 'talepler', data: temelTalep() })
    const ilkOnay = talep.kvkkOnayTarihi

    const guncel = await payload.update({
      collection: 'talepler',
      id: talep.id,
      data: { durum: 'arandi', kvkkOnayTarihi: '2000-01-01T00:00:00.000Z' },
    })

    expect(guncel.kvkkOnayTarihi).toBe(ilkOnay)
    expect(guncel.durum).toBe('arandi')
  })
})

describe('KVKK — erişim sınırlaması', () => {
  it('talepler giriş yapmamış ziyaretçiye OKUTULMAZ', async () => {
    await payload.create({ collection: 'talepler', data: temelTalep() })

    await expect(
      payload.find({ collection: 'talepler', overrideAccess: false, user: null }),
    ).rejects.toThrow()
  })

  it('pazarlama onayı ayrı bir onaydır ve varsayılanı kapalıdır', async () => {
    const talep = await payload.create({ collection: 'talepler', data: temelTalep() })
    expect(talep.pazarlamaOnayi).toBe(false)
  })
})
