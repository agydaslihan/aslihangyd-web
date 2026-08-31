'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Kendi 360° oynatıcımız — Pannellum.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ TIKLAMADAN ÖNCE HİÇBİR ŞEY İNMİYOR.
 *
 * Pannellum ~18 kB gzip ve yanında bir WebGL sahnesi kuruyor; panorama
 * görselinin kendisi ise birkaç megabayt olabiliyor. Sayfa açılışında
 * yüklemek, turu hiç açmayacak ziyaretçinin verisini harcamak ve LCP'yi
 * bozmak olurdu.
 *
 * Kütüphane `import()` ile, yalnızca düğmeye dokunulduğunda iniyor —
 * video oynatıcı ve dış servis turundaki desenin aynısı.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ POSTER, TURUN KENDİ GÖRSELİ. Ayrı bir kapak alanı eklenmedi: panorama
 * zaten bir görsel ve tarayıcı onu düz gösterdiğinde ne olduğu anlaşılıyor.
 * İkinci bir alan, doldurulmadığında boş bir kutu üretirdi.
 *
 * ⚠️ JİROSKOP MOBİLDE. Telefonu çevirerek bakmak turun yarısı; ama izin
 * iOS'ta kullanıcı hareketi gerektiriyor ve reddedilebiliyor. Reddedilirse
 * tur PARMAKLA çalışmaya devam ediyor — jiroskop bir ek, şart değil.
 */
export function PanoramaTuru({
  panoramaUrl,
  posterUrl,
  baslik,
  altMetin,
}: {
  panoramaUrl: string
  /** Yüklenmeden önce gösterilen küçük sürüm. Yoksa panoramanın kendisi. */
  posterUrl?: string | null
  baslik: string
  altMetin?: string | null
}) {
  const [acik, setAcik] = useState(false)
  const [hata, setHata] = useState<string | null>(null)
  const [yukleniyor, setYukleniyor] = useState(false)
  const kapRef = useRef<HTMLDivElement | null>(null)
  const gorunumRef = useRef<{ destroy: () => void } | null>(null)

  useEffect(() => {
    if (!acik) return
    const kap = kapRef.current
    if (kap === null) return

    let iptal = false
    setYukleniyor(true)

    const kur = async () => {
      try {
        /**
         * ⚠️ Pannellum bir ESM modülü DEĞİL: `window.pannellum` üzerine
         * yazan bir betik. `import()` yan etkisi için çağrılıyor, dönen
         * değer için değil.
         */
        await import('pannellum/build/pannellum.css')
        await import('pannellum/build/pannellum.js')

        const kutuphane = (window as unknown as { pannellum?: PannellumApi }).pannellum
        if (iptal) return
        if (!kutuphane) {
          setHata('360° oynatıcı yüklenemedi.')
          return
        }

        gorunumRef.current = kutuphane.viewer(kap, {
          type: 'equirectangular',
          panorama: panoramaUrl,
          autoLoad: true,
          showZoomCtrl: true,
          showFullscreenCtrl: true,
          /**
           * ⚠️ Otomatik dönüş KAPALI. Kendiliğinden dönen bir sahne,
           * `prefers-reduced-motion` diyen ziyaretçi için rahatsız edici
           * ve bakmak istediği yeri kaydırıp duruyor.
           */
          autoRotate: 0,
          orientationOnByDefault: false,
          hotSpotDebug: false,
          // MapLibre'deki kuralın aynısı: kaydırma sayfayı değil,
          // yalnızca ⌘/Ctrl basılıyken sahneyi yakınlaştırsın.
          mouseZoom: 'fullscreenonly',
          friction: 0.15,
        })
      } catch {
        if (!iptal) setHata('360° oynatıcı yüklenemedi. Sayfayı yenileyip tekrar deneyin.')
      } finally {
        if (!iptal) setYukleniyor(false)
      }
    }

    void kur()

    return () => {
      iptal = true
      // ⚠️ WebGL bağlamı elle kapatılmalı: bırakılan her sahne bir GPU
      // bağlamı tutuyor ve tarayıcının bağlam sınırı düşük.
      gorunumRef.current?.destroy()
      gorunumRef.current = null
    }
  }, [acik, panoramaUrl])

  if (hata !== null) {
    return (
      <div className="cerceve bg-yuzey-2 text-metin-3 flex aspect-video items-center justify-center px-6 text-center text-mikro">
        {hata}
      </div>
    )
  }

  if (!acik) {
    return (
      <button
        type="button"
        onClick={() => setAcik(true)}
        className="cerceve relative flex aspect-video w-full items-center justify-center overflow-hidden"
      >
        {/* ⚠️ `next/image` DEĞİL: panorama 2:1 ve kırpılarak gösteriliyor;
            burada yapılan iş bir önizleme, ölçülü bir yerleşim değil.
            `alt` boş çünkü hemen altındaki metin aynı şeyi söylüyor. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={posterUrl ?? panoramaUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
        <span className="absolute inset-0 bg-[color:var(--color-notr-900)]/45" aria-hidden />
        <span className="text-notr-50 relative flex flex-col items-center gap-2 px-6 text-center">
          <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true" fill="currentColor">
            <path d="M12 3c-4.97 0-9 2.24-9 5v8c0 2.76 4.03 5 9 5s9-2.24 9-5V8c0-2.76-4.03-5-9-5zm0 2c4.14 0 7 1.72 7 3s-2.86 3-7 3-7-1.72-7-3 2.86-3 7-3z" />
          </svg>
          <span className="text-govde">360° turu aç</span>
          <span className="text-mikro opacity-90">
            {altMetin ?? baslik} · Oynatıcı ancak dokunduğunuzda yüklenir.
          </span>
        </span>
      </button>
    )
  }

  return (
    <div className="cerceve relative aspect-video overflow-hidden">
      <div ref={kapRef} className="h-full w-full" role="application" aria-label={baslik} />
      {yukleniyor ? (
        <p className="text-metin-3 absolute inset-0 flex items-center justify-center text-mikro">
          Yükleniyor…
        </p>
      ) : null}
    </div>
  )
}

/** Pannellum'un kullandığımız kadarı. */
interface PannellumApi {
  viewer: (kap: HTMLElement, ayarlar: Record<string, unknown>) => { destroy: () => void }
}
