/**
 * Lighthouse kapı eşikleri — TEK KAYNAK.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * ⚠️ NEDEN AYRI DOSYA: YANLIŞ EŞİK, DOĞRU ÖLÇÜMDEN ZARARLIDIR.
 *
 * 20 Ağustos 2026'da özet betiği hâlâ eski şartnamenin sayılarını
 * kullanıyordu (her cihazda performans ≥90) ve `/portfoy` mobilini 89 ile
 * uyarı işaretliyordu — oysa geçerli taban 75'ti. Her koşumda kırmızı
 * gören bir kapı, kısa sürede görmezden gelinen bir kapıya dönüşür ve o
 * noktada gerçek bir gerileme de fark edilmez.
 *
 * Eşikler bu yüzden tek yerde ve `CLAUDE.md`deki tabloyla test tarafından
 * karşılaştırılıyor (`src/lib/olcum/lighthouseEsikleri.test.ts`). İkisi
 * ayrışırsa test kırılıyor — hangisi doğruysa diğeri ona çekilir.
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ⚠️ MOBİL EŞİĞİ BİR İNDİRİM DEĞİL, ÖLÇÜLMÜŞ BİR GERÇEK. Mobil performans
 * skoru simüle edilmiş 4G (istek başına ~562 ms) ve 4× CPU yavaşlatmayla
 * hesaplanıyor. Aynı sayfa masaüstünde 100 alırken mobilde 90 alıyorsa
 * arada bir arıza değil bir model farkı var.
 *
 * ⚠️ `.mjs` ve TypeScript değil: hem ölçüm betiği (Node, derlemesiz) hem
 * de vitest testi aynı dosyayı okuyabilsin diye.
 */

export const LIGHTHOUSE_ESIKLERI = {
  masaustu: {
    performance: 90,
    accessibility: 95,
    'best-practices': 100,
    seo: 100,
  },
  mobil: {
    performance: 75,
    accessibility: 95,
    'best-practices': 100,
    seo: 100,
  },
}

/**
 * Bilinmeyen cihaz anahtarı için masaüstü eşiği — DAHA SIKI OLAN.
 *
 * ⚠️ Yanlış tarafta yanılmak: bilinmeyen bir cihaza gevşek eşik uygulamak,
 * kapıyı sessizce açık bırakırdı.
 */
export function cihazEsikleri(cihaz) {
  return LIGHTHOUSE_ESIKLERI[cihaz] ?? LIGHTHOUSE_ESIKLERI.masaustu
}
