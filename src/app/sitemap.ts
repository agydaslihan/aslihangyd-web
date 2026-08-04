import type { MetadataRoute } from 'next'

import { ARACLAR } from '@/lib/araclar'
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
    { url: mutlakAdres('/mahalleler/karsilastir'), changeFrequency: 'monthly', priority: 0.6 },
    { url: mutlakAdres('/ticari'), changeFrequency: 'weekly', priority: 0.8 },
    // Değerleme, satıcı tarafını getiren sayfa — portföy motorunun kendisi.
    { url: mutlakAdres('/degerleme'), changeFrequency: 'monthly', priority: 0.9 },
    { url: mutlakAdres('/gizli-portfoy'), changeFrequency: 'daily', priority: 0.7 },
    { url: mutlakAdres('/harita'), changeFrequency: 'weekly', priority: 0.6 },
    // Hesaplayıcılar arama trafiğinin önemli bir kaynağı: "kira getirisi
    // hesaplama", "tapu harcı ne kadar" gibi sorgular yüksek hacimli.
    { url: mutlakAdres('/araclar'), changeFrequency: 'monthly', priority: 0.8 },
    ...ARACLAR.map((arac) => ({
      url: mutlakAdres(arac.adres),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    // ⚠️ /endeks BİLİNÇLİ OLARAK YOK. Sayfa, veri koşulları sağlanana kadar
    // 404 döner; site haritasına koymak arama motoruna ölü bağlantı vermek
    // olurdu. Endeks yayına alındığında buraya eklenecek.
    { url: mutlakAdres('/endeks-metodolojisi'), changeFrequency: 'yearly', priority: 0.4 },
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
