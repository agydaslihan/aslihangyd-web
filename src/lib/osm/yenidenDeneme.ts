/**
 * Overpass yeniden deneme politikası — istemci ve sunucu ortak kuralları.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: 504 BİR ARIZA DEĞİL, NORMAL DAVRANIŞ
 *
 * Overpass'ın açık örnekleri ücretsiz ve paylaşımlıdır; yoğun saatlerde
 * 504 (ağ geçidi zaman aşımı) ve 429 (çok fazla istek) dönmesi beklenen
 * bir durumdur. "Bir kere denedik, olmadı" davranışı bu gerçeği kullanıcıya
 * yıkıyordu: Aslıhan butona basıp şansını deniyordu.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ BU DOSYA İSTEMCİDE DE ÇALIŞIR. Ağ kodu burada DEĞİL (`istemci.ts`
 * `server-only`). Burada yalnızca sayılar var, çünkü bekleme sürelerini
 * ekranda sayan da onları uygulayan da aynı değerleri kullanmalı.
 */

/**
 * Toplam deneme sayısı — ilk deneme dahil.
 *
 * ⚠️ Dörtten fazlası nezaketsizlik olurdu: paylaşımlı bir kaynağa
 * ısrarla yüklenmek, o kaynağı herkes için yavaşlatır. Dört deneme
 * yaklaşık bir dakikalık bir pencereye yayılıyor; geçici yoğunluk bu
 * sürede genelde açılıyor, kalıcı arıza ise açılmıyor ve ısrar etmenin
 * anlamı yok.
 */
export const AZAMI_DENEME = 4

/**
 * Denemeler arası bekleme — üstel.
 *
 * İlk deneme beklemesiz. Sonrakiler bu diziden okunur: 5 sn, 15 sn, 45 sn.
 * Üstel artış bilinçli: sunucu yoğunsa hızlı tekrar denemek yoğunluğu
 * artırmaktan başka bir işe yaramaz.
 */
export const BEKLEME_MS: readonly number[] = [5_000, 15_000, 45_000]

/**
 * @param deneme 1'den başlayan deneme sırası
 * @returns Bu denemeden ÖNCE beklenecek süre (ilk deneme için 0)
 */
export function beklemeSuresi(deneme: number): number {
  if (deneme <= 1) return 0
  return BEKLEME_MS[Math.min(deneme - 2, BEKLEME_MS.length - 1)] ?? 0
}

/** Ekranda gösterilecek "tekrar deneniyor" metni. */
export function yenidenDenemeMetni(deneme: number, saniye: number): string {
  return `OpenStreetMap sunucusu yoğun, ${saniye} sn sonra tekrar denenecek (${deneme}/${AZAMI_DENEME})`
}
