/**
 * Sayı ve para biçimlendirme.
 *
 * Tek kural: **veri yoksa `null` döner.** Hiçbir biçimlendirici "0 ₺",
 * "—" veya "Belirtilmemiş" üretmez. Boş durumu nasıl göstereceğine çağıran
 * bileşen karar verir; bir yatırım sitesinde "0 ₺" yazmak, veri olmadığını
 * söylemekten çok daha zararlıdır.
 */

const PARA_BIRIMI_SEMBOLU: Record<string, string> = {
  TRY: '₺',
  USD: '$',
  EUR: '€',
}

const tamSayi = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 })
const birOndalik = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})
const esnekOndalik = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 })

function gecerliSayi(deger: number | null | undefined): deger is number {
  return typeof deger === 'number' && Number.isFinite(deger)
}

/** "4.800.000 ₺" */
export function paraYaz(deger: number | null | undefined, paraBirimi = 'TRY'): string | null {
  if (!gecerliSayi(deger)) return null
  const sembol = PARA_BIRIMI_SEMBOLU[paraBirimi] ?? paraBirimi
  return `${tamSayi.format(deger)} ${sembol}`
}

/**
 * "4,8 M ₺" — kart ve liste görünümleri için kısaltılmış para.
 *
 * Mobilde 4.800.000 ₺ kart genişliğini zorlar ve satır kırar. Kısa biçim
 * taranabilirliği artırır; tam değer detay sayfasında görünür.
 */
export function paraKisaYaz(deger: number | null | undefined, paraBirimi = 'TRY'): string | null {
  if (!gecerliSayi(deger)) return null
  const sembol = PARA_BIRIMI_SEMBOLU[paraBirimi] ?? paraBirimi

  const mutlak = Math.abs(deger)
  if (mutlak >= 1_000_000) {
    const milyon = deger / 1_000_000
    // 4,8 M gösterilir ama 12 M'de gereksiz ",0" yazılmaz.
    const metin = Math.abs(milyon) >= 10 ? tamSayi.format(milyon) : birOndalik.format(milyon)
    return `${metin} M ${sembol}`
  }
  if (mutlak >= 1_000) {
    return `${tamSayi.format(deger / 1_000)} B ${sembol}`
  }
  return `${tamSayi.format(deger)} ${sembol}`
}

/** "%5,2" — Türkçe'de yüzde işareti sayının ÖNÜNE gelir. */
export function yuzdeYaz(deger: number | null | undefined, ondalik = 1): string | null {
  if (!gecerliSayi(deger)) return null
  const bicim = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: ondalik,
    maximumFractionDigits: ondalik,
  })
  return `%${bicim.format(deger)}`
}

/** "+%5,2" / "−%3,1" — değişim gösterimleri için işaretli yüzde. */
export function degisimYaz(deger: number | null | undefined, ondalik = 1): string | null {
  const metin = yuzdeYaz(Math.abs(deger ?? Number.NaN), ondalik)
  if (metin === null || !gecerliSayi(deger)) return null
  if (deger > 0) return `+${metin}`
  // U+2212 gerçek eksi işareti; kısa çizgiden daha okunaklı hizalanır.
  if (deger < 0) return `−${metin}`
  return metin
}

/** "1.234" */
export function sayiYaz(deger: number | null | undefined): string | null {
  if (!gecerliSayi(deger)) return null
  return tamSayi.format(deger)
}

/** "135 m²" */
export function m2Yaz(deger: number | null | undefined): string | null {
  if (!gecerliSayi(deger)) return null
  return `${tamSayi.format(deger)} m²`
}

/** "17,4 yıl" — amortisman ve kira çarpanı gösterimi. */
export function yilYaz(deger: number | null | undefined): string | null {
  if (!gecerliSayi(deger)) return null
  return `${esnekOndalik.format(deger)} yıl`
}

/** "17,4" — birimsiz çarpan. */
export function carpanYaz(deger: number | null | undefined): string | null {
  if (!gecerliSayi(deger)) return null
  return esnekOndalik.format(deger)
}

/**
 * "850 m" / "3,4 km" — kuş uçuşu mesafe.
 *
 * ⚠️ Bu değer **hiçbir zaman dakikaya çevrilmez.** Süre için yol ağı ve
 * rotalama motoru gerekir; mesafeyi varsayılan bir hıza bölüp "12 dakika"
 * yazmak bilmediğimiz bir şeyi iddia etmek olur (CLAUDE.md kural 2).
 * Arayüzde daima "kuş uçuşu" etiketiyle birlikte gösterilir.
 */
export function mesafeYaz(metre: number | null | undefined): string | null {
  if (!gecerliSayi(metre) || metre < 0) return null
  if (metre < 1_000) return `${tamSayi.format(Math.round(metre))} m`
  return `${birOndalik.format(metre / 1_000)} km`
}

/**
 * WhatsApp bağlantısı üretir. Numara yoksa `null` — çağıran butonu gizler.
 * Numara yalnızca rakamlara indirgenir; başındaki `+`, boşluk ve parantez
 * wa.me tarafından kabul edilmez.
 */
export function whatsappBaglantisi(
  numara: string | null | undefined,
  mesaj?: string,
): string | null {
  if (typeof numara !== 'string') return null
  const rakamlar = numara.replace(/\D/g, '')
  if (rakamlar.length < 10) return null

  /**
   * ─────────────────────────────────────────────────────────────────────
   * ⚠️ `wa.me` ULUSLARARASI BİÇİM İSTİYOR — BAŞTAKİ SIFIR BAĞLANTIYI
   *    SESSİZCE BOZUYOR.
   *
   * Kurumsal numara panele `905...` diye giriliyor ve sorun çıkarmıyordu.
   * Ama müşteri iletişim formuna telefonunu `0536...` diye yazıyor ve
   * `wa.me/05364213083` açılan sayfada "numara geçersiz" diyor. Hata
   * görünür değil: bağlantı çalışıyor, WhatsApp açılıyor, yalnızca kişi
   * bulunamıyor.
   *
   * Ölçümle yakalandı: ters eşleştirme ekranındaki bağlantı incelendiğinde
   * çıktı. İki dönüşüm yeterli:
   *   · `0XXXXXXXXXX` (11 hane, sıfırla başlıyor) → `90XXXXXXXXXX`
   *   · `XXXXXXXXXX`  (10 hane, sıfırsız)        → `90XXXXXXXXXX`
   *
   * ⚠️ Ülke kodu zaten varsa (12 hane, `90` ile başlıyor) dokunulmuyor;
   * yabancı bir numara da olduğu gibi geçiyor.
   * ─────────────────────────────────────────────────────────────────────
   */
  const uluslararasi =
    rakamlar.length === 11 && rakamlar.startsWith('0')
      ? `90${rakamlar.slice(1)}`
      : rakamlar.length === 10
        ? `90${rakamlar}`
        : rakamlar

  const temel = `https://wa.me/${uluslararasi}`
  return mesaj ? `${temel}?text=${encodeURIComponent(mesaj)}` : temel
}
