import 'server-only'

import { cache } from 'react'

import { payloadGetir, ZIYARETCI } from './istemci'

/**
 * İlçe olguları — okuma yolu.
 *
 * ⚠️ Kaynak boşsa rakam da DÖNMÜYOR. Kaynaksız bir paydadan çıkan yüzde
 * de kaynaksızdır; sitede kaynaksız rakam gösterilmez.
 */
export interface IlceOlgusu {
  nufus: number | null
  yil: number | null
  kaynak: string | null
}

export const ilceOlgulariniGetir = cache(async (): Promise<IlceOlgusu> => {
  const bos: IlceOlgusu = { nufus: null, yil: null, kaynak: null }
  try {
    const payload = await payloadGetir()
    const kayit = (await payload.findGlobal({
      slug: 'ilce-olgulari',
      depth: 0,
      ...ZIYARETCI,
    })) as unknown as Record<string, unknown>

    const nufus = typeof kayit.nufus === 'number' && kayit.nufus > 0 ? kayit.nufus : null
    const kaynak =
      typeof kayit.nufusKaynagi === 'string' && kayit.nufusKaynagi.trim() !== ''
        ? kayit.nufusKaynagi.trim()
        : null
    const yil = typeof kayit.nufusYili === 'number' ? kayit.nufusYili : null

    // ⚠️ Kaynaksız payda kullanılmaz.
    if (nufus === null || kaynak === null) return bos
    return { nufus, yil, kaynak }
  } catch {
    return bos
  }
})
