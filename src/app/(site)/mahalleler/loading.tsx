import { KartIskeleti, MetinIskeleti } from '@/components/ui/Iskelet'

/**
 * Mahalle listesi yükleme iskeleti.
 *
 * ⚠️ Spinner değil iskelet. Spinner "bir şey oluyor" der; iskelet ne
 * geleceğini gösterir, algılanan bekleme süresini kısaltır ve gerçek
 * içerikle aynı yüksekliği tuttuğu için düzen zıplamaz (CLS < 0,1).
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        {Array.from({ length: 6 }, (_, sira) => (
          <KartIskeleti key={sira} />
        ))}
      </div>

      <span className="yalnizca-okuyucu" role="status">
        Mahalleler yükleniyor
      </span>
    </div>
  )
}
