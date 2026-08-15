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
 * Kota (429) durumunda bekleme — normalden çok daha uzun.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ 429 DİĞER HATALARDAN FARKLI: ISRAR DURUMU KÖTÜLEŞTİRİR.
 *
 * 504 "sunucu şu an yetişemedi" demek; birkaç saniye sonra tekrar denemek
 * makul. 429 "seni geçici olarak kısıtladım" demek — üstüne gitmek
 * kısıtlama penceresini uzatır.
 *
 * ⚠️ DENEME SAYISI ARTIRILMADI, yalnızca bekleme uzatıldı. 429'da agresif
 * olmak yanlış yön: doğru tepki daha çok denemek değil, daha çok beklemek.
 * ─────────────────────────────────────────────────────────────────────────
 */
export const KOTA_BEKLEME_MS: readonly number[] = [60_000, 180_000, 180_000]

/**
 * @param deneme 1'den başlayan deneme sırası
 * @param kota Kota sınırı (429) mı — bekleme merdivenini belirler
 * @returns Bu denemeden ÖNCE beklenecek süre (ilk deneme için 0)
 */
export function beklemeSuresi(deneme: number, kota = false): number {
  if (deneme <= 1) return 0
  const merdiven = kota ? KOTA_BEKLEME_MS : BEKLEME_MS
  return merdiven[Math.min(deneme - 2, merdiven.length - 1)] ?? 0
}

/** Süreyi "45 sn" / "3 dk" biçiminde yazar — dakikalarca "180 sn" okunmuyor. */
export function sureMetni(saniye: number): string {
  if (saniye < 90) return `${saniye} sn`
  return `${Math.round(saniye / 60)} dk`
}

/** Ekranda gösterilecek "tekrar deneniyor" metni. */
export function yenidenDenemeMetni(deneme: number, saniye: number): string {
  return `OpenStreetMap sunucusu yoğun, ${sureMetni(saniye)} sonra tekrar denenecek (${deneme}/${AZAMI_DENEME})`
}

/**
 * Kota sınırı metni — bunun bir arıza DEĞİL kota olduğunu söyler.
 *
 * ⚠️ Bu ayrım kullanıcıya açıkça söyleniyor. "Hata" diye okuyan biri
 * butona tekrar tekrar basar ve tam olarak yapılmaması gerekeni yapar.
 */
export function kotaMetni(deneme: number, saniye: number): string {
  return (
    `Sunucu bizi geçici olarak kısıtladı (kota sınırı) — bu bir hata değil. ` +
    `${sureMetni(saniye)} sonra tekrar denenecek (${deneme}/${AZAMI_DENEME}). ` +
    `Tekrar tekrar denemek süreyi uzatır.`
  )
}
