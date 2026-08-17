/**
 * Bileşenlerin olay göndermek için kullandığı tek kapı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU DOSYADA AĞ KODU YOK — VE OLMAMASI ÖNEMLİ.
 *
 * Gönderme işini `OlayIzleyici` yapıyor ve o bileşen yalnızca analitik onayı
 * varsa istemciye iniyor. Bileşenler doğrudan `fetch` çağırsaydı, ölçüm kodu
 * onay vermeyen ziyaretçinin paketine de girer ve daha kötüsü — onay kapısı
 * bileşen sayısı kadar yere dağılırdı.
 *
 * Burada yapılan tek şey: izleyici yüklüyse ona haber vermek. Yüklü değilse
 * çağrı sessizce hiçbir şey yapmıyor. Yani "onay yok" durumu bir `if` ile
 * değil, fonksiyonun VAR OLMAMASIYLA sağlanıyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

declare global {
  interface Window {
    /** `OlayIzleyici` mount edildiğinde tanımlanır. */
    __gozlemOlay?: (ad: string, ayrinti?: string) => void
  }
}

/**
 * ⚠️ Ayrıntı SERBEST METİN DEĞİL. Sunucu tarafı da ayrıca süzüyor ama
 * kaynağında kesmek daha güvenli: bir gün biri buraya arama sorgusu
 * geçirmeye kalkarsa değer istemciyi hiç terk etmez.
 */
function ayrintiyiTemizle(ayrinti: string | undefined): string | undefined {
  if (ayrinti === undefined) return undefined
  const temiz = ayrinti.slice(0, 40).replace(/[^\p{L}\p{N}._/-]/gu, '')
  return temiz === '' ? undefined : temiz
}

export function gozlemOlayi(ad: string, ayrinti?: string): void {
  if (typeof window === 'undefined') return
  window.__gozlemOlay?.(ad, ayrintiyiTemizle(ayrinti))
}
