import type { Metadata, Viewport } from 'next'
import { Inter, Source_Serif_4 } from 'next/font/google'
import type React from 'react'

import { Analitik } from '@/components/analitik/Analitik'
import { CerezBanneri } from '@/components/cerez/CerezBanneri'
import { Altbilgi } from '@/components/duzen/Altbilgi'
import { Baslik, IcerigeAtla } from '@/components/duzen/Baslik'
import { kurumsalBilgileriGetir, whatsappNumarasi } from '@/lib/kurumsal'
import { cerezOnayiniOku } from '@/lib/kvkk/sunucu'
import { SITE_ACIKLAMASI, SITE_ADI, SITE_ADRESI } from '@/lib/site'

import './globals.css'

/**
 * Tipografi ikilisi:
 * - Inter — arayüz ve gövde. Rakam okunurluğu yüksek, tabular figürleri var.
 * - Source Serif 4 — başlıklar. Editoryal ağırlık katıyor ve siteyi
 *   "her yerdeki Inter sitesi" görünümünden ayırıyor.
 *
 * İkisi de `latin-ext` alt kümesiyle yükleniyor; Türkçe'nin ş, ğ, ı, İ
 * karakterleri temel `latin` kümesinde YOK. Eksik alt küme, yedek fontla
 * karışık bir metin ve gözle görülür bir düzen kayması üretir.
 *
 * `display: swap` + değişken font: FOIT yok, CLS düşük.
 */
const yaziArayuz = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--yazi-arayuz',
  display: 'swap',
})

const yaziBaslik = Source_Serif_4({
  subsets: ['latin', 'latin-ext'],
  variable: '--yazi-baslik',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ADRESI),
  title: {
    default: `${SITE_ADI} — Çorlu Gayrimenkul Danışmanlığı`,
    template: `%s | ${SITE_ADI}`,
  },
  description: SITE_ACIKLAMASI,
  applicationName: SITE_ADI,
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    siteName: SITE_ADI,
    url: SITE_ADRESI,
  },
  twitter: { card: 'summary_large_image' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Kullanıcının yakınlaştırmasını engellemek erişilebilirlik ihlalidir.
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfaf7' },
    { media: '(prefers-color-scheme: dark)', color: '#1b1d22' },
  ],
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [kurumsal, onay] = await Promise.all([kurumsalBilgileriGetir(), cerezOnayiniOku()])

  return (
    <html lang="tr" className={`${yaziArayuz.variable} ${yaziBaslik.variable}`}>
      <body className="flex min-h-dvh flex-col antialiased">
        <IcerigeAtla />
        <Baslik whatsapp={whatsappNumarasi(kurumsal)} />

        <main id="icerik" className="flex-1">
          {children}
        </main>

        <Altbilgi />

        <CerezBanneri onayVar={onay !== null} />
        {/* Onay yoksa bu bileşen hiçbir şey render etmez — betik HTML'e girmez. */}
        <Analitik />
      </body>
    </html>
  )
}
