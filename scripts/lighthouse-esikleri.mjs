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

/**
 * ═══════════════════════════════════════════════════════════════════════
 * ENGELLEYİCİ KAPILAR — hangi ölçüt koşuyu DÜŞÜRÜR.
 *
 * ⚠️ NEDEN VAR: ANA SAYFA CLS'İ İKİ HAFTA 0,088'DE KALDI (14 Eylül 2026).
 *
 * Hedef 0,000'dı; özet "hedef < 0,1" yazıyor ve her durumda çıkış 0
 * veriyordu. Bütün Lighthouse adımı raporlayıcıydı — bu yüzden bozulma
 * hiçbir yerde kırmızı yakmadı.
 *
 * Ayrım RUNNER'A DUYARLILIK:
 *   · Engelleyici: erişilebilirlik, en iyi uygulamalar, SEO ve CLS.
 *     Denetimleri deterministik; üç koşumda aynı çıkıyor ve medyanları
 *     makinenin hızına bağlı değil. Eşiğin altı bir gerilemedir.
 *   · Raporlayıcı: performans skoru, LCP, TBT. Aynı kod benchmarkIndex
 *     oynayınca 77–100 arası skor üretti; bunları kapı yapmak her koşumda
 *     makineyi tartışmak olurdu. Mobil LCP ayrıca bir karar bekliyor
 *     (docs/ilerleme/2026-09-14-mobil-lcp-karari.md).
 *
 * ⚠️ CLS eşiği SIFIR, "0,1" değil. Google'ın "iyi" sınırı 0,1 ama bu
 * projenin şartnamesi 0,000 istiyor ve haftalarca tuttu; 0,1'e bakan kapı
 * 0,088'i geçirdi.
 * ═══════════════════════════════════════════════════════════════════════
 */
export const ENGELLEYICI_KATEGORILER = ['accessibility', 'best-practices', 'seo']

/** CLS kapısı — medyan bu değeri AŞARSA koşu düşer. */
export const CLS_ESIGI = 0

const KATEGORI_ADI = {
  performance: 'performans',
  accessibility: 'erişilebilirlik',
  'best-practices': 'en iyi uygulamalar',
  seo: 'SEO',
}

/**
 * Bir (cihaz, sayfa) ölçümünün engelleyici kapı bulguları.
 *
 * @param {{ cihaz: string, sayfa: string, kategoriler: Record<string, number | undefined>, cls: number | undefined }} olcum
 *   kategoriler: 0–100 arası medyan puanlar · cls: medyan CLS
 * @returns {string[]} boşsa kapıdan geçti
 */
export function kapiBulgulari({ cihaz, sayfa, kategoriler, cls }) {
  const hedef = cihazEsikleri(cihaz)
  const bulgular = []
  for (const anahtar of ENGELLEYICI_KATEGORILER) {
    const puan = kategoriler[anahtar]
    // ⚠️ Ölçülemeyen kategori GEÇTİ sayılmaz — sessiz boşluk, kapının kendisini açar.
    if (typeof puan !== 'number')
      bulgular.push(`${cihaz}/${sayfa}: ${KATEGORI_ADI[anahtar]} ölçülemedi`)
    else if (puan < hedef[anahtar])
      bulgular.push(`${cihaz}/${sayfa}: ${KATEGORI_ADI[anahtar]} ${puan} < ${hedef[anahtar]}`)
  }
  if (typeof cls !== 'number') bulgular.push(`${cihaz}/${sayfa}: CLS ölçülemedi`)
  else if (cls > CLS_ESIGI) bulgular.push(`${cihaz}/${sayfa}: CLS ${cls.toFixed(4)} > ${CLS_ESIGI}`)
  return bulgular
}
