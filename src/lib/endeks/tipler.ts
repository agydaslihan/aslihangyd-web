/**
 * Çorlu Konut Endeksi — tipler ve sabitler.
 *
 * Metodoloji: `docs/ENDEKS-VERI-YONETIMI.md`
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ İHLAL EDİLEMEZ KURALLAR (CLAUDE.md 6c)
 *
 * - Katman başına minimum 8 gözlem
 * - Toplam minimum 6 ay geçmiş veri
 * - Şartlar sağlanmadan /endeks sayfası YAYINA ALINMAZ (kod seviyesinde engel)
 * - Endeksin adı "İstenen Fiyat Endeksi" — gerçekleşen satış değilse gizlenmez
 * - Her endeks değerinin yanında gözlem sayısı (n) gösterilir
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Katman başına aylık minimum gözlem. Altındaysa önceki ay taşınır. */
export const KATMAN_MINIMUM_GOZLEM = 8

/** Endeksin yayınlanabilmesi için gereken asgari geçmiş. */
export const ASGARI_AY_SAYISI = 6

/** Endeksin yayınlanabilmesi için gereken toplam gözlem. */
export const ASGARI_TOPLAM_GOZLEM = 500

/**
 * Yayın için, ağırlığı bu oranı kapsayan katmanların eşiği tutturması gerekir.
 * (ENDEKS-VERI-YONETIMI.md §5)
 */
export const ASGARI_AGIRLIK_KAPSAMI = 0.7

/** Baz dönem endeks değeri. */
export const BAZ_ENDEKS = 100

export const GOZLEM_TIPLERI = [
  { value: 'satilik', label: 'Satılık' },
  { value: 'kiralik', label: 'Kiralık' },
] as const

export type GozlemTipi = (typeof GOZLEM_TIPLERI)[number]['value']

export const GOZLEM_KAYNAKLARI = [
  { value: 'portal_ilan', label: 'Portal ilan gözlemi (istenen fiyat)' },
  { value: 'kendi_islem', label: 'Kendi işlemimiz (gerçekleşen fiyat)' },
  { value: 'meslektas', label: 'Meslektaş bilgisi (gerçekleşen fiyat)' },
  { value: 'resmi', label: 'Resmî kaynak' },
] as const

export type GozlemKaynagi = (typeof GOZLEM_KAYNAKLARI)[number]['value']

/**
 * Gerçekleşen fiyat sayılan kaynaklar.
 *
 * ⚠️ İstenen fiyat ile gerçekleşen fiyatı karıştırmak endeksi sistematik
 * olarak şişirir (ENDEKS-VERI-YONETIMI.md §1, Tuzak 2). Bu yüzden iki seri
 * ayrı hesaplanır ve endeksin adında "İstenen Fiyat" geçer.
 */
export const GERCEKLESEN_KAYNAKLAR: readonly GozlemKaynagi[] = ['kendi_islem', 'meslektas']

export const GUVEN_SEVIYELERI = [
  { value: 'yuksek', label: 'Yüksek' },
  { value: 'orta', label: 'Orta' },
  { value: 'dusuk', label: 'Düşük (geriye dönük kayıt)' },
] as const

export type GuvenSeviyesi = (typeof GUVEN_SEVIYELERI)[number]['value']

export const ODA_TIPLERI = ['1+1', '2+1', '3+1', '4+1'] as const
export type OdaTipi = (typeof ODA_TIPLERI)[number]

/** Tek bir gözlem — endeks motorunun girdi birimi. */
export interface Gozlem {
  /** 'YYYY-MM' — gözlemin ait olduğu ay. */
  ay: string
  mahalleSlug: string
  odaTipi: string
  tip: GozlemTipi
  kaynak: GozlemKaynagi
  /** m² başına fiyat. Motor bunu kendisi hesaplamaz; giriş anında hesaplanır. */
  m2Fiyati: number
  guvenSeviyesi?: GuvenSeviyesi
}

/** Sepet ağırlığı — mahalle × oda tipi katmanının konut stokundaki payı. */
export interface KatmanAgirligi {
  mahalleSlug: string
  odaTipi: string
  /** 0–1 arası. Tüm ağırlıkların toplamı 1 olmalı. */
  agirlik: number
}

export interface KatmanSonucu {
  mahalleSlug: string
  odaTipi: string
  agirlik: number
  /** Bu ayın medyanı. Eşik tutmadıysa önceki aydan taşınmıştır. */
  medyan: number | null
  gozlemSayisi: number
  /** Değer önceki aydan taşındı mı. */
  tasindi: boolean
}

export interface AylikEndeks {
  ay: string
  /** Nominal endeks değeri. Baz ay = 100. */
  endeks: number | null
  toplamGozlem: number
  katmanlar: KatmanSonucu[]
  /** Değeri taşınan katman sayısı — şeffaflık için gösterilir. */
  tasinanKatmanSayisi: number
  /** Bu ay için hesaba giren ağırlık toplamı (0–1). */
  kapsananAgirlik: number
}

export interface EndeksSerisi {
  bazAy: string
  aylar: AylikEndeks[]
  /** Endeksin kaynağı: istenen fiyat mı, gerçekleşen mi. */
  seriTipi: 'istenen_fiyat' | 'gerceklesen_fiyat'
}

export interface YayinKontrolu {
  yayinlanabilir: boolean
  /** Sağlanmamış koşullar — panelde tek tek gösterilir. */
  engeller: string[]
  /** Sağlanmış koşullar — ilerlemeyi görmek motive eder. */
  saglananlar: string[]
}
