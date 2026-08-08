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
import { MEDYA_POPULATE } from './medyaAlanlari'

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

/**
 * Kurulum sırasında kullanılan ara biçim.
 *
 * Ölçütler yalnızca kimlik seçer; tam belgeler tekrar ayıklama BİTTİKTEN
 * sonra tek sorguda çekilir. Erken çekmek, ayıklamayla düşecek kayıtların
 * ilişkilerini de boşuna çözmek olurdu.
 */
type AraOge =
  | { tip: 'kimlik'; anahtar: string; id: number }
  | { tip: 'kilitli'; anahtar: string; kayit: GizliKayit }

interface AraSira extends Omit<TemaSirasi, 'ogeler'> {
  ogeler: AraOge[]
}

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
 * Sıraların ilan havuzu — İKİ AŞAMALI.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ İlk sürüm 200 ilanı `depth: 1` ile çekiyordu ve bunların ~32'sini
 * gösteriyordu. Ölçüm (docs/ILERLEME.md):
 *
 *   · Sorgu sayısı 6 / 50 / 200 kayıtta SABİT 16 — yani N+1 YOKTU.
 *   · Ama süre 200 kayıtta 0,28 → 1,48 sn'ye çıkıyordu (ilk istek).
 *
 * Sorun sorgu SAYISI değil, sorgu AĞIRLIĞIydı: `depth: 1`, 200 ilanın
 * her biri için mahalle, görsel ve danışman ilişkilerini çözüyor.
 *
 * Çözüm iki aşama:
 *   1. Ölçütlerin ihtiyacı olan DÖRT alan, `depth: 0` ile 200 kayıt için.
 *      Ölçütler yalnızca kategori, kira çarpanı ve tarihe bakıyor.
 *   2. Yalnızca SEÇİLEN ~32 kayıt için tam belge, `depth: 1` ile.
 *
 * Böylece ağır sorgu 200 satır yerine gösterilen kadar satır işliyor ve
 * portföy büyüdükçe maliyet artmıyor — sıra başına gösterilen kart sayısı
 * sabit olduğu için.
 * ─────────────────────────────────────────────────────────────────────────
 */
const HAVUZ_SINIRI = 200

/** Ölçütlerin karar vermek için ihtiyaç duyduğu asgari alanlar. */
interface HavuzKaydi {
  id: number
  kategori: string
  kiraCarpani: number | null
  createdAt: string
}

async function olcutHavuzuGetir(): Promise<HavuzKaydi[]> {
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
      // ⚠️ İlişki çözülmüyor: ölçütler ilişkilere bakmıyor.
      depth: 0,
      select: { id: true, kategori: true, kiraCarpani: true, createdAt: true },
      ...ZIYARETCI,
    })

    return sonuc.docs.map((ilan) => ({
      id: ilan.id,
      kategori: ilan.kategori,
      kiraCarpani: ilan.kiraCarpani ?? null,
      createdAt: ilan.createdAt,
    }))
  } catch {
    return []
  }
}

/**
 * Seçilen ilanların tam belgeleri — tek sorguda.
 *
 * Sıra başına ayrı sorgu atmak N+1 üretirdi; tüm sıraların kimlikleri
 * birleştirilip tek `in` sorgusuyla çekiliyor.
 */
async function secilenleriGetir(kimlikler: readonly number[]): Promise<Map<number, Ilanlar>> {
  if (kimlikler.length === 0) return new Map()

  try {
    const payload = await payloadGetir()
    const sonuc = await payload.find({
      collection: 'ilanlar',
      where: { id: { in: [...kimlikler] } },
      limit: kimlikler.length,
      depth: 1,
      populate: MEDYA_POPULATE,
      ...ZIYARETCI,
    })
    return new Map(sonuc.docs.map((ilan) => [ilan.id, ilan]))
  } catch {
    return new Map()
  }
}

export async function temaSiralariniGetir(): Promise<TemaSirasi[]> {
  const [ayarlar, havuz, gizli] = await Promise.all([
    ayarlariOku(),
    olcutHavuzuGetir(),
    gizliPortfoyuGetir(),
  ])

  /**
   * Araya karıştırılacak kilitli kayıtlar baştan ayrılır; kendi bölümleri
   * bunları atlar. Aynı taşınmaz iki kez görünmemeli.
   */
  const kilitliBolumVar = ayarlar.some((ayar) => olcutTanimi(ayar.olcut).kilitli)
  const karistirilan = kilitliBolumVar ? Math.min(ARAYA_GIREN_KILITLI, gizli.length) : 0
  const karistirilanlar = gizli.slice(0, karistirilan)

  // Havuz zaten ölçüt girdisi biçiminde geliyor.
  const olcutGirdileri = havuz

  const siralar: AraSira[] = ayarlar.map((ayar, sira) => {
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

    const sonuc = olcutUygula(ayar.olcut, havuz, olcutGirdileri, ayar.adet)

    return {
      anahtar: `${ayar.olcut}-${sira}`,
      baslik: ayar.baslik ?? tanim.varsayilanBaslik,
      altBaslik: ayar.altBaslik ?? tanim.varsayilanAltBaslik,
      kilitli: false,
      // Kimlikler şimdilik yer tutuyor; tam belgeler aşağıda tek sorguda
      // çekilip yerlerine konuyor.
      ogeler: sonuc.ilanlar.map((secilen) => ({
        tip: 'kimlik' as const,
        anahtar: `ilan-${secilen.id}`,
        id: secilen.id,
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
      ilanlar: sira.ogeler.flatMap((oge) => (oge.tip === 'kimlik' ? [{ id: oge.id, oge }] : [])),
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

  /**
   * ⚠️ Tam belgeler EN SONDA, tek sorguda.
   *
   * Tekrar ayıklama ve kilitli kart karıştırma bittikten sonra çekiliyor:
   * ayıklamayla düşen kayıtların ilişkilerini çözmek boşa iş olurdu.
   */
  const kimlikler = siralar.flatMap((sira) =>
    sira.ogeler.flatMap((oge) => (oge.tip === 'kimlik' ? [oge.id] : [])),
  )
  const belgeler = await secilenleriGetir(kimlikler)

  return siralar.map((sira) => ({
    ...sira,
    ogeler: sira.ogeler.flatMap((oge): SiraOgesiVerisi[] => {
      if (oge.tip === 'kilitli') return [oge]
      const ilan = belgeler.get(oge.id)
      // Belge arada silinmişse kart hiç gösterilmez — boş kart göstermek,
      // olmayan bir taşınmazı varmış gibi sunmak olurdu.
      return ilan === undefined ? [] : [{ tip: 'ilan', anahtar: oge.anahtar, ilan }]
    }),
  }))
}
