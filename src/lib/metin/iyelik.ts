/**
 * Sayıya kesme işaretiyle iyelik eki — "6 eksikten 2’si tamamlandı".
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: SAYAÇ "0’si" YAZIYORDU.
 *
 * EİDS sayacında ek sabit `’si` idi ve yalnızca 2 ile 7'de doğruydu.
 * Türkçede ek rakama değil sayının OKUNUŞUNUN son kelimesine uyar:
 * sıfır → 0’ı, bir → 1’i, üç → 3’ü, altı → 6’sı, on → 10’u, kırk → 40’ı.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Son rakamın okunuşuna göre ek (1–9). */
const BIRLER = ['', 'i', 'si', 'ü', 'ü', 'i', 'sı', 'si', 'i', 'u'] as const

/** Onlar basamağının okunuşuna göre ek (10–90). */
const ONLAR = ['', 'u', 'si', 'u', 'ı', 'si', 'ı', 'i', 'i', 'ı'] as const

/** Negatif olmayan tam sayı için `n’ek` döner. */
export function sayiIyelik(sayi: number): string {
  if (!Number.isInteger(sayi) || sayi < 0) throw new Error(`Desteklenmeyen sayı: ${sayi}`)

  return `${sayi}’${iyelikEki(sayi)}`
}

function iyelikEki(sayi: number): string {
  if (sayi === 0) return 'ı' // sıfır
  if (sayi % 10 !== 0) return BIRLER[sayi % 10] ?? ''
  if (sayi % 100 !== 0) return ONLAR[Math.floor(sayi / 10) % 10] ?? ''
  if (sayi % 1000 !== 0) return 'ü' // yüz
  if (sayi % 1_000_000 !== 0) return 'i' // bin
  return 'u' // milyon
}
