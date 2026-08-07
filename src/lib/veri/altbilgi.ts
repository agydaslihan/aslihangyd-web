import 'server-only'

import { cache } from 'react'

import type { AltbilgiSutunu } from '@/collections/AltbilgiBaglantilari'

import { payloadGetir, ZIYARETCI } from './istemci'

export interface AltbilgiBaglantisi {
  id: number
  baslik: string
  url: string
  dahiliMi: boolean
}

export type AltbilgiIcerigi = Record<AltbilgiSutunu, AltbilgiBaglantisi[]>

/**
 * Faydalı bağlantıların başlangıç değerleri.
 *
 * ⚠️ İKİ ADRES DE DOĞRULANDI (6 Ağustos 2026, HTTP 200 + sayfa başlığı):
 *   · turkiye.gov.tr/tapu-bilgileri-sorgulama → "Tapu Bilgileri Sorgulama"
 *   · parselsorgu.tkgm.gov.tr → TKGM Parsel Sorgu uygulaması
 *
 * Tahmin ettiğim üçüncü bir adres (`/tapu-ve-kadastro-tapu-bilgileri-
 * sorgulama`) 404 döndüğü için listeye ALINMADI. Uydurulmuş bir resmî
 * bağlantı, sitenin en kolay kaybedeceği güven.
 *
 * Bunlar yalnızca CMS'te hiç kayıt yoksa gösterilir; Aslıhan panelden
 * bağlantı eklediği anda tamamen devre dışı kalırlar.
 */
const VARSAYILAN_FAYDALI: readonly AltbilgiBaglantisi[] = [
  {
    id: -1,
    baslik: 'e-Devlet — Tapu Bilgileri Sorgulama',
    url: 'https://www.turkiye.gov.tr/tapu-bilgileri-sorgulama',
    dahiliMi: false,
  },
  {
    id: -2,
    baslik: 'TKGM — Parsel Sorgulama',
    url: 'https://parselsorgu.tkgm.gov.tr/',
    dahiliMi: false,
  },
]

function bosIcerik(): AltbilgiIcerigi {
  return { kurumsal: [], faydali: [], hukuksal: [], iletisim: [] }
}

export const altbilgiBaglantilariniGetir = cache(async (): Promise<AltbilgiIcerigi> => {
  const icerik = bosIcerik()

  try {
    const payload = await payloadGetir()
    const sonuc = await payload.find({
      collection: 'altbilgi-baglantilari',
      where: { aktif: { not_equals: false } },
      sort: 'siraNo',
      limit: 100,
      depth: 0,
      ...ZIYARETCI,
    })

    for (const kayit of sonuc.docs) {
      const sutun = kayit.sutun as AltbilgiSutunu
      if (!(sutun in icerik)) continue

      icerik[sutun].push({
        id: kayit.id,
        baslik: kayit.baslik,
        url: kayit.url,
        dahiliMi: kayit.dahiliMi !== false,
      })
    }
  } catch {
    // Bağlantılar okunamazsa altbilgi yine de çalışır; sütun boş kalır.
  }

  if (icerik.faydali.length === 0) {
    icerik.faydali = [...VARSAYILAN_FAYDALI]
  }

  return icerik
})
