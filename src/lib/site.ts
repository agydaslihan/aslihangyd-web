/**
 * Site geneli sabitler.
 *
 * Buradaki metinler markanın sesidir; tek yerden yönetilir ki sayfadan
 * sayfaya tutarsızlaşmasın.
 */

export const SITE_ADI = 'Aslıhan GYD'
export const SITE_UNVANI = 'Aslıhan Gayrimenkul Danışmanlığı'

export const SITE_ACIKLAMASI =
  'Çorlu ve Tekirdağ odaklı gayrimenkul danışmanlığı. Mahalle verileri, ' +
  'kira çarpanı ve yatırım analiziyle veriye dayalı karar desteği.'

/**
 * Kanonik adres. Ortam değişkeni yoksa üretim alan adına düşer —
 * sitemap ve OG etiketleri mutlak adres gerektirir.
 */
export const SITE_ADRESI = (
  process.env.NEXT_PUBLIC_SITE_ADRESI ?? 'https://aslihangyd.com'
).replace(/\/$/, '')

export function mutlakAdres(yol: string): string {
  return `${SITE_ADRESI}${yol.startsWith('/') ? yol : `/${yol}`}`
}

export interface GezinmeOgesi {
  ad: string
  adres: string
  /** Yalnızca ilgili faz açıldığında görünür. */
  hazir?: boolean
  /**
   * Üst menüde görünsün mü.
   *
   * Sayfa sayısı arttıkça üst menü seçici olmalı: dokuz öğe masaüstünde
   * sıkışır, mobilde uzun bir listeye döner ve hiçbiri öne çıkmaz. Üst menü
   * ziyaretçinin en sık ihtiyaç duyduğu beş yolu taşır; geri kalanı
   * altbilgide ve sayfa içi çapraz bağlantılarda yaşar.
   */
  ustMenude?: boolean
}

/** Tüm sayfalar. Faz ilerledikçe `hazir` bayrakları açılır. */
export const ANA_GEZINME: readonly GezinmeOgesi[] = [
  { ad: 'Portföy', adres: '/portfoy', hazir: true, ustMenude: true },
  { ad: 'Mahalleler', adres: '/mahalleler', hazir: true, ustMenude: true },
  { ad: 'Değerleme', adres: '/degerleme', hazir: true, ustMenude: true },
  { ad: 'Araçlar', adres: '/araclar', hazir: true, ustMenude: true },
  { ad: 'İletişim', adres: '/iletisim', hazir: true, ustMenude: true },
  { ad: 'Mahalle Testi', adres: '/mahalle-testi', hazir: true },
  { ad: 'Bölge Radarı', adres: '/bolge-radari', hazir: true },
  { ad: 'Gizli Portföy', adres: '/gizli-portfoy', hazir: true },
  { ad: 'Harita', adres: '/harita', hazir: true },
  { ad: 'Ticari', adres: '/ticari', hazir: true },
  { ad: 'Hakkımızda', adres: '/hakkimizda', hazir: true },
]

/** Üst menü — seçici. */
export const UST_MENU = ANA_GEZINME.filter((oge) => oge.hazir && oge.ustMenude)

/** Altbilgi — yayında olan her sayfa. */
export const GORUNUR_GEZINME = ANA_GEZINME.filter((oge) => oge.hazir)

/** Altbilgideki hukuki metin bağlantıları. */
export const HUKUKI_SAYFALAR: readonly GezinmeOgesi[] = [
  { ad: 'KVKK Aydınlatma Metni', adres: '/kvkk' },
  { ad: 'Gizlilik Politikası', adres: '/gizlilik' },
  { ad: 'Çerez Politikası', adres: '/cerez-politikasi' },
  { ad: 'Kullanım Koşulları', adres: '/kullanim-kosullari' },
]

/** WhatsApp'a önceden yazılmış mesaj — konuşmayı başlatma eşiğini düşürür. */
export function whatsappMesaji(baglam?: string): string {
  return baglam
    ? `Merhaba, ${baglam} hakkında bilgi almak istiyorum.`
    : 'Merhaba, gayrimenkul danışmanlığı hakkında bilgi almak istiyorum.'
}
