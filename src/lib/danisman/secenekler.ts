/**
 * Danışman başvurusu seçenekleri.
 *
 * Hem koleksiyon şemasında hem formda hem Zod doğrulamasında aynı liste
 * kullanılır: üç yerde ayrı yazılan bir seçenek listesi, er ya da geç
 * ayrışır ve "geçersiz değer" hatası üretir.
 */

export interface Secenek {
  value: string
  label: string
}

export const DENEYIM_SECENEKLERI = [
  { value: 'yok', label: 'Deneyimim yok' },
  { value: '1_3', label: '1–3 yıl' },
  { value: '3_arti', label: '3 yıl ve üzeri' },
] as const satisfies readonly Secenek[]

export type Deneyim = (typeof DENEYIM_SECENEKLERI)[number]['value']
