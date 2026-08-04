'use client'

// maplibre-gl v6 yalnızca adlandırılmış dışa aktarım sunar; varsayılan
// dışa aktarımı yoktur. `Map` küresel `Map` tipini gölgelediği için
// `MapLibreMap` takma adıyla alınıyor.
import {
  LngLatBounds,
  MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  ScaleControl,
} from 'maplibre-gl'
import { useEffect, useRef, useState } from 'react'

import { CORLU_MERKEZ, poiRengi, stilAdresi, VARSAYILAN_YAKINLIK } from '@/lib/harita'

import 'maplibre-gl/dist/maplibre-gl.css'

/**
 * MapLibre haritası.
 *
 * ⚠️ Bu bileşen yalnızca `next/dynamic` ile, `ssr: false` olarak yüklenmeli.
 * maplibre-gl ~200 kB gzip'tir ve `window` erişimi gerektirir; ana paket
 * içine girmesi sitenin tüm sayfalarının LCP'sini bozar.
 *
 * Erişilebilirlik notu: harita klavyeyle gezilebilir (MapLibre yerleşik
 * olarak destekler) ama bir haritanın kendisi ekran okuyucu için anlamlı
 * değildir. Bu yüzden haritanın gösterdiği her şey ayrıca metin listesi
 * olarak da sunulur (bkz. `HaritaBolumu`).
 */

export interface HaritaNoktasi {
  id: string | number
  ad: string
  tip: string
  boylam: number
  enlem: number
  /** Tıklanınca gidilecek adres (ilan noktaları için). */
  adres?: string
  /** Baloncukta gösterilecek ikinci satır. */
  altBilgi?: string
}

export interface HaritaAlani {
  id: string | number
  ad: string
  /** GeoJSON Polygon veya MultiPolygon geometrisi. */
  geometri: GeoJSON.Geometry
}

export function Harita({
  noktalar = [],
  alanlar = [],
  merkez = CORLU_MERKEZ,
  yakinlik = VARSAYILAN_YAKINLIK,
  yukseklik = 'h-[28rem]',
}: {
  noktalar?: HaritaNoktasi[]
  alanlar?: HaritaAlani[]
  merkez?: [number, number]
  yakinlik?: number
  yukseklik?: string
}) {
  const kapsayiciRef = useRef<HTMLDivElement>(null)
  const haritaRef = useRef<MapLibreMap | null>(null)
  const [hata, setHata] = useState<string | null>(null)

  /**
   * WebGL desteği render sırasında, tembel state başlatıcısıyla ölçülüyor.
   *
   * Bunu efekt içinde `setState` ile yapmak hem fazladan bir render turu
   * doğurur hem de React'in "efekt gövdesinde senkron setState" uyarısını
   * tetikler. Asıl fayda: desteklenmiyorsa MapLibre hiç başlatılmaz ve
   * ~200 kB'lık kütüphane boşuna çalıştırılmaz.
   */
  const [webglVar] = useState(() => webglDestekleniyorMu())

  useEffect(() => {
    if (!webglVar || !kapsayiciRef.current || haritaRef.current) return

    const harita = new MapLibreMap({
      container: kapsayiciRef.current,
      style: stilAdresi(),
      center: merkez,
      zoom: yakinlik,
      attributionControl: { compact: true },
      // Sayfa kaydırırken haritanın kazara yakınlaşmasını engeller —
      // mobilde en can sıkıcı harita davranışı budur.
      scrollZoom: false,
    })

    haritaRef.current = harita

    harita.addControl(new NavigationControl({ showCompass: false }), 'top-right')
    harita.addControl(new ScaleControl({ unit: 'metric' }), 'bottom-left')
    // Ctrl/⌘ basılıyken kaydırma yakınlaştırsın — kullanıcı isterse yapabilsin.
    harita.getCanvas().style.cursor = 'grab'

    harita.on('error', () => setHata('Harita katmanı yüklenemedi.'))

    harita.on('load', () => {
      for (const alan of alanlar) {
        const kaynakId = `alan-${alan.id}`
        harita.addSource(kaynakId, {
          type: 'geojson',
          data: { type: 'Feature', geometry: alan.geometri, properties: { ad: alan.ad } },
        })
        harita.addLayer({
          id: `${kaynakId}-dolgu`,
          type: 'fill',
          source: kaynakId,
          paint: { 'fill-color': '#3b5a8a', 'fill-opacity': 0.08 },
        })
        harita.addLayer({
          id: `${kaynakId}-cizgi`,
          type: 'line',
          source: kaynakId,
          paint: { 'line-color': '#3b5a8a', 'line-width': 2, 'line-opacity': 0.6 },
        })
      }

      for (const nokta of noktalar) {
        const isaret = document.createElement('button')
        isaret.type = 'button'
        isaret.setAttribute('aria-label', nokta.ad)
        isaret.style.cssText =
          `width:14px;height:14px;border-radius:9999px;border:2px solid #fff;cursor:pointer;` +
          `background:${poiRengi(nokta.tip)};box-shadow:0 1px 4px rgba(0,0,0,.3)`

        const icerik = document.createElement('div')
        icerik.style.cssText = 'font-size:13px;line-height:1.4;max-width:14rem'
        const baslik = document.createElement('strong')
        baslik.textContent = nokta.ad
        icerik.append(baslik)

        if (nokta.altBilgi) {
          const alt = document.createElement('div')
          alt.style.cssText = 'color:#555;margin-top:2px'
          alt.textContent = nokta.altBilgi
          icerik.append(alt)
        }
        if (nokta.adres) {
          const bag = document.createElement('a')
          bag.href = nokta.adres
          bag.textContent = 'Ayrıntıya git'
          bag.style.cssText = 'display:inline-block;margin-top:6px;color:#2b4a7a'
          icerik.append(bag)
        }

        new Marker({ element: isaret })
          .setLngLat([nokta.boylam, nokta.enlem])
          .setPopup(new Popup({ offset: 14, closeButton: true }).setDOMContent(icerik))
          .addTo(harita)
      }

      // Tüm noktalar görünecek şekilde çerçevele.
      if (noktalar.length > 1) {
        const sinirlar = new LngLatBounds()
        for (const nokta of noktalar) sinirlar.extend([nokta.boylam, nokta.enlem])
        harita.fitBounds(sinirlar, { padding: 60, maxZoom: 15, duration: 0 })
      }
    })

    return () => {
      harita.remove()
      haritaRef.current = null
    }
    // Noktalar/alanlar değişirse haritayı baştan kurmak, artımlı güncellemeden
    // hem daha basit hem bu ölçekte (birkaç yüz nokta) yeterince hızlı.
  }, [webglVar, noktalar, alanlar, merkez, yakinlik])

  if (!webglVar) {
    return (
      <div
        className={`border-cizgi bg-yuzey-2/60 rounded-yumusak text-murekkep-2 flex ${yukseklik} items-center justify-center border border-dashed px-6 text-center text-sm`}
      >
        Tarayıcınız etkileşimli haritayı desteklemiyor. Aynı bilgiler aşağıdaki listede yer alıyor.
      </div>
    )
  }

  if (hata) {
    return (
      <div
        className={`border-cizgi bg-yuzey-2/60 rounded-yumusak text-murekkep-2 flex ${yukseklik} items-center justify-center border border-dashed px-6 text-center text-sm`}
      >
        {hata} Aşağıdaki listeden aynı bilgilere ulaşabilirsiniz.
      </div>
    )
  }

  return (
    <div
      ref={kapsayiciRef}
      className={`rounded-yumusak border-cizgi w-full overflow-hidden border ${yukseklik}`}
      // Harita görsel bir yardımcıdır; asıl içerik yanındaki metin listesidir.
      role="img"
      aria-label="Çorlu haritası. Aynı bilgiler aşağıdaki listede metin olarak da yer alıyor."
    />
  )
}

/**
 * Tarayıcı WebGL destekliyor mu?
 *
 * MapLibre WebGL olmadan çalışamaz ve bu durumda kurucu hata fırlatır.
 * Önceden kontrol etmek, hatayı yakalamaktan daha temiz: kütüphane hiç
 * çalıştırılmaz ve kullanıcıya doğru mesaj gösterilir.
 */
function webglDestekleniyorMu(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const tuval = document.createElement('canvas')
    return Boolean(tuval.getContext('webgl2') ?? tuval.getContext('webgl'))
  } catch {
    return false
  }
}
