import type { SinirGeometrisi } from './sinirSorgusu'

/**
 * Mahalle sınırından küçük SVG silüeti.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: HER KART AYNI GÖRÜNÜYORDU.
 *
 * Mahalle kartlarında genel bir konum ikonu vardı — 26 kartın 26'sında
 * aynı. Oysa her mahallenin gerçek bir şekli var ve o şekil onu benzersiz
 * kılıyor. Dış görsel gerektirmeden, elimizdeki veriden.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ SUNUCUDA ÜRETİLİYOR. Poligonlar yüzlerce noktalı; istemciye ham
 * koordinat göndermek her kart için kilobaytlar demekti. Burada
 * sadeleştirilip tek bir `path` dizesine çevriliyor.
 */

/** Üretilen SVG'nin kutusu — kartlarda sabit ölçü. */
export const SILUET_KUTUSU = 100

/**
 * Sadeleştirme toleransı (viewBox birimi).
 *
 * ⚠️ Değer küçük bir kutuya göre seçildi: 100 birimlik kutuda 0,6'dan kısa
 * sapmalar zaten çizilemiyor. Daha küçük tolerans yalnızca dosya boyutunu
 * büyütür, görüntüyü değiştirmez.
 */
export const TOLERANS = 0.6

interface Nokta {
  x: number
  y: number
}

/**
 * Douglas-Peucker — halkayı görünürde aynı kalacak şekilde inceltir.
 *
 * ⚠️ Nokta ATLAMA (her n'inciyi al) ile karıştırılmamalı. Atlama, keskin
 * köşeleri rastgele siler ve şekli tanınmaz hâle getirir; Douglas-Peucker
 * en çok sapan noktayı korur, yani şeklin karakterini taşıyan köşeler
 * kalır.
 */
export function sadelestir(noktalar: readonly Nokta[], tolerans: number): Nokta[] {
  if (noktalar.length <= 2) return [...noktalar]

  const ilk = noktalar[0] as Nokta
  const son = noktalar[noktalar.length - 1] as Nokta

  let enUzak = 0
  let sira = 0

  for (let i = 1; i < noktalar.length - 1; i += 1) {
    const uzaklik = dogruyaUzaklik(noktalar[i] as Nokta, ilk, son)
    if (uzaklik > enUzak) {
      enUzak = uzaklik
      sira = i
    }
  }

  if (enUzak <= tolerans) return [ilk, son]

  const sol = sadelestir(noktalar.slice(0, sira + 1), tolerans)
  const sag = sadelestir(noktalar.slice(sira), tolerans)
  return [...sol.slice(0, -1), ...sag]
}

/** Noktanın a-b doğru parçasına dik uzaklığı. */
function dogruyaUzaklik(nokta: Nokta, a: Nokta, b: Nokta): number {
  const dx = b.x - a.x
  const dy = b.y - a.y

  // Dejenere parça: uzaklık noktadan noktaya.
  if (dx === 0 && dy === 0) return Math.hypot(nokta.x - a.x, nokta.y - a.y)

  const t = ((nokta.x - a.x) * dx + (nokta.y - a.y) * dy) / (dx * dx + dy * dy)
  const sinirli = Math.max(0, Math.min(1, t))

  return Math.hypot(nokta.x - (a.x + sinirli * dx), nokta.y - (a.y + sinirli * dy))
}

/** Geometrideki tüm dış halkalar — `[boylam, enlem]` çiftleri. */
function disHalkalar(geometri: SinirGeometrisi): number[][][] {
  if (geometri.type === 'Polygon') return geometri.coordinates.slice(0, 1)
  // MultiPolygon: her poligonun yalnızca dış halkası.
  return geometri.coordinates.map((poligon) => poligon[0] ?? []).filter((halka) => halka.length > 0)
}

export interface Siluet {
  /** SVG `d` özniteliği. */
  yol: string
  /** Kaç noktadan kaça indi — panelde ve testte ölçülebilsin. */
  hamNokta: number
  sadeNokta: number
}

/**
 * Geometriyi kutuya sığdırılmış SVG yoluna çevirir.
 *
 * ⚠️ ENLEM TERS ÇEVRİLİYOR. Coğrafyada enlem yukarı artar, SVG'de y aşağı
 * artar. Çevrilmezse her mahalle dikey aynada çizilir — tanınır ama
 * YANLIŞ, ve yanlışlığı ancak haritayla yan yana koyunca fark edilir.
 *
 * ⚠️ ORAN KORUNUYOR. Kutuya germek her mahalleyi kareye yayardı ve
 * şekiller birbirine benzerdi — silüetin bütün amacı ayırt edilebilirlik.
 *
 * @returns Geometri kullanılamıyorsa `null`
 */
export function siluetUret(geometri: unknown, kutu: number = SILUET_KUTUSU): Siluet | null {
  const geo = geometri as SinirGeometrisi | null | undefined
  if (!geo || (geo.type !== 'Polygon' && geo.type !== 'MultiPolygon')) return null
  if (!Array.isArray(geo.coordinates) || geo.coordinates.length === 0) return null

  const halkalar = disHalkalar(geo)
  if (halkalar.length === 0) return null

  // ── Sınırlayıcı kutu ──
  let enKucukX = Infinity
  let enBuyukX = -Infinity
  let enKucukY = Infinity
  let enBuyukY = -Infinity
  let hamNokta = 0

  for (const halka of halkalar) {
    for (const nokta of halka) {
      const x = nokta[0]
      const y = nokta[1]
      if (typeof x !== 'number' || typeof y !== 'number') continue
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue
      hamNokta += 1
      if (x < enKucukX) enKucukX = x
      if (x > enBuyukX) enBuyukX = x
      if (y < enKucukY) enKucukY = y
      if (y > enBuyukY) enBuyukY = y
    }
  }

  if (hamNokta < 3) return null

  const genislik = enBuyukX - enKucukX
  const yukseklik = enBuyukY - enKucukY
  if (!(genislik > 0) || !(yukseklik > 0)) return null

  // Oranı koruyarak sığdır ve ortala.
  const olcek = kutu / Math.max(genislik, yukseklik)
  const kaydirX = (kutu - genislik * olcek) / 2
  const kaydirY = (kutu - yukseklik * olcek) / 2

  const parcalar: string[] = []
  let sadeNokta = 0

  for (const halka of halkalar) {
    const donusmus: Nokta[] = []
    for (const nokta of halka) {
      const x = nokta[0]
      const y = nokta[1]
      if (typeof x !== 'number' || typeof y !== 'number') continue
      donusmus.push({
        x: (x - enKucukX) * olcek + kaydirX,
        // ⚠️ Enlem ters: SVG'de y aşağı artar.
        y: kutu - ((y - enKucukY) * olcek + kaydirY),
      })
    }

    const sade = sadelestir(donusmus, TOLERANS)
    if (sade.length < 3) continue
    sadeNokta += sade.length

    const yaz = (n: Nokta) => `${n.x.toFixed(1)} ${n.y.toFixed(1)}`
    parcalar.push(`M${yaz(sade[0] as Nokta)}L${sade.slice(1).map(yaz).join('L')}Z`)
  }

  if (parcalar.length === 0) return null

  return { yol: parcalar.join(''), hamNokta, sadeNokta }
}
