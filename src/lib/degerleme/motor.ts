/**
 * "Evim ne eder?" — anlık değerleme motoru.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * TASARIM İLKELERİ (BAL-KUPU-VE-PORTFOY-YONETIMI.md §B1)
 *
 * 1. **Sonuç iletişim bilgisi vermeden görünür.** Form duvarı yok.
 *    (CLAUDE.md kural 6b — bal küpü kuralı)
 *
 * 2. **Nokta değer değil ARALIK verilir.** "Eviniz 4.437.500 ₺ eder"
 *    cümlesi, sahip olmadığımız bir kesinliği iddia eder. Aralık dürüsttür.
 *
 * 3. **Veri az olan mahallede aralık GENİŞLER ve güven düzeyi düşer.**
 *    Dürüstlük burada satıştır: dar bir aralık verip yanılmak, o müşteriyi
 *    kalıcı kaybettirir.
 *
 * 4. **Yöntem tamamen açıklanır.** Her katsayı ve etkisi gösterilir.
 *    Kara kutu bir değerleme, güven değil şüphe üretir.
 *
 * 5. **Taban m² fiyatı yoksa DEĞERLEME YAPILMAZ.** Model, gerçek gözleme
 *    dayanmayan bir çıktı üretmez. (CLAUDE.md kural 2)
 *
 * 6. **Makine öğrenmesi kullanılmaz.** Açıklanamayan sonuç = güven kaybı.
 *    Model bilinçli olarak çarpımsal ve şeffaf.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { kurusaYuvarla } from '@/lib/hesaplayicilar/tipler'

export const KAT_TIPLERI = [
  { value: 'bodrum', label: 'Bodrum / giriş altı' },
  { value: 'zemin', label: 'Zemin veya bahçe katı' },
  { value: 'ara', label: 'Ara kat' },
  { value: 'yuksek', label: 'Yüksek kat' },
  { value: 'en_ust', label: 'En üst kat / çatı' },
] as const

export type KatTipi = (typeof KAT_TIPLERI)[number]['value']

export const BINA_DURUMLARI = [
  { value: 'sifir', label: 'Sıfır / hiç kullanılmamış' },
  { value: 'iyi', label: 'İyi durumda' },
  { value: 'ortalama', label: 'Ortalama' },
  { value: 'tadilat', label: 'Tadilat gerekiyor' },
] as const

export type BinaDurumu = (typeof BINA_DURUMLARI)[number]['value']

/**
 * Katsayı kümesi — CMS'ten gelir.
 *
 * Tanımsız bir katsayı **1.0 kabul edilmez ve uydurulmaz**: o faktör hesaba
 * hiç katılmaz ve kullanıcıya "bu etki hesaba katılmadı" diye söylenir.
 * Sessizce 1.0 uygulamak, ayarlama yapılmış izlenimi verirdi.
 */
export interface DegerlemeKatsayilari {
  kat: Partial<Record<KatTipi, number>>
  durum: Partial<Record<BinaDurumu, number>>
  /** Yaş aralıkları: üst sınır (dahil) → katsayı. */
  yas: readonly { ustYas: number | null; katsayi: number }[]
}

export const BOS_KATSAYILAR: DegerlemeKatsayilari = { kat: {}, durum: {}, yas: [] }

export interface DegerlemeGirdisi {
  /** Mahallenin medyan m² satış fiyatı. Yoksa değerleme yapılmaz. */
  mahalleM2Fiyati?: number | null
  /** Mahalle rakamlarının kaç gözleme dayandığı — güven düzeyini belirler. */
  gozlemSayisi?: number | null
  brutM2?: number | null
  kat?: KatTipi | null
  binaYasi?: number | null
  durum?: BinaDurumu | null
}

export type GuvenDuzeyi = 'dusuk' | 'orta' | 'yuksek'

export const GUVEN_ETIKETLERI: Record<GuvenDuzeyi, string> = {
  dusuk: 'Düşük',
  orta: 'Orta',
  yuksek: 'Yüksek',
}

/**
 * Güven düzeyi eşikleri.
 *
 * 8 gözlem, `docs/ENDEKS-VERI-YONETIMI.md` §3.2'deki katman başına minimum
 * gözlem eşiğiyle aynı sayı — aynı veriden besleniyorlar, tutarlı olmalılar.
 */
export const GUVEN_ESIKLERI = { orta: 8, yuksek: 25 } as const

/**
 * Güven düzeyine göre aralık genişliği (± yüzde, ondalık).
 *
 * Az veri = geniş aralık. Bu, modelin zayıflığını gizlemek yerine
 * göstermesidir.
 */
export const ARALIK_GENISLIKLERI: Record<GuvenDuzeyi, number> = {
  yuksek: 0.07,
  orta: 0.1,
  dusuk: 0.15,
}

export interface KatsayiEtkisi {
  ad: string
  /** Uygulanan katsayı. */
  katsayi: number
  aciklama: string
}

export interface DegerlemeSonucu {
  altDeger: number
  ustDeger: number
  /** Aralığın ortası — yalnızca iç kullanım ve kayıt için, arayüzde ÖNE ÇIKARILMAZ. */
  ortaDeger: number
  m2BirimFiyati: number
  guvenDuzeyi: GuvenDuzeyi
  gozlemSayisi: number | null
  aralikYuzdesi: number
  /** Uygulanan katsayılar — arayüzde tek tek gösterilir. */
  etkiler: KatsayiEtkisi[]
  /** Katsayısı tanımlı olmadığı için hesaba katılamayan faktörler. */
  katilmayanFaktorler: string[]
}

export type DegerlemeCiktisi =
  | { durum: 'hesaplandi'; veri: DegerlemeSonucu }
  | { durum: 'veri_yok'; sebep: 'mahalle_verisi_yok' | 'm2_girilmedi' }

export function degerlemeYap(
  girdi: DegerlemeGirdisi,
  katsayilar: DegerlemeKatsayilari,
): DegerlemeCiktisi {
  const taban = girdi.mahalleM2Fiyati
  if (typeof taban !== 'number' || !Number.isFinite(taban) || taban <= 0) {
    // ⚠️ Bu, modelin en önemli kapısı. Taban fiyat gerçek gözleme dayanır;
    // yoksa üretilecek her sayı uydurmadır.
    return { durum: 'veri_yok', sebep: 'mahalle_verisi_yok' }
  }

  const m2 = girdi.brutM2
  if (typeof m2 !== 'number' || !Number.isFinite(m2) || m2 <= 0) {
    return { durum: 'veri_yok', sebep: 'm2_girilmedi' }
  }

  const etkiler: KatsayiEtkisi[] = []
  const katilmayanFaktorler: string[] = []

  // ── Kat etkisi ──
  if (girdi.kat) {
    const katsayi = katsayilar.kat[girdi.kat]
    if (typeof katsayi === 'number') {
      etkiler.push({
        ad: 'Bulunduğu kat',
        katsayi,
        aciklama: KAT_TIPLERI.find((tip) => tip.value === girdi.kat)?.label ?? girdi.kat,
      })
    } else {
      katilmayanFaktorler.push('Kat etkisi')
    }
  }

  // ── Yaş etkisi ──
  if (typeof girdi.binaYasi === 'number' && girdi.binaYasi >= 0) {
    const dilim = yasDilimiBul(katsayilar.yas, girdi.binaYasi)
    if (dilim) {
      etkiler.push({
        ad: 'Bina yaşı',
        katsayi: dilim.katsayi,
        aciklama: dilim.ustYas === null ? `${girdi.binaYasi} yaş` : `${girdi.binaYasi} yaş`,
      })
    } else {
      katilmayanFaktorler.push('Bina yaşı etkisi')
    }
  }

  // ── Durum etkisi ──
  if (girdi.durum) {
    const katsayi = katsayilar.durum[girdi.durum]
    if (typeof katsayi === 'number') {
      etkiler.push({
        ad: 'Yapı durumu',
        katsayi,
        aciklama: BINA_DURUMLARI.find((tip) => tip.value === girdi.durum)?.label ?? girdi.durum,
      })
    } else {
      katilmayanFaktorler.push('Yapı durumu etkisi')
    }
  }

  const toplamKatsayi = etkiler.reduce((carpim, etki) => carpim * etki.katsayi, 1)
  const m2BirimFiyati = kurusaYuvarla(taban * toplamKatsayi)
  const ortaDeger = kurusaYuvarla(m2BirimFiyati * m2)

  const guvenDuzeyi = guvenDuzeyiBelirle(girdi.gozlemSayisi, katilmayanFaktorler.length)
  const genislik = ARALIK_GENISLIKLERI[guvenDuzeyi]

  return {
    durum: 'hesaplandi',
    veri: {
      altDeger: Math.round(ortaDeger * (1 - genislik)),
      ustDeger: Math.round(ortaDeger * (1 + genislik)),
      ortaDeger,
      m2BirimFiyati,
      guvenDuzeyi,
      gozlemSayisi: typeof girdi.gozlemSayisi === 'number' ? girdi.gozlemSayisi : null,
      aralikYuzdesi: genislik,
      etkiler,
      katilmayanFaktorler,
    },
  }
}

/**
 * Güven düzeyi.
 *
 * Yalnızca gözlem sayısına değil, **hesaba katılamayan faktör sayısına** da
 * bakılır. Kat ve yaş etkisi uygulanamamışsa tahmin, gözlem bol olsa bile
 * daha az güvenilirdir.
 */
function guvenDuzeyiBelirle(
  gozlemSayisi: number | null | undefined,
  eksikFaktorSayisi: number,
): GuvenDuzeyi {
  if (typeof gozlemSayisi !== 'number' || gozlemSayisi < GUVEN_ESIKLERI.orta) return 'dusuk'
  if (eksikFaktorSayisi >= 2) return 'dusuk'

  if (gozlemSayisi >= GUVEN_ESIKLERI.yuksek && eksikFaktorSayisi === 0) return 'yuksek'
  return 'orta'
}

function yasDilimiBul(
  dilimler: DegerlemeKatsayilari['yas'],
  yas: number,
): { ustYas: number | null; katsayi: number } | null {
  if (dilimler.length === 0) return null

  // Üst sınırı olmayan dilim ("ve üzeri") her zaman sona.
  const sirali = [...dilimler].sort((a, b) => {
    if (a.ustYas === null) return 1
    if (b.ustYas === null) return -1
    return a.ustYas - b.ustYas
  })

  for (const dilim of sirali) {
    if (dilim.ustYas === null || yas <= dilim.ustYas) return dilim
  }

  return sirali.at(-1) ?? null
}
