import 'server-only'

import { cache } from 'react'

import type { Where } from 'payload'

import { HERKESE_ACIK_DURUMLAR } from '@/lib/eids'
import { tumMahallelerinYakinligi } from '@/lib/veri/yakinlik'
import type { IlanKategorisi, IlanTipi } from '@/lib/secenekler'
import type { Ilanlar } from '@/payload-types'

import { payloadGetir, ZIYARETCI } from './istemci'

/**
 * Bir seferde basılan ilan sayısı.
 *
 * ⚠️ 12 → 24: şartname §7 "SEO için ilk 24 SSR" diyor. Listeleme sayfası
 * arama motorunun portföyü gezdiği ana yol; ilk basımda ne kadar çok
 * gerçek kart varsa o kadar iyi. 24 kart ~3 ekran, LCP'yi bozmuyor
 * (görseller `loading="lazy"` ve ızgara düzeninde lazy gerçekten çalışıyor).
 */
export const SAYFA_BASINA_ILAN = 24

/**
 * "Daha fazla göster" üst sınırı — kaza koruması.
 *
 * `?goster=999999` ile tüm portföyü tek istekte çekmeyi engelliyor.
 * Sınıra ulaşıldığında buton kaybolur; o noktada filtre kullanmak
 * kaydırmaya devam etmekten hızlı.
 */
export const AZAMI_GOSTER = 120

export interface IlanFiltresi {
  tip?: IlanTipi
  kategori?: IlanKategorisi
  /** Mahalle slug'ı. */
  mahalle?: string
  odaSayisi?: string
  enAzFiyat?: number
  enCokFiyat?: number
  enAzM2?: number
  enCokM2?: number

  /**
   * ─────────────────────────────────────────────────────────────────────
   * YATIRIM FİLTRELERİ — bizim ayrıştırıcımız.
   *
   * Türkiye'de hiçbir emlak sitesinde yok. Yatırımcı "3+1 ara kat" diye
   * değil, "kaç yılda kendini öder" diye arıyor.
   *
   * `kiraCarpani` ve `brutGetiri` gerçek veritabanı alanları (kayıt
   * kancasıyla hesaplanıyor), dolayısıyla sorgu tarafında ucuzlar.
   * ─────────────────────────────────────────────────────────────────────
   */
  /** Kira çarpanı en fazla N yıl. Düşük olan yatırımcı lehine. */
  carpanEnCok?: number
  /** Brüt getiri en az %N. */
  getiriEnAz?: number
  /**
   * Sanayiye en fazla N **kilometre**.
   *
   * ⚠️ ŞARTNAME "dk" İSTİYORDU, km KULLANILDI VE BU BİLİNÇLİ.
   *
   * Elimizde yol ağı verisi ve rotalama motoru yok; tüm mesafeler kuş
   * uçuşu. Mesafeyi varsayılan bir hıza bölüp "10 dakika" yazmak,
   * bilmediğimiz bir şeyi iddia etmek olurdu — `/veri-kaynaklari`
   * sayfasında bunu ziyaretçiye açıkça söylüyoruz. Filtrede "dk"
   * yazmak o sayfayı yalancı çıkarırdı.
   */
  sanayiKm?: number
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

function filtreyiKosulaCevir(filtre: IlanFiltresi, mahalleSluglari?: string[]): Where {
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
  if (typeof filtre.enAzM2 === 'number') {
    kosullar.push({ brutM2: { greater_than_equal: filtre.enAzM2 } })
  }
  if (typeof filtre.enCokM2 === 'number') {
    kosullar.push({ brutM2: { less_than_equal: filtre.enCokM2 } })
  }

  /**
   * ⚠️ Yatırım filtreleri kaydın HESAPLANMIŞ alanına bakar.
   *
   * Kira verisi girilmemiş ilanlarda `kiraCarpani` boş kalıyor (uydurma
   * veri yasağı) ve bu ilanlar filtre uygulandığında listeden düşüyor.
   * Doğru davranış bu: "kira çarpanı en fazla 15 yıl" diyen biri, çarpanı
   * BİLİNMEYEN bir ilanı görmek istemiyor — göstermek, bilmediğimiz bir
   * şeyi koşulu sağlıyormuş gibi sunmak olurdu.
   */
  if (typeof filtre.carpanEnCok === 'number') {
    kosullar.push({ kiraCarpani: { less_than_equal: filtre.carpanEnCok } })
  }
  if (typeof filtre.getiriEnAz === 'number') {
    kosullar.push({ brutGetiri: { greater_than_equal: filtre.getiriEnAz } })
  }
  if (mahalleSluglari !== undefined) {
    kosullar.push({ 'mahalle.slug': { in: mahalleSluglari } })
  }

  return { and: kosullar }
}

export interface IlanListesi {
  ilanlar: Ilanlar[]
  toplam: number
  sayfa: number
  toplamSayfa: number
}

/**
 * Sanayiye mesafe filtresini mahalle listesine çevirir.
 *
 * ⚠️ Mesafe İLANDA DEĞİL, MAHALLEDE. Bir ilanın kendi koordinatı olsa bile
 * sanayi mesafesi mahalle merkezinden ölçülüyor; ilan bazında ölçmek her
 * sorguda tüm portföy × tüm POI çarpımı demekti.
 *
 * Eşiği sağlayan mahalle yoksa BOŞ DİZİ dönüyor — `undefined` değil.
 * Aradaki fark önemli: boş dizi "hiçbir mahalle uymuyor" (sonuç boş
 * çıkmalı), `undefined` ise "filtre yok" demek olurdu ve filtre sessizce
 * yok sayılırdı.
 */
async function sanayiyeYakinMahalleler(km: number): Promise<string[]> {
  const metre = km * 1000
  const yakinliklar = await tumMahallelerinYakinligi()

  return yakinliklar
    .filter((mahalle) =>
      mahalle.mesafeler.some((olcum) => olcum.tip === 'sanayi' && olcum.enYakinMetre <= metre),
    )
    .map((mahalle) => mahalle.slug)
}

export async function ilanlariGetir(
  filtre: IlanFiltresi = {},
  sayfa = 1,
  limit = SAYFA_BASINA_ILAN,
): Promise<IlanListesi> {
  const payload = await payloadGetir()

  // PostGIS sorgusu yalnızca filtre gerçekten kullanıldığında koşuyor.
  const mahalleSluglari =
    typeof filtre.sanayiKm === 'number' ? await sanayiyeYakinMahalleler(filtre.sanayiKm) : undefined

  const sonuc = await payload.find({
    collection: 'ilanlar',
    where: filtreyiKosulaCevir(filtre, mahalleSluglari),
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
