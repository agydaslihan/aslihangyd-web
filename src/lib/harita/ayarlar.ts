/**
 * Harita yapılandırması — istemcide de okunabilen saf sabitler.
 *
 * ⚠️ MapTiler anahtarı ve stil adresi BU DOSYADA DEĞİL.
 *
 * Anahtar çalışma zamanında sunucuda okunuyor (`sunucu.ts`) ve bileşenlere
 * prop olarak iniyor. Gerekçe orada yazılı; özeti: `NEXT_PUBLIC_` önekli bir
 * değişken derleme anında gömülür ve üretim imajımız o değer olmadan
 * derlendiği için harita üretimde hiç açılmıyordu.
 */

/**
 * Çorlu merkezi — haritanın varsayılan odağı.
 *
 * ⚠️ Yalnızca haritanın nereye bakacağını belirler. Hiçbir mesafe
 * hesabında, alan sorgusunda veya ziyaretçiye gösterilen veride
 * kullanılmaz — mahalle sınırları OpenStreetMap'ten idari sınır adıyla
 * çekilir, POI arama alanı da mahalle merkezlerinden türetilir.
 *
 * Değer 14 Ağustos 2026'da Aslıhan'ın verdiği ilçe merkezi koordinatıyla
 * güncellendi (41,155250 K — 27,812860 D); öncesinde yuvarlanmış bir
 * yaklaşıklıktı.
 */
export const CORLU_MERKEZ: [number, number] = [27.81286, 41.15525]
export const VARSAYILAN_YAKINLIK = 12

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
