import type { Metadata } from 'next'

import { HaritaBolumu, type KatmanTanimi } from '@/components/harita/HaritaBolumu'
import type { HaritaAlani, HaritaNoktasi } from '@/components/harita/Harita'
import { POI_TIPLERI } from '@/collections/IlgiNoktalari'
import { paraKisaYaz } from '@/lib/bicimlendirme'
import { CORLU_MERKEZ, haritaHazirMi } from '@/lib/harita'
import { etiketBul } from '@/lib/secenekler'
import { mutlakAdres } from '@/lib/site'
import { ilanlariGetir } from '@/lib/veri/ilanlar'
import { ilgiNoktalariniGetir, konumuCoz } from '@/lib/veri/ilgiNoktalari'
import { mahalleleriGetir } from '@/lib/veri/mahalleler'

export const metadata: Metadata = {
  title: 'Çorlu haritası — portföy, mahalleler ve çevre',
  description:
    'Çorlu haritasında portföyümüz, mahalle sınırları ve çevredeki okul, sağlık, market, ' +
    'park, sanayi ve ulaşım noktaları.',
  alternates: { canonical: mutlakAdres('/harita') },
}

const ILAN_KATMANI = 'ilan'

export default async function HaritaSayfasi() {
  const [poiler, mahalleler, ilanSonucu] = await Promise.all([
    ilgiNoktalariniGetir(),
    mahalleleriGetir(),
    ilanlariGetir({}, 1, 200),
  ])

  const noktalar: HaritaNoktasi[] = []

  for (const poi of poiler) {
    const konum = konumuCoz(poi.konum)
    if (!konum) continue

    noktalar.push({
      id: `poi-${poi.id}`,
      ad: poi.ad,
      tip: poi.tip,
      boylam: konum.boylam,
      enlem: konum.enlem,
      altBilgi: etiketBul(POI_TIPLERI, poi.tip) ?? undefined,
    })
  }

  for (const ilan of ilanSonucu.ilanlar) {
    const konum = konumuCoz(ilan.konum)
    if (!konum) continue

    noktalar.push({
      id: `ilan-${ilan.id}`,
      ad: ilan.baslik,
      tip: ILAN_KATMANI,
      boylam: konum.boylam,
      enlem: konum.enlem,
      adres: `/portfoy/${ilan.slug}`,
      altBilgi: paraKisaYaz(ilan.fiyat, ilan.paraBirimi ?? 'TRY') ?? 'Fiyat görüşülür',
    })
  }

  const alanlar: HaritaAlani[] = mahalleler.flatMap((mahalle) => {
    const geometri = geometriCoz(mahalle.sinir)
    if (geometri === null) return []
    return [{ id: mahalle.id, ad: mahalle.ad, geometri }]
  })

  // Yalnızca gerçekten veri olan katmanlar gösterilir — boş bir filtre
  // düğmesi kullanıcıyı hiçbir şey bulamayacağı bir tıklamaya davet eder.
  const mevcutTipler = new Set(noktalar.map((nokta) => nokta.tip))
  const katmanlar: KatmanTanimi[] = [
    ...(mevcutTipler.has(ILAN_KATMANI) ? [{ anahtar: ILAN_KATMANI, etiket: 'Portföyümüz' }] : []),
    ...POI_TIPLERI.filter((tip) => mevcutTipler.has(tip.value)).map((tip) => ({
      anahtar: tip.value,
      etiket: tip.label,
    })),
  ]

  return (
    <div className="kapsayici py-10 sm:py-14">
      <header className="mb-8 flex max-w-2xl flex-col gap-3">
        <h1 className="text-[2rem] leading-tight sm:text-[2.5rem]">Çorlu haritası</h1>
        <p className="text-murekkep-2 leading-relaxed">
          Bir taşınmazın değerini konumu belirler. Portföyümüzü, mahalle sınırlarını ve çevredeki
          okul, sağlık, ulaşım ve sanayi noktalarını aynı haritada görün.
        </p>
      </header>

      <HaritaBolumu
        noktalar={noktalar}
        alanlar={alanlar}
        katmanlar={katmanlar}
        haritaHazir={haritaHazirMi()}
        merkez={CORLU_MERKEZ}
      />
    </div>
  )
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
