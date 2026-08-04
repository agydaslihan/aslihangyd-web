import type { ReactNode } from 'react'

import { DogrulanmisIkon } from '@/components/ui/Ikon'
import { sinif } from '@/lib/sinif'

type RozetTonu = 'notr' | 'lacivert' | 'pirinc' | 'artis' | 'azalis' | 'uyari'

const TONLAR: Record<RozetTonu, string> = {
  notr: 'bg-yuzey-2 text-murekkep-2 border-cizgi',
  lacivert: 'bg-lacivert-acik text-lacivert border-transparent',
  pirinc: 'bg-pirinc-acik text-pirinc-koyu border-transparent',
  artis: 'bg-artis-acik text-artis border-transparent',
  azalis: 'bg-azalis-acik text-azalis border-transparent',
  uyari: 'bg-uyari-acik text-pirinc-koyu border-transparent',
}

export function Rozet({
  ton = 'notr',
  children,
  sinifAdi,
}: {
  ton?: RozetTonu
  children: ReactNode
  sinifAdi?: string
}) {
  return (
    <span
      className={sinif(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-mikro font-medium',
        TONLAR[ton],
        sinifAdi,
      )}
    >
      {children}
    </span>
  )
}

/**
 * "Doğrulanmış İlan" rozeti — EİDS taşınmaz numarasıyla birlikte.
 *
 * ⚠️ Bu rozet yasal bir beyandır, dekorasyon değil. Taşınmaz numarası
 * olmadan RENDER EDİLMEZ: numarasız bir "doğrulanmış" etiketi, doğrulamanın
 * kendisini değersizleştirir ve yanıltıcı beyan riski doğurur.
 */
export function DogrulanmisIlanRozeti({ tasinmazNo }: { tasinmazNo?: string | null }) {
  if (typeof tasinmazNo !== 'string' || tasinmazNo.trim() === '') return null

  return (
    <span className="border-cizgi bg-yuzey inline-flex items-center gap-2 rounded-full border py-1.5 pr-3.5 pl-2.5">
      <DogrulanmisIkon width={16} height={16} className="text-artis shrink-0" />
      <span className="text-mikro leading-tight font-medium">
        Doğrulanmış İlan
        <span className="text-murekkep-3 block font-normal">
          Taşınmaz no: <span className="rakam">{tasinmazNo}</span>
        </span>
      </span>
    </span>
  )
}
