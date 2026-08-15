import { slugUret } from '@/lib/slug'

/**
 * Mahalle sınırlarının OpenStreetMap'ten çözülmesi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ARAMA ALANI KOORDİNATLA DEĞİL, İDARİ SINIRLA TARİF EDİLİYOR
 *
 * POI içe aktarmada alan mahalle merkezlerinden hesaplanıyor. Burada o yol
 * kapalı: sınırları çekmemizin sebebi zaten merkezlerin BOŞ olması —
 * merkezden alan hesaplamak, aramak için önce bulmuş olmayı gerektirirdi.
 *
 * Çözüm koda koordinat gömmek değil: OpenStreetMap'e "Çorlu ilçesinin idari
 * sınırı içindeki mahalleler" diye soruyoruz. İlçe sınırını OSM'in kendisi
 * biliyor; biz yalnızca adını söylüyoruz. Bu, hem CLAUDE.md'nin "Çorlu
 * koordinatı koda gömülmez" kuralına uyuyor hem de kutu yaklaşımından daha
 * isabetli: dikdörtgen bir kutu komşu ilçelerin mahallelerini de getirirdi.
 *
 * ⚠️ Yine de komşu ilçeden kayıt sızabilir: Overpass bir alanla kesişen
 * ilişkileri de döndürür. Bunlar kendiliğinden eleniyor — sınır YALNIZCA
 * sistemde zaten var olan bir mahalleye ada göre eşleşirse yazılıyor.
 * Eşleşmeyenler sessizce atılmıyor, raporda listeleniyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Sınırları çekilecek ilçe.
 *
 * ⚠️ Bu bir koordinat değil, projenin konusu. Site Çorlu odaklı kuruldu;
 * ilçe adı zaten sayfa başlıklarından meta etiketlere kadar her yerde.
 * Koordinat gömmenin sakıncası (doğrulanmamış rakam, sessizce yanlış alan)
 * bir ilçe adı için geçerli değil: yanlışsa sorgu hiçbir şey döndürmez ve
 * bu ekranda hemen görülür.
 */
export const ILCE_ADI = 'Çorlu'

/**
 * Mahallenin aranacağı idari seviyeler.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BURASI BİR VARSAYIMDI VE VARSAYIM YANLIŞTI — 15 Ağustos 2026
 *
 * Önceki hâli tek bir sayıydı: `MAHALLE_IDARI_SEVIYESI = 10`. Gerekçesi
 * OSM belgelerinde Türkiye için mahalle seviyesinin 10 gösterilmesiydi.
 * **Çorlu'nun 26 mahallesi OSM'de `admin_level=8` ile kayıtlı.** Sorgu bu
 * yüzden sıfır sonuç döndürüyordu ve panel 27 mahallenin hepsini "OSM'de
 * bulunamadı" diye listeliyordu — yani veri vardı, biz yanlış yere
 * bakıyorduk.
 *
 * Ders: belgelenmiş seviye ile fiilen etiketlenmiş seviye aynı olmak
 * zorunda değil. OSM gönüllü katkıdır; şema tavsiyedir, veri gerçektir.
 *
 * Bu yüzden artık tek sayı değil KÜME sorgulanıyor. Fazladan gelen kayıt
 * zarar vermiyor: sınır yalnızca adı sistemde olan bir mahalleye yazılıyor,
 * eşleşmeyen aday panelde listeleniyor. Seviye yarın 10'a düzeltilirse de
 * içe aktarma çalışmaya devam eder.
 * ─────────────────────────────────────────────────────────────────────────
 */
export const MAHALLE_IDARI_SEVIYELERI = [8, 9, 10] as const

/** İlçe idari seviyesi — Çorlu için OSM'de doğrulandı (relation/1771127). */
export const ILCE_IDARI_SEVIYESI = 6

/** Koordinatların yuvarlanacağı ondalık basamak (~10 cm). */
const KOORDINAT_HASSASIYETI = 6

/** Tek seferde çözülecek azami sınır — kaza koruması. */
export const AZAMI_SINIR = 200

export interface Nokta {
  enlem: number
  boylam: number
}

/**
 * GeoJSON geometrisi — `Mahalleler.sinir` alanına yazılan biçim.
 *
 * Ayrık birleşim (discriminated union) bilinçli: `type` ile `coordinates`
 * derinliği birbirine bağlı. Tek bir arayüzde `number[][][] |
 * number[][][][]` yazılsaydı, `Polygon` etiketli bir kayda çok katmanlı
 * koordinat yazmak derleyiciden geçerdi ve hata ancak haritada görünürdü.
 */
export type SinirGeometrisi =
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] }

export interface SinirAdayi {
  /** "relation/123456" — yeniden içe aktarmada eşleştirme anahtarı. */
  osmKimlik: string
  /** OSM'deki ham ad ("Muhittin Mahallesi"). */
  osmAdi: string
  /** Ekler atılmış ad ("Muhittin") — eşleştirme bunun slug'ıyla yapılır. */
  sadeAd: string
  slug: string
  geometri: SinirGeometrisi
  /** Alan ağırlıklı merkez — `[boylam, enlem]`, Payload `point` sırası. */
  merkez: [number, number]
  /** Halkadaki toplam nokta sayısı — panelde kabalık göstergesi. */
  noktaSayisi: number
}

export interface SinirCozumlemesi {
  adaylar: SinirAdayi[]
  /** Adı olmadığı için atlananlar. */
  adsizAtlandi: number
  /** Geometrisi kapalı bir halkaya dönüşmediği için atlananlar. */
  geometrisizAtlandi: number
}

/**
 * Overpass QL sorgusu.
 *
 * `map_to_area` ilçe ilişkisini bir alana çeviriyor; ardından o alanın
 * içindeki mahalle sınırları isteniyor.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ `out body geom` — `out geom tags` DEĞİL. BU FARK SORGUYU ÖLDÜRÜYORDU.
 *
 * Overpass'te `out` ifadesinin iki ayrı boyutu var: **ayrıntı seviyesi**
 * (`ids` · `skel` · `body` · `tags` · `meta`) ve **geometri kipi**
 * (`geom` · `bb` · `center`). `tags` bir ayrıntı seviyesidir ve "yalnızca
 * kimlik + etiket" demektir: **ilişkinin üyelerini bastırır.** Üye kalmayınca
 * `geom` de tutunacak bir şey bulamayıp sadece `bounds` (kaba dikdörtgen)
 * döndürür.
 *
 * Sonuç: cevap dolu geliyordu (87 öğe, doğru adlarla), ama her ilişkide
 * `members` yoktu. Çözümleyici bunu haklı olarak "geometrisiz" sayıp
 * atlıyordu. Yani hata mesajı vermeyen, sayıları da doğru görünen bir
 * sorgu, tek kelimelik bir kip hatası yüzünden 26 mahallenin hepsini
 * sessizce düşürüyordu.
 *
 * `body` varsayılan ayrıntı seviyesidir ve üyeleri getirir; `geom` o
 * üyelere koordinat dizilerini ekler. Sınır poligonu ancak bunlarla kurulur.
 *
 * ⚠️ POI sorgusundaki `out center tags` DOĞRUDUR ve buraya örnek alınmamalı:
 * orada nokta/alan merkezleri isteniyor, üye geometrisi değil. İki sorgunun
 * ihtiyacı farklı olduğu için kipleri de farklı.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ Yol (`way`) tarafında `["name"]` şartı var: adsız yollar zaten
 * ilişkilerin sınır parçalarıdır, geometrileri üye olarak geliyor. Şartsız
 * hâlinde cevap 87 öğeydi ve 59'u adsız parçaydı; panelde "59 sınır adı
 * olmadığı için atlandı" satırı, veri kaybedilmiş izlenimi veriyordu.
 */
export function sinirSorgusu(ilceAdi: string = ILCE_ADI, zamanAsimiSaniye = 180): string {
  const ad = ilceAdi.replace(/["\\]/g, '')
  const seviyeler = `^(${MAHALLE_IDARI_SEVIYELERI.join('|')})$`

  return [
    `[out:json][timeout:${zamanAsimiSaniye}];`,
    `relation["boundary"="administrative"]["admin_level"="${ILCE_IDARI_SEVIYESI}"]["name"="${ad}"];`,
    'map_to_area->.ilce;',
    '(',
    `  relation(area.ilce)["boundary"="administrative"]["admin_level"~"${seviyeler}"]["name"];`,
    `  way(area.ilce)["boundary"="administrative"]["admin_level"~"${seviyeler}"]["name"];`,
    ');',
    'out body geom;',
  ].join('\n')
}

/* ══════════════════════════════════════════════════════════════════════════
   Ad sadeleştirme
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * OSM adındaki idari eki atar.
 *
 * OSM'de aynı mahalle "Muhittin", "Muhittin Mahallesi" ya da "Muhittin Mah."
 * olarak yazılmış olabilir; bizim kayıtlarımızda ek yok. Ek atılmazsa
 * eşleşme tutmaz ve içe aktarma "hiçbir mahalle bulunamadı" der.
 *
 * ⚠️ "Köyü" eki de atılıyor: eski köyler OSM'de hâlâ köy adıyla geçebilir
 * ve bizim listemizde mahalle olarak duruyorlar.
 */
export function adiSadelestir(ham: string): string {
  return ham
    .trim()
    .replace(/\s+(mahallesi|mahalle|mah\.?|köyü|koyu|köy)\s*$/iu, '')
    .trim()
}

/* ══════════════════════════════════════════════════════════════════════════
   Halka birleştirme
   ══════════════════════════════════════════════════════════════════════════ */

function anahtar(nokta: Nokta): string {
  return `${nokta.enlem.toFixed(7)},${nokta.boylam.toFixed(7)}`
}

function halkaKapaliMi(halka: Nokta[]): boolean {
  if (halka.length < 4) return false
  const ilk = halka[0] as Nokta
  const son = halka[halka.length - 1] as Nokta
  return anahtar(ilk) === anahtar(son)
}

/**
 * Yol parçalarını kapalı halkalara birleştirir.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN GEREKLİ
 *
 * OSM'de bir mahalle sınırı tek bir kapalı çizgi değildir: komşu
 * mahallelerle paylaşılan yol parçalarının birleşimidir ve parçalar rastgele
 * sırada, rastgele yönde gelir. Ham parçaları olduğu gibi bir poligona
 * çevirmek, haritada birbirine karışmış çizgiler üretirdi.
 *
 * Algoritma: bir parçayla başla, ucuna değen bir parça bul (gerekirse ters
 * çevirerek ekle), halka kapanana kadar sürdür. Kapanmayan artıklar
 * DÜŞÜRÜLÜR ve sayılır — yarım bir sınır çizmektense o mahalleyi atlamak
 * doğru; yarım sınır haritada sessizce yanlış bir alan gösterirdi.
 * ─────────────────────────────────────────────────────────────────────────
 */
export function halkalariBirlestir(parcalar: readonly Nokta[][]): {
  halkalar: Nokta[][]
  kapanmayan: number
} {
  const kalanlar = parcalar.filter((parca) => parca.length >= 2).map((parca) => [...parca])
  const halkalar: Nokta[][] = []
  let kapanmayan = 0

  while (kalanlar.length > 0) {
    const halka = kalanlar.shift() as Nokta[]

    let eklendi = true
    while (eklendi && !halkaKapaliMi(halka)) {
      eklendi = false
      const son = anahtar(halka[halka.length - 1] as Nokta)

      for (let sira = 0; sira < kalanlar.length; sira += 1) {
        const aday = kalanlar[sira] as Nokta[]
        const adayBas = anahtar(aday[0] as Nokta)
        const adaySon = anahtar(aday[aday.length - 1] as Nokta)

        if (adayBas === son) {
          halka.push(...aday.slice(1))
        } else if (adaySon === son) {
          halka.push(...[...aday].reverse().slice(1))
        } else {
          continue
        }

        kalanlar.splice(sira, 1)
        eklendi = true
        break
      }
    }

    if (halkaKapaliMi(halka)) halkalar.push(halka)
    else kapanmayan += 1
  }

  return { halkalar, kapanmayan }
}

/* ══════════════════════════════════════════════════════════════════════════
   Alan, merkez ve iç halka yerleştirme
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Halkanın işaretli alanı (ayakkabı bağı formülü), derece kare cinsinden.
 *
 * Mutlak büyüklüğü coğrafi olarak anlamlı değil — yalnızca halkaları
 * büyüklüğe göre sıralamak ve merkezi ağırlıklandırmak için kullanılıyor.
 * Gerçek bir yüzölçümü iddiası yok; olsaydı projeksiyon düzeltmesi gerekirdi.
 */
export function halkaAlani(halka: readonly Nokta[]): number {
  let toplam = 0
  for (let i = 0; i < halka.length - 1; i += 1) {
    const a = halka[i] as Nokta
    const b = halka[i + 1] as Nokta
    toplam += a.boylam * b.enlem - b.boylam * a.enlem
  }
  return toplam / 2
}

/**
 * Halkanın alan ağırlıklı merkezi.
 *
 * ⚠️ Köşe noktalarının ortalaması DEĞİL. Ortalama, noktaların sık çizildiği
 * kenara doğru kayar; bir mahallenin merkezi böylece sınıra yapışabilir ve
 * harita o mahalleyi yanlış yere odaklardı.
 */
export function halkaMerkezi(halka: readonly Nokta[]): Nokta | null {
  if (halka.length < 4) return null

  let alanToplam = 0
  let boylamToplam = 0
  let enlemToplam = 0

  for (let i = 0; i < halka.length - 1; i += 1) {
    const a = halka[i] as Nokta
    const b = halka[i + 1] as Nokta
    const capraz = a.boylam * b.enlem - b.boylam * a.enlem
    alanToplam += capraz
    boylamToplam += (a.boylam + b.boylam) * capraz
    enlemToplam += (a.enlem + b.enlem) * capraz
  }

  // Dejenere halka (sıfır alan): köşe ortalamasına düş.
  if (Math.abs(alanToplam) < 1e-12) {
    const nokta = halka.reduce(
      (toplam, n) => ({ enlem: toplam.enlem + n.enlem, boylam: toplam.boylam + n.boylam }),
      { enlem: 0, boylam: 0 },
    )
    return { enlem: nokta.enlem / halka.length, boylam: nokta.boylam / halka.length }
  }

  const carpan = 1 / (3 * alanToplam)
  return { boylam: boylamToplam * carpan, enlem: enlemToplam * carpan }
}

/** Nokta halkanın içinde mi (ışın atma). */
export function noktaHalkadaMi(nokta: Nokta, halka: readonly Nokta[]): boolean {
  let icinde = false
  for (let i = 0, j = halka.length - 1; i < halka.length; j = i, i += 1) {
    const a = halka[i] as Nokta
    const b = halka[j] as Nokta
    const kesisiyor = a.enlem > nokta.enlem !== b.enlem > nokta.enlem
    if (!kesisiyor) continue
    const x = ((b.boylam - a.boylam) * (nokta.enlem - a.enlem)) / (b.enlem - a.enlem) + a.boylam
    if (nokta.boylam < x) icinde = !icinde
  }
  return icinde
}

function yuvarla(deger: number): number {
  const carpan = 10 ** KOORDINAT_HASSASIYETI
  return Math.round(deger * carpan) / carpan
}

function halkayiKoordinata(halka: readonly Nokta[]): number[][] {
  return halka.map((nokta) => [yuvarla(nokta.boylam), yuvarla(nokta.enlem)])
}

/**
 * Dış ve iç halkalardan GeoJSON geometrisi kurar.
 *
 * İç halka (`inner`) bir "delik"tir — mahallenin ortasında kalan başka bir
 * idari alan. Hangi dış halkanın deliği olduğu, ilk noktasının hangi dış
 * halkanın içinde kaldığına bakılarak bulunuyor.
 */
export function geometriKur(
  disHalkalar: readonly Nokta[][],
  icHalkalar: readonly Nokta[][] = [],
): SinirGeometrisi | null {
  const gecerliDis = disHalkalar.filter((halka) => halka.length >= 4)
  if (gecerliDis.length === 0) return null

  // Her poligon bir halka listesi: ilki dış sınır, sonrakiler delikler.
  const poligonlar: number[][][][] = gecerliDis.map((halka) => [halkayiKoordinata(halka)])

  for (const ic of icHalkalar) {
    if (ic.length < 4) continue
    const ilk = ic[0] as Nokta
    const sira = gecerliDis.findIndex((dis) => noktaHalkadaMi(ilk, dis))
    const hedef = poligonlar[sira === -1 ? 0 : sira]
    hedef?.push(halkayiKoordinata(ic))
  }

  const tek = poligonlar[0]
  if (poligonlar.length === 1 && tek) return { type: 'Polygon', coordinates: tek }

  return { type: 'MultiPolygon', coordinates: poligonlar }
}

/**
 * Geometrinin merkezi — en büyük dış halkanın alan merkezi.
 *
 * En büyüğü seçmek bilinçli: bir mahallenin sınırı ana gövde ile birlikte
 * küçük bir ek parçadan oluşabiliyor. Hepsinin ortalaması, merkezi ikisinin
 * arasındaki boşluğa — çoğu zaman mahallenin dışına — düşürürdü.
 */
export function geometriMerkezi(disHalkalar: readonly Nokta[][]): [number, number] | null {
  let enBuyuk: Nokta[] | null = null
  let enBuyukAlan = -1

  for (const halka of disHalkalar) {
    const alan = Math.abs(halkaAlani(halka))
    if (alan > enBuyukAlan) {
      enBuyukAlan = alan
      enBuyuk = [...halka]
    }
  }

  if (!enBuyuk) return null
  const merkez = halkaMerkezi(enBuyuk)
  if (!merkez) return null

  return [yuvarla(merkez.boylam), yuvarla(merkez.enlem)]
}

/* ══════════════════════════════════════════════════════════════════════════
   Overpass cevabının çözümlenmesi
   ══════════════════════════════════════════════════════════════════════════ */

interface OverpassGeometri {
  lat?: unknown
  lon?: unknown
}

interface OverpassUye {
  type?: unknown
  role?: unknown
  geometry?: unknown
}

interface OverpassOgesi {
  type?: unknown
  id?: unknown
  tags?: Record<string, string>
  geometry?: unknown
  members?: unknown
}

function noktalariCoz(ham: unknown): Nokta[] {
  if (!Array.isArray(ham)) return []

  const noktalar: Nokta[] = []
  for (const oge of ham) {
    const { lat, lon } = (oge ?? {}) as OverpassGeometri
    if (typeof lat !== 'number' || typeof lon !== 'number') continue
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    noktalar.push({ enlem: lat, boylam: lon })
  }
  return noktalar
}

/** Bir öğenin dış ve iç halka parçalarını toplar. */
function parcalariTopla(oge: OverpassOgesi): { dis: Nokta[][]; ic: Nokta[][] } {
  const dis: Nokta[][] = []
  const ic: Nokta[][] = []

  if (oge.type === 'way') {
    const noktalar = noktalariCoz(oge.geometry)
    if (noktalar.length >= 2) dis.push(noktalar)
    return { dis, ic }
  }

  if (!Array.isArray(oge.members)) return { dis, ic }

  for (const hamUye of oge.members) {
    const uye = (hamUye ?? {}) as OverpassUye
    if (uye.type !== 'way') continue

    const noktalar = noktalariCoz(uye.geometry)
    if (noktalar.length < 2) continue

    // Rolü boş üyeler de dış sınır sayılır: OSM'de `outer` rolü sık sık
    // yazılmadan bırakılıyor ve o üyeleri atmak sınırı yarım bırakırdı.
    if (uye.role === 'inner') ic.push(noktalar)
    else dis.push(noktalar)
  }

  return { dis, ic }
}

/** Overpass JSON cevabını sınır adaylarına çevirir. */
export function sinirCevabiniCoz(ham: unknown): SinirCozumlemesi {
  const ogeler = (ham as { elements?: unknown })?.elements
  if (!Array.isArray(ogeler)) {
    return { adaylar: [], adsizAtlandi: 0, geometrisizAtlandi: 0 }
  }

  const adaylar: SinirAdayi[] = []
  let adsizAtlandi = 0
  let geometrisizAtlandi = 0

  for (const hamOge of ogeler) {
    const oge = (hamOge ?? {}) as OverpassOgesi

    // `map_to_area` alan öğeleri de döndürebilir; onların geometrisi yok.
    if (oge.type !== 'way' && oge.type !== 'relation') continue

    const osmAdi = oge.tags?.['name']?.trim() ?? ''
    if (osmAdi === '') {
      adsizAtlandi += 1
      continue
    }

    const kimlik = typeof oge.id === 'number' ? oge.id : null
    if (kimlik === null) {
      geometrisizAtlandi += 1
      continue
    }

    const parcalar = parcalariTopla(oge)
    const disBirlesim = halkalariBirlestir(parcalar.dis)
    const icBirlesim = halkalariBirlestir(parcalar.ic)

    const geometri = geometriKur(disBirlesim.halkalar, icBirlesim.halkalar)
    const merkez = geometriMerkezi(disBirlesim.halkalar)

    if (!geometri || !merkez) {
      geometrisizAtlandi += 1
      continue
    }

    const sadeAd = adiSadelestir(osmAdi)

    adaylar.push({
      osmKimlik: `${oge.type}/${kimlik}`,
      osmAdi,
      sadeAd,
      slug: slugUret(sadeAd),
      geometri,
      merkez,
      noktaSayisi: disBirlesim.halkalar.reduce((toplam, halka) => toplam + halka.length, 0),
    })
  }

  return { adaylar, adsizAtlandi, geometrisizAtlandi }
}
