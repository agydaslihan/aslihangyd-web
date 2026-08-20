import type { Konum } from './sutunlar'

/**
 * Harita geometrisi çözümleyicileri.
 *
 * ⚠️ Eskiden `/harita` sayfasının içindeydi. Ana sayfaya ikinci bir harita
 * bölümü gelince kopyalanacaklardı; kopyalanan bir çözümleyici, CMS'ten
 * gelen biçim değiştiğinde bir tarafta sessizce `null` üretir ve o mahalle
 * haritadan düşer — hata vermeden.
 */

/** Payload `point` alanı `[boylam, enlem]` dizisi olarak gelir. */
export function noktaCoz(ham: unknown): Konum | null {
  if (!Array.isArray(ham) || ham.length < 2) return null
  const [boylam, enlem] = ham
  if (typeof boylam !== 'number' || typeof enlem !== 'number') return null
  if (!Number.isFinite(boylam) || !Number.isFinite(enlem)) return null
  return [boylam, enlem]
}

/**
 * CMS'e yapıştırılan GeoJSON'u geometriye çevirir.
 *
 * geojson.io tam bir `FeatureCollection` üretir; kullanıcıdan sadece
 * geometriyi ayıklamasını beklemek gereksiz bir engel olurdu, bu yüzden
 * her iki biçimi de kabul ediyoruz.
 */
export function geometriCoz(ham: unknown): GeoJSON.Geometry | null {
  if (typeof ham !== 'object' || ham === null) return null
  const veri = ham as Record<string, unknown>

  if (veri.type === 'FeatureCollection' && Array.isArray(veri.features)) {
    const ilk = veri.features[0] as Record<string, unknown> | undefined
    return (ilk?.geometry as GeoJSON.Geometry) ?? null
  }
  if (veri.type === 'Feature') {
    return (veri.geometry as GeoJSON.Geometry) ?? null
  }
  if (veri.type === 'Polygon' || veri.type === 'MultiPolygon') {
    return veri as unknown as GeoJSON.Geometry
  }

  return null
}
