import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'

import { govdeFontuAdresi } from '@/lib/yazi/onyukleme'
import type React from 'react'

import { Analitik } from '@/components/analitik/Analitik'
import { KatmanB } from '@/components/olcum/KatmanB'
import { CerezBanneri } from '@/components/cerez/CerezBanneri'
import { Altbilgi } from '@/components/duzen/Altbilgi'
import { Baslik, IcerigeAtla } from '@/components/duzen/Baslik'
import { UstSerit } from '@/components/duzen/UstSerit'
import { endeksMenudeGorunurMu, menuyuSirala, menuyuSuz, UST_MENU_YAPISI } from '@/lib/gezinme'
import { endeksSayfasiAcikMi } from '@/lib/veri/endeks'
import { menuSirasiniGetir } from '@/lib/veri/menuDuzeni'
import { bolumDurumlariniGetir } from '@/lib/veri/siteBolumleri'
import {
  iletisimEpostasi,
  iletisimTelefonu,
  kurumsalBilgileriGetir,
  whatsappNumarasi,
} from '@/lib/kurumsal'
import { cerezOnayiniOku } from '@/lib/kvkk/sunucu'
import { markaAyarlari, paletCss } from '@/lib/marka/sunucu'
import { SITE_ACIKLAMASI, SITE_ADI, SITE_ADRESI } from '@/lib/site'

import './globals.css'

/**
 * Tipografi ikilisi:
 * - Plus Jakarta Sans — arayüz ve gövde. 17px'de açık harf boşluğu,
 *   yüksek x-yüksekliği; tabular figürleri var.
 * - Manrope — başlıklar. 72px'de dar ve geometrik duruyor; Aurora'nın
 *   oversized başlık ölçeğini taşıyan aile bu.
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
/**
 * ⚠️ GÖVDE FONTU PLUS JAKARTA SANS, BAŞLIK FONTU MANROPE.
 *
 * Şartname "birincil Manrope, ikincil Plus Jakarta Sans" diyor ama hangi
 * ailenin hangi işi yapacağını söylemiyor. Karar ölçüye göre verildi:
 * Manrope'un dar ve geometrik büyük puntoları 72px'de karakter taşıyor,
 * Plus Jakarta Sans ise 17px gövdede daha okunur (daha açık harf boşluğu,
 * daha yüksek x-yüksekliği). Ters kurulum başlığı sıradanlaştırır.
 *
 * ⚠️ İkisi de SANS — hiyerarşi biçimden değil ölçekten geliyor.
 */
const yaziGovde = localFont({
  src: '../../fonts/plus-jakarta-sans-turkce.woff2',
  weight: '400 500',
  style: 'normal',
  variable: '--yazi-govde',
  display: 'swap',
  // ⚠️ Yedek zinciri: alt kümede olmayan bir karakter geldiğinde tarayıcı
  // "tofu" (boş kutu) yerine sistem fontuna düşsün. CMS'ten emoji, Kiril
  // ya da matematik simgesi gelirse bu zincir devreye girer.
  fallback: ['system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
  adjustFontFallback: 'Arial',
})

const yaziBaslik = localFont({
  src: '../../fonts/manrope-turkce.woff2',
  weight: '400 500',
  style: 'normal',
  variable: '--yazi-baslik',
  display: 'swap',
  fallback: ['system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
  adjustFontFallback: 'Arial',
})

/**
 * ⚠️ `metadata` SABİT DEĞİL, `generateMetadata` — MARKA PANELİ İÇİN ŞART.
 *
 * Site adı, slogan ve paylaşım görseli artık veritabanından geliyor. Sabit
 * bir `metadata` nesnesi modül yüklenirken bir kez değerlendirilir; panelden
 * değiştirilen bir ad orada asla görünmezdi.
 *
 * ⚠️ İkonlar da buradan bildiriliyor. Rotalar her zaman bir görsel
 * döndürüyor (simge yüklenmemişse monogram üretiliyor), bu yüzden
 * `favicon.ico` koşulsuz duruyor — 404 dönen bir favicon Lighthouse'un
 * Best Practices puanını düşürüyordu.
 */
export async function generateMetadata(): Promise<Metadata> {
  const marka = await markaAyarlari()
  const ad = marka.siteAdi ?? SITE_ADI
  const aciklama = marka.slogan ?? SITE_ACIKLAMASI

  return {
    metadataBase: new URL(SITE_ADRESI),
    title: {
      default: `${ad} — Çorlu Gayrimenkul Danışmanlığı`,
      template: `%s | ${ad}`,
    },
    description: aciklama,
    applicationName: ad,
    manifest: '/manifest.webmanifest',
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: '32x32' },
        { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
        { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
      ],
      apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    },
    openGraph: {
      type: 'website',
      locale: 'tr_TR',
      siteName: ad,
      url: SITE_ADRESI,
      ...(marka.ogGorseli
        ? {
            images: [
              {
                url: marka.ogGorseli.url,
                width: marka.ogGorseli.en ?? undefined,
                height: marka.ogGorseli.boy ?? undefined,
              },
            ],
          }
        : {}),
    },
    twitter: { card: 'summary_large_image' },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
    },
  }
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
   * etiketine somut renk yazar ve tarayıcı `var()` çözmez.
   *
   * ⚠️ PALET DEĞİŞİNCE BURASI GERİDE KALDI VE KİMSE GÖRMEDİ.
   *
   * Yeniden tasarımda tüm palet değişti ama bu iki değer eski paletten
   * (`#f8f7f3` / `#0a1524`) kaldı; mobil adres çubuğu haftalarca eski
   * lacivertle boyandı. Kontrast testi jetonları okuyor, bu meta etiketini
   * görmüyordu.
   *
   * ⚠️ Bohem palete geçerken ikisi de yeniden yazıldı: kırık beyaz
   * #FCFBF8 ve mürekkep #1C1C1C. Testi olmasaydı aynı hata ikinci kez
   * olurdu — palet değişikliği bu dosyayı hiç açtırmıyor.
   *
   * Artık `disiplin.test.ts` bu iki değerin `--color-notr-50` ve
   * `--color-notr-900` ile birebir aynı olduğunu denetliyor.
   */
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fcfbf8' },
    { media: '(prefers-color-scheme: dark)', color: '#1c1c1c' },
  ],
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [kurumsal, onay, bolumDurumlari, marka] = await Promise.all([
    kurumsalBilgileriGetir(),
    cerezOnayiniOku(),
    bolumDurumlariniGetir(),
    markaAyarlari(),
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
  if (acikAnahtarlar.has('endeks') && !endeksMenudeGorunurMu(true, await endeksSayfasiAcikMi())) {
    acikAnahtarlar.delete('endeks')
  }

  /**
   * ⚠️ ÖNCE SÜZ, SONRA DİZ.
   *
   * Sıralama listesi kapalı bölümlerin anahtarlarını da taşıyor (panelde
   * duruyorlar; kapalı olmak listeden silinmek değil). Ters sırada
   * çalıştırılsaydı sonuç aynı görünürdü ama kapalı öğeler için boşuna
   * iş yapılırdı — ve daha kötüsü, "listede yoksa sona ekle" kuralı
   * kapalı bir öğeyi menüye geri koyabilirdi.
   */
  const menu = menuyuSirala(menuyuSuz(UST_MENU_YAPISI, acikAnahtarlar), await menuSirasiniGetir())

  return (
    <html lang="tr" className={`${yaziGovde.variable} ${yaziBaslik.variable}`}>
      <head>
        {/*
          ⚠️ GÖVDE FONTU ÖN YÜKLEMESİ — NEXT'İN BASMADIĞI `<link>`.

          Next fontu ön yüklemeye çalışıyor ama `<link>`i HTML `<head>`ine
          değil RSC akışına bir ipucu olarak yazıyor (`:HL[…,"font",…]`), yani
          istek ancak paket inip akış ayrıştırıldıktan sonra başlıyor. Ölçüm
          ve tam gerekçe `lib/yazi/onyukleme.ts` içinde.

          ⚠️ `crossOrigin` ŞART: font ön yüklemesi CORS modunda yapılır;
          öznitelik olmadan tarayıcı dosyayı İKİ KEZ indirir (biri ön yükleme,
          biri `@font-face`) ve ön yükleme kazanç yerine kayıp olur.

          ⚠️ Adres yoksa hiçbir şey basılmıyor. Ön yükleme bir iyileştirme,
          varlık şartı değil.
        */}
        {govdeFontuAdresi() !== null ? (
          <link
            rel="preload"
            as="font"
            type="font/woff2"
            href={govdeFontuAdresi() ?? ''}
            crossOrigin="anonymous"
          />
        ) : null}

        {/*
          ⚠️ TİTREME ÖNLEYİCİ — paint'ten ÖNCE çalışmak zorunda.

          Tema tercihi `localStorage`'da (çerezde değil: çerez sunucuya
          gider ve KVKK kapsamında bir tercih çerezi olurdu). Sunucu bu
          yüzden tercihi bilmiyor ve HTML'i daima açık temayla üretiyor.

          Bu satır olmasaydı koyu tema seçen kullanıcı her sayfa
          geçişinde bir kare beyaz ekran görürdü. `beforeInteractive`
          değil ham `<script>`: Next'in script stratejileri bile
          yeterince erken değil, öznitelik ilk boyamadan önce yazılmalı.

          `try/catch` gerekli: gizli sekmede `localStorage` erişimi
          bazı tarayıcılarda istisna fırlatıyor ve o istisna sayfanın
          tamamını durdururdu.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('aslihangyd-tema')==='koyu')" +
              "document.documentElement.setAttribute('data-tema','koyu')}catch(e){}",
          }}
        />

        {/*
          ⚠️ MARKA RENKLERİ — ÇALIŞMA ZAMANINDA, SUNUCUDA BASILIYOR.

          `globals.css` derleme anında paketlenir. Renkleri oraya yazsaydık
          Aslıhan panelde rengi değiştirir, kaydeder ve HİÇBİR ŞEY OLMAZDI —
          `NEXT_PUBLIC_*` tuzağının aynısı. Burada palet veritabanından
          okunup jetonların üzerine yazılıyor.

          Sunucuda basılması FOUC'u da çözüyor: ilk boyamada doğru renkler
          yerinde, sonradan sıçrama yok. İstemcide bir efektle yazsaydık
          ziyaretçi bir kare varsayılan paleti görürdü.

          Değerler `#rrggbb` olarak süzülüyor (`paletCss`); buraya sızacak
          bir `</style>` enjeksiyon olurdu.
        */}
        <style
          id="marka-paleti"
          dangerouslySetInnerHTML={{ __html: paletCss(marka.acik, marka.koyu) }}
        />
      </head>
      <body className="flex min-h-dvh flex-col antialiased">
        <IcerigeAtla />
        <UstSerit
          telefon={iletisimTelefonu(kurumsal)}
          eposta={iletisimEpostasi(kurumsal)}
          whatsapp={whatsappNumarasi(kurumsal)}
        />
        <Baslik menu={menu} whatsapp={whatsappNumarasi(kurumsal)} marka={marka} />

        <main id="icerik" className="flex-1">
          {children}
        </main>

        <Altbilgi />

        <CerezBanneri onayVar={onay !== null} />
        {/* Onay yoksa bu bileşen hiçbir şey render etmez — betik HTML'e girmez. */}
        <Analitik />
        {/* Katman B ölçümü — onay yoksa kodu istemciye hiç inmiyor. */}
        <KatmanB />
      </body>
    </html>
  )
}
