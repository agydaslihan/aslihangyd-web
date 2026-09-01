import 'server-only'

import { cache } from 'react'

import {
  anaSayfaBolumleri,
  heroAcilisiniCoz,
  type CizilecekBolum,
  type DuzenSatiri,
  type HeroAcilisi,
} from '@/lib/anasayfa/duzen'

import { payloadGetir, ZIYARETCI } from './istemci'

/**
 * Ana sayfa bölüm sırası — panelden.
 *
 * ⚠️ Okuma başarısız olursa sayfa KIRILMAZ: `anaSayfaSirasi(null)`
 * varsayılan kod sırasını döner. Ana sayfanın veritabanına bağımlı
 * olmaması bilinçli — düzen bir tercih, varlık şartı değil.
 */
export const anaSayfaDuzeniniGetir = cache(async (): Promise<CizilecekBolum[]> => {
  try {
    const payload = await payloadGetir()
    const kayit = await payload.findGlobal({
      slug: 'anasayfa-duzeni',
      depth: 0,
      ...ZIYARETCI,
    })

    const satirlar = (kayit as { sira?: unknown }).sira
    return anaSayfaBolumleri(Array.isArray(satirlar) ? (satirlar as DuzenSatiri[]) : null)
  } catch {
    return anaSayfaBolumleri(null)
  }
})

/**
 * Hero açılış kipi — panelden.
 *
 * ⚠️ Ayrı bir okuma DEĞİL: `cache` sayesinde aynı istekte global yalnızca
 * bir kez sorgulanıyor. İki ayrı sorgu, ana sayfaya her istekte fazladan
 * bir tur eklerdi.
 */
export const heroAcilisiniGetir = cache(async (): Promise<HeroAcilisi> => {
  try {
    const payload = await payloadGetir()
    const kayit = await payload.findGlobal({
      slug: 'anasayfa-duzeni',
      depth: 0,
      ...ZIYARETCI,
    })
    return heroAcilisiniCoz((kayit as { heroAcilisi?: unknown }).heroAcilisi)
  } catch {
    return heroAcilisiniCoz(undefined)
  }
})
