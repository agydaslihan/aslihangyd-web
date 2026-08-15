import 'server-only'

import { cache } from 'react'

import type { Where } from 'payload'

import { payloadGetir, ZIYARETCI } from './istemci'

/**
 * /veri-kaynaklari sayfasının canlı rakamları.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ "SON GÜNCELLEME" ELLE YAZILMAZ
 *
 * Sayfada "POI verisi aylık güncellenir" gibi bir cümle yazıp altına elle
 * bir tarih koymak, o tarihin bir gün mutlaka eskimesi demektir — üstelik
 * eskidiğini kimse fark etmez. Rakamlar ve tarihler veritabanından
 * okunuyor: içe aktarma yapılmadığı sürece tarih ilerlemiyor ve bu
 * ziyaretçiye de görünüyor.
 *
 * ⚠️ Sayım ziyaretçi erişimiyle yapılıyor (`ZIYARETCI`): sayfada görünen
 * sayı, ziyaretçinin gerçekten erişebildiği kayıt sayısıdır. Gözlemler
 * ziyaretçiye kapalı olduğu için oradaki sayı `overrideAccess` ile ayrıca
 * alınıyor — ama yalnızca SAYI, tek bir gözlem bile dışarı verilmiyor
 * (ENDEKS-VERI-YONETIMI.md §8).
 * ─────────────────────────────────────────────────────────────────────────
 */

export interface KaynakOzeti {
  kayitSayisi: number
  /** ISO tarih; hiç kayıt yoksa `null`. */
  sonGuncelleme: string | null
}

export interface VeriKaynaklariOzeti {
  /** OpenStreetMap'ten içe aktarılmış ilgi noktaları. */
  osmNoktalari: KaynakOzeti
  /** Elle girilmiş ilgi noktaları. */
  elleNoktalar: KaynakOzeti
  /** Google yer kimliği bağlanmış noktalar. */
  googleBagliNoktalar: number
  /** OpenStreetMap'ten gelen mahalle sınırları. */
  osmSinirlari: KaynakOzeti
  /** Elle çizilmiş mahalle sınırları. */
  elleSinirlar: number
  /** Fiyat/kira gözlemleri — yalnızca SAYI, içerik değil. */
  gozlemler: KaynakOzeti
  /** Rayiç bedel kayıtları. */
  rayicler: KaynakOzeti & {
    /** Kayıtlarda geçen yıllar, büyükten küçüğe. */
    yillar: number[]
    /** Kaynak dağılımı: belediye / tkgm / elle. */
    kaynaklar: string[]
  }
}

const BOS: KaynakOzeti = { kayitSayisi: 0, sonGuncelleme: null }

/** Koleksiyondaki kayıt sayısı ve en son güncellenen kaydın tarihi. */
async function ozetle(
  payload: Awaited<ReturnType<typeof payloadGetir>>,
  collection: 'ilgi-noktalari' | 'mahalleler' | 'gozlemler' | 'rayic-degerler',
  where: Where,
  ziyaretciyeAcik: boolean,
): Promise<KaynakOzeti> {
  const erisim = ziyaretciyeAcik ? ZIYARETCI : { overrideAccess: true as const }

  const sonuc = await payload.find({
    collection,
    where,
    sort: '-updatedAt',
    limit: 1,
    depth: 0,
    ...erisim,
  })

  const enYeni = sonuc.docs[0] as { updatedAt?: unknown } | undefined

  return {
    kayitSayisi: sonuc.totalDocs,
    sonGuncelleme: typeof enYeni?.updatedAt === 'string' ? enYeni.updatedAt : null,
  }
}

export const veriKaynaklariOzeti = cache(async (): Promise<VeriKaynaklariOzeti> => {
  const bos: VeriKaynaklariOzeti = {
    osmNoktalari: BOS,
    elleNoktalar: BOS,
    googleBagliNoktalar: 0,
    osmSinirlari: BOS,
    elleSinirlar: 0,
    gozlemler: BOS,
    rayicler: { ...BOS, yillar: [], kaynaklar: [] },
  }

  try {
    const payload = await payloadGetir()

    const [osmNoktalari, elleNoktalar, google, osmSinirlari, elleSinirlar, gozlemler, rayicler] =
      await Promise.all([
        ozetle(payload, 'ilgi-noktalari', { kaynak: { equals: 'osm' } }, true),
        ozetle(payload, 'ilgi-noktalari', { kaynak: { not_equals: 'osm' } }, true),
        payload.count({
          collection: 'ilgi-noktalari',
          where: { googlePlaceId: { exists: true } },
          ...ZIYARETCI,
        }),
        ozetle(payload, 'mahalleler', { sinirKaynagi: { equals: 'osm' } }, true),
        payload.count({
          collection: 'mahalleler',
          where: { and: [{ sinir: { exists: true } }, { sinirKaynagi: { not_equals: 'osm' } }] },
          ...ZIYARETCI,
        }),
        // ⚠️ Yalnızca SAYI. Tek bir gözlem kaydı dışarı verilmiyor.
        ozetle(payload, 'gozlemler', {}, false),
        rayicOzeti(payload),
      ])

    return {
      osmNoktalari,
      elleNoktalar,
      googleBagliNoktalar: google.totalDocs,
      osmSinirlari,
      elleSinirlar: elleSinirlar.totalDocs,
      gozlemler,
      rayicler,
    }
  } catch {
    // ⚠️ Sayfa yasal bir yükümlülük (ODbL atfı) taşıyor: veritabanı bir an
    // erişilemez olduğunda sayfanın kendisi kaybolmamalı. Rakamlar boş
    // gösterilir, lisans metinleri yerinde kalır.
    return bos
  }
})

async function rayicOzeti(
  payload: Awaited<ReturnType<typeof payloadGetir>>,
): Promise<VeriKaynaklariOzeti['rayicler']> {
  const temel = await ozetle(payload, 'rayic-degerler', {}, true)

  if (temel.kayitSayisi === 0) return { ...temel, yillar: [], kaynaklar: [] }

  const hepsi = await payload.find({
    collection: 'rayic-degerler',
    limit: 1_000,
    depth: 0,
    ...ZIYARETCI,
  })

  const yillar = new Set<number>()
  const kaynaklar = new Set<string>()

  for (const kayit of hepsi.docs) {
    if (typeof kayit.yil === 'number') yillar.add(kayit.yil)
    if (typeof kayit.kaynak === 'string') kaynaklar.add(kayit.kaynak)
  }

  return {
    ...temel,
    yillar: [...yillar].sort((a, b) => b - a),
    kaynaklar: [...kaynaklar],
  }
}
