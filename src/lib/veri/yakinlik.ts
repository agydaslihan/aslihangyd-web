import 'server-only'

import { cache } from 'react'

import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import { POI_TIPLERI, type PoiTipi } from '@/collections/IlgiNoktalari'
import {
  YOGUNLUK_YARICAPI_METRE,
  type MahalleYakinligi,
  type PoiMesafesi,
} from '@/lib/yakinlik/tipler'

import { payloadGetir } from './istemci'

/**
 * PostGIS yakınlık sorguları.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN HAM SQL
 *
 * Payload'ın sorgu katmanı coğrafi işleç bilmiyor: "en yakın okul" ya da
 * "1 km içindeki market sayısı" `where` ile ifade edilemez. CLAUDE.md bu
 * durumu öngörüyor ve tek bir şart koşuyor: **PostGIS sorguları ham SQL ile,
 * parametreli.**
 *
 * Buradaki her dış değer drizzle'ın `sql` şablonuna interpolasyonla girer;
 * drizzle bunları $1, $2 … bağlı parametrelerine çevirir. Hiçbir yerde
 * dize birleştirmesiyle SQL kurulmuyor — kurulmamalı da.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ERİŞİM DENETİMİ HAM SQL'DE ÇALIŞMAZ
 *
 * Ham SQL, Payload'ın `access.read` kurallarını ATLAR. Bu yüzden:
 *
 *  - `noktayaGoreYakinlik` yalnızca **koordinat** alır. Çağıran, mahalleyi
 *    zaten Payload üzerinden (erişim denetimiyle) çekmiş olur; buraya
 *    yalnızca merkez noktası geçer. Sorgulanan tablo `ilgi_noktalari`
 *    ve bu koleksiyon zaten herkese açık (`herkesOkur`).
 *  - `tumMahallelerinYakinligi` yayında olmayan mahalleleri de döndürür;
 *    bu yüzden YALNIZCA panel görünümlerinde, oturum doğrulandıktan sonra
 *    çağrılır. Ziyaretçiye açık bir rotadan çağrılmamalıdır.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** SRID 0 ile kaydedilmiş noktaların da doğru hesaplanması için. */
const SRID = 4326

const GECERLI_TIPLER = new Set<string>(POI_TIPLERI.map((t) => t.value))

function drizzleAl(payload: Payload) {
  // Payload `db` alanını taban adaptör tipiyle veriyor; postgres adaptörünün
  // `drizzle` örneğine ulaşmak için daraltıyoruz. `any` kullanılmadı.
  return (payload.db as unknown as PostgresAdapter).drizzle
}

function sayiya(deger: unknown): number | null {
  if (typeof deger === 'number') return Number.isFinite(deger) ? deger : null
  // `count()` bigint döndürür ve sürücü dize olarak verir.
  if (typeof deger === 'string') {
    const sayi = Number(deger)
    return Number.isFinite(sayi) ? sayi : null
  }
  return null
}

/** Ham satırı `PoiMesafesi`ye çevirir; şüpheli satırı sessizce atar. */
function satiriCoz(satir: Record<string, unknown>): PoiMesafesi | null {
  const tip = satir.tip
  if (typeof tip !== 'string' || !GECERLI_TIPLER.has(tip)) return null

  const metre = sayiya(satir.en_yakin_metre)
  if (metre === null) return null

  const ad = satir.en_yakin_ad
  if (typeof ad !== 'string' || ad.length === 0) return null

  const kaynak = satir.en_yakin_kaynak

  return {
    tip: tip as PoiTipi,
    enYakinAd: ad,
    enYakinMetre: Math.round(metre),
    yakindaSayi: sayiya(satir.yakinda_sayi) ?? 0,
    onemli: satir.en_yakin_onemli === true,
    kaynak: kaynak === 'osm' || kaynak === 'google' ? kaynak : 'elle',
    enYakinId: sayiya(satir.en_yakin_id),
    // ⚠️ Kimliğin KENDİSİ taşınmıyor, yalnızca varlığı — gerekçesi
    // `PoiMesafesi` tanımında yazılı.
    googleBagliMi:
      typeof satir.en_yakin_google_place_id === 'string' &&
      satir.en_yakin_google_place_id.trim() !== '',
  }
}

/**
 * Verilen noktaya göre her POI tipinin en yakın örneği ve yoğunluğu.
 *
 * Mesafe **kuş uçuşudur** (`geography` üzerinden jeodezik). Sürüş süresi
 * değildir; arayüz bunu böyle etiketler.
 *
 * @param boylam  Doğu-batı (longitude) — Payload `point` alanının 1. öğesi
 * @param enlem   Kuzey-güney (latitude) — 2. öğe
 */
export async function noktayaGoreYakinlik(
  boylam: number,
  enlem: number,
  yaricapMetre: number = YOGUNLUK_YARICAPI_METRE,
): Promise<PoiMesafesi[]> {
  if (!Number.isFinite(boylam) || !Number.isFinite(enlem)) return []

  try {
    const payload = await payloadGetir()

    const sonuc = await drizzleAl(payload).execute(sql`
      WITH hedef AS (
        SELECT ST_SetSRID(ST_MakePoint(${boylam}, ${enlem}), ${SRID})::geography AS g
      ),
      mesafeler AS (
        SELECT
          p."id"     AS id,
          p."tip"    AS tip,
          p."ad"     AS ad,
          p."onemli" AS onemli,
          p."kaynak" AS kaynak,
          p."google_place_id" AS google_place_id,
          ST_Distance(ST_SetSRID(p."konum", ${SRID})::geography, hedef.g) AS metre
        FROM "ilgi_noktalari" p
        CROSS JOIN hedef
      )
      SELECT
        tip,
        (array_agg(ad     ORDER BY metre, ad))[1] AS en_yakin_ad,
        (array_agg(id     ORDER BY metre, ad))[1] AS en_yakin_id,
        (array_agg(onemli ORDER BY metre, ad))[1] AS en_yakin_onemli,
        (array_agg(kaynak ORDER BY metre, ad))[1] AS en_yakin_kaynak,
        (array_agg(google_place_id ORDER BY metre, ad))[1] AS en_yakin_google_place_id,
        min(metre)                                AS en_yakin_metre,
        count(*) FILTER (WHERE metre <= ${yaricapMetre}) AS yakinda_sayi
      FROM mesafeler
      GROUP BY tip
    `)

    const satirlar = (sonuc.rows ?? []) as Record<string, unknown>[]
    return satirlar.map(satiriCoz).filter((m): m is PoiMesafesi => m !== null)
  } catch {
    // Yakınlık bir zenginleştirmedir; PostGIS erişilemezse sayfa yine
    // açılmalı ve bölüm boş durumunu göstermeli.
    return []
  }
}

/**
 * Merkez noktası tanımlı TÜM mahalleler için yakınlık özeti.
 *
 * ⚠️ Yayında olmayan mahalleleri de içerir — yalnızca panelde kullanılır.
 * Tek sorguda döner; mahalle başına ayrı gidiş dönüş yapılmaz.
 */
export async function tumMahallelerinYakinligi(
  yaricapMetre: number = YOGUNLUK_YARICAPI_METRE,
): Promise<MahalleYakinligi[]> {
  try {
    const payload = await payloadGetir()

    const sonuc = await drizzleAl(payload).execute(sql`
      WITH mahalle AS (
        SELECT
          m."slug" AS slug,
          m."ad"   AS ad,
          ST_SetSRID(m."merkez", ${SRID})::geography AS g
        FROM "mahalleler" m
        WHERE m."merkez" IS NOT NULL AND m."slug" IS NOT NULL
      ),
      mesafeler AS (
        SELECT
          mh.slug    AS slug,
          mh.ad      AS mahalle_ad,
          p."id"     AS poi_id,
          p."tip"    AS tip,
          p."ad"     AS poi_ad,
          p."onemli" AS onemli,
          p."kaynak" AS kaynak,
          p."google_place_id" AS google_place_id,
          ST_Distance(ST_SetSRID(p."konum", ${SRID})::geography, mh.g) AS metre
        FROM mahalle mh
        CROSS JOIN "ilgi_noktalari" p
      )
      SELECT
        slug,
        mahalle_ad,
        tip,
        (array_agg(poi_ad ORDER BY metre, poi_ad))[1] AS en_yakin_ad,
        (array_agg(poi_id ORDER BY metre, poi_ad))[1] AS en_yakin_id,
        (array_agg(onemli ORDER BY metre, poi_ad))[1] AS en_yakin_onemli,
        (array_agg(kaynak ORDER BY metre, poi_ad))[1] AS en_yakin_kaynak,
        (array_agg(google_place_id ORDER BY metre, poi_ad))[1] AS en_yakin_google_place_id,
        min(metre)                                    AS en_yakin_metre,
        count(*) FILTER (WHERE metre <= ${yaricapMetre}) AS yakinda_sayi
      FROM mesafeler
      GROUP BY slug, mahalle_ad, tip
      ORDER BY mahalle_ad, tip
    `)

    const satirlar = (sonuc.rows ?? []) as Record<string, unknown>[]
    const mahalleler = new Map<string, MahalleYakinligi>()

    for (const satir of satirlar) {
      const slug = satir.slug
      const ad = satir.mahalle_ad
      if (typeof slug !== 'string' || typeof ad !== 'string') continue

      const mesafe = satiriCoz(satir)
      if (!mesafe) continue

      const mevcut = mahalleler.get(slug)
      if (mevcut) {
        ;(mevcut.mesafeler as PoiMesafesi[]).push(mesafe)
      } else {
        mahalleler.set(slug, { slug, ad, mesafeler: [mesafe] })
      }
    }

    return [...mahalleler.values()]
  } catch {
    return []
  }
}

/**
 * Veri tabanında **en az bir kaydı bulunan** POI tipleri.
 *
 * Motorun en önemli korumasını besler: hiç istasyon kaydı yoksa hiçbir
 * mahalle "istasyona uzak" diye cezalandırılmaz (bkz. `yakinlik/motor.ts`).
 */
export const poiVeriKapsamiGetir = cache(async (): Promise<Set<PoiTipi>> => {
  try {
    const payload = await payloadGetir()

    const sonuc = await drizzleAl(payload).execute(sql`
      SELECT DISTINCT "tip" AS tip FROM "ilgi_noktalari"
    `)

    const satirlar = (sonuc.rows ?? []) as Record<string, unknown>[]
    const kapsam = new Set<PoiTipi>()

    for (const satir of satirlar) {
      const tip = satir.tip
      if (typeof tip === 'string' && GECERLI_TIPLER.has(tip)) kapsam.add(tip as PoiTipi)
    }

    return kapsam
  } catch {
    return new Set<PoiTipi>()
  }
})

/**
 * Bir mahallenin çevre özeti — sayfa bileşeninin doğrudan kullandığı yol.
 *
 * `merkez`, Payload'dan gelen `point` alanıdır: `[boylam, enlem]`.
 */
export const mahalleCevresiGetir = cache(async (merkez: unknown): Promise<PoiMesafesi[]> => {
  if (!Array.isArray(merkez) || merkez.length < 2) return []
  const [boylam, enlem] = merkez
  if (typeof boylam !== 'number' || typeof enlem !== 'number') return []
  return noktayaGoreYakinlik(boylam, enlem)
})

/**
 * Sanayi alanlarına kuş uçuşu mesafe.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BURADA İLÇE BİLGİSİ ÜRETİLMİYOR — VE BU BİR ÖLÇÜMÜN SONUCU.
 *
 * İlk tasarım "nokta mahalle sınırlarımızın içine düşüyorsa Çorlu'dadır"
 * diyordu. Zarif görünüyordu ve YANLIŞTI: mahalle poligonları ilçenin
 * tamamını kaplamıyor. Üretimde ölçüldü — 544 ilgi noktasının yalnızca
 * 438'i (%80) herhangi bir mahalle sınırının içinde. Aradaki kırsal ve
 * sanayi alanları hiçbir mahalleye ait değil.
 *
 * Sonuç: Çorlu Deri OSB "sınır dışında" çıkıyordu; oysa Çorlu Ticaret ve
 * Sanayi Odası onu Çorlu ilçesi altında listeliyor. Geometri "hangi
 * ilçede" sorusunu değil, "hangi mahallede" sorusunu cevaplıyor.
 *
 * İlçe bilgisi artık kaynaklı bir eşlemeden geliyor (`lib/mahalle/olgusal.ts`).
 * ─────────────────────────────────────────────────────────────────────────
 */
export interface SanayiMesafesi {
  ad: string
  metre: number
}

export async function sanayiMesafeleri(boylam: number, enlem: number): Promise<SanayiMesafesi[]> {
  if (!Number.isFinite(boylam) || !Number.isFinite(enlem)) return []

  try {
    const payload = await payloadGetir()

    const sonuc = await drizzleAl(payload).execute(sql`
      WITH hedef AS (
        SELECT ST_SetSRID(ST_MakePoint(${boylam}, ${enlem}), ${SRID})::geography AS g
      )
      SELECT
        p."ad" AS ad,
        ST_Distance(ST_SetSRID(p."konum", ${SRID})::geography, hedef.g) AS metre
      FROM "ilgi_noktalari" p
      CROSS JOIN hedef
      WHERE p."tip" = 'sanayi'
        AND (p."ad" ILIKE '%organize sanayi%' OR p."ad" ILIKE '%serbest bölge%')
      ORDER BY metre
    `)

    const satirlar = (sonuc.rows ?? []) as Record<string, unknown>[]
    return satirlar
      .map((satir) => {
        const ad = typeof satir.ad === 'string' ? satir.ad : ''
        const metre = Number(satir.metre)
        if (ad === '' || !Number.isFinite(metre)) return null
        return { ad, metre }
      })
      .filter((s): s is SanayiMesafesi => s !== null)
  } catch {
    return []
  }
}

/**
 * Çorlu'nun kaba merkezi — mahalle merkezlerinden TÜRETİLİR.
 *
 * ⚠️ KOORDİNAT KODA GÖMÜLMEZ (CLAUDE.md, OSM bölümü). Mahalle merkezleri
 * zaten sistemde; ilçe merkezi onların ağırlık merkezi. Elle yazılmış bir
 * koordinat, mahalle sınırları güncellendiğinde sessizce yanlışa döner.
 */
export const corluMerkeziGetir = cache(
  async (): Promise<{ boylam: number; enlem: number } | null> => {
    try {
      const payload = await payloadGetir()

      const sonuc = await drizzleAl(payload).execute(sql`
        SELECT
          ST_X(ST_Centroid(ST_Collect(ST_SetSRID(m."merkez", ${SRID})))) AS boylam,
          ST_Y(ST_Centroid(ST_Collect(ST_SetSRID(m."merkez", ${SRID})))) AS enlem
        FROM "mahalleler" m
        WHERE m."merkez" IS NOT NULL
      `)

      const satir = (sonuc.rows ?? [])[0] as Record<string, unknown> | undefined
      if (!satir) return null
      const boylam = Number(satir.boylam)
      const enlem = Number(satir.enlem)
      if (!Number.isFinite(boylam) || !Number.isFinite(enlem)) return null
      return { boylam, enlem }
    } catch {
      return null
    }
  },
)
