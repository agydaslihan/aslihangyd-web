import 'server-only'

import { cache } from 'react'

import type { Mahalleler } from '@/payload-types'

import { payloadGetir, ZIYARETCI } from './istemci'
import { MEDYA_POPULATE } from './medyaAlanlari'

export const mahalleleriGetir = cache(async (): Promise<Mahalleler[]> => {
  const payload = await payloadGetir()

  const sonuc = await payload.find({
    collection: 'mahalleler',
    where: { yayinda: { equals: true } },
    sort: ['siraNo', 'ad'],
    limit: 100,
    depth: 1,
    populate: MEDYA_POPULATE,
    ...ZIYARETCI,
  })

  return sonuc.docs
})

export const mahalleGetir = cache(async (slug: string): Promise<Mahalleler | null> => {
  const payload = await payloadGetir()

  const sonuc = await payload.find({
    collection: 'mahalleler',
    where: { and: [{ yayinda: { equals: true } }, { slug: { equals: slug } }] },
    limit: 1,
    depth: 1,
    populate: MEDYA_POPULATE,
    ...ZIYARETCI,
  })

  return sonuc.docs[0] ?? null
})

/**
 * Karşılaştırma için diğer mahalleler.
 *
 * Yalnızca **rakamı olan** mahalleler döner: karşılaştırma tablosunda iki
 * boş sütun göstermek, karşılaştırmayı anlamsız kılar.
 */
export async function karsilastirilabilirMahalleler(
  haricSlug: string,
  limit = 3,
): Promise<Mahalleler[]> {
  const payload = await payloadGetir()

  const sonuc = await payload.find({
    collection: 'mahalleler',
    where: {
      and: [
        { yayinda: { equals: true } },
        { slug: { not_equals: haricSlug } },
        { ortalamaM2Satis: { exists: true } },
      ],
    },
    sort: ['siraNo', 'ad'],
    limit,
    depth: 0,
    ...ZIYARETCI,
  })

  return sonuc.docs
}
