/**
 * Koordinat hatalarının **gerçek veritabanında** yakalanması.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN BU DOSYA VAR: 13 EYLÜL 2026'DA ÜRETİMDE İKİ BOZUK KAYIT BULUNDU.
 *
 *   #4 UYSAL PIAZZA  → POINT(41.150169137 27.828600915)   enlem/boylam TERS
 *   #2 KERVANCI CITY → POINT(1 1)                          yer tutucu
 *
 * Birim testi motorun bu değerleri doğru SINIFLANDIRDIĞINI gösteriyor. Bu
 * dosya zincirin geri kalanını kanıtlıyor: kayıt Payload'dan geçip
 * PostGIS'e yazıldığında ve oradan geri okunduğunda sıra korunuyor mu,
 * tarama iki senaryoyu da buluyor mu, doğru kaydı rahat bırakıyor mu.
 *
 * ⚠️ Kırılabilecek yer sınıflandırma değil, SIRA. Payload dizisi
 * `[boylam, enlem]`, PostGIS `ST_X` = boylam. İkisinden biri ters
 * okunursa doğru kayıt "ters", ters kayıt "tamam" görünür ve birim
 * testleri yine yeşil kalır.
 * ─────────────────────────────────────────────────────────────────────────
 */

import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { konumuDenetle, noktadanCoz, noktayaCevir } from './dogrula'
import { konumlariTara } from './tarama'

let payload: Payload
let mahalleId: number

const ONEK = 'TEST-KONUM'

/** Alipaşa'nın gerçek merkezi — `dogrula.test.ts` ile aynı. */
const ALIPASA = { enlem: 41.14893, boylam: 27.827424 }

/** Paneldeki `KonumAlani`nın yazdığı değerle aynı yoldan kayıt oluşturur. */
async function ilanOlustur(ad: string, enlem: number, boylam: number) {
  return payload.create({
    collection: 'ilanlar',
    data: {
      baslik: `${ONEK} ${ad}`,
      durum: 'taslak',
      tip: 'satilik',
      kategori: 'konut',
      mahalle: mahalleId,
      konum: noktayaCevir(enlem, boylam) ?? undefined,
    } as never,
  })
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
  await payload.delete({ collection: 'ilanlar', where: { baslik: { like: ONEK } } })
  await payload.delete({ collection: 'mahalleler', where: { ad: { like: ONEK } } })
  await payload.destroy?.()
})

describe('Koordinat — veritabanı gidiş-dönüşü', () => {
  /** ⚠️ SIRA KİLİDİ: doğru girilen kayıt doğru okunmalı. */
  it('doğru koordinat Payload ve PostGIS üzerinden aynı sırayla dönüyor', async () => {
    const ilan = await ilanOlustur('dogru', ALIPASA.enlem, ALIPASA.boylam)

    const okunan = await payload.findByID({ collection: 'ilanlar', id: ilan.id })
    const { enlem, boylam } = noktadanCoz(okunan.konum)

    expect(enlem).toBeCloseTo(ALIPASA.enlem, 6)
    expect(boylam).toBeCloseTo(ALIPASA.boylam, 6)
    expect(konumuDenetle(enlem, boylam).durum).toBe('tamam')
  })
})

describe('Koordinat — tarama iki üretim hatasını buluyor', () => {
  let tersId: number
  let yerTutucuId: number
  let dogruId: number

  beforeAll(async () => {
    // İlan #4'ün kaydı birebir: enlem kutusuna boylam, boylam kutusuna enlem yazılmış.
    tersId = (await ilanOlustur('ters', 27.828600915, 41.150169137)).id as number
    // İlan #2'nin kaydı birebir.
    yerTutucuId = (await ilanOlustur('yer tutucu', 1, 1)).id as number
    dogruId = (await ilanOlustur('dogru tarama', ALIPASA.enlem, ALIPASA.boylam)).id as number
  })

  it('ters girilen koordinat "ters" bulunuyor ve düzeltilmiş değer öneriliyor', async () => {
    const sonuc = (await konumlariTara(payload)).find((s) => s.kaynak === 'ilan' && s.id === tersId)

    expect(sonuc?.durum).toBe('ters')
    expect(sonuc?.enlem).toBeCloseTo(27.828600915, 6)
    expect(sonuc?.boylam).toBeCloseTo(41.150169137, 6)
    expect(sonuc?.takas?.enlem).toBeCloseTo(41.150169137, 6)
    expect(sonuc?.takas?.boylam).toBeCloseTo(27.828600915, 6)
  })

  it('POINT(1 1) "yer tutucu" bulunuyor ve takas önerilmiyor', async () => {
    const sonuc = (await konumlariTara(payload)).find(
      (s) => s.kaynak === 'ilan' && s.id === yerTutucuId,
    )

    expect(sonuc?.durum).toBe('yer_tutucu')
    expect(sonuc?.takas).toBeNull()
  })

  /** ⚠️ Her şeyi bozuk sayan bir tarama da testi geçerdi — doğru kayıt listede OLMAMALI. */
  it('doğru kayıt taramaya takılmıyor', async () => {
    const sorunlular = await konumlariTara(payload)

    expect(sorunlular.some((s) => s.kaynak === 'ilan' && s.id === dogruId)).toBe(false)
  })

  /** Konumu olmayan kayıt sorun değil — yanlış konum, konum olmamasından kötüdür. */
  it('konumu boş kayıt taramaya takılmıyor', async () => {
    const bos = await payload.create({
      collection: 'ilanlar',
      data: {
        baslik: `${ONEK} konumsuz`,
        durum: 'taslak',
        tip: 'satilik',
        kategori: 'konut',
        mahalle: mahalleId,
      } as never,
    })

    const sorunlular = await konumlariTara(payload)
    expect(sorunlular.some((s) => s.kaynak === 'ilan' && s.id === bos.id)).toBe(false)
  })
})
