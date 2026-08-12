/**
 * Harita yapılandırması.
 *
 * MapTiler anahtarı yoksa harita HİÇ yüklenmez — bileşen boş durum gösterir.
 * Anahtarsız bir MapLibre örneği boş gri bir dikdörtgen çizer ve bu, "site
 * bozuk" izlenimi verir.
 */

export const MAPTILER_ANAHTARI = process.env.NEXT_PUBLIC_MAPTILER_API_KEY ?? ''

export function haritaHazirMi(): boolean {
  return MAPTILER_ANAHTARI.trim().length > 0
}

/**
 * Çorlu merkezi — haritanın varsayılan odağı.
 *
 * ⚠️ Bu koordinat Çorlu ilçe merkezinin yaklaşık konumudur ve yalnızca
 * haritanın nereye bakacağını belirler. Hiçbir mesafe hesabında veya
 * ziyaretçiye gösterilen veride kullanılmaz.
 */
export const CORLU_MERKEZ: [number, number] = [27.8, 41.16]
export const VARSAYILAN_YAKINLIK = 12

export function stilAdresi(): string {
  // "streets-v2" dengeli bir taban; uydu görüntüsü mahalle sınırlarını
  // okumayı zorlaştırıyor, sade vektör harita veriyi öne çıkarıyor.
  return `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_ANAHTARI}`
}

/** POI tiplerinin harita üzerindeki renkleri — tasarım paletiyle uyumlu. */
export const POI_RENKLERI: Record<string, string> = {
  okul: '#3b6ea5',
  universite: '#3b6ea5',
  hastane: '#a5533b',
  eczane: '#a5533b',
  market: '#5a8a5a',
  avm: '#5a8a5a',
  park: '#4a8a5f',
  oyun_alani: '#4a8a5f',
  sanayi: '#8a7040',
  durak: '#6b6b7a',
  istasyon: '#6b6b7a',
  havalimani: '#6b6b7a',
  resmi: '#7a6b8a',
}

export function poiRengi(tip: string): string {
  return POI_RENKLERI[tip] ?? '#6b6b7a'
}
