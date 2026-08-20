'use client'

import { useEffect } from 'react'

import { azHareketIsteniyor, lcpSonrasi } from '@/lib/hareket/kapi'
import { lenisBaslat } from '@/lib/hareket/yukleyiciler'

/**
 * Hareket altyapısının açılışı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU BİLEŞEN HİÇBİR ŞEY ÇİZMEZ. Tek işi "hareket kodu ne zaman ve inecek
 * mi" sorusunu cevaplamak.
 *
 * Şartnamenin yükleme stratejisi pazarlığa kapalı ve dört maddesi de
 * burada karşılanıyor:
 *
 *   1. LCP'DEN SONRA — `lcpSonrasi` gerçek LCP olayını bekliyor; kütüphane
 *      hero boyanmadan önce ağa çıkmıyor.
 *   2. ROTA BAZLI BÖLME — GSAP burada hiç anılmıyor; onu yalnızca kaydırma
 *      anlatısı olan sayfa `gsapGetir()` ile istiyor.
 *   3. LENİS SADECE MASAÜSTÜ — kontrol `lenisBaslat` içinde, `pointer:fine`
 *      + geniş ekran.
 *   4. AZ HAREKET — kapı en başta: `import()` hiç çağrılmıyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ ERKEN ÇIKIŞ `useEffect` İÇİNDE, BİLEŞENİN DIŞINDA DEĞİL.
 * `matchMedia` sunucuda yok; koşulu render sırasında okumak hidrasyon
 * uyuşmazlığı üretirdi. Etki yalnızca tarayıcıda çalışıyor.
 */
export function HareketAltyapisi(): null {
  useEffect(() => {
    if (azHareketIsteniyor()) return

    let lenis: Awaited<ReturnType<typeof lenisBaslat>> = null
    let iptal = false

    const vazgec = lcpSonrasi(() => {
      void lenisBaslat().then((ornek) => {
        if (iptal) {
          ornek?.destroy()
          return
        }
        lenis = ornek
      })
    })

    return () => {
      iptal = true
      vazgec()
      lenis?.destroy()
    }
  }, [])

  return null
}
