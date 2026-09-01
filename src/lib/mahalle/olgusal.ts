import type { PoiMesafesi } from '@/lib/yakinlik/tipler'
import type { SanayiMesafesi } from '@/lib/veri/yakinlik'

/**
 * Mahallenin olgusal iskeleti — PostGIS ve OSM verisinden HESAPLANIR.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ HESAPLANAMAYAN SATIR ÇİZİLMEZ. SIFIR YAZILMAZ. TAHMİN EDİLMEZ.
 *
 * Bu modülün tek işi, elimizdeki veriden ÇIKARILABİLEN satırları üretmek.
 * Çıkarılamayan her şey listeden düşer — "0 okul" yazmak, OSM'de o
 * mahallenin okulları henüz işaretlenmemişken "burada okul yok" demektir
 * ve bu bir olgu değil, bir veri eksikliğidir.
 *
 * ⚠️ HER SATIRIN KAYNAĞI KENDİSİYLE BİRLİKTE TAŞINIYOR. Rakamı gösterip
 * kaynağını sayfanın altına atmak, bu projede rakamın yanında n yazma
 * kuralının ihlalinin başka bir biçimi olurdu.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Kuş uçuşu mesafe uyarısı — ekranda AÇIKÇA yazılır. */
export const KUS_UCUSU_NOTU =
  'Mesafeler kuş uçuşudur; sürüş mesafesi ve süresi daha uzundur. Yol ağı verisi elimizde yok.'

export const OSM_KAYNAGI = 'OpenStreetMap verisinden hesaplandı'
export const SINIR_KAYNAGI = 'Mahalle sınırları: OpenStreetMap'

export interface OlgusalSatir {
  etiket: string
  deger: string
  kaynak: string
  /** Rakamın yanında duran dürüstlük notu. */
  not?: string
}

export interface OlgusalBolum {
  baslik: string
  satirlar: OlgusalSatir[]
  /** Bölümün tamamı için geçerli uyarı. */
  not?: string
}

/** Metre değerini okunur mesafeye çevirir. */
export function mesafeYaz(metre: number): string {
  if (!Number.isFinite(metre) || metre < 0) return '—'
  if (metre < 1000) return `${Math.round(metre / 10) * 10} m`
  return `${(metre / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} km`
}

/**
 * Sosyal donatı türleri — 1 km içinde sayılanlar.
 *
 * ⚠️ Liste kısa tutuldu. Her POI türünü saymak, ekranı okunmaz bir
 * envantere çevirir; buradakiler "burada yaşanır mı" sorusunun
 * cevabına giren türler.
 */
const DONATI_TURLERI = [
  { tip: 'okul', etiket: 'Okul' },
  { tip: 'eczane', etiket: 'Eczane' },
  { tip: 'market', etiket: 'Market' },
  { tip: 'park', etiket: 'Park' },
  { tip: 'durak', etiket: 'Toplu taşıma durağı' },
] as const

export interface OlgusalGirdi {
  /** Mahalle merkezine göre POI yakınlıkları (1 km yarıçap). */
  cevre: readonly PoiMesafesi[]
  /** Sanayi alanlarına mesafeler. */
  sanayi: readonly SanayiMesafesi[]
  /** Mahalle merkezinin ilçe merkezine mesafesi (metre). */
  merkezeMetre: number | null
  nufus: number | null
  ilceNufusu: number | null
  ilceNufusuKaynagi: string | null
}

/**
 * Deri OSB için dürüstlük notu.
 *
 * ⚠️ TEK TARAFLI YAZILAMAZ. Deri OSB yakınlığı hem istihdam avantajı hem
 * yaşam kalitesi sorusu; yalnızca birini yazmak, bir yatırım sitesinde
 * eksik değil YANLIŞ bilgi olur. İki tarafı da yazmak, okuyanın kendi
 * kararını vermesini sağlar.
 */
const DERI_NOTU =
  'Deri OSB hem istihdam kaynağı hem çevresel etki konusudur: bölgede yüzü aşkın deri ' +
  'fabrikası bulunuyor. Yakınlık, iş imkânı açısından avantaj; koku ve çevre açısından ' +
  'değerlendirilmesi gereken bir başlıktır. İkisini birlikte değerlendirin.'

function deriMi(ad: string): boolean {
  return /deri/i.test(ad)
}

/**
 * Çorlu dışındaki organize sanayi bölgeleri — KAYNAKLI eşleme.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU LİSTE BİR TAHMİN DEĞİL, BİR ALINTI.
 *
 * Çorlu Ticaret ve Sanayi Odası'nın organize sanayi bölgeleri sayfası
 * Velimeşe, Ergene 1 ve Ergene 2 OSB'leri Ergene ilçesi altında
 * listeliyor. Bunları Çorlu'nun sanayisi gibi göstermek, ilçenin
 * ekonomik büyüklüğünü olduğundan fazla göstermek olurdu.
 *
 * ⚠️ ÖNCE GEOMETRİYLE HESAPLANMAYA ÇALIŞILDI VE OLMADI. "Nokta mahalle
 * sınırlarımızın içinde mi" testi zarifti ama yanlış soruyu cevaplıyordu:
 * mahalle poligonları ilçenin tamamını kaplamıyor (üretimde 544 POI'nin
 * 438'i, yani %80'i herhangi bir sınırın içinde). Çorlu Deri OSB o testte
 * "dışarıda" çıkıyordu — oysa TSO onu Çorlu'da listeliyor.
 *
 * ⚠️ LİSTEDE OLMAYAN İÇİN HİÇBİR ŞEY SÖYLENMİYOR. Veliköy OSB, TSO'nun
 * bu sayfasında geçmiyor; ilçesi hakkında iddiada bulunulmuyor.
 * ─────────────────────────────────────────────────────────────────────────
 */
const ERGENE_KALIPLARI = [/velimeşe/i, /ergene\s*[12]?/i]

export const TSO_KAYNAGI = 'İlçe bilgisi: Çorlu Ticaret ve Sanayi Odası, OSB listesi'

function ergenedeMi(ad: string): boolean {
  return ERGENE_KALIPLARI.some((kalip) => kalip.test(ad))
}

export function olgusalIskelet(girdi: OlgusalGirdi): OlgusalBolum[] {
  const bolumler: OlgusalBolum[] = []
  const bul = (tip: string) => girdi.cevre.find((m) => m.tip === tip) ?? null

  /* ── 1 · Konum ve ulaşım ─────────────────────────────────────────── */
  const ulasim: OlgusalSatir[] = []

  if (girdi.merkezeMetre !== null) {
    ulasim.push({
      etiket: 'Çorlu merkezine',
      deger: mesafeYaz(girdi.merkezeMetre),
      kaynak: 'Mahalle merkezlerinden hesaplandı',
    })
  }

  const istasyon = bul('istasyon')
  if (istasyon) {
    ulasim.push({
      etiket: 'En yakın tren istasyonu',
      deger: `${istasyon.enYakinAd} · ${mesafeYaz(istasyon.enYakinMetre)}`,
      kaynak: OSM_KAYNAGI,
    })
  }

  const havalimani = bul('havalimani')
  if (havalimani) {
    ulasim.push({
      etiket: 'Havalimanı',
      deger: `${havalimani.enYakinAd} · ${mesafeYaz(havalimani.enYakinMetre)}`,
      kaynak: OSM_KAYNAGI,
    })
  }

  /**
   * ⚠️ D-100 SATIRI YOK VE BU BİLİNÇLİ.
   *
   * D-100 bir nokta değil bir yol; mesafesi ancak yol geometrisiyle
   * hesaplanır ve o veri sistemde yok. En yakın noktayı tahmin etmek,
   * "yaklaşık 2 km" gibi doğrulanamaz bir sayı üretirdi. Satır hiç
   * çizilmiyor.
   */

  if (ulasim.length > 0) {
    bolumler.push({ baslik: 'Konum ve ulaşım', satirlar: ulasim, not: KUS_UCUSU_NOTU })
  }

  /* ── 2 · Sanayi yakınlığı ────────────────────────────────────────── */
  const sanayi: OlgusalSatir[] = girdi.sanayi.map((alan) => ({
    etiket: ergenedeMi(alan.ad) ? `${alan.ad} (Ergene ilçesinde)` : alan.ad,
    deger: mesafeYaz(alan.metre),
    kaynak: ergenedeMi(alan.ad) ? `${OSM_KAYNAGI} · ${TSO_KAYNAGI}` : OSM_KAYNAGI,
    not: deriMi(alan.ad) ? DERI_NOTU : undefined,
  }))

  if (sanayi.length > 0) {
    bolumler.push({
      baslik: 'Sanayi yakınlığı',
      satirlar: sanayi,
      not:
        `${KUS_UCUSU_NOTU} “Ergene ilçesinde” ibaresi Çorlu Ticaret ve Sanayi Odası'nın ` +
        'OSB listesine dayanır; listede geçmeyen bir bölge için ilçe bilgisi verilmez.',
    })
  }

  /* ── 3 · Sosyal donatı ───────────────────────────────────────────── */
  const donati: OlgusalSatir[] = []

  for (const tur of DONATI_TURLERI) {
    const kayit = bul(tur.tip)
    /**
     * ⚠️ SIFIR YAZILMIYOR. `yakindaSayi === 0`, o türde kayıt olmadığını
     * değil, 1 km içinde OSM'de işaretlenmiş kayıt olmadığını gösterir.
     * "0 okul" yazmak veri eksikliğini olguya çevirmek olurdu.
     */
    if (!kayit || kayit.yakindaSayi <= 0) continue
    donati.push({
      etiket: `${tur.etiket} (1 km içinde)`,
      deger: String(kayit.yakindaSayi),
      kaynak: OSM_KAYNAGI,
    })
  }

  const hastane = bul('hastane')
  if (hastane) {
    donati.push({
      etiket: 'En yakın sağlık noktası',
      deger: `${hastane.enYakinAd} · ${mesafeYaz(hastane.enYakinMetre)}`,
      kaynak: OSM_KAYNAGI,
    })
  }

  if (donati.length > 0) {
    bolumler.push({
      baslik: 'Sosyal donatı',
      satirlar: donati,
      not:
        'Sayılar 1 km yarıçapındaki OpenStreetMap kayıtlarıdır. Listelenmeyen bir tür, ' +
        'o türün mahallede bulunmadığı anlamına gelmez — OSM’de henüz işaretlenmemiş olabilir.',
    })
  }

  /* ── 4 · Nüfus ───────────────────────────────────────────────────── */
  const nufus: OlgusalSatir[] = []

  if (girdi.nufus !== null && girdi.nufus > 0) {
    nufus.push({
      etiket: 'Mahalle nüfusu',
      deger: girdi.nufus.toLocaleString('tr-TR'),
      kaynak: girdi.ilceNufusuKaynagi ?? 'Panelden girildi',
    })

    if (girdi.ilceNufusu !== null && girdi.ilceNufusu > 0) {
      const pay = (girdi.nufus / girdi.ilceNufusu) * 100
      nufus.push({
        etiket: 'İlçe nüfusundaki payı',
        deger: `%${pay.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}`,
        kaynak: girdi.ilceNufusuKaynagi ?? 'Hesaplandı',
      })
    }
  }

  if (nufus.length > 0) bolumler.push({ baslik: 'Nüfus', satirlar: nufus })

  return bolumler
}
