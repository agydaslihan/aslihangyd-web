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
  /** Portrenin biçimi — panelden, sınırlı seçeneklerle. */
  portreBicimi: PortreBicimi
}

/**
 * ⚠️ DEĞER KÜMELERİ KAPALI. Serbest bir oran ya da yarıçap, ilk yanlış
 * değerde sayfayı tasarım sisteminin dışına çıkarırdı.
 *
 * ⚠️ "Otomatik oran" seçeneği bilinçli olarak YOK: dosyanın kendi oranına
 * bırakmak, farklı oranlarda yüklenen iki fotoğrafta düzeni zıplatır ve
 * CLS'i ölçülemez hâle getirir.
 */
export const PORTRE_ORANLARI = ['1:1', '3:4', '4:3', '16:9'] as const
export const PORTRE_YARICAPLARI = ['yok', 'orta', 'buyuk'] as const
export const PORTRE_HIZALAMALARI = ['sol', 'orta', 'sag'] as const

export interface PortreBicimi {
  oran: (typeof PORTRE_ORANLARI)[number]
  yaricap: (typeof PORTRE_YARICAPLARI)[number]
  kenarlik: boolean
  hizalama: (typeof PORTRE_HIZALAMALARI)[number]
}

export const VARSAYILAN_PORTRE_BICIMI: PortreBicimi = {
  oran: '3:4',
  yaricap: 'buyuk',
  kenarlik: false,
  hizalama: 'sol',
}

const BOS: HakkimizdaIcerigi = {
  girisMetni: null,
  icerik: null,
  portre: null,
  portreAltMetni: null,
  ekGorseller: [],
  portreBicimi: VARSAYILAN_PORTRE_BICIMI,
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

function secim<T extends string>(deger: unknown, kume: readonly T[], varsayilan: T): T {
  return typeof deger === 'string' && (kume as readonly string[]).includes(deger)
    ? (deger as T)
    : varsayilan
}

export async function hakkimizdaGetir(): Promise<HakkimizdaIcerigi> {
  try {
    const payload = await getPayload({ config })
    const kayit = (await payload.findGlobal({ slug: 'hakkimizda', depth: 1 })) as unknown as {
      girisMetni?: unknown
      icerik?: unknown
      portre?: unknown
      portreAltMetni?: unknown
      portreOrani?: unknown
      portreYaricapi?: unknown
      portreKenarligi?: unknown
      portreHizalamasi?: unknown
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
      /**
       * ⚠️ Tanınmayan değer varsayılana düşüyor. Panel seçenekleri
       * daraltılırsa eski kayıtlar sayfayı kırmamalı.
       */
      portreBicimi: {
        oran: secim(kayit.portreOrani, PORTRE_ORANLARI, VARSAYILAN_PORTRE_BICIMI.oran),
        yaricap: secim(kayit.portreYaricapi, PORTRE_YARICAPLARI, VARSAYILAN_PORTRE_BICIMI.yaricap),
        kenarlik: kayit.portreKenarligi === true,
        hizalama: secim(
          kayit.portreHizalamasi,
          PORTRE_HIZALAMALARI,
          VARSAYILAN_PORTRE_BICIMI.hizalama,
        ),
      },
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
