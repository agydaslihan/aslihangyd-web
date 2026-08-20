'use client'

import { LazyMotion } from 'framer-motion'
import type { ReactNode } from 'react'

import { devinimOzellikleri } from '@/lib/hareket/yukleyiciler'

/**
 * Framer Motion sağlayıcısı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU DOSYA `framer-motion`'ı STATİK İÇE AKTARAN İKİ DOSYADAN BİRİ VE
 * SEBEBİ ŞU: `LazyMotion` render edilmek zorunda, yani bir bileşen olarak
 * elde olmalı. Ama getirdiği şey çekirdeğin küçük parçası (~5 kB); asıl
 * ağırlık olan hareket özellikleri `features` ile SONRADAN iniyor.
 *
 * ⚠️ Bu bileşenin kendisi de yalnızca `next/dynamic` ile yükleniyor —
 * yani çekirdek bile ilk pakete girmiyor. Denetim:
 * `hareketYukleme.test.ts`.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ `strict` AÇIK. Açık olmadığında `motion.div` yazmak mümkün oluyor ve o
 * bileşen, `LazyMotion`'ın kaçındığı tam paketi geri getiriyor — sessizce.
 * `strict` ile `motion.*` kullanmak çalışma zamanı hatası veriyor; doğru
 * kullanım `m.*`.
 */
export function Devinim({ children }: { children: ReactNode }) {
  return (
    <LazyMotion strict features={devinimOzellikleri}>
      {children}
    </LazyMotion>
  )
}
