'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'

import { turAdresiniDenetle } from '@/lib/medya/turAdresi'

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
/**
 * Panorama oynatıcısı TEMBEL.
 *
 * ⚠️ `SanalTur` her tur bölümünde çiziliyor; Pannellum'u statik içe
 * aktarmak, dış servis turu kullanan sayfalara da o kütüphaneyi sokardı.
 */
const PanoramaTuru = dynamic(() => import('./PanoramaTuru').then((modul) => modul.PanoramaTuru), {
  ssr: false,
  loading: () => <div className="iskelet aspect-video w-full" aria-hidden />,
})

/**
 * Tur bölümünün yönlendiricisi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ PANORAMA VARSA O KAZANIR — VE SIRA BELİRSİZ BIRAKILMADI.
 *
 * Panorama bizim dosyamız; dış servis üçüncü tarafa istek demek. İkisi de
 * doluyken hangisinin görüneceği yazılı olmasaydı, "hangisi görünüyor?"
 * sorusunun cevabı olmayan bir ekran olurdu.
 *
 * ⚠️ İKİSİ DE BOŞSA `null` — bölüm HİÇ ÇİZİLMEZ. Çağıran taraf da bunu
 * biliyor ve başlığı basmıyor: "360° tur yakında" yazan bir kutu, her
 * sayfada duran ve hiç dolmayan bir vaat olurdu.
 * ─────────────────────────────────────────────────────────────────────────
 */
export function TurBolumu({
  panoramaUrl,
  panoramaAlt,
  adres,
  baslik,
}: {
  panoramaUrl?: string | null
  panoramaAlt?: string | null
  adres?: string | null
  baslik: string
}) {
  if (typeof panoramaUrl === 'string' && panoramaUrl !== '') {
    return <PanoramaTuru panoramaUrl={panoramaUrl} baslik={baslik} altMetin={panoramaAlt ?? null} />
  }

  if (typeof adres === 'string' && adres !== '') {
    return <SanalTur adres={adres} baslik={baslik} />
  }

  return null
}

/** Dış servis turu — Kuula, Matterport, Street View. */
export function SanalTur({ adres, baslik }: { adres: string; baslik: string }) {
  const [acik, setAcik] = useState(false)

  /**
   * ⚠️ `https` OLMAK GÖMÜLEBİLİR OLMAK DEĞİL.
   *
   * Eski kontrol yalnızca protokole bakıyordu ve üretimde bir Google Maps
   * PAYLAŞIM linki (`maps.app.goo.gl/…`) geçti: adres https'ti, çerçeveye
   * kondu, Google gömülmeyi reddetti ve ziyaretçi boş/kırık bir kutu
   * gördü — sebebi hiçbir yerde yazmadan.
   */
  const durum = turAdresiniDenetle(adres)

  if (!durum.gecerli) {
    return (
      <div className="cerceve bg-yuzey-2 text-metin-3 flex aspect-video items-center justify-center px-6 text-center text-mikro leading-relaxed">
        {durum.mesaj}
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
      className="cerceve bg-koyu-bant text-metin flex aspect-video w-full flex-col items-center justify-center gap-3 px-6 text-center"
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
