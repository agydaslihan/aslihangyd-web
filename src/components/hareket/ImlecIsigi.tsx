'use client'

import { useEffect, useRef, useState } from 'react'

import { azHareketIsteniyor, masaustuMu } from '@/lib/hareket/kapi'

/**
 * İmleç ışıması — farenin peşinde yumuşak bir altın halesi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ YALNIZCA MASAÜSTÜ VE YALNIZCA LCP'DEN SONRA.
 *
 * Kapının kendisi `ImlecKatmani` içinde: bu bileşen ancak koşullar
 * sağlandığında render ediliyor, yani parçası da o ana kadar inmiyor
 * (ölçüldü: doğrudan `next/dynamic` ile çağrıldığında 21 kB ilk yüke
 * giriyordu).
 *
 * Buradaki kapı çağrıları İKİNCİ SAVUNMA: bileşen başka bir yerden
 * çağrılırsa dokunmatik cihazda dinleyici takmasın.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ KONUM `requestAnimationFrame` İÇİNDE YAZILIYOR, `mousemove` İÇİNDE
 * DEĞİL.
 *
 * `mousemove` saniyede 120'ye kadar tetikleniyor; her olayda stil yazmak
 * ekranın yenileme hızından fazla iş demek. Olay yalnızca son konumu bir
 * değişkene koyuyor, çizim kareye bırakılıyor — INP hedefini (200 ms)
 * koruyan ayrım bu.
 *
 * ⚠️ `translate3d` ve `opacity` DIŞINDA hiçbir şey değişmiyor: düzen
 * hesabı yok, CLS'e katkı yok.
 */
export function ImlecIsigi(): React.ReactElement {
  const dugumRef = useRef<HTMLDivElement | null>(null)
  const [gorunur, setGorunur] = useState(false)

  useEffect(() => {
    /**
     * ⚠️ İKİNCİ SAVUNMA. Kapı `ImlecKatmani` içinde geçiliyor ve bileşen
     * ancak orada render ediliyor. Buradaki kontrol, bileşenin başka bir
     * yerden çağrılması ihtimaline karşı: dokunmatik cihazda dinleyici
     * takılmasın.
     */
    if (azHareketIsteniyor() || !masaustuMu()) return

    let kare = 0
    let x = 0
    let y = 0
    let bekleyen = false

    const ciz = () => {
      bekleyen = false
      const dugum = dugumRef.current
      if (dugum) dugum.style.transform = `translate3d(${x}px, ${y}px, 0)`
    }

    const hareket = (olay: PointerEvent) => {
      // ⚠️ Yalnızca gerçek fare: kalem ve dokunma bu ışığı tetiklemez.
      if (olay.pointerType !== 'mouse') return
      x = olay.clientX
      y = olay.clientY
      setGorunur(true)
      if (bekleyen) return
      bekleyen = true
      kare = requestAnimationFrame(ciz)
    }

    const ayril = () => setGorunur(false)

    window.addEventListener('pointermove', hareket, { passive: true })
    document.addEventListener('pointerleave', ayril)

    return () => {
      cancelAnimationFrame(kare)
      window.removeEventListener('pointermove', hareket)
      document.removeEventListener('pointerleave', ayril)
    }
  }, [])

  return (
    <div
      ref={dugumRef}
      aria-hidden="true"
      data-yazdirma="gizle"
      data-gorunur={gorunur ? 'evet' : 'hayir'}
      className="imlec-isigi"
    />
  )
}
