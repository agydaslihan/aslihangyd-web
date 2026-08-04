/**
 * Vergi ve harç parametreleri — kayıt defteri.
 *
 * ⚠️ CLAUDE.md kural 4: "Vergi/harç oranları koda gömülmez."
 *
 * Bu dosya oranların DEĞERİNİ içermez; yalnızca hangi parametrelerin var
 * olduğunu, ne anlama geldiklerini ve hangi birimde tutulduklarını tanımlar.
 * Değerler `VergiParametreleri` koleksiyonunda, CMS'ten düzenlenebilir
 * biçimde durur.
 *
 * Neden kayıt defteri gerekli:
 *  - Hesaplayıcı, eksik parametreyi ADIYLA söyleyebilsin ("tapu harcı oranı
 *    tanımlı değil") — "bir şeyler eksik" demek kullanıcıyı çıkmaza sokar.
 *  - Yönetim paneli hangi parametrelerin doldurulmadığını listeleyebilsin.
 *  - Bir parametrenin adı değişirse tek yerden değişsin.
 */

export type ParametreBirimi = 'oran' | 'tutar' | 'yil' | 'dilim'

export interface ParametreTanimi {
  readonly anahtar: string
  readonly etiket: string
  readonly birim: ParametreBirimi
  readonly aciklama: string
  /** Hangi hesaplayıcıların bu parametreye ihtiyacı var. */
  readonly kullananlar: readonly string[]
}

export const VERGI_PARAMETRELERI = [
  {
    anahtar: 'tapu_harci_orani_alici',
    etiket: 'Tapu harcı oranı — alıcı payı',
    birim: 'oran',
    aciklama:
      'Satış bedeli üzerinden alıcının ödediği tapu harcı oranı. Ondalık olarak girin (örn. %2 için 0,02).',
    kullananlar: ['alim-maliyeti'],
  },
  {
    anahtar: 'doner_sermaye_ucreti',
    etiket: 'Tapu döner sermaye ücreti',
    birim: 'tutar',
    aciklama: 'Tapu Müdürlüğü döner sermaye işletmesi hizmet bedeli (sabit tutar).',
    kullananlar: ['alim-maliyeti'],
  },
  {
    anahtar: 'dask_tahmini_prim',
    etiket: 'DASK tahmini yıllık prim',
    birim: 'tutar',
    aciklama:
      'Zorunlu deprem sigortası için tahmini yıllık prim. Gerçek tutar risk bölgesi, ' +
      'yapı tipi ve metrekareye göre değişir; buradaki değer yalnızca ön maliyet tahmini içindir.',
    kullananlar: ['alim-maliyeti'],
  },
  {
    anahtar: 'ekspertiz_ucreti',
    etiket: 'Ekspertiz (değerleme) ücreti',
    birim: 'tutar',
    aciklama: 'Kredi kullanımında zorunlu olan gayrimenkul değerleme raporu ücreti.',
    kullananlar: ['alim-maliyeti'],
  },
  {
    anahtar: 'emlak_komisyon_orani',
    etiket: 'Emlak komisyon oranı',
    birim: 'oran',
    aciklama: 'Satış bedeli üzerinden alıcıdan alınan komisyon oranı (ondalık).',
    kullananlar: ['alim-maliyeti'],
  },
  {
    anahtar: 'komisyon_kdv_orani',
    etiket: 'Komisyon KDV oranı',
    birim: 'oran',
    aciklama: 'Emlak komisyonuna uygulanan KDV oranı (ondalık).',
    kullananlar: ['alim-maliyeti'],
  },
  {
    anahtar: 'kira_geliri_istisna_tutari',
    etiket: 'Konut kira geliri istisna tutarı (yıllık)',
    birim: 'tutar',
    aciklama:
      'Yıllık konut kira gelirinin bu tutara kadarki kısmı gelir vergisinden istisnadır. ' +
      'Her yıl yeniden belirlenir.',
    kullananlar: ['kira-geliri-vergisi'],
  },
  {
    anahtar: 'goturu_gider_orani',
    etiket: 'Götürü gider oranı',
    birim: 'oran',
    aciklama:
      'Gerçek gider yöntemi seçilmediğinde kira gelirinden düşülebilen götürü gider oranı (ondalık).',
    kullananlar: ['kira-geliri-vergisi'],
  },
  {
    anahtar: 'gelir_vergisi_dilimleri',
    etiket: 'Gelir vergisi dilimleri',
    birim: 'dilim',
    aciklama:
      'Artan oranlı gelir vergisi tarifesi. Her dilim için üst sınır ve oran girilir; ' +
      'son dilimin üst sınırı boş bırakılır.',
    kullananlar: ['kira-geliri-vergisi', 'deger-artis-vergisi'],
  },
  {
    anahtar: 'deger_artis_istisna_tutari',
    etiket: 'Değer artış kazancı istisna tutarı',
    birim: 'tutar',
    aciklama: 'Değer artış kazancının bu tutara kadarki kısmı vergiden istisnadır.',
    kullananlar: ['deger-artis-vergisi'],
  },
  {
    anahtar: 'deger_artis_muafiyet_yili',
    etiket: 'Değer artış kazancı muafiyet süresi (yıl)',
    birim: 'yil',
    aciklama:
      'Taşınmaz bu süreden uzun elde tutulduktan sonra satılırsa değer artış kazancı vergisi doğmaz.',
    kullananlar: ['deger-artis-vergisi'],
  },
] as const satisfies readonly ParametreTanimi[]

export type VergiParametreAnahtari = (typeof VERGI_PARAMETRELERI)[number]['anahtar']

export function parametreTanimiBul(anahtar: string): ParametreTanimi | null {
  return VERGI_PARAMETRELERI.find((tanim) => tanim.anahtar === anahtar) ?? null
}

/** Bir parametrenin kullanıcıya gösterilecek adı. Tanımsızsa anahtarın kendisi. */
export function parametreEtiketi(anahtar: string): string {
  return parametreTanimiBul(anahtar)?.etiket ?? anahtar
}

/** Gelir vergisi tarifesinin bir dilimi. */
export interface VergiDilimi {
  /** Bu dilimin üst sınırı. `null` ise "ve üzeri". */
  ustSinir: number | null
  /** Dilime uygulanan oran (ondalık). */
  oran: number
}

/**
 * Çözülmüş parametre kümesi — hesaplayıcılara bu biçimde geçirilir.
 *
 * Değeri olmayan parametre burada BULUNMAZ; `undefined` ile "sıfır" arasındaki
 * farkı korumak, yanlış hesap yapmamanın temeli.
 */
export interface VergiParametreKumesi {
  sayilar: Readonly<Record<string, number>>
  dilimler: Readonly<Record<string, readonly VergiDilimi[]>>
  /** Parametrelerin hangi tarih itibarıyla geçerli olduğu — arayüzde gösterilir. */
  gecerlilikTarihi: string | null
}

export const BOS_PARAMETRE_KUMESI: VergiParametreKumesi = {
  sayilar: {},
  dilimler: {},
  gecerlilikTarihi: null,
}
