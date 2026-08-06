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
    yuzey: 'bg-yuzey-2/60 border-y-[0.5px] border-kenar',
    lacivert: 'bg-lacivert-yuzey text-white',
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
          <span className="text-vurgu text-mikro font-medium tracking-[0.08em] uppercase">
            {ustBaslik}
          </span>
        ) : null}
        <Baslik className={seviye === 2 ? 'text-baslik-2' : 'text-baslik-3'}>{baslik}</Baslik>
        {aciklama ? <p className="text-metin-2 text-govde-kucuk olcu">{aciklama}</p> : null}
      </div>
      {yan ? <div className="shrink-0">{yan}</div> : null}
    </div>
  )
}
