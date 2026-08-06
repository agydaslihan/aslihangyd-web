import 'server-only'

import { HERKESE_ACIK_DURUMLAR } from '@/lib/eids'
import {
  olcutTanimi,
  olcutUygula,
  tekrarlariAyikla,
  type BolumOlcutu,
} from '@/lib/portfoy/bolumler'
import type { Ilanlar } from '@/payload-types'

import { gizliPortfoyuGetir, type GizliKayit } from './gizliPortfoy'
import { payloadGetir, ZIYARETCI } from './istemci'

/**
 * Portföy tema sıralarını kurar.
 *
 * Ölçütler `src/lib/portfoy/bolumler.ts` içinde (saf ve testli); burada
 * yalnızca veri çekilir ve ölçütler uygulanır.
 */

/** Sıradaki tek bir kart: ya yayındaki ilan ya da kilitli kayıt. */
export type SiraOgesiVerisi =
  | { tip: 'ilan'; anahtar: string; ilan: Ilanlar }
  | { tip: 'kilitli'; anahtar: string; kayit: GizliKayit }

export interface TemaSirasi {
  anahtar: string
  baslik: string
  altBaslik: string
  kilitli: boolean
  ogeler: SiraOgesiVerisi[]
  /** Sıra boşsa sebebi — boş bir şerit göstermek yerine bu yazılır. */
  bosSebebi: string | null
}

/**
 * Yayınlanan sıralara kaç kilitli kart karıştırılır.
 *
 * ⚠️ Kilitli kartlar yalnızca kendi bölümlerinde dursaydı merak da o
 * bölümde kalırdı. Asıl etki, ziyaretçi normal ilanları tararken aralarına
 * karışmasından geliyor: "bir dakika, bu neden kapalı?"
 *
 * İki taneyle sınırlı ve ikinci karttan sonra giriyorlar. Fazlası sırayı
 * bir teaser duvarına çevirir ve yayındaki portföyü değersizleştirir.
 */
const ARAYA_GIREN_KILITLI = 2
const ARAYA_GIRME_KONUMU = 2

/**
 * CMS'te hiç sıra tanımlanmamışsa kullanılacak düzen.
 *
 * ⚠️ Varsayılan boş bir sayfa DEĞİL. Aslıhan panele hiç girmeden de
 * portföy sayfası anlamlı çalışmalı; ayarların amacı düzeni değiştirmek,
 * sayfayı var etmek değil.
 */
const VARSAYILAN_SIRALAR: readonly { olcut: BolumOlcutu; adet: number }[] = [
  { olcut: 'yatirimGetirisi', adet: 8 },
  { olcut: 'yeniEklenenler', adet: 8 },
  { olcut: 'gizliPortfoy', adet: 8 },
  { olcut: 'ticariSanayi', adet: 8 },
]

interface AyarSirasi {
  olcut: BolumOlcutu
  adet: number
  baslik: string | null
  altBaslik: string | null
}

async function ayarlariOku(): Promise<AyarSirasi[]> {
  try {
    const payload = await payloadGetir()
    const ayarlar = await payload.findGlobal({ slug: 'portfoy-bolumleri', ...ZIYARETCI })

    const siralar = (ayarlar.siralar ?? [])
      .filter((sira) => sira.aktif !== false)
      .map((sira) => ({
        olcut: sira.olcut as BolumOlcutu,
        adet: typeof sira.adet === 'number' && sira.adet > 0 ? Math.round(sira.adet) : 8,
        baslik: sira.baslik?.trim() || null,
        altBaslik: sira.altBaslik?.trim() || null,
      }))

    if (siralar.length > 0) return siralar
  } catch {
    // Global henüz oluşturulmamışsa varsayılana düşülür.
  }

  return VARSAYILAN_SIRALAR.map((sira) => ({ ...sira, baslik: null, altBaslik: null }))
}

/**
 * Sıraların ilan havuzu.
 *
 * Tek sorguyla çekilip bellekte süzülüyor: dört ayrı sorgu atmak hem
 * daha yavaş hem de ortalama kira çarpanını yine tüm portföyden hesaplamak
 * gerektiği için kaçınılmaz olarak beşinci bir sorgu doğururdu. Portföy
 * ölçeği (yüzlerce ilan) bunu rahatça kaldırıyor.
 */
const HAVUZ_SINIRI = 200

async function havuzuGetir(): Promise<Ilanlar[]> {
  try {
    const payload = await payloadGetir()
    const sonuc = await payload.find({
      collection: 'ilanlar',
      where: {
        and: [
          { durum: { in: [...HERKESE_ACIK_DURUMLAR] } },
          { gizliPortfoy: { not_equals: true } },
        ],
      },
      sort: '-createdAt',
      limit: HAVUZ_SINIRI,
      depth: 1,
      ...ZIYARETCI,
    })
    return sonuc.docs
  } catch {
    return []
  }
}

export async function temaSiralariniGetir(): Promise<TemaSirasi[]> {
  const [ayarlar, havuz, gizli] = await Promise.all([
    ayarlariOku(),
    havuzuGetir(),
    gizliPortfoyuGetir(),
  ])

  /**
   * Araya karıştırılacak kilitli kayıtlar baştan ayrılır; kendi bölümleri
   * bunları atlar. Aynı taşınmaz iki kez görünmemeli.
   */
  const kilitliBolumVar = ayarlar.some((ayar) => olcutTanimi(ayar.olcut).kilitli)
  const karistirilan = kilitliBolumVar ? Math.min(ARAYA_GIREN_KILITLI, gizli.length) : 0
  const karistirilanlar = gizli.slice(0, karistirilan)

  const olcutGirdileri = havuz.map((ilan) => ({
    id: ilan.id,
    kategori: ilan.kategori,
    kiraCarpani: ilan.kiraCarpani ?? null,
    createdAt: ilan.createdAt,
  }))

  const siralar: TemaSirasi[] = ayarlar.map((ayar, sira) => {
    const tanim = olcutTanimi(ayar.olcut)

    if (tanim.kilitli) {
      // Araya karışanlar burada tekrarlanmasın diye baştan atlanır.
      const kalanlar = gizli.slice(karistirilan).slice(0, ayar.adet)

      return {
        // Aynı ölçüt birden fazla kez eklenebilir; anahtar sıraya bağlanıyor.
        anahtar: `${ayar.olcut}-${sira}`,
        baslik: ayar.baslik ?? tanim.varsayilanBaslik,
        altBaslik: ayar.altBaslik ?? tanim.varsayilanAltBaslik,
        kilitli: true,
        ogeler: kalanlar.map((kayit) => ({
          tip: 'kilitli' as const,
          anahtar: `kilitli-${kayit.id}`,
          kayit,
        })),
        bosSebebi:
          gizli.length === 0
            ? 'Şu an yayınlanmayan portföyde taşınmaz yok.'
            : kalanlar.length === 0
              ? 'Yayınlanmayan portföydeki taşınmazların hepsi yukarıdaki sıralarda görünüyor.'
              : null,
      }
    }

    const sonuc = olcutUygula(
      ayar.olcut,
      havuz.map((ilan) => ({
        id: ilan.id,
        kategori: ilan.kategori,
        kiraCarpani: ilan.kiraCarpani ?? null,
        createdAt: ilan.createdAt,
        kayit: ilan,
      })),
      olcutGirdileri,
      ayar.adet,
    )

    return {
      anahtar: `${ayar.olcut}-${sira}`,
      baslik: ayar.baslik ?? tanim.varsayilanBaslik,
      altBaslik: ayar.altBaslik ?? tanim.varsayilanAltBaslik,
      kilitli: false,
      ogeler: sonuc.ilanlar.map((secilen) => ({
        tip: 'ilan' as const,
        anahtar: `ilan-${secilen.id}`,
        ilan: secilen.kayit,
      })),
      bosSebebi: sonuc.bosSebebi,
    }
  })

  /**
   * ⚠️ Tekrar ayıklama, sıralar kurulduktan SONRA yapılır ve tanımlı
   * düzeni izler: yukarıdaki sıra ilanı kapar. Kilitli kayıtlar ayrı bir
   * havuzdan (gizli portföy) geldiği için ayrı ele alınır.
   */
  const ilanSiralari = siralar
    .filter((sira) => !sira.kilitli)
    .map((sira) => ({
      ilanlar: sira.ogeler.flatMap((oge) => (oge.tip === 'ilan' ? [{ id: oge.ilan.id, oge }] : [])),
      hedef: sira,
    }))

  tekrarlariAyikla(ilanSiralari)
  for (const { ilanlar, hedef } of ilanSiralari) {
    hedef.ogeler = ilanlar.map(({ oge }) => oge)
  }

  // Kilitli kartları ilk dolu yayın sırasına karıştır.
  const ilkDolu = siralar.find((sira) => !sira.kilitli && sira.ogeler.length > 0)
  if (ilkDolu !== undefined && karistirilanlar.length > 0) {
    ilkDolu.ogeler.splice(
      Math.min(ARAYA_GIRME_KONUMU, ilkDolu.ogeler.length),
      0,
      ...karistirilanlar.map((kayit) => ({
        tip: 'kilitli' as const,
        anahtar: `kilitli-${kayit.id}`,
        kayit,
      })),
    )
  }

  return siralar
}
