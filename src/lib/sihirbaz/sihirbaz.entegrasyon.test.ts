/**
 * Portföy sihirbazının **gerçek veritabanına karşı** doğrulanması.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * NEDEN BU DOSYA VAR
 *
 * Sihirbaz, EİDS kapısının etrafından dolaşan bir arka kapı olabilirdi.
 * `overrideAccess: true` yazan tek bir satır, ya da `durum` alanını
 * istemciden okuyan bir refactor, kuralı sessizce delerdi — ve birim
 * testleri yine yeşil kalırdı.
 *
 * Bu dosya sihirbazın yazma yolunun:
 *  1. kancaları çalıştırdığını,
 *  2. EİDS engelini uyguladığını,
 *  3. `durum`u istemciye bırakmadığını
 * gerçek Payload + PostgreSQL üzerinde kanıtlar.
 *
 * ⚠️ Sunucu eyleminin kendisi (`ilanTaslagiOlustur`) `next/headers`
 * gerektirdiği için burada doğrudan çağrılamıyor. Bunun yerine eylemin
 * KULLANDIĞI yazma yolu birebir taklit ediliyor: aynı şema, aynı dönüşüm,
 * aynı `payload.create` seçenekleri. Şema veya dönüşüm değişirse bu testler
 * de kırılır.
 * ─────────────────────────────────────────────────────────────────────────
 */

import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { sihirbazSemasi } from './sema'
import { gorunumuVeriyeCevir } from './veriyeCevir'

let payload: Payload
let mahalleId: number

const ONEK = 'TEST-SIHIRBAZ'

/** Sihirbaz formunun ürettiği ham girdi. */
function formGirdisi(degisiklik: Record<string, unknown> = {}) {
  return {
    baslik: `${ONEK} deneme ilanı`,
    tip: 'satilik',
    kategori: 'konut',
    ozet: '',
    il: 'Tekirdağ',
    ilce: 'Çorlu',
    mahalle: String(mahalleId),
    adres: '',
    ada: '',
    parsel: '',
    fiyat: '',
    paraBirimi: 'TRY',
    tahminiKira: '',
    aidat: '',
    brutM2: '',
    netM2: '',
    bulunduguKat: '',
    toplamKat: '',
    binaYasi: '',
    tasinmazNo: '',
    eidsYetkiBaslangic: '',
    eidsYetkiBitis: '',
    gizliPortfoy: false,
    ...degisiklik,
  }
}

/**
 * Eylemin yazma yolu — TAKLİT DEĞİL, AYNI KOD.
 *
 * ⚠️ Eskiden bu fonksiyon eşlemeyi KOPYALIYORDU ve buradaki yorum riski
 * kendisi yazıyordu: "ayrışırsa test yanlış şeyi doğrular hale gelir."
 * Eşleme `veriyeCevir.ts`e taşındı; artık eylem de test de aynı kodu
 * çağırıyor ve ayrışma imkânsız.
 *
 * `durum: 'taslak'` eşlemenin içinde ve sabit.
 */
async function sihirbazlaKaydet(ham: Record<string, unknown>) {
  const sonuc = sihirbazSemasi.safeParse(ham)
  if (!sonuc.success) throw new Error(`Şema reddetti: ${sonuc.error.issues[0]?.message}`)

  const veri = sonuc.data
  const baslik = veri.baslik.trim() === '' ? 'Taslak — entegrasyon sınaması' : veri.baslik.trim()

  return payload.create({
    collection: 'ilanlar',
    data: gorunumuVeriyeCevir(veri, Number(veri.mahalle), baslik),
    overrideAccess: false,
    user: { id: 1, collection: 'kullanicilar' } as never,
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

// ═══════════════════════════════════════════════════════════════════════════
describe('Sihirbaz — taslak oluşturma', () => {
  it('EİDS bilgisi olmadan taslak oluşturulabilir', async () => {
    const ilan = await sihirbazlaKaydet(formGirdisi())

    expect(ilan.durum).toBe('taslak')
    expect(ilan.baslik).toContain(ONEK)
  })

  it('slug kancası çalışır — başlıktan otomatik üretilir', async () => {
    const ilan = await sihirbazlaKaydet(formGirdisi({ baslik: `${ONEK} Slug Üretim Denemesi` }))

    expect(ilan.slug).toBeTruthy()
    expect(ilan.slug).toMatch(/slug-uretim-denemesi/)
  })

  /**
   * Göstergeler `ilanGostergeleri` kancasıyla yazılır. Sihirbazın yazma
   * yolu kancaları atlasaydı bu alanlar boş kalırdı.
   */
  it('yatırım göstergeleri kancası çalışır', async () => {
    const ilan = await sihirbazlaKaydet(formGirdisi({ fiyat: '4800000', tahminiKira: '20000' }))

    expect(ilan.kiraCarpani).toBe(20)
    expect(ilan.brutGetiri).toBe(5)
    expect(ilan.amortismanYili).toBe(20)
  })

  it('kira girilmemişse gösterge uydurulmaz', async () => {
    const ilan = await sihirbazlaKaydet(formGirdisi({ fiyat: '4800000' }))

    expect(ilan.kiraCarpani).toBeFalsy()
    expect(ilan.brutGetiri).toBeFalsy()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('Sihirbaz — EİDS kapısı atlanamaz', () => {
  /**
   * ⚠️ Bu testin kanıtladığı şey: sihirbaz şemasında `durum` alanı olmadığı
   * için, istemci gövdeye `durum: 'yayinda'` eklese bile o değer şemadan
   * geçemez ve kayda ulaşamaz.
   */
  it('istemci "yayinda" göndermeye çalışsa bile kayıt taslak kalır', async () => {
    const ilan = await sihirbazlaKaydet(formGirdisi({ durum: 'yayinda' }))

    expect(ilan.durum).toBe('taslak')
  })

  /**
   * Sihirbazın yazma yoluna EİDS'siz "yayinda" verilirse hook devreye
   * girmeli. Bu, `overrideAccess: false` ve kancaların gerçekten bağlı
   * olduğunun kanıtı.
   */
  it('aynı yazma yoluyla EİDS eksik "yayinda" denenirse hook reddeder', async () => {
    await expect(
      payload.create({
        collection: 'ilanlar',
        data: {
          durum: 'yayinda',
          slug: '',
          baslik: `${ONEK} yayin denemesi`,
          tip: 'satilik',
          kategori: 'konut',
          il: 'Tekirdağ',
          ilce: 'Çorlu',
          mahalle: mahalleId,
        },
        overrideAccess: false,
        user: { id: 1, collection: 'kullanicilar' } as never,
      }),
    ).rejects.toThrow(/EİDS/)
  })

  /**
   * Sihirbazla girilen eksik EİDS bilgisi, sonradan admin'de yayına almayı
   * da engellemeli. Yani sihirbaz "yarım kayıt" üretip kapıyı gevşetmiyor.
   */
  it('sihirbazla oluşturulan eksik EİDS taslağı sonradan yayına alınamaz', async () => {
    const ilan = await sihirbazlaKaydet(formGirdisi({ eidsDurum: 'yetkili' }))

    await expect(
      payload.update({ collection: 'ilanlar', id: ilan.id, data: { durum: 'yayinda' } }),
    ).rejects.toThrow(/EİDS/)

    const kontrol = await payload.findByID({ collection: 'ilanlar', id: ilan.id })
    expect(kontrol.durum).toBe('taslak')
  })

  it('EİDS eksiksiz girilirse taslak sonradan yayına alınabilir', async () => {
    const ilan = await sihirbazlaKaydet(
      formGirdisi({
        eidsDurum: 'yetkili',
        tasinmazNo: `${ONEK}-9876`,
        ada: '4321',
        parsel: '12',
        eidsYetkiBaslangic: '2026-01-01',
        eidsYetkiBitis: '2099-12-31',
      }),
    )

    expect(ilan.durum).toBe('taslak')

    const yayindaki = await payload.update({
      collection: 'ilanlar',
      id: ilan.id,
      data: { durum: 'yayinda' },
    })

    expect(yayindaki.durum).toBe('yayinda')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('Sihirbaz — erişim kuralı', () => {
  /**
   * `overrideAccess: false` + kullanıcısız istek, `access.create`
   * (`yalnizcaPanel`) tarafından reddedilmeli. Sunucu eylemi ayrıca kendi
   * oturum kontrolünü de yapıyor; iki kat olması, birinin bir refactor'da
   * düşmesi ihtimaline karşı.
   */
  it('oturum olmadan ilan oluşturulamaz', async () => {
    await expect(
      payload.create({
        collection: 'ilanlar',
        data: {
          durum: 'taslak',
          slug: '',
          baslik: `${ONEK} yetkisiz deneme`,
          tip: 'satilik',
          kategori: 'konut',
          il: 'Tekirdağ',
          ilce: 'Çorlu',
          mahalle: mahalleId,
        },
        overrideAccess: false,
        user: null,
      }),
    ).rejects.toThrow()
  })
})
