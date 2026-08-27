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
 * çalışma zamanında eziyor; `--color-notr-500` gibi rampa basamakları
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
    varsayilanAcik: '#fcfbf8',
    varsayilanKoyu: '#1c1c1c',
  },
  {
    anahtar: 'bolumZemin',
    etiket: 'Bölüm arka planı',
    aciklama: 'Vurgulanan bölümlerin zemini — ana zeminden ayrışmalı.',
    jeton: '--color-yuzey-2',
    rol: 'zemin',
    varsayilanAcik: '#f5f0e8',
    varsayilanKoyu: '#48433d',
  },
  {
    anahtar: 'metin',
    etiket: 'Metin rengi',
    aciklama: 'Gövde metninin rengi. Sitedeki en çok okunan renk.',
    jeton: '--color-metin',
    rol: 'metin',
    varsayilanAcik: '#1c1c1c',
    varsayilanKoyu: '#fcfbf8',
  },
  {
    anahtar: 'vurgu',
    etiket: 'Başlık / vurgu rengi',
    aciklama: 'Başlıklar ve bağlantılar. Metin olarak kullanıldığı için AA aranır.',
    jeton: '--color-vurgu',
    rol: 'metin',
    varsayilanAcik: '#7a5e2e',
    varsayilanKoyu: '#d5b98d',
  },
  {
    anahtar: 'butonZemin',
    etiket: 'Birincil buton zemini',
    aciklama: 'Ana eylem butonlarının zemini.',
    jeton: '--color-aksan',
    rol: 'zemin',
    varsayilanAcik: '#c7a36b',
    varsayilanKoyu: '#c7a36b',
  },
  {
    anahtar: 'butonMetin',
    etiket: 'Birincil buton metni',
    aciklama: 'Buton üzerindeki yazı.',
    jeton: '--color-aksan-uzeri',
    rol: 'metin',
    varsayilanAcik: '#1c1c1c',
    varsayilanKoyu: '#1c1c1c',
  },
  {
    anahtar: 'yumusakZemin',
    etiket: 'Yumuşak vurgu zemini',
    aciklama:
      'Sıcak bej — yumuşak bölüm bantları. ' + 'YALNIZCA ZEMİN: metin rengi olarak kullanılamaz.',
    jeton: '--color-bant-zemin',
    rol: 'zemin',
    varsayilanAcik: '#f5f0e8',
    varsayilanKoyu: '#2a2622',
  },
  {
    anahtar: 'dekoratifCizgi',
    etiket: 'Dekoratif çizgi',
    aciklama:
      'İnce ayraç çizgileri. YALNIZCA DEKORATİF: tek başına hiçbir bilgi ' +
      'taşımaz, metin rengi olarak kullanılamaz.',
    jeton: '--color-gold-cizgi',
    rol: 'dekoratif',
    varsayilanAcik: '#c7a36b',
    varsayilanKoyu: '#c7a36b',
  },
  {
    anahtar: 'koyuBantZemin',
    etiket: 'Koyu bant zemini',
    aciklama: 'Hero ve çağrı bantlarının koyu zemini.',
    jeton: '--color-koyu-bant',
    rol: 'zemin',
    varsayilanAcik: '#1c1c1c',
    varsayilanKoyu: '#2a2622',
  },
  {
    anahtar: 'koyuBantMetin',
    etiket: 'Koyu bant metni',
    aciklama: 'Koyu bant üzerindeki yazı.',
    jeton: '--color-koyu-bant-metin',
    rol: 'metin',
    varsayilanAcik: '#fcfbf8',
    varsayilanKoyu: '#fcfbf8',
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
 * ⚠️ Dekoratif yuvalar (altın çizgi, bej zemin) burada ÖN PLAN olarak
 * hiç geçmiyor — bilinçli. İkisi de metin rengi değil; altın açık zeminde
 * 2,28:1 verir ve bunu bir eşiğe sokmaya çalışmak, ya paleti kırar ya
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
  /**
   * ⚠️ "BUTON ZEMİNİ / ANA ARKA PLAN" ÇİFTİ KALDIRILDI — KURAL DEĞİL, KAPI
   * DEĞİŞTİ.
   *
   * WCAG 1.4.11 hâlâ geçerli: dolu butonun sınırı zeminden 3:1 ayrışmalı.
   * Ama Aurora'da bunu butonun DOLGUSU değil KENARLIĞI taşıyor ve kenarlık
   * bir yuva değil, dolgudan türetiliyor (`ctaKenari.ts`): zeminden 3:1
   * ayrışana kadar koyulaşıyor.
   *
   * Çifti burada tutmak, altın bir butonu (2,28:1) panelde reddetmek
   * demekti — yani şartnamenin istediği rengi erişilebilirlik gerekçesiyle
   * yasaklamak, oysa aynı erişilebilirlik kenarlıkla zaten sağlanıyor.
   *
   * ⚠️ Kural gevşemedi, taşıyıcısı değişti. Türetmenin gerçekten eşiği
   * tutturduğu `ctaKenari.test.ts` içinde ölçülüyor.
   */
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
    anahtar: 'aurora',
    ad: 'Aurora Luxury (varsayılan)',
    aciklama: 'Sıcak beyaz, bej katmanlar ve altın. Sitenin bugünkü paleti.',
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
    anahtar: 'pudra',
    ad: 'Pudra',
    aciklama: 'Pudra gülü ağırlıklı, sıcak. Vurgu gülkurusu; nötrler pembeye çalıyor.',
    /**
     * ⚠️ VURGU GÜLKURUSU, PEMBE DEĞİL — VE SEBEBİ KONTRAST.
     *
     * Açık pembe bir vurgu (#d98c99 gibi) krem zeminde 2:1 civarında
     * kalıyor; kapıdan geçmiyor. Aynı tonun koyulaştırılmışı (#8a4250)
     * hem gülkurusu kimliğini koruyor hem de 4,5:1 eşiğini geçiyor.
     * "Pudra" burada zeminlerin işi; vurgunun değil.
     */
    acik: {
      zemin: '#fdf8f7',
      bolumZemin: '#f6e9e7',
      metin: '#33231f',
      vurgu: '#8a4250',
      butonZemin: '#8a4250',
      butonMetin: '#fdf8f7',
      yumusakZemin: '#efd9d6',
      dekoratifCizgi: '#c99aa1',
      koyuBantZemin: '#33231f',
      koyuBantMetin: '#fdf8f7',
    },
    koyu: {
      zemin: '#221a19',
      bolumZemin: '#332725',
      metin: '#f7ece9',
      vurgu: '#e8b3ba',
      butonZemin: '#e8b3ba',
      butonMetin: '#221a19',
      yumusakZemin: '#43312f',
      dekoratifCizgi: '#a97b83',
      koyuBantZemin: '#332725',
      koyuBantMetin: '#f7ece9',
    },
  },
  {
    anahtar: 'bohem',
    ad: 'Bohem',
    aciklama: 'Terracotta, adaçayı ve altın. Vurgu terracotta, buton adaçayı.',
    /**
     * ⚠️ ÜÇ RENKLİ TEK SET — VE BU BİLİNÇLİ BİR RİSK.
     *
     * Diğer paletlerde vurgu ile buton aynı renk. Burada ayrı: başlıklar
     * terracotta, eylemler adaçayı. Üç renk bir arada sakin durabilir ama
     * dördüncüsü kalabalık eder; altın yalnızca dekoratif çizgide.
     *
     * ⚠️ Adaçayı zemin üzerinde metin KREM, beyaz değil: adaçayı yeterince
     * koyu olmadığı için beyaz metin eşiğin altında kalıyordu.
     */
    acik: {
      zemin: '#fbf7f0',
      bolumZemin: '#efe6d8',
      metin: '#2b2620',
      vurgu: '#8a3f24',
      butonZemin: '#3f5544',
      butonMetin: '#fbf7f0',
      yumusakZemin: '#e3d6c2',
      dekoratifCizgi: '#b08d5c',
      koyuBantZemin: '#2b2620',
      koyuBantMetin: '#fbf7f0',
    },
    koyu: {
      zemin: '#231f1a',
      bolumZemin: '#332d25',
      metin: '#f5eee1',
      vurgu: '#e8a077',
      butonZemin: '#a8c2a4',
      butonMetin: '#231f1a',
      yumusakZemin: '#443c31',
      dekoratifCizgi: '#c2a173',
      koyuBantZemin: '#332d25',
      koyuBantMetin: '#f5eee1',
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
