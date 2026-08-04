/**
 * Paylaşılan seçenek listeleri.
 *
 * Tek kaynak ilkesi: Payload alan tanımı, arayüz etiketi ve filtre menüsü
 * aynı listeden beslenir. Etiket bir yerde değişip başka yerde kalmasın.
 *
 * Değerler (`value`) ASCII slug'dır — veritabanına, URL sorgu parametresine
 * ve API'ye bu haliyle yazılır. Etiketler (`label`) Türkçe'dir.
 */

export interface Secenek<T extends string = string> {
  readonly value: T
  readonly label: string
}

/** Seçenek listesinden değer → etiket sözlüğü üretir. */
export function etiketSozlugu<T extends string>(
  secenekler: readonly Secenek<T>[],
): Record<T, string> {
  return Object.fromEntries(secenekler.map((s) => [s.value, s.label])) as Record<T, string>
}

/** Bir değerin etiketini döner; bilinmeyen değerde `null`. */
export function etiketBul<T extends string>(
  secenekler: readonly Secenek<T>[],
  deger: string | null | undefined,
): string | null {
  return secenekler.find((s) => s.value === deger)?.label ?? null
}

// ── İlan tipi ve kategorisi ────────────────────────────────────────────────

export const ILAN_TIPLERI = [
  { value: 'satilik', label: 'Satılık' },
  { value: 'kiralik', label: 'Kiralık' },
] as const satisfies readonly Secenek[]

export type IlanTipi = (typeof ILAN_TIPLERI)[number]['value']

export const ILAN_KATEGORILERI = [
  { value: 'konut', label: 'Konut' },
  { value: 'isyeri', label: 'İş yeri' },
  { value: 'arsa', label: 'Arsa' },
  { value: 'depo', label: 'Depo' },
  { value: 'fabrika', label: 'Fabrika' },
] as const satisfies readonly Secenek[]

export type IlanKategorisi = (typeof ILAN_KATEGORILERI)[number]['value']

/** Ticari dikeye (Faz 2 `/ticari`) ait kategoriler. */
export const TICARI_KATEGORILER = ['isyeri', 'depo', 'fabrika', 'arsa'] as const

// ── Konut nitelikleri ──────────────────────────────────────────────────────

export const ODA_SAYILARI = [
  { value: '1+0', label: '1+0 (stüdyo)' },
  { value: '1+1', label: '1+1' },
  { value: '2+1', label: '2+1' },
  { value: '3+1', label: '3+1' },
  { value: '4+1', label: '4+1' },
  { value: '5+1', label: '5+1 ve üzeri' },
] as const satisfies readonly Secenek[]

export type OdaSayisi = (typeof ODA_SAYILARI)[number]['value']

export const ISINMA_TIPLERI = [
  { value: 'dogalgaz_kombi', label: 'Doğalgaz (kombi)' },
  { value: 'merkezi', label: 'Merkezi sistem' },
  { value: 'merkezi_pay_olcer', label: 'Merkezi (pay ölçer)' },
  { value: 'yerden_isitma', label: 'Yerden ısıtma' },
  { value: 'klima', label: 'Klima' },
  { value: 'soba', label: 'Soba' },
  { value: 'yok', label: 'Isıtma yok' },
] as const satisfies readonly Secenek[]

export const TAPU_DURUMLARI = [
  { value: 'kat_mulkiyeti', label: 'Kat mülkiyeti' },
  { value: 'kat_irtifaki', label: 'Kat irtifakı' },
  { value: 'arsa_tapulu', label: 'Arsa tapulu' },
  { value: 'hisseli', label: 'Hisseli tapu' },
  { value: 'mustakil', label: 'Müstakil tapulu' },
] as const satisfies readonly Secenek[]

export const BINA_KULLANIM_DURUMLARI = [
  { value: 'bos', label: 'Boş' },
  { value: 'kiracili', label: 'Kiracılı' },
  { value: 'mulk_sahibi', label: 'Mülk sahibi oturuyor' },
] as const satisfies readonly Secenek[]

// ── Talep (lead) alanları ──────────────────────────────────────────────────

export const TALEP_TIPLERI = [
  { value: 'alici', label: 'Alıcı' },
  { value: 'satici', label: 'Satıcı' },
  { value: 'kiraci', label: 'Kiracı' },
  { value: 'ticari', label: 'Ticari' },
  { value: 'degerleme', label: 'Değerleme talebi' },
  { value: 'genel', label: 'Genel bilgi' },
] as const satisfies readonly Secenek[]

export type TalepTipi = (typeof TALEP_TIPLERI)[number]['value']

export const TALEP_KAYNAKLARI = [
  { value: 'organik', label: 'Organik arama' },
  { value: 'dogrudan', label: 'Doğrudan' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'tavsiye', label: 'Tavsiye' },
  { value: 'diger', label: 'Diğer' },
] as const satisfies readonly Secenek[]

export const TALEP_DURUMLARI = [
  { value: 'yeni', label: 'Yeni' },
  { value: 'arandi', label: 'Arandı' },
  { value: 'randevu', label: 'Randevu verildi' },
  { value: 'teklif', label: 'Teklif aşaması' },
  { value: 'kazanildi', label: 'Kazanıldı' },
  { value: 'kaybedildi', label: 'Kaybedildi' },
] as const satisfies readonly Secenek[]

export type TalepDurumu = (typeof TALEP_DURUMLARI)[number]['value']

// ── Konum ──────────────────────────────────────────────────────────────────

/** Faaliyet alanı Çorlu; alanlar yine de düzenlenebilir bırakıldı. */
export const VARSAYILAN_IL = 'Tekirdağ'
export const VARSAYILAN_ILCE = 'Çorlu'
