import 'server-only'

import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import config from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

/**
 * Sayfa içeriklerinin okunması.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ HATA DURUMUNDA BOŞ DÖNÜYOR, İSTİSNA FIRLATMIYOR.
 *
 * İçerik bir SÜSLEME: sayfanın asıl işlevi (form, liste, hesaplayıcı)
 * globalden bağımsız. Bir okuma hatası yüzünden 500 vermek, düzenlenebilir
 * yaptık diye siteyi kırılgan hâle getirmek olurdu.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * `cache()` ile istek başına tek sorgu: aynı render'da hem başlık hem
 * gövde bu bilgiyi soruyor.
 */

export interface IcerikGorseli {
  url: string
  alt: string
  aciklama: string | null
  en: number | null
  boy: number | null
}

export interface SayfaIcerigi {
  baslik: string | null
  altBaslik: string | null
  icerik: SerializedEditorState | null
  gorseller: IcerikGorseli[]
}

export const BOS_SAYFA: SayfaIcerigi = {
  baslik: null,
  altBaslik: null,
  icerik: null,
  gorseller: [],
}

function metin(deger: unknown): string | null {
  if (typeof deger !== 'string') return null
  const kirpilmis = deger.trim()
  return kirpilmis === '' ? null : kirpilmis
}

/**
 * Zengin metin gerçekten yazı içeriyor mu?
 *
 * ⚠️ BOŞ BİR ALAN "DOLU" GÖRÜNEBİLİYOR: lexical hiç yazı yazılmasa da tek
 * boş paragraflı bir kök döndürüyor. Öyle bir değeri içerik saymak, boş
 * bırakılan her sayfada boşluk çizmeye yol açardı — tam da kaçındığımız şey.
 *
 * Aynı denetim `lib/veri/hakkimizda.ts` içinde de var; oradaki sayfa bu
 * globalin dışında kaldığı için ikisi ayrı duruyor.
 */
export function doluIcerik(deger: unknown): SerializedEditorState | null {
  if (deger === null || typeof deger !== 'object') return null

  const kok = (deger as { root?: { children?: unknown[] } }).root
  if (!kok || !Array.isArray(kok.children) || kok.children.length === 0) return null

  const yaziVar = JSON.stringify(kok.children)
    .replace(/"[a-zA-Z]+":/g, '')
    .match(/[^\s"{}[\],:0-9]/)
  return yaziVar ? (deger as SerializedEditorState) : null
}

function gorseliCoz(ham: unknown, aciklama?: unknown): IcerikGorseli | null {
  if (ham === null || typeof ham !== 'object') return null
  const kayit = ham as { url?: unknown; alt?: unknown; width?: unknown; height?: unknown }
  if (typeof kayit.url !== 'string' || kayit.url === '') return null

  return {
    url: kayit.url,
    alt: typeof kayit.alt === 'string' ? kayit.alt : '',
    aciklama: metin(aciklama),
    en: typeof kayit.width === 'number' ? kayit.width : null,
    boy: typeof kayit.height === 'number' ? kayit.height : null,
  }
}

function gorselleriCoz(ham: unknown): IcerikGorseli[] {
  if (!Array.isArray(ham)) return []
  return ham
    .map((satir) => {
      const kayit = satir as { gorsel?: unknown; aciklama?: unknown }
      return gorseliCoz(kayit.gorsel, kayit.aciklama)
    })
    .filter((gorsel): gorsel is IcerikGorseli => gorsel !== null)
}

function sayfayiCoz(ham: unknown): SayfaIcerigi {
  if (ham === null || typeof ham !== 'object') return BOS_SAYFA
  const kayit = ham as Record<string, unknown>

  return {
    baslik: metin(kayit.baslik),
    altBaslik: metin(kayit.altBaslik),
    icerik: doluIcerik(kayit.icerik),
    gorseller: gorselleriCoz(kayit.gorseller),
  }
}

type SayfaAnahtari = 'iletisim' | 'degerleme' | 'araclar' | 'portfoy' | 'mahalleler'

const tumIcerikler = cache(async (): Promise<Record<string, unknown>> => {
  try {
    const payload = await getPayload({ config })
    return (await payload.findGlobal({
      slug: 'sayfa-icerikleri',
      depth: 1,
    })) as unknown as Record<string, unknown>
  } catch {
    return {}
  }
})

export async function sayfaIcerigi(anahtar: SayfaAnahtari): Promise<SayfaIcerigi> {
  return sayfayiCoz((await tumIcerikler())[anahtar])
}
