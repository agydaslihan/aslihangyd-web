import type { PoiTipi } from '@/collections/IlgiNoktalari'

/**
 * OpenStreetMap etiketleri → bizim POI tiplerimiz.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU EŞLEME BİR YARGIDIR, ÖLÇÜM DEĞİL — VE YAYINLANIR
 *
 * "amenity=clinic bir hastane sayılır mı?" sorusunun nesnel bir cevabı
 * yok; bizim kararımız. Karar sitede `/veri-kaynaklari` sayfasında
 * yayınlanıyor ve buradan besleniyor — iki yerde ayrı yazılsaydı biri
 * değişip diğeri kalırdı.
 *
 * ⚠️ EŞLENMEYEN ETİKET SESSİZCE ATILMAZ
 *
 * OSM'de yüzlerce etiket var; hepsini karşılamıyoruz. Karşılanmayanlar
 * içe aktarma raporunda sayılarıyla listeleniyor. "Eczaneleri de alalım
 * mı?" sorusunu ancak neyin dışarıda kaldığını görerek sorabilirsiniz.
 *
 * ⚠️ LİSANS: OSM verisi ODbL. Atıf zorunlu.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Tek bir eşleme kuralı. */
export interface EslemeKurali {
  /** OSM etiket anahtarı (`amenity`, `shop`, …). */
  anahtar: string
  /** Etiket değeri. */
  deger: string
  tip: PoiTipi
  /** Neden bu tipe eşlendiği — yayınlanan gerekçe. */
  gerekce: string
  /**
   * Bu kural bölgenin değerini belirleyen bir nokta mı?
   * İçe aktarmada `onemli` işareti bundan gelir.
   */
  onemli?: boolean
}

/**
 * Eşleme tablosu.
 *
 * Sıra önemli: bir öğe birden çok kurala uyabilir (örn. hem
 * `amenity=bus_station` hem `public_transport=station`). İlk eşleşen kural
 * kazanır, bu yüzden daha belirgin olanlar üstte.
 */
export const ESLEME_KURALLARI: readonly EslemeKurali[] = [
  // ── Eğitim ──
  {
    anahtar: 'amenity',
    deger: 'university',
    tip: 'universite',
    gerekce: 'Üniversite kampüsü',
    onemli: true,
  },
  { anahtar: 'amenity', deger: 'college', tip: 'universite', gerekce: 'Yüksekokul' },
  { anahtar: 'amenity', deger: 'school', tip: 'okul', gerekce: 'İlk/orta/lise' },
  {
    anahtar: 'amenity',
    deger: 'kindergarten',
    tip: 'okul',
    gerekce: 'Anaokulu ve kreş — sosyal donatı açısından okul kategorisinde sayılıyor',
  },

  // ── Sağlık ──
  { anahtar: 'amenity', deger: 'hospital', tip: 'hastane', gerekce: 'Hastane', onemli: true },
  {
    anahtar: 'amenity',
    deger: 'clinic',
    tip: 'hastane',
    gerekce: 'Poliklinik — tipin etiketi "Hastane / sağlık", sağlık tesisleri buraya giriyor',
  },
  {
    anahtar: 'amenity',
    deger: 'doctors',
    tip: 'hastane',
    gerekce: 'Muayenehane / aile sağlığı merkezi',
  },
  {
    anahtar: 'amenity',
    deger: 'pharmacy',
    tip: 'eczane',
    gerekce:
      'Eczane — sağlık erişiminin günlük ölçüsü. Hastane "var mı yok mu" ' +
      'sorusunu, eczane "yürüme mesafesinde mi" sorusunu yanıtlıyor.',
  },

  // ── Alışveriş ──
  { anahtar: 'shop', deger: 'mall', tip: 'avm', gerekce: 'Alışveriş merkezi', onemli: true },
  { anahtar: 'shop', deger: 'department_store', tip: 'avm', gerekce: 'Çok katlı mağaza' },
  { anahtar: 'shop', deger: 'supermarket', tip: 'market', gerekce: 'Süpermarket' },
  {
    anahtar: 'shop',
    deger: 'convenience',
    tip: 'market',
    gerekce: 'Bakkal / mini market — yürüme mesafesindeki günlük alışveriş',
  },

  // ── Yeşil alan ──
  { anahtar: 'leisure', deger: 'park', tip: 'park', gerekce: 'Park' },
  {
    anahtar: 'leisure',
    deger: 'playground',
    tip: 'oyun_alani',
    gerekce:
      'Çocuk oyun alanı — çocuklu aile için mahalle kalitesinin doğrudan ' +
      'göstergesi. Parktan ayrı sayılıyor: her park oyun alanı içermiyor.',
  },

  // ── Sanayi ──
  {
    anahtar: 'landuse',
    deger: 'industrial',
    tip: 'sanayi',
    gerekce: 'Sanayi alanı — OSB ve fabrika bölgeleri bu etiketle geliyor',
    onemli: true,
  },

  // ── Ulaşım ──
  {
    anahtar: 'aeroway',
    deger: 'aerodrome',
    tip: 'havalimani',
    gerekce: 'Havalimanı',
    onemli: true,
  },
  {
    anahtar: 'railway',
    deger: 'station',
    tip: 'istasyon',
    gerekce: 'Tren istasyonu',
    onemli: true,
  },
  { anahtar: 'railway', deger: 'halt', tip: 'istasyon', gerekce: 'Tren durağı' },
  {
    anahtar: 'amenity',
    deger: 'bus_station',
    tip: 'durak',
    gerekce: 'Otogar / terminal',
    onemli: true,
  },
  { anahtar: 'highway', deger: 'bus_stop', tip: 'durak', gerekce: 'Otobüs durağı' },

  // ── Resmî ──
  { anahtar: 'amenity', deger: 'townhall', tip: 'resmi', gerekce: 'Belediye' },
  { anahtar: 'amenity', deger: 'police', tip: 'resmi', gerekce: 'Emniyet' },
  { anahtar: 'amenity', deger: 'post_office', tip: 'resmi', gerekce: 'Postane' },
  { anahtar: 'office', deger: 'government', tip: 'resmi', gerekce: 'Kamu kurumu' },
]

/**
 * Bilinçli olarak eşlenmeyen türler.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN AYRI BİR LİSTE VAR
 *
 * Eşlenmeyen tür raporu her içe aktarmada okunuyor. O raporda çok sayıda
 * kayıtla görünen ama **almamaya karar verdiğimiz** türler var. Karar
 * yazılı olmasaydı aynı soru her seferinde yeniden sorulur ve her seferinde
 * baştan tartışılırdı.
 *
 * Buradaki türler raporda "aktarılmadı, isterseniz ekleriz" diye değil,
 * "bilinçli olarak dışarıda — sebebi şu" diye görünüyor.
 * ─────────────────────────────────────────────────────────────────────────
 */
export interface DisaridaKurali {
  anahtar: string
  deger: string
  gerekce: string
}

export const BILINCLI_DISARIDA: readonly DisaridaKurali[] = [
  {
    anahtar: 'amenity',
    deger: 'restaurant',
    gerekce:
      'Sinyal değeri düşük: restoran yoğunluğu mahalle değerini tek başına ' +
      'açıklamıyor ve merkeziyeti zaten AVM, market ve ulaşım kriterleriyle ' +
      'ölçüyoruz. Eklemek veriye gürültü katardı.',
  },
]

const DISARIDA_ETIKETLERI = new Map(
  BILINCLI_DISARIDA.map((kural) => [`${kural.anahtar}=${kural.deger}`, kural.gerekce]),
)

/** Bu etiket bilinçli olarak mı dışarıda? Gerekçesini döner, yoksa `null`. */
export function bilincliDisaridaGerekcesi(etiket: string): string | null {
  return DISARIDA_ETIKETLERI.get(etiket) ?? null
}

export interface EslemeSonucu {
  tip: PoiTipi
  onemli: boolean
  /** Eşleşmeyi sağlayan etiket — raporda gösterilir. */
  etiket: string
}

/**
 * Bir OSM öğesinin etiketlerinden tip çıkarır.
 *
 * Eşleşme yoksa `null` — çağıran bunu **sayar ve raporlar**, sessizce
 * atmaz.
 */
export function tipiEslestir(etiketler: Record<string, string> | undefined): EslemeSonucu | null {
  if (!etiketler) return null

  for (const kural of ESLEME_KURALLARI) {
    if (etiketler[kural.anahtar] === kural.deger) {
      return {
        tip: kural.tip,
        onemli: kural.onemli === true,
        etiket: `${kural.anahtar}=${kural.deger}`,
      }
    }
  }

  return null
}

/**
 * Eşlenmeyen bir öğenin hangi etiketle geldiğini özetler.
 *
 * Raporda "hangi türden kaç tane atlandı" diyebilmek için; ham etiket
 * yığınını göstermek okunmaz olurdu.
 */
export function eslenmeyenEtiket(etiketler: Record<string, string> | undefined): string {
  if (!etiketler) return '(etiketsiz)'

  // Eşleme tablosunda kullandığımız anahtarlar — biri varsa onu göster.
  for (const anahtar of [
    'amenity',
    'shop',
    'leisure',
    'landuse',
    'railway',
    'highway',
    'office',
    'aeroway',
  ]) {
    const deger = etiketler[anahtar]
    if (typeof deger === 'string' && deger !== '') return `${anahtar}=${deger}`
  }

  return '(tanınmayan etiket)'
}

/** Overpass sorgusunun soracağı etiket filtreleri — eşleme tablosundan türer. */
export function sorguFiltreleri(): string[] {
  const benzersiz = new Set(ESLEME_KURALLARI.map((k) => `["${k.anahtar}"="${k.deger}"]`))
  return [...benzersiz]
}
