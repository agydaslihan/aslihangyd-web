import 'server-only'

import { cache } from 'react'

import type { IlgiNoktalari } from '@/payload-types'

import { payloadGetir, ZIYARETCI } from './istemci'

export const ilgiNoktalariniGetir = cache(async (): Promise<IlgiNoktalari[]> => {
  try {
    const payload = await payloadGetir()

    const sonuc = await payload.find({
      collection: 'ilgi-noktalari',
      limit: 1000,
      depth: 1,
      sort: 'ad',
      ...ZIYARETCI,
    })

    return sonuc.docs
  } catch {
    return []
  }
})

/**
 * Payload `point` alanı `[boylam, enlem]` dizisi olarak gelir.
 * Sıra kolayca karıştırılır ve Çorlu'yu Somali açıklarına taşır; bu yüzden
 * dönüştürme tek yerde yapılıyor.
 */
export function konumuCoz(konum: unknown): { boylam: number; enlem: number } | null {
  if (!Array.isArray(konum) || konum.length < 2) return null
  const [boylam, enlem] = konum
  if (typeof boylam !== 'number' || typeof enlem !== 'number') return null
  if (!Number.isFinite(boylam) || !Number.isFinite(enlem)) return null
  return { boylam, enlem }
}
