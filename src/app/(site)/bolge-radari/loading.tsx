import { IstatistikIskeleti, MetinIskeleti } from '@/components/ui/Iskelet'

/**
 * Bölge radarı yükleme iskeleti.
 *
 * ⚠️ Spinner değil iskelet. Spinner "bir şey oluyor" der; iskelet ne
 * geleceğini gösterir, algılanan bekleme süresini kısaltır ve gerçek
 * içerikle aynı yüksekliği tuttuğu için düzen zıplamaz (CLS < 0,1).
 *
 * Ekran okuyucuya durum ayrıca `role="status"` ile bildiriliyor:
 * iskeletlerin kendisi `aria-hidden`, çünkü yer tutucu bir gürültüdür.
 */
export default function BolgeRadariYukleniyor() {
  return (
    <div className="kapsayici py-10 sm:py-14">
      <div className="mb-8 flex flex-col gap-3">
        <span className="iskelet block h-9 w-56" aria-hidden />
        <MetinIskeleti satir={2} sinifAdi="max-w-2xl" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        {Array.from({ length: 8 }, (_, sira) => (
          <IstatistikIskeleti key={sira} />
        ))}
      </div>

      <span className="yalnizca-okuyucu" role="status">
        Bölge radarı sinyalleri hesaplanıyor
      </span>
    </div>
  )
}
