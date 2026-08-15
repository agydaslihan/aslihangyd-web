import { IKON_ONBELLEK_SANIYE } from '@/lib/marka/ikonlar'
import { markaAyarlari } from '@/lib/marka/sunucu'
import { SITE_ACIKLAMASI, SITE_ADI } from '@/lib/site'

/**
 * Web uygulaması manifesti.
 *
 * ⚠️ Rota olarak yazıldı, statik dosya olarak değil: ad, renk ve ikonlar
 * marka panelinden geliyor. Statik bir `manifest.json` derleme anında
 * donardı — `NEXT_PUBLIC_*` tuzağının aynısı.
 */
export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  const marka = await markaAyarlari()
  const ad = marka.siteAdi ?? SITE_ADI

  const manifest = {
    name: ad,
    short_name: ad,
    description: marka.slogan ?? SITE_ACIKLAMASI,
    start_url: '/',
    display: 'standalone',
    lang: 'tr',
    dir: 'ltr',
    background_color: marka.acik.zemin,
    theme_color: marka.acik.zemin,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  }

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': `public, max-age=${IKON_ONBELLEK_SANIYE}, stale-while-revalidate=86400`,
    },
  })
}
