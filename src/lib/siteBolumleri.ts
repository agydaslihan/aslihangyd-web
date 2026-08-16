/**
 * Site bölümleri — tek anahtarla açılıp kapanan sayfa grupları.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ GENEL ÇÖZÜM, TEK BÖLÜME ÖZEL KOD DEĞİL.
 *
 * "Danışman ol sayfasını kapatalım" isteği tek satırlık bir `if` ile
 * çözülebilirdi. Yarın "ticariyi de kapatalım" dendiğinde aynı iş baştan
 * yazılırdı — ve üçüncüsünde biri altbilgideki bağlantıyı kaldırmayı
 * unuturdu.
 *
 * Bir bölüm kapatıldığında ÜÇÜ BİRDEN gerçekleşir:
 *   1. Ana sayfada bölüm görünmez
 *   2. Altbilgide bağlantısı kaybolur
 *   3. İlgili rota 404 döner
 *
 * Üçünün tek kaynaktan sürülmesi, "kapattım ama Google hâlâ gösteriyor"
 * durumunu imkânsız kılar.
 *
 * ⚠️ KAPALI BÖLÜMÜN VERİSİ SİLİNMEZ. Kapatmak gizlemektir; geri açıldığında
 * her şey yerinde olmalı.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type BolumAnahtari =
  | 'danisman_ol'
  | 'harita'
  | 'ticari'
  | 'endeks'
  | 'raporlar'
  | 'gizli_portfoy'
  | 'mahalle_testi'
  | 'simulator'
  | 'bolge_radari'
  | 'ai_arama'
  | 'google_places'

export interface BolumTanimi {
  anahtar: BolumAnahtari
  /** Yönetim ekranında görünen ad. */
  ad: string
  /** Yönetim ekranındaki tek satır açıklama — ne kapanıyor. */
  aciklama: string
  /**
   * Bu bölüme ait rotalar. Bölüm kapalıyken hepsi 404 döner.
   * Ön ek eşleşmesi yapılır: `/rapor` altındaki her şey kapanır.
   *
   * ⚠️ BOŞ OLABİLİR. Her bölüm bir sayfa değil: `ai_arama` mevcut bir
   * sayfanın üzerindeki bir bileşendir, kendi rotası yoktur. Böyle
   * bölümlerde anahtar yalnızca bileşeni gösterir/gizler.
   */
  rotalar: readonly string[]
  /** Altbilgi ve ana sayfa bağlantısı. */
  adres: string
  /**
   * Altbilgi gezinmesinde bağlantısı görünsün mü.
   *
   * Raporlar bir sayfa değil bir çıktı: araçlardan üretilir ve URL'si
   * girdi taşır. Altbilgiye koymak, boş bir rapora giden bir bağlantı
   * olurdu.
   */
  gezinmede: boolean
  /**
   * Varsayılan durum.
   *
   * ⚠️ `danisman_ol` KAPALI başlar (şartname). Diğerleri açık: bugün
   * yayında olan bir sayfanın bu sistem eklendi diye kaybolması gerileme
   * olurdu.
   */
  varsayilanAcik: boolean
}

export const BOLUMLER: readonly BolumTanimi[] = [
  {
    anahtar: 'danisman_ol',
    ad: 'Danışman ol',
    aciklama: 'Ekibe katılmak isteyen danışmanların başvuru sayfası.',
    rotalar: ['/danisman-ol'],
    adres: '/danisman-ol',
    gezinmede: true,
    varsayilanAcik: false,
  },
  {
    /**
     * ⚠️ VARSAYILAN AÇIK. Harita bugün yayında; bu anahtar eklendi diye
     * kaybolması gerileme olurdu.
     *
     * Kapatma gerekçesi teknik olabilir: MapTiler anahtarı bitmiş, kota
     * dolmuş ya da altlık geçici olarak gelmiyor. O durumda sayfayı
     * bozuk bırakmaktansa kapatmak dürüst davranış — ve kapatınca menüden
     * de kalkıyor, altbilgiden de, site haritasından da.
     */
    anahtar: 'harita',
    ad: '3B harita',
    aciklama:
      'Tam ekran 3B Çorlu haritası. ⚠️ Altlık MapTiler’dan geliyor; anahtar ya da kota ' +
      'sorunu yaşarsanız sayfayı bozuk bırakmak yerine buradan kapatabilirsiniz.',
    rotalar: ['/harita'],
    adres: '/harita',
    gezinmede: true,
    varsayilanAcik: true,
  },
  {
    anahtar: 'ticari',
    ad: 'Ticari ve sanayi',
    aciklama: 'İş yeri, depo, fabrika ve arsa odaklı dikey sayfa.',
    rotalar: ['/ticari'],
    adres: '/ticari',
    gezinmede: true,
    varsayilanAcik: true,
  },
  {
    anahtar: 'endeks',
    ad: 'Çorlu Konut Endeksi',
    aciklama: 'Endeks sayfası. ⚠️ Kapalıyken de, açıkken de veri eşiği ayrıca kontrol edilir.',
    rotalar: ['/endeks'],
    adres: '/endeks',
    gezinmede: true,
    varsayilanAcik: true,
  },
  {
    anahtar: 'raporlar',
    ad: 'Yazdırılabilir raporlar',
    aciklama: 'Değerleme, simülatör ve kira/satın alma raporlarının yazdırma sayfaları.',
    rotalar: ['/rapor'],
    adres: '/rapor/degerleme',
    gezinmede: false,
    varsayilanAcik: true,
  },
  {
    anahtar: 'gizli_portfoy',
    ad: 'Gizli portföy',
    aciklama: 'İlan verilmeyen taşınmazların maskelenmiş listesi ve erişim talebi.',
    rotalar: ['/gizli-portfoy'],
    adres: '/gizli-portfoy',
    gezinmede: true,
    varsayilanAcik: true,
  },
  {
    anahtar: 'mahalle_testi',
    ad: 'Mahalle eşleştirme testi',
    aciklama: 'Ziyaretçiye uygun mahalleyi öneren kısa test.',
    rotalar: ['/mahalle-testi'],
    adres: '/mahalle-testi',
    gezinmede: true,
    varsayilanAcik: true,
  },
  {
    anahtar: 'simulator',
    ad: 'Yatırım simülatörü',
    aciklama: 'Çok yıllı getiri projeksiyonu hesaplayıcısı.',
    rotalar: ['/araclar/yatirim-simulatoru'],
    adres: '/araclar/yatirim-simulatoru',
    gezinmede: true,
    varsayilanAcik: true,
  },
  {
    /**
     * ⚠️ VARSAYILAN KAPALI — KVKK kararı, teknik değil.
     *
     * Ziyaretçinin yazdığı arama metni Anthropic'in (ABD) sunucularına
     * gidiyor; bu bir yurt dışına veri aktarımıdır ve aydınlatma metnine
     * eklenmesi gerekir. Metin avukattan gelene kadar özellik açılmaz.
     *
     * Kutu ayrıca `ANTHROPIC_API_KEY` yoksa da basılmaz. İki koşul birden
     * sağlanmadıkça görünmez: anahtar VE bu bölüm açık.
     * Veri akışının ayrıntısı: docs/AI-ARAMA-KVKK-NOTU.md
     */
    anahtar: 'ai_arama',
    ad: 'AI doğal dil arama',
    aciklama:
      '⚠️ Portföy sayfasındaki "kendi cümlenizle arayın" kutusu. Ziyaretçinin yazdığı ' +
      "metin Anthropic'in (ABD) sunucularına gider — yurt dışına veri aktarımı. " +
      'Aydınlatma metni avukattan gelmeden AÇMAYIN.',
    rotalar: [],
    adres: '/portfoy',
    gezinmede: false,
    varsayilanAcik: false,
  },
  {
    /**
     * ⚠️ VARSAYILAN KAPALI — maliyet ve lisans kararı.
     *
     * Google Places ücretli bir servis: açık kalan bir katman ay sonunda
     * fatura üretir. Kendiliğinden açılmaması bilinçli.
     *
     * ⚠️ İkinci koşul: `GOOGLE_PLACES_API_KEY` tanımlı olmalı. İkisi
     * birden sağlanmadıkça hiçbir Google çağrısı yapılmaz; site
     * OpenStreetMap verisiyle aynen çalışır.
     *
     * ⚠️ Lisans: Google içeriği veritabanımıza YAZILMAZ. Sakladığımız tek
     * şey yer kimliği; ad, adres ve çalışma saati gösterileceği anda
     * çekilir. Ayrıntı: `src/lib/google/istemci.ts`.
     */
    anahtar: 'google_places',
    ad: 'Google Places katmanı',
    aciklama:
      '⚠️ ÜCRETLİ. OpenStreetMap’in zayıf kaldığı yerde işletme adı ve çalışma saatlerini ' +
      'Google’dan tamamlar. Anahtar (GOOGLE_PLACES_API_KEY) tanımlı değilse açık olsa bile ' +
      'çalışmaz. Aylık çağrı sayısı Ayarlar → Google Places Kullanımı ekranında.',
    rotalar: [],
    adres: '/veri-kaynaklari',
    gezinmede: false,
    varsayilanAcik: false,
  },
  {
    anahtar: 'bolge_radari',
    ad: 'Bölge radarı',
    aciklama: 'Mahalle medyanına göre fırsat ve risk sinyalleri.',
    rotalar: ['/bolge-radari'],
    adres: '/bolge-radari',
    gezinmede: true,
    varsayilanAcik: true,
  },
]

export function bolumTanimi(anahtar: BolumAnahtari): BolumTanimi {
  const tanim = BOLUMLER.find((aday) => aday.anahtar === anahtar)
  if (tanim === undefined) throw new Error(`Bilinmeyen site bölümü: ${anahtar}`)
  return tanim
}

/** Varsayılan durum haritası — ayar kaydı hiç oluşmamışsa kullanılır. */
export function varsayilanDurumlar(): Record<BolumAnahtari, boolean> {
  return Object.fromEntries(
    BOLUMLER.map((bolum) => [bolum.anahtar, bolum.varsayilanAcik]),
  ) as Record<BolumAnahtari, boolean>
}

/**
 * Bir yol, kapalı bir bölüme mi ait?
 *
 * Ön ek eşleşmesi yapılır ama sınır karakteri aranır: `/ticari` kapalıyken
 * `/ticaridukkanlar` diye bir rota açılsa onun da kapanmaması gerekir.
 */
export function kapaliBolumeAitMi(
  yol: string,
  durumlar: Readonly<Record<BolumAnahtari, boolean>>,
): BolumAnahtari | null {
  const temiz = yol.split('?')[0]?.replace(/\/+$/, '') || '/'

  for (const bolum of BOLUMLER) {
    if (durumlar[bolum.anahtar]) continue

    for (const rota of bolum.rotalar) {
      if (temiz === rota || temiz.startsWith(`${rota}/`)) return bolum.anahtar
    }
  }

  return null
}

/** Açık bölümlerin gezinme öğeleri — altbilgi ve ana sayfa için. */
export function acikBolumler(durumlar: Readonly<Record<BolumAnahtari, boolean>>): BolumTanimi[] {
  return BOLUMLER.filter((bolum) => durumlar[bolum.anahtar])
}
