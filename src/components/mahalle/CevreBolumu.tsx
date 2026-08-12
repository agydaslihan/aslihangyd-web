import Link from 'next/link'

import { POI_TIPLERI, type PoiTipi } from '@/collections/IlgiNoktalari'
import { BosDurum } from '@/components/ui/BosDurum'
import { KonumIkon } from '@/components/ui/Ikon'
import { Rozet } from '@/components/ui/Rozet'
import { mesafeYaz } from '@/lib/bicimlendirme'
import { sinif } from '@/lib/sinif'
import { CEVRE_GOSTERIM_SIRASI, type PoiMesafesi } from '@/lib/yakinlik/tipler'

/**
 * "Çevre ve erişim" — en yakın ilgi noktaları, gerçek mesafeleriyle.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ MESAFELER KUŞ UÇUŞU, SÜRE DEĞİL
 *
 * PROJE-PLANI.md "sanayiye 10 dakika" diyor. Dakika üretmek için yol ağı ve
 * rotalama motoru gerekir; elimizde yok. Mesafeyi bir hıza bölüp dakika
 * yazmak uydurma olurdu. Bu yüzden kilometre gösteriyoruz ve başlığın
 * altında "kuş uçuşu" diyoruz — hem doğru hem savunulabilir.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Bu bölüm haritadan BAĞIMSIZ çalışır: MapTiler anahtarı gelmeden de,
 * ilgi noktası kayıtları girildiği anda dolmaya başlar. Kasıtlı bir
 * ayrıştırma — en değerli bilgi (neye ne kadar uzak) en ucuz veriye bağlı.
 */

const TIP_ETIKETLERI = new Map<string, string>(POI_TIPLERI.map((t) => [t.value, t.label]))

export function CevreBolumu({
  mesafeler,
  /** Başlıkta geçecek yer adı — "Muhittin Mahallesi merkezine" gibi. */
  neyeGore,
  sinifAdi,
}: {
  mesafeler: readonly PoiMesafesi[]
  neyeGore: string
  sinifAdi?: string
}) {
  if (mesafeler.length === 0) {
    return (
      <BosDurum
        ikon={<KonumIkon width={32} height={32} />}
        baslik="Çevre noktaları henüz girilmedi"
        neden="Okul, sağlık, market, park, sanayi ve ulaşım noktaları tek tek, elle giriliyor. İlan platformlarından otomatik veri çekmiyoruz; bu hem kullanım koşullarını ihlal eder hem de doğruluğu denetlenemez."
        neZaman="Noktalar girildikçe bu bölüm kendiliğinden dolar."
        sinifAdi={sinifAdi}
      />
    )
  }

  const osmVar = mesafeler.some((mesafe) => mesafe.kaynak === 'osm')

  // Gösterim sırası önem sırasıdır: değer sürücüleri üstte.
  const sirali = [...mesafeler].sort((a, b) => {
    const sira = (tip: PoiTipi) => {
      const i = CEVRE_GOSTERIM_SIRASI.indexOf(tip)
      return i === -1 ? CEVRE_GOSTERIM_SIRASI.length : i
    }
    return sira(a.tip) - sira(b.tip) || a.enYakinMetre - b.enYakinMetre
  })

  return (
    <div className={sinif('flex flex-col gap-3', sinifAdi)}>
      <ul className="border-kenar rounded-kart divide-kenar divide-y-[0.5px] overflow-hidden border-[0.5px]">
        {sirali.map((mesafe) => (
          <li
            key={mesafe.tip}
            className="bg-yuzey flex items-baseline justify-between gap-4 px-4 py-3"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-metin-3 text-mikro font-medium tracking-wide uppercase">
                {TIP_ETIKETLERI.get(mesafe.tip) ?? mesafe.tip}
              </span>
              <span className="text-govde-kucuk flex items-center gap-2 truncate">
                <span className="truncate">{mesafe.enYakinAd}</span>
                {mesafe.onemli ? <Rozet ton="lacivert">Öne çıkan</Rozet> : null}
              </span>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
              {/* Rakam öne çıksın: yatırımcı sayfayı 3 saniye tarayınca
                  mesafeleri görebilmeli. */}
              <span className="text-baslik-3 font-sans font-medium tabular-nums">
                {mesafeYaz(mesafe.enYakinMetre)}
              </span>
              {mesafe.yakindaSayi > 1 ? (
                <span className="text-metin-3 text-mikro">
                  1 km içinde {mesafe.yakindaSayi} kayıt
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <p className="text-metin-3 text-mikro leading-relaxed">
        Mesafeler {neyeGore} <strong className="font-medium">kuş uçuşudur</strong>; sürüş mesafesi
        veya süresi değildir. Yalnızca sisteme girilmiş noktalar hesaba katılır — listede olmayan
        bir donatı, olmadığı anlamına gelmez.
      </p>

      {/*
        ⚠️ ODbL ATIF YÜKÜMLÜLÜĞÜ — kaldırılamaz.

        OpenStreetMap verisi Open Database License altında; yeniden kullanım
        serbest ama atıf zorunlu. Atıf yalnızca gerçekten OSM kaydı
        gösterildiğinde basılıyor: elle toplanmış veriyi OSM'e atfetmek,
        atfı unutmak kadar yanlış olurdu.
      */}
      {osmVar ? <OsmAtfi /> : null}
    </div>
  )
}

/**
 * OpenStreetMap atfı.
 *
 * ⚠️ ODbL gereği zorunlu ve kaldırılamaz. Lisans açıklaması ve kategori
 * eşlemesi /veri-kaynaklari sayfasında.
 */
export function OsmAtfi({ sinifAdi }: { sinifAdi?: string }) {
  return (
    <p className={sinif('text-metin-3 text-mikro leading-relaxed', sinifAdi)}>
      Bazı çevre noktaları{' '}
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2"
      >
        © OpenStreetMap katkıcıları
      </a>{' '}
      verisinden alınmıştır (ODbL).{' '}
      <Link href="/veri-kaynaklari" className="underline underline-offset-2">
        Veri kaynakları ve eşleme
      </Link>
    </p>
  )
}
