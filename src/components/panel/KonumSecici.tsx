'use client'

import { MapLibreMap, Marker, NavigationControl } from 'maplibre-gl'
import { useEffect, useRef, useState } from 'react'

import { CORLU_MERKEZ, VARSAYILAN_YAKINLIK } from '@/lib/harita/ayarlar'
import { jetonRengi } from '@/lib/harita/jetonlar'
import { stiliCoz, type StilSonucu } from '@/lib/harita/stil'
import { WORKER_HAZIR } from '@/lib/harita/workerAdresi'

import 'maplibre-gl/dist/maplibre-gl.css'

/**
 * ⚠️ Worker kurulumu `@/lib/harita/workerAdresi` içinde ve içe aktarımı
 * ZORUNLU — MapLibre worker'sız tek bir karo çizemez. Gerekçe o dosyada.
 */
void WORKER_HAZIR

export interface KonumSeciciOzellikleri {
  enlem: number | null
  boylam: number | null
  /** Haritaya tıklandığında ya da işaretçi sürüklendiğinde çağrılır. */
  onSecim: (enlem: number, boylam: number) => void
  stilAdresi: string | null
  kilitli?: boolean
}

/**
 * Panelde koordinat seçme haritası.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN AYRI BİR BİLEŞEN, `Harita3B` DEĞİL.
 *
 * `Harita3B` site tarafının sahnesi: mahalle çokgenleri, 3B sütunlar,
 * katman seçici, nokta kümeleri. Buradaki iş tek bir şey — bir nokta
 * koymak. O bileşeni buraya taşımak, panele hiç kullanılmayacak yüzlerce
 * satırlık katman kurulumu getirirdi.
 *
 * Ortak olan şey ALTYAPI ve o paylaşılıyor: aynı stil çözücü (`stiliCoz`),
 * aynı worker modülü, aynı merkez/yakınlık ayarları. Yani "aynı altyapı"
 * kuralı korunuyor; kopyalanan tek şey yok.
 *
 * ⚠️ Bu bileşen YALNIZCA `next/dynamic` + `ssr: false` ile yüklenir.
 * maplibre-gl ~200 kB gzip ve `window` istiyor.
 * ─────────────────────────────────────────────────────────────────────────
 */
export default function KonumSecici({
  enlem,
  boylam,
  onSecim,
  stilAdresi,
  kilitli = false,
}: KonumSeciciOzellikleri) {
  const kapRef = useRef<HTMLDivElement | null>(null)
  const haritaRef = useRef<MapLibreMap | null>(null)
  const isaretciRef = useRef<Marker | null>(null)

  /**
   * ⚠️ Geri çağırma ve kilit bir ref'te tutuluyor.
   *
   * MapLibre olay dinleyicisi harita kurulurken bir kez bağlanıyor; o an
   * kapanışa (closure) giren `onSecim` sonsuza kadar ilk çizimdeki sürüm
   * olurdu. Dinleyiciyi her değişimde yeniden bağlamak ise haritayı
   * kurup yıkmak demek. Ref ikisini de çözüyor.
   *
   * ⚠️ Güncelleme ÇİZİM SIRASINDA DEĞİL, bir etkide. Çizim sırasında
   * ref yazmak React'in eşzamanlı (concurrent) çizimlerinde yarım kalan
   * bir turun değerini kalıcı hâle getirebiliyor; `react-hooks/refs`
   * kuralı tam da bunu engelliyor.
   */
  const secimRef = useRef(onSecim)
  const kilitliRef = useRef(kilitli)

  useEffect(() => {
    secimRef.current = onSecim
    kilitliRef.current = kilitli
  }, [onSecim, kilitli])

  /**
   * ⚠️ Stil ASENKRON çözülüyor ve çözülmeden harita kurulmuyor.
   *
   * `stiliCoz` uzak stili getiriyor; anahtar yoksa ya da MapTiler
   * reddederse yerel sınır stiline düşüyor. Haritayı stilden önce
   * kurmak, ilk çizimde boş bir tuval gösterirdi.
   */
  const [stilSonucu, setStilSonucu] = useState<StilSonucu | null>(null)

  useEffect(() => {
    let iptal = false
    void stiliCoz(stilAdresi).then((sonuc) => {
      if (!iptal) setStilSonucu(sonuc)
    })
    return () => {
      iptal = true
    }
  }, [stilAdresi])

  // Harita bir kez kuruluyor; değer değişimleri aşağıdaki etkide işleniyor.
  useEffect(() => {
    const kap = kapRef.current
    if (kap === null || stilSonucu === null) return

    const harita = new MapLibreMap({
      container: kap,
      style: stilSonucu.stil,
      center: CORLU_MERKEZ,
      zoom: VARSAYILAN_YAKINLIK,
      attributionControl: { compact: true },
      // Panelde 3B'ye gerek yok; eğim kamerayı tıklama hedefinden kaydırır.
      pitch: 0,
      dragRotate: false,
    })

    harita.addControl(new NavigationControl({ showCompass: false }), 'top-right')

    harita.on('click', (olay) => {
      if (kilitliRef.current) return
      secimRef.current(olay.lngLat.lat, olay.lngLat.lng)
    })

    // İmleç haritanın tıklanabilir olduğunu söylüyor.
    harita.getCanvas().style.cursor = kilitli ? 'default' : 'crosshair'

    haritaRef.current = harita
    return () => {
      harita.remove()
      haritaRef.current = null
      isaretciRef.current = null
    }
  }, [stilSonucu, kilitli])

  // Değer değişince işaretçiyi taşı; harita yeniden kurulmuyor.
  useEffect(() => {
    const harita = haritaRef.current
    if (harita === null) return

    if (enlem === null || boylam === null) {
      isaretciRef.current?.remove()
      isaretciRef.current = null
      return
    }

    if (isaretciRef.current === null) {
      /**
       * ⚠️ Renk JETONDAN — ham hex değil. Aurora paleti tek kaynak;
       * `lib/tasarim/disiplin.test.ts` bunu denetliyor ve haklı: panelde
       * elle yazılmış bir renk, tema değiştiğinde sessizce yanlış kalır.
       */
      const isaretci = new Marker({ draggable: !kilitli, color: jetonRengi('--color-aksan') })
        .setLngLat([boylam, enlem])
        .addTo(harita)

      isaretci.on('dragend', () => {
        const konum = isaretci.getLngLat()
        secimRef.current(konum.lat, konum.lng)
      })

      isaretciRef.current = isaretci
    } else {
      isaretciRef.current.setLngLat([boylam, enlem])
    }

    /**
     * ⚠️ `jumpTo` değil `easeTo`, ve yalnızca nokta görüş alanının
     * DIŞINDAYSA. Her değer değişiminde kamerayı zıplatmak, kullanıcı
     * haritayı elle kaydırmışken onu geri çeker — yazarken rakam
     * düzeltmek imkânsız hâle gelirdi.
     */
    if (!harita.getBounds().contains([boylam, enlem])) {
      harita.easeTo({ center: [boylam, enlem], duration: 400 })
    }
  }, [enlem, boylam, kilitli])

  return (
    <div
      ref={kapRef}
      className="konum-harita"
      /**
       * ⚠️ Harita klavyeyle kullanılamaz ve bu KABUL EDİLEBİLİR — çünkü
       * yedek yol var: enlem/boylam kutuları tam yetkili giriştir ve
       * haritadan önce geliyor. Harita bir kolaylık, tek yol değil.
       * Bu yüzden ekran okuyucudan gizleniyor: gezinilecek bir şey yok.
       */
      aria-hidden="true"
    />
  )
}
