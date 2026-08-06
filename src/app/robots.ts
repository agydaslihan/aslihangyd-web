import type { MetadataRoute } from 'next'

import { mutlakAdres, SITE_ADRESI } from '@/lib/site'

/**
 * robots.txt
 *
 * `/admin` ve `/api` taramaya kapalı: yönetim paneli arama sonuçlarında
 * görünmemeli ve API uçları tarama bütçesi tüketmemeli.
 *
 * Üretim dışı ortamlarda tüm site kapatılır — staging kopyasının
 * indekslenmesi, asıl siteyle içerik tekrarı (duplicate content) yaratır.
 */
export default function robots(): MetadataRoute.Robots {
  const uretim = SITE_ADRESI.includes('aslihangyd.com')

  if (!uretim) {
    return { rules: { userAgent: '*', disallow: '/' } }
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/iletisim?', '/stil-rehberi'],
    },
    sitemap: mutlakAdres('/sitemap.xml'),
    host: SITE_ADRESI,
  }
}
