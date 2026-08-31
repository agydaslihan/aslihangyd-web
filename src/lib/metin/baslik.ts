/**
 * İlan başlıklarını cümle düzenine çevirir.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ CSS `text-transform` DEĞİL, GERÇEK DÖNÜŞÜM — VE SEBEBİ SEO.
 *
 * `text-transform` yalnızca çizimi değiştirir; kaynakta, `<title>`
 * etiketinde, site haritasında, OG etiketinde ve arama motoru dizininde
 * başlık hâlâ "KERVANCI CİTY 3 HAVUZ CEPHE SATILIK ARA KAT 3+1 DAİRE"
 * olarak durur. Tamamı büyük harf bir başlık arama sonuçlarında
 * bağırıyor gibi görünür.
 *
 * ⚠️ VERİ DEĞİŞTİRİLMİYOR. Kayıttaki başlık olduğu gibi kalıyor; dönüşüm
 * yalnızca gösterimde. Aslıhan'ın yazdığını sessizce değiştirmek, bir gün
 * "ben böyle yazmamıştım" denecek bir durum üretirdi. Panel bunun yerine
 * uyarıyor.
 *
 * ⚠️ TÜRKÇE BÜYÜK/KÜÇÜK HARF TUZAĞI: `toLowerCase()` "I" harfini "i"
 * yapıyor — Türkçede yanlış. `toLocaleLowerCase('tr')` doğru olanı
 * yapıyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Başlık tamamı büyük harf mi?
 *
 * ⚠️ Kısa metinler es geçiliyor: "3+1 DAİRE" zaten kısa ve dönüşüm bir
 * şey kazandırmıyor.
 */
export function tamamiBuyukMu(metin: string): boolean {
  const harfler = metin.replace(/[^\p{L}]/gu, '')
  if (harfler.length < 8) return false
  return harfler === harfler.toLocaleUpperCase('tr')
}

/**
 * Cümle düzenine çevirir — yalnızca tamamı büyük harfse.
 *
 * ⚠️ TÜMÜYLE KÜÇÜK HARFE ÇEVİRMİYOR. "kervancı city 3 havuz cephe" de
 * yanlış olurdu: özel adlar ve mahalle adları büyük harfle başlar. Her
 * kelimenin ilk harfi büyük, gerisi küçük.
 *
 * ⚠️ KISALTMALAR AÇIK LİSTEDEN, UZUNLUKTAN TAHMİN EDİLEREK DEĞİL.
 *
 * İlk sürüm "2–4 harfli tamamı büyük parça kısaltmadır" diyordu ve test
 * onu çürüttü: "ARA KAT" ve "CİTY" de o kalıba uyuyor ve büyük harf
 * kalıyordu. Kısaltma bir uzunluk meselesi değil, bir sözlük meselesi.
 *
 * ⚠️ TÜRKÇE "I" BELİRSİZLİĞİ ÇÖZÜLEMEZ VE ÇÖZÜLMEYE ÇALIŞILMIYOR.
 * "ISITMALI" doğru yazılmışsa "Isıtmalı" olur — doğru. Ama biri
 * "MERKEZİ" yerine "MERKEZI" yazdıysa sonuç "Merkezı" olur; girdi zaten
 * yanlıştı. Hangi "I"nın hangisi olduğunu bilmek sözlük ister ve
 * tahmin etmek, uydurmanın başka bir biçimi olurdu. Panel bu yüzden
 * "cümle düzeninde yazın" diye uyarıyor.
 */
const KISALTMALAR = new Set([
  'OSB',
  'AVM',
  'TOKİ',
  'TOKI',
  'TEM',
  'KDV',
  'TSO',
  'VIP',
  'ADSL',
  'LPG',
  'AVİ',
])

export function cumleDuzenineCevir(metin: string): string {
  if (!tamamiBuyukMu(metin)) return metin

  return metin
    .split(/(\s+)/)
    .map((parca) => {
      if (parca === '' || /^\s+$/.test(parca)) return parca

      // Noktalama olmadan sadeleştirilmiş hâli kısaltma listesinde mi?
      if (KISALTMALAR.has(parca.replace(/[^\p{L}\p{N}]/gu, ''))) return parca

      const ilk = parca.slice(0, 1)
      return ilk.toLocaleUpperCase('tr') + parca.slice(1).toLocaleLowerCase('tr')
    })
    .join('')
}
