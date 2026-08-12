import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import type React from 'react'

import { Analitik } from '@/components/analitik/Analitik'
import { CerezBanneri } from '@/components/cerez/CerezBanneri'
import { Altbilgi } from '@/components/duzen/Altbilgi'
import { Baslik, IcerigeAtla } from '@/components/duzen/Baslik'
import { UstSerit } from '@/components/duzen/UstSerit'
import { menuyuSuz, UST_MENU_YAPISI } from '@/lib/gezinme'
import { endeksSayfasiAcikMi } from '@/lib/veri/endeks'
import { bolumDurumlariniGetir } from '@/lib/veri/siteBolumleri'
import {
  iletisimEpostasi,
  iletisimTelefonu,
  kurumsalBilgileriGetir,
  whatsappNumarasi,
} from '@/lib/kurumsal'
import { cerezOnayiniOku } from '@/lib/kvkk/sunucu'
import { SITE_ACIKLAMASI, SITE_ADI, SITE_ADRESI } from '@/lib/site'

import './globals.css'

/**
 * Tipografi ikilisi:
 * - Inter — arayüz ve gövde. Rakam okunurluğu yüksek, tabular figürleri var.
 * - Source Serif 4 — başlıklar. Editoryal ağırlık katıyor ve siteyi
 *   "her yerdeki Inter sitesi" görünümünden ayırıyor.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ KENDİ BARINDIRDIĞIMIZ TÜRKÇE ALT KÜMELERİ — `next/font/google` DEĞİL.
 *
 * Google'ın hazır `latin` + `latin-ext` alt kümeleri iki aile için 226.684
 * bayt ediyordu: mobil sayfa ağırlığının %51'i ve mobil LCP'nin (3,8 sn)
 * baş sorumlusu. `latin-ext`ten bize lazım olan yalnızca beş harf —
 * İ ğ Ğ ş Ş. Gerisi Latin Extended-A/B, IPA fonetik alfabesi, Latin
 * Extended Additional; hiçbiri kullanılmıyor. (ç ö ü ı zaten `latin`de.)
 *
 * `next/font/google` özel alt küme üretemediği için dosyalar
 * `pnpm font:altkume` ile üretilip depoya konuyor. Karakter listesi
 * `src/lib/tipografi/alfabe.ts` — alfabeye göre kesildi, metne göre değil.
 * Gerekçe ve yükseltme yordamı: `src/fonts/OKUBENI.md`.
 *
 * ⚠️ `weight: '400 500'` bir DARALTMA DEĞİL, BEYANDIR.
 * Dosya hâlâ tam `wght` eksenini taşıyor (Google ekseni kırpmıyor). Burada
 * aralığı bildirmek, tasarım sisteminde olmayan bir ağırlık istendiğinde
 * tarayıcının sentetik kalınlaştırma yapmasını engelliyor — 500'e kırpıyor.
 *
 * `display: swap` + `adjustFontFallback`: FOIT yok, yedek fontla gerçek
 * font arasındaki ölçü farkı Next tarafından dengeleniyor, CLS 0 kalıyor.
 * ─────────────────────────────────────────────────────────────────────────
 */
const yaziArayuz = localFont({
  src: '../../fonts/inter-turkce.woff2',
  weight: '400 500',
  style: 'normal',
  variable: '--yazi-arayuz',
  display: 'swap',
  // ⚠️ Yedek zinciri: alt kümede olmayan bir karakter geldiğinde tarayıcı
  // "tofu" (boş kutu) yerine sistem fontuna düşsün. Alt küme 136 karakter
  // kapsıyor; CMS'ten emoji, Kiril ya da matematik simgesi gelirse bu
  // zincir devreye girer.
  fallback: ['system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
  adjustFontFallback: 'Arial',
})

const yaziBaslik = localFont({
  src: '../../fonts/source-serif-4-turkce.woff2',
  weight: '400 500',
  style: 'normal',
  variable: '--yazi-baslik',
  display: 'swap',
  // ⚠️ Source Serif 4'te `‑` (U+2011, bölünmez tire) YOK — fontun kendisinde
  // bulunmuyor, alt kümeyle ilgisi değil. Bir başlıkta geçerse buradaki
  // serif yedeğine düşer ve okunur kalır.
  fallback: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
  adjustFontFallback: 'Times New Roman',
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
  /**
   * Tarayıcı arayüz rengi (mobil adres çubuğu).
   *
   * ⚠️ Burada CSS değişkeni kullanılamıyor: `themeColor` HTML meta
   * etiketine somut renk yazar ve tarayıcı `var()` çözmez. Değerler
   * onaylanan paletin `zemin` jetonuyla birebir aynı — açık temada
   * notr-50, koyu temada lacivert-950. Palet değişirse burası da
   * güncellenmeli; kontrast testi bu iki değeri görmez.
   */
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8f7f3' },
    { media: '(prefers-color-scheme: dark)', color: '#0a1524' },
  ],
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [kurumsal, onay, bolumDurumlari] = await Promise.all([
    kurumsalBilgileriGetir(),
    cerezOnayiniOku(),
    bolumDurumlariniGetir(),
  ])

  /**
   * ⚠️ Menü SUNUCUDA süzülüyor.
   *
   * Bazı öğeler site bölümü anahtarına bağlı — örn. `/endeks` veri eşikleri
   * sağlanana kadar `notFound()` dönüyor. Süzmeyi istemciye bırakmak,
   * kapalı bir bağlantının ilk karede görünüp tıklanabilmesi demekti.
   */
  const acikAnahtarlar = new Set(
    Object.entries(bolumDurumlari)
      .filter(([, acik]) => acik)
      .map(([anahtar]) => anahtar),
  )

  /**
   * ⚠️ ENDEKS'İN İKİ KAPISI VAR — bölüm anahtarı tek başına YETMEZ.
   *
   * `/endeks` bölüm açık olsa bile veri eşikleri sağlanmadıysa 404 dönüyor
   * (CLAUDE.md 6c: katman başına en az 8 gözlem, en az 6 ay geçmiş).
   * Aşama 2'de bu gözden kaçtı: bölüm dev veritabanında açıktı, menüye
   * "Endeks" düştü ve bağlantı 404'e gidiyordu — duman testinde yakalandı.
   *
   * Karar sayfanınkiyle AYNI yardımcıdan geliyor (`endeksSayfasiAcikMi`),
   * iki yerde ayrı yazılmıyor.
   *
   * ⚠️ Sıra bilinçli: ucuz olan bölüm kontrolü önce. Endeks hesabı gözlem
   * okuyup seri üretiyor; bölüm kapalıyken onu her sayfa isteğinde
   * çalıştırmanın karşılığı yok.
   */
  if (acikAnahtarlar.has('endeks') && !(await endeksSayfasiAcikMi())) {
    acikAnahtarlar.delete('endeks')
  }

  const menu = menuyuSuz(UST_MENU_YAPISI, acikAnahtarlar)

  return (
    <html lang="tr" className={`${yaziArayuz.variable} ${yaziBaslik.variable}`}>
      <body className="flex min-h-dvh flex-col antialiased">
        <IcerigeAtla />
        <UstSerit
          telefon={iletisimTelefonu(kurumsal)}
          eposta={iletisimEpostasi(kurumsal)}
          whatsapp={whatsappNumarasi(kurumsal)}
        />
        <Baslik menu={menu} whatsapp={whatsappNumarasi(kurumsal)} />

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
