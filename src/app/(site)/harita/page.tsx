import type { Metadata } from 'next'

import { POI_TIPLERI } from '@/collections/IlgiNoktalari'
import type { HaritaNoktasi } from '@/components/harita/Harita3B'
import { HaritaSahnesi, type MahalleVerisi } from '@/components/harita/HaritaSahnesi'
import { paraKisaYaz } from '@/lib/bicimlendirme'
import { haritaStilAdresi } from '@/lib/harita/sunucu'
import { mahalleyiHaritaVerisineCevir } from '@/lib/harita/mahalleVerisi'
import { KATMAN_PORTFOY, POI_GRUPLARI, noktaKatmanTanimlari } from '@/lib/harita/noktaKatmanlari'
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

  const mahalleler: MahalleVerisi[] = mahalleKayitlari.map(mahalleyiHaritaVerisineCevir)

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
  const noktaKatmanlari = noktaKatmanTanimlari(say)

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
