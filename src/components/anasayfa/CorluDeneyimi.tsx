'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { MahalleVerisi } from '@/components/harita/HaritaSahnesi'
import { Eyebrow } from '@/components/ui/Bolum'
import { carpanYaz, degisimYaz, paraKisaYaz, paraYaz } from '@/lib/bicimlendirme'
/**
 * ⚠️ Anahtarlar bağımsız modülden: `Harita3B`den almak MapLibre'nin
 * tamamını ana sayfa paketine sokardı. Gerekçe o dosyada yazılı.
 */
import { KATMAN_ANAHTARLARI } from '@/lib/harita/katmanAnahtarlari'

import { yukseklikleriHesapla } from '@/lib/harita/sutunlar'

/**
 * İnteraktif Çorlu deneyimi — şartname §6.4, sayfanın imza bölümü.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ HARİTA GÖRÜNÜR OLANA KADAR İNMİYOR.
 *
 * MapLibre 443 kB gzip — sitenin en ağır tek parçası. Ana sayfaya statik
 * olarak koymak, haritayı hiç görmeyen ziyaretçiye de bu faturayı kesmek
 * demekti (trafiğin çoğu ilk ekranı görüp ayrılıyor).
 *
 * Bölüm `IntersectionObserver` ile izleniyor ve ancak görüş alanına
 * yaklaşınca mount ediliyor. `rootMargin` 300 px: ziyaretçi oraya varana
 * kadar indirme başlamış oluyor, yani bekleme hissi yok.
 *
 * ⚠️ Yer TUTULUYOR: kapsayıcının en-boy oranı sabit, harita inince düzen
 * zıplamıyor (CLS 0).
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ UYDURMA RAKAM YOK. Verisi olmayan mahallede kart açılıyor ama sayı
 * yerine "veri bekliyor" yazıyor; gözlem sayısı (n) her rakamın yanında.
 *
 * ⚠️ Mobilde hover yok — MapLibre'nin tıklama seçimi zaten dokunmayı
 * karşılıyor ve kart aşağıda açılıyor.
 */
const Harita3B = dynamic(
  () => import('@/components/harita/Harita3B').then((modul) => modul.Harita3B),
  { ssr: false },
)

export function CorluDeneyimi({
  mahalleler,
  portfoySayilari,
  stilAdresi,
}: {
  mahalleler: MahalleVerisi[]
  /** Mahalle slug'ı → yayındaki taşınmaz sayısı. */
  portfoySayilari: Record<string, number>
  stilAdresi: string | null
}) {
  const kapsayiciRef = useRef<HTMLDivElement | null>(null)
  /**
   * ⚠️ BAŞLANGIÇ DEĞERİ TEMBEL BAŞLATICIDA, EFEKTTE DEĞİL.
   *
   * `IntersectionObserver` desteklenmiyorsa harita yine çizilmeli. Bunu
   * efektte `setState` ile yapmak fazladan bir render turu doğuruyor ve
   * React'in "efekt gövdesinde senkron setState" uyarısını tetikliyor.
   * Destek sorgusu render sırasında da güvenli: tarayıcı API'si,
   * sunucuda `undefined` ve orada zaten `false` doğru cevap.
   */
  const [gorunur, setGorunur] = useState(
    () => typeof window !== 'undefined' && typeof IntersectionObserver === 'undefined',
  )
  const [seciliSlug, setSeciliSlug] = useState<string | null>(null)

  useEffect(() => {
    const dugum = kapsayiciRef.current
    if (!dugum) return

    // Gözlemci yoksa harita zaten görünür başlatıldı (yukarıdaki not).
    if (typeof IntersectionObserver === 'undefined') return

    const gozlemci = new IntersectionObserver(
      (girisler) => {
        if (!girisler.some((giris) => giris.isIntersecting)) return
        setGorunur(true)
        gozlemci.disconnect()
      },
      { rootMargin: '300px' },
    )

    gozlemci.observe(dugum)
    return () => gozlemci.disconnect()
  }, [])

  const { sutunlar, geometriler } = useMemo(() => {
    const hesaplanan = yukseklikleriHesapla(
      mahalleler.map((mahalle) => ({
        slug: mahalle.slug,
        ad: mahalle.ad,
        merkez: mahalle.merkez,
        deger: mahalle.satisM2,
        gozlemSayisi: mahalle.gozlemSayisi,
      })),
      (deger) => paraKisaYaz(deger) ?? String(deger),
    )

    const verisiOlanlar = new Set(hesaplanan.map((sutun) => sutun.slug))

    return {
      sutunlar: hesaplanan,
      geometriler: mahalleler.map((mahalle) => ({
        slug: mahalle.slug,
        ad: mahalle.ad,
        merkez: mahalle.merkez,
        sinir: mahalle.sinir,
        veriVar: verisiOlanlar.has(mahalle.slug),
      })),
    }
  }, [mahalleler])

  const acikKatmanlar = useMemo(
    () => new Set<string>([KATMAN_ANAHTARLARI.sutunlar, KATMAN_ANAHTARLARI.sinirlar]),
    [],
  )

  const secili = mahalleler.find((mahalle) => mahalle.slug === seciliSlug) ?? null

  return (
    <section className="bg-zemin border-kenar relative border-y-[0.5px] py-16 sm:py-24 lg:py-32">
      <div className="kapsayici">
        <div className="max-w-2xl">
          <Eyebrow>Çorlu deneyimi</Eyebrow>
          <h2 className="text-metin font-baslik mt-4 text-baslik-2-mobil font-medium sm:text-baslik-2">
            Mahalleye dokunun, rakamları görün.
          </h2>
          <p className="text-metin-2 mt-5 text-govde leading-relaxed">
            Sütunların yüksekliği ortalama m² fiyatını gösteriyor. Bir mahalleye tıklayın; kaç
            gözleme dayandığıyla birlikte açılsın.
          </p>
        </div>

        <div
          ref={kapsayiciRef}
          className="border-kenar rounded-buyuk bg-yuzey-2 relative mt-10 aspect-[4/3] w-full overflow-hidden border-[0.5px] sm:aspect-[16/9]"
        >
          {gorunur ? (
            <Harita3B
              stilAdresi={stilAdresi}
              mahalleler={geometriler}
              sutunlar={sutunlar}
              noktalar={[]}
              acikKatmanlar={acikKatmanlar}
              noktaKatmanlari={[]}
              boyutlu
              seciliSlug={seciliSlug}
              onSecim={setSeciliSlug}
              onHata={() => {}}
              onAltlikDurumu={() => {}}
            />
          ) : (
            /* ⚠️ Boş gri dikdörtgen değil: sıcak gradyan. Harita inene kadar
               görünen şey de tasarımın parçası. */
            <div
              aria-hidden="true"
              className="h-full w-full"
              style={{
                background:
                  'radial-gradient(60% 60% at 50% 40%, color-mix(in oklab, var(--color-gold-400) 14%, transparent), transparent 70%)',
              }}
            />
          )}

          {/*
            ⚠️ SÜTUN YOKSA SEBEBİ YAZILI.

            `yukseklikleriHesapla` üçten az veride boş dizi döndürüyor
            (tek sütun bir kıyas değil, bir leke). Haritayı sessizce
            sütunsuz bırakmak, ziyaretçiye "burada bir şey yok" dedirtir;
            sınırlar zaten çiziliyor ve eksik olan şey veri.
          */}
          {sutunlar.length === 0 ? (
            <div className="cam rounded-kart shadow-kalkik absolute inset-x-4 bottom-4 p-4 sm:inset-x-auto sm:right-4 sm:left-auto sm:w-80">
              <p className="text-metin text-govde-kucuk font-medium">Veri toplanıyor</p>
              <p className="text-metin-2 mt-1 text-mikro leading-relaxed">
                Mahalle sınırları haritada; fiyat sütunları en az üç mahallede rakam girildiğinde
                çizilir. Tek bir sütun kıyas üretmez, yanıltır.
              </p>
            </div>
          ) : null}

          {secili ? (
            <div className="cam rounded-kart shadow-kalkik absolute right-4 bottom-4 left-4 p-5 sm:left-auto sm:w-80">
              <p className="text-metin font-baslik text-baslik-3 font-medium">{secili.ad}</p>

              <dl className="mt-4 flex flex-col gap-2.5">
                <Satir
                  etiket="Ortalama m² fiyatı"
                  deger={secili.satisM2 !== null ? (paraYaz(secili.satisM2) ?? null) : null}
                />
                <Satir
                  etiket="Yatırım skoru"
                  deger={secili.yatirimSkoru !== null ? `${secili.yatirimSkoru} / 100` : null}
                />
                <Satir
                  etiket="Son 12 ay"
                  deger={secili.degisim12Ay !== null ? degisimYaz(secili.degisim12Ay) : null}
                />
                <Satir
                  etiket="Kira çarpanı"
                  deger={
                    secili.kiraCarpani !== null ? `${carpanYaz(secili.kiraCarpani)} yıl` : null
                  }
                />
                <Satir etiket="Portföy" deger={String(portfoySayilari[secili.slug] ?? 0)} />
              </dl>

              {/* ⚠️ Gözlem sayısı GİZLENMİYOR: az gözleme dayanan bir
                  ortalama, ortalama değildir. */}
              <p className="text-metin-3 mt-4 text-mikro">
                {secili.gozlemSayisi !== null && secili.gozlemSayisi > 0
                  ? `n = ${secili.gozlemSayisi} gözlem`
                  : 'Gözlem girilmedi'}
              </p>

              <a
                href={`/mahalleler/${secili.slug}`}
                className="text-vurgu alt-cizgi mt-4 inline-block text-govde-kucuk font-medium"
              >
                Mahalle sayfasına git
              </a>
            </div>
          ) : null}
        </div>

        <p className="text-metin-3 mt-4 text-mikro">
          Sınır verisi © OpenStreetMap katkıcıları. Ayrıntı: /veri-kaynaklari
        </p>
      </div>
    </section>
  )
}

function Satir({ etiket, deger }: { etiket: string; deger: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-metin-3 text-govde-kucuk">{etiket}</dt>
      <dd
        className={
          deger === null
            ? 'text-metin-3 text-govde-kucuk'
            : 'text-metin rakam text-govde-kucuk font-medium'
        }
      >
        {deger ?? 'veri bekliyor'}
      </dd>
    </div>
  )
}
