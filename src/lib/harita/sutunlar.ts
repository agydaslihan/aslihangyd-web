/**
 * 3B fiyat sütunlarının geometrisi ve ölçeklenmesi.
 *
 * Saf fonksiyonlar — MapLibre'ye bağımlı değil, bu yüzden test edilebilir.
 * Haritanın "yıldız" özelliği burada hesaplanıyor: her mahalle merkezinde,
 * seçili veri kipine göre yükselen bir sütun.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ SÜTUNLAR TEK RENKTİR.
 *
 * Fiyatı hem yükseklikle hem renkle kodlamak (yaygın "ısı haritası + sütun"
 * yaklaşımı) haritayı rengarenk yapar ve gözü yorar. Yükseklik tek başına
 * karşılaştırma için yeterli bir kanal. Tek renk istisnası seçili mahalle:
 * o da vurgu için, veri için değil.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ VERİSİ OLMAYAN MAHALLENİN SÜTUNU YOKTUR. Sıfır yükseklikli bir sütun
 * "değeri sıfır" der; hiç sütun olmaması "bilmiyoruz" der. İkisi farklı
 * şeyler ve bu bir yatırım sitesi (CLAUDE.md kural 2).
 */

/** Sütunun gerçek dünyadaki yarıçapı (metre). */
export const SUTUN_YARICAPI_M = 300

/**
 * En yüksek sütunun metre karşılığı.
 *
 * Yakınlık 12'de yaklaşık 38 m/piksel; 2500 m ≈ 65 piksel. Daha yükseği
 * eğik bakışta komşu mahalleleri kapatıyor, daha alçağı farkı okutmuyor.
 */
export const AZAMI_SUTUN_M = 2500

/** En düşük görünür sütun — veri var ama küçük olduğunda kaybolmasın. */
export const ASGARI_SUTUN_M = 220

export type VeriKipi = 'satisM2' | 'kira' | 'kiraCarpani' | 'yatirimSkoru'

export interface VeriKipiTanimi {
  anahtar: VeriKipi
  etiket: string
  /** Göstergede yazan açıklama. */
  aciklama: string
  birim: 'para' | 'yil' | 'puan'
  /**
   * Büyük değer "iyi" mi?
   *
   * Kira çarpanında küçük olan iyidir (yatırım daha çabuk amorti eder).
   * Sütun yüksekliği yine de ham değeri gösterir — "iyiyi" yükseğe
   * çevirmek, haritayı okuyanın kafasını karıştırır ve gizli bir
   * yorum katmanı ekler.
   */
  buyukIyi: boolean
}

export const VERI_KIPLERI: readonly VeriKipiTanimi[] = [
  {
    anahtar: 'satisM2',
    etiket: 'Satış m²',
    aciklama: 'Sütun yüksekliği = ortalama m² satış fiyatı',
    birim: 'para',
    buyukIyi: true,
  },
  {
    anahtar: 'kira',
    etiket: 'Kira',
    aciklama: 'Sütun yüksekliği = ortalama aylık kira',
    birim: 'para',
    buyukIyi: true,
  },
  {
    anahtar: 'kiraCarpani',
    etiket: 'Kira çarpanı',
    aciklama: 'Sütun yüksekliği = kira çarpanı (küçük olan daha hızlı amorti eder)',
    birim: 'yil',
    buyukIyi: false,
  },
  {
    anahtar: 'yatirimSkoru',
    etiket: 'Yatırım skoru',
    aciklama: 'Sütun yüksekliği = yatırım skoru (0–100)',
    birim: 'puan',
    buyukIyi: true,
  },
]

export function veriKipiTanimi(kip: VeriKipi): VeriKipiTanimi {
  const tanim = VERI_KIPLERI.find((aday) => aday.anahtar === kip)
  if (tanim === undefined) throw new Error(`Bilinmeyen veri kipi: ${kip}`)
  return tanim
}

/* ══════════════════════════════════════════════════════════════════════════
   Geometri
   ══════════════════════════════════════════════════════════════════════════ */

export type Konum = readonly [boylam: number, enlem: number]

const DUNYA_YARICAPI_M = 6_378_137

/**
 * Merkez etrafında düzgün çokgen üretir.
 *
 * Sütun bir daire olmalı ama GeoJSON'da daire yok; 12 köşeli bir çokgen
 * ekranda daireden ayırt edilmiyor ve `fill-extrusion` ile ucuz çiziliyor.
 *
 * Boylam ölçeği enleme göre daralır (cos φ); bu düzeltme yapılmazsa
 * sütunlar 41. paralelde belirgin biçimde eliptik çıkar.
 */
export function cokgenUret(merkez: Konum, yaricapM: number, kose = 12): number[][] {
  const [boylam, enlem] = merkez
  const enlemRad = (enlem * Math.PI) / 180

  const enlemDerece = (yaricapM / DUNYA_YARICAPI_M) * (180 / Math.PI)
  const boylamDerece = enlemDerece / Math.max(Math.cos(enlemRad), 1e-6)

  const halka: number[][] = []
  for (let sira = 0; sira < kose; sira += 1) {
    const aci = (2 * Math.PI * sira) / kose
    halka.push([boylam + boylamDerece * Math.cos(aci), enlem + enlemDerece * Math.sin(aci)])
  }
  // GeoJSON halkası kapalı olmalı.
  halka.push([...(halka[0] as number[])])
  return halka
}

/**
 * GeoJSON geometrisinin kaba ağırlık merkezi.
 *
 * Gerçek bir alan ağırlık merkezi değil, köşe noktalarının ortalaması.
 * Sütunun nereye konacağını belirlemek için yeterli; hiçbir mesafe ya da
 * alan hesabında kullanılmaz.
 */
export function kabaMerkez(geometri: unknown): Konum | null {
  const noktalar: number[][] = []

  const gez = (dugum: unknown): void => {
    if (!Array.isArray(dugum)) return
    if (typeof dugum[0] === 'number' && typeof dugum[1] === 'number') {
      noktalar.push(dugum as number[])
      return
    }
    for (const cocuk of dugum) gez(cocuk)
  }

  if (typeof geometri === 'object' && geometri !== null) {
    gez((geometri as { coordinates?: unknown }).coordinates)
  }

  if (noktalar.length === 0) return null

  let boylamToplam = 0
  let enlemToplam = 0
  for (const [boylam, enlem] of noktalar) {
    boylamToplam += boylam as number
    enlemToplam += enlem as number
  }

  return [boylamToplam / noktalar.length, enlemToplam / noktalar.length]
}

/* ══════════════════════════════════════════════════════════════════════════
   Ölçekleme
   ══════════════════════════════════════════════════════════════════════════ */

export interface SutunGirdisi {
  slug: string
  ad: string
  /**
   * Mahalle merkezi. `null` ise sütun çizilemez ama mahalle listede kalır.
   *
   * ⚠️ "Konumu yok" ile "verisi yok" farklı şeylerdir ve ayrı ayrı
   * gösterilir. Konumu girilmemiş bir mahalleyi tümden düşürmek, arayüzün
   * o mahalle hiç yokmuş gibi davranmasına yol açıyordu.
   */
  merkez: Konum | null
  /** Seçili kipteki ham değer. `null` ise sütun ÜRETİLMEZ. */
  deger: number | null
  /** Kaç gözleme dayandığı. Etikette gösterilir. */
  gozlemSayisi: number | null
}

export interface SutunOzellikleri {
  slug: string
  ad: string
  deger: number
  yukseklik: number
  etiket: string
}

/**
 * Değerleri sütun yüksekliğine çevirir.
 *
 * Ölçek her zaman SIFIRDAN başlar. Alt sınırı en küçük değere çekmek
 * (yaygın "eksen kırpma" numarası) küçük farkları dramatik gösterir ve
 * yatırımcıyı yanıltır. Sıfırdan başlayan ölçekte 42.000 ile 44.000 arası
 * fark küçük görünür — çünkü küçüktür.
 */
export function yukseklikleriHesapla(
  girdiler: readonly SutunGirdisi[],
  etiketle: (deger: number) => string,
): SutunOzellikleri[] {
  const veriliOlanlar = girdiler.filter(
    (girdi): girdi is SutunGirdisi & { deger: number } =>
      typeof girdi.deger === 'number' && Number.isFinite(girdi.deger) && girdi.deger > 0,
  )

  if (veriliOlanlar.length === 0) return []

  const azami = Math.max(...veriliOlanlar.map((girdi) => girdi.deger))

  return veriliOlanlar.map((girdi) => ({
    slug: girdi.slug,
    ad: girdi.ad,
    deger: girdi.deger,
    yukseklik: Math.max(ASGARI_SUTUN_M, (girdi.deger / azami) * AZAMI_SUTUN_M),
    etiket: etiketle(girdi.deger),
  }))
}

/** Sütunları MapLibre'nin beklediği GeoJSON'a çevirir. */
export function sutunKatmani(
  sutunlar: readonly SutunOzellikleri[],
  merkezBul: (slug: string) => Konum | null,
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: sutunlar.flatMap((sutun) => {
      const merkez = merkezBul(sutun.slug)
      if (merkez === null) return []

      return [
        {
          type: 'Feature' as const,
          geometry: {
            type: 'Polygon' as const,
            coordinates: [cokgenUret(merkez, SUTUN_YARICAPI_M)],
          },
          properties: {
            slug: sutun.slug,
            ad: sutun.ad,
            yukseklik: sutun.yukseklik,
            etiket: sutun.etiket,
          },
        },
      ]
    }),
  }
}
