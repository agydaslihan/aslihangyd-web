'use client'

import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'

import type { HaritaNoktasi, MahalleGeometrisi } from '@/components/harita/Harita3B'
import { KATMAN_ANAHTARLARI } from '@/components/harita/Harita3B'
import { BosDurum } from '@/components/ui/BosDurum'
import { Buton } from '@/components/ui/Buton'
import { KapatIkon, KatmanIkon, KonumIkon } from '@/components/ui/Ikon'
import { carpanYaz, degisimYaz, paraKisaYaz, paraYaz } from '@/lib/bicimlendirme'
import { sinif } from '@/lib/sinif'
import {
  VERI_KIPLERI,
  veriKipiTanimi,
  yukseklikleriHesapla,
  type Konum,
  type VeriKipi,
} from '@/lib/harita/sutunlar'

/**
 * Tam ekran 3B harita sahnesi.
 *
 * ⚠️ maplibre-gl yalnızca burada, `ssr: false` ile yükleniyor. Kütüphane
 * ~200 kB gzip; ana pakete girmesi tüm sayfaların LCP'sini bozardı.
 *
 * Düzen kararı: harita tam ekran, paneller ÜZERİNE biner. Haritayı bir
 * sütuna sıkıştırmak 3B'yi anlamsız kılar — eğik bakışta derinlik ancak
 * geniş alanda okunur. Paneller dar tutuldu (132 / 186 px) ve yarı saydam:
 * bilgi verirken haritayı kapatmıyorlar.
 *
 * Erişilebilirlik: harita `role="img"`. Mahalle seçimi klavyeyle sol
 * paneldeki listeden yapılabilir; tüm noktalar "Liste" panelinde metin
 * olarak da var. Ekran okuyucu kullanan biri hiçbir veriyi kaybetmez.
 */

const Harita3B = dynamic(() => import('./Harita3B').then((modul) => modul.Harita3B), {
  ssr: false,
  loading: () => <div className="iskelet h-full w-full rounded-none" aria-hidden />,
})

export interface MahalleVerisi {
  slug: string
  ad: string
  /** Merkez koordinatı yoksa sütun çizilmez; mahalle listede kalır. */
  merkez: Konum | null
  sinir: GeoJSON.Geometry | null
  satisM2: number | null
  kira: number | null
  kiraCarpani: number | null
  yatirimSkoru: number | null
  degisim12Ay: number | null
  gozlemSayisi: number | null
  verilerinTarihi: string | null
}

export interface KatmanTanimi {
  anahtar: string
  etiket: string
  renk: string
  /** Bu katmanda kaç öğe var. 0 ise katman pasif ve sebebi yazılı. */
  adet: number
}

export function HaritaSahnesi({
  mahalleler,
  noktalar,
  noktaKatmanlari,
  stilAdresi,
}: {
  mahalleler: MahalleVerisi[]
  noktalar: HaritaNoktasi[]
  noktaKatmanlari: KatmanTanimi[]
  /**
   * MapLibre stil adresi; MapTiler anahtarı yoksa `null` (boş durum).
   *
   * ⚠️ Sunucudan iniyor — bkz. `lib/harita/sunucu.ts`. Burada `process.env`
   * okumak değeri derleme anına bağlar ve üretimde haritayı kapatır.
   */
  stilAdresi: string | null
}) {
  const [veriKipi, setVeriKipi] = useState<VeriKipi>('satisM2')
  const [boyutlu, setBoyutlu] = useState(true)
  const [seciliSlug, setSeciliSlug] = useState<string | null>(null)
  const [hata, setHata] = useState<string | null>(null)

  /**
   * Altlık durumu — hata değil, DURUM.
   *
   * ⚠️ `hata`dan ayrı tutuluyor. "Altlık yok ama sınırlar çiziliyor" bir
   * arıza bildirimi değil, bir eksiklik bildirimi: harita çalışıyor,
   * yalnızca sokak görüntüsü yok. İkisini aynı kutuya koymak, çalışan bir
   * haritayı bozukmuş gibi gösterirdi.
   */
  const [altlikNotu, setAltlikNotu] = useState<string | null>(null)
  /** Mobilde açık olan alt sayfa. Masaüstünde paneller zaten görünür. */
  const [acikSayfa, setAcikSayfa] = useState<'katman' | 'detay' | 'liste' | null>(null)

  /**
   * ⚠️ Açılışta HER ŞEY AÇIK DEĞİL.
   *
   * Emlak haritalarının tipik hatası bu: tüm katmanlar açık başlar, harita
   * nokta bulutuna döner ve ziyaretçi hiçbir şey okuyamaz. Açılışta yalnızca
   * fiyat sütunları ve mahalle sınırları var; gerisini kullanıcı isterse açar.
   *
   * Binalar özellikle kapalı: mobilde ekstrüzyon karesi ciddi biçimde
   * düşürüyor ve trafiğin ~%75'i mobil.
   */
  const [acikKatmanlar, setAcikKatmanlar] = useState<Set<string>>(
    () => new Set<string>([KATMAN_ANAHTARLARI.sutunlar, KATMAN_ANAHTARLARI.sinirlar]),
  )

  const kipTanimi = veriKipiTanimi(veriKipi)

  const { sutunlar, geometriler } = useMemo(() => {
    const etiketle = (deger: number): string => {
      if (kipTanimi.birim === 'para') return paraKisaYaz(deger) ?? String(deger)
      if (kipTanimi.birim === 'yil') return `${carpanYaz(deger) ?? deger} yıl`
      return String(Math.round(deger))
    }

    const hesaplanan = yukseklikleriHesapla(
      mahalleler.map((mahalle) => ({
        slug: mahalle.slug,
        ad: mahalle.ad,
        merkez: mahalle.merkez,
        deger: mahalle[veriKipi],
        gozlemSayisi: mahalle.gozlemSayisi,
      })),
      etiketle,
    )

    const verisiOlanlar = new Set(hesaplanan.map((sutun) => sutun.slug))

    const geo: MahalleGeometrisi[] = mahalleler.map((mahalle) => ({
      slug: mahalle.slug,
      ad: mahalle.ad,
      merkez: mahalle.merkez,
      sinir: mahalle.sinir,
      veriVar: verisiOlanlar.has(mahalle.slug),
    }))

    return { sutunlar: hesaplanan, geometriler: geo }
  }, [mahalleler, veriKipi, kipTanimi.birim])

  const secili = mahalleler.find((mahalle) => mahalle.slug === seciliSlug) ?? null
  const verisizSayisi = geometriler.filter((mahalle) => !mahalle.veriVar).length
  const konumsuzSayisi = geometriler.filter((mahalle) => mahalle.merkez === null).length
  const cizilebilirSutun = sutunlar.filter((sutun) =>
    geometriler.some((mahalle) => mahalle.slug === sutun.slug && mahalle.merkez !== null),
  ).length

  function katmanDegistir(anahtar: string) {
    setAcikKatmanlar((onceki) => {
      const yeni = new Set(onceki)
      if (yeni.has(anahtar)) yeni.delete(anahtar)
      else yeni.add(anahtar)
      return yeni
    })
  }

  function mahalleSec(slug: string | null) {
    setSeciliSlug(slug)
    if (slug !== null) setAcikSayfa('detay')
  }

  if (mahalleler.length === 0 && noktalar.length === 0) {
    return (
      <BosDurum
        baslik="Harita verisi henüz girilmedi"
        neden="Mahalle sınırları, merkez koordinatları ve rakamlar yönetim panelinden girildiğinde harita burada çalışmaya başlayacak."
        neZaman="Sütunlar için mahallenin m² fiyatı, sınır çizgisi için GeoJSON gerekiyor."
        ikon={<KonumIkon width={32} height={32} />}
        eylem={<Buton href="/mahalleler">Mahalleleri inceleyin</Buton>}
      />
    )
  }

  return (
    <div className="bg-yuzey-2 relative h-full w-full overflow-hidden">
      {/* ── Harita ──────────────────────────────────────────────────── */}
      <div className="absolute inset-0">
        {/*
          ⚠️ ANAHTAR OLMASA BİLE HARİTA KURULUYOR.

          Eski hâlinde `stilAdresi === null` iken haritanın YERİNE bir boş
          durum kutusu konuyordu. Ama mahalle sınırları BİZİM verimiz;
          MapTiler yalnızca taban görüntü. Altlık yokken poligonları da
          gizlemek, elimizdeki veriyi dış bir servisin durumuna bağlamaktı.

          Artık `Harita3B` her hâlükârda kuruluyor: altlık alınamazsa
          bağımlılıksız yerel stile düşüyor ve sınırlar yine çiziliyor.
          Sebep, haritanın üstündeki şeritte yazılı.
        */}
        <Harita3B
          stilAdresi={stilAdresi}
          mahalleler={geometriler}
          sutunlar={sutunlar}
          noktalar={noktalar}
          acikKatmanlar={acikKatmanlar}
          noktaKatmanlari={noktaKatmanlari.map(({ anahtar, renk }) => ({ anahtar, renk }))}
          boyutlu={boyutlu}
          seciliSlug={seciliSlug}
          onSecim={mahalleSec}
          onHata={setHata}
          onAltlikDurumu={setAltlikNotu}
        />
      </div>

      {/* ── Üst kontrol şeridi ──────────────────────────────────────── */}
      <div className="bg-yuzey/94 border-kenar pointer-events-auto absolute inset-x-0 top-0 z-20 border-b-[0.5px] backdrop-blur-sm">
        <div className="flex items-center gap-2 overflow-x-auto px-3 py-2">
          {/* Mobilde panelleri açan düğmeler; masaüstünde paneller sabit. */}
          <SeritButonu
            sinifAdi="lg:hidden"
            secili={acikSayfa === 'katman'}
            onClick={() => setAcikSayfa(acikSayfa === 'katman' ? null : 'katman')}
          >
            <KatmanIkon width={15} height={15} />
            Katmanlar
          </SeritButonu>

          <fieldset className="flex items-center gap-1">
            <legend className="yalnizca-okuyucu">Veri kipi</legend>
            {VERI_KIPLERI.map((kip) => (
              <SeritButonu
                key={kip.anahtar}
                secili={veriKipi === kip.anahtar}
                onClick={() => setVeriKipi(kip.anahtar)}
              >
                {kip.etiket}
              </SeritButonu>
            ))}
          </fieldset>

          <span className="bg-kenar mx-1 h-6 w-px shrink-0" aria-hidden />

          <SeritButonu secili={boyutlu} onClick={() => setBoyutlu(!boyutlu)}>
            {boyutlu ? '3B' : '2B'}
          </SeritButonu>

          <SeritButonu
            sinifAdi="lg:hidden"
            secili={acikSayfa === 'liste'}
            onClick={() => setAcikSayfa(acikSayfa === 'liste' ? null : 'liste')}
          >
            Liste
          </SeritButonu>
        </div>

        {altlikNotu ? (
          <p className="bg-bilgi-zemin text-bilgi text-mikro px-3 py-1.5">{altlikNotu}</p>
        ) : null}

        {hata ? (
          <p className="bg-uyari-zemin text-uyari-metin text-mikro px-3 py-1.5">{hata}</p>
        ) : null}
      </div>

      {/* ── Sol: katman paneli ──────────────────────────────────────── */}
      <Panel
        konum="sol"
        genislik="w-[132px]"
        acik={acikSayfa === 'katman'}
        onKapat={() => setAcikSayfa(null)}
        baslik="Katmanlar"
      >
        <KatmanListesi
          katmanlar={[
            {
              anahtar: KATMAN_ANAHTARLARI.sutunlar,
              etiket: 'Fiyat sütunları',
              // Yalnızca hem verisi hem konumu olanlar çizilebilir.
              adet: cizilebilirSutun,
              renk: null,
            },
            {
              anahtar: KATMAN_ANAHTARLARI.sinirlar,
              etiket: 'Mahalle sınırları',
              adet: geometriler.filter((mahalle) => mahalle.sinir !== null).length,
              renk: null,
            },
            {
              anahtar: KATMAN_ANAHTARLARI.binalar,
              // Bina geometrisi taban haritadan gelir; sayılabilir bir
              // öğe kümesi değil, bu yüzden sayaç gösterilmiyor.
              etiket: 'Binalar',
              adet: stilAdresi !== null ? null : 0,
              renk: null,
            },
            ...noktaKatmanlari.map((katman) => ({
              anahtar: katman.anahtar,
              etiket: katman.etiket,
              adet: katman.adet,
              renk: katman.renk,
            })),
          ]}
          acikKatmanlar={acikKatmanlar}
          onDegistir={katmanDegistir}
        />

        <div className="border-kenar mt-3 border-t-[0.5px] pt-3">
          <p className="text-metin-3 text-minik mb-1.5">Mahalleler</p>
          <ul className="flex flex-col">
            {geometriler.map((mahalle) => (
              <li key={mahalle.slug}>
                <button
                  type="button"
                  onClick={() => mahalleSec(mahalle.slug === seciliSlug ? null : mahalle.slug)}
                  aria-pressed={mahalle.slug === seciliSlug}
                  className={sinif(
                    'text-mikro flex min-h-11 w-full items-center justify-between gap-1 rounded-kucuk px-1.5 text-left',
                    mahalle.slug === seciliSlug
                      ? 'bg-vurgu-zemin text-vurgu font-medium'
                      : 'hover:bg-yuzey-2',
                  )}
                >
                  <span className="truncate">{mahalle.ad}</span>
                  {mahalle.merkez === null ? (
                    <span className="text-metin-3 text-minik shrink-0" title="Konum girilmedi">
                      ⌖
                    </span>
                  ) : !mahalle.veriVar ? (
                    <span className="text-metin-3 text-minik shrink-0" title="Bu kipte veri yok">
                      —
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      {/* ── Sağ: mahalle detay paneli ───────────────────────────────── */}
      <Panel
        konum="sag"
        genislik="w-[186px]"
        acik={acikSayfa === 'detay'}
        onKapat={() => setAcikSayfa(null)}
        baslik={secili?.ad ?? 'Mahalle'}
      >
        {secili === null ? (
          <p className="text-metin-3 text-mikro">
            Haritadan bir sütuna dokunun ya da soldaki listeden bir mahalle seçin.
          </p>
        ) : (
          <MahalleDetayi mahalle={secili} />
        )}
      </Panel>

      {/* ── Mobil: metin listesi ────────────────────────────────────── */}
      {acikSayfa === 'liste' ? (
        <MobilOrtu onKapat={() => setAcikSayfa(null)}>
          <MetinListesi
            geometriler={geometriler}
            noktalar={noktalar}
            noktaKatmanlari={noktaKatmanlari}
            onSec={mahalleSec}
          />
        </MobilOrtu>
      ) : null}

      {/* ── Sol alt: gösterge ───────────────────────────────────────── */}
      <div className="bg-yuzey/94 border-kenar text-minik pointer-events-none absolute bottom-14 left-2 z-10 max-w-[13rem] rounded-kart border-[0.5px] p-2.5 sm:bottom-10">
        <p className="font-medium">{kipTanimi.aciklama}</p>

        <div className="mt-2 flex items-end gap-1.5" aria-hidden>
          {[0.3, 0.55, 0.8, 1].map((oran) => (
            <span
              key={oran}
              className="bg-gosterge w-3 rounded-t-[2px]"
              style={{ height: `${oran * 28}px` }}
            />
          ))}
          <span className="text-metin-3 ml-1">düşük → yüksek</span>
        </div>

        {verisizSayisi > 0 ? (
          <p className="text-metin-3 mt-2 leading-snug">
            <span className="rakam">{verisizSayisi}</span> mahallenin bu kipte verisi yok; sütunu
            çizilmedi, sınırı kesikli.
          </p>
        ) : null}

        {konumsuzSayisi > 0 ? (
          <p className="text-metin-3 mt-1 leading-snug">
            <span className="rakam">{konumsuzSayisi}</span> mahallenin merkez koordinatı girilmedi;
            haritada yer almıyor ama listede duruyor.
          </p>
        ) : null}
      </div>

      {/* Ekran okuyucu için tam metin karşılığı — masaüstünde de erişilebilir. */}
      <div className="yalnizca-okuyucu">
        <MetinListesi
          geometriler={geometriler}
          noktalar={noktalar}
          noktaKatmanlari={noktaKatmanlari}
          onSec={mahalleSec}
        />
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Parçalar
   ══════════════════════════════════════════════════════════════════════════ */

function SeritButonu({
  secili,
  onClick,
  children,
  sinifAdi,
}: {
  secili: boolean
  onClick: () => void
  children: React.ReactNode
  sinifAdi?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={secili}
      className={sinif(
        'text-mikro inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-buton px-2.5',
        'transition-colors duration-[150ms] ease-[cubic-bezier(0.2,0,0,1)]',
        secili
          ? 'bg-vurgu-zemin text-vurgu font-medium'
          : 'text-metin-2 hover:bg-yuzey-2 border-[0.5px] border-transparent',
        sinifAdi,
      )}
    >
      {children}
    </button>
  )
}

/**
 * Yan panel.
 *
 * Masaüstünde her zaman görünür ve haritanın üzerine biner; mobilde alt
 * sayfa (bottom sheet) olarak açılır. İki ayrı bileşen yazmak yerine tek
 * bileşenin iki yerleşimi: içerik ve klavye davranışı aynı kalıyor.
 */
function Panel({
  konum,
  genislik,
  acik,
  onKapat,
  baslik,
  children,
}: {
  konum: 'sol' | 'sag'
  genislik: string
  acik: boolean
  onKapat: () => void
  baslik: string
  children: React.ReactNode
}) {
  return (
    <>
      {/* Masaüstü */}
      <aside
        aria-label={baslik}
        className={sinif(
          'bg-yuzey/94 border-kenar absolute top-16 bottom-14 z-10 hidden overflow-y-auto rounded-kart border-[0.5px] p-2.5 backdrop-blur-sm lg:block',
          konum === 'sol' ? 'left-2' : 'right-2',
          genislik,
        )}
      >
        <h2 className="text-metin-3 text-minik mb-2 tracking-wide uppercase">{baslik}</h2>
        {children}
      </aside>

      {/* Mobil alt sayfa */}
      {acik ? (
        <MobilOrtu onKapat={onKapat}>
          <h2 className="text-baslik-3 mb-3">{baslik}</h2>
          {children}
        </MobilOrtu>
      ) : null}
    </>
  )
}

function MobilOrtu({ onKapat, children }: { onKapat: () => void; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end lg:hidden">
      <button
        type="button"
        className="bg-metin/25 absolute inset-0"
        onClick={onKapat}
        aria-label="Paneli kapat"
      />
      <div className="bg-yuzey border-kenar relative max-h-[70%] overflow-y-auto rounded-t-buyuk border-t-[0.5px] p-4 pb-8">
        <button
          type="button"
          onClick={onKapat}
          className="text-metin-3 absolute top-2 right-2 flex size-11 items-center justify-center"
          aria-label="Kapat"
        >
          <KapatIkon width={18} height={18} />
        </button>
        {children}
      </div>
    </div>
  )
}

function KatmanListesi({
  katmanlar,
  acikKatmanlar,
  onDegistir,
}: {
  katmanlar: readonly {
    anahtar: string
    etiket: string
    /** Öğe sayısı. `null` = sayılamaz (satıcı katmanı), 0 = veri yok. */
    adet: number | null
    renk: string | null
  }[]
  acikKatmanlar: ReadonlySet<string>
  onDegistir: (anahtar: string) => void
}) {
  return (
    <fieldset className="flex flex-col">
      <legend className="yalnizca-okuyucu">Harita katmanları</legend>

      {katmanlar.map((katman) => {
        const veriYok = katman.adet === 0
        const acik = acikKatmanlar.has(katman.anahtar)

        return (
          <label
            key={katman.anahtar}
            className={sinif(
              'text-mikro flex min-h-11 cursor-pointer items-center gap-2 rounded-kucuk px-1.5',
              veriYok ? 'cursor-not-allowed' : 'hover:bg-yuzey-2',
            )}
          >
            <input
              type="checkbox"
              checked={acik && !veriYok}
              disabled={veriYok}
              onChange={() => onDegistir(katman.anahtar)}
              className="accent-vurgu size-4 shrink-0"
            />
            {katman.renk !== null ? (
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: katman.renk }}
                aria-hidden
              />
            ) : null}
            <span className={sinif('flex-1 truncate', veriYok && 'text-metin-pasif')}>
              {katman.etiket}
            </span>
            {/* ⚠️ Pasif katmanın sebebi yazılı: boş bir düğme, kullanıcıyı
                hiçbir şey bulamayacağı bir tıklamaya davet eder. */}
            {veriYok ? (
              <span className="text-metin-3 text-minik shrink-0" title="Bu katman için veri yok">
                veri yok
              </span>
            ) : katman.adet === null ? null : (
              <span className="text-metin-3 rakam text-minik shrink-0">{katman.adet}</span>
            )}
          </label>
        )
      })}
    </fieldset>
  )
}

function Satir({
  etiket,
  deger,
  ton = 'notr',
}: {
  etiket: string
  deger: string | null
  ton?: 'notr' | 'artis' | 'azalis'
}) {
  return (
    <div className="border-kenar flex flex-col gap-0.5 border-b-[0.5px] py-1.5 last:border-b-0">
      <span className="text-metin-3 text-minik">{etiket}</span>
      <span
        className={sinif(
          'rakam text-baslik-3 font-medium',
          ton === 'artis' && 'text-basari',
          ton === 'azalis' && 'text-hata',
        )}
      >
        {deger ?? <span className="text-metin-pasif text-govde-kucuk">Veri yok</span>}
      </span>
    </div>
  )
}

function MahalleDetayi({ mahalle }: { mahalle: MahalleVerisi }) {
  const degisim = mahalle.degisim12Ay

  return (
    <div className="flex flex-col">
      <Satir
        etiket="Yatırım skoru"
        deger={mahalle.yatirimSkoru === null ? null : `${Math.round(mahalle.yatirimSkoru)}`}
      />
      <Satir etiket="Ort. m² satış" deger={paraYaz(mahalle.satisM2)} />
      <Satir etiket="Ort. kira" deger={paraYaz(mahalle.kira)} />
      <Satir etiket="Kira çarpanı" deger={carpanYaz(mahalle.kiraCarpani)} />
      <Satir
        etiket="12 ay değişim"
        deger={degisimYaz(degisim)}
        ton={degisim === null ? 'notr' : degisim >= 0 ? 'artis' : 'azalis'}
      />

      {/* ⚠️ Gözlem sayısı her rakam kümesinde görünür — rakamı güçlendirir. */}
      <p className="text-metin-3 text-minik mt-2 leading-snug">
        {mahalle.gozlemSayisi === null ? (
          'Gözlem sayısı bilinmiyor.'
        ) : (
          <>
            <span className="rakam">{mahalle.gozlemSayisi}</span> gözleme dayanıyor.
          </>
        )}
        {mahalle.verilerinTarihi ? ` ${mahalle.verilerinTarihi} itibarıyla.` : ''}
      </p>

      <div className="mt-3 flex flex-col gap-1.5">
        <Buton href={`/mahalleler/${mahalle.slug}`} boyut="kucuk" tamGenislik>
          Mahalle sayfası
        </Buton>
        <Buton
          href={`/portfoy?mahalle=${mahalle.slug}`}
          gorunum="hayalet"
          boyut="kucuk"
          tamGenislik
        >
          Portföyü gör
        </Buton>
      </div>
    </div>
  )
}

/**
 * Haritanın metin karşılığı.
 *
 * ⚠️ Bu liste bir yedek değil, eşdeğer. Harita bir görselleştirmedir;
 * bilginin kendisi burada. Görme engelli bir yatırımcı da, MapTiler
 * anahtarı gelmemiş bir ortam da aynı veriye ulaşır.
 */
function MetinListesi({
  geometriler,
  noktalar,
  noktaKatmanlari,
  onSec,
}: {
  geometriler: readonly { slug: string; ad: string; veriVar: boolean; merkez: Konum | null }[]
  noktalar: readonly HaritaNoktasi[]
  noktaKatmanlari: readonly KatmanTanimi[]
  onSec: (slug: string) => void
}) {
  const etiketler = new Map(noktaKatmanlari.map((katman) => [katman.anahtar, katman.etiket]))

  return (
    <div className="flex flex-col gap-4">
      <section>
        <h3 className="text-govde-kucuk font-medium">
          Mahalleler <span className="text-metin-3 rakam">({geometriler.length})</span>
        </h3>
        <ul className="mt-1.5 flex flex-col">
          {geometriler.map((mahalle) => (
            <li key={mahalle.slug}>
              <button
                type="button"
                onClick={() => onSec(mahalle.slug)}
                className="text-govde-kucuk flex min-h-11 w-full items-center justify-between gap-2 text-left"
              >
                <span>{mahalle.ad}</span>
                <span className="text-metin-3 text-mikro">
                  {mahalle.merkez === null
                    ? 'konum girilmedi'
                    : mahalle.veriVar
                      ? 'veri var'
                      : 'bu kipte veri yok'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {noktalar.length > 0 ? (
        <section>
          <h3 className="text-govde-kucuk font-medium">
            Noktalar <span className="text-metin-3 rakam">({noktalar.length})</span>
          </h3>
          <ul className="mt-1.5 flex flex-col gap-1">
            {noktalar.map((nokta) => (
              <li key={`${nokta.katman}-${nokta.id}`} className="text-govde-kucuk">
                {nokta.adres ? (
                  <a href={nokta.adres} className="underline-offset-2 hover:underline">
                    {nokta.ad}
                  </a>
                ) : (
                  nokta.ad
                )}
                <span className="text-metin-3 text-mikro">
                  {' · '}
                  {etiketler.get(nokta.katman) ?? nokta.katman}
                  {nokta.altBilgi ? ` · ${nokta.altBilgi}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
