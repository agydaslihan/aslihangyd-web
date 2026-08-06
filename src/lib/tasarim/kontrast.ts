/**
 * WCAG kontrast hesabı ve tasarım jetonu çözümleyicisi.
 *
 * Neden var: "bu renkler yeterince kontrastlı görünüyor" bir mühendislik
 * iddiası değildir. Palet değiştiğinde ya da koyu tema jetonu elle
 * ayarlandığında hangi kombinasyonun AA'nın altına düştüğünü göz göremez.
 * Burada hesaplanır, `kontrast.test.ts` içinde gerçek globals.css'e karşı
 * doğrulanır.
 *
 * Kaynak: WCAG 2.2, 1.4.3 (metin) ve 1.4.11 (metin dışı).
 */

/** Normal metin için asgari oran (WCAG 1.4.3, AA). */
export const AA_METIN = 4.5

/**
 * Büyük metin için asgari oran — 18.66px kalın ya da 24px normal ve üstü.
 * Bu projede başlıklar 500 ağırlıkta olduğu için yalnızca 24px+ sayılır.
 */
export const AA_BUYUK_METIN = 3

/** Metin dışı öğe: form kenarlığı, ikon, gösterge (WCAG 1.4.11). */
export const AA_BILESEN = 3

export interface Rgb {
  r: number
  g: number
  b: number
}

const HEX_DESENI = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

/** `#abc` ve `#aabbcc` biçimlerini kabul eder. */
export function hexCoz(hex: string): Rgb {
  const temiz = hex.trim().toLowerCase()
  if (!HEX_DESENI.test(temiz)) {
    throw new TypeError(`Geçersiz hex rengi: ${hex}`)
  }

  const govde =
    temiz.length === 4
      ? temiz
          .slice(1)
          .split('')
          .map((k) => k + k)
          .join('')
      : temiz.slice(1)

  return {
    r: Number.parseInt(govde.slice(0, 2), 16),
    g: Number.parseInt(govde.slice(2, 4), 16),
    b: Number.parseInt(govde.slice(4, 6), 16),
  }
}

/** sRGB kanalını doğrusal ışık değerine çevirir. */
function dogrusallastir(kanal: number): number {
  const oran = kanal / 255
  return oran <= 0.04045 ? oran / 12.92 : ((oran + 0.055) / 1.055) ** 2.4
}

/** Bağıl parlaklık (WCAG tanımı). 0 = siyah, 1 = beyaz. */
export function bagilParlaklik(renk: Rgb | string): number {
  const { r, g, b } = typeof renk === 'string' ? hexCoz(renk) : renk
  return 0.2126 * dogrusallastir(r) + 0.7152 * dogrusallastir(g) + 0.0722 * dogrusallastir(b)
}

/** İki renk arasındaki kontrast oranı. Sonuç 1 ile 21 arasındadır. */
export function kontrastOrani(a: Rgb | string, b: Rgb | string): number {
  const parlakA = bagilParlaklik(a)
  const parlakB = bagilParlaklik(b)
  const acik = Math.max(parlakA, parlakB)
  const koyu = Math.min(parlakA, parlakB)
  return (acik + 0.05) / (koyu + 0.05)
}

/** Raporlarda okunaklı olsun diye iki basamağa yuvarlar (aşağı doğru). */
export function oraniYuvarla(oran: number): number {
  return Math.floor(oran * 100) / 100
}

/* ==========================================================================
   globals.css jeton çözümleyicisi
   ========================================================================== */

export type JetonHaritasi = ReadonlyMap<string, string>

export interface CozulmusTemalar {
  acik: JetonHaritasi
  koyu: JetonHaritasi
}

const BILDIRIM_DESENI = /(--color-[a-z0-9-]+)\s*:\s*([^;]+);/gi
const VAR_DESENI = /^var\(\s*(--color-[a-z0-9-]+)\s*\)$/i

/** Bir CSS parçasındaki tüm `--color-*` bildirimlerini sırayla toplar. */
function bildirimleriTopla(css: string, hedef: Map<string, string>): void {
  for (const [, ad, deger] of css.matchAll(BILDIRIM_DESENI)) {
    if (ad === undefined || deger === undefined) continue
    hedef.set(ad, deger.trim())
  }
}

/**
 * `var(--color-x)` zincirlerini nihai hex değerine indirger.
 *
 * Döngüsel referans (a → b → a) sessizce sonsuz döngüye girmesin diye
 * adım sayısı sınırlıdır; sınır aşılırsa hata fırlatılır.
 */
function referanslariCoz(ham: Map<string, string>): JetonHaritasi {
  const cozulmus = new Map<string, string>()

  for (const ad of ham.keys()) {
    let deger = ham.get(ad)
    let adim = 0

    while (deger !== undefined) {
      const referans = VAR_DESENI.exec(deger)
      if (referans === null) break

      if ((adim += 1) > 20) {
        throw new Error(`Jeton referansı döngüye girdi: ${ad}`)
      }

      const hedefAd = referans[1] ?? ''
      const sonraki = ham.get(hedefAd)
      if (sonraki === undefined) {
        throw new Error(`Tanımsız jetona başvuruluyor: ${ad} → ${hedefAd}`)
      }
      deger = sonraki
    }

    if (deger !== undefined && HEX_DESENI.test(deger)) {
      cozulmus.set(ad, deger)
    }
  }

  return cozulmus
}

/**
 * globals.css içeriğinden açık ve koyu tema jeton haritalarını üretir.
 *
 * Koyu tema bloğu `@media (prefers-color-scheme: dark)` ile başlar; ondan
 * önceki her şey açık tema, blok içindekiler ise açık temanın üzerine
 * binen geçersiz kılmalardır. Ayrıştırma bilinçli olarak basit tutuldu —
 * amaç genel bir CSS ayrıştırıcı yazmak değil, bu dosyanın bilinen
 * yapısını okumak.
 */
export function temalariCoz(css: string): CozulmusTemalar {
  const koyuIsaret = css.indexOf('@media (prefers-color-scheme: dark)')

  const acikKaynak = koyuIsaret === -1 ? css : css.slice(0, koyuIsaret)
  const koyuKaynak = koyuIsaret === -1 ? '' : css.slice(koyuIsaret)

  const acikHam = new Map<string, string>()
  bildirimleriTopla(acikKaynak, acikHam)

  const koyuHam = new Map(acikHam)
  bildirimleriTopla(koyuKaynak, koyuHam)

  return { acik: referanslariCoz(acikHam), koyu: referanslariCoz(koyuHam) }
}

/** Jetonu okur; tanımlı değilse testin sessizce geçmesindense hata verir. */
export function jeton(harita: JetonHaritasi, ad: string): string {
  const deger = harita.get(ad)
  if (deger === undefined) {
    throw new Error(`Tasarım jetonu tanımlı değil: ${ad}`)
  }
  return deger
}
