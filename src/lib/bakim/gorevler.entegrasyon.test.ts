/**
 * Günlük bakım görevlerinin gerçek veritabanına karşı doğrulanması.
 *
 * Bu testler, EİDS vaadinin ikinci yarısını güvence altına alır: yayın
 * engeli kaydetme anını korur, bakım görevi ise "hiç kimse kaydetmezse"
 * durumunu. İkisi olmadan yetkisi dolmuş bir ilan yayında kalabilir.
 */

import config from '@payload-config'
import { getPayload, type Payload, type RequiredDataFromCollectionSlug } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { saklamaSuresiDolanlariSil, yetkisiDolanlariKaldir } from './gorevler'

let payload: Payload
let mahalleId: number

const ONEK = 'TEST-BAKIM'

function ilan(ek: Record<string, unknown> = {}): RequiredDataFromCollectionSlug<'ilanlar'> {
  return {
    baslik: `${ONEK} ilan`,
    tip: 'satilik',
    kategori: 'konut',
    il: 'Tekirdağ',
    ilce: 'Çorlu',
    mahalle: mahalleId,
    durum: 'taslak',
    eidsDurum: 'yetkili',
    tasinmazNo: `${ONEK}-1`,
    ada: '1',
    parsel: '1',
    eidsYetkiBaslangic: '2026-01-01T00:00:00.000Z',
    eidsYetkiBitis: '2099-12-31T00:00:00.000Z',
    ...ek,
  } as RequiredDataFromCollectionSlug<'ilanlar'>
}

beforeAll(async () => {
  payload = await getPayload({ config })
  const mahalle = await payload.create({
    collection: 'mahalleler',
    data: { ad: `${ONEK} Mahallesi`, slug: `${ONEK.toLowerCase()}-mah`, yayinda: false },
  })
  mahalleId = mahalle.id as number
})

afterAll(async () => {
  if (!payload) return
  await payload.delete({ collection: 'ilanlar', where: { baslik: { like: ONEK } } })
  await payload.delete({ collection: 'mahalleler', where: { ad: { like: ONEK } } })
  await payload.delete({ collection: 'talepler', where: { adSoyad: { like: ONEK } } })
  await payload.destroy?.()
})

describe('yetkisiDolanlariKaldir', () => {
  it('yayın kancası, süresi dolmuş bir ilanın yayında KAYDEDİLMESİNE izin vermez', async () => {
    // Bu testin kendisi bir güvence: "yayında + süresi dolmuş" durumu
    // Local API üzerinden hiçbir yoldan kurulamıyor.
    const kayit = await payload.create({
      collection: 'ilanlar',
      data: ilan({ durum: 'yayinda', baslik: `${ONEK} kanca sinavi` }),
    })

    await expect(
      payload.update({
        collection: 'ilanlar',
        id: kayit.id,
        data: { eidsYetkiBitis: '2020-01-01T00:00:00.000Z' },
      }),
    ).rejects.toThrow(/EİDS/)
  })

  it('yetkisi zamanla dolmuş yayındaki ilanı "yetki_bitti" durumuna çeker', async () => {
    const kayit = await payload.create({
      collection: 'ilanlar',
      data: ilan({ durum: 'yayinda', baslik: `${ONEK} suresi dolan` }),
    })

    // ⚠️ Kancaları atlayarak doğrudan veritabanına yazıyoruz.
    //
    // Bunu yapmak zorunda kalmamız, kancanın sağlam olduğunun kanıtı: bu
    // durum yalnızca ZAMANIN GEÇMESİYLE oluşabilir, hiçbir kaydetme
    // işlemiyle değil. Burada tam olarak onu — takvimin ilerlemesini —
    // taklit ediyoruz.
    await payload.db.updateOne({
      collection: 'ilanlar',
      where: { id: { equals: kayit.id } },
      data: { eidsYetkiBitis: '2020-01-01T00:00:00.000Z' },
    })

    const oncesi = await payload.findByID({ collection: 'ilanlar', id: kayit.id })
    expect(oncesi.durum).toBe('yayinda')

    const rapor = await yetkisiDolanlariKaldir(payload)
    expect(rapor.hata).toBeUndefined()
    expect(rapor.islenen).toBeGreaterThanOrEqual(1)

    const sonrasi = await payload.findByID({ collection: 'ilanlar', id: kayit.id })
    expect(sonrasi.durum).toBe('yetki_bitti')
  })

  it('yayından kaldırılan ilan artık ziyaretçiye görünmez', async () => {
    const kayit = await payload.create({
      collection: 'ilanlar',
      data: ilan({ durum: 'yayinda', baslik: `${ONEK} gorunmez olacak` }),
    })

    await payload.db.updateOne({
      collection: 'ilanlar',
      where: { id: { equals: kayit.id } },
      data: { eidsYetkiBitis: '2020-01-01T00:00:00.000Z' },
    })

    await yetkisiDolanlariKaldir(payload)

    const ziyaretci = await payload.find({
      collection: 'ilanlar',
      where: { id: { equals: kayit.id } },
      overrideAccess: false,
      user: null,
    })

    expect(ziyaretci.docs).toHaveLength(0)
  })

  it('yetkisi geçerli ilana dokunmaz', async () => {
    const kayit = await payload.create({
      collection: 'ilanlar',
      data: ilan({ durum: 'yayinda', baslik: `${ONEK} gecerli ilan` }),
    })

    await yetkisiDolanlariKaldir(payload)

    const sonrasi = await payload.findByID({ collection: 'ilanlar', id: kayit.id })
    expect(sonrasi.durum).toBe('yayinda')
  })
})

describe('saklamaSuresiDolanlariSil', () => {
  it('süresi dolmamış talebi silmez', async () => {
    const talep = await payload.create({
      collection: 'talepler',
      data: {
        adSoyad: `${ONEK} Taze Kayıt`,
        tip: 'genel',
        durum: 'yeni',
        kvkkOnay: true,
      } as RequiredDataFromCollectionSlug<'talepler'>,
    })

    await saklamaSuresiDolanlariSil(payload)

    const sonrasi = await payload.findByID({ collection: 'talepler', id: talep.id })
    expect(sonrasi.id).toBe(talep.id)
  })

  it('raporunda kişisel veri sızdırmaz', async () => {
    const rapor = await saklamaSuresiDolanlariSil(payload)
    const metin = rapor.detay.join(' ')

    // Silinen kaydın adı/telefonu günlüğe yazılırsa silme anlamını yitirir.
    expect(metin).not.toMatch(/@|\+90|05\d{2}/)
  })
})
