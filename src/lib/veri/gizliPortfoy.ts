import 'server-only'

import { HERKESE_ACIK_DURUMLAR } from '@/lib/eids'

import { payloadGetir, ZIYARETCI } from './istemci'

/**
 * Gizli portföy (off-market) — maskelenmiş görünüm.
 *
 * ⚠️ Maskeleme SUNUCUDA yapılır ve gizli alanlar istemciye HİÇ GÖNDERİLMEZ.
 *
 * Bunu istemcide gizlemek (CSS ile bulanıklaştırmak, alanı render etmemek)
 * gerçek bir koruma değildir: veri HTML kaynağında veya RSC yükünde durur ve
 * tarayıcı geliştirici araçlarıyla okunur. Rakip bir emlakçının portföyü
 * kopyalaması için bu yeterlidir.
 *
 * Bu yüzden sorgu `select` ile yalnızca gösterilecek alanları çeker.
 * Adres, fotoğraf, kat planı, malik bilgisi ve tam konum veritabanından
 * hiç okunmaz.
 */

export interface GizliKayit {
  id: number
  mahalleAdi: string | null
  kategori: string
  tip: string
  /** m² tam değil, aralık olarak gösterilir. */
  m2Araligi: string | null
  /** Fiyat tam değil, bant olarak gösterilir. */
  fiyatBandi: string | null
  kiraCarpani: number | null
  odaSayisi: string | null
}

/**
 * Tam değeri bandına yuvarlar.
 *
 * "4.230.000 ₺" yerine "4,0 – 4,5 M ₺". Kıtlık hissini korur ama yanıltmaz:
 * gerçek değer gerçekten o bandın içindedir.
 */
function fiyatBandi(fiyat: number | null | undefined): string | null {
  if (typeof fiyat !== 'number' || !Number.isFinite(fiyat) || fiyat <= 0) return null

  // 500 bin TL'lik bantlar; milyon üstünde okunabilir kalıyor.
  const bant = 500_000
  const alt = Math.floor(fiyat / bant) * bant
  const ust = alt + bant

  const yaz = (deger: number) =>
    deger >= 1_000_000
      ? `${(deger / 1_000_000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} M`
      : `${(deger / 1_000).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} B`

  return `${yaz(alt)} – ${yaz(ust)} ₺`
}

function m2Araligi(m2: number | null | undefined): string | null {
  if (typeof m2 !== 'number' || !Number.isFinite(m2) || m2 <= 0) return null

  const bant = m2 >= 500 ? 250 : 25
  const alt = Math.floor(m2 / bant) * bant
  return `${alt} – ${alt + bant} m²`
}

export async function gizliPortfoyuGetir(): Promise<GizliKayit[]> {
  try {
    const payload = await payloadGetir()

    const sonuc = await payload.find({
      collection: 'ilanlar',
      where: {
        and: [{ gizliPortfoy: { equals: true } }, { durum: { in: [...HERKESE_ACIK_DURUMLAR] } }],
      },
      limit: 100,
      depth: 1,
      // ⚠️ Yalnızca gösterilecek alanlar. `adres`, `gorseller`, `konum`,
      // `katPlani`, `belgeler` ve `tasinmazNo` BİLİNÇLİ OLARAK YOK.
      select: {
        id: true,
        tip: true,
        kategori: true,
        odaSayisi: true,
        brutM2: true,
        fiyat: true,
        kiraCarpani: true,
        mahalle: true,
      },
      ...ZIYARETCI,
    })

    return sonuc.docs.map((ilan) => ({
      id: ilan.id,
      mahalleAdi: typeof ilan.mahalle === 'object' ? (ilan.mahalle?.ad ?? null) : null,
      kategori: ilan.kategori,
      tip: ilan.tip,
      m2Araligi: m2Araligi(ilan.brutM2),
      fiyatBandi: fiyatBandi(ilan.fiyat),
      kiraCarpani: ilan.kiraCarpani ?? null,
      odaSayisi: ilan.odaSayisi ?? null,
    }))
  } catch {
    return []
  }
}

/**
 * Sayaç CMS'ten otomatik gelir, elle güncellenmez.
 * (BAL-KUPU-VE-PORTFOY-YONETIMI.md §B2)
 */
export async function gizliPortfoySayisi(): Promise<number> {
  try {
    const payload = await payloadGetir()
    const sonuc = await payload.count({
      collection: 'ilanlar',
      where: {
        and: [{ gizliPortfoy: { equals: true } }, { durum: { in: [...HERKESE_ACIK_DURUMLAR] } }],
      },
      ...ZIYARETCI,
    })
    return sonuc.totalDocs
  } catch {
    return 0
  }
}
