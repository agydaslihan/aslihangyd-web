import 'server-only'

import { bolumAcikMi } from '@/lib/veri/siteBolumleri'

/**
 * Google Places katmanının açma/kapama koşulları.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ İKİ KOŞUL BİRDEN — AI ARAMADAKİ DESENİN AYNISI
 *
 * Katman yalnızca şu ikisi birlikte sağlandığında çalışır:
 *   1. Site Bölümleri → `google_places` açık (varsayılan KAPALI)
 *   2. `GOOGLE_PLACES_API_KEY` tanımlı
 *
 * Tek koşul yetseydi, anahtar sunucuya konur konmaz özellik kendiliğinden
 * açılırdı — kimse açmaya karar vermemiş olurken. Ya da anahtarsız açık bir
 * bayrak, her istekte sessizce hata veren bir arayüz üretirdi.
 *
 * ⚠️ ANAHTAR YOKSA ÖZELLİK SESSİZCE KAPALI, HATA DEĞİL. OpenStreetMap
 * verisiyle her şey çalışmaya devam eder; Google yalnızca üstüne bir katman.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ `import 'server-only'` bilinçli. Anahtar hiçbir koşulda istemci
 * paketine girmemeli; bu dosyayı bir istemci bileşeni import ederse
 * derleme hata verir.
 */

/**
 * ⚠️ Ön eksiz ad, çalışma zamanında okunuyor (CLAUDE.md kural 7b).
 * `NEXT_PUBLIC_` önekli bir ad derleme anında gömülür ve üretim imajı bu
 * değişkenler tanımsızken derlendiği için yayında BOŞ kalırdı.
 */
export function googlePlacesAnahtari(): string {
  const deger = process.env.GOOGLE_PLACES_API_KEY
  return typeof deger === 'string' ? deger.trim() : ''
}

export function googlePlacesAnahtariVarMi(): boolean {
  return googlePlacesAnahtari() !== ''
}

export type GoogleKapaliSebebi = 'bolum_kapali' | 'anahtar_yok'

/** Katman neden kapalı? `null` = açık. */
export async function googlePlacesKapaliSebebi(): Promise<GoogleKapaliSebebi | null> {
  if (!(await bolumAcikMi('google_places'))) return 'bolum_kapali'
  if (!googlePlacesAnahtariVarMi()) return 'anahtar_yok'
  return null
}

export async function googlePlacesEtkinMi(): Promise<boolean> {
  return (await googlePlacesKapaliSebebi()) === null
}
