import type { PoiTipi } from '@/collections/IlgiNoktalari'

/**
 * Yakınlık modülünün ortak tipleri.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ KUŞ UÇUŞU — SÜRÜŞ SÜRESİ DEĞİL
 *
 * Bu modüldeki her mesafe **kuş uçuşudur**. PROJE-PLANI.md'de "sanayiye
 * 10 dakika" ifadesi geçiyor; dakika üretmek için yol ağı ve rotalama
 * motoru gerekir (OSRM/Valhalla) ve elimizde yok. Mesafeyi varsayılan bir
 * hıza bölüp "12 dakika" yazmak, bilmediğimiz bir şeyi iddia etmek olurdu
 * — CLAUDE.md kural 2 kapsamında uydurma veridir.
 *
 * Bu yüzden arayüzde daima "kuş uçuşu" etiketiyle, kilometre olarak
 * gösterilir. Rotalama gelirse tip buraya eklenir, etiket değişir.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Bir noktaya göre tek bir POI tipinin yakınlık özeti. */
export interface PoiMesafesi {
  tip: PoiTipi
  /** En yakın kaydın adı — arayüzde "Çorlu OSB · 3,4 km" olarak görünür. */
  enYakinAd: string
  /** En yakın kayda kuş uçuşu mesafe, metre. */
  enYakinMetre: number
  /** `YOGUNLUK_YARICAPI_METRE` içindeki kayıt sayısı. */
  yakindaSayi: number
  /** En yakın kaydın "öne çıkan nokta" işareti. */
  onemli: boolean
}

/** Skor önerisi üretilirken tek bir mahallenin girdisi. */
export interface MahalleYakinligi {
  slug: string
  ad: string
  mesafeler: readonly PoiMesafesi[]
}

/** Yakınlıktan türetilebilen yatırım skoru bileşenleri. */
export type YakinlikBileseni = 'sanayiYakinligi' | 'ulasim' | 'sosyalDonati'

/**
 * Bir bileşen için öneri.
 *
 * ⚠️ Bu bir **öneri**dir, skor değildir. Panele yazılmaz; Aslıhan görür,
 * değerlendirir, isterse alanı kendisi doldurur. Gerekçesi olmadan puan
 * göstermek, projenin her yerinde reddedilen "kara kutu puan" olurdu.
 */
export interface BilesenOnerisi {
  bilesen: YakinlikBileseni
  /** 0–100. `null` = öneri üretilemedi (sebebi `eksikler` içinde). */
  puan: number | null
  /** Puanın nasıl çıktığı — satır satır, arayüzde aynen gösterilir. */
  gerekce: string[]
  /** Öneriyi engelleyen veya zayıflatan veri boşlukları. */
  eksikler: string[]
}

export const BILESEN_ETIKETLERI: Record<YakinlikBileseni, string> = {
  sanayiYakinligi: 'Sanayi / istihdam yakınlığı',
  ulasim: 'Ulaşım erişilebilirliği',
  sosyalDonati: 'Sosyal donatı',
}

/** Sosyal donatı yoğunluğunun sayıldığı yarıçap (metre). */
export const YOGUNLUK_YARICAPI_METRE = 1_000

/**
 * Mahalle sayfasında "çevre" listesinde gösterilecek tiplerin sırası.
 * Yatırımcı için önem sırasına göre; en üstte değer sürücüleri.
 */
export const CEVRE_GOSTERIM_SIRASI: readonly PoiTipi[] = [
  'sanayi',
  'istasyon',
  'havalimani',
  'hastane',
  'universite',
  'okul',
  'avm',
  'market',
  'park',
  'durak',
  'resmi',
] as const
