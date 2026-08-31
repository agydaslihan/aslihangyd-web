/**
 * Payload yükleme alanını adres ve alt metne çevirir.
 *
 * ⚠️ `depth: 0` ile okunmuş bir kayıtta bu alan bir SAYI (kimlik) oluyor,
 * `depth: 1` ile bir nesne. Aynı alanı iki yerde iki farklı biçimde
 * kontrol etmek, bir tarafın sessizce `null` üretmesine açık kapı: görsel
 * panelde dolu, sayfada boş görünür ve hata çıkmaz.
 */
export interface CozulmusMedya {
  url: string
  alt: string | null
}

export function medyaCoz(ham: unknown): CozulmusMedya | null {
  if (typeof ham !== 'object' || ham === null) return null
  const kayit = ham as { url?: unknown; alt?: unknown }
  if (typeof kayit.url !== 'string' || kayit.url === '') return null
  return { url: kayit.url, alt: typeof kayit.alt === 'string' ? kayit.alt : null }
}
