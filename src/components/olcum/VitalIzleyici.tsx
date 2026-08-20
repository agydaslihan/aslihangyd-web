'use client'

import { useEffect } from 'react'

/**
 * Core Web Vitals alan ölçümü.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU BİLEŞEN YALNIZCA ANALİTİK ONAYI VARSA RENDER EDİLİYOR.
 *
 * Karar sunucuda veriliyor (`KatmanB.tsx`), tıpkı `OlayIzleyici` gibi. Onay
 * yoksa `web-vitals` modülü hiç içe aktarılmıyor: dinleyici takılmıyor, tek
 * bir istek atılmıyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ `web-vitals` DİNAMİK OLARAK İÇE AKTARILIYOR — ölçüm ölçtüğünü bozmasın.
 *
 * Statik `import` olsaydı kütüphane, onay veren ziyaretçinin ilk paketine
 * girer ve LCP'yi geciktirirdi: performansı ölçmek için performansı
 * bozardık. Dinamik içe aktarma ayrı bir parça üretiyor ve o parça sayfa
 * yerleştikten sonra iniyor.
 *
 * ⚠️ NEDEN ELLE YAZILMADI. LCP birkaç satır ama CLS'in "oturum penceresi"
 * ve INP'nin etkileşim gruplama mantığı öyle değil; elle yazılan bir sürüm
 * sessizce YANLIŞ sayı üretirdi. Bu projede yanlış sayı, sayı olmamasından
 * kötü — kural 2'nin ölçüm hâli. Kütüphane ~3 kB gzip ve tek işi bu.
 *
 * ⚠️ HAM DEĞER SUNUCUDA SAKLANMIYOR. Uç, gelen sayıyı bir kovaya çevirip
 * atıyor; veritabanına yalnızca kova sayacı gidiyor. Gerekçe
 * `lib/olcum/vital.ts` ve `api/olcum/vital/route.ts` içinde.
 */

const UC = '/api/olcum/vital'

interface Olcum {
  ad: string
  deger: number
}

export function VitalIzleyici(): null {
  useEffect(() => {
    let iptal = false
    const kuyruk: Olcum[] = []

    /**
     * ⚠️ Gönderim SAYFA KAPANIRKEN, ölçüm başına değil.
     *
     * `web-vitals` her metriği farklı anda bildiriyor (LCP sayfa
     * yerleşince, INP etkileşimden sonra, CLS kapanışta). Her biri için ayrı
     * istek atmak mobil bağlantıda üç ayrı tur demekti. Beacon, sayfa
     * kapanırken bile gidiyor.
     */
    const gonder = () => {
      if (kuyruk.length === 0) return
      const govde = JSON.stringify(kuyruk.splice(0, kuyruk.length))

      if (typeof navigator.sendBeacon === 'function') {
        navigator.sendBeacon(UC, new Blob([govde], { type: 'application/json' }))
        return
      }
      void fetch(UC, {
        method: 'POST',
        body: govde,
        headers: { 'content-type': 'application/json' },
        keepalive: true,
      }).catch(() => {})
    }

    const ekle = (ad: string, deger: number) => {
      if (iptal) return
      kuyruk.push({ ad, deger })
    }

    void import('web-vitals')
      .then(({ onCLS, onINP, onLCP }) => {
        if (iptal) return
        onLCP((m) => ekle('LCP', m.value))
        onCLS((m) => ekle('CLS', m.value))
        onINP((m) => ekle('INP', m.value))
      })
      .catch(() => {
        // Ölçüm inemezse sayfa etkilenmez; veri o ziyaret için kaybolur.
      })

    /**
     * ⚠️ `pagehide`, `beforeunload` DEĞİL. `beforeunload` mobil tarayıcılarda
     * çoğu zaman hiç tetiklenmiyor (sekme arka plana alınıp öldürülüyor) ve
     * bfcache'i de bozuyor.
     */
    window.addEventListener('pagehide', gonder)

    return () => {
      iptal = true
      window.removeEventListener('pagehide', gonder)
      gonder()
    }
  }, [])

  return null
}
