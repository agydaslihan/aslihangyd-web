import 'server-only'

import { cache } from 'react'

import { payloadGetir, ZIYARETCI } from './istemci'

/**
 * Altbilgi ayarları.
 *
 * ⚠️ Her alanın bir VARSAYILANI var ve boş bırakılan alanda o varsayılan
 * görünüyor. Altbilgi sitenin her sayfasında; içerik girilmedi diye
 * başlıksız sütunlar göstermek, düzenlenebilir yapmanın bedeli olamaz.
 */

export interface AltbilgiAyarlariIcerigi {
  tanitimMetni: string
  kurumsalBasligi: string
  portfoyBasligi: string
  faydaliBasligi: string
  hukuksalBasligi: string
  iletisimBasligi: string
  sosyalBasligi: string
}

const VARSAYILAN: AltbilgiAyarlariIcerigi = {
  tanitimMetni:
    'Çorlu ve çevresinde gayrimenkul danışmanlığı. Kararlarınızı hisle değil, rakamla verin.',
  kurumsalBasligi: 'Kurumsal',
  portfoyBasligi: 'Portföy',
  faydaliBasligi: 'Faydalı bağlantılar',
  hukuksalBasligi: 'Hukuksal metinler',
  iletisimBasligi: 'İletişim',
  sosyalBasligi: 'Bizi takip edin',
}

export const altbilgiAyarlariniGetir = cache(async (): Promise<AltbilgiAyarlariIcerigi> => {
  try {
    const payload = await payloadGetir()
    const ayarlar = (await payload.findGlobal({
      slug: 'altbilgi-ayarlari',
      ...ZIYARETCI,
    })) as unknown as Record<string, unknown>

    const al = (ad: keyof AltbilgiAyarlariIcerigi): string => {
      const deger = ayarlar[ad]
      return typeof deger === 'string' && deger.trim() !== '' ? deger.trim() : VARSAYILAN[ad]
    }

    return {
      tanitimMetni: al('tanitimMetni'),
      kurumsalBasligi: al('kurumsalBasligi'),
      portfoyBasligi: al('portfoyBasligi'),
      faydaliBasligi: al('faydaliBasligi'),
      hukuksalBasligi: al('hukuksalBasligi'),
      iletisimBasligi: al('iletisimBasligi'),
      sosyalBasligi: al('sosyalBasligi'),
    }
  } catch {
    // Altbilgi her sayfada; bir okuma hatası siteyi düşüremez.
    return VARSAYILAN
  }
})
