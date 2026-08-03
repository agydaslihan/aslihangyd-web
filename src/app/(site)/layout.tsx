import type { Metadata, Viewport } from 'next'
import type React from 'react'

import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Aslıhan GYD — Çorlu Gayrimenkul Danışmanlığı',
    template: '%s | Aslıhan GYD',
  },
  description:
    'Çorlu (Tekirdağ) odaklı gayrimenkul danışmanlığı ve yatırım analizi. Mahalle verileri, yatırım skoru ve hesaplayıcılarla veriye dayalı karar desteği.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  )
}
