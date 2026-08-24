'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

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
  /**
   * ⚠️ Örnek bir `ref`te tutuluyor çünkü ikinci bir etki (rota değişimi) de
   * ona erişmek zorunda. Yerel değişken yalnızca kendi etkisinde görünürdü.
   */
  const lenisRef = useRef<Awaited<ReturnType<typeof lenisBaslat>>>(null)
  const yol = usePathname()

  useEffect(() => {
    if (azHareketIsteniyor()) return

    let iptal = false

    const vazgec = lcpSonrasi(() => {
      void lenisBaslat().then((ornek) => {
        if (iptal) {
          ornek?.destroy()
          return
        }
        lenisRef.current = ornek
      })
    })

    return () => {
      iptal = true
      vazgec()
      lenisRef.current?.destroy()
      lenisRef.current = null
    }
  }, [])

  /**
   * Rota değişiminde kaydırma durumunu Lenis'ten geri al.
   *
   * ─────────────────────────────────────────────────────────────────────────
   * ⚠️ ÖLÇÜLDÜ: YENİ SAYFA EN ÜSTTEN AÇILMIYORDU.
   *
   * Ziyaretçi anasayfanın 2400 pikselindeyken menüden `/portfoy`'a
   * geçtiğinde Next kaydırmayı sıfırlıyor, ama Lenis o sıfırlamayı KENDİ
   * yumuşatmasıyla oynatıyor ve asimptotik eğri sıfıra varamadan duruyor.
   * Tıklamadan sonraki ilk üç saniye (örneklendi):
   *
   *     0ms=1106  200ms=292  400ms=30  600ms=30 … 2800ms=30
   *
   * Aynı ölçüm az hareket kipinde (Lenis yok) 0 veriyor. Yani 30 piksel
   * Lenis'in artığı. Görünürde küçük ama yanlış: yeni sayfa başlığın bir
   * kısmı kaymış hâlde açılıyor ve ziyaretçi sebebini göremiyor.
   *
   * ⚠️ GERİ/İLERİ KORUNUYOR. Next `popstate`te eski kaydırma konumunu geri
   * yüklüyor; koşulsuz bir "her yol değişiminde tepeye git" kuralı onu
   * bozardı. Bu yüzden `popstate` bayrağı tutuluyor ve o turda sıfırlama
   * atlanıyor.
   *
   * ⚠️ Adreste çapa (`#icerik`) varsa da dokunulmuyor: hedef tepe değil.
   * ─────────────────────────────────────────────────────────────────────────
   */
  const geriIleriRef = useRef(false)

  useEffect(() => {
    const isaretle = () => {
      geriIleriRef.current = true
    }
    window.addEventListener('popstate', isaretle)
    return () => window.removeEventListener('popstate', isaretle)
  }, [])

  useEffect(() => {
    const lenis = lenisRef.current
    const geriIleri = geriIleriRef.current
    geriIleriRef.current = false

    if (!lenis || geriIleri || window.location.hash) return
    lenis.scrollTo(0, { immediate: true, force: true })
  }, [yol])

  return null
}
