/**
 * 360° tur adresinin gömülebilir olup olmadığı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ "KIRIK GÖRSEL" ŞİKÂYETİNİN SEBEBİ BUYDU.
 *
 * 31 Ağustos 2026'da üretimde ölçüldü: Alipaşa'nın tur adresi
 * `https://maps.app.goo.gl/…` — bir Google Maps PAYLAŞIM linki. Bu adres
 * bir tur değil ve çerçevelenemiyor: Google `X-Frame-Options` ile
 * gömülmeyi reddediyor, tarayıcı boş/kırık bir çerçeve çiziyor ve
 * sebebini hiçbir yerde yazmıyor.
 *
 * Adres `https` olduğu için eski kontrol onu geçerli sayıyordu; `https`
 * olmak gömülebilir olmak değil.
 *
 * ⚠️ BEYAZ LİSTE DEĞİL, KARA LİSTE — VE BİLİNÇLİ. Gömülebilir tur
 * servisi çok: Kuula, Matterport, Google Maps Embed, Roundme, Momento360,
 * kendi barındırdığımız sayfalar… Beyaz liste, listede olmayan geçerli
 * bir servisi sessizce reddederdi. Kara liste yalnızca ÇALIŞMADIĞINI
 * BİLDİĞİMİZ kalıpları eliyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type TurAdresSorunu = 'https_degil' | 'okunamadi' | 'gomulemez'

export interface TurAdresDurumu {
  gecerli: boolean
  sorun?: TurAdresSorunu
  /** Kullanıcıya gösterilecek Türkçe açıklama. */
  mesaj?: string
}

/**
 * Gömülmeyi reddettiği bilinen adresler.
 *
 * ⚠️ Google Maps'in PAYLAŞIM linkleri (`maps.app.goo.gl`, `goo.gl/maps`)
 * ve normal harita sayfaları çerçevelenemiyor. Gömülebilir olan yalnızca
 * `google.com/maps/embed` biçimi.
 */
const GOMULEMEZ = [
  { kalip: /^maps\.app\.goo\.gl$/i, ad: 'Google Maps paylaşım bağlantısı' },
  { kalip: /^goo\.gl$/i, ad: 'Google kısa bağlantısı' },
  { kalip: /^(www\.)?instagram\.com$/i, ad: 'Instagram bağlantısı' },
  { kalip: /^(www\.)?facebook\.com$/i, ad: 'Facebook bağlantısı' },
  { kalip: /^drive\.google\.com$/i, ad: 'Google Drive bağlantısı' },
]

export function turAdresiniDenetle(adres: string): TurAdresDurumu {
  let url: URL
  try {
    url = new URL(adres)
  } catch {
    return {
      gecerli: false,
      sorun: 'okunamadi',
      mesaj: 'Tur adresi okunamadı. Tam adresi yapıştırın (https:// ile başlamalı).',
    }
  }

  if (url.protocol !== 'https:') {
    return {
      gecerli: false,
      sorun: 'https_degil',
      mesaj:
        'Tur adresi https:// ile başlamalı. http bir adres tarayıcıda karışık içerik ' +
        'uyarısı üretir ve çerçeve hiç yüklenmez.',
    }
  }

  /**
   * ⚠️ Google Maps'in gömülebilir biçimi (`/maps/embed`) ELENMİYOR;
   * yalnızca paylaşım ve normal harita adresleri eleniyor.
   */
  const gomulemez = GOMULEMEZ.find((kayit) => kayit.kalip.test(url.hostname))
  const haritaSayfasi =
    /^(www\.)?google\.[a-z.]+$/i.test(url.hostname) && !url.pathname.startsWith('/maps/embed')

  if (gomulemez || haritaSayfasi) {
    const ad = gomulemez?.ad ?? 'Google Maps sayfası'
    return {
      gecerli: false,
      sorun: 'gomulemez',
      mesaj:
        `Bu adres bir ${ad}; sayfaya gömülemiyor (servis çerçevelenmeyi reddediyor). ` +
        '360° tur için Kuula, Matterport gibi bir tur servisinin gömme adresini ya da ' +
        'Google Maps’in “Haritayı yerleştir” (embed) adresini kullanın.',
    }
  }

  return { gecerli: true }
}
