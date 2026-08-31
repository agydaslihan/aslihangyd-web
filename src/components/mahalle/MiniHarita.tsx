'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { HaritaNoktasi } from '@/components/harita/Harita3B'
import { KATMAN_ANAHTARLARI } from '@/lib/harita/katmanAnahtarlari'
import type { NoktaKatmani } from '@/lib/harita/noktaKatmanlari'

/**
 * Mahalle sayfasının mini haritası — şartname, mahalle sayfası §5.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU BÖLÜM BİR ARIZA DEĞİL, EKSİKLİKTİ. Yerinde "Etkileşimli harita
 * hazırlanıyor" yazan sabit bir kutu duruyordu; mahalle sınırları
 * veritabanında, MapTiler anahtarı çalışır hâldeydi ve hiçbir harita
 * bileşeni bu sayfaya hiç bağlanmamıştı.
 *
 * ⚠️ AYNI ALTYAPI — İKİNCİ BİR HARİTA YAZILMADI. Çizen şey `/harita` ve
 * ana sayfayla birebir aynı `Harita3B`. Ayrı bir mini oynatıcı yazmak,
 * stil çözümü, ODbL atfı, WebGL yedeği ve altlık hata durumlarının ikinci
 * bir kopyasını üretirdi; ikisi ilk farklılaştığı gün hangisinin doğru
 * olduğu sorulamaz hâle gelirdi.
 *
 * Farklı olan tek şey ÇERÇEVE: tam ekran sahnenin panelleri, mahalle
 * listesi ve karşılaştırma çekmecesi burada yok — tek mahallelik bir
 * haritada anlamları yok.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ TEMBEL: MapLibre 443 kB gzip. Harita, bölüm görüntü alanına GİRENE
 * KADAR indirilmiyor; mahalle sayfasını açıp haritaya hiç kaydırmayan
 * ziyaretçi o yükü hiç ödemiyor. Ana sayfadaki `CorluDeneyimi` ile aynı
 * desen.
 *
 * ⚠️ SÜTUN YOK. Sütunların işi mahalleleri birbiriyle KIYASLAMAK; tek
 * mahallelik bir haritada kıyaslanacak bir şey olmadığı için tek bir sütun
 * yalnızca görüntüyü kapatırdı. Kıyas `/harita` sayfasının işi ve bölümün
 * altındaki bağlantı oraya gönderiyor.
 */
const Harita3B = dynamic(
  () => import('@/components/harita/Harita3B').then((modul) => modul.Harita3B),
  {
    ssr: false,
    loading: () => <div className="iskelet h-full w-full" aria-hidden />,
  },
)

/**
 * Mahalle ölçeğinde açılış yakınlığı.
 *
 * ⚠️ Çorlu geneli için 12 kullanılıyor; tek mahalle o ölçekte birkaç
 * piksellik bir leke oluyor ve harita "boş açıldı" gibi görünüyor. 13,6
 * mahalle sınırını çerçeveye oturtan değer.
 */
const MAHALLE_YAKINLIGI = 13.6

export interface MiniHaritaMahallesi {
  slug: string
  ad: string
  merkez: [number, number] | null
  sinir: GeoJSON.Geometry | null
  veriVar: boolean
}

export function MiniHarita({
  stilAdresi,
  mahalle,
  noktalar,
  katmanlar,
}: {
  stilAdresi: string | null
  mahalle: MiniHaritaMahallesi
  noktalar: HaritaNoktasi[]
  katmanlar: NoktaKatmani[]
}) {
  const kapsayiciRef = useRef<HTMLDivElement | null>(null)
  const [gorunur, setGorunur] = useState(false)
  const [hata, setHata] = useState<string | null>(null)
  const [altlikNotu, setAltlikNotu] = useState<string | null>(null)

  /**
   * ⚠️ Açılışta yalnızca DOLU katmanlar açık. Boş bir katmanı açık
   * başlatmak, kullanıcıya "açtım ama hiçbir şey çıkmadı" dedirtir;
   * pasif göstermek ise verinin girilmediğini söyler.
   */
  const [acikKatmanlar, setAcikKatmanlar] = useState<ReadonlySet<string>>(
    () =>
      new Set([
        KATMAN_ANAHTARLARI.sinirlar,
        ...katmanlar.filter((katman) => katman.adet > 0).map((katman) => katman.anahtar),
      ]),
  )

  useEffect(() => {
    const kap = kapsayiciRef.current
    if (kap === null) return
    // ⚠️ `rootMargin`: harita görünür olmadan biraz önce inmeye başlasın,
    // ziyaretçi bölüme vardığında iskelet değil harita görsün.
    const gozcu = new IntersectionObserver(
      (girisler) => {
        if (girisler.some((giris) => giris.isIntersecting)) {
          setGorunur(true)
          gozcu.disconnect()
        }
      },
      { rootMargin: '300px' },
    )
    gozcu.observe(kap)
    return () => gozcu.disconnect()
  }, [])

  const mahalleler = useMemo(
    () => [
      {
        slug: mahalle.slug,
        ad: mahalle.ad,
        merkez: mahalle.merkez,
        sinir: mahalle.sinir,
        veriVar: mahalle.veriVar,
      },
    ],
    [mahalle],
  )

  const cevir = (anahtar: string) =>
    setAcikKatmanlar((onceki) => {
      const yeni = new Set(onceki)
      if (yeni.has(anahtar)) yeni.delete(anahtar)
      else yeni.add(anahtar)
      return yeni
    })

  return (
    <div>
      <div
        ref={kapsayiciRef}
        className="border-kenar rounded-buyuk bg-yuzey-2 relative aspect-4/3 w-full overflow-hidden border-[0.5px] sm:aspect-16/9"
      >
        {gorunur ? (
          <Harita3B
            stilAdresi={stilAdresi}
            mahalleler={mahalleler}
            sutunlar={[]}
            noktalar={noktalar}
            acikKatmanlar={acikKatmanlar}
            noktaKatmanlari={katmanlar}
            boyutlu={false}
            seciliSlug={mahalle.slug}
            onSecim={() => {}}
            onHata={setHata}
            onAltlikDurumu={setAltlikNotu}
            baslangicMerkezi={mahalle.merkez ?? undefined}
            baslangicYakinligi={MAHALLE_YAKINLIGI}
          />
        ) : (
          <div className="iskelet h-full w-full" aria-hidden />
        )}
      </div>

      {/*
        ⚠️ KATMAN DÜĞMELERİ HARİTANIN ÜSTÜNDE DEĞİL ALTINDA.

        Tam ekran haritada paneller haritanın üstünde yüzüyor; buradaki
        harita en fazla 16/9 ve üstüne konan her kutu haritanın yarısını
        kapatıyordu. Altta duran düğmeler mobilde de dokunulabilir kalıyor.
      */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {katmanlar.map((katman) => {
          const acik = acikKatmanlar.has(katman.anahtar)
          const bos = katman.adet === 0
          return (
            <button
              key={katman.anahtar}
              type="button"
              onClick={() => cevir(katman.anahtar)}
              disabled={bos}
              aria-pressed={acik}
              className={[
                'border-kenar rounded-rozet inline-flex items-center gap-1.5 border-[0.5px]',
                'px-2.5 py-1.5 text-mikro transition-colors',
                bos
                  ? 'text-metin-3 cursor-not-allowed opacity-60'
                  : acik
                    ? 'bg-yuzey-2 text-metin'
                    : 'text-metin-2 hover:text-metin',
              ].join(' ')}
              title={bos ? 'Bu katmanda bu mahalle çevresinde kayıt yok.' : undefined}
            >
              <span
                aria-hidden="true"
                className="size-2 rounded-full"
                style={{ background: katman.renk }}
              />
              {katman.etiket}
              <span className="text-metin-3 rakam">{katman.adet}</span>
            </button>
          )
        })}
      </div>

      {/* ⚠️ Hata ve altlık notu AYRI: biri "harita çalışmıyor", diğeri
          "harita çalışıyor ama sokak görüntüsü yok" demek. */}
      {hata !== null ? (
        <p className="text-uyari mt-2 text-mikro" role="status">
          {hata}
        </p>
      ) : null}
      {altlikNotu !== null ? <p className="text-metin-3 mt-2 text-mikro">{altlikNotu}</p> : null}
    </div>
  )
}
