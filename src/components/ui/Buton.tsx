import Link from 'next/link'
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'

import { sinif } from '@/lib/sinif'

/**
 * Buton ve buton görünümlü bağlantı.
 *
 * Erişilebilirlik kararı: bir yere GİDİYORSA `<a>`, bir şey YAPIYORSA
 * `<button>` olur. Görsel olarak aynı görünmeleri bu ayrımı ortadan
 * kaldırmaz — ekran okuyucu ve klavye davranışları farklıdır.
 */

type Gorunum = 'birincil' | 'ikincil' | 'sessiz' | 'whatsapp'
type Boyut = 'kucuk' | 'orta' | 'buyuk'

const GORUNUMLER: Record<Gorunum, string> = {
  birincil:
    'bg-lacivert text-white hover:bg-lacivert-koyu active:bg-lacivert-koyu border border-transparent',
  ikincil:
    'bg-yuzey text-murekkep border border-cizgi-guclu hover:border-lacivert hover:text-lacivert',
  sessiz: 'bg-transparent text-lacivert border border-transparent hover:bg-lacivert-acik',
  // WhatsApp'ın kurumsal yeşili bilinçli olarak kullanılmıyor: sayfadaki
  // tek parlak renk olurdu ve sakin paleti bozardı. Tanınırlık ikondan gelir.
  whatsapp:
    'bg-yuzey-2 text-murekkep border border-cizgi-guclu hover:border-lacivert hover:text-lacivert',
}

const BOYUTLAR: Record<Boyut, string> = {
  // Dokunma hedefi en az 44px: mobil trafiği %75.
  kucuk: 'min-h-11 px-3.5 text-sm gap-1.5',
  orta: 'min-h-11 px-5 text-[0.9375rem] gap-2',
  buyuk: 'min-h-13 px-6 text-base gap-2.5',
}

const TEMEL =
  'inline-flex items-center justify-center rounded-yumusak font-medium ' +
  'transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none ' +
  'whitespace-nowrap'

interface OrtakOzellikler {
  gorunum?: Gorunum
  boyut?: Boyut
  /** Butonu satır genişliğine yayar — mobilde tercih edilir. */
  tamGenislik?: boolean
  children: ReactNode
  sinifAdi?: string
}

type ButonOzellikleri = OrtakOzellikler &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
    href?: undefined
  }

type BaglantiOzellikleri = OrtakOzellikler &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children' | 'href'> & {
    href: string
    /** Dış bağlantı: yeni sekmede açılır ve güvenlik öznitelikleri eklenir. */
    dis?: boolean
  }

export function Buton(ozellikler: ButonOzellikleri | BaglantiOzellikleri) {
  const {
    gorunum = 'birincil',
    boyut = 'orta',
    tamGenislik = false,
    children,
    sinifAdi,
    ...kalan
  } = ozellikler

  const siniflar = sinif(
    TEMEL,
    GORUNUMLER[gorunum],
    BOYUTLAR[boyut],
    tamGenislik && 'w-full',
    sinifAdi,
  )

  if ('href' in kalan && typeof kalan.href === 'string') {
    const { href, dis, ...baglantiOzellikleri } = kalan as BaglantiOzellikleri

    if (dis) {
      return (
        <a
          href={href}
          className={siniflar}
          target="_blank"
          rel="noopener noreferrer"
          {...baglantiOzellikleri}
        >
          {children}
        </a>
      )
    }

    return (
      <Link href={href} className={siniflar} {...baglantiOzellikleri}>
        {children}
      </Link>
    )
  }

  const { type = 'button', ...butonOzellikleri } = kalan as ButonOzellikleri
  return (
    <button type={type} className={siniflar} {...butonOzellikleri}>
      {children}
    </button>
  )
}
