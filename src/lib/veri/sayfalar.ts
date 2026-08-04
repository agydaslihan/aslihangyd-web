import 'server-only'

import { cache } from 'react'

import type { Sayfalar } from '@/payload-types'

import { payloadGetir, ZIYARETCI } from './istemci'

export const sayfaGetir = cache(async (slug: string): Promise<Sayfalar | null> => {
  const payload = await payloadGetir()

  const sonuc = await payload.find({
    collection: 'sayfalar',
    where: { and: [{ yayinda: { equals: true } }, { slug: { equals: slug } }] },
    limit: 1,
    depth: 1,
    ...ZIYARETCI,
  })

  return sonuc.docs[0] ?? null
})

export async function tumSayfaSluglari(): Promise<{ slug: string; updatedAt: string }[]> {
  const payload = await payloadGetir()

  const sonuc = await payload.find({
    collection: 'sayfalar',
    where: { yayinda: { equals: true } },
    limit: 200,
    depth: 0,
    select: { slug: true, updatedAt: true },
    ...ZIYARETCI,
  })

  return sonuc.docs.map((sayfa) => ({ slug: sayfa.slug, updatedAt: sayfa.updatedAt }))
}
