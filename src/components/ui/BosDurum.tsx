import type { ReactNode } from 'react'

import { VeriBekleniyorIkon } from '@/components/ui/Ikon'
import { sinif } from '@/lib/sinif'

/**
 * Boş durum.
 *
 * Bu projede boş durum tasarımı kritik: site uzun süre kısmi veriyle
 * çalışacak. Kötü bir boş durum ("Sonuç bulunamadı." + beyaz ekran)
 * ziyaretçiye sitenin bozuk olduğunu düşündürür.
 *
 * Kural: her boş durum üç şeyi söyler — ne yok, neden yok, şimdi ne yapılır.
 */
export function BosDurum({
  baslik,
  aciklama,
  eylem,
  ikon,
  sade = false,
  sinifAdi,
}: {
  baslik: string
  aciklama: string
  /** Ziyaretçiyi çıkmazdan çıkaran bağlantı/buton. */
  eylem?: ReactNode
  ikon?: ReactNode
  /** Çerçevesiz — zaten bir kartın içindeyse. */
  sade?: boolean
  sinifAdi?: string
}) {
  return (
    <div
      className={sinif(
        'flex flex-col items-center gap-3 px-6 py-12 text-center',
        !sade && 'border-cizgi bg-yuzey-2/60 rounded-yumusak border border-dashed',
        sinifAdi,
      )}
    >
      <span className="text-murekkep-3" aria-hidden>
        {ikon ?? <VeriBekleniyorIkon width={32} height={32} />}
      </span>

      <div className="flex max-w-md flex-col gap-1.5">
        <p className="text-murekkep font-medium">{baslik}</p>
        <p className="text-murekkep-2 text-sm leading-relaxed">{aciklama}</p>
      </div>

      {eylem ? <div className="mt-2">{eylem}</div> : null}
    </div>
  )
}
