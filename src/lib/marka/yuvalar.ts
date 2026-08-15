/**
 * Marka renk yuvaları — tek kaynak.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU "HER YERİ DEĞİŞTİR" DEĞİL, SAYILI ANLAMSAL YUVA
 *
 * Serbest bir tema düzenleyici tasarımı iki haftada bozar: renkler
 * birbirinden bağımsız seçilir, kontrast çiftleri patlar, tipografi ve
 * boşluk sistemi anlamını kaybeder.
 *
 * Burada on yuva var ve sayısı ARTIRILMAYACAK. Her yeni yuva yeni bir
 * kontrast çifti demek; çift sayısı yuva sayısıyla değil, yuvaların
 * birleşimiyle büyür.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ RAMPALAR AÇILMIYOR. Yuvalar `globals.css`teki anlamsal jetonları
 * çalışma zamanında eziyor; `--color-kakao-500` gibi rampa basamakları
 * dokunulmaz kalıyor. Rampa mutlak ölçek, jeton anlamdır — açılan şey
 * anlam olmalı.
 */

/** Yuvanın hangi rolde kullanılabileceği. */
export type YuvaRolu =
  /** Zemin olarak kullanılır; üstüne metin gelir. */
  | 'zemin'
  /** Metin ya da simge rengi. */
  | 'metin'
  /**
   * Yalnızca dekoratif: çizgi, ayraç, yumuşak zemin.
   * ⚠️ Metin rengi olarak KULLANILAMAZ ve kontrast eşiği aranmaz.
   */
  | 'dekoratif'

export interface Yuva {
  anahtar: string
  etiket: string
  aciklama: string
  /** Ezilecek CSS değişkeni. */
  jeton: string
  rol: YuvaRolu
  varsayilanAcik: string
  varsayilanKoyu: string
}

/**
 * On yuva.
 *
 * ⚠️ `varsayilanAcik` / `varsayilanKoyu` değerleri `globals.css`ten
 * ÖLÇÜLEREK alındı, elle yazılmadı. İkisinin ayrışması, panelde
 * "varsayılana dön"ün gerçekte varsayılana dönmemesi demekti.
 */
export const YUVALAR: readonly Yuva[] = [
  {
    anahtar: 'zemin',
    etiket: 'Ana arka plan',
    aciklama: 'Sayfanın genel zemini.',
    jeton: '--color-zemin',
    rol: 'zemin',
    varsayilanAcik: '#fbfaf7',
    varsayilanKoyu: '#3d2b2f',
  },
  {
    anahtar: 'bolumZemin',
    etiket: 'Bölüm arka planı',
    aciklama: 'Vurgulanan bölümlerin zemini — ana zeminden ayrışmalı.',
    jeton: '--color-yuzey-2',
    rol: 'zemin',
    varsayilanAcik: '#f2ebe3',
    varsayilanKoyu: '#635356',
  },
  {
    anahtar: 'metin',
    etiket: 'Metin rengi',
    aciklama: 'Gövde metninin rengi. Sitedeki en çok okunan renk.',
    jeton: '--color-metin',
    rol: 'metin',
    varsayilanAcik: '#3d2b2f',
    varsayilanKoyu: '#fbfaf7',
  },
  {
    anahtar: 'vurgu',
    etiket: 'Başlık / vurgu rengi',
    aciklama: 'Başlıklar ve bağlantılar. Metin olarak kullanıldığı için AA aranır.',
    jeton: '--color-vurgu',
    rol: 'metin',
    varsayilanAcik: '#844632',
    varsayilanKoyu: '#e8cfc8',
  },
  {
    anahtar: 'butonZemin',
    etiket: 'Birincil buton zemini',
    aciklama: 'Ana eylem butonlarının zemini.',
    jeton: '--color-aksan',
    rol: 'zemin',
    varsayilanAcik: '#4f7c6a',
    varsayilanKoyu: '#86a597',
  },
  {
    anahtar: 'butonMetin',
    etiket: 'Birincil buton metni',
    aciklama: 'Buton üzerindeki yazı.',
    jeton: '--color-aksan-uzeri',
    rol: 'metin',
    varsayilanAcik: '#ffffff',
    varsayilanKoyu: '#3d2b2f',
  },
  {
    anahtar: 'yumusakZemin',
    etiket: 'Yumuşak vurgu zemini',
    aciklama:
      'Pudra tonu — hero ve yumuşak vurgu blokları. ' +
      'YALNIZCA ZEMİN: metin rengi olarak kullanılamaz.',
    jeton: '--color-pudra-zemin',
    rol: 'zemin',
    varsayilanAcik: '#e8cfc8',
    varsayilanKoyu: '#814431',
  },
  {
    anahtar: 'dekoratifCizgi',
    etiket: 'Dekoratif çizgi',
    aciklama:
      'İnce ayraç çizgileri. YALNIZCA DEKORATİF: tek başına hiçbir bilgi ' +
      'taşımaz, metin rengi olarak kullanılamaz.',
    jeton: '--color-gold-cizgi',
    rol: 'dekoratif',
    varsayilanAcik: '#c9a96e',
    varsayilanKoyu: '#c9a96e',
  },
  {
    anahtar: 'koyuBantZemin',
    etiket: 'Koyu bant zemini',
    aciklama: 'Hero ve çağrı bantlarının koyu zemini.',
    jeton: '--color-kakao-yuzey',
    rol: 'zemin',
    varsayilanAcik: '#3d2b2f',
    varsayilanKoyu: '#635356',
  },
  {
    anahtar: 'koyuBantMetin',
    etiket: 'Koyu bant metni',
    aciklama: 'Koyu bant üzerindeki yazı.',
    jeton: '--color-koyu-bant-metin',
    rol: 'metin',
    varsayilanAcik: '#ffffff',
    varsayilanKoyu: '#fbfaf7',
  },
]

export type YuvaAnahtari = (typeof YUVALAR)[number]['anahtar']

/** Yuva anahtarından tanım. */
export function yuvaTanimi(anahtar: string): Yuva | undefined {
  return YUVALAR.find((yuva) => yuva.anahtar === anahtar)
}

/** Bir temanın tüm yuva değerleri. */
export type Palet = Record<string, string>

export function varsayilanPalet(tema: 'acik' | 'koyu'): Palet {
  return Object.fromEntries(
    YUVALAR.map((yuva) => [
      yuva.anahtar,
      tema === 'acik' ? yuva.varsayilanAcik : yuva.varsayilanKoyu,
    ]),
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Kontrast çiftleri
   ══════════════════════════════════════════════════════════════════════════ */

export interface KontrastCifti {
  /** Ön plan (metin) yuvası. */
  on: string
  /** Arka plan yuvası. */
  arka: string
  etiket: string
  /** WCAG eşiği — normal metin 4,5; büyük metin ve bileşen 3. */
  esik: number
  gerekce: string
}

/**
 * Ölçülen çiftler.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ÇİFTLER "OLABİLECEK HER BİRLEŞİM" DEĞİL, "GERÇEKTEN OLAN BİRLEŞİM".
 *
 * On yuvanın kartezyen çarpımı 100 çift eder ve çoğu sitede hiç yan yana
 * gelmez. Yanlış alarmla dolu bir kapı, kısa sürede görmezden gelinen bir
 * kapıdır.
 *
 * Buradaki liste sitede FİİLEN oluşan birleşimlerden çıkarıldı: metin ana
 * zeminde ve bölüm zemininde, vurgu ikisinde birden, buton metni buton
 * zemininde, koyu bant metni koyu bantta.
 *
 * ⚠️ Dekoratif yuvalar (gold çizgi, pudra zemin) burada ÖN PLAN olarak
 * hiç geçmiyor — bilinçli. İkisi de metin rengi değil; gold açık zeminde
 * 2,14:1 verir ve bunu bir eşiğe sokmaya çalışmak, ya paleti kırar ya
 * kapıyı anlamsızlaştırırdı. Yerine `rol: 'dekoratif'` ve panelde açık
 * uyarı var.
 * ─────────────────────────────────────────────────────────────────────────
 */
export const CIFTLER: readonly KontrastCifti[] = [
  {
    on: 'metin',
    arka: 'zemin',
    etiket: 'Metin / Ana arka plan',
    esik: 4.5,
    gerekce: 'Sitedeki en çok okunan çift.',
  },
  {
    on: 'metin',
    arka: 'bolumZemin',
    etiket: 'Metin / Bölüm arka planı',
    esik: 4.5,
    gerekce: 'Gövde metni vurgulu bölümlerde de okunuyor.',
  },
  {
    on: 'vurgu',
    arka: 'zemin',
    etiket: 'Başlık / Ana arka plan',
    esik: 4.5,
    gerekce: 'Başlıklar ve bağlantılar metindir; büyük punto varsayılamaz.',
  },
  {
    on: 'vurgu',
    arka: 'bolumZemin',
    etiket: 'Başlık / Bölüm arka planı',
    esik: 4.5,
    gerekce: 'Vurgu rengi krem zeminde de kullanılıyor.',
  },
  {
    on: 'vurgu',
    arka: 'yumusakZemin',
    etiket: 'Başlık / Yumuşak vurgu zemini',
    esik: 4.5,
    gerekce: 'Hero başlığı pudra zeminde duruyor.',
  },
  {
    on: 'metin',
    arka: 'yumusakZemin',
    etiket: 'Metin / Yumuşak vurgu zemini',
    esik: 4.5,
    gerekce: 'Hero gövde metni pudra zeminde duruyor.',
  },
  {
    on: 'butonMetin',
    arka: 'butonZemin',
    etiket: 'Buton metni / Buton zemini',
    esik: 4.5,
    gerekce: 'Ana eylemin okunabilirliği.',
  },
  {
    on: 'koyuBantMetin',
    arka: 'koyuBantZemin',
    etiket: 'Koyu bant metni / Koyu bant zemini',
    esik: 4.5,
    gerekce: 'Çağrı bantlarının metni.',
  },
  {
    on: 'butonZemin',
    arka: 'zemin',
    etiket: 'Buton zemini / Ana arka plan',
    esik: 3,
    gerekce:
      'WCAG 1.4.11 — bileşen sınırı zeminden ayırt edilebilmeli. ' +
      'Metin değil, o yüzden eşik 3.',
  },
]

/* ══════════════════════════════════════════════════════════════════════════
   Hazır paletler
   ══════════════════════════════════════════════════════════════════════════ */

export interface HazirPalet {
  anahtar: string
  ad: string
  aciklama: string
  acik: Palet
  koyu: Palet
}

/**
 * ⚠️ Hazır paletlerin HEPSİ kapıdan geçmek zorunda.
 *
 * Bir test bunu sınıyor: geçmeyen bir hazır palet, Aslıhan'a "bu palete
 * dön" dedirtip sonra kaydettirmeyen bir tuzak olurdu.
 */
export const HAZIR_PALETLER: readonly HazirPalet[] = [
  {
    anahtar: 'bohem',
    ad: 'Bohem / pudra (varsayılan)',
    aciklama: 'Sıcak kakao, terracotta ve adaçayı. Sitenin bugünkü paleti.',
    acik: varsayilanPalet('acik'),
    koyu: varsayilanPalet('koyu'),
  },
  {
    anahtar: 'lacivert',
    ad: 'Klasik lacivert',
    aciklama: 'Kurumsal ve serin. Bakır yerine soğuk gri vurgular.',
    acik: {
      zemin: '#f7f8fa',
      bolumZemin: '#e8ecf2',
      metin: '#1c2733',
      vurgu: '#1f3d63',
      butonZemin: '#1f3d63',
      butonMetin: '#ffffff',
      yumusakZemin: '#d3dced',
      dekoratifCizgi: '#9bb0cc',
      koyuBantZemin: '#16243a',
      koyuBantMetin: '#ffffff',
    },
    koyu: {
      zemin: '#16243a',
      bolumZemin: '#243553',
      metin: '#f2f5f9',
      vurgu: '#bcd0ee',
      butonZemin: '#9db9e0',
      butonMetin: '#16243a',
      yumusakZemin: '#31456a',
      dekoratifCizgi: '#7f96b8',
      koyuBantZemin: '#243553',
      koyuBantMetin: '#f2f5f9',
    },
  },
  {
    anahtar: 'sicakNotr',
    ad: 'Sıcak nötr',
    aciklama: 'Kum, kil ve zeytin. Renk vurgusu en düşük olan set.',
    acik: {
      zemin: '#faf8f5',
      bolumZemin: '#efe9e1',
      metin: '#2e2a26',
      vurgu: '#6b4a2f',
      butonZemin: '#5c6b4a',
      butonMetin: '#ffffff',
      yumusakZemin: '#e2d8c9',
      dekoratifCizgi: '#bda887',
      koyuBantZemin: '#2e2a26',
      koyuBantMetin: '#ffffff',
    },
    koyu: {
      zemin: '#2e2a26',
      bolumZemin: '#4a443c',
      metin: '#faf8f5',
      vurgu: '#e2cdb4',
      butonZemin: '#9fb185',
      butonMetin: '#2e2a26',
      yumusakZemin: '#5c4a35',
      dekoratifCizgi: '#bda887',
      koyuBantZemin: '#4a443c',
      koyuBantMetin: '#faf8f5',
    },
  },
]
