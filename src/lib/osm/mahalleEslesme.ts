import 'server-only'

import { sql } from '@payloadcms/db-postgres/drizzle'
import type { Payload } from 'payload'

/**
 * POI → mahalle eşleştirmesi — nokta-poligon testi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: "ÇEVRE" BÖLÜMÜ ÇALIŞMIYORDU.
 *
 * OSM'den yüzlerce POI geliyordu ama hiçbirinde "hangi mahallede" bilgisi
 * yoktu; alan vardı, dolduran yoktu. Mahalle sayfalarındaki çevre bölümü
 * bu ilişkiye dayandığı için boş kalıyordu.
 *
 * 26 mahallenin PostGIS poligonu geldikten sonra bu soru artık
 * cevaplanabilir: nokta hangi poligonun içinde?
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ İKİ KADEME VE ARALARINDAKİ FARK GİZLENMİYOR
 *
 * 1. Nokta bir mahalle poligonunun İÇİNDE → kesin eşleşme
 * 2. Hiçbir poligona düşmüyor → en yakın mahalle MERKEZİNE atanır ve
 *    **`mahalleYaklasik` işaretlenir**
 *
 * İkinci kademe gerekli: OSM'de sınır kapsaması eksiksiz değil ve ilçe
 * sınırına yakın noktalar hiçbir poligona düşmeyebiliyor. Ama "yaklaşık"
 * ile "kesin" aynı kutuya konsaydı, mahalle sayfası komşu mahallenin
 * okulunu kendi okulu gibi gösterirdi ve bunu kimse fark edemezdi.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Payload'ın drizzle örneği — `lib/veri/yakinlik.ts` ile aynı desen. */
function drizzleAl(payload: Payload) {
  const veritabani = payload.db as unknown as {
    drizzle: { execute: (sorgu: unknown) => Promise<unknown> }
  }
  return veritabani.drizzle
}

/** Payload `point` alanları WGS84. */
const SRID = 4326

export interface EslesmeGirdisi {
  /** Çağıranın satırını geri bulması için sıra numarası. */
  sira: number
  boylam: number
  enlem: number
}

export interface EslesmeSonucu {
  sira: number
  mahalleId: number | null
  mahalleAdi: string | null
  /** Poligon içinde değil, en yakın merkeze atandı. */
  yaklasik: boolean
  /** Yaklaşık eşleşmede merkeze uzaklık (metre). */
  metre: number | null
}

interface HamSatir {
  sira: unknown
  icinde_id: unknown
  icinde_ad: unknown
  yakin_id: unknown
  yakin_ad: unknown
  metre: unknown
}

function sayi(deger: unknown): number | null {
  if (typeof deger === 'number' && Number.isFinite(deger)) return deger
  if (typeof deger === 'string') {
    const cozulen = Number(deger)
    return Number.isFinite(cozulen) ? cozulen : null
  }
  return null
}

/**
 * Bir grup noktayı TEK sorguda mahallelere eşleştirir.
 *
 * ⚠️ Nokta başına sorgu atılmıyor. Yüzlerce POI'lik bir içe aktarmada
 * nokta başına gidip gelmek, veritabanına yüzlerce tur demek olurdu;
 * hepsi tek `VALUES` listesiyle tek turda çözülüyor.
 *
 * ⚠️ `ST_MakeValid` bilinçli: OSM poligonları kendi kendini kesebiliyor ve
 * geçersiz geometride `ST_Contains` hata fırlatıp **bütün içe aktarmayı**
 * düşürürdü. Bozuk bir sınır yüzünden 400 POI'nin kaybolması, o sınırı
 * onarmaktan çok daha pahalı.
 */
export async function mahalleleriEslestir(
  payload: Payload,
  girdiler: readonly EslesmeGirdisi[],
): Promise<Map<number, EslesmeSonucu>> {
  const sonuc = new Map<number, EslesmeSonucu>()
  if (girdiler.length === 0) return sonuc

  /**
   * ⚠️ NOKTALAR `VALUES` İLE VERİLİYOR, DİZİ PARAMETRESİYLE DEĞİL.
   *
   * İlk hâli `unnest(${siralar}::int[], …)` idi ve PostgreSQL
   * `cannot cast type record to integer[]` dedi: drizzle bir JS dizisini
   * TEK parametre olarak değil, virgülle ayrılmış parametre listesi olarak
   * açıyor (`($1, $2)`), o da diziye değil kayıt tipine dönüşüyor.
   *
   * `sql.join` ile kurulan `VALUES` listesinde her değer yine ayrı bir
   * parametre — yani enjeksiyona kapalı — ama sözdizimi doğru.
   */
  const noktaDegerleri = sql.join(
    girdiler.map((g) => sql`(${g.sira}::int, ${g.boylam}::float8, ${g.enlem}::float8)`),
    sql`, `,
  )

  const cevap = (await drizzleAl(payload).execute(sql`
    WITH nokta(sira, lon, lat) AS (
      VALUES ${noktaDegerleri}
    ),
    poligon AS (
      SELECT
        "id"  AS id,
        "ad"  AS ad,
        ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON("sinir"::text), ${SRID})) AS g
      FROM "mahalleler"
      WHERE "sinir" IS NOT NULL
    ),
    merkezler AS (
      SELECT "id" AS id, "ad" AS ad, ST_SetSRID("merkez", ${SRID})::geography AS g
      FROM "mahalleler"
      WHERE "merkez" IS NOT NULL
    )
    SELECT
      n.sira        AS sira,
      icinde.id     AS icinde_id,
      icinde.ad     AS icinde_ad,
      yakin.id      AS yakin_id,
      yakin.ad      AS yakin_ad,
      yakin.metre   AS metre
    FROM nokta n
    LEFT JOIN LATERAL (
      SELECT p.id, p.ad
      FROM poligon p
      WHERE ST_Contains(p.g, ST_SetSRID(ST_MakePoint(n.lon, n.lat), ${SRID}))
      LIMIT 1
    ) icinde ON true
    LEFT JOIN LATERAL (
      SELECT
        c.id,
        c.ad,
        ST_Distance(c.g, ST_SetSRID(ST_MakePoint(n.lon, n.lat), ${SRID})::geography) AS metre
      FROM merkezler c
      ORDER BY c.g <-> ST_SetSRID(ST_MakePoint(n.lon, n.lat), ${SRID})::geography
      LIMIT 1
    ) yakin ON true
  `)) as { rows?: HamSatir[] } | HamSatir[]

  const satirlar: HamSatir[] = Array.isArray(cevap) ? cevap : (cevap.rows ?? [])

  for (const satir of satirlar) {
    const sira = sayi(satir.sira)
    if (sira === null) continue

    const icindeId = sayi(satir.icinde_id)
    if (icindeId !== null) {
      sonuc.set(sira, {
        sira,
        mahalleId: icindeId,
        mahalleAdi: typeof satir.icinde_ad === 'string' ? satir.icinde_ad : null,
        yaklasik: false,
        metre: null,
      })
      continue
    }

    const yakinId = sayi(satir.yakin_id)
    sonuc.set(sira, {
      sira,
      mahalleId: yakinId,
      mahalleAdi: typeof satir.yakin_ad === 'string' ? satir.yakin_ad : null,
      // ⚠️ Hiç mahalle bulunamadıysa "yaklaşık" da denmiyor: yaklaşık bir
      // şey yok, hiçbir şey yok. Boş bırakmak, yanlış bilgiden iyidir.
      yaklasik: yakinId !== null,
      metre: sayi(satir.metre),
    })
  }

  return sonuc
}

/** Eşleşme özeti — panelde gösterilen sayılar. */
export interface EslesmeOzeti {
  kesin: number
  yaklasik: number
  eslesmeyen: number
}

export function eslesmeyiOzetle(sonuclar: Iterable<EslesmeSonucu>): EslesmeOzeti {
  const ozet: EslesmeOzeti = { kesin: 0, yaklasik: 0, eslesmeyen: 0 }

  for (const sonuc of sonuclar) {
    if (sonuc.mahalleId === null) ozet.eslesmeyen += 1
    else if (sonuc.yaklasik) ozet.yaklasik += 1
    else ozet.kesin += 1
  }

  return ozet
}
