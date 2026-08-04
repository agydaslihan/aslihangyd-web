import 'server-only'

import { cache } from 'react'

import {
  BOS_KATSAYILAR,
  type BinaDurumu,
  type DegerlemeKatsayilari,
  type KatTipi,
} from '@/lib/degerleme/motor'

import { payloadGetir, ZIYARETCI } from './istemci'

/**
 * Değerleme katsayılarını CMS'ten okur.
 *
 * Girilmemiş katsayı sözlüğe EKLENMEZ. Motor, bulunmayan katsayıyı 1,0
 * varsaymaz; o faktörü hesaba hiç katmaz ve kullanıcıya söyler.
 */
export const degerlemeKatsayilariniGetir = cache(async (): Promise<DegerlemeKatsayilari> => {
  try {
    const payload = await payloadGetir()
    const ayarlar = await payload.findGlobal({
      slug: 'degerleme-ayarlari',
      depth: 0,
      ...ZIYARETCI,
    })

    const kat: Partial<Record<KatTipi, number>> = {}
    for (const satir of ayarlar.katKatsayilari ?? []) {
      if (satir.kat && typeof satir.katsayi === 'number') {
        kat[satir.kat as KatTipi] = satir.katsayi
      }
    }

    const durum: Partial<Record<BinaDurumu, number>> = {}
    for (const satir of ayarlar.durumKatsayilari ?? []) {
      if (satir.durum && typeof satir.katsayi === 'number') {
        durum[satir.durum as BinaDurumu] = satir.katsayi
      }
    }

    const yas = (ayarlar.yasKatsayilari ?? [])
      .filter((satir) => typeof satir.katsayi === 'number')
      .map((satir) => ({
        ustYas: typeof satir.ustYas === 'number' ? satir.ustYas : null,
        katsayi: satir.katsayi,
      }))

    return { kat, durum, yas }
  } catch {
    return BOS_KATSAYILAR
  }
})
