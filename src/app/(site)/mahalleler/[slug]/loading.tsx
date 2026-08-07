import { IstatistikIskeleti, MetinIskeleti } from '@/components/ui/Iskelet'

/**
 * Mahalle sayfası yükleme iskeleti.
 *
 * ⚠️ Spinner değil iskelet. Sayfanın en ağır parçası hero görseli ve dört
 * istatistik kartı; iskelet ikisinin de yüksekliğini tutuyor ki içerik
 * gelince sayfa zıplamasın.
 */
export default function MahalleYukleniyor() {
  return (
    <div>
      <span className="iskelet block aspect-16/9 max-h-[28rem] w-full rounded-none" aria-hidden />

      <div className="kapsayici py-10 sm:py-14">
        <div className="mb-8 flex flex-col gap-3">
          <span className="iskelet block h-9 w-64" aria-hidden />
          <MetinIskeleti satir={2} sinifAdi="max-w-2xl" />
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {Array.from({ length: 4 }, (_, sira) => (
            <IstatistikIskeleti key={sira} />
          ))}
        </div>

        <MetinIskeleti satir={8} sinifAdi="mt-10 max-w-2xl" />
      </div>

      <span className="yalnizca-okuyucu" role="status">
        Mahalle sayfası yükleniyor
      </span>
    </div>
  )
}
