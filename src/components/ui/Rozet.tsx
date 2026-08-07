import type { ReactNode } from 'react'

import { DogrulanmisIkon, KilitIkon, SaatIkon } from '@/components/ui/Ikon'
import { sinif } from '@/lib/sinif'

type RozetTonu = 'notr' | 'lacivert' | 'basari' | 'hata' | 'uyari' | 'yetki'

const TONLAR: Record<RozetTonu, string> = {
  notr: 'bg-yuzey-2 text-metin-2 border-kenar',
  lacivert: 'bg-vurgu-zemin text-vurgu border-transparent',
  basari: 'bg-basari-zemin text-basari border-transparent',
  hata: 'bg-hata-zemin text-hata border-transparent',
  uyari: 'bg-uyari-zemin text-uyari-metin border-transparent',
  yetki: 'bg-yetki-zemin text-yetki-metin border-transparent',
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
        'text-mikro inline-flex items-center gap-1.5 rounded-rozet border-[0.5px] px-2 py-1 font-medium',
        TONLAR[ton],
        sinifAdi,
      )}
    >
      {children}
    </span>
  )
}

/* ==========================================================================
   İlan durumu rozetleri
   ========================================================================== */

/**
 * "Doğrulanmış İlan" rozeti — EİDS taşınmaz numarasıyla birlikte.
 *
 * ⚠️ Bu rozet yasal bir beyandır, dekorasyon değil. Taşınmaz numarası
 * olmadan RENDER EDİLMEZ: numarasız bir "doğrulanmış" etiketi, doğrulamanın
 * kendisini değersizleştirir ve yanıltıcı beyan riski doğurur.
 * (CLAUDE.md kural 1.)
 */
export function DogrulanmisIlanRozeti({
  tasinmazNo,
  sinifAdi,
}: {
  tasinmazNo?: string | null
  sinifAdi?: string
}) {
  if (typeof tasinmazNo !== 'string' || tasinmazNo.trim() === '') return null

  return (
    <span
      className={sinif(
        'bg-vurgu-zemin text-vurgu inline-flex items-center gap-2 rounded-rozet py-1.5 pr-3 pl-2',
        sinifAdi,
      )}
    >
      <DogrulanmisIkon width={16} height={16} className="shrink-0" />
      <span className="text-mikro leading-tight font-medium">
        Doğrulanmış İlan
        <span className="block font-normal opacity-80">
          Taşınmaz no: <span className="rakam">{tasinmazNo}</span>
        </span>
      </span>
    </span>
  )
}

/**
 * "Yayınlanmayan portföy" rozeti.
 *
 * Kilit ikonu bilinçli: renk tek başına "bu farklı" demiyor. Nötr ton
 * seçildi çünkü gizli portföy bir uyarı ya da hata değil — bilinçli bir
 * durum. Kırmızıya boyamak ziyaretçiye "bir sorun var" dedirtirdi.
 */
export function YayinlanmayanRozeti({ sinifAdi }: { sinifAdi?: string }) {
  return (
    <Rozet ton="notr" sinifAdi={sinifAdi}>
      <KilitIkon width={13} height={13} className="shrink-0" />
      Yayınlanmayan portföy
    </Rozet>
  )
}

/**
 * "Yetki N gün sonra bitiyor" rozeti.
 *
 * ⚠️ Bu rozet bir kapı değil, ayna. Gerçek kapı `eidsYayinEngeli` kancası;
 * rozet yalnızca yaklaşan tarihi görünür kılar. Gün sayısı bilinmiyorsa
 * ya da yetki hâlâ uzunsa hiç render edilmez — sürekli görünen bir uyarı
 * kısa sürede görünmez olur.
 */
export function YetkiSuresiRozeti({
  kalanGun,
  esik = 30,
  sinifAdi,
}: {
  kalanGun: number | null
  /** Kaç gün kala rozet görünsün. */
  esik?: number
  sinifAdi?: string
}) {
  if (kalanGun === null || kalanGun > esik) return null

  return (
    <Rozet ton="yetki" sinifAdi={sinifAdi}>
      <SaatIkon width={13} height={13} className="shrink-0" />
      {kalanGun <= 0 ? (
        'Yetki süresi doldu'
      ) : (
        <>
          Yetki <span className="rakam">{kalanGun}</span> gün sonra bitiyor
        </>
      )}
    </Rozet>
  )
}
