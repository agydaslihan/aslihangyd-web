import type { Metadata } from 'next'

import { POI_TIPLERI } from '@/collections/IlgiNoktalari'
import type { HaritaNoktasi } from '@/components/harita/Harita3B'
import {
  HaritaSahnesi,
  type KatmanTanimi,
  type MahalleVerisi,
} from '@/components/harita/HaritaSahnesi'
import { paraKisaYaz } from '@/lib/bicimlendirme'
import { haritaStilAdresi } from '@/lib/harita/sunucu'
import { kabaMerkez, type Konum } from '@/lib/harita/sutunlar'
import { mutlakAdres } from '@/lib/site'
import { ilanlariGetir } from '@/lib/veri/ilanlar'
import { ilgiNoktalariniGetir, konumuCoz } from '@/lib/veri/ilgiNoktalari'
import { mahalleleriGetir } from '@/lib/veri/mahalleler'
import { bolumKapisi } from '@/lib/veri/siteBolumleri'

export const metadata: Metadata = {
  title: 'Çorlu 3B harita — m² fiyatı, kira ve yatırım skoru',
  description:
    'Çorlu mahallelerinin m² satış fiyatını, kirasını, kira çarpanını ve yatırım skorunu ' +
    'üç boyutlu haritada karşılaştırın. Portföyümüz ve çevre noktaları aynı haritada.',
  alternates: { canonical: mutlakAdres('/harita') },
}

/**
 * Tam ekran 3B harita — sitenin gösteri parçası.
 *
 * Katman anahtarları burada tanımlanır ve `HaritaSahnesi`'ne geçer.
 * POI tipleri tek tek katman olmak yerine üç anlamlı gruba toplanıyor:
 * on bir ayrı onay kutusu paneli listeye çevirir ve kimse okumaz.
 */

const KATMAN_OKUL_SAGLIK = 'okul-saglik'
const KATMAN_SANAYI = 'sanayi'
const KATMAN_PORTFOY = 'portfoyum'
const KATMAN_PROJELER = 'projeler'

/** POI tipi → katman grubu. Listede olmayan tip haritada gösterilmez. */
const POI_GRUPLARI: Record<string, string> = {
  okul: KATMAN_OKUL_SAGLIK,
  universite: KATMAN_OKUL_SAGLIK,
  hastane: KATMAN_OKUL_SAGLIK,
  sanayi: KATMAN_SANAYI,
}

export default async function HaritaSayfasi() {
  // ⚠️ Bölüm kapısı EN BAŞTA: kapalıysa hiçbir veri sorgusu çalışmasın.
  // Harita sayfası ilan, mahalle ve POI'yi birden okuyor; kapıyı aşağı
  // koymak kapalı bir bölüm için üç sorgu çalıştırmak olurdu.
  await bolumKapisi('harita')

  const [poiler, mahalleKayitlari, ilanSonucu] = await Promise.all([
    ilgiNoktalariniGetir(),
    mahalleleriGetir(),
    ilanlariGetir({}, 1, 200),
  ])

  /* ── Mahalleler ───────────────────────────────────────────────────── */
  const sayisal = (deger: unknown): number | null =>
    typeof deger === 'number' && Number.isFinite(deger) ? deger : null

  const mahalleler: MahalleVerisi[] = mahalleKayitlari.map((mahalle) => {
    const sinir = geometriCoz(mahalle.sinir)

    /**
     * ⚠️ Merkezi bilinmeyen mahalle için SÜTUN ÇİZİLMEZ — ama mahalle
     * listeden düşmez. Tahmini bir koordinat uydurmak yanlış yerde duran
     * bir sütun demek olurdu (CLAUDE.md kural 2); mahalleyi tümden yok
     * saymak ise panelin, listenin ve rakamların da kaybolmasına yol
     * açıyordu. Konum eksikliği haritanın sorunu, mahallenin değil.
     */
    const merkez = noktaCoz(mahalle.merkez) ?? kabaMerkez(sinir)

    return {
      slug: mahalle.slug,
      ad: mahalle.ad,
      merkez,
      sinir,
      satisM2: sayisal(mahalle.ortalamaM2Satis),
      kira: sayisal(mahalle.ortalamaKira),
      kiraCarpani: sayisal(mahalle.kiraCarpani),
      yatirimSkoru: sayisal(mahalle.yatirimSkoru?.toplam),
      degisim12Ay: sayisal(mahalle.degisim12Ay),
      gozlemSayisi: sayisal(mahalle.gozlemSayisi),
      verilerinTarihi: mahalle.verilerinTarihi ?? null,
    }
  })

  /* ── Noktalar ─────────────────────────────────────────────────────── */
  const noktalar: HaritaNoktasi[] = []

  for (const poi of poiler) {
    const grup = POI_GRUPLARI[poi.tip]
    const konum = konumuCoz(poi.konum)
    if (grup === undefined || konum === null) continue

    noktalar.push({
      id: `poi-${poi.id}`,
      ad: poi.ad,
      katman: grup,
      boylam: konum.boylam,
      enlem: konum.enlem,
      altBilgi: POI_TIPLERI.find((tip) => tip.value === poi.tip)?.label,
    })
  }

  for (const ilan of ilanSonucu.ilanlar) {
    const konum = konumuCoz(ilan.konum)
    if (konum === null) continue

    noktalar.push({
      id: `ilan-${ilan.id}`,
      ad: ilan.baslik,
      katman: KATMAN_PORTFOY,
      boylam: konum.boylam,
      enlem: konum.enlem,
      adres: `/portfoy/${ilan.slug}`,
      altBilgi: paraKisaYaz(ilan.fiyat, ilan.paraBirimi ?? 'TRY') ?? 'Fiyat görüşülür',
    })
  }

  const say = (katman: string) => noktalar.filter((nokta) => nokta.katman === katman).length

  /**
   * ⚠️ Verisi olmayan katman GİZLENMİYOR, PASİF gösteriliyor ve sebebi
   * yazılıyor. Gizlemek "böyle bir katman yok" der; pasif göstermek
   * "var ama verisi girilmedi" der. İkincisi doğru olan.
   *
   * "Projeler" için henüz koleksiyon yok — Faz 3'te gelecek. Bugün sıfır
   * öğeyle, sebebi yazılı duruyor.
   */
  const noktaKatmanlari: KatmanTanimi[] = [
    {
      anahtar: KATMAN_PORTFOY,
      etiket: 'Portföyüm',
      renk: 'var(--color-gold-guclu)',
      adet: say(KATMAN_PORTFOY),
    },
    {
      anahtar: KATMAN_OKUL_SAGLIK,
      etiket: 'Okul / sağlık',
      renk: 'var(--color-kakao-500)',
      adet: say(KATMAN_OKUL_SAGLIK),
    },
    {
      anahtar: KATMAN_SANAYI,
      etiket: 'Sanayi',
      renk: 'var(--color-uyari)',
      adet: say(KATMAN_SANAYI),
    },
    { anahtar: KATMAN_PROJELER, etiket: 'Projeler', renk: 'var(--color-basari)', adet: 0 },
  ]

  return (
    <>
      {/* SEO ve ekran okuyucu için sayfa başlığı — görsel olarak gizli,
          çünkü harita tam ekran ve başlık şeridi kapatırdı. */}
      <h1 className="yalnizca-okuyucu">Çorlu 3B harita</h1>

      {/*
        Yükseklik: görünen alan eksi başlık (4rem). `svh` kullanılıyor —
        mobil tarayıcıların adres çubuğu gizlenirken `vh` sıçrama yapıp
        haritayı kırpıyordu.
      */}
      <div className="h-[calc(100svh-4rem)] min-h-[30rem]">
        <HaritaSahnesi
          mahalleler={mahalleler}
          noktalar={noktalar}
          noktaKatmanlari={noktaKatmanlari}
          stilAdresi={haritaStilAdresi()}
        />
      </div>
    </>
  )
}

/** Payload `point` alanı `[boylam, enlem]` dizisi olarak gelir. */
function noktaCoz(ham: unknown): Konum | null {
  if (!Array.isArray(ham) || ham.length < 2) return null
  const [boylam, enlem] = ham
  if (typeof boylam !== 'number' || typeof enlem !== 'number') return null
  if (!Number.isFinite(boylam) || !Number.isFinite(enlem)) return null
  return [boylam, enlem]
}

/**
 * CMS'e yapıştırılan GeoJSON'u geometriye çevirir.
 *
 * geojson.io tam bir `FeatureCollection` üretir; kullanıcıdan sadece
 * geometriyi ayıklamasını beklemek gereksiz bir engel olurdu, bu yüzden
 * her iki biçimi de kabul ediyoruz.
 */
function geometriCoz(ham: unknown): GeoJSON.Geometry | null {
  if (typeof ham !== 'object' || ham === null) return null
  const veri = ham as Record<string, unknown>

  if (veri.type === 'FeatureCollection' && Array.isArray(veri.features)) {
    const ilk = veri.features[0] as Record<string, unknown> | undefined
    return (ilk?.geometry as GeoJSON.Geometry) ?? null
  }
  if (veri.type === 'Feature') {
    return (veri.geometry as GeoJSON.Geometry) ?? null
  }
  if (veri.type === 'Polygon' || veri.type === 'MultiPolygon') {
    return veri as unknown as GeoJSON.Geometry
  }

  return null
}
