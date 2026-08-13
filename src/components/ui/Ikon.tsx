import type { SVGProps } from 'react'

/**
 * Projede kullanılan ikonlar.
 *
 * Bir ikon paketi (lucide, heroicons) yerine elle yazılmış SVG: toplam
 * ihtiyaç 12 ikon, paket ise ağaç sarsma sonrası bile derleme süresi ve
 * bağımlılık yüzeyi ekliyor.
 *
 * Hepsi `currentColor` kullanır ve `aria-hidden` gelir — ikonlar dekoratif
 * kabul edilir, anlam her zaman yanındaki metinde olmalıdır.
 */

type IkonOzellikleri = SVGProps<SVGSVGElement>

function Govde({ children, ...ozellikler }: IkonOzellikleri) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      width={20}
      height={20}
      {...ozellikler}
    >
      {children}
    </svg>
  )
}

export function DogrulanmisIkon(ozellikler: IkonOzellikleri) {
  return (
    <Govde {...ozellikler}>
      <path d="M12 2.5 4 6v5.4c0 4.6 3.2 8.9 8 10.1 4.8-1.2 8-5.5 8-10.1V6z" />
      <path d="m9 12 2 2 4-4" />
    </Govde>
  )
}

export function KonumIkon(ozellikler: IkonOzellikleri) {
  return (
    <Govde {...ozellikler}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </Govde>
  )
}

export function AlanIkon(ozellikler: IkonOzellikleri) {
  return (
    <Govde {...ozellikler}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h4M3 15h4M9 3v4M15 3v4" />
    </Govde>
  )
}

export function OdaIkon(ozellikler: IkonOzellikleri) {
  return (
    <Govde {...ozellikler}>
      <path d="M3 21V8l9-5 9 5v13" />
      <path d="M9 21v-6h6v6" />
    </Govde>
  )
}

export function GrafikIkon(ozellikler: IkonOzellikleri) {
  return (
    <Govde {...ozellikler}>
      <path d="M3 3v18h18" />
      <path d="m7 14 3.5-4 3 3L20 6" />
    </Govde>
  )
}

export function OkIkon(ozellikler: IkonOzellikleri) {
  return (
    <Govde {...ozellikler}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Govde>
  )
}

export function WhatsappIkon(ozellikler: IkonOzellikleri) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      width={20}
      height={20}
      {...ozellikler}
    >
      <path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.1-.6.1l-.9 1c-.2.2-.3.2-.6.1a8 8 0 0 1-2.4-1.5 9 9 0 0 1-1.6-2c-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5v-.5l-.9-2.1c-.2-.5-.5-.5-.6-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.2 3.4 5.3 4.7l1.3.5c.5.2 1 .1 1.4.1.4 0 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1zM12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2m0 18.3c-1.6 0-3.2-.4-4.6-1.3l-.3-.2-3 .8.8-3-.2-.3A8.3 8.3 0 1 1 12 20.3" />
    </svg>
  )
}

export function TelefonIkon(ozellikler: IkonOzellikleri) {
  return (
    <Govde {...ozellikler}>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
    </Govde>
  )
}

export function PostaIkon(ozellikler: IkonOzellikleri) {
  return (
    <Govde {...ozellikler}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 6 10-6" />
    </Govde>
  )
}

export function BilgiIkon(ozellikler: IkonOzellikleri) {
  return (
    <Govde {...ozellikler}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </Govde>
  )
}

export function VeriBekleniyorIkon(ozellikler: IkonOzellikleri) {
  return (
    <Govde {...ozellikler}>
      <path d="M3 20h18" />
      <path d="M6 20v-5" />
      <path d="M11 20V9" strokeDasharray="2 2.5" />
      <path d="M16 20v-8" strokeDasharray="2 2.5" />
      <path d="M21 20v-3" strokeDasharray="2 2.5" />
    </Govde>
  )
}

/** Rapor sayfalarındaki "PDF olarak kaydet" butonunda kullanılır. */
export function IndirIkon(ozellikler: IkonOzellikleri) {
  return (
    <Govde {...ozellikler}>
      <path d="M12 3v12" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
      <path d="M4 17.5V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5" />
    </Govde>
  )
}

/** Yayınlanmayan portföy — kilitli kart ve rozet. */
export function KilitIkon(ozellikler: IkonOzellikleri) {
  return (
    <Govde {...ozellikler}>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </Govde>
  )
}

/** Yetki süresi — "N gün sonra bitiyor" rozeti. */
export function SaatIkon(ozellikler: IkonOzellikleri) {
  return (
    <Govde {...ozellikler}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.5l3.5 2" />
    </Govde>
  )
}

/**
 * Uyarı.
 *
 * ⚠️ WCAG 1.4.1: renk tek başına bilgi taşımaz. Kehribar bir zemin
 * gördüğünde "uyarı" anlayan göz, renk körlüğünde aynı şeyi anlamaz —
 * ikon o boşluğu doldurur.
 */
export function UyariIkon(ozellikler: IkonOzellikleri) {
  return (
    <Govde {...ozellikler}>
      <path d="M10.3 3.9 2.4 17.2A2 2 0 0 0 4.1 20.2h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </Govde>
  )
}

/** Dış bağlantı — altbilgideki resmî kaynaklarda zorunlu. */
export function DisBaglantiIkon(ozellikler: IkonOzellikleri) {
  return (
    <Govde {...ozellikler}>
      <path d="M14 4h6v6" />
      <path d="m20 4-8.5 8.5" />
      <path d="M18 14v5a1.8 1.8 0 0 1-1.8 1.8H5A1.8 1.8 0 0 1 3.2 19V7.8A1.8 1.8 0 0 1 5 6h5" />
    </Govde>
  )
}

/** Yatay kaydırma okları. `yon` ile sağ/sol seçilir. */
export function ChevronIkon({
  yon = 'sag',
  ...ozellikler
}: IkonOzellikleri & { yon?: 'sol' | 'sag' }) {
  return (
    <Govde {...ozellikler}>
      {yon === 'sag' ? <path d="m9 5 7 7-7 7" /> : <path d="m15 5-7 7 7 7" />}
    </Govde>
  )
}

/**
 * Trend yönü — artış/azalış.
 *
 * Değişim değerinin yanında zorunludur: yeşil/kırmızı ayrımı tek başına
 * bırakılırsa renk körü bir yatırımcı için sayının işareti kaybolur.
 */
export function TrendIkon({ yon, ...ozellikler }: IkonOzellikleri & { yon: 'yukari' | 'asagi' }) {
  return (
    <Govde {...ozellikler}>
      {yon === 'yukari' ? (
        <>
          <path d="m4 16 6-6 4 4 6-7" />
          <path d="M15 7h5v5" />
        </>
      ) : (
        <>
          <path d="m4 8 6 6 4-4 6 7" />
          <path d="M15 17h5v-5" />
        </>
      )}
    </Govde>
  )
}

/** Harita katman paneli. */
export function KatmanIkon(ozellikler: IkonOzellikleri) {
  return (
    <Govde {...ozellikler}>
      <path d="m12 3 9 4.5-9 4.5-9-4.5z" />
      <path d="m3 12.5 9 4.5 9-4.5" />
    </Govde>
  )
}

/** Fotoğraf sayacı — ilan kartı rozetinde. */
export function FotografIkon(ozellikler: IkonOzellikleri) {
  return (
    <Govde {...ozellikler}>
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <circle cx="12" cy="13" r="3.2" />
      <path d="M8 6l1.4-2h5.2L16 6" />
    </Govde>
  )
}

/** 360° tur rozeti. */
export function TurIkon(ozellikler: IkonOzellikleri) {
  return (
    <Govde {...ozellikler}>
      <ellipse cx="12" cy="12" rx="9" ry="4" />
      <path d="M8.5 15.5 12 21l3.5-5.5" />
    </Govde>
  )
}

export function MenuIkon(ozellikler: IkonOzellikleri) {
  return (
    <Govde {...ozellikler}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Govde>
  )
}

export function KapatIkon(ozellikler: IkonOzellikleri) {
  return (
    <Govde {...ozellikler}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Govde>
  )
}

/** Arama — hero widget'ının gönder butonunda. */
export function AraIkon(ozellikler: IkonOzellikleri) {
  return (
    <Govde {...ozellikler}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Govde>
  )
}
