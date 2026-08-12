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
 *
 * ⚠️ Yedekler ön eksiz ve bu bilinçli. `NEXT_PUBLIC_` önekliyken derleme
 * anına bağlıydılar ve üretim imajında boş kalıyorlardı — yani "CMS
 * doldurulmadan da çalışsın" yedeği tam da üretimde çalışmıyordu.
 * Gerekçenin tamamı `lib/harita/sunucu.ts` içinde. Bu dosya `server-only`,
 * dolayısıyla çalışma zamanı okuması güvenli.
 */
export function whatsappNumarasi(kurumsal: KurumsalBilgiler | null): string | null {
  return kurumsal?.whatsapp || process.env.WHATSAPP_NUMARA || null
}

export function iletisimTelefonu(kurumsal: KurumsalBilgiler | null): string | null {
  return kurumsal?.telefon || process.env.ILETISIM_TELEFON || null
}

export function iletisimEpostasi(kurumsal: KurumsalBilgiler | null): string | null {
  return kurumsal?.eposta || process.env.ILETISIM_EPOSTA || null
}
