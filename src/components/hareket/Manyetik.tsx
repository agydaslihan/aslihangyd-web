'use client'

import { useEffect, useRef, type ReactNode } from 'react'

import { azHareketIsteniyor, masaustuMu } from '@/lib/hareket/kapi'

/**
 * Manyetik çekim — imleç yaklaşınca butonun ona doğru eğilmesi.
 *
 * ⚠️ SARMALAYICI HİÇBİR ŞEY ÇİZMİYOR, ÇOCUĞU DA DEĞİŞTİRMİYOR. Yalnızca
 * bir `<span>` içine alıp ona `transform` yazıyor. Butonun kendi
 * erişilebilirlik davranışı (odak halkası, klavye, ekran okuyucu)
 * dokunulmadan kalıyor.
 *
 * ⚠️ ÇEKİM ÜST SINIRI 6 px. Daha fazlası imleçle buton arasında görünür bir
 * kayma üretiyor ve tıklama hedefi "kaçıyor" hissi veriyor — özellikle
 * hassas olmayan farelerde.
 *
 * ⚠️ Dokunmatikte ve az hareket tercihinde dinleyici HİÇ takılmıyor.
 */
const AZAMI_PX = 6

export function Manyetik({ children }: { children: ReactNode }) {
  const kapRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    const kap = kapRef.current
    if (!kap) return
    if (azHareketIsteniyor() || !masaustuMu()) return

    let kare = 0
    let bekleyen = false
    let hedefX = 0
    let hedefY = 0

    const ciz = () => {
      bekleyen = false
      kap.style.transform = `translate3d(${hedefX}px, ${hedefY}px, 0)`
    }

    const hareket = (olay: PointerEvent) => {
      if (olay.pointerType !== 'mouse') return
      const kutu = kap.getBoundingClientRect()
      const merkezX = kutu.left + kutu.width / 2
      const merkezY = kutu.top + kutu.height / 2

      /**
       * ⚠️ Çekim, imlecin merkeze uzaklığına ORANLI ve sınırlı. Doğrudan
       * fare konumunu kullanmak butonu imlecin altına yapıştırırdı.
       */
      hedefX = Math.max(-AZAMI_PX, Math.min(AZAMI_PX, (olay.clientX - merkezX) * 0.25))
      hedefY = Math.max(-AZAMI_PX, Math.min(AZAMI_PX, (olay.clientY - merkezY) * 0.25))

      if (bekleyen) return
      bekleyen = true
      kare = requestAnimationFrame(ciz)
    }

    const birak = () => {
      hedefX = 0
      hedefY = 0
      if (!bekleyen) {
        bekleyen = true
        kare = requestAnimationFrame(ciz)
      }
    }

    kap.addEventListener('pointermove', hareket, { passive: true })
    kap.addEventListener('pointerleave', birak)

    return () => {
      cancelAnimationFrame(kare)
      kap.removeEventListener('pointermove', hareket)
      kap.removeEventListener('pointerleave', birak)
      kap.style.transform = ''
    }
  }, [])

  return (
    <span
      ref={kapRef}
      className="inline-flex transition-transform duration-[var(--sure-basma)] ease-[var(--cikis)]"
    >
      {children}
    </span>
  )
}
