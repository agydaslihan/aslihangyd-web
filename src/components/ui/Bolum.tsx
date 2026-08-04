import type { ReactNode } from 'react'

import { sinif } from '@/lib/sinif'

/** Sayfa bölümü — tutarlı dikey ritim ve kapsayıcı genişliği. */
export function Bolum({
  children,
  sinifAdi,
  zemin = 'kagit',
  id,
}: {
  children: ReactNode
  sinifAdi?: string
  zemin?: 'kagit' | 'yuzey' | 'lacivert'
  id?: string
}) {
  const zeminler = {
    kagit: '',
    yuzey: 'bg-yuzey-2/60 border-y border-cizgi',
    lacivert: 'bg-lacivert-koyu text-white',
  } as const

  return (
    <section id={id} className={sinif('py-12 sm:py-16 lg:py-20', zeminler[zemin], sinifAdi)}>
      <div className="kapsayici">{children}</div>
    </section>
  )
}

/**
 * Bölüm başlığı.
 *
 * `ustBaslik` küçük bir bağlam etiketi (kicker) — bölümün ne olduğunu
 * başlığı okumadan söyler ve uzun sayfalarda konum hissi verir.
 */
export function BolumBasligi({
  ustBaslik,
  baslik,
  aciklama,
  yan,
  seviye = 2,
}: {
  ustBaslik?: string
  baslik: string
  aciklama?: ReactNode
  /** Sağda duran bağlantı/buton — mobilde başlığın altına iner. */
  yan?: ReactNode
  seviye?: 2 | 3
}) {
  const Baslik = seviye === 2 ? 'h2' : 'h3'

  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex max-w-2xl flex-col gap-2">
        {ustBaslik ? (
          <span className="text-pirinc-koyu text-mikro font-semibold tracking-[0.08em] uppercase">
            {ustBaslik}
          </span>
        ) : null}
        <Baslik className="text-[1.625rem] leading-tight sm:text-[2rem]">{baslik}</Baslik>
        {aciklama ? (
          <p className="text-murekkep-2 text-[0.9375rem] leading-relaxed">{aciklama}</p>
        ) : null}
      </div>
      {yan ? <div className="shrink-0">{yan}</div> : null}
    </div>
  )
}
