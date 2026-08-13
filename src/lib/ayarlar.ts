/**
 * Çalışma zamanı yapılandırması — tek okuma noktası.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: AD DEĞİŞİKLİĞİ SESSİZ BİR BOŞLUK ÜRETTİ.
 *
 * 12 Ağustos 2026'da `NEXT_PUBLIC_*` değişkenleri ön eksiz adlara taşındı;
 * sebebi doğruydu (önekli adlar derleme anında gömülüyor ve üretimde boş
 * kalıyorlardı). Ama taşımanın kendisi ikinci bir sessiz arıza doğurdu:
 * **sunucudaki `.env` eski adlarda kaldı** ve yeni adlar boş geldi.
 *
 * 13 Ağustos 2026'da canlıda ölçülen sonuç:
 *
 *     SITE_ADRESI=https://aslihangyd.com:8443   ← eski, portlu değer
 *     MAPTILER_ANAHTARI=                        ← boş
 *     TURNSTILE_SITE_ANAHTARI=                  ← boş
 *     WHATSAPP_NUMARA=                          ← boş
 *     ILETISIM_TELEFON=                         ← boş
 *
 * Turnstile'ın GİZLİ anahtarı doluydu ama SİTE anahtarı boştu; yani
 * `turnstileEtkinMi()` false dönüyor ve **formlar bot korumasız
 * çalışıyordu.** Bunu ancak spam gelince fark ederdik.
 *
 * ⚠️ ASIL DERS: "yeniden adlandır ve belgele" yetmez.
 *
 * Bir yapılandırma eksikse iki şey olmalı:
 *   1. ESKİ AD HÂLÂ ÇALIŞMALI — kimse tek bir dağıtımda tüm sunucuları
 *      elle güncelleyemez ve güncelleyemediğinde site bozulmamalı.
 *   2. EKSİKLİK GÖRÜNÜR OLMALI — sessizce boş dönen bir ayar, hiç
 *      olmayan bir ayardan tehlikelidir çünkü çalıştığı sanılır.
 *
 * Bu dosya ikisini birden yapıyor: yeni adı okur, yoksa eski `NEXT_PUBLIC_`
 * adına düşer, ve hangi yolun kullanıldığını KAYDEDER. Kayıt panelin
 * bildirim şeridinde ve `/api/saglik` çıktısında görünüyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

export interface AyarTanimi {
  /** Ön eksiz, çalışma zamanında okunan asıl ad. */
  ad: string
  /** Geriye dönük uyum için okunan eski ad. */
  eskiAd?: string
  /** Panelde ve günlükte görünen açıklama. */
  aciklama: string
  /**
   * Eksikse ne bozulur? Bildirim metni bundan üretiliyor.
   * Boş bırakılamaz — "eksik olduğunda ne olur" yazılamıyorsa o ayarın
   * gerçekten gerekli olup olmadığı sorgulanmalı.
   */
  eksikseNeOlur: string
  /**
   * Eksikliği YASAL ya da GÜVENLİK sonucu doğuruyor mu?
   * Bunlar bildirimde en üstte ve farklı tonda görünür.
   */
  kritik?: boolean
}

/**
 * Çalışma zamanında okunan tüm ayarlar.
 *
 * ⚠️ Buraya bir satır eklemek, o değişkenin `compose.prod.yml` ile kaba
 * ulaşması gerektiği anlamına gelir. `ortam.test.ts` ikisini karşılaştırıyor.
 */
export const AYARLAR: readonly AyarTanimi[] = [
  {
    ad: 'SITE_ADRESI',
    eskiAd: 'NEXT_PUBLIC_SERVER_URL',
    aciklama: 'Sitenin genel adresi',
    eksikseNeOlur:
      'Kanonik adresler, site haritası ve OG etiketleri yanlış adres yayınlar — sessiz SEO hasarı.',
    kritik: true,
  },
  {
    ad: 'MAPTILER_ANAHTARI',
    eskiAd: 'NEXT_PUBLIC_MAPTILER_API_KEY',
    aciklama: 'MapTiler harita anahtarı',
    eksikseNeOlur: '/harita sayfası boş durumda kalır; içe aktarılan ilgi noktaları görünmez.',
  },
  {
    ad: 'TURNSTILE_SITE_ANAHTARI',
    eskiAd: 'NEXT_PUBLIC_TURNSTILE_SITE_ANAHTARI',
    aciklama: 'Cloudflare Turnstile site anahtarı',
    eksikseNeOlur: 'Formlar BOT KORUMASIZ çalışır. Gizli anahtar dolu olsa bile katman devre dışı.',
    kritik: true,
  },
  {
    ad: 'WHATSAPP_NUMARA',
    eskiAd: 'NEXT_PUBLIC_WHATSAPP_NUMARA',
    aciklama: 'WhatsApp iş numarası (CMS boşsa yedek)',
    eksikseNeOlur: 'WhatsApp düğmeleri hiç görünmez.',
  },
  {
    ad: 'ILETISIM_TELEFON',
    eskiAd: 'NEXT_PUBLIC_ILETISIM_TELEFON',
    aciklama: 'İletişim telefonu (CMS boşsa yedek)',
    eksikseNeOlur:
      'Üst şeritte ve altbilgide telefon görünmez; ilan sayfasında "Ara" düğmesi çıkmaz.',
  },
  {
    ad: 'ILETISIM_EPOSTA',
    eskiAd: 'NEXT_PUBLIC_ILETISIM_EPOSTA',
    aciklama: 'İletişim e-postası (CMS boşsa yedek)',
    eksikseNeOlur: 'Üst şeritte ve altbilgide e-posta görünmez.',
  },
  {
    ad: 'UMAMI_URL',
    eskiAd: 'NEXT_PUBLIC_UMAMI_URL',
    aciklama: 'Umami analitik betiği adresi',
    eksikseNeOlur: 'Ziyaret ölçümü hiç yapılmaz (çerez onayı ayrı bir koşul).',
  },
  {
    ad: 'UMAMI_SITE_ID',
    eskiAd: 'NEXT_PUBLIC_UMAMI_SITE_ID',
    aciklama: 'Umami site kimliği',
    eksikseNeOlur: 'Ziyaret ölçümü hiç yapılmaz.',
  },
  {
    ad: 'BUNNY_STREAM_LIBRARY_ID',
    eskiAd: 'NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID',
    aciklama: 'Bunny Stream kütüphane kimliği',
    eksikseNeOlur: 'Drone videoları "oynatıcı yapılandırılmadı" der.',
  },
  {
    ad: 'BUNNY_STREAM_CDN_HOSTNAME',
    eskiAd: 'NEXT_PUBLIC_BUNNY_STREAM_CDN_HOSTNAME',
    aciklama: 'Bunny Stream oynatma alan adı',
    eksikseNeOlur: 'Drone videoları "oynatıcı yapılandırılmadı" der.',
  },
]

const TANIMLAR = new Map(AYARLAR.map((ayar) => [ayar.ad, ayar]))

export type AyarKaynagi = 'yeni' | 'eski' | 'yok'

export interface AyarDurumu {
  ad: string
  kaynak: AyarKaynagi
  tanim: AyarTanimi
}

function ham(ad: string | undefined): string {
  if (ad === undefined) return ''
  const deger = process.env[ad]
  return typeof deger === 'string' ? deger.trim() : ''
}

/**
 * Ayarı okur: önce yeni ad, sonra eski `NEXT_PUBLIC_` adı.
 *
 * ⚠️ Boş dize "tanımsız" sayılıyor. `compose.prod.yml` ayarlanmamış
 * değişkenleri `${VAR:-}` ile BOŞ DİZE olarak geçiriyor; `??` kullansaydık
 * boş dize "tanımlı" sayılır ve geri düşüş hiç çalışmazdı. Aynı tuzağa
 * `OVERPASS_ADRESI`'nde bir kez düşülmüştü.
 */
export function ayar(ad: string): string {
  const tanim = TANIMLAR.get(ad)
  if (tanim === undefined) throw new Error(`Tanımsız ayar: ${ad}`)

  const yeni = ham(tanim.ad)
  if (yeni !== '') return yeni

  return ham(tanim.eskiAd)
}

/** Ayar tanımlı mı (hangi adla olursa olsun)? */
export function ayarVarMi(ad: string): boolean {
  return ayar(ad) !== ''
}

/**
 * Tüm ayarların durumu — panel bildirimi ve sağlık ucu için.
 *
 * ⚠️ Değerlerin KENDİSİ dönmüyor, yalnızca kaynağı. Bir tanı çıktısının
 * içine anahtar sızdırmak, tanıyı yapan araca güvenmeyi imkânsız kılar.
 */
export function ayarDurumlari(): AyarDurumu[] {
  return AYARLAR.map((tanim) => {
    let kaynak: AyarKaynagi = 'yok'
    if (ham(tanim.ad) !== '') kaynak = 'yeni'
    else if (ham(tanim.eskiAd) !== '') kaynak = 'eski'

    return { ad: tanim.ad, kaynak, tanim }
  })
}

/** Hiçbir adla tanımlanmamış ayarlar. */
export function eksikAyarlar(): AyarDurumu[] {
  return ayarDurumlari().filter((durum) => durum.kaynak === 'yok')
}

/**
 * Eski adla okunan ayarlar — çalışıyorlar ama `.env` güncellenmeli.
 *
 * Bunlar bir arıza DEĞİL, bir borç: eski ad desteği geçici ve bir gün
 * kaldırılacak. Görünür kalması, o günün sürprize dönüşmemesi için.
 */
export function eskiAdlaOkunanlar(): AyarDurumu[] {
  return ayarDurumlari().filter((durum) => durum.kaynak === 'eski')
}
