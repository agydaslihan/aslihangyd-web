import { IlanKartiIskeleti } from '@/components/ilan/IlanKarti'
import { ISKELET_KART_SAYISI } from '@/lib/duzen/iskelet'

/**
 * Portföy listesi yükleme iskeleti.
 *
 * Spinner değil skeleton: spinner "bir şey oluyor" der, skeleton "ne
 * geleceğini" gösterir. Kart yüksekliği gerçek kartla aynı olduğu için
 * içerik gelince düzen zıplamaz (CLS hedefi < 0.1).
 */
export default function PortfoyYukleniyor() {
  return (
    <div className="kapsayici py-10 sm:py-14">
      <div className="mb-8 flex flex-col gap-3">
        <div className="iskelet h-10 w-48" />
        <div className="iskelet h-5 w-full max-w-2xl" />
      </div>

      <div className="iskelet h-24" />

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        {Array.from({ length: ISKELET_KART_SAYISI }, (_, sira) => (
          <IlanKartiIskeleti key={sira} />
        ))}
      </div>

      <span className="yalnizca-okuyucu" role="status">
        İlanlar yükleniyor
      </span>
    </div>
  )
}
