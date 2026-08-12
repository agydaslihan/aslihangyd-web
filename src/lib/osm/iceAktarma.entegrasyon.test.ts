/**
 * OSM içe aktarmanın gerçek veritabanına karşı doğrulanması.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ASIL SINAV: ELLE DÜZELTİLEN KAYIT EZİLİYOR MU?
 *
 * Özelliğin güvenilirliği tamamen buna bağlı. OSM'de eksik ve yanlış kayıt
 * olur; Aslıhan bir noktanın adını düzelttiğinde bir sonraki içe aktarma
 * onu geri çevirseydi, düzeltme emeği her seferinde çöpe gider ve sistem
 * kullanılmaz olurdu.
 *
 * Koruma iki parçalı ve ikisi de burada sınanıyor:
 *  1. `osmElleDuzenlemeIzi` kancası — insan düzenlemesini işaretliyor mu?
 *  2. `satirlariYaz` — işaretli kaydı atlıyor mu?
 *
 * ⚠️ Bu testler AĞA ÇIKMAZ. Overpass çağrısı yapılmıyor; adaylar elle
 * kuruluyor. Ağa çıkan kısım (sorgu/çözümleme) birim testlerinde.
 */

import config from '@payload-config'
import { getPayload, type Payload, type TypedUser } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { satirlariYaz } from './iceAktarma'
import type { OnizlemeSatiri } from './iceAktarma'

let payload: Payload
let yonetici: TypedUser

const ONEK = 'TEST-OSM'

function satir(
  islem: OnizlemeSatiri['islem'],
  ek: Partial<OnizlemeSatiri['aday']> = {},
  mevcutId?: number,
): OnizlemeSatiri {
  return {
    islem,
    mevcutId,
    aday: {
      osmKimlik: `node/${ONEK}-1`,
      ad: `${ONEK} Okulu`,
      tip: 'okul',
      onemli: false,
      boylam: 27.8,
      enlem: 41.16,
      etiket: 'amenity=school',
      ...ek,
    },
  }
}

beforeAll(async () => {
  payload = await getPayload({ config })

  const y = await payload.create({
    collection: 'kullanicilar',
    data: {
      adSoyad: `${ONEK} Yönetici`,
      rol: 'yonetici',
      email: `${ONEK.toLowerCase()}@ornek.test`,
      password: 'Deneme-1234-parola',
    },
  })
  yonetici = y as unknown as TypedUser
})

afterAll(async () => {
  if (!payload) return
  await payload.delete({ collection: 'ilgi-noktalari', where: { ad: { like: ONEK } } })
  await payload.delete({ collection: 'kullanicilar', where: { adSoyad: { like: ONEK } } })
  await payload.destroy?.()
})

// ═══════════════════════════════════════════════════════════════════════════
describe('içe aktarma yazması', () => {
  it('yeni noktayı kaynak iziyle birlikte oluşturur', async () => {
    const sonuc = await satirlariYaz(payload, yonetici, [
      satir('yeni', { osmKimlik: `node/${ONEK}-yeni`, ad: `${ONEK} Yeni Okul` }),
    ])

    expect(sonuc.eklenen).toBe(1)

    const kayit = await payload.find({
      collection: 'ilgi-noktalari',
      where: { osmKimlik: { equals: `node/${ONEK}-yeni` } },
      limit: 1,
    })

    expect(kayit.docs[0]?.kaynak).toBe('osm')
    expect(kayit.docs[0]?.elleDuzenlendi).toBe(false)
    expect(kayit.docs[0]?.ad).toBe(`${ONEK} Yeni Okul`)
  })

  it('⚠️ içe aktarıcının kendi yazması ELLE DÜZENLENDİ SAYILMAZ', async () => {
    // Bu olmasaydı ilk içe aktarma her kaydı "elle düzenlendi" işaretler ve
    // ikinci içe aktarmada hiçbir şey güncellenmezdi.
    const kimlik = `node/${ONEK}-izsiz`
    await satirlariYaz(payload, yonetici, [
      satir('yeni', { osmKimlik: kimlik, ad: `${ONEK} İzsiz` }),
    ])

    const ilk = await payload.find({
      collection: 'ilgi-noktalari',
      where: { osmKimlik: { equals: kimlik } },
      limit: 1,
    })
    const id = ilk.docs[0]?.id as number

    await satirlariYaz(payload, yonetici, [
      satir('guncellenecek', { osmKimlik: kimlik, ad: `${ONEK} İzsiz Güncel` }, id),
    ])

    const sonra = await payload.findByID({ collection: 'ilgi-noktalari', id })
    expect(sonra.ad).toBe(`${ONEK} İzsiz Güncel`)
    expect(sonra.elleDuzenlendi).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('elle düzeltme koruması', () => {
  it('⭐ panelden düzenleme kaydı İŞARETLER', async () => {
    const kimlik = `node/${ONEK}-elle`
    await satirlariYaz(payload, yonetici, [
      satir('yeni', { osmKimlik: kimlik, ad: `${ONEK} Elle` }),
    ])

    const bulunan = await payload.find({
      collection: 'ilgi-noktalari',
      where: { osmKimlik: { equals: kimlik } },
      limit: 1,
    })
    const id = bulunan.docs[0]?.id as number

    // İnsan düzenlemesi: `context.osmIceAktarma` YOK.
    await payload.update({
      collection: 'ilgi-noktalari',
      id,
      data: { ad: `${ONEK} Elle Düzeltilmiş` },
      user: yonetici,
      overrideAccess: false,
    })

    const sonra = await payload.findByID({ collection: 'ilgi-noktalari', id })
    expect(sonra.elleDuzenlendi).toBe(true)
  })

  it('⭐ işaretli kayıt içe aktarmada EZİLMEZ', async () => {
    const kimlik = `node/${ONEK}-korunan`
    await satirlariYaz(payload, yonetici, [
      satir('yeni', { osmKimlik: kimlik, ad: `${ONEK} OSM Adı` }),
    ])

    const bulunan = await payload.find({
      collection: 'ilgi-noktalari',
      where: { osmKimlik: { equals: kimlik } },
      limit: 1,
    })
    const id = bulunan.docs[0]?.id as number

    // İnsan adı düzeltiyor.
    await payload.update({
      collection: 'ilgi-noktalari',
      id,
      data: { ad: `${ONEK} Doğru Ad` },
      user: yonetici,
      overrideAccess: false,
    })

    // İçe aktarma tekrar çalışıyor ve OSM adını geri yazmaya çalışıyor.
    const sonuc = await satirlariYaz(payload, yonetici, [
      satir('korunacak', { osmKimlik: kimlik, ad: `${ONEK} OSM Adı` }, id),
    ])

    expect(sonuc.korunan).toBe(1)
    expect(sonuc.guncellenen).toBe(0)

    const sonra = await payload.findByID({ collection: 'ilgi-noktalari', id })
    expect(sonra.ad).toBe(`${ONEK} Doğru Ad`)
  })

  it('işaret kaldırılırsa kayıt tekrar güncellenebilir', async () => {
    const kimlik = `node/${ONEK}-serbest`
    await satirlariYaz(payload, yonetici, [
      satir('yeni', { osmKimlik: kimlik, ad: `${ONEK} Serbest` }),
    ])

    const bulunan = await payload.find({
      collection: 'ilgi-noktalari',
      where: { osmKimlik: { equals: kimlik } },
      limit: 1,
    })
    const id = bulunan.docs[0]?.id as number

    await payload.update({
      collection: 'ilgi-noktalari',
      id,
      data: { ad: `${ONEK} Elle` },
      user: yonetici,
      overrideAccess: false,
    })
    expect((await payload.findByID({ collection: 'ilgi-noktalari', id })).elleDuzenlendi).toBe(true)

    // Kullanıcı işareti bilerek kaldırıyor: "bunu tekrar OSM'den güncelle".
    await payload.update({
      collection: 'ilgi-noktalari',
      id,
      data: { elleDuzenlendi: false },
      user: yonetici,
      overrideAccess: false,
    })

    const sonra = await payload.findByID({ collection: 'ilgi-noktalari', id })
    expect(sonra.elleDuzenlendi).toBe(false)
  })

  it('elle girilmiş (OSM olmayan) kayda iz basılmaz', async () => {
    const kayit = await payload.create({
      collection: 'ilgi-noktalari',
      data: {
        ad: `${ONEK} Saha Gözlemi`,
        tip: 'market',
        konum: [27.8, 41.16],
        kaynak: 'elle',
      },
      user: yonetici,
      overrideAccess: false,
    })

    await payload.update({
      collection: 'ilgi-noktalari',
      id: kayit.id,
      data: { ad: `${ONEK} Saha Gözlemi 2` },
      user: yonetici,
      overrideAccess: false,
    })

    const sonra = await payload.findByID({ collection: 'ilgi-noktalari', id: kayit.id })
    // İşaret yalnızca OSM kayıtları için anlamlı.
    expect(sonra.elleDuzenlendi).toBe(false)
  })
})
