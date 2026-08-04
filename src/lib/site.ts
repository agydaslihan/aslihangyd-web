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
}

/** Ana gezinme. Faz ilerledikçe `hazir` bayrakları açılır. */
export const ANA_GEZINME: readonly GezinmeOgesi[] = [
  { ad: 'Portföy', adres: '/portfoy', hazir: true },
  { ad: 'Mahalleler', adres: '/mahalleler', hazir: true },
  { ad: 'Harita', adres: '/harita', hazir: false },
  { ad: 'Ticari', adres: '/ticari', hazir: false },
  { ad: 'Araçlar', adres: '/araclar', hazir: false },
  { ad: 'Hakkımızda', adres: '/hakkimizda', hazir: true },
  { ad: 'İletişim', adres: '/iletisim', hazir: true },
]

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
