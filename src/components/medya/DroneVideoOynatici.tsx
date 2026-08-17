'use client'

import { useState } from 'react'

/**
 * Drone videosu oynatıcısı — tıkla-oynat cephesi (facade).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ IFRAME BAŞTAN YÜKLENMEZ.
 *
 * Sayfa açılır açılmaz bir video iframe'i gömmek üç şeyi birden bozar:
 *
 *  1. **LCP.** Hedef 2,5 sn; üçüncü taraf bir oynatıcı çerçevesi kendi
 *     JS'ini, CSS'ini ve manifestini çeker.
 *  2. **Veri.** Trafiğin ~%75'i mobil. Kullanıcı videoyu izlemeye karar
 *     vermeden verisini harcamak, izin almadan cebinden para almaktır.
 *  3. **Gizlilik.** Bunny'ye istek atmak bir üçüncü taraf çağrısıdır ve
 *     ziyaretçi henüz hiçbir şey istemedi.
 *
 * Bu yüzden önce yalnızca kapak görseli var; iframe kullanıcı oynat'a
 * bastığında oluşuyor.
 *
 * ⚠️ Kapak `next/image` DEĞİL, düz `img`. Bunny kapağı CDN'de duruyor ve
 * onu kendi sunucumuzdan geçirip yeniden boyutlandırmak CDN kullanmanın
 * amacını ortadan kaldırırdı. YouTube kapağı ise ZATEN kendi sunucumuzdan
 * geliyor (`/api/video-kapak/youtube/…`): tıklamadan önce Google'a istek
 * gitmesin diye — gerekçesi `lib/medya/video.ts` içinde.
 *
 * ⚠️ ADRESLERİ BU BİLEŞEN KURMUYOR — sunucudan prop olarak alıyor.
 * Bunny kimlikleri çalışma zamanında sunucuda okunuyor (`DroneVideo`).
 * Burada `process.env` okumak değeri derleme anına bağlardı ve üretim
 * imajında boş kalırdı; gerekçenin tamamı `lib/medya/bunny.ts` içinde.
 * Yapılandırma eksikse bu bileşen hiç render edilmez, sarmalayıcı boş
 * durumu gösterir.
 * ─────────────────────────────────────────────────────────────────────────
 */
export function DroneVideoOynatici({
  gomme,
  kapak,
  baslik,
  saglayici,
}: {
  /**
   * Gömme adresi — `autoplay=true`.
   *
   * Otomatik oynatma burada güvenli: iframe yalnızca ziyaretçi oynat
   * düğmesine bastıktan SONRA DOM'a giriyor. Sayfa açılışında otomatik
   * oynatma hâlâ imkânsız, çünkü o anda çerçeve ortada yok.
   */
  gomme: string
  kapak: string | null
  baslik: string
  /**
   * Hangi servis — yalnızca ziyaretçiye ne söyleneceğini belirliyor.
   *
   * ⚠️ Üçüncü tarafın adını yazmak dürüstlük: oynat'a basmak ziyaretçinin
   * verisini o servise açıyor ve bunu tıklamadan önce bilmek hakkı.
   */
  saglayici?: 'bunny' | 'youtube'
}) {
  const [oynatiliyor, setOynatiliyor] = useState(false)

  if (oynatiliyor) {
    return (
      <div className="cerceve aspect-video overflow-hidden">
        <iframe
          src={gomme}
          title={baslik}
          loading="lazy"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="h-full w-full border-0"
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setOynatiliyor(true)}
      className="cerceve bg-kakao-yuzey group relative block aspect-video w-full overflow-hidden"
      aria-label={`${baslik} — videoyu oynat`}
    >
      {kapak !== null && (
        // eslint-disable-next-line @next/next/no-img-element -- kapak Bunny CDN'inde; kendi sunucumuzdan geçirmek CDN'in amacını ortadan kaldırır.
        <img
          src={kapak}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      <span className="absolute inset-0 flex items-center justify-center">
        {/* Oynat işareti — 44px dokunma hedefinin üstünde. */}
        <span className="bg-zemin/85 text-metin flex h-16 w-16 items-center justify-center rounded-full">
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </span>

      {/* ⚠️ Renk tek taşıyıcı değil: metin de var (WCAG 1.4.1). */}
      <span className="bg-zemin/85 text-metin-2 absolute right-0 bottom-0 left-0 px-3 py-2 text-left text-mikro">
        {saglayici === 'youtube'
          ? 'Videoyu oynatmak için dokunun — oynatıcı YouTube’dan ancak o zaman yüklenir.'
          : 'Videoyu oynatmak için dokunun — oynatıcı ancak o zaman yüklenir.'}
      </span>
    </button>
  )
}
