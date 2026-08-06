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
 * Kanonik adres. Site haritası, robots.txt ve OG etiketleri mutlak adres
 * gerektirir.
 *
 * ⚠️ ADRES PORT İÇERİR: 80/443 sunucuda başka bir uygulamada, yayın 8443
 * üzerinden. Portu düşürmek, arama motoruna ulaşılamayan kanonik adresler
 * bildirmek demek olur.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ `SITE_ADRESI` ÖN EKSİZ VE BU BİLİNÇLİ.
 *
 * Next.js `NEXT_PUBLIC_*` değişkenlerini DERLEME ANINDA koda gömer —
 * sunucu tarafında bile. Yani `docker-compose` içinde çalışma zamanında
 * verilen bir `NEXT_PUBLIC_SITE_ADRESI` HİÇ OKUNMAZ; imaj hangi değerle
 * derlendiyse o kalır.
 *
 * Bu, kurulumda fark edilene kadar sessizce yanlış çalışıyordu: üretim
 * imajı geliştirme `.env`'iyle derlendiği için site haritası ve kanonik
 * adresler `http://localhost:3000` diyordu.
 *
 * Çözüm ön eksiz bir değişken: ön eki olmayanlar gömülmez, sunucuda
 * çalışma zamanında okunur. `.env` yine tek satır tutuyor
 * (`NEXT_PUBLIC_SERVER_URL`); compose onu bu ada kopyalıyor.
 *
 * ⚠️ Bu değeri kullanan rotalar dinamik olmalı. Statik olarak önceden
 * üretilen bir rota, değeri derleme anında dondurur — `robots.ts` ve
 * `sitemap.ts` bu yüzden `force-dynamic`.
 * ─────────────────────────────────────────────────────────────────────────
 */
export const SITE_ADRESI =
  // Çalışma zamanı (üretim) — compose bunu NEXT_PUBLIC_SERVER_URL'den kopyalar.
  (
    process.env.SITE_ADRESI ||
    // Derleme zamanı — geliştirmede ve istemci tarafı ihtiyaçlarında.
    process.env.NEXT_PUBLIC_SITE_ADRESI ||
    process.env.NEXT_PUBLIC_SERVER_URL ||
    'https://aslihangyd.com:8443'
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

/**
 * Altbilgide her sayfada görünen feragat.
 *
 * ⚠️ Bu metin sabittir ve koşullu render EDİLMEZ. Sitede değerleme
 * tahmini, yatırım skoru ve getiri hesabı gösteriliyor; feragatin bir
 * sayfada eksik kalması hem CLAUDE.md kural 5'in hem reklam mevzuatının
 * ihlali olur.
 */
export const ALTBILGI_FERAGATI =
  'Sitede yer alan değerleme tahminleri, yatırım skorları ve getiri hesaplamaları ' +
  'bilgilendirme amaçlıdır; yatırım tavsiyesi niteliğinde değildir ve SPK lisanslı ' +
  'değerleme raporu yerine geçmez. Geçmiş veriler gelecekteki getiriyi garanti etmez.'

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
