import 'server-only'

import { cache } from 'react'

import config from '@payload-config'
import { getPayload } from 'payload'

import type { KurumsalBilgiler } from '@/payload-types'

/**
 * Kurumsal bilgileri getirir (altbilgi, iletişim, yasal numaralar).
 *
 * `cache()` ile sarılı: tek bir istek içinde kaç bileşen çağırırsa çağırsın
 * veritabanına bir kez gidilir. Altbilgi her sayfada olduğu için bu fark
 * ediliyor.
 *
 * Hata durumunda `null` döner ve site çalışmaya devam eder — veritabanı
 * geçici olarak erişilemezse altbilginin iletişim bloğu kaybolur ama sayfa
 * 500 vermez.
 */
export const kurumsalBilgileriGetir = cache(async (): Promise<KurumsalBilgiler | null> => {
  try {
    const payload = await getPayload({ config })
    return await payload.findGlobal({ slug: 'kurumsal-bilgiler', depth: 0 })
  } catch {
    return null
  }
})

/**
 * WhatsApp numarası: önce CMS, sonra ortam değişkeni.
 *
 * CMS öncelikli çünkü Aslıhan numarayı panelden değiştirebilmeli; ortam
 * değişkeni ise CMS henüz doldurulmadan sitenin çalışabilmesi için yedek.
 */
export function whatsappNumarasi(kurumsal: KurumsalBilgiler | null): string | null {
  return kurumsal?.whatsapp || process.env.NEXT_PUBLIC_WHATSAPP_NUMARA || null
}

export function iletisimTelefonu(kurumsal: KurumsalBilgiler | null): string | null {
  return kurumsal?.telefon || process.env.NEXT_PUBLIC_ILETISIM_TELEFON || null
}

export function iletisimEpostasi(kurumsal: KurumsalBilgiler | null): string | null {
  return kurumsal?.eposta || process.env.NEXT_PUBLIC_ILETISIM_EPOSTA || null
}
