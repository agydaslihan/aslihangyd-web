/**
 * Yatırımcı araç seti — tek kaynak.
 *
 * Hem `/araclar` indeks sayfası hem gezinme hem de araçlar arası çapraz
 * bağlantılar bu listeden beslenir.
 */

export interface AracTanimi {
  readonly adres: string
  readonly ad: string
  readonly kisaAd: string
  readonly aciklama: string
  /** Vergi parametresi gerektiriyor mu — indekste rozet gösterilir. */
  readonly vergiParametresiGerekli: boolean
}

export const ARACLAR = [
  {
    adres: '/araclar/kira-getirisi',
    ad: 'Kira Getiri Hesaplayıcı',
    kisaAd: 'Kira getirisi',
    aciklama:
      'Kira çarpanı, brüt ve net getiri, amortisman süresi. Bir yatırımcının ilk baktığı üç rakam.',
    vergiParametresiGerekli: false,
  },
  {
    adres: '/araclar/kredi',
    ad: 'Konut Kredisi Hesaplayıcı',
    kisaAd: 'Kredi',
    aciklama:
      'Aylık taksit, toplam geri ödeme ve ay ay ödeme planı. Faizin ne kadarını ne zaman ödediğinizi görün.',
    vergiParametresiGerekli: false,
  },
  {
    adres: '/araclar/yatirim-simulatoru',
    ad: 'Yatırım Simülatörü',
    kisaAd: 'Yatırım simülatörü',
    aciklama:
      'Kiralık konut yatırımının yıl yıl nakit akışı, öz sermaye birikimi ve enflasyondan arındırılmış reel getirisi.',
    vergiParametresiGerekli: true,
  },
  {
    adres: '/araclar/kira-mi-satin-alma-mi',
    ad: 'Kiralasam mı, Satın Alsam mı?',
    kisaAd: 'Kira mı, satın alma mı',
    aciklama:
      'Aylık taksiti kirayla kıyaslamak yanıltır. İki senaryonun süre sonundaki net varlığını ve başabaş değer artışı eşiğini görün.',
    vergiParametresiGerekli: false,
  },
  {
    adres: '/araclar/alim-maliyeti',
    ad: 'Alım Maliyeti Hesaplayıcı',
    kisaAd: 'Alım maliyeti',
    aciklama:
      'İlan fiyatının üzerine gelen tapu harcı, döner sermaye, sigorta ve komisyon. Gerçek maliyet.',
    vergiParametresiGerekli: true,
  },
  {
    adres: '/araclar/kira-geliri-vergisi',
    ad: 'Kira Geliri Vergi Hesaplayıcı',
    kisaAd: 'Kira geliri vergisi',
    aciklama: 'İstisna, götürü veya gerçek gider ve artan oranlı tarife. Elinize net ne kalıyor?',
    vergiParametresiGerekli: true,
  },
  {
    adres: '/araclar/deger-artis-vergisi',
    ad: 'Değer Artış Kazancı Vergisi',
    kisaAd: 'Değer artış vergisi',
    aciklama:
      'Muafiyet süresi ve enflasyon endekslemesi. Birkaç ay beklemek vergiden kurtarabilir.',
    vergiParametresiGerekli: true,
  },
] as const satisfies readonly AracTanimi[]
