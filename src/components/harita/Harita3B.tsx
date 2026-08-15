'use client'

// maplibre-gl v6 yalnızca adlandırılmış dışa aktarım sunar; varsayılan
// dışa aktarımı yoktur. `Map` küresel `Map` tipini gölgelediği için
// `MapLibreMap` takma adıyla alınıyor.
import type { AllPaintProperties } from 'maplibre-gl'
import { GeolocateControl, MapLibreMap, NavigationControl, ScaleControl } from 'maplibre-gl'
import { useEffect, useRef, useState } from 'react'

import { CORLU_MERKEZ, VARSAYILAN_YAKINLIK } from '@/lib/harita/ayarlar'
import { haritaRenkleri } from '@/lib/harita/jetonlar'
import { cokgenUret, SUTUN_YARICAPI_M, type Konum } from '@/lib/harita/sutunlar'

import 'maplibre-gl/dist/maplibre-gl.css'

/**
 * 3B Çorlu haritası.
 *
 * ⚠️ Bu bileşen YALNIZCA `next/dynamic` + `ssr: false` ile yüklenir.
 * maplibre-gl ~200 kB gzip'tir ve `window` erişimi gerektirir; ana pakete
 * girmesi bütün sayfaların LCP'sini bozar. Ölçüm: docs/ILERLEME.md.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Neden ek bir 3B motoru yok
 *
 * deck.gl `ColumnLayer` daha zengin ama ~130 kB gzip daha getiriyor ve
 * kendi render döngüsünü MapLibre'ninkiyle senkronlamak gerekiyor.
 * `fill-extrusion` zaten MapLibre'nin içinde: ek bayt yok, kamera ve
 * ışıklandırma haritanınkiyle aynı. Sunucu 3,2 GB RAM / 2 vCPU.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Erişilebilirlik: harita `role="img"`dir. Gösterdiği her mahalle ve nokta
 * ayrıca metin listesi olarak da sunulur (`HaritaSahnesi`), seçim oradan da
 * yapılabilir. Ekran okuyucu kullanan biri hiçbir veriyi kaybetmez.
 */

export interface MahalleGeometrisi {
  slug: string
  ad: string
  /** Merkez koordinatı yoksa sütun çizilmez — uydurma konum kullanılmaz. */
  merkez: Konum | null
  /** GeoJSON Polygon/MultiPolygon. Yoksa yalnızca sütun çizilir. */
  sinir: GeoJSON.Geometry | null
  /** Seçili veri kipinde değeri var mı — yoksa kesikli sınır + "Veri yok". */
  veriVar: boolean
}

export interface SutunOzelligi {
  slug: string
  ad: string
  yukseklik: number
  etiket: string
}

export interface HaritaNoktasi {
  id: string | number
  ad: string
  /** Katman anahtarı — görünürlük buna göre açılıp kapanır. */
  katman: string
  boylam: number
  enlem: number
  adres?: string
  altBilgi?: string
}

export interface Harita3BOzellikleri {
  /**
   * MapLibre stil adresi — MapTiler anahtarını içerir.
   *
   * ⚠️ Bileşen bunu KENDİ KURMUYOR, sunucudan prop olarak alıyor. Anahtar
   * çalışma zamanında sunucuda okunuyor (`lib/harita/sunucu.ts`); burada
   * `process.env`'den okumak, değeri derleme anına bağlar ve üretimde
   * haritayı sessizce kapatırdı. Gerekçenin tamamı o dosyada.
   */
  stilAdresi: string
  mahalleler: MahalleGeometrisi[]
  sutunlar: SutunOzelligi[]
  noktalar: HaritaNoktasi[]
  /** Açık katman anahtarları. */
  acikKatmanlar: ReadonlySet<string>
  /** Nokta katmanlarının anahtar → renk eşlemesi. */
  noktaKatmanlari: readonly { anahtar: string; renk: string }[]
  boyutlu: boolean
  seciliSlug: string | null
  onSecim: (slug: string | null) => void
  /** Göstergede yazacak açıklama — MapLibre'ye değil, sahneye ait. */
  onHata: (mesaj: string | null) => void
}

/**
 * MapLibre arayüz metinleri.
 *
 * Kütüphane varsayılan olarak İngilizce konuşur. Türkçe bir sitede
 * "Zoom in" yazan bir düğme, çevirisi unutulmuş bir arayüzün en görünür
 * işaretidir (CLAUDE.md: kullanıcıya görünen her şey Türkçe).
 */
const MAPLIBRE_TURKCE: Record<string, string> = {
  'AttributionControl.ToggleAttribution': 'Kaynakça',
  'AttributionControl.MapFeedback': 'Harita geri bildirimi',
  'FullscreenControl.Enter': 'Tam ekrana geç',
  'FullscreenControl.Exit': 'Tam ekrandan çık',
  'GeolocateControl.FindMyLocation': 'Konumumu bul',
  'GeolocateControl.LocationNotAvailable': 'Konum bilgisi alınamadı',
  'LogoControl.Title': 'MapLibre logosu',
  'Map.Title': 'Harita',
  'NavigationControl.ResetBearing': 'Kuzeyi yukarı çevir',
  'NavigationControl.ZoomIn': 'Yakınlaştır',
  'NavigationControl.ZoomOut': 'Uzaklaştır',
  'ScaleControl.Feet': 'ft',
  'ScaleControl.Meters': 'm',
  'ScaleControl.Kilometers': 'km',
  'ScrollZoomBlocker.CtrlMessage': 'Yakınlaştırmak için Ctrl + kaydırın',
  'ScrollZoomBlocker.CmdMessage': 'Yakınlaştırmak için ⌘ + kaydırın',
  'TouchPanBlocker.Message': 'Haritayı iki parmakla kaydırın',
}

const KAYNAK_SUTUN = 'sutunlar'
const KAYNAK_MAHALLE = 'mahalleler'
const KAYNAK_NOKTA = 'noktalar'

const KATMAN_SUTUN = 'fiyat-sutunlari'
const KATMAN_SUTUN_ETIKET = 'fiyat-sutunlari-etiket'
const KATMAN_MAHALLE_DOLGU = 'mahalle-dolgu'
const KATMAN_MAHALLE_CIZGI = 'mahalle-sinirlari'
const KATMAN_MAHALLE_KESIK = 'mahalle-sinirlari-veriyok'
const KATMAN_MAHALLE_ETIKET = 'mahalle-etiket'
const KATMAN_BINA = 'binalar'

/**
 * "Hiçbir mahalle seçili değil" nöbetçisi.
 *
 * MapLibre `['==', ['get', 'slug'], X]` ifadesi bir karşılaştırma değeri
 * ister; seçim yokken hiçbir mahalleyle eşleşmeyecek bir değer gerekiyor.
 * NUL, slug üretiminden asla çıkamaz (bkz. `slug.ts`), dolayısıyla güvenli.
 *
 * ⚠️ KAÇIŞ DİZİSİYLE YAZILIYOR, HAM BAYT OLARAK DEĞİL.
 *
 * Daha önce buraya ham bir NUL baytı yazılmıştı. Çalışma zamanında farkı
 * yok ama kaynak dosyayı ikili (`file` → "data") hâle getiriyordu ve
 * **grep 684 satırın tamamını sessizce atlıyordu.** 12 Ağustos 2026'da
 * yapılan ortam denetiminde tam olarak buna yakalandık: "MapTiler anahtarı
 * istemci tarafında kullanılmıyor" sonucuna varıldı, oysa bu dosya
 * `stilAdresi()` çağırıyordu. Yanlış teşhis, yanlış düzeltmeye götürüyordu.
 *
 * Aynı nöbetçi iki yerde farklı yazılmıştı (biri boş dize, biri NUL);
 * tek sabitte birleştirildi.
 */
const HICBIR_SLUG = '\u0000'

/** Katman anahtarları — panelle bu dosya arasındaki sözleşme. */
export const KATMAN_ANAHTARLARI = {
  sutunlar: KATMAN_SUTUN,
  sinirlar: KATMAN_MAHALLE_CIZGI,
  binalar: KATMAN_BINA,
} as const

export function Harita3B({
  stilAdresi,
  mahalleler,
  sutunlar,
  noktalar,
  acikKatmanlar,
  noktaKatmanlari,
  boyutlu,
  seciliSlug,
  onSecim,
  onHata,
}: Harita3BOzellikleri) {
  const kapsayiciRef = useRef<HTMLDivElement>(null)
  const haritaRef = useRef<MapLibreMap | null>(null)
  const [hazir, setHazir] = useState(false)

  /**
   * Seçim geri çağrısı bir ref'te tutuluyor.
   *
   * Doğrudan efekt bağımlılığına konsaydı, üst bileşen her render'da yeni bir
   * fonksiyon ürettiği için tıklama işleyicileri sürekli sökülüp takılırdı.
   * Atama render sırasında değil efektte yapılıyor — render sırasında ref
   * yazmak eşzamanlı render'da tutarsız sonuç verir.
   */
  const secimRef = useRef(onSecim)
  useEffect(() => {
    secimRef.current = onSecim
  }, [onSecim])

  /**
   * WebGL desteği render sırasında, tembel state başlatıcısıyla ölçülüyor.
   * Efekt içinde `setState` hem fazladan bir render turu doğurur hem de
   * React'in "efekt gövdesinde senkron setState" uyarısını tetikler.
   */
  const [webglVar] = useState(() => webglDestekleniyorMu())

  /* ── Kurulum ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!webglVar || !kapsayiciRef.current || haritaRef.current) return

    const harita = new MapLibreMap({
      container: kapsayiciRef.current,
      style: stilAdresi,
      center: CORLU_MERKEZ,
      zoom: VARSAYILAN_YAKINLIK,
      // Eğim ve döndürme 3B'nin ön koşulu; sahnedeki düğmeler bunları sürer.
      pitch: 0,
      bearing: 0,
      attributionControl: { compact: true },
      /**
       * İşbirlikçi hareketler: kaydırma tek başına yakınlaştırmaz.
       *
       * Tam ekran haritada `scrollZoom`u tümden kapatmak yakınlaştırmayı
       * yalnızca düğmelere bırakırdı; açık bırakmak ise sayfayı aşağı
       * kaydırmak isteyen ziyaretçiyi haritanın içine hapsederdi. Ctrl/⌘
       * ile kaydırma ikisini de çözüyor ve tarayıcıda alışılmış davranış.
       */
      cooperativeGestures: true,
      // Tam ekran haritada gezinme asıl eylem; klavye desteği açık kalmalı.
      keyboard: true,
      // ⚠️ MapLibre'nin arayüz metinleri varsayılan olarak İngilizce.
      locale: MAPLIBRE_TURKCE,
    })

    haritaRef.current = harita

    harita.addControl(new NavigationControl({ visualizePitch: true }), 'bottom-right')
    harita.addControl(
      new GeolocateControl({ positionOptions: { enableHighAccuracy: true } }),
      'bottom-right',
    )
    harita.addControl(new ScaleControl({ unit: 'metric' }), 'bottom-left')

    harita.on('error', (olay) => {
      // Tek bir kayıp karo yüzünden "harita bozuk" demek yanlış olur;
      // yalnızca stil yüklenemediğinde kullanıcıya haber verilir.
      if (olay.error?.message?.includes('style')) {
        onHata('Harita katmanı yüklenemedi. Aşağıdaki liste aynı bilgileri gösteriyor.')
      }
    })

    harita.on('load', () => {
      kagitTonunaCevir(harita)
      katmanlariKur(harita)
      setHazir(true)
    })

    return () => {
      harita.remove()
      haritaRef.current = null
      setHazir(false)
    }
    // Harita bir kez kurulur; veri güncellemeleri ayrı efektlerde yapılır.
    //
    // ⚠️ `stilAdresi` listede ama haritayı yeniden kurmaz: efektin başındaki
    // `haritaRef.current` koruması ilk kurulumdan sonra çıkışa götürüyor.
    // Listede olması, değeri sessizce bayatlatmamak için.
    //
    // `onHata` bilinçli olarak DIŞARIDA: üst bileşen her render'da yeni bir
    // fonksiyon üretiyor ve listeye girseydi harita her seferinde sökülüp
    // yeniden kurulurdu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webglVar, stilAdresi])

  /* ── Mahalle poligonları ─────────────────────────────────────────────── */
  useEffect(() => {
    const harita = haritaRef.current
    if (!hazir || !harita) return

    veriYaz(harita, KAYNAK_MAHALLE, {
      type: 'FeatureCollection',
      features: mahalleler.flatMap((mahalle) =>
        mahalle.sinir === null
          ? []
          : [
              {
                type: 'Feature' as const,
                geometry: mahalle.sinir,
                properties: { slug: mahalle.slug, ad: mahalle.ad, veriVar: mahalle.veriVar },
              },
            ],
      ),
    })
  }, [hazir, mahalleler])

  /* ── Sütunlar ────────────────────────────────────────────────────────── */
  useEffect(() => {
    const harita = haritaRef.current
    if (!hazir || !harita) return

    const merkezler = new Map(
      mahalleler.flatMap((mahalle) =>
        mahalle.merkez === null ? [] : [[mahalle.slug, mahalle.merkez] as const],
      ),
    )

    veriYaz(harita, KAYNAK_SUTUN, {
      type: 'FeatureCollection',
      features: sutunlar.flatMap((sutun) => {
        const merkez = merkezler.get(sutun.slug)
        if (merkez === undefined) return []

        return [
          {
            type: 'Feature' as const,
            geometry: {
              type: 'Polygon' as const,
              coordinates: [cokgenUret(merkez, SUTUN_YARICAPI_M)],
            },
            properties: {
              slug: sutun.slug,
              ad: sutun.ad,
              yukseklik: sutun.yukseklik,
              etiket: sutun.etiket,
            },
          },
        ]
      }),
    })
  }, [hazir, sutunlar, mahalleler])

  /* ── Noktalar ────────────────────────────────────────────────────────── */
  useEffect(() => {
    const harita = haritaRef.current
    if (!hazir || !harita) return

    veriYaz(harita, KAYNAK_NOKTA, {
      type: 'FeatureCollection',
      features: noktalar.map((nokta) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [nokta.boylam, nokta.enlem] },
        properties: { ad: nokta.ad, katman: nokta.katman, adres: nokta.adres ?? '' },
      })),
    })
  }, [hazir, noktalar])

  /* ── Nokta katmanlarının renkleri ────────────────────────────────────── */
  useEffect(() => {
    const harita = haritaRef.current
    if (!hazir || !harita) return

    for (const { anahtar, renk } of noktaKatmanlari) {
      const katmanId = `nokta-${anahtar}`
      if (harita.getLayer(katmanId)) continue

      dene(() => {
        harita.addLayer({
          id: katmanId,
          type: 'circle',
          source: KAYNAK_NOKTA,
          filter: ['==', ['get', 'katman'], anahtar],
          layout: { visibility: 'none' },
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 3.5, 15, 7],
            'circle-color': renk,
            'circle-stroke-width': 1.5,
            'circle-stroke-color': haritaRenkleri().yuzey,
          },
        })
      })
    }
  }, [hazir, noktaKatmanlari])

  /* ── Katman görünürlüğü ──────────────────────────────────────────────── */
  useEffect(() => {
    const harita = haritaRef.current
    if (!hazir || !harita) return

    const gorunurluk = (katmanId: string, acik: boolean) => {
      if (!harita.getLayer(katmanId)) return
      dene(() => harita.setLayoutProperty(katmanId, 'visibility', acik ? 'visible' : 'none'))
    }

    const sutunAcik = acikKatmanlar.has(KATMAN_SUTUN)
    gorunurluk(KATMAN_SUTUN, sutunAcik)
    gorunurluk(KATMAN_SUTUN_ETIKET, sutunAcik)

    const sinirAcik = acikKatmanlar.has(KATMAN_MAHALLE_CIZGI)
    gorunurluk(KATMAN_MAHALLE_DOLGU, sinirAcik)
    gorunurluk(KATMAN_MAHALLE_CIZGI, sinirAcik)
    gorunurluk(KATMAN_MAHALLE_KESIK, sinirAcik)
    gorunurluk(KATMAN_MAHALLE_ETIKET, sinirAcik)

    gorunurluk(KATMAN_BINA, acikKatmanlar.has(KATMAN_BINA))

    for (const { anahtar } of noktaKatmanlari) {
      gorunurluk(`nokta-${anahtar}`, acikKatmanlar.has(anahtar))
    }
  }, [hazir, acikKatmanlar, noktaKatmanlari])

  /* ── 2B / 3B ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    const harita = haritaRef.current
    if (!hazir || !harita) return

    harita.easeTo({
      pitch: boyutlu ? 52 : 0,
      bearing: boyutlu ? -18 : 0,
      duration: 500,
    })
  }, [hazir, boyutlu])

  /* ── Seçim vurgusu ───────────────────────────────────────────────────── */
  useEffect(() => {
    const harita = haritaRef.current
    if (!hazir || !harita) return

    const renkler = haritaRenkleri()
    /**
     * Seçili mahalle bakır — sütun paletindeki TEK istisna.
     *
     * MapLibre'nin ifade tipleri özyinelemeli birleşim olduğu için TypeScript
     * dizi değişmezini daraltamıyor. İfadenin şekli MapLibre stil şartnamesine
     * uygun; tip iddiası yalnızca bunu derleyiciye bildiriyor.
     */
    const ifade = [
      'case',
      ['==', ['get', 'slug'], seciliSlug ?? HICBIR_SLUG],
      renkler.sutunSecili,
      renkler.sutun,
    ] as unknown as AllPaintProperties['fill-extrusion-color']

    dene(() => harita.setPaintProperty(KATMAN_SUTUN, 'fill-extrusion-color', ifade))
    dene(() =>
      harita.setPaintProperty(KATMAN_MAHALLE_DOLGU, 'fill-opacity', [
        'case',
        ['==', ['get', 'slug'], seciliSlug ?? HICBIR_SLUG],
        0.55,
        0.25,
      ]),
    )
  }, [hazir, seciliSlug])

  /* ── Tıklama ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    const harita = haritaRef.current
    if (!hazir || !harita) return

    const secilebilir = [KATMAN_SUTUN, KATMAN_MAHALLE_DOLGU].filter((id) =>
      Boolean(harita.getLayer(id)),
    )
    if (secilebilir.length === 0) return

    const tikla = (olay: { point: { x: number; y: number } }) => {
      const bulunanlar = harita.queryRenderedFeatures(
        [olay.point.x, olay.point.y] as unknown as [number, number],
        { layers: secilebilir },
      )
      const slug = bulunanlar[0]?.properties?.slug
      secimRef.current(typeof slug === 'string' ? slug : null)
    }

    const uzerinde = () => (harita.getCanvas().style.cursor = 'pointer')
    const ayril = () => (harita.getCanvas().style.cursor = '')

    harita.on('click', tikla)
    for (const id of secilebilir) {
      harita.on('mouseenter', id, uzerinde)
      harita.on('mouseleave', id, ayril)
    }

    return () => {
      harita.off('click', tikla)
      for (const id of secilebilir) {
        harita.off('mouseenter', id, uzerinde)
        harita.off('mouseleave', id, ayril)
      }
    }
  }, [hazir])

  if (!webglVar) {
    return (
      <div className="bg-yuzey-2 text-metin-2 text-govde-kucuk flex h-full items-center justify-center px-6 text-center">
        Tarayıcınız etkileşimli haritayı desteklemiyor. Aynı bilgiler yandaki listede yer alıyor.
      </div>
    )
  }

  return (
    <div
      ref={kapsayiciRef}
      className="h-full w-full"
      role="img"
      aria-label="Çorlu haritası — mahalle sınırları ve m² fiyatına göre yükselen sütunlar. Aynı bilgiler sayfadaki listede metin olarak da yer alıyor."
    />
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Stil ve katman kurulumu
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Satıcı taban haritasını kâğıt tonuna çeker.
 *
 * ⚠️ Katman ADLARINA bağlanmak kırılgan; MapTiler stilini güncellediğinde
 * eşleşme kaybolabilir. Bu yüzden katman TÜRÜNE ve genel ad kalıplarına
 * göre eşleşiyoruz ve hiçbir şey eşleşmezse satıcı stili olduğu gibi
 * kalıyor — harita çirkinleşir ama çalışır. Sessizce bozulmasındansa.
 *
 * Amaç: "harita gürültülü olmayacak". Sadelik burada en önemli tasarım
 * kararı; veriyi taşıyan şey sütunlar, taban harita yalnızca bağlam.
 */
function kagitTonunaCevir(harita: MapLibreMap): void {
  const renkler = haritaRenkleri()

  dene(() => {
    for (const katman of harita.getStyle().layers ?? []) {
      const id = katman.id.toLowerCase()

      if (katman.type === 'background') {
        harita.setPaintProperty(katman.id, 'background-color', renkler.zemin)
        continue
      }

      // Yollar tek bir nötr tona indirgenir: otoyol/cadde/sokak ayrımı
      // burada bilgi taşımıyor, yalnızca renk çeşitliliği üretiyor.
      if (katman.type === 'line' && (id.includes('road') || id.includes('transport'))) {
        harita.setPaintProperty(katman.id, 'line-color', renkler.yol)
        continue
      }

      // Arazi kullanımı ve su lekeleri soluklaştırılır.
      if (katman.type === 'fill' && (id.includes('landuse') || id.includes('landcover'))) {
        harita.setPaintProperty(katman.id, 'fill-opacity', 0.25)
        continue
      }

      if (katman.type === 'symbol') {
        harita.setPaintProperty(katman.id, 'text-color', renkler.etiket)
        harita.setPaintProperty(katman.id, 'text-halo-color', renkler.etiketHalesi)
      }
    }
  })
}

function katmanlariKur(harita: MapLibreMap): void {
  const renkler = haritaRenkleri()

  const bosKoleksiyon: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

  /**
   * ⚠️ MAHALLE SINIRLARINDA ODbL ATIF YÜKÜMLÜLÜĞÜ.
   *
   * Sınır poligonları OpenStreetMap'ten içe aktarılıyor (elle çizilenler
   * hariç) ve ODbL atıf zorunlu kılıyor. Taban haritanın atfı bunu
   * kapsamaz: o MapTiler'ın verisi, bu bizim türetilmiş katmanımız.
   *
   * `attribution` kaynağa yazılıyor, ekrana elle bir yazı konmuyor —
   * MapLibre'nin atıf denetimi kaynağın atfını kendiliğinden gösterir ve
   * katman kaldırılırsa atıf da doğru biçimde kaybolur. İki yerde ayrı
   * yazılsaydı biri kalır diğeri giderdi.
   */
  dene(() =>
    harita.addSource(KAYNAK_MAHALLE, {
      type: 'geojson',
      data: bosKoleksiyon,
      attribution:
        'Mahalle sınırları: © <a href="https://www.openstreetmap.org/copyright" ' +
        'target="_blank" rel="noreferrer">OpenStreetMap katkıcıları</a>',
    }),
  )
  dene(() => harita.addSource(KAYNAK_SUTUN, { type: 'geojson', data: bosKoleksiyon }))
  dene(() => harita.addSource(KAYNAK_NOKTA, { type: 'geojson', data: bosKoleksiyon }))

  /* ── Mahalle poligonları ── */
  dene(() =>
    harita.addLayer({
      id: KATMAN_MAHALLE_DOLGU,
      type: 'fill',
      source: KAYNAK_MAHALLE,
      paint: { 'fill-color': renkler.mahalleDolgu, 'fill-opacity': 0.25 },
    }),
  )

  dene(() =>
    harita.addLayer({
      id: KATMAN_MAHALLE_CIZGI,
      type: 'line',
      source: KAYNAK_MAHALLE,
      filter: ['==', ['get', 'veriVar'], true],
      paint: { 'line-color': renkler.sinir, 'line-width': 1 },
    }),
  )

  /**
   * ⚠️ Verisi olmayan mahallenin sınırı KESİKLİ çizilir ve üzerine
   * "Veri yok" yazılır. Uydurma bir yükseklik göstermek yerine bilmediğimizi
   * söylemek (CLAUDE.md kural 2). Dürüstlük güven verir.
   */
  dene(() =>
    harita.addLayer({
      id: KATMAN_MAHALLE_KESIK,
      type: 'line',
      source: KAYNAK_MAHALLE,
      filter: ['==', ['get', 'veriVar'], false],
      paint: { 'line-color': renkler.sinir, 'line-width': 1, 'line-dasharray': [2, 2] },
    }),
  )

  /* ── Binalar — varsayılan KAPALI ── */
  const vektorKaynak = vektorKaynagiBul(harita)
  if (vektorKaynak !== null) {
    dene(() =>
      harita.addLayer({
        id: KATMAN_BINA,
        type: 'fill-extrusion',
        source: vektorKaynak,
        'source-layer': 'building',
        minzoom: 14,
        layout: { visibility: 'none' },
        paint: {
          'fill-extrusion-color': renkler.bina,
          'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 8],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-opacity': 0.55,
        },
      }),
    )
  }

  /* ── Fiyat sütunları — sayfanın yıldızı ── */
  dene(() =>
    harita.addLayer({
      id: KATMAN_SUTUN,
      type: 'fill-extrusion',
      source: KAYNAK_SUTUN,
      paint: {
        // Tek renk. Fiyat yalnızca yükseklikle kodlanır.
        'fill-extrusion-color': renkler.sutun,
        'fill-extrusion-height': ['get', 'yukseklik'],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.92,
      },
    }),
  )

  /**
   * Sütun tepesindeki fiyat etiketi.
   *
   * `symbol-z-elevate` etiketi ekstrüzyonun tepesine taşır. Desteklenmeyen
   * bir MapLibre sürümünde katman eklemesi tümden reddedilebileceği için
   * özellik olmadan bir kez daha deneniyor: etiket o zaman zeminde durur,
   * ama görünür kalır.
   */
  const etiketKatmani = (zYukselt: boolean) =>
    ({
      id: KATMAN_SUTUN_ETIKET,
      type: 'symbol' as const,
      source: KAYNAK_SUTUN,
      minzoom: 10.5,
      layout: {
        'text-field': ['get', 'etiket'],
        'text-size': 12,
        'text-font': ['Noto Sans Regular'],
        'text-allow-overlap': false,
        ...(zYukselt ? { 'symbol-z-elevate': true } : {}),
      },
      paint: {
        'text-color': renkler.etiket,
        'text-halo-color': renkler.etiketHalesi,
        'text-halo-width': 1.5,
      },
    }) as Parameters<MapLibreMap['addLayer']>[0]

  if (!dene(() => harita.addLayer(etiketKatmani(true)))) {
    dene(() => harita.addLayer(etiketKatmani(false)))
  }

  /* ── Mahalle adı ── */
  dene(() =>
    harita.addLayer({
      id: KATMAN_MAHALLE_ETIKET,
      type: 'symbol',
      source: KAYNAK_MAHALLE,
      filter: ['==', ['get', 'veriVar'], false],
      layout: {
        'text-field': ['concat', ['get', 'ad'], ' — Veri yok'],
        'text-size': 11,
        'text-font': ['Noto Sans Regular'],
      },
      paint: {
        'text-color': renkler.etiket,
        'text-halo-color': renkler.etiketHalesi,
        'text-halo-width': 1.5,
        'text-opacity': 0.75,
      },
    }),
  )
}

/** Satıcı stilindeki vektör kaynağın adı — bina katmanı buna dayanır. */
function vektorKaynagiBul(harita: MapLibreMap): string | null {
  try {
    const kaynaklar = harita.getStyle().sources ?? {}
    for (const [ad, kaynak] of Object.entries(kaynaklar)) {
      if ((kaynak as { type?: string }).type === 'vector') return ad
    }
  } catch {
    return null
  }
  return null
}

/** GeoJSON kaynağına veri yazar; kaynak henüz yoksa sessizce geçer. */
function veriYaz(harita: MapLibreMap, kaynakId: string, veri: GeoJSON.FeatureCollection): void {
  dene(() => {
    const kaynak = harita.getSource(kaynakId)
    if (kaynak && 'setData' in kaynak) {
      ;(kaynak as { setData: (veri: GeoJSON.FeatureCollection) => void }).setData(veri)
    }
  })
}

/**
 * MapLibre çağrısını korumalı çalıştırır.
 *
 * Katman ekleme, satıcı stilinin yapısına ve MapLibre sürümüne bağlı.
 * Tek bir desteklenmeyen özellik yüzünden haritanın tümden ölmesindense
 * o katmanın eksik kalması yeğdir; harita bir görselleştirme, veri metin
 * listesinde de var.
 */
function dene(islem: () => void): boolean {
  try {
    islem()
    return true
  } catch {
    return false
  }
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
