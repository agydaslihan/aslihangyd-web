import { sql } from '@payloadcms/db-postgres/drizzle'
import type { Payload } from 'payload'

import { konumuDenetle, type KonumDurumu } from './dogrula'

/**
 * Kayıtlı koordinatların taranması.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: 13 EYLÜL 2026 TARAMASI ELLE YAZILMIŞ BİR SORGUYDU.
 *
 * İlan #4 (ters) ve #2 (`POINT(1 1)`) sunucuda psql'e yapıştırılan bir
 * sorguyla bulundu. O sorgu kendi aralık denetimini SQL'de tekrar
 * ediyordu — yani panelin uyarısıyla ayrışabilecek ikinci bir kural.
 *
 * Burada SQL yalnızca OKUYOR; sınıflandırma panelle aynı motor
 * (`konumuDenetle`). Panel "ters" diyorsa tarama da "ters" der.
 *
 * ⚠️ Enlem `ST_Y`, boylam `ST_X` — GeoJSON sırası. Bu eşleme ters
 * yazılsaydı tarama doğru kayıtları bozuk, bozukları doğru sayardı;
 * entegrasyon testi bunu gerçek bir kayıtla kilitliyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type KonumKaynagi = 'ilan' | 'mahalle' | 'ilgi_noktasi'

export interface SorunluKonum {
  kaynak: KonumKaynagi
  id: number
  ad: string
  enlem: number
  boylam: number
  durum: Exclude<KonumDurumu, 'tamam' | 'eksik'>
  /** Takas edilince Çorlu'ya düşüyorsa düzeltilmiş değer. */
  takas: { enlem: number; boylam: number } | null
}

interface HamSatir {
  kaynak: unknown
  id: unknown
  ad: unknown
  enlem: unknown
  boylam: unknown
}

/** Payload'ın drizzle örneği — `lib/osm/mahalleEslesme.ts` ile aynı desen. */
function drizzleAl(payload: Payload) {
  const veritabani = payload.db as unknown as {
    drizzle: { execute: (sorgu: unknown) => Promise<unknown> }
  }
  return veritabani.drizzle
}

/** Ham satırları motordan geçirir — saf, veritabanısız test edilebilir. */
export function sorunluKonumlariAyikla(satirlar: readonly HamSatir[]): SorunluKonum[] {
  const sorunlular: SorunluKonum[] = []

  for (const satir of satirlar) {
    const enlem = Number(satir.enlem)
    const boylam = Number(satir.boylam)
    const denetim = konumuDenetle(enlem, boylam)
    if (denetim.durum === 'tamam' || denetim.durum === 'eksik') continue

    sorunlular.push({
      kaynak: satir.kaynak as KonumKaynagi,
      id: Number(satir.id),
      ad: String(satir.ad ?? ''),
      enlem,
      boylam,
      durum: denetim.durum,
      takas: denetim.takas,
    })
  }

  return sorunlular
}

/** İlan, mahalle ve ilgi noktası koordinatlarını tarar; yalnızca sorunluları döner. */
export async function konumlariTara(payload: Payload): Promise<SorunluKonum[]> {
  const cevap = (await drizzleAl(payload).execute(sql`
    SELECT 'ilan' AS kaynak, id, baslik AS ad, ST_Y(konum) AS enlem, ST_X(konum) AS boylam
      FROM ilanlar WHERE konum IS NOT NULL
    UNION ALL
    SELECT 'mahalle', id, ad, ST_Y(merkez), ST_X(merkez)
      FROM mahalleler WHERE merkez IS NOT NULL
    UNION ALL
    SELECT 'ilgi_noktasi', id, ad, ST_Y(konum), ST_X(konum)
      FROM ilgi_noktalari WHERE konum IS NOT NULL
    ORDER BY 1, 2
  `)) as { rows?: HamSatir[] } | HamSatir[]

  return sorunluKonumlariAyikla(Array.isArray(cevap) ? cevap : (cevap.rows ?? []))
}
