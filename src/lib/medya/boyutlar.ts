/**
 * Görsel boyutları — `sizes` dizeleri ve onlardan türeyen ölçüm genişlikleri.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ TEK GERÇEK KAYNAK. BÜTÇE ROZETİ BURADAN TÜREMELİ, SABİT SAYIDAN DEĞİL.
 *
 * Rozet önce 480/828/1920 sabitlerini kullanıyordu ve YANLIŞTI:
 *   · Kart görselleri gerçekte 640 px iniyordu (rozet 480 diyordu →
 *     maliyeti %30 düşük gösteriyordu)
 *   · Hero görselleri 750 px iniyordu (rozet 828 diyordu)
 *
 * `sizes` değiştiğinde rozet kendiliğinden değişsin diye ölçüm genişlikleri
 * artık aşağıdaki dizelerden HESAPLANIYOR. Sabit sayı gömmek, iki gerçeğin
 * ayrı ayrı bakım istemesi demekti; biri güncellenip diğeri unutulunca
 * panelde sessizce yanlış rakam görünüyordu.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Kart ve galeri kapak görselleri. */
export const KART_SIZES = '(max-width: 640px) 78vw, (max-width: 1024px) 40vw, 260px'

/** Tam genişlik hero görselleri. */
export const HERO_SIZES = '100vw'

/**
 * `next/image`in üretebileceği genişlikler (deviceSizes + imageSizes).
 * Next varsayılanları; `next.config.ts` içinde değiştirilmedi.
 */
const ADAY_GENISLIKLER = [
  16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840,
] as const

/**
 * Temsili cihazlar — ölçümün hangi koşulu yansıttığı.
 *
 * Lighthouse'un emüle ettiği cihazlarla birebir aynı; böylece paneldeki
 * rakam ile CI ölçümü aynı şeyi söylüyor.
 */
export const CIHAZLAR = {
  /** Lighthouse mobil preset: Moto G Power. */
  mobil: { genislikCss: 412, pikselOrani: 1.75 },
  /** Lighthouse masaüstü preset. */
  masaustu: { genislikCss: 1350, pikselOrani: 1 },
} as const

export type Cihaz = keyof typeof CIHAZLAR

/**
 * Bir `sizes` dizesini belirli bir görünüm genişliği için CSS pikseline çevirir.
 *
 * ⚠️ Tam bir CSS medya sorgusu ayrıştırıcısı DEĞİL — bu projede kullanılan
 * iki biçimi anlıyor: `(max-width: Npx) Mvw` ve sondaki koşulsuz `Mvw` /
 * `Npx`. Daha karmaşık bir sorgu yazılırsa sessizce yanlış hesaplamak
 * yerine `null` dönüyor; çağıran taraf bunu görünür kılmalı.
 */
export function sizesCssPiksel(sizes: string, gorunumGenisligi: number): number | null {
  for (const ham of sizes.split(',')) {
    const parca = ham.trim()
    if (parca === '') continue

    const kosullu = /^\(max-width:\s*(\d+)px\)\s+(.+)$/.exec(parca)
    if (kosullu) {
      const esik = Number(kosullu[1])
      if (gorunumGenisligi > esik) continue
      return degeriCoz(kosullu[2]!, gorunumGenisligi)
    }

    // Koşulsuz son değer.
    if (!parca.startsWith('(')) return degeriCoz(parca, gorunumGenisligi)
  }
  return null
}

function degeriCoz(deger: string, gorunumGenisligi: number): number | null {
  const vw = /^([\d.]+)vw$/.exec(deger.trim())
  if (vw) return (Number(vw[1]) / 100) * gorunumGenisligi

  const px = /^([\d.]+)px$/.exec(deger.trim())
  if (px) return Number(px[1])

  return null
}

/** İstenen genişliği `next/image`in üreteceği en küçük yeterli adaya yuvarlar. */
export function adayGenislik(gerekli: number): number {
  return (
    ADAY_GENISLIKLER.find((g) => g >= gerekli) ?? ADAY_GENISLIKLER[ADAY_GENISLIKLER.length - 1]!
  )
}

/**
 * Bir `sizes` dizesinin belirli bir cihazda hangi genişlikte indirileceği.
 *
 * Zincir: sizes → CSS piksel → piksel oranıyla çarp → aday genişliğe yuvarla.
 */
export function inecekGenislik(sizes: string, cihaz: Cihaz): number | null {
  const { genislikCss, pikselOrani } = CIHAZLAR[cihaz]
  const cssPiksel = sizesCssPiksel(sizes, genislikCss)
  if (cssPiksel === null) return null
  return adayGenislik(Math.ceil(cssPiksel * pikselOrani))
}

/** Bütçe rozetinin ölçtüğü kullanım biçimleri. */
export const KULLANIM_SIZES = {
  hero: HERO_SIZES,
  kart: KART_SIZES,
} as const

export type Kullanim = keyof typeof KULLANIM_SIZES
