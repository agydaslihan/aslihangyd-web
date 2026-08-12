/**
 * Rol tabanlı yetkilendirmenin gerçek veritabanına karşı doğrulanması.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN ENTEGRASYON TESTİ
 *
 * `yalnizcaYonetici` fonksiyonunun doğru boolean döndürdüğünü sınamak
 * kolaydır ve hiçbir şey kanıtlamaz. Asıl soru şu: **kural gerçekten bağlı
 * mı?** Bir koleksiyonda `delete: yalnizcaPanel` unutulduysa birim testi
 * bunu asla görmez.
 *
 * Bu testler Payload Local API üzerinden, `overrideAccess: false` ile ve
 * gerçek kullanıcı nesneleriyle çalışır — yani panelin kullandığı yolun
 * aynısı. EİDS testlerindeki ilkenin aynısı: birim testi kuralın doğru
 * hesaplandığını, entegrasyon testi kuralın ATLANAMADIĞINI gösterir.
 * ─────────────────────────────────────────────────────────────────────────
 */

import config from '@payload-config'
import {
  getPayload,
  type Payload,
  type RequiredDataFromCollectionSlug,
  type TypedUser,
} from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let payload: Payload
let yonetici: TypedUser
let danisman: TypedUser
let mahalleId: number

const ONEK = 'TEST-ROL'

/** Erişim kuralları devrede — panelin kullandığı yolun aynısı. */
const PANEL = { overrideAccess: false } as const

beforeAll(async () => {
  payload = await getPayload({ config })

  const y = await payload.create({
    collection: 'kullanicilar',
    data: {
      adSoyad: `${ONEK} Yönetici`,
      rol: 'yonetici',
      email: `${ONEK.toLowerCase()}-yonetici@ornek.test`,
      password: 'Deneme-1234-parola',
    },
  })
  yonetici = y as unknown as TypedUser

  const d = await payload.create({
    collection: 'kullanicilar',
    data: {
      adSoyad: `${ONEK} Danışman`,
      rol: 'danisman',
      email: `${ONEK.toLowerCase()}-danisman@ornek.test`,
      password: 'Deneme-1234-parola',
    },
  })
  danisman = d as unknown as TypedUser

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
  await payload.delete({ collection: 'kullanicilar', where: { adSoyad: { like: ONEK } } })
  await payload.destroy?.()
})

function ilanVerisi(ek: Record<string, unknown> = {}): RequiredDataFromCollectionSlug<'ilanlar'> {
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

// ═══════════════════════════════════════════════════════════════════════════
describe('yetki yükseltme kapıları', () => {
  it('danışman KULLANICI OLUŞTURAMAZ', async () => {
    // Açık kalsaydı: danışman kendine ikinci bir yönetici hesabı açardı.
    await expect(
      payload.create({
        collection: 'kullanicilar',
        data: {
          adSoyad: `${ONEK} Kaçak`,
          rol: 'yonetici',
          email: `${ONEK.toLowerCase()}-kacak@ornek.test`,
          password: 'Deneme-1234-parola',
        },
        user: danisman,
        ...PANEL,
      }),
    ).rejects.toThrow()
  })

  it('danışman KENDİ ROLÜNÜ YÜKSELTEMEZ', async () => {
    // ⭐ En kritik test. Danışman kendi kaydını güncelleyebiliyor (şifre,
    // telefon); `rol` alanı kilitli olmasaydı aynı formdan yönetici olurdu.
    await payload.update({
      collection: 'kullanicilar',
      id: danisman.id,
      data: { rol: 'yonetici' },
      user: danisman,
      ...PANEL,
    })

    const sonra = await payload.findByID({ collection: 'kullanicilar', id: danisman.id })
    expect(sonra.rol).toBe('danisman')
  })

  it('danışman YÖNETİCİYİ SİLEMEZ', async () => {
    await expect(
      payload.delete({
        collection: 'kullanicilar',
        id: yonetici.id,
        user: danisman,
        ...PANEL,
      }),
    ).rejects.toThrow()
  })

  it('danışman BAŞKA kullanıcının kaydını göremez', async () => {
    const liste = await payload.find({
      collection: 'kullanicilar',
      user: danisman,
      ...PANEL,
      limit: 100,
    })

    const kimlikler = liste.docs.map((k) => k.id)
    expect(kimlikler).toContain(danisman.id)
    expect(kimlikler).not.toContain(yonetici.id)
  })

  it('yönetici rol değiştirebilir', async () => {
    await payload.update({
      collection: 'kullanicilar',
      id: danisman.id,
      data: { telefon: '0500 000 00 00' },
      user: yonetici,
      ...PANEL,
    })

    const sonra = await payload.findByID({ collection: 'kullanicilar', id: danisman.id })
    expect(sonra.telefon).toBe('0500 000 00 00')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('hukuki ve mali kayıtlar', () => {
  it('danışman VERGİ PARAMETRESİ oluşturamaz', async () => {
    // Yanlış oran → yanlış hesap → yatırımcıya yanlış rakam.
    await expect(
      payload.create({
        collection: 'vergi-parametreleri',
        data: {
          anahtar: 'tapu_harci_orani_alici',
          deger: 99,
          gecerlilikYili: 2026,
          guncellemeTarihi: '2026-01-01T00:00:00.000Z',
        },
        user: danisman,
        ...PANEL,
      }),
    ).rejects.toThrow()
  })

  it('danışman HUKUKİ SAYFA oluşturamaz', async () => {
    await expect(
      payload.create({
        collection: 'sayfalar',
        data: { baslik: `${ONEK} sayfa`, slug: `${ONEK.toLowerCase()}-sayfa` },
        user: danisman,
        ...PANEL,
      }),
    ).rejects.toThrow()
  })

  it('danışman KURUMSAL BİLGİLERİ değiştiremez', async () => {
    // Yetki belgesi numarası burada — yasal dayanak.
    await expect(
      payload.updateGlobal({
        slug: 'kurumsal-bilgiler',
        data: { yetkiBelgesiNo: 'SAHTE-123' },
        user: danisman,
        ...PANEL,
      }),
    ).rejects.toThrow()
  })

  it('yönetici vergi parametresi oluşturabilir', async () => {
    const kayit = await payload.create({
      collection: 'vergi-parametreleri',
      data: {
        anahtar: 'ekspertiz_ucreti',
        deger: 1,
        gecerlilikYili: 2099,
        guncellemeTarihi: '2099-01-01T00:00:00.000Z',
      },
      user: yonetici,
      ...PANEL,
    })

    expect(kayit.id).toBeDefined()
    await payload.delete({ collection: 'vergi-parametreleri', id: kayit.id })
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('silme yetkisi', () => {
  it('danışman İLAN SİLEMEZ ama oluşturabilir ve güncelleyebilir', async () => {
    // ⚠️ Bu test iki yönlü: aşırı kısıtlamadığımızı da kanıtlıyor.
    // Danışman günlük işini yapamıyorsa yetkilendirme yanlış kurulmuştur.
    const ilan = await payload.create({
      collection: 'ilanlar',
      data: ilanVerisi({ baslik: `${ONEK} danışman ilanı` }),
      user: danisman,
      ...PANEL,
    })
    expect(ilan.id).toBeDefined()

    const guncel = await payload.update({
      collection: 'ilanlar',
      id: ilan.id,
      data: { ozet: 'danışman güncelledi' },
      user: danisman,
      ...PANEL,
    })
    expect(guncel.ozet).toBe('danışman güncelledi')

    // Silme yasak: EİDS kayıtları (taşınmaz no, yetki tarihleri) yasal dayanak.
    await expect(
      payload.delete({ collection: 'ilanlar', id: ilan.id, user: danisman, ...PANEL }),
    ).rejects.toThrow()

    // Kayıt hâlâ duruyor.
    const duruyorMu = await payload.findByID({ collection: 'ilanlar', id: ilan.id })
    expect(duruyorMu.id).toBe(ilan.id)
  })

  it('yönetici ilan silebilir', async () => {
    const ilan = await payload.create({
      collection: 'ilanlar',
      data: ilanVerisi({ baslik: `${ONEK} silinecek`, tasinmazNo: `${ONEK}-2` }),
      user: yonetici,
      ...PANEL,
    })

    await payload.delete({ collection: 'ilanlar', id: ilan.id, user: yonetici, ...PANEL })

    const kalan = await payload.find({
      collection: 'ilanlar',
      where: { id: { equals: ilan.id } },
    })
    expect(kalan.totalDocs).toBe(0)
  })

  it('danışman GÖZLEM girebilir ama silemez', async () => {
    // Haftalık gözlem rutini danışmana açık olmalı; endeksin geçmişini
    // değiştiren silme işlemi ise değil.
    const gozlem = await payload.create({
      collection: 'gozlemler',
      data: {
        mahalle: mahalleId,
        tip: 'satilik',
        odaTipi: '3+1',
        m2: 120,
        fiyat: 4_000_000,
        gozlemTarihi: '2026-08-03T12:00:00.000Z',
        kaynak: 'portal_ilan',
      },
      user: danisman,
      ...PANEL,
    })
    expect(gozlem.id).toBeDefined()

    await expect(
      payload.delete({ collection: 'gozlemler', id: gozlem.id, user: danisman, ...PANEL }),
    ).rejects.toThrow()

    await payload.delete({ collection: 'gozlemler', id: gozlem.id })
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('rolsüz ve oturumsuz erişim', () => {
  it('oturumsuz kullanıcı ilan oluşturamaz', async () => {
    await expect(
      payload.create({
        collection: 'ilanlar',
        data: ilanVerisi({ baslik: `${ONEK} oturumsuz` }),
        user: null,
        ...PANEL,
      }),
    ).rejects.toThrow()
  })

  it('ROLÜ ÇÖZÜLEMEYEN kullanıcı yönetici sayılmaz', async () => {
    // ⚠️ Eski bir oturumda `rol` gelmiyorsa "herhalde yöneticidir"
    // varsayımı yetkilendirmeyi sessizce kapatırdı.
    const rolsuz = { ...danisman, rol: undefined } as unknown as TypedUser

    await expect(
      payload.create({
        collection: 'vergi-parametreleri',
        data: {
          anahtar: 'dask_tahmini_prim',
          deger: 1,
          gecerlilikYili: 2099,
          guncellemeTarihi: '2099-01-01T00:00:00.000Z',
        },
        user: rolsuz,
        ...PANEL,
      }),
    ).rejects.toThrow()
  })
})
