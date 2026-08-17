import 'server-only'

import { cache } from 'react'

import { VARSAYILAN_MENU_SIRASI } from '@/lib/gezinme'

import { payloadGetir, ZIYARETCI } from './istemci'

/**
 * Üst menü sırasını okur.
 *
 * ⚠️ Hata durumunda KOD SIRASINA düşülür, boş listeye değil. Boş liste
 * dönseydi `menuyuSirala` yine bütün başlıkları basardı — ama bu, sıranın
 * veritabanı bir an erişilemez olduğunda sessizce değişmesi demekti.
 * Varsayılana düşmek, düşülen yerin bilinen bir yer olmasını sağlıyor.
 */
export const menuSirasiniGetir = cache(async (): Promise<string[]> => {
  try {
    const payload = await payloadGetir()
    const kayit = (await payload.findGlobal({
      slug: 'menu-duzeni',
      ...ZIYARETCI,
    })) as unknown as { sira?: unknown }

    if (!Array.isArray(kayit.sira) || kayit.sira.length === 0) {
      return [...VARSAYILAN_MENU_SIRASI]
    }

    const anahtarlar = kayit.sira
      .map((satir) => (satir as { oge?: unknown }).oge)
      .filter((oge): oge is string => typeof oge === 'string' && oge !== '')

    return anahtarlar.length === 0 ? [...VARSAYILAN_MENU_SIRASI] : anahtarlar
  } catch {
    return [...VARSAYILAN_MENU_SIRASI]
  }
})
