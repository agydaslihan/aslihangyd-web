import { KartIskeleti, MetinIskeleti } from '@/components/ui/Iskelet'
import {
  ISKELET_KART_SAYISI,
  IZGARA_MIN_YUKSEKLIK,
  MAHALLE_GORSEL_SINIFI,
} from '@/lib/duzen/iskelet'

/**
 * Mahalle listesi yükleme iskeleti.
 *
 * ⚠️ Spinner değil iskelet. Spinner "bir şey oluyor" der; iskelet ne
 * geleceğini gösterir ve algılanan bekleme süresini kısaltır.
 *
 * ⚠️ "Gerçek içerikle aynı yüksekliği tutar" varsayımı DOĞRULANMAMIŞTI:
 * iskelet ilan kartı biçimindeydi (sabit 124 px görsel), mahalle kartı ise
 * `aspect-16/10` (~237 px) ve sayı da tutmuyordu. Ölçümde masaüstü CLS
 * 0,029 çıktı. Artık hem görsel oranı gerçek kartla aynı hem de alan
 * `IZGARA_MIN_YUKSEKLIK` ile iki taraftan tutuluyor — gerekçe
 * `src/lib/duzen/iskelet.ts`.
 *
 * Ekran okuyucuya durum ayrıca `role="status"` ile bildiriliyor:
 * iskeletlerin kendisi `aria-hidden`, çünkü yer tutucu bir gürültüdür.
 */
export default function MahallelerYukleniyor() {
  return (
    <div className="kapsayici py-10 sm:py-14">
      <div className="mb-8 flex flex-col gap-3">
        <span className="iskelet block h-9 w-56" aria-hidden />
        <MetinIskeleti satir={2} sinifAdi="max-w-2xl" />
      </div>

      <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5 ${IZGARA_MIN_YUKSEKLIK}`}>
        {Array.from({ length: ISKELET_KART_SAYISI }, (_, sira) => (
          <KartIskeleti key={sira} gorselSinifi={MAHALLE_GORSEL_SINIFI} />
        ))}
      </div>

      <span className="yalnizca-okuyucu" role="status">
        Mahalleler yükleniyor
      </span>
    </div>
  )
}
