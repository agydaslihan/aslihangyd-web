'use client'

import { useState } from 'react'

import { bunnyGommeAdresi, bunnyKapakAdresi } from '@/lib/medya/bunny'

/**
 * Drone videosu — Bunny Stream üzerinden, tıkla-oynat.
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
 * bastığında oluşuyor. Bu, "yerleştirme öncesi kapak" (facade) düzeni.
 *
 * ⚠️ Kapak `next/image` DEĞİL, düz `img`: kapak Bunny CDN'inde ve onu
 * kendi sunucumuzdan geçirip yeniden boyutlandırmak, CDN kullanmanın
 * amacını ortadan kaldırırdı.
 * ─────────────────────────────────────────────────────────────────────────
 */
export function DroneVideo({ videoId, baslik }: { videoId: string; baslik: string }) {
  const [oynatiliyor, setOynatiliyor] = useState(false)

  const gomme = bunnyGommeAdresi(videoId)
  const kapak = bunnyKapakAdresi(videoId)

  /**
   * ⚠️ Yapılandırma eksikse kırık oynatıcı gösterilmez.
   *
   * `NEXT_PUBLIC_BUNNY_*` girilmemişse adres kurulamaz. Boş bir iframe
   * göstermek, ziyaretçiye "video var ama bozuk" dedirtirdi; oysa durum
   * "CDN henüz bağlanmadı".
   */
  if (gomme === null) {
    return (
      <div className="cerceve bg-yuzey-2 text-metin-3 flex aspect-video items-center justify-center px-6 text-center text-mikro">
        Video oynatıcı henüz yapılandırılmadı.
      </div>
    )
  }

  if (oynatiliyor) {
    return (
      <div className="cerceve aspect-video overflow-hidden">
        <iframe
          src={bunnyGommeAdresi(videoId, true) ?? gomme}
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
      className="cerceve bg-lacivert-yuzey group relative block aspect-video w-full overflow-hidden"
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
        Videoyu oynatmak için dokunun — oynatıcı ancak o zaman yüklenir.
      </span>
    </button>
  )
}
