/**
 * Core Web Vitals — alan verisi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN GEREKTİ: LABORATUVAR SAYISI GERÇEĞİ SÖYLEMİYOR.
 *
 * CI'daki Lighthouse mobil LCP'yi 3,4 sn gösteriyordu ve hiçbir müdahale
 * onu kıpırdatmadı. Raporun ham metriklerine bakılınca sebep çıktı:
 *
 *     observedLargestContentfulPaint : 194 ms
 *     largestContentfulPaint (rapor) : 3.441 ms
 *
 * Aradaki fark bir ölçüm değil bir MODEL: `throttlingMethod: "simulate"`,
 * istek başına 562 ms varsayılan gecikme, 4× CPU yavaşlatma. Yani sayfa
 * 194 ms'de boyanıyor; 3,4 sn onun yavaş bir 4G telefona yansıtılmış hâli.
 *
 * Hedef (LCP < 2,5 sn) yanlış değil — ama hangi sayıyla ölçüleceği belirsizdi.
 * Bu modül o boşluğu kapatıyor: gerçek ziyaretçilerin gerçek cihazlarında
 * ölçülen değerler.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ HAM DEĞER SAKLANMIYOR — HİSTOGRAM SAKLANIYOR.
 *
 * "LCP = 2.431 ms" tek bir ziyarete ait bir kayıttır. Yeterince alanla
 * (rota + cihaz + zaman) birleştiğinde tek bir ziyaretçiyi işaret edebilir
 * ve şartnamenin "tek ziyaretçiye ait kayıt tutulmaz" kuralını zorlar.
 *
 * Bunun yerine değer bir kovaya düşürülüp yalnızca KOVANIN SAYACI artıyor.
 * Veritabanına giden şey "bugün mobilde LCP'si 2–2,5 sn arasında olan 14
 * görüntüleme oldu" — kimseye ait olmayan bir sayı.
 *
 * p75 histogramdan interpolasyonla hesaplanıyor; CrUX'un yaptığı da bu.
 */

/** Topladığımız metrikler. */
export const VITAL_ADLARI = ['LCP', 'CLS', 'INP'] as const
export type VitalAdi = (typeof VITAL_ADLARI)[number]

/**
 * Kova sınırları (üst kenarlar).
 *
 * ⚠️ Sınırlar Google'ın "iyi / geliştirilmeli / zayıf" eşiklerini İÇERİYOR
 * (LCP 2500/4000, CLS 0.1/0.25, INP 200/500). Eşik bir kova kenarına denk
 * gelmezse karne oranı interpolasyonla tahmin edilirdi; kenara oturtmak onu
 * kesin yapıyor.
 *
 * ⚠️ Son kova ÜST SINIRSIZ (`Infinity`). Çok yavaş bir ziyaret 60 sn de
 * sürebilir; onu son kovaya koymak p75'i bozmaz çünkü p75 kova kenarından
 * okunuyor, ortalamadan değil.
 */
export const KOVALAR: Record<VitalAdi, readonly number[]> = {
  LCP: [500, 1000, 1500, 2000, 2500, 3000, 4000, 6000, 10_000, Infinity],
  CLS: [0.02, 0.05, 0.1, 0.15, 0.25, 0.4, 0.6, 1, Infinity],
  INP: [50, 100, 150, 200, 300, 500, 800, 1500, Infinity],
}

/** "İyi" ve "zayıf" eşikleri — Google'ın resmî sınırları. */
export const ESIKLER: Record<VitalAdi, { iyi: number; zayif: number }> = {
  LCP: { iyi: 2500, zayif: 4000 },
  CLS: { iyi: 0.1, zayif: 0.25 },
  INP: { iyi: 200, zayif: 500 },
}

export type Karne = 'iyi' | 'orta' | 'zayif'

export function gecerliVitalMi(ad: string): ad is VitalAdi {
  return (VITAL_ADLARI as readonly string[]).includes(ad)
}

/**
 * Değerin düştüğü kovanın sırası.
 *
 * ⚠️ Negatif ve NaN değerler REDDEDİLİYOR (`null`). Uca elle istek atan biri
 * `-1` gönderip histogramı kirletebilirdi; ayrıca tarayıcıdan gelen bozuk
 * bir değer sessizce ilk kovaya düşerse "site çok hızlı" yanılsaması üretir.
 */
export function kovaSirasi(ad: VitalAdi, deger: number): number | null {
  if (!Number.isFinite(deger) || deger < 0) return null

  const kenarlar = KOVALAR[ad]
  for (let i = 0; i < kenarlar.length; i += 1) {
    const kenar = kenarlar[i]
    if (kenar !== undefined && deger < kenar) return i
  }
  return kenarlar.length - 1
}

export function karne(ad: VitalAdi, deger: number): Karne {
  const esik = ESIKLER[ad]
  if (deger <= esik.iyi) return 'iyi'
  if (deger <= esik.zayif) return 'orta'
  return 'zayif'
}

/**
 * Histogramdan yaklaşık p75.
 *
 * ⚠️ YAKLAŞIK VE BU GİZLENMİYOR. Kova içindeki dağılım düzgün varsayılıyor;
 * gerçek p75 kovanın neresine düştüğü bilinmiyor. CrUX da aynı yöntemi
 * kullanıyor. Panelde "yaklaşık" ibaresi var — kesinmiş gibi göstermek,
 * uydurma veri yasağının istatistik hâli olurdu.
 *
 * ⚠️ Son kova üst sınırsız olduğu için p75 oraya düşerse alt kenar dönüyor
 * ve değer "≥" olarak işaretleniyor: sonsuzu interpolasyona sokmak anlamsız
 * bir sayı üretirdi.
 */
export function p75(
  ad: VitalAdi,
  sayaclar: readonly number[],
): { deger: number; asgari: boolean } | null {
  const toplam = sayaclar.reduce((a, b) => a + b, 0)
  if (toplam === 0) return null

  const hedef = toplam * 0.75
  const kenarlar = KOVALAR[ad]
  let birikim = 0

  for (let i = 0; i < kenarlar.length; i += 1) {
    const adet = sayaclar[i] ?? 0
    if (birikim + adet < hedef) {
      birikim += adet
      continue
    }

    const altKenar = i === 0 ? 0 : (kenarlar[i - 1] ?? 0)
    const ustKenar = kenarlar[i] ?? Infinity

    // Üst sınırsız kova: interpolasyon yapılamaz, alt kenar "en az" olarak döner.
    if (!Number.isFinite(ustKenar)) return { deger: altKenar, asgari: true }

    // Kova içinde düzgün dağılım varsayımı.
    const oran = adet === 0 ? 0 : (hedef - birikim) / adet
    return { deger: altKenar + (ustKenar - altKenar) * oran, asgari: false }
  }

  return null
}

/** Kova sayaçlarından iyi/orta/zayıf oranları. */
export function karneDagilimi(
  ad: VitalAdi,
  sayaclar: readonly number[],
): { iyi: number; orta: number; zayif: number; toplam: number } {
  const kenarlar = KOVALAR[ad]
  const esik = ESIKLER[ad]
  let iyi = 0
  let orta = 0
  let zayif = 0

  for (let i = 0; i < kenarlar.length; i += 1) {
    const adet = sayaclar[i] ?? 0
    if (adet === 0) continue

    /**
     * ⚠️ Kova ÜST kenarına göre sınıflanıyor. Eşikler kova kenarlarına denk
     * geldiği için (KOVALAR notu) bu ayrım kesin: hiçbir kova iki karneye
     * birden yayılmıyor.
     */
    const ust = kenarlar[i] ?? Infinity
    if (ust <= esik.iyi) iyi += adet
    else if (ust <= esik.zayif) orta += adet
    else zayif += adet
  }

  return { iyi, orta, zayif, toplam: iyi + orta + zayif }
}
