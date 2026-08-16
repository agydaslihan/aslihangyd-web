import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import { AZAMI_OVERLAY, ASGARI_OVERLAY, type HeroAyarlari, type HeroSlayti } from './tipler'

/**
 * Hero slaytlarının okunması.
 *
 * ⚠️ Hata durumunda BOŞ liste dönüyor, istisna fırlatmıyor. Ana sayfa,
 * bir slider yüzünden açılmamazlık edemez: slayt yoksa mevcut metin
 * hero'su devreye giriyor.
 */

interface HamSlayt {
  gorsel?: unknown
  baslik?: unknown
  altBaslik?: unknown
  butonMetni?: unknown
  butonLink?: unknown
  metinHizasi?: unknown
  overlayKoyulugu?: unknown
  aktif?: unknown
  id?: unknown
}

function metin(deger: unknown): string | null {
  if (typeof deger !== 'string') return null
  const kirpilmis = deger.trim()
  return kirpilmis === '' ? null : kirpilmis
}

function slaytiCoz(ham: HamSlayt, sira: number): HeroSlayti | null {
  if (ham.aktif === false) return null

  const gorsel = ham.gorsel as
    { url?: unknown; alt?: unknown; width?: unknown; height?: unknown } | null | undefined

  const url = typeof gorsel?.url === 'string' ? gorsel.url : null
  const baslik = metin(ham.baslik)

  // ⚠️ Görselsiz ya da başlıksız slayt ATLANIR, yarım çizilmez. Yarım bir
  // hero, olmayan bir hero'dan kötü görünür.
  if (url === null || baslik === null) return null

  const overlayHam = typeof ham.overlayKoyulugu === 'number' ? ham.overlayKoyulugu : 45

  return {
    anahtar: typeof ham.id === 'string' || typeof ham.id === 'number' ? String(ham.id) : `s${sira}`,
    gorselUrl: url,
    gorselAlt: typeof gorsel?.alt === 'string' ? gorsel.alt : '',
    gorselEn: typeof gorsel?.width === 'number' ? gorsel.width : null,
    gorselBoy: typeof gorsel?.height === 'number' ? gorsel.height : null,
    baslik,
    altBaslik: metin(ham.altBaslik),
    butonMetni: metin(ham.butonMetni),
    butonLink: metin(ham.butonLink),
    metinHizasi: ham.metinHizasi === 'orta' ? 'orta' : 'sol',
    overlayKoyulugu: Math.min(AZAMI_OVERLAY, Math.max(ASGARI_OVERLAY, overlayHam)),
  }
}

export async function heroAyarlari(): Promise<HeroAyarlari> {
  const bos: HeroAyarlari = { slaytlar: [], otomatikGecis: false, gecisSuresiMs: 7_000 }

  try {
    const payload = await getPayload({ config })
    const kayit = (await payload.findGlobal({ slug: 'hero-slider', depth: 1 })) as unknown as {
      slaytlar?: HamSlayt[]
      otomatikGecis?: unknown
      gecisSuresi?: unknown
    }

    const slaytlar = (kayit.slaytlar ?? [])
      .map((ham, sira) => slaytiCoz(ham, sira))
      .filter((slayt): slayt is HeroSlayti => slayt !== null)

    const saniye = typeof kayit.gecisSuresi === 'number' ? kayit.gecisSuresi : 7

    return {
      slaytlar,
      otomatikGecis: kayit.otomatikGecis === true,
      gecisSuresiMs: Math.max(4, Math.min(30, saniye)) * 1_000,
    }
  } catch {
    return bos
  }
}
