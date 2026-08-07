/**
 * Harita renklerini tasarım jetonlarından okur.
 *
 * ⚠️ MapLibre CSS değişkeni anlamaz; stil nesnesine somut renk verilmeli.
 * Bu, haritanın paletten kopması için hazır bir bahane — ve ilk sürümde
 * tam olarak öyle olmuştu (`#3b5a8a` gibi elle yazılmış renkler).
 *
 * Çözüm: jetonu çalışma zamanında `getComputedStyle` ile okumak. Üç kazanç:
 *   1. Tek gerçek kaynak globals.css olarak kalır.
 *   2. Harita koyu temaya kendiliğinden uyar.
 *   3. Palet değişince harita da değişir, kimse unutmaz.
 *
 * Yedek değerler yalnızca sunucu tarafı render ya da jetonun bulunamaması
 * içindir; normal akışta hiç kullanılmazlar.
 */

const YEDEKLER: Record<string, string> = {
  '--color-zemin': '#f8f7f3',
  '--color-yuzey': '#ffffff',
  '--color-kenar': '#e0ddd5',
  '--color-kenar-guclu': '#c4c1b8',
  '--color-metin': '#1a1917',
  '--color-metin-3': '#5f5c55',
  '--color-lacivert-100': '#e4edf4',
  '--color-lacivert-200': '#cbdce9',
  '--color-lacivert-300': '#a3bfd9',
  '--color-lacivert-600': '#26588f',
  '--color-bakir-600': '#a85529',
}

/** Jetonun çalışma zamanındaki değeri. Tarayıcı dışında yedeğe düşer. */
export function jetonRengi(ad: string): string {
  const yedek = YEDEKLER[ad] ?? '#000000'
  if (typeof window === 'undefined' || typeof document === 'undefined') return yedek

  const deger = getComputedStyle(document.documentElement).getPropertyValue(ad).trim()
  return deger === '' ? yedek : deger
}

/** Haritanın kullandığı renk kümesi — tek çağrıda okunur. */
export interface HaritaRenkleri {
  zemin: string
  yuzey: string
  yol: string
  sinir: string
  mahalleDolgu: string
  mahalleDolguKoyu: string
  sutun: string
  sutunSecili: string
  etiket: string
  etiketHalesi: string
  bina: string
}

export function haritaRenkleri(): HaritaRenkleri {
  return {
    zemin: jetonRengi('--color-zemin'),
    yuzey: jetonRengi('--color-yuzey'),
    yol: jetonRengi('--color-kenar'),
    sinir: jetonRengi('--color-kenar-guclu'),
    mahalleDolgu: jetonRengi('--color-lacivert-100'),
    mahalleDolguKoyu: jetonRengi('--color-lacivert-200'),
    // ⚠️ Sütunlar TEK RENK. Fiyat yalnızca yükseklikle kodlanır.
    sutun: jetonRengi('--color-lacivert-600'),
    // Tek istisna: seçili mahalle. Vurgu için, veri için değil.
    sutunSecili: jetonRengi('--color-bakir-600'),
    etiket: jetonRengi('--color-metin'),
    etiketHalesi: jetonRengi('--color-yuzey'),
    bina: jetonRengi('--color-lacivert-200'),
  }
}
