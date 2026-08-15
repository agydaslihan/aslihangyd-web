import 'server-only'

import { cache } from 'react'

import type { RayicKaynagi } from '@/lib/rayic/tipler'

import { payloadGetir, ZIYARETCI } from './istemci'

/**
 * Rayiç bedel okuma yolu.
 *
 * ⚠️ MAHALLE GENELİ KAYIT KULLANILIR, SOKAK BAZLI OLAN DEĞİL.
 *
 * Belediye tabloları sokak bazında gelir ve bir mahallede yüzlerce sokak
 * olabilir. Mahalle sayfasında "bu mahallenin rayiç bedeli" derken tek bir
 * sokağın rakamını göstermek yanıltıcı olurdu — o sokak mahallenin en
 * pahalı ya da en ucuz yeri olabilir.
 *
 * Bu yüzden site, sokağı BOŞ olan kaydı (mahallenin geneli) arar. Yoksa
 * mahalle için rayiç gösterilmez; sokak bazlı kayıtlar panelde ve alım
 * maliyeti hesabında durmaya devam eder.
 *
 * ⚠️ EN SON YIL SEÇİLİR. Rayiç bedel her yıl artar; eski bir yılın
 * rakamıyla hesaplanan oran, piyasayı olduğundan pahalı gösterir.
 */

export interface MahalleRayici {
  mahalleId: number
  yil: number
  metrekareRayicBedel: number | null
  arsaRayicBedel: number | null
  kaynak: RayicKaynagi
  guncellemeTarihi: string | null
}

function kayitCoz(kayit: Record<string, unknown>): MahalleRayici | null {
  const mahalle = kayit.mahalle
  const mahalleId =
    typeof mahalle === 'object' && mahalle !== null
      ? Number((mahalle as { id?: unknown }).id)
      : Number(mahalle)

  const yil = kayit.yil
  if (!Number.isFinite(mahalleId) || typeof yil !== 'number') return null

  const sayi = (deger: unknown): number | null =>
    typeof deger === 'number' && Number.isFinite(deger) && deger > 0 ? deger : null

  return {
    mahalleId,
    yil,
    metrekareRayicBedel: sayi(kayit.metrekareRayicBedel),
    arsaRayicBedel: sayi(kayit.arsaRayicBedel),
    kaynak: (kayit.kaynak ?? 'elle') as RayicKaynagi,
    guncellemeTarihi: typeof kayit.guncellemeTarihi === 'string' ? kayit.guncellemeTarihi : null,
  }
}

/**
 * Bir mahallenin en güncel, mahalle geneli rayiç bedeli.
 *
 * Veri yoksa `null` — arayüz kendi boş durumunu gösterir. Uydurma bir
 * rakama düşülmez (CLAUDE.md kural 2).
 */
export const mahalleRayiciGetir = cache(
  async (mahalleId: number): Promise<MahalleRayici | null> => {
    try {
      const payload = await payloadGetir()

      const sonuc = await payload.find({
        collection: 'rayic-degerler',
        where: {
          and: [{ mahalle: { equals: mahalleId } }, { sokak: { exists: false } }],
        },
        // En yeni yıl önce.
        sort: '-yil',
        limit: 1,
        depth: 0,
        ...ZIYARETCI,
      })

      const kayit = sonuc.docs[0]
      return kayit ? kayitCoz(kayit as unknown as Record<string, unknown>) : null
    } catch {
      return null
    }
  },
)

/** Rayiç bedeli olan tüm mahalleler — hesaplayıcının seçim listesi. */
export const rayicliMahalleleriGetir = cache(
  async (): Promise<{ mahalleId: number; ad: string; rayic: MahalleRayici }[]> => {
    try {
      const payload = await payloadGetir()

      const sonuc = await payload.find({
        collection: 'rayic-degerler',
        where: { sokak: { exists: false } },
        sort: '-yil',
        limit: 500,
        depth: 1,
        ...ZIYARETCI,
      })

      const enYeni = new Map<number, { mahalleId: number; ad: string; rayic: MahalleRayici }>()

      for (const ham of sonuc.docs) {
        const kayit = ham as unknown as Record<string, unknown>
        const rayic = kayitCoz(kayit)
        if (!rayic || rayic.metrekareRayicBedel === null) continue

        const mahalle = kayit.mahalle
        const ad =
          typeof mahalle === 'object' && mahalle !== null
            ? String((mahalle as { ad?: unknown }).ad ?? '')
            : ''
        if (ad === '') continue

        // `sort: '-yil'` sayesinde ilk gelen en yeni yıl; sonrakiler eskidir.
        if (!enYeni.has(rayic.mahalleId)) {
          enYeni.set(rayic.mahalleId, { mahalleId: rayic.mahalleId, ad, rayic })
        }
      }

      return [...enYeni.values()].sort((a, b) => a.ad.localeCompare(b.ad, 'tr'))
    } catch {
      return []
    }
  },
)
