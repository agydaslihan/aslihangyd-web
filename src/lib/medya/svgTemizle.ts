/**
 * Yüklenen SVG'lerin temizlenmesi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN GEREKLİ: SVG BİR GÖRSEL DEĞİL, BİR BELGEDİR.
 *
 * `<img src="logo.svg">` içindeki betik çalışmaz — ama dosya kendi
 * adresinden doğrudan açıldığında (`/api/medya/file/logo.svg`) tarayıcı onu
 * bir XML belgesi olarak açar ve içindeki `<script>` BİZİM kaynağımızda
 * çalışır. Oturum çerezleri, panel erişimi, hepsi aynı kaynakta.
 *
 * Yükleyen kişinin yönetici olması bu riski küçültür, kaldırmaz: bir
 * yönetici indirdiği "ücretsiz logo"nun içinde ne olduğunu bilmiyor
 * olabilir.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ BU TAM BİR XML AYRIŞTIRICISI DEĞİL VE OLDUĞUNU İDDİA ETMİYOR.
 *
 * Tam çözüm DOMPurify + jsdom; ikisi birlikte sunucuya ~10 MB ve yalnızca
 * yönetici yükleme yolunda kullanılacak bir bağımlılık ekliyor. Buradaki
 * temizleyici, bilinen saldırı yüzeylerini kaldırıyor:
 *
 *   · `<script>`, `<foreignObject>`, `<iframe>`, `<embed>`, `<object>`
 *   · `on*` olay öznitelikleri (onload, onclick…)
 *   · `javascript:` adresleri
 *   · dış referanslar (`href`, `xlink:href`, `<use>` uzak hedefleri)
 *   · `<style>` içindeki `@import` ve `expression(`
 *
 * ⚠️ Kalan risk bilinçli kabul ediliyor ve tek başına taşınmıyor: yükleme
 * yalnızca yöneticide ve dosyalar kendi kaynağımızdan servis ediliyor.
 * Karar değişirse doğru adım DOMPurify eklemek, bu dosyayı büyütmek değil.
 */

/** Temizlik sonucu — ne çıkarıldığı panelde/günlükte söylenebilsin diye. */
export interface TemizlikSonucu {
  icerik: string
  /** Kaldırılan yapıların adları; boşsa dosya zaten temizdi. */
  kaldirilanlar: string[]
}

const TEHLIKELI_ETIKETLER = ['script', 'foreignObject', 'iframe', 'embed', 'object', 'handler']

export function svgMi(mimeTipi: string | null | undefined, dosyaAdi?: string | null): boolean {
  if (typeof mimeTipi === 'string' && mimeTipi.toLowerCase().includes('svg')) return true
  return typeof dosyaAdi === 'string' && dosyaAdi.toLowerCase().endsWith('.svg')
}

export function svgTemizle(ham: string): TemizlikSonucu {
  const kaldirilanlar: string[] = []
  let icerik = ham

  const sil = (desen: RegExp, ad: string) => {
    if (!desen.test(icerik)) return
    icerik = icerik.replace(desen, '')
    if (!kaldirilanlar.includes(ad)) kaldirilanlar.push(ad)
  }

  for (const etiket of TEHLIKELI_ETIKETLER) {
    // Hem `<script>…</script>` hem kendi kendine kapanan `<script/>`.
    sil(new RegExp(`<${etiket}\\b[\\s\\S]*?</${etiket}\\s*>`, 'gi'), `<${etiket}>`)
    sil(new RegExp(`<${etiket}\\b[^>]*/>`, 'gi'), `<${etiket}>`)
  }

  /**
   * ⚠️ Olay öznitelikleri hem tırnaklı hem tırnaksız yazılabiliyor.
   * `on` ile başlayan HER öznitelik gidiyor; SVG'nin görsel işlevlerinden
   * hiçbiri `on*` kullanmıyor.
   */
  sil(/\son[a-z-]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, 'on* öznitelikleri')

  // `javascript:` adresleri — öznitelik değeri içinde nerede olursa olsun.
  sil(/(?:href|xlink:href|src)\s*=\s*("|')\s*javascript:[^"']*\1/gi, 'javascript: adresleri')

  /**
   * ⚠️ DIŞ REFERANSLAR KALDIRILIYOR, İÇ REFERANSLAR KALIYOR.
   *
   * `href="#gradyan"` SVG'nin kendi içindeki tanıma işaret ediyor ve
   * görselin çalışması için gerekli. `href="https://…"` ise dosyanın
   * dışarıya istek atması demek — logo, ziyaretçinin IP'sini üçüncü bir
   * sunucuya bildiren bir izleyiciye dönüşebilir.
   */
  sil(/\s(?:xlink:href|href|src)\s*=\s*("|')(?:https?:)?\/\/[^"']*\1/gi, 'dış referanslar')
  sil(/\s(?:xlink:href|href|src)\s*=\s*("|')data:(?!image\/)[^"']*\1/gi, 'data: referansları')

  // `<style>` içindeki dış kaynak ve eski IE ifadeleri.
  sil(/@import\b[^;]*;?/gi, '@import')
  sil(/expression\s*\([^)]*\)/gi, 'expression()')

  return { icerik, kaldirilanlar }
}
