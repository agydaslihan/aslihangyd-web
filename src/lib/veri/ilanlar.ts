import 'server-only'

import { cache } from 'react'

import type { Where } from 'payload'

import { HERKESE_ACIK_DURUMLAR } from '@/lib/eids'
import type { IlanKategorisi, IlanTipi } from '@/lib/secenekler'
import type { Ilanlar } from '@/payload-types'

import { payloadGetir, ZIYARETCI } from './istemci'

export const SAYFA_BASINA_ILAN = 12

export interface IlanFiltresi {
  tip?: IlanTipi
  kategori?: IlanKategorisi
  /** Mahalle slug'ı. */
  mahalle?: string
  odaSayisi?: string
  enAzFiyat?: number
  enCokFiyat?: number
  siralama?: 'yeni' | 'fiyat_artan' | 'fiyat_azalan' | 'carpan_artan'
}

const SIRALAMALAR: Record<NonNullable<IlanFiltresi['siralama']>, string> = {
  yeni: '-createdAt',
  fiyat_artan: 'fiyat',
  fiyat_azalan: '-fiyat',
  // Düşük kira çarpanı yatırımcı lehinedir; artan sıra "en iyi" demektir.
  carpan_artan: 'kiraCarpani',
}

/**
 * Yayındaki ilanların tabanı.
 *
 * ⚠️ `gizliPortfoy` işaretli ilanlar genel listede GÖRÜNMEZ. Bunlar
 * off-market portföydür ve Faz 2B'deki "Gizli Portföy" modülünde
 * kilitlenmiş biçimde sunulur.
 */
function temelKosul(): Where {
  return {
    and: [{ durum: { in: [...HERKESE_ACIK_DURUMLAR] } }, { gizliPortfoy: { not_equals: true } }],
  }
}

function filtreyiKosulaCevir(filtre: IlanFiltresi): Where {
  const kosullar: Where[] = [temelKosul()]

  if (filtre.tip) kosullar.push({ tip: { equals: filtre.tip } })
  if (filtre.kategori) kosullar.push({ kategori: { equals: filtre.kategori } })
  if (filtre.odaSayisi) kosullar.push({ odaSayisi: { equals: filtre.odaSayisi } })
  if (filtre.mahalle) kosullar.push({ 'mahalle.slug': { equals: filtre.mahalle } })
  if (typeof filtre.enAzFiyat === 'number') {
    kosullar.push({ fiyat: { greater_than_equal: filtre.enAzFiyat } })
  }
  if (typeof filtre.enCokFiyat === 'number') {
    kosullar.push({ fiyat: { less_than_equal: filtre.enCokFiyat } })
  }

  return { and: kosullar }
}

export interface IlanListesi {
  ilanlar: Ilanlar[]
  toplam: number
  sayfa: number
  toplamSayfa: number
}

export async function ilanlariGetir(
  filtre: IlanFiltresi = {},
  sayfa = 1,
  limit = SAYFA_BASINA_ILAN,
): Promise<IlanListesi> {
  const payload = await payloadGetir()

  const sonuc = await payload.find({
    collection: 'ilanlar',
    where: filtreyiKosulaCevir(filtre),
    sort: SIRALAMALAR[filtre.siralama ?? 'yeni'],
    page: sayfa,
    limit,
    depth: 1,
    ...ZIYARETCI,
  })

  return {
    ilanlar: sonuc.docs,
    toplam: sonuc.totalDocs,
    sayfa: sonuc.page ?? 1,
    toplamSayfa: sonuc.totalPages,
  }
}

export const ilanGetir = cache(async (slug: string): Promise<Ilanlar | null> => {
  const payload = await payloadGetir()

  const sonuc = await payload.find({
    collection: 'ilanlar',
    where: { and: [temelKosul(), { slug: { equals: slug } }] },
    limit: 1,
    depth: 2,
    ...ZIYARETCI,
  })

  return sonuc.docs[0] ?? null
})

/** Ana sayfadaki öne çıkan portföy. */
export async function oneCikanIlanlariGetir(limit = 3): Promise<Ilanlar[]> {
  const payload = await payloadGetir()

  const sonuc = await payload.find({
    collection: 'ilanlar',
    where: { and: [temelKosul(), { oneCikan: { equals: true } }] },
    sort: '-createdAt',
    limit,
    depth: 1,
    ...ZIYARETCI,
  })

  // Öne çıkan yoksa en yeni ilanlara düş: ana sayfa boş kalmasın.
  if (sonuc.docs.length > 0) return sonuc.docs

  const yedek = await payload.find({
    collection: 'ilanlar',
    where: temelKosul(),
    sort: '-createdAt',
    limit,
    depth: 1,
    ...ZIYARETCI,
  })

  return yedek.docs
}

/** Bir mahalledeki portföy — mahalle sayfasının 8. bölümü. */
export async function mahalledekiIlanlariGetir(mahalleId: number, limit = 3): Promise<Ilanlar[]> {
  const payload = await payloadGetir()

  const sonuc = await payload.find({
    collection: 'ilanlar',
    where: { and: [temelKosul(), { mahalle: { equals: mahalleId } }] },
    sort: '-createdAt',
    limit,
    depth: 1,
    ...ZIYARETCI,
  })

  return sonuc.docs
}

/** Sitemap ve statik üretim için tüm yayındaki ilan slug'ları. */
export async function tumIlanSluglari(): Promise<{ slug: string; updatedAt: string }[]> {
  const payload = await payloadGetir()

  const sonuc = await payload.find({
    collection: 'ilanlar',
    where: temelKosul(),
    limit: 1000,
    depth: 0,
    select: { slug: true, updatedAt: true },
    ...ZIYARETCI,
  })

  return sonuc.docs.map((ilan) => ({ slug: ilan.slug, updatedAt: ilan.updatedAt }))
}
