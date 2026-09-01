import 'server-only'

import { cache } from 'react'

import type { RayicKaynagi } from '@/lib/rayic/tipler'

import { payloadGetir, ZIYARETCI } from './istemci'

/**
 * Rayiç bedel okuma yolu.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ÖNCE MAHALLE GENELİ KAYIT; YOKSA SOKAKLARIN ORTANCASI.
 *
 * Eski hâl yalnızca sokağı BOŞ olan kaydı arıyordu ve gerekçesi doğruydu:
 * tek bir sokağın rakamını "mahallenin rayiç bedeli" diye göstermek
 * yanıltıcı olur — o sokak mahallenin en pahalı ya da en ucuz yeri
 * olabilir.
 *
 * Ama sonuç şuydu: 31 Ağustos 2026'da veritabanında 3.366 rayiç kaydı
 * vardı, hepsi mahallelerle DOĞRU eşleşmişti ve **hiçbiri mahalle geneli
 * değildi** — belediye tablosu sokak sokak geliyor. Site yirmi altı
 * mahallenin hepsinde "Rayiç bedel henüz girilmedi" diyordu.
 *
 * Doğru cevap tek sokağı seçmek değil, TOPLULAŞTIRMAK:
 *
 *   · **Ortanca**, ortalama değil. Dağılım çok geniş (24 ₺/m² tarla,
 *     35.000 ₺/m² cadde); ortalama birkaç cadde tarafından yukarı
 *     çekilir, ortanca çekilmez.
 *   · **Kaç sokağa dayandığı (n) yazılır** — sitenin her rakamda
 *     uyguladığı kural.
 *   · **En düşük–en yüksek aralık gösterilir**; mahalle içindeki fark
 *     ortancanın kendisi kadar bilgi.
 *   · **Kapsam ekranda yazılı**: "mahalle geneli kaydı" mı, "N sokak
 *     kaydının ortancası" mı — okuyan kişi neye baktığını bilsin.
 *
 * ⚠️ EN SON YIL SEÇİLİR. Rayiç bedel her yıl artar; eski bir yılın
 * rakamıyla hesaplanan oran, piyasayı olduğundan pahalı gösterir.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Ortanca — sıralı dizinin ortası.
 *
 * ⚠️ Çift eleman sayısında iki ortanın ortalaması alınıyor; tek elemanlı
 * dizide değerin kendisi. Boş dizi `null`.
 */
function ortanca(degerler: readonly number[]): number | null {
  if (degerler.length === 0) return null
  const sirali = [...degerler].sort((a, b) => a - b)
  const orta = Math.floor(sirali.length / 2)
  if (sirali.length % 2 === 1) return sirali[orta] ?? null
  const a = sirali[orta - 1]
  const b = sirali[orta]
  return a === undefined || b === undefined ? null : (a + b) / 2
}

/** Rakamın neye dayandığı — ekranda yazılı. */
export type RayicKapsami = 'mahalle_geneli' | 'sokak_ortancasi'

export interface MahalleRayici {
  mahalleId: number
  yil: number
  metrekareRayicBedel: number | null
  arsaRayicBedel: number | null
  kaynak: RayicKaynagi
  guncellemeTarihi: string | null
  kapsam: RayicKapsami
  /** Ortanca kaç kayda dayanıyor. Mahalle geneli kayıtta 1. */
  kayitSayisi: number
  /** Sokaklar arası aralık — yalnızca ortanca kipinde dolu. */
  enDusuk: number | null
  enYuksek: number | null
}

function kayitCoz(kayit: Record<string, unknown>): MahalleRayici | null {
  const mahalle = kayit.mahalle
  const mahalleId =
    typeof mahalle === 'object' && mahalle !== null
      ? Number((mahalle as { id?: unknown }).id)
      : Number(mahalle)

  const yil = kayit.yil
  if (!Number.isFinite(mahalleId) || typeof yil !== 'number') return null

  const sayi = (deger: unknown): number | null =>
    typeof deger === 'number' && Number.isFinite(deger) && deger > 0 ? deger : null

  return {
    mahalleId,
    yil,
    metrekareRayicBedel: sayi(kayit.metrekareRayicBedel),
    arsaRayicBedel: sayi(kayit.arsaRayicBedel),
    kaynak: (kayit.kaynak ?? 'elle') as RayicKaynagi,
    guncellemeTarihi: typeof kayit.guncellemeTarihi === 'string' ? kayit.guncellemeTarihi : null,
    kapsam: 'mahalle_geneli',
    kayitSayisi: 1,
    enDusuk: null,
    enYuksek: null,
  }
}

/**
 * Sokak kayıtlarını mahalle ölçeğinde tek bir rakama indirger.
 *
 * ⚠️ YALNIZCA EN SON YILIN KAYITLARI. Farklı yılların rakamlarını aynı
 * ortancaya katmak, zamla gelen artışı mahalle içi fark sanmak olurdu.
 *
 * ⚠️ Dışa aktarılıyor çünkü test edilmesi gereken şey bu: hangi rakamın
 * "mahallenin rayiç bedeli" diye gösterileceği kararı burada veriliyor.
 */
export function sokaklariTopla(
  kayitlar: readonly Record<string, unknown>[],
  mahalleId: number,
): MahalleRayici | null {
  const cozulenler = kayitlar.map((k) => kayitCoz(k)).filter((k): k is MahalleRayici => k !== null)
  if (cozulenler.length === 0) return null

  const enYeniYil = Math.max(...cozulenler.map((k) => k.yil))
  const yilinkiler = cozulenler.filter((k) => k.yil === enYeniYil)

  const binalar = yilinkiler
    .map((k) => k.metrekareRayicBedel)
    .filter((d): d is number => d !== null)
  const arsalar = yilinkiler.map((k) => k.arsaRayicBedel).filter((d): d is number => d !== null)

  const binaOrtanca = ortanca(binalar)
  const arsaOrtanca = ortanca(arsalar)
  if (binaOrtanca === null && arsaOrtanca === null) return null

  // Aralık, gösterilen rakamın dayandığı seriden okunuyor.
  const seri = binaOrtanca !== null ? binalar : arsalar

  return {
    mahalleId,
    yil: enYeniYil,
    metrekareRayicBedel: binaOrtanca,
    arsaRayicBedel: arsaOrtanca,
    kaynak: yilinkiler[0]?.kaynak ?? 'elle',
    guncellemeTarihi: yilinkiler[0]?.guncellemeTarihi ?? null,
    kapsam: 'sokak_ortancasi',
    kayitSayisi: seri.length,
    enDusuk: seri.length > 0 ? Math.min(...seri) : null,
    enYuksek: seri.length > 0 ? Math.max(...seri) : null,
  }
}

/**
 * Bir mahallenin en güncel, mahalle geneli rayiç bedeli.
 *
 * Veri yoksa `null` — arayüz kendi boş durumunu gösterir. Uydurma bir
 * rakama düşülmez (CLAUDE.md kural 2).
 */
export const mahalleRayiciGetir = cache(
  async (mahalleId: number): Promise<MahalleRayici | null> => {
    try {
      const payload = await payloadGetir()

      // 1) Mahalle geneli kayıt varsa o kazanır — elle girilmiş, kasıtlı.
      const genel = await payload.find({
        collection: 'rayic-degerler',
        where: {
          and: [{ mahalle: { equals: mahalleId } }, { sokak: { exists: false } }],
        },
        // En yeni yıl önce.
        sort: '-yil',
        limit: 1,
        depth: 0,
        ...ZIYARETCI,
      })

      const kayit = genel.docs[0]
      if (kayit) return kayitCoz(kayit as unknown as Record<string, unknown>)

      // 2) Yoksa sokak kayıtlarının ortancası.
      const sokaklar = await payload.find({
        collection: 'rayic-degerler',
        where: { mahalle: { equals: mahalleId } },
        sort: '-yil',
        limit: 1000,
        depth: 0,
        ...ZIYARETCI,
      })

      return sokaklariTopla(sokaklar.docs as unknown as Record<string, unknown>[], mahalleId)
    } catch {
      return null
    }
  },
)

/**
 * Rayiç bedeli olan tüm mahalleler — hesaplayıcının seçim listesi.
 *
 * ⚠️ Burada da mahalle geneli kayıt yoksa sokak ortancası kullanılıyor;
 * aksi hâlde hesaplayıcının listesi boş kalırdı ve mahalle sayfasıyla
 * hesaplayıcı aynı veriye farklı cevap verirdi.
 *
 * ⚠️ TEK SORGU, MAHALLE BAŞINA SORGU DEĞİL. Yirmi altı ayrı çağrı,
 * hesaplayıcı sayfasına yirmi altı veritabanı turu eklerdi.
 */
export const rayicliMahalleleriGetir = cache(
  async (): Promise<{ mahalleId: number; ad: string; rayic: MahalleRayici }[]> => {
    try {
      const payload = await payloadGetir()

      const [rayicler, mahalleler] = await Promise.all([
        payload.find({
          collection: 'rayic-degerler',
          limit: 10_000,
          sort: '-yil',
          depth: 0,
          ...ZIYARETCI,
        }),
        payload.find({
          collection: 'mahalleler',
          limit: 500,
          depth: 0,
          select: { ad: true },
          ...ZIYARETCI,
        }),
      ])

      const adlar = new Map<number, string>()
      for (const m of mahalleler.docs) adlar.set(Number(m.id), String(m.ad ?? ''))

      /**
       * ⚠️ Mahalle geneli kayıt varsa sokaklar hesaba KATILMAZ. İkisini
       * karıştırmak, elle girilmiş kasıtlı bir rakamı yüzlerce sokak
       * kaydının içinde eritirdi.
       */
      const genel = new Map<number, Record<string, unknown>>()
      const sokakBasina = new Map<number, Record<string, unknown>[]>()

      for (const ham of rayicler.docs) {
        const kayit = ham as unknown as Record<string, unknown>
        const mahalle = kayit.mahalle
        const mahalleId =
          typeof mahalle === 'object' && mahalle !== null
            ? Number((mahalle as { id?: unknown }).id)
            : Number(mahalle)
        if (!Number.isFinite(mahalleId)) continue

        const sokak = kayit.sokak
        if (typeof sokak !== 'string' || sokak.trim() === '') {
          // `sort: '-yil'` sayesinde ilk gelen en yeni yıl.
          if (!genel.has(mahalleId)) genel.set(mahalleId, kayit)
          continue
        }

        const liste = sokakBasina.get(mahalleId) ?? []
        liste.push(kayit)
        sokakBasina.set(mahalleId, liste)
      }

      const sonuc: { mahalleId: number; ad: string; rayic: MahalleRayici }[] = []

      for (const [mahalleId, ad] of adlar) {
        const genelKayit = genel.get(mahalleId)
        const rayic = genelKayit
          ? kayitCoz(genelKayit)
          : sokaklariTopla(sokakBasina.get(mahalleId) ?? [], mahalleId)

        if (!rayic || rayic.metrekareRayicBedel === null) continue
        if (ad === '') continue
        sonuc.push({ mahalleId, ad, rayic })
      }

      return sonuc.sort((a, b) => a.ad.localeCompare(b.ad, 'tr'))
    } catch {
      return []
    }
  },
)
