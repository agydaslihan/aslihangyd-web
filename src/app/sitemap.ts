import type { MetadataRoute } from 'next'

import { ARACLAR } from '@/lib/araclar'
import { mutlakAdres } from '@/lib/site'
import { kapaliBolumeAitMi } from '@/lib/siteBolumleri'
import { bolumDurumlariniGetir } from '@/lib/veri/siteBolumleri'
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
/**
 * ⚠️ Site haritası DİNAMİK üretilir.
 *
 * Varsayılan davranışta Next bu rotayı derleme anında önceden üretiyordu
 * ve iki şey birden bozuluyordu:
 *
 * 1. Kapalı bölümün adresi haritada kalıyordu — bölüm anahtarının üç
 *    etkisinden biri (arama motorundan kalkmak) gerçekleşmiyordu.
 *    Duman testinde yakalandı: `/ticari` kapatıldı, rota 404 döndü,
 *    altbilgiden düştü, ama site haritasında durmaya devam etti.
 * 2. Derlemeden sonra eklenen ilan ve mahalle sayfaları haritaya hiç
 *    girmiyordu; yeni içerik ancak bir sonraki dağıtımda görünüyordu.
 *
 * Maliyeti düşük: site haritasını tarayıcı değil, arama motoru ve o da
 * seyrek ister.
 */
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [ilanlar, mahalleler, sayfalar, bolumDurumlari] = await Promise.all([
    tumIlanSluglari().catch(() => []),
    mahalleleriGetir().catch(() => []),
    tumSayfaSluglari().catch(() => []),
    bolumDurumlariniGetir(),
  ])

  /**
   * ⚠️ Kapalı bölümün adresi site haritasına GİRMEZ.
   *
   * Bölüm kapatmanın üç etkisinden biri "arama motorundan kalkmak".
   * 404 dönen bir adresi site haritasında bırakmak, tarama bütçesi israfı
   * ve Search Console'da kalıcı hata demek.
   */
  const bolumAcik = (yol: string) => kapaliBolumeAitMi(yol, bolumDurumlari) === null

  const sabitler: MetadataRoute.Sitemap = [
    { url: mutlakAdres('/'), changeFrequency: 'weekly', priority: 1 },
    { url: mutlakAdres('/portfoy'), changeFrequency: 'daily', priority: 0.9 },
    { url: mutlakAdres('/mahalleler'), changeFrequency: 'weekly', priority: 0.9 },
    { url: mutlakAdres('/mahalleler/karsilastir'), changeFrequency: 'monthly', priority: 0.6 },
    { url: mutlakAdres('/ticari'), changeFrequency: 'weekly', priority: 0.8 },
    // Değerleme, satıcı tarafını getiren sayfa — portföy motorunun kendisi.
    { url: mutlakAdres('/degerleme'), changeFrequency: 'monthly', priority: 0.9 },
    { url: mutlakAdres('/gizli-portfoy'), changeFrequency: 'daily', priority: 0.7 },
    // Eşleştirme testi, form türleri arasında en yüksek tamamlanma oranına
    // sahip yapı; mahalle sayfalarına da doğal giriş kapısı.
    { url: mutlakAdres('/mahalle-testi'), changeFrequency: 'monthly', priority: 0.8 },
    // Radar mahalle verisinden türer; veri değiştikçe içeriği değişir.
    { url: mutlakAdres('/bolge-radari'), changeFrequency: 'weekly', priority: 0.7 },
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
    // Metodoloji sayfaları skorun/endeksin güvenilirliğinin kanıtıdır;
    // indekslenmeleri hem SEO hem itibar açısından değerli.
    {
      url: mutlakAdres('/yatirim-skoru-metodolojisi'),
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: mutlakAdres('/mahalle-eslestirme-metodolojisi'),
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    // Kapalıyken yukarıdaki filtre bu girişi düşürür.
    { url: mutlakAdres('/danisman-ol'), changeFrequency: 'monthly', priority: 0.3 },
    { url: mutlakAdres('/hakkimizda'), changeFrequency: 'monthly', priority: 0.5 },
    { url: mutlakAdres('/iletisim'), changeFrequency: 'monthly', priority: 0.6 },
  ]

  return [
    ...sabitler.filter((giris) => bolumAcik(new URL(giris.url).pathname)),
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
