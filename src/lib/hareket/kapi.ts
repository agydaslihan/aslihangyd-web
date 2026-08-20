/**
 * Hareket kapısı — hangi koşulda hangi kodun İNECEĞİNE karar verir.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU DOSYA ANİMASYONU AÇIP KAPATMIYOR; KODUN İNİP İNMEYECEĞİNE KARAR
 * VERİYOR.
 *
 * Şartnamenin pazarlığa kapalı kuralı: `prefers-reduced-motion` açıksa
 * hareket kodu **yüklenmesin** — sadece animasyon kapanmasın. Aradaki fark
 * ölçülebilir: kapalı bir animasyonun kütüphanesi yine de indirilir,
 * ayrıştırılır ve ana iş parçacığını meşgul eder. Hareketi istemeyen
 * ziyaretçi çoğu zaman onu en az kaldırabilecek cihazdadır.
 *
 * Aynı sebeple Lenis yalnızca masaüstünde: mobilde native kaydırmayı
 * bozuyor ve iOS'ta takılma yapıyor. Kısıtlama değil, doğru kullanım.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ SUNUCUDA ÇAĞRILIRSA "HAYIR" DER. `matchMedia` yok; varsayılan cevap
 * hareketsizlik. Yanlış tarafta yanılmak: kodun inmemesi bir eksiklik,
 * inmemesi gereken yerde inmesi bir ihlal.
 */

/** Lenis'in açılacağı en dar ekran. Altında native kaydırma. */
export const MASAUSTU_ESIGI = 1024

/** LCP hiç bildirilmezse hareket kodunun en geç ineceği an. */
export const EN_GEC_MS = 3000

export function azHareketIsteniyor(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Lenis için masaüstü kontrolü.
 *
 * ⚠️ Yalnızca genişlik yetmez: 1024 px genişliğindeki bir tablet de
 * dokunmatik. `pointer: fine` fare/kalem demek — Lenis'in varsaydığı girdi.
 */
export function masaustuMu(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return (
    window.matchMedia('(pointer: fine)').matches &&
    window.matchMedia(`(min-width: ${MASAUSTU_ESIGI}px)`).matches
  )
}

/**
 * LCP boyandıktan SONRA çalışacak iş.
 *
 * ⚠️ ÜÇ KADEMELİ VE HEPSİ GEREKLİ:
 *   1. `PerformanceObserver` ile gerçek LCP olayı — doğru sinyal.
 *   2. `requestIdleCallback` — LCP olayı bildirilmezse (Safari'de bu API
 *      yok) boşta kalan ilk an.
 *   3. Zaman aşımı — sayfa hiç boşa çıkmazsa hareket sonsuza kadar
 *      beklemesin.
 *
 * ⚠️ İş EN FAZLA BİR KEZ çalışır: üç kademe de tetiklenebilir.
 */
export function lcpSonrasi(is: () => void): () => void {
  if (typeof window === 'undefined') return () => {}

  let calisti = false
  const temizleyiciler: Array<() => void> = []

  const calistir = () => {
    if (calisti) return
    calisti = true
    for (const temizle of temizleyiciler) temizle()
    is()
  }

  if (typeof PerformanceObserver === 'function') {
    try {
      const gozlemci = new PerformanceObserver(() => calistir())
      gozlemci.observe({ type: 'largest-contentful-paint', buffered: true })
      temizleyiciler.push(() => gozlemci.disconnect())
    } catch {
      // Tür desteklenmiyorsa diğer kademeler devrede.
    }
  }

  const bosta = (window as unknown as { requestIdleCallback?: (g: () => void) => number })
    .requestIdleCallback
  if (typeof bosta === 'function') {
    const kimlik = bosta(() => calistir())
    temizleyiciler.push(() => {
      const iptal = (window as unknown as { cancelIdleCallback?: (k: number) => void })
        .cancelIdleCallback
      iptal?.(kimlik)
    })
  }

  const zamanlayici = window.setTimeout(calistir, EN_GEC_MS)
  temizleyiciler.push(() => window.clearTimeout(zamanlayici))

  return () => {
    calisti = true
    for (const temizle of temizleyiciler) temizle()
  }
}
