import { ESLEME_KURALLARI, eslenmeyenEtiket, tipiEslestir } from './eslesme'

import type { PoiTipi } from '@/collections/IlgiNoktalari'

/**
 * Overpass API sorgusu ve cevabının çözümlenmesi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ÇORLU SINIRI MAHALLE MERKEZLERİNDEN TÜRETİLİR
 *
 * Sabit bir Çorlu kutusu koda yazılmadı. İki sebep:
 *
 * 1. **Uydurma veri riski.** Çorlu'nun sınır koordinatlarını ezberden
 *    yazmak, doğrulanmamış bir rakamı koda gömmek olurdu (CLAUDE.md kural 2).
 * 2. **Kendiliğinden doğru kalır.** Yeni bir mahalle eklendiğinde kutu
 *    büyür; sabit bir kutu o mahalleyi dışarıda bırakırdı ve kimse fark
 *    etmezdi.
 *
 * Kutu, merkez noktası tanımlı mahallelerin çevresine bir marj eklenerek
 * hesaplanır. Hiç merkez yoksa içe aktarma çalışmaz ve sebebini söyler —
 * sessizce tüm dünyayı sorgulamaktansa durmak doğru.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Sınırlayıcı kutu. */
export interface Kutu {
  guney: number
  bati: number
  kuzey: number
  dogu: number
}

/** Mahalle merkezlerinin çevresine eklenen varsayılan pay. */
export const VARSAYILAN_MARJ_METRE = 5_000

/**
 * Kutunun büyüyebileceği azami kenar uzunluğu (derece).
 *
 * ⚠️ Kaza koruması: bir mahallenin merkezi yanlışlıkla başka bir ile
 * girildiyse kutu ülke ölçeğine şişer ve Overpass'a devasa bir sorgu
 * gider. ~1,5° yaklaşık 165 km — Çorlu için fazlasıyla geniş, ülke için
 * fazlasıyla dar.
 */
export const AZAMI_KENAR_DERECE = 1.5

/** Bir derece enlemin metre karşılığı (küresel yaklaşıklık). */
const DERECE_METRE = 111_320

/**
 * Değer süzgeci OLMADAN sorulan etiket anahtarları.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN BAZILARI GENİŞ, BAZILARI DAR
 *
 * Geniş sormanın amacı **eşleme tablomuzda olmayanı görebilmek**: sorgu
 * yalnızca eşlediğimiz değerleri isteseydi "neyin dışarıda kaldığı" raporu
 * daima boş çıkardı ve "eczaneleri de alalım mı?" sorusu hiç sorulamazdı.
 *
 * Ama her anahtar geniş sorulamaz:
 *  · `highway` — her yol parçası bu etiketle gelir; geniş sormak ilçedeki
 *    bütün yol ağını indirmek olurdu
 *  · `railway` — her ray parçası
 *  · `landuse` — konut/tarım alanı poligonları, sayıca çok
 *  · `aeroway` — pist ve taksi yolu parçaları
 *
 * Bu dördü değer süzgeciyle dar kalıyor. Geniş sorulanlar POI niteliğinde
 * ve sayıları ilçe ölçeğinde makul.
 * ─────────────────────────────────────────────────────────────────────────
 */
const GENIS_SORULAN_ANAHTARLAR = new Set(['amenity', 'shop', 'leisure', 'office'])

/**
 * Merkez noktalarından sınırlayıcı kutu.
 *
 * @param noktalar `[boylam, enlem]` çiftleri
 * @param marjMetre Kenarlara eklenecek pay
 */
export function merkezlerdenKutu(
  noktalar: readonly { boylam: number; enlem: number }[],
  marjMetre: number = VARSAYILAN_MARJ_METRE,
): Kutu | null {
  const gecerli = noktalar.filter((n) => Number.isFinite(n.boylam) && Number.isFinite(n.enlem))
  if (gecerli.length === 0) return null

  const enlemler = gecerli.map((n) => n.enlem)
  const boylamlar = gecerli.map((n) => n.boylam)

  const ortalamaEnlem = enlemler.reduce((t, e) => t + e, 0) / enlemler.length

  const enlemMarji = marjMetre / DERECE_METRE
  // Boylam dereceleri kutuplara doğru daralır; enleme göre düzeltilir.
  const boylamMarji = marjMetre / (DERECE_METRE * Math.cos((ortalamaEnlem * Math.PI) / 180))

  return {
    guney: Math.min(...enlemler) - enlemMarji,
    kuzey: Math.max(...enlemler) + enlemMarji,
    bati: Math.min(...boylamlar) - boylamMarji,
    dogu: Math.max(...boylamlar) + boylamMarji,
  }
}

/** Kutu makul büyüklükte mi? */
export function kutuMakulMu(kutu: Kutu): boolean {
  const yukseklik = kutu.kuzey - kutu.guney
  const genislik = kutu.dogu - kutu.bati
  if (!(yukseklik > 0) || !(genislik > 0)) return false
  return yukseklik <= AZAMI_KENAR_DERECE && genislik <= AZAMI_KENAR_DERECE
}

/**
 * Overpass QL sorgusu — eşleme tablosundan türetilir.
 *
 * ⚠️ Sorgu elle yazılmıyor: filtreler `ESLEME_KURALLARI`den üretiliyor.
 * İkisi ayrı yazılsaydı tabloya yeni bir tip eklenip sorguya eklenmemesi
 * (ya da tersi) an meselesiydi.
 */
export function overpassSorgusu(kutu: Kutu, zamanAsimiSaniye = 60): string {
  // Anahtara göre grupla: tek regex, çok daha kısa sorgu.
  const gruplar = new Map<string, Set<string>>()
  for (const kural of ESLEME_KURALLARI) {
    const mevcut = gruplar.get(kural.anahtar) ?? new Set<string>()
    mevcut.add(kural.deger)
    gruplar.set(kural.anahtar, mevcut)
  }

  const alan = `${kutu.guney},${kutu.bati},${kutu.kuzey},${kutu.dogu}`

  const satirlar: string[] = []
  for (const [anahtar, degerler] of gruplar) {
    // ⚠️ GENİŞ SORULAN ANAHTARLARDA DEĞER SÜZGECİ YOK — BİLİNÇLİ.
    //
    // Yalnızca eşlediğimiz değerleri sorsaydık, "neyin dışarıda kaldığını"
    // gösteren rapor daima boş çıkardı: sorduğumuz her şey zaten eşleşirdi.
    // "Eczaneleri de alalım mı?" sorusunu ancak eczaneleri görerek
    // sorabilirsiniz. Bu anahtarlarda tüm değerler isteniyor; eşlemede
    // karşılığı olmayanlar içe aktarılmıyor, yalnızca raporda sayılıyor.
    const satir = GENIS_SORULAN_ANAHTARLAR.has(anahtar)
      ? `["${anahtar}"]`
      : `["${anahtar}"~"^(${[...degerler].join('|')})$"]`

    // Nokta, alan ve ilişki: okul bir nokta, OSB bir alan olarak işaretli olabilir.
    satirlar.push(`  node${satir}(${alan});`)
    satirlar.push(`  way${satir}(${alan});`)
    satirlar.push(`  relation${satir}(${alan});`)
  }

  // `out center`: alan ve ilişkiler için ağırlık merkezi gelsin — bizim
  // veri modelimiz tek nokta tutuyor.
  return [
    `[out:json][timeout:${zamanAsimiSaniye}];`,
    '(',
    ...satirlar,
    ');',
    'out center tags;',
  ].join('\n')
}

/* ══════════════════════════════════════════════════════════════════════════
   Cevabın çözümlenmesi
   ══════════════════════════════════════════════════════════════════════════ */

export interface OsmAdayi {
  /** "node/123456" — yeniden içe aktarmada eşleştirme anahtarı. */
  osmKimlik: string
  ad: string
  tip: PoiTipi
  onemli: boolean
  boylam: number
  enlem: number
  /** Eşleşmeyi sağlayan etiket — önizlemede gösterilir. */
  etiket: string
}

export interface CozumlemeOzeti {
  adaylar: OsmAdayi[]
  /** Adı olmadığı için atlananlar. */
  adsizAtlandi: number
  /** Konumu çözülemediği için atlananlar. */
  konumsuzAtlandi: number
  /**
   * Eşleme tablosunda karşılığı olmayanlar — etikete göre sayılır.
   *
   * ⚠️ Sessizce atılmıyor: "eczaneleri de alalım mı?" sorusunu ancak
   * neyin dışarıda kaldığını görerek sorabilirsiniz.
   */
  eslenmeyenler: { etiket: string; sayi: number }[]
}

interface OverpassOgesi {
  type?: unknown
  id?: unknown
  lat?: unknown
  lon?: unknown
  center?: { lat?: unknown; lon?: unknown }
  tags?: Record<string, string>
}

function sayi(deger: unknown): number | null {
  return typeof deger === 'number' && Number.isFinite(deger) ? deger : null
}

/**
 * Overpass JSON cevabını adaylara çevirir.
 *
 * ⚠️ Ad zorunlu. Adsız bir POI ("okul") mahalle sayfasında "en yakın okul:
 * (isimsiz)" diye görünürdü — bilgi değil gürültü. Atlananlar sayılıyor.
 */
export function overpassCevabiniCoz(ham: unknown): CozumlemeOzeti {
  const ogeler = (ham as { elements?: unknown })?.elements
  if (!Array.isArray(ogeler)) {
    return { adaylar: [], adsizAtlandi: 0, konumsuzAtlandi: 0, eslenmeyenler: [] }
  }

  const adaylar: OsmAdayi[] = []
  const eslenmeyenSayaci = new Map<string, number>()
  let adsizAtlandi = 0
  let konumsuzAtlandi = 0

  for (const hamOge of ogeler) {
    const oge = hamOge as OverpassOgesi
    const eslesme = tipiEslestir(oge.tags)

    if (!eslesme) {
      const etiket = eslenmeyenEtiket(oge.tags)
      eslenmeyenSayaci.set(etiket, (eslenmeyenSayaci.get(etiket) ?? 0) + 1)
      continue
    }

    const ad = oge.tags?.['name']?.trim()
    if (!ad) {
      adsizAtlandi += 1
      continue
    }

    // Nokta ise lat/lon; alan/ilişki ise `out center` ile gelen merkez.
    const enlem = sayi(oge.lat) ?? sayi(oge.center?.lat)
    const boylam = sayi(oge.lon) ?? sayi(oge.center?.lon)
    if (enlem === null || boylam === null) {
      konumsuzAtlandi += 1
      continue
    }

    const tur = typeof oge.type === 'string' ? oge.type : 'node'
    const kimlik = sayi(oge.id)
    if (kimlik === null) {
      konumsuzAtlandi += 1
      continue
    }

    adaylar.push({
      osmKimlik: `${tur}/${kimlik}`,
      ad,
      tip: eslesme.tip,
      onemli: eslesme.onemli,
      boylam,
      enlem,
      etiket: eslesme.etiket,
    })
  }

  return {
    adaylar,
    adsizAtlandi,
    konumsuzAtlandi,
    eslenmeyenler: [...eslenmeyenSayaci.entries()]
      .map(([etiket, sayi]) => ({ etiket, sayi }))
      .sort((a, b) => b.sayi - a.sayi),
  }
}
