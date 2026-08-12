/**
 * PostGIS yakınlık sorgularının gerçek veritabanına karşı doğrulanması.
 *
 * Bu testler birim testin göremediği şeyi gösterir: motor doğru hesaplasa
 * bile SQL yanlışsa mesafe yanlış çıkar. Özellikle iki tuzağı kapatıyorlar:
 *
 *  1. **Boylam/enlem sırası.** Payload `point` alanını `[boylam, enlem]`
 *     olarak verir, `ST_MakePoint` de aynı sırayı ister. Sıra karışırsa
 *     Çorlu, Somali açıklarına taşınır ve mesafeler sessizce saçmalar.
 *  2. **SRID.** Sütun `geometry(Point)` olarak SRID'siz açıldı. `geography`
 *     dönüşümü SRID 4326 ister; `ST_SetSRID` olmadan hesap yanlış olabilir.
 */

import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { kusUcusuMesafe } from '@/lib/eslestirme/motor'

import { mahalleCevresiGetir, noktayaGoreYakinlik, tumMahallelerinYakinligi } from './yakinlik'

let payload: Payload

const ONEK = 'TEST-YAKINLIK'

/** Çorlu merkezine yakın bir referans nokta — testin çıpası. */
const MERKEZ = { boylam: 27.8, enlem: 41.16 }

/**
 * Bilinen sapmalar. 0,01° enlem ≈ 1,11 km; 0,05° ≈ 5,6 km.
 * Beklenen mesafeler haversine ile hesaplanıp karşılaştırılıyor.
 */
const YAKIN = { boylam: 27.8, enlem: 41.166 } // ~670 m kuzey
const ORTA = { boylam: 27.8, enlem: 41.19 } // ~3,3 km kuzey
const UZAK = { boylam: 27.8, enlem: 41.26 } // ~11 km kuzey

beforeAll(async () => {
  payload = await getPayload({ config })

  await payload.create({
    collection: 'mahalleler',
    data: {
      ad: `${ONEK} Mahallesi`,
      slug: `${ONEK.toLowerCase()}-mah`,
      yayinda: false,
      merkez: [MERKEZ.boylam, MERKEZ.enlem],
    },
  })

  const noktalar = [
    { ad: `${ONEK} yakın market`, tip: 'market' as const, konum: YAKIN },
    { ad: `${ONEK} orta market`, tip: 'market' as const, konum: ORTA },
    { ad: `${ONEK} OSB`, tip: 'sanayi' as const, konum: ORTA },
    { ad: `${ONEK} uzak istasyon`, tip: 'istasyon' as const, konum: UZAK },
  ]

  for (const nokta of noktalar) {
    await payload.create({
      collection: 'ilgi-noktalari',
      data: {
        ad: nokta.ad,
        tip: nokta.tip,
        konum: [nokta.konum.boylam, nokta.konum.enlem],
        onemli: nokta.tip === 'sanayi',
      },
    })
  }
})

afterAll(async () => {
  if (!payload) return
  await payload.delete({ collection: 'ilgi-noktalari', where: { ad: { like: ONEK } } })
  await payload.delete({ collection: 'mahalleler', where: { ad: { like: ONEK } } })
  await payload.destroy?.()
})

// ═══════════════════════════════════════════════════════════════════════════
describe('noktayaGoreYakinlik', () => {
  it('mesafeyi doğru hesaplar — boylam/enlem sırası ve SRID sınavı', async () => {
    const mesafeler = await noktayaGoreYakinlik(MERKEZ.boylam, MERKEZ.enlem)
    const sanayi = mesafeler.find((m) => m.tip === 'sanayi')

    expect(sanayi).toBeDefined()

    const beklenen = kusUcusuMesafe(MERKEZ, ORTA)
    // Haversine küre, PostGIS `geography` elipsoit kullanır; %1 pay yeterli.
    expect(sanayi!.enYakinMetre).toBeGreaterThan(beklenen * 0.99)
    expect(sanayi!.enYakinMetre).toBeLessThan(beklenen * 1.01)

    // Sıra karışsaydı mesafe on binlerce kilometre çıkardı.
    expect(sanayi!.enYakinMetre).toBeLessThan(10_000)
  })

  it('her tip için EN YAKIN kaydı seçer', async () => {
    const mesafeler = await noktayaGoreYakinlik(MERKEZ.boylam, MERKEZ.enlem)
    const market = mesafeler.find((m) => m.tip === 'market')

    expect(market?.enYakinAd).toContain('yakın market')
    expect(market!.enYakinMetre).toBeLessThan(1_000)
  })

  it('yarıçap içindeki kayıt sayısını sayar', async () => {
    // 1 km yarıçapta yalnızca "yakın market" var; "orta market" 3,3 km'de.
    const dar = await noktayaGoreYakinlik(MERKEZ.boylam, MERKEZ.enlem, 1_000)
    expect(dar.find((m) => m.tip === 'market')?.yakindaSayi).toBe(1)

    const genis = await noktayaGoreYakinlik(MERKEZ.boylam, MERKEZ.enlem, 5_000)
    expect(genis.find((m) => m.tip === 'market')?.yakindaSayi).toBe(2)
  })

  it('en yakın kaydın "öne çıkan" işaretini taşır', async () => {
    const mesafeler = await noktayaGoreYakinlik(MERKEZ.boylam, MERKEZ.enlem)
    expect(mesafeler.find((m) => m.tip === 'sanayi')?.onemli).toBe(true)
    expect(mesafeler.find((m) => m.tip === 'market')?.onemli).toBe(false)
  })

  it('geçersiz koordinatta sorgu çalıştırmaz', async () => {
    await expect(noktayaGoreYakinlik(Number.NaN, 41)).resolves.toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('mahalleCevresiGetir', () => {
  it('Payload `point` dizisini olduğu gibi kabul eder', async () => {
    const mesafeler = await mahalleCevresiGetir([MERKEZ.boylam, MERKEZ.enlem])
    expect(mesafeler.length).toBeGreaterThan(0)
  })

  it('merkezi olmayan mahallede boş döner, hata fırlatmaz', async () => {
    await expect(mahalleCevresiGetir(null)).resolves.toEqual([])
    await expect(mahalleCevresiGetir([27.8])).resolves.toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('tumMahallelerinYakinligi', () => {
  it('merkezi tanımlı mahalleyi tipleriyle birlikte döndürür', async () => {
    const mahalleler = await tumMahallelerinYakinligi()
    const test = mahalleler.find((m) => m.slug === `${ONEK.toLowerCase()}-mah`)

    expect(test).toBeDefined()
    expect(test!.mesafeler.map((m) => m.tip).sort()).toEqual(['istasyon', 'market', 'sanayi'])

    const sanayi = test!.mesafeler.find((m) => m.tip === 'sanayi')
    expect(sanayi!.enYakinMetre).toBeLessThan(10_000)
  })
})
