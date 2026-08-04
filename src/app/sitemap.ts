import type { MetadataRoute } from 'next'

import { mutlakAdres } from '@/lib/site'
import { tumIlanSluglari } from '@/lib/veri/ilanlar'
import { mahalleleriGetir } from '@/lib/veri/mahalleler'
import { tumSayfaSluglari } from '@/lib/veri/sayfalar'

/**
 * Site haritası.
 *
 * Öncelik (`priority`) değerleri sitenin kendi bilgi mimarisini yansıtır:
 * mahalle sayfaları SEO motorunun kalbi olduğu için en yüksek, hukuki
 * metinler en düşük. Yalnızca gerçekten yayında olan kayıtlar listelenir —
 * taslak bir sayfayı site haritasına koymak tarama bütçesi israfıdır.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [ilanlar, mahalleler, sayfalar] = await Promise.all([
    tumIlanSluglari().catch(() => []),
    mahalleleriGetir().catch(() => []),
    tumSayfaSluglari().catch(() => []),
  ])

  const sabitler: MetadataRoute.Sitemap = [
    { url: mutlakAdres('/'), changeFrequency: 'weekly', priority: 1 },
    { url: mutlakAdres('/portfoy'), changeFrequency: 'daily', priority: 0.9 },
    { url: mutlakAdres('/mahalleler'), changeFrequency: 'weekly', priority: 0.9 },
    { url: mutlakAdres('/hakkimizda'), changeFrequency: 'monthly', priority: 0.5 },
    { url: mutlakAdres('/iletisim'), changeFrequency: 'monthly', priority: 0.6 },
  ]

  return [
    ...sabitler,
    ...mahalleler.map((mahalle) => ({
      url: mutlakAdres(`/mahalleler/${mahalle.slug}`),
      lastModified: new Date(mahalle.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...ilanlar.map((ilan) => ({
      url: mutlakAdres(`/portfoy/${ilan.slug}`),
      lastModified: new Date(ilan.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...sayfalar.map((sayfa) => ({
      url: mutlakAdres(`/${sayfa.slug}`),
      lastModified: new Date(sayfa.updatedAt),
      changeFrequency: 'yearly' as const,
      priority: 0.2,
    })),
  ]
}
