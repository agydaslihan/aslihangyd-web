import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

/**
 * /hakkimizda içeriğinin okunması.
 *
 * ⚠️ Hata durumunda BOŞ değerler dönüyor, istisna fırlatmıyor. Sayfa bir
 * global okunamadı diye 500 vermemeli: yasal bilgiler `KurumsalBilgiler`den
 * ayrıca geliyor ve onlar bu sayfanın asıl işlevi.
 */

export interface HakkimizdaGorseli {
  url: string
  alt: string
  aciklama: string | null
  en: number | null
  boy: number | null
}

export interface HakkimizdaIcerigi {
  girisMetni: string | null
  icerik: SerializedEditorState | null
  portre: HakkimizdaGorseli | null
  portreAltMetni: string | null
  ekGorseller: HakkimizdaGorseli[]
}

const BOS: HakkimizdaIcerigi = {
  girisMetni: null,
  icerik: null,
  portre: null,
  portreAltMetni: null,
  ekGorseller: [],
}

function metin(deger: unknown): string | null {
  if (typeof deger !== 'string') return null
  const kirpilmis = deger.trim()
  return kirpilmis === '' ? null : kirpilmis
}

function gorseliCoz(deger: unknown, aciklama: string | null): HakkimizdaGorseli | null {
  if (deger === null || typeof deger !== 'object') return null

  const kayit = deger as {
    url?: unknown
    alt?: unknown
    width?: unknown
    height?: unknown
  }

  if (typeof kayit.url !== 'string' || kayit.url === '') return null

  return {
    url: kayit.url,
    alt: typeof kayit.alt === 'string' ? kayit.alt : '',
    aciklama,
    en: typeof kayit.width === 'number' ? kayit.width : null,
    boy: typeof kayit.height === 'number' ? kayit.height : null,
  }
}

export async function hakkimizdaGetir(): Promise<HakkimizdaIcerigi> {
  try {
    const payload = await getPayload({ config })
    const kayit = (await payload.findGlobal({ slug: 'hakkimizda', depth: 1 })) as unknown as {
      girisMetni?: unknown
      icerik?: unknown
      portre?: unknown
      portreAltMetni?: unknown
      ekGorseller?: { gorsel?: unknown; aciklama?: unknown }[]
    }

    /**
     * ⚠️ Boş bir zengin metin alanı "dolu" görünebilir: lexical, hiç yazı
     * yazılmasa da tek boş paragraflı bir kök döndürüyor. Öyle bir değeri
     * içerik saymak, boş durumun hiç görünmemesine yol açardı.
     */
    const icerik = doluIcerik(kayit.icerik)

    return {
      girisMetni: metin(kayit.girisMetni),
      icerik,
      portre: gorseliCoz(kayit.portre, null),
      portreAltMetni: metin(kayit.portreAltMetni),
      ekGorseller: (kayit.ekGorseller ?? [])
        .map((oge) => gorseliCoz(oge.gorsel, metin(oge.aciklama)))
        .filter((oge): oge is HakkimizdaGorseli => oge !== null),
    }
  } catch {
    return BOS
  }
}

/** Zengin metin gerçekten yazı içeriyor mu? */
function doluIcerik(deger: unknown): SerializedEditorState | null {
  if (deger === null || typeof deger !== 'object') return null

  const kok = (deger as { root?: { children?: unknown[] } }).root
  if (!kok || !Array.isArray(kok.children) || kok.children.length === 0) return null

  const yaziVar = JSON.stringify(kok.children)
    .replace(/"[a-zA-Z]+":/g, '')
    .match(/[^\s"{}[\],:0-9]/)
  return yaziVar ? (deger as SerializedEditorState) : null
}
