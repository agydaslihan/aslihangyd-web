/**
 * Mahalle Eşleştirme Testi — ortak tipler ve ölçüt kayıt defteri.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * TASARIM KARARI: ağırlıklar kodda, mahalle öznitelikleri CMS'te.
 *
 * Bu ayrım yatırım skorundaki ayrımın aynısı ve aynı gerekçeye dayanıyor:
 *
 *  - **Ağırlıklar metodolojidir**, veri değil. "Çocuklu bir hane için okul
 *    erişimi ne kadar önemli?" sorusunun cevabı Çorlu'ya özgü bir ölçüm
 *    değil, aracın açıkça ilan ettiği bir tercihtir. Bu yüzden kodda durur
 *    ve /mahalle-eslestirme-metodolojisi sayfasında yayınlanır.
 *
 *  - **Mahalle öznitelikleri veridir.** "Şeyhsinan ne kadar sakindir?"
 *    sorusunun cevabını ancak orayı bilen biri verebilir. Bu yüzden CMS'ten
 *    girilir, başlangıç değeri KONULMAZ ve girilmeyen öznitelik hesaba
 *    katılmaz (CLAUDE.md kural 2).
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Bir mahallenin eşleştirmede kullanılan öznitelikleri, 0–100. */
export type OlcutAdi =
  | 'yatirimPotansiyeli'
  | 'sanayiYakinligi'
  | 'ulasim'
  | 'topluTasima'
  | 'sosyalDonati'
  | 'okulErisimi'
  | 'sessizlik'
  | 'merkezeYakinlik'
  | 'erisilebilirlik'

export const OLCUT_ETIKETLERI: Record<OlcutAdi, string> = {
  yatirimPotansiyeli: 'Yatırım potansiyeli',
  sanayiYakinligi: 'Sanayi ve istihdam yakınlığı',
  ulasim: 'Ulaşım erişilebilirliği',
  topluTasima: 'Toplu taşıma',
  sosyalDonati: 'Sosyal donatı',
  okulErisimi: 'Okul erişimi',
  sessizlik: 'Sakinlik',
  merkezeYakinlik: 'Merkeze yakınlık',
  erisilebilirlik: 'Bütçenize uygunluk',
}

export const OLCUT_ACIKLAMALARI: Record<OlcutAdi, string> = {
  yatirimPotansiyeli: 'Mahallenin yatırım skoru. Fiyat trendi, kira çarpanı ve konum bileşenleri.',
  sanayiYakinligi: 'OSB ve sanayi bölgelerine mesafe. Hem işe gidiş hem kira talebi için önemli.',
  ulasim: 'Ana arter, tren istasyonu ve çevre yollara erişim.',
  topluTasima: 'Araç kullanmayanlar için otobüs, dolmuş ve hat sıklığı.',
  sosyalDonati: 'Market, sağlık, park ve günlük ihtiyaç yoğunluğu.',
  okulErisimi: 'Okul öncesi, ilkokul ve ortaokullara yürüme mesafesi.',
  sessizlik: 'Trafik, gürültü ve yoğunluk. Yüksek puan sakin demektir.',
  merkezeYakinlik: 'Çorlu merkezine ve çarşıya yakınlık.',
  erisilebilirlik:
    'Bütçenizle bu mahallede kaç m² alabildiğiniz. Diğer mahallelerle karşılaştırmalı puanlanır.',
}

/**
 * Bu ölçütler mahallenin CMS'teki profil alanlarından okunur.
 * `erisilebilirlik` ve `hedefeYakinlik` cevaplardan türetilir, bu listede yok.
 */
export const PROFIL_OLCUTLERI = [
  'yatirimPotansiyeli',
  'sanayiYakinligi',
  'ulasim',
  'topluTasima',
  'sosyalDonati',
  'okulErisimi',
  'sessizlik',
  'merkezeYakinlik',
] as const satisfies readonly OlcutAdi[]

// ═══════════════════════════════════════════════════════════════════════════
// Test cevapları
// ═══════════════════════════════════════════════════════════════════════════

export type Amac = 'oturmak' | 'yatirim' | 'ikisi'
export type Oncelik = 'sessizlik' | 'merkez' | 'farketmez'
export type ZamanUfku = 'yakin' | 'orta' | 'arastiriyorum'

export interface TestCevaplari {
  /** 1. Amacınız? */
  amac?: Amac | null
  /** 2. Bütçeniz (₺). Girilmezse bütçe uygunluğu ölçütü hesaba katılmaz. */
  butce?: number | null
  /** 3. Düzenli gittiğiniz nokta — ilgi noktası kimliği. */
  hedefNoktaId?: string | null
  /** 4. Hanede çocuk var mı? */
  cocukVar?: boolean | null
  /** 5. Sessizlik mi, merkeze yakınlık mı? */
  oncelik?: Oncelik | null
  /** 6. Araç kullanıyor musunuz? */
  aracKullaniyor?: boolean | null
  /**
   * 7. Zaman ufku.
   *
   * ⚠️ Bu cevap eşleştirmeyi ETKİLEMEZ; yalnızca talebe dönüşürse lead
   * bağlamına yazılır. Zaman ufkuna göre farklı mahalle önermek, ziyaretçiyi
   * aceleye getirmenin örtülü bir yolu olurdu.
   */
  zamanUfku?: ZamanUfku | null
}

// ═══════════════════════════════════════════════════════════════════════════
// Mahalle profili
// ═══════════════════════════════════════════════════════════════════════════

export interface MahalleProfili {
  slug: string
  ad: string
  /** CMS'ten gelen 0–100 öznitelikler. Girilmemişse `null`. */
  ozellikler: Partial<Record<OlcutAdi, number | null>>
  /** Bütçe uygunluğu için gereken gerçek veri. */
  ortalamaM2Satis?: number | null
  /** Hedef noktaya kuş uçuşu mesafe, metre. Hesaplanamıyorsa `null`. */
  hedefeMesafe?: number | null
}

// ═══════════════════════════════════════════════════════════════════════════
// Sonuç
// ═══════════════════════════════════════════════════════════════════════════

export interface OlcutKirilimi {
  olcut: OlcutAdi
  etiket: string
  aciklama: string
  /** Bu testte bu ölçüte verilen ağırlık, yüzde. */
  agirlik: number
  /** Mahallenin ölçüt puanı, 0–100. Veri yoksa `null`. */
  puan: number | null
  /** Ağırlıklı katkı. Veri yoksa 0. */
  katki: number
}

export interface MahalleEslesmesi {
  slug: string
  ad: string
  /** 0–100 uyum yüzdesi. */
  uyum: number
  kirilim: OlcutKirilimi[]
  /** Veri bulunan ölçütlerin ağırlık toplamı, 0–1. */
  kapsam: number
  eksikOlcutler: string[]
  /** Bütçe girildiyse bu mahallede alınabilecek yaklaşık m². */
  butceyleAlinabilirM2?: number | null
}

export type EslestirmeSonucu =
  | { durum: 'eslesti'; eslesmeler: MahalleEslesmesi[]; agirliklar: OlcutKirilimi[] }
  | { durum: 'cevap_eksik'; eksikler: string[] }
  | { durum: 'yetersiz_veri'; degerlendirilenMahalle: number; eksikOlcutler: string[] }
