import Image from 'next/image'

import { VeriBekleniyorIkon } from '@/components/ui/Ikon'
import type { Ilanlar, Medya } from '@/payload-types'

/**
 * İlan görselleri.
 *
 * Bilinçli olarak **karusel değil.** Karusel mobilde kaydırma çakışması
 * yaratır, ilk görsel dışındakiler nadiren görülür ve JavaScript gerektirir.
 * Bunun yerine: büyük kapak + yan ızgara, hepsi doğrudan görünür.
 *
 * İlk görsel `priority` ile yüklenir — sayfanın LCP öğesi odur.
 */
export function IlanGalerisi({ ilan }: { ilan: Ilanlar }) {
  const gorseller = (ilan.gorseller ?? [])
    .map((satir) => satir.gorsel)
    .filter((gorsel): gorsel is Medya => typeof gorsel === 'object' && gorsel !== null)

  if (gorseller.length === 0) {
    return (
      <div className="bg-yuzey-2 border-kenar rounded-kart text-metin-3 flex aspect-16/9 flex-col items-center justify-center gap-3 border-[0.5px] border-dashed sm:aspect-21/9">
        <VeriBekleniyorIkon width={36} height={36} />
        <p className="text-govde-kucuk">Bu taşınmazın fotoğrafları henüz yüklenmedi.</p>
      </div>
    )
  }

  const [kapak, ...digerleri] = gorseller
  const yan = digerleri.slice(0, 4)

  return (
    <div className="grid gap-2 sm:grid-cols-[2fr_1fr] sm:gap-3">
      <div className="bg-yuzey-2 rounded-kart relative aspect-4/3 overflow-hidden sm:aspect-3/2">
        <Image
          src={kapak!.url ?? ''}
          alt={kapak!.alt ?? ilan.baslik}
          fill
          sizes="(max-width: 640px) 100vw, 66vw"
          className="object-cover"
          priority
        />
      </div>

      {yan.length > 0 ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-2 sm:gap-3">
          {yan.map((gorsel) => (
            <div
              key={gorsel.id}
              className="bg-yuzey-2 rounded-kart relative aspect-square overflow-hidden"
            >
              <Image
                src={gorsel.url ?? ''}
                alt={gorsel.alt ?? ''}
                fill
                sizes="(max-width: 640px) 25vw, 17vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
