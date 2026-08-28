import 'server-only'

import { cache } from 'react'

import { anaSayfaBolumleri, type CizilecekBolum, type DuzenSatiri } from '@/lib/anasayfa/duzen'

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
