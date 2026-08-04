/**
 * Türkçe karakterleri doğru çeviren slug üretici.
 *
 * Neden hazır paket kullanmıyoruz: yaygın slugify paketleri Türkçe'de iki
 * hata yapar — "ı" harfini düşürür ("Hıdırağa" → "hdraa") ve büyük "İ"yi
 * "i̇" (i + birleştirici nokta) olarak bırakır. Slug'lar kalıcı URL'lerdir;
 * sonradan düzeltmek 301 yönlendirme borcu demektir.
 */

const TURKCE_HARFLER: Record<string, string> = {
  ç: 'c',
  Ç: 'c',
  ğ: 'g',
  Ğ: 'g',
  ı: 'i',
  I: 'i',
  İ: 'i',
  i: 'i',
  ö: 'o',
  Ö: 'o',
  ş: 's',
  Ş: 's',
  ü: 'u',
  Ü: 'u',
  â: 'a',
  Â: 'a',
  î: 'i',
  Î: 'i',
  û: 'u',
  Û: 'u',
}

export function slugUret(metin: string): string {
  return (
    metin
      .split('')
      .map((harf) => TURKCE_HARFLER[harf] ?? harf)
      .join('')
      .toLowerCase()
      // Kalan aksanları ayrıştırıp at (é → e gibi).
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  )
}
