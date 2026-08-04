/**
 * EİDS yayın engelinin **gerçek veritabanına karşı** doğrulanması.
 *
 * Neden birim testi yetmez: `src/lib/eids/kurallar.test.ts` kuralın doğru
 * *hesaplandığını* kanıtlar. Bu dosya kuralın gerçekten *bağlandığını*
 * kanıtlar — hook yanlış koleksiyona takılsa, yanlış aşamada çalışsa veya
 * bir refactor sırasında düşse birim testleri yine yeşil kalırdı.
 *
 * CLAUDE.md: "Bu kural kod seviyesinde zorlanır (hook), sadece uyarı DEĞİL."
 * Bu dosya o cümlenin kanıtıdır.
 */

import config from '@payload-config'
import { getPayload, type Payload, type RequiredDataFromCollectionSlug } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let payload: Payload
let mahalleId: number

/** Testlerin ürettiği kayıtları temizleyebilmek için ortak önek. */
const ONEK = 'TEST-EIDS'

function gecerliEids() {
  return {
    eidsDurum: 'yetkili' as const,
    tasinmazNo: `${ONEK}-1234`,
    ada: '1234',
    parsel: '56',
    eidsYetkiBaslangic: '2026-01-01T00:00:00.000Z',
    // Uzak gelecekte: test, gerçek tarihe göre çalışır.
    eidsYetkiBitis: '2099-12-31T00:00:00.000Z',
  }
}

/**
 * `slug` şemada zorunlu olduğu için Payload'ın ürettiği tip onu ister; oysa
 * çalışma zamanında `slugAlani` kancası başlıktan otomatik üretir. Testler
 * bilerek slug göndermiyor — böylece otomatik üretim ve çakışma çözümü de
 * her çağrıda doğrulanmış oluyor. Tek noktada, gerekçeli bir dönüşüm.
 */
function temelIlan(ek: Record<string, unknown> = {}): RequiredDataFromCollectionSlug<'ilanlar'> {
  return {
    baslik: `${ONEK} deneme ilanı`,
    tip: 'satilik',
    kategori: 'konut',
    il: 'Tekirdağ',
    ilce: 'Çorlu',
    mahalle: mahalleId,
    durum: 'taslak',
    ...ek,
  } as RequiredDataFromCollectionSlug<'ilanlar'>
}

beforeAll(async () => {
  payload = await getPayload({ config })

  const mahalle = await payload.create({
    collection: 'mahalleler',
    data: { ad: `${ONEK} Mahallesi`, slug: `${ONEK.toLowerCase()}-mahallesi`, yayinda: false },
  })
  mahalleId = mahalle.id as number
})

afterAll(async () => {
  if (!payload) return
  await payload.delete({
    collection: 'ilanlar',
    where: { baslik: { like: ONEK } },
  })
  await payload.delete({
    collection: 'mahalleler',
    where: { ad: { like: ONEK } },
  })
  await payload.destroy?.()
})

describe('EİDS yayın engeli — oluşturma', () => {
  it('EİDS alanları boşken ilan "yayında" olarak OLUŞTURULAMAZ', async () => {
    await expect(
      payload.create({
        collection: 'ilanlar',
        data: temelIlan({ durum: 'yayinda' }),
      }),
    ).rejects.toThrow(/EİDS/)
  })

  it('EİDS alanları boşken ilan "taslak" olarak oluşturulabilir', async () => {
    const ilan = await payload.create({
      collection: 'ilanlar',
      data: temelIlan(),
    })

    expect(ilan.durum).toBe('taslak')
  })

  it('EİDS alanları tamken ilan doğrudan "yayında" oluşturulabilir', async () => {
    const ilan = await payload.create({
      collection: 'ilanlar',
      data: temelIlan({ durum: 'yayinda', ...gecerliEids() }),
    })

    expect(ilan.durum).toBe('yayinda')
  })
})

describe('EİDS yayın engeli — güncelleme', () => {
  it('taslak ilan, EİDS eksikken "yayında"ya ÇEKİLEMEZ', async () => {
    const ilan = await payload.create({ collection: 'ilanlar', data: temelIlan() })

    await expect(
      payload.update({ collection: 'ilanlar', id: ilan.id, data: { durum: 'yayinda' } }),
    ).rejects.toThrow(/EİDS/)

    const kontrol = await payload.findByID({ collection: 'ilanlar', id: ilan.id })
    expect(kontrol.durum).toBe('taslak')
  })

  it('EİDS tamamlandıktan sonra yayına alınabilir', async () => {
    const ilan = await payload.create({ collection: 'ilanlar', data: temelIlan() })

    await payload.update({ collection: 'ilanlar', id: ilan.id, data: gecerliEids() })
    const yayinlanan = await payload.update({
      collection: 'ilanlar',
      id: ilan.id,
      data: { durum: 'yayinda' },
    })

    expect(yayinlanan.durum).toBe('yayinda')
  })

  it('yetki süresi dolmuş ilan yayına ALINAMAZ', async () => {
    const ilan = await payload.create({
      collection: 'ilanlar',
      data: temelIlan({
        ...gecerliEids(),
        eidsYetkiBitis: '2020-01-01T00:00:00.000Z',
      }),
    })

    await expect(
      payload.update({ collection: 'ilanlar', id: ilan.id, data: { durum: 'yayinda' } }),
    ).rejects.toThrow(/süre/i)
  })

  it('yayındaki ilanın yetkisi silinirse ilan yayında KALAMAZ', async () => {
    const ilan = await payload.create({
      collection: 'ilanlar',
      data: temelIlan({ durum: 'yayinda', ...gecerliEids() }),
    })

    await expect(
      payload.update({ collection: 'ilanlar', id: ilan.id, data: { tasinmazNo: null } }),
    ).rejects.toThrow(/EİDS/)
  })

  it('yetkisi dolmuş ilan HER ZAMAN yayından kaldırılabilir', async () => {
    // Kritik kaçış yolu: engel, ilanın yayından çekilmesini bloke etmemeli.
    const ilan = await payload.create({
      collection: 'ilanlar',
      data: temelIlan({ durum: 'yayinda', ...gecerliEids() }),
    })

    const kaldirilan = await payload.update({
      collection: 'ilanlar',
      id: ilan.id,
      data: { durum: 'yetki_bitti', eidsYetkiBitis: '2020-01-01T00:00:00.000Z' },
    })

    expect(kaldirilan.durum).toBe('yetki_bitti')
  })
})

describe('İkinci savunma hattı — okuma erişimi', () => {
  it('yayında olmayan ilan, giriş yapmamış ziyaretçiye görünmez', async () => {
    const ilan = await payload.create({ collection: 'ilanlar', data: temelIlan() })

    const sonuc = await payload.find({
      collection: 'ilanlar',
      where: { id: { equals: ilan.id } },
      // `overrideAccess: false` = ziyaretçi gözüyle sorgula.
      overrideAccess: false,
      user: null,
    })

    expect(sonuc.docs).toHaveLength(0)
  })

  it('yayındaki ilan ziyaretçiye görünür', async () => {
    const ilan = await payload.create({
      collection: 'ilanlar',
      data: temelIlan({ durum: 'yayinda', ...gecerliEids() }),
    })

    const sonuc = await payload.find({
      collection: 'ilanlar',
      where: { id: { equals: ilan.id } },
      overrideAccess: false,
      user: null,
    })

    expect(sonuc.docs).toHaveLength(1)
  })

  it('satılmış ilan ziyaretçiye görünmez', async () => {
    const ilan = await payload.create({
      collection: 'ilanlar',
      data: temelIlan({ durum: 'satildi', ...gecerliEids() }),
    })

    const sonuc = await payload.find({
      collection: 'ilanlar',
      where: { id: { equals: ilan.id } },
      overrideAccess: false,
      user: null,
    })

    expect(sonuc.docs).toHaveLength(0)
  })
})

describe('Hesaplanan yatırım göstergeleri', () => {
  it('kaydederken otomatik hesaplanır', async () => {
    const ilan = await payload.create({
      collection: 'ilanlar',
      data: temelIlan({ fiyat: 4_800_000, tahminiKira: 20_000 }),
    })

    expect(ilan.kiraCarpani).toBe(20)
    expect(ilan.brutGetiri).toBe(5)
    expect(ilan.amortismanYili).toBe(20)
  })

  it('elle girilen değer yok sayılır — fiyat/kira belirler', async () => {
    const ilan = await payload.create({
      collection: 'ilanlar',
      data: temelIlan({ fiyat: 4_800_000, tahminiKira: 20_000, kiraCarpani: 3 }),
    })

    expect(ilan.kiraCarpani).toBe(20)
  })

  it('kira bilgisi yoksa boş kalır — sayı uydurulmaz', async () => {
    const ilan = await payload.create({
      collection: 'ilanlar',
      data: temelIlan({ fiyat: 4_800_000 }),
    })

    expect(ilan.kiraCarpani).toBeNull()
    expect(ilan.brutGetiri).toBeNull()
  })

  it('kiralık ilanda hesaplanmaz', async () => {
    const ilan = await payload.create({
      collection: 'ilanlar',
      data: temelIlan({ tip: 'kiralik', fiyat: 20_000, tahminiKira: 20_000 }),
    })

    expect(ilan.kiraCarpani).toBeNull()
  })
})
