'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Görüş alanına girince oturan bölüm.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ HAREKET BİR GÖRÜNÜRLÜK ŞARTI DEĞİL.
 *
 * Öğe varsayılan olarak GÖRÜNÜR (`[data-sahne]` → `opacity: 1`). "Bekliyor"
 * durumunu bu bileşen JavaScript indikten sonra veriyor. JS hiç inmezse,
 * gözlemci desteklenmezse ya da bir hata olursa içerik olduğu gibi
 * duruyor.
 *
 * Ters kurulum — CSS'te gizle, JS ile göster — çok daha yaygın ve çok daha
 * kırılgan: tek bir betik hatası sayfayı boş bırakır. İçerik hiçbir zaman
 * bir animasyonun çalışmasına bağlı olmamalı.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ `once: true` karşılığı: gözlemci ilk girişte kendini söküyor. Yukarı
 * kaydırınca tekrar oynayan bir giriş, ikinci görüşte gösterişe dönüşür ve
 * okumayı böler.
 */
export function Sahne({
  children,
  gecikme = 0,
  className,
  as = 'div',
}: {
  children: ReactNode
  /** Kademeli giriş için ms. ⚠️ 30–80 ms arası; fazlası sayfayı yavaş gösterir. */
  gecikme?: number
  className?: string
  as?: 'div' | 'section' | 'li' | 'article'
}) {
  /**
   * ⚠️ Etiket `'div'`e DARALTILIYOR — çalışma zamanında değil, yalnızca tipte.
   *
   * `as` bir birleşim (`'div' | 'li' | …`) ve React her etiket için ayrı bir
   * `ref` tipi bekliyor; birleşimin ref tipi bir KESİŞİM oluyor ve hiçbir tek
   * ref ona uymuyor. JSX'e giden değer değişmiyor: `<li>` istenmişse `<li>`
   * basılıyor. Daraltma yalnızca ref'in tek bir tipte tutulmasını sağlıyor.
   */
  const Etiket = as as 'div'
  const dugumRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const dugum = dugumRef.current
    if (dugum === null) return

    // Hareket azaltma tercihinde hiç sahneye alınmıyor.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (typeof IntersectionObserver === 'undefined') return

    dugum.dataset.sahne = 'bekliyor'

    const gozlemci = new IntersectionObserver(
      (girisler) => {
        for (const giris of girisler) {
          if (!giris.isIntersecting) continue
          dugum.dataset.sahne = 'girdi'
          // ⚠️ İlk girişte sökülüyor: tekrar oynayan giriş okumayı böler.
          gozlemci.disconnect()
        }
      },
      // Öğe tam görünmeden başlasın; kullanıcı hareketi yakalasın, sonucunu değil.
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )

    gozlemci.observe(dugum)
    return () => gozlemci.disconnect()
  }, [])

  return (
    <Etiket
      ref={dugumRef}
      data-sahne=""
      style={
        gecikme > 0 ? ({ '--sahne-gecikme': `${gecikme}ms` } as React.CSSProperties) : undefined
      }
      className={className}
    >
      {children}
    </Etiket>
  )
}
