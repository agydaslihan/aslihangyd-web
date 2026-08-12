/**
 * CSV içe aktarmanın gerçek veritabanına karşı doğrulanması.
 *
 * Birim testi ayrıştırmanın doğruluğunu gösteriyor; bu testler ayrı bir
 * soruyu cevaplıyor: **doğru ayrıştırılan satır, veritabanına doğru
 * giriyor mu?** Aradaki üç şey birim testinde görünmez:
 *
 *  1. `beforeChange` kancası m² fiyatını ve `ay` alanını gerçekten
 *     hesaplıyor mu (endeks bu iki alandan besleniyor)
 *  2. Gün hassasiyetli tarih, saat dilimi yüzünden bir önceki aya kaymıyor mu
 *  3. `overrideAccess: false` yolu toplu yazmada da çalışıyor mu
 */

import config from '@payload-config'
import { getPayload, type Payload, type TypedUser } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { cozumle, satirlariYaz } from './iceAktarmaCekirdegi'

let payload: Payload
let kullanici: TypedUser
let mahalleId: number

const ONEK = 'TEST-CSV'
const MAHALLE_ADI = `${ONEK} Mahallesi`
const EPOSTA = `${ONEK.toLowerCase()}@ornek.test`

const AYARLAR = { varsayilanKaynak: 'portal_ilan', varsayilanGuven: 'dusuk' } as const

function csv(govde: string): string {
  return `Tarih;Mahalle;Tip;Oda;m²;Fiyat\n${govde}`
}

beforeAll(async () => {
  payload = await getPayload({ config })

  const mahalle = await payload.create({
    collection: 'mahalleler',
    data: { ad: MAHALLE_ADI, slug: `${ONEK.toLowerCase()}-mah`, yayinda: false },
  })
  mahalleId = mahalle.id as number

  // Yazma yolu `overrideAccess: false` ile gidiyor; gerçek bir kullanıcı şart.
  const olusan = await payload.create({
    collection: 'kullanicilar',
    data: {
      adSoyad: `${ONEK} Kullanıcı`,
      // `rol` zorunlu ve varsayılanı var; yine de açıkça yazıyoruz —
      // varsayılana güvenmek testi koleksiyon değişikliğine bağımlı kılar.
      rol: 'yonetici',
      email: EPOSTA,
      password: 'Deneme-1234-parola',
    },
  })
  kullanici = olusan as unknown as TypedUser
})

afterAll(async () => {
  if (!payload) return
  await payload.delete({ collection: 'gozlemler', where: { mahalle: { equals: mahalleId } } })
  await payload.delete({ collection: 'mahalleler', where: { ad: { like: ONEK } } })
  await payload.delete({ collection: 'kullanicilar', where: { email: { equals: EPOSTA } } })
  await payload.destroy?.()
})

// ═══════════════════════════════════════════════════════════════════════════
describe('cozumle', () => {
  it('sistemdeki gerçek mahalleyle eşleştirir', async () => {
    const sonuc = await cozumle(
      { csvMetni: csv(`03.08.2026;${MAHALLE_ADI};Satılık;3+1;135;4.300.000`), ayarlar: AYARLAR },
      payload,
      kullanici,
    )

    expect(sonuc.basarili).toBe(true)
    expect(sonuc.satirlar?.[0]?.veri?.mahalleId).toBe(mahalleId)
  })

  it('sistemde olmayan mahalleyi hata olarak bildirir', async () => {
    const sonuc = await cozumle(
      { csvMetni: csv('03.08.2026;Olmayan Mahalle;Satılık;3+1;135;4.300.000'), ayarlar: AYARLAR },
      payload,
      kullanici,
    )

    expect(sonuc.satirlar?.[0]?.veri).toBeNull()
    expect(sonuc.hataliSayisi).toBe(1)
  })

  it('boş dosyayı reddeder', async () => {
    const sonuc = await cozumle({ csvMetni: '   ', ayarlar: AYARLAR }, payload, kullanici)
    expect(sonuc.basarili).toBe(false)
  })

  it('yalnızca başlık içeren dosyayı reddeder', async () => {
    const sonuc = await cozumle(
      { csvMetni: 'Tarih;Mahalle;Tip;Oda;m²;Fiyat', ayarlar: AYARLAR },
      payload,
      kullanici,
    )
    expect(sonuc.basarili).toBe(false)
    expect(sonuc.genelHata).toContain('başlık dışında satır yok')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('satirlariYaz', () => {
  it('kaydı yazar ve kanca m² fiyatı ile ayı hesaplar', async () => {
    const sonuc = await satirlariYaz(
      {
        csvMetni: csv(`03.08.2026;${MAHALLE_ADI};Satılık;3+1;100;4.000.000`),
        ayarlar: AYARLAR,
        atlanacakSatirlar: [],
      },
      payload,
      kullanici,
    )

    expect(sonuc.basarili).toBe(true)
    expect(sonuc.olusturulan).toBe(1)

    const kayitlar = await payload.find({
      collection: 'gozlemler',
      where: { and: [{ mahalle: { equals: mahalleId } }, { m2: { equals: 100 } }] },
      limit: 1,
      depth: 0,
    })

    const kayit = kayitlar.docs[0]
    expect(kayit).toBeDefined()
    expect(kayit?.m2Fiyati).toBe(40_000)
    expect(kayit?.fiyat).toBe(4_000_000)

    // ⚠️ Endeks AY bazlı hesaplanır. Tarih gece yarısı yazılsaydı saat
    // dilimi kayması gözlemi Temmuz'a taşıyabilirdi.
    expect(kayit?.ay).toBe('2026-08')

    // CSV yolunda güven varsayılanı Düşük — geriye dönük kayıt kuralı.
    expect(kayit?.guvenSeviyesi).toBe('dusuk')
  })

  it('ayın ilk günü bir önceki aya kaymaz', async () => {
    await satirlariYaz(
      {
        csvMetni: csv(`01.09.2026;${MAHALLE_ADI};Satılık;2+1;77;2.500.000`),
        ayarlar: AYARLAR,
        atlanacakSatirlar: [],
      },
      payload,
      kullanici,
    )

    const kayitlar = await payload.find({
      collection: 'gozlemler',
      where: { and: [{ mahalle: { equals: mahalleId } }, { m2: { equals: 77 } }] },
      limit: 1,
      depth: 0,
    })

    expect(kayitlar.docs[0]?.ay).toBe('2026-09')
  })

  it('kullanıcının elediği satırı yazmaz', async () => {
    const sonuc = await satirlariYaz(
      {
        csvMetni: csv(
          `05.08.2026;${MAHALLE_ADI};Satılık;4+1;181;6.000.000\n` +
            `06.08.2026;${MAHALLE_ADI};Satılık;4+1;182;6.100.000`,
        ),
        ayarlar: AYARLAR,
        // 2. satır başlık; ilk veri satırı 2 numaralıdır.
        atlanacakSatirlar: [2],
      },
      payload,
      kullanici,
    )

    expect(sonuc.olusturulan).toBe(1)
    expect(sonuc.atlanan).toBe(1)

    const elenen = await payload.find({
      collection: 'gozlemler',
      where: { and: [{ mahalle: { equals: mahalleId } }, { m2: { equals: 181 } }] },
      limit: 1,
      depth: 0,
    })
    expect(elenen.totalDocs).toBe(0)
  })

  it('hatalı satırı yazmaz, geçerli satırı yazar', async () => {
    const sonuc = await satirlariYaz(
      {
        csvMetni: csv(
          `07.08.2026;Olmayan Mahalle;Satılık;3+1;150;5.000.000\n` +
            `07.08.2026;${MAHALLE_ADI};Satılık;3+1;151;5.100.000`,
        ),
        ayarlar: AYARLAR,
        atlanacakSatirlar: [],
      },
      payload,
      kullanici,
    )

    expect(sonuc.olusturulan).toBe(1)
    expect(sonuc.hatali).toBe(1)
  })

  it('zorunlu alan eşlenmemişse hiçbir şey yazmaz', async () => {
    const oncekiSayi = (
      await payload.find({
        collection: 'gozlemler',
        where: { mahalle: { equals: mahalleId } },
        limit: 0,
        depth: 0,
      })
    ).totalDocs

    const sonuc = await satirlariYaz(
      {
        // Tarih sütunu yok.
        csvMetni: `Mahalle;Tip;Oda;m²;Fiyat\n${MAHALLE_ADI};Satılık;3+1;99;3.000.000`,
        ayarlar: AYARLAR,
        atlanacakSatirlar: [],
      },
      payload,
      kullanici,
    )

    expect(sonuc.basarili).toBe(false)
    expect(sonuc.genelHata).toContain('Gözlem tarihi')

    const sonrakiSayi = (
      await payload.find({
        collection: 'gozlemler',
        where: { mahalle: { equals: mahalleId } },
        limit: 0,
        depth: 0,
      })
    ).totalDocs
    expect(sonrakiSayi).toBe(oncekiSayi)
  })

  it('daha önce girilmiş aynı kaydı mükerrer olarak uyarır', async () => {
    const satir = `08.08.2026;${MAHALLE_ADI};Satılık;3+1;123;4.500.000`

    await satirlariYaz(
      { csvMetni: csv(satir), ayarlar: AYARLAR, atlanacakSatirlar: [] },
      payload,
      kullanici,
    )

    // Aynı satır ikinci kez çözümlenince "sistemde zaten olabilir" uyarısı
    // çıkmalı — ama ENGELLENMEMELİ; kararı insan verir.
    const ikinci = await cozumle({ csvMetni: csv(satir), ayarlar: AYARLAR }, payload, kullanici)

    expect(ikinci.satirlar?.[0]?.veri).not.toBeNull()
    expect(ikinci.satirlar?.[0]?.uyarilar.join(' ')).toContain('Sistemde zaten olabilir')
  })
})
