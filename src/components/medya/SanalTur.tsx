'use client'

import { useState } from 'react'

/**
 * 360° sanal tur — tıkla-aç.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ DRONE VİDEOSUYLA AYNI GEREKÇE: çerçeve baştan yüklenmez.
 *
 * 360° tur oynatıcıları video oynatıcılarından da ağırdır (WebGL sahnesi,
 * panorama karoları). Sayfa açılışında gömmek LCP hedefini bozar ve mobil
 * kullanıcının verisini o daha hiçbir şey istemeden harcar.
 *
 * ⚠️ Adres yalnızca `https` kabul ediyor. CMS'e yapıştırılan `http` bir
 * adres, karışık içerik (mixed content) uyarısı üretir ve tarayıcı
 * çerçeveyi engeller — ziyaretçi boş bir kutu görür, sebebini kimse
 * anlamaz.
 * ─────────────────────────────────────────────────────────────────────────
 */
export function SanalTur({ adres, baslik }: { adres: string; baslik: string }) {
  const [acik, setAcik] = useState(false)

  let guvenli = false
  try {
    guvenli = new URL(adres).protocol === 'https:'
  } catch {
    guvenli = false
  }

  if (!guvenli) {
    return (
      <div className="cerceve bg-yuzey-2 text-metin-3 flex aspect-video items-center justify-center px-6 text-center text-mikro">
        360° tur adresi geçersiz. Adres <code>https://</code> ile başlamalı.
      </div>
    )
  }

  if (acik) {
    return (
      <div className="cerceve aspect-video overflow-hidden">
        <iframe
          src={adres}
          title={baslik}
          loading="lazy"
          allow="accelerometer; gyroscope; fullscreen; xr-spatial-tracking"
          allowFullScreen
          className="h-full w-full border-0"
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setAcik(true)}
      className="cerceve bg-kakao-yuzey text-metin flex aspect-video w-full flex-col items-center justify-center gap-3 px-6 text-center"
    >
      <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true" fill="currentColor">
        <path d="M12 3c-4.97 0-9 2.24-9 5v8c0 2.76 4.03 5 9 5s9-2.24 9-5V8c0-2.76-4.03-5-9-5zm0 2c4.14 0 7 1.72 7 3s-2.86 3-7 3-7-1.72-7-3 2.86-3 7-3z" />
      </svg>
      <span className="text-govde">360° turu aç</span>
      {/* ⚠️ Renk tek taşıyıcı değil (WCAG 1.4.1): niyet metinle de yazılı. */}
      <span className="text-metin-2 text-mikro">
        Tur ayrı bir hizmetten yüklenir; ancak dokunduğunuzda bağlanılır.
      </span>
    </button>
  )
}
