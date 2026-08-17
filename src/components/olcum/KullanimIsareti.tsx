'use client'

import { usePathname } from 'next/navigation'
import { useRef, type ReactNode } from 'react'

import { gozlemOlayi } from '@/lib/olcum/istemci'

/**
 * "Bu araç gerçekten kullanıldı" işareti.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ SAYFA GÖRÜNTÜLEME "KULLANIM" DEĞİLDİR.
 *
 * Hesaplayıcı sayfasını açmak düşük niyet; bir değer GİRMEK orta niyet.
 * Aracı açan herkesi "kullandı" saymak, panelde en çok kullanılan
 * hesaplayıcı listesini arama trafiği sıralamasına çevirirdi — ve o liste
 * zaten Katman A'da var.
 *
 * Bu yüzden ölçüt ilk gerçek girdi: `input` olayı bir kez, oturum başına.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ Tek bir sarmalayıcı, yedi forma tek tek dokunmadan iş görüyor. Her
 * hesaplayıcıya ayrı kanca eklenseydi biri eklenmeyi unutulur ve o araç
 * panelde "hiç kullanılmıyor" görünürdü — en yanıltıcı sonuç.
 */
export function KullanimIsareti({ children }: { children: ReactNode }) {
  const yol = usePathname()
  const bildirildi = useRef(false)

  return (
    <div
      onInput={() => {
        if (bildirildi.current) return
        bildirildi.current = true
        // Ayrıntı = aracın yol son parçası; `ARACLAR` adresleriyle aynı.
        gozlemOlayi('hesaplayici_kullanildi', yol.split('/').filter(Boolean).pop())
      }}
    >
      {children}
    </div>
  )
}
