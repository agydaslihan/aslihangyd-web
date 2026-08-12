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

/**
 * ⚠️ BU DEĞERLER ELLE KOPYALANMIŞ VE SESSİZCE BAYATLAYABİLİR.
 *
 * Palet yeniden tasarımında tam olarak öyle oldu: liste eski paletten
 * kalmıştı ve `--color-bakir-600` artık globals.css'te YOK. `getComputedStyle`
 * boş dönünce kod yedeğe düşüyordu — yani seçili sütun, palet değişmiş
 * olmasına rağmen **bakır** çiziliyordu. Kimse hata görmezdi.
 *
 * Bu yüzden `jetonlar.test.ts` her değerin globals.css'teki açık tema
 * karşılığıyla birebir aynı olduğunu denetliyor. Buraya bir satır eklerken
 * jetonun gerçekten var olduğundan emin olun; test yoksa uyarır.
 */
const YEDEKLER: Record<string, string> = {
  '--color-zemin': '#f7f6f2',
  '--color-yuzey': '#ffffff',
  '--color-kenar': '#cdd0d0',
  '--color-kenar-guclu': '#b1b5b6',
  '--color-metin': '#20252b',
  '--color-metin-3': '#64696d',
  '--color-lacivert-100': '#dbe0e8',
  '--color-lacivert-200': '#bec7d3',
  '--color-lacivert-300': '#a3aebe',
  '--color-lacivert-600': '#556781',
  '--color-aksan': '#4f7c6a',
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
    sutunSecili: jetonRengi('--color-aksan'),
    etiket: jetonRengi('--color-metin'),
    etiketHalesi: jetonRengi('--color-yuzey'),
    bina: jetonRengi('--color-lacivert-200'),
  }
}
