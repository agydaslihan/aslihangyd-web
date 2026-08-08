import { sinif } from '@/lib/sinif'

/**
 * Yükleme iskeletleri.
 *
 * ⚠️ Spinner kullanılmaz. Spinner "bir şey oluyor" der; iskelet "ne
 * geleceğini" gösterir, algılanan bekleme süresini kısaltır ve içerik
 * gelince düzen zıplamaz (CLS hedefi < 0,1).
 *
 * Hepsi `aria-hidden`: ekran okuyucu için yer tutucu bir gürültüdür.
 * Yükleme durumu, çevreleyen bölgenin `aria-busy` özniteliğiyle anlatılır.
 */

export function SatirIskeleti({
  genislik = 'w-full',
  yukseklik = 'h-4',
  sinifAdi,
}: {
  genislik?: string
  yukseklik?: string
  sinifAdi?: string
}) {
  return <span className={sinif('iskelet block', genislik, yukseklik, sinifAdi)} aria-hidden />
}

/** İlan/mahalle kartının iskeleti — gerçek kartla aynı yüksekliği tutar. */
export function KartIskeleti({
  sinifAdi,
  gorselSinifi = 'h-[124px]',
}: {
  sinifAdi?: string
  /**
   * ⚠️ Görsel alanının yüksekliği GERÇEK KARTLA AYNI OLMAK ZORUNDA.
   *
   * Varsayılan `h-[124px]`, `IlanKarti`nin görsel yüksekliği. Mahalle
   * kartı ise `aspect-16/10` kullanıyor ve masaüstünde ~237 px'e çıkıyor.
   * `/mahalleler` iskeleti bu varsayılanı kullandığı için kart başına
   * ~113 px eksik yer ayırıyordu; gerçek içerik gelince düzen zıplıyor ve
   * ölçümde CLS 0,029 olarak görünüyordu (footer yukarı sıçrıyordu).
   *
   * Yani "iskelet gerçek içerikle aynı yüksekliği tutar" varsayımı
   * doğrulanmamıştı. Artık çağıran taraf hangi kartı taklit ettiğini
   * açıkça söylüyor.
   */
  gorselSinifi?: string
}) {
  return (
    <div
      className={sinif(
        'bg-yuzey rounded-kart overflow-hidden border-[0.5px] border-kenar',
        sinifAdi,
      )}
      aria-hidden
    >
      <span className={sinif('iskelet block rounded-none', gorselSinifi)} />
      <div className="flex flex-col gap-2.5 p-4">
        <SatirIskeleti genislik="w-1/2" yukseklik="h-5" />
        <SatirIskeleti genislik="w-3/4" yukseklik="h-3.5" />
        <SatirIskeleti genislik="w-2/3" yukseklik="h-3" />
        <SatirIskeleti genislik="w-2/5" yukseklik="h-3" sinifAdi="mt-1" />
      </div>
    </div>
  )
}

/** İstatistik kartının iskeleti. */
export function IstatistikIskeleti({ sinifAdi }: { sinifAdi?: string }) {
  return (
    <div
      className={sinif(
        'bg-yuzey rounded-kart flex flex-col gap-2 border-[0.5px] border-kenar p-4 sm:p-5',
        sinifAdi,
      )}
      aria-hidden
    >
      <SatirIskeleti genislik="w-2/3" yukseklik="h-3" />
      <SatirIskeleti genislik="w-1/2" yukseklik="h-7" />
      <SatirIskeleti genislik="w-1/3" yukseklik="h-3" />
    </div>
  )
}

/** Metin bloğu iskeleti — satır sayısı verilir. */
export function MetinIskeleti({ satir = 3, sinifAdi }: { satir?: number; sinifAdi?: string }) {
  return (
    <div className={sinif('flex flex-col gap-2', sinifAdi)} aria-hidden>
      {Array.from({ length: satir }, (_, sira) => (
        <SatirIskeleti
          key={sira}
          // Son satır kısa: gerçek paragraf da öyle biter.
          genislik={sira === satir - 1 ? 'w-3/5' : 'w-full'}
          yukseklik="h-3.5"
        />
      ))}
    </div>
  )
}
