import 'server-only'

import type { Payload } from 'payload'

import { googlePlacesAnahtari } from './ayarlar'
import { cagriyiSay } from './sayac'

/**
 * Google Places API (New) istemcisi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU SCRAPING DEĞİL — RESMÎ API, KENDİ ANAHTARIMIZLA
 *
 * CLAUDE.md kural 6 ilan platformlarından otomatik veri çekmeyi yasaklıyor;
 * gerekçe kullanım koşullarının ihlali ve veri tabanı hakkı riski. Burada
 * ikisi de yok: Google Places bu iş için yapılmış, ücretli, sözleşmeli bir
 * arayüz ve anahtar bizim.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ GOOGLE İÇERİĞİ VERİTABANIMIZA YAZILMAZ
 *
 * Places lisansı, yer kimliği (`place_id`) dışındaki içeriğin kalıcı olarak
 * saklanmasına izin vermiyor. Bu yüzden veri modelimizde Google'dan gelen
 * TEK ŞEY `googlePlaceId` alanıdır. Ad, adres, çalışma saati, telefon —
 * hiçbiri kaydedilmiyor; her biri gösterileceği anda çekiliyor ve
 * gösterimin yanında Google atfı basılıyor.
 *
 * Bunun bedeli var: her gösterim bir çağrı, her çağrı bir kuruş. Bu yüzden
 * detay çağrısı sayfa açılışında DEĞİL, ziyaretçi "çalışma saatleri" diye
 * sorduğunda yapılıyor ve aylık çağrı sayısı panelde görünüyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

const ARAMA_ADRESI = 'https://places.googleapis.com/v1/places:searchText'
const DETAY_ADRESI = 'https://places.googleapis.com/v1/places'

/** Ağ zaman aşımı — bir zenginleştirme sayfayı bekletmemeli. */
const ZAMAN_ASIMI_MS = 8_000

/**
 * Arama sonucunda istenen alanlar.
 *
 * ⚠️ Alan maskesi ZORUNLU ve dar tutuluyor: Places faturası istenen alan
 * katmanına göre değişiyor, geniş maske gereksiz pahalı.
 */
const ARAMA_ALANLARI = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.primaryTypeDisplayName',
].join(',')

const DETAY_ALANLARI = [
  'id',
  'displayName',
  'formattedAddress',
  'businessStatus',
  'regularOpeningHours',
  'googleMapsUri',
  'nationalPhoneNumber',
  'websiteUri',
].join(',')

export interface GoogleAdayi {
  placeId: string
  ad: string
  adres: string | null
  kategori: string | null
  enlem: number | null
  boylam: number | null
}

export interface GoogleDetayi {
  placeId: string
  ad: string
  adres: string | null
  /** Haftanın günlerine göre çalışma saatleri — Google'ın yazdığı gibi. */
  calismaSaatleri: string[]
  /** Şu anda açık mı; Google bildirmiyorsa `null`. */
  suAnAcik: boolean | null
  /** 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY' | null */
  isletmeDurumu: string | null
  telefon: string | null
  siteAdresi: string | null
  haritaAdresi: string | null
}

export type GoogleSonucu<T> =
  { durum: 'tamam'; veri: T } | { durum: 'kapali' } | { durum: 'hata'; mesaj: string }

async function istek(
  adres: string,
  alanMaskesi: string,
  govde?: unknown,
): Promise<Record<string, unknown>> {
  const anahtar = googlePlacesAnahtari()
  const kontrol = new AbortController()
  const zamanlayici = setTimeout(() => kontrol.abort(), ZAMAN_ASIMI_MS)

  try {
    const cevap = await fetch(adres, {
      method: govde === undefined ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        // ⚠️ Anahtar başlıkta gider, sorgu dizesinde DEĞİL: sorgu dizeleri
        // ara sunucu ve erişim günlüklerine düşer.
        'X-Goog-Api-Key': anahtar,
        'X-Goog-FieldMask': alanMaskesi,
      },
      body: govde === undefined ? undefined : JSON.stringify(govde),
      signal: kontrol.signal,
      // Lisans gereği önbelleklenmiyor — her gösterim taze veri.
      cache: 'no-store',
    })

    if (!cevap.ok) {
      throw new Error(`Google Places ${cevap.status} döndü.`)
    }

    return (await cevap.json()) as Record<string, unknown>
  } finally {
    clearTimeout(zamanlayici)
  }
}

function metin(deger: unknown): string | null {
  return typeof deger === 'string' && deger.trim() !== '' ? deger.trim() : null
}

function gorunenAd(deger: unknown): string | null {
  if (typeof deger === 'string') return metin(deger)
  if (typeof deger === 'object' && deger !== null) {
    return metin((deger as { text?: unknown }).text)
  }
  return null
}

function hataMesaji(hata: unknown): string {
  if (hata instanceof Error && hata.name === 'AbortError') {
    return 'Google zamanında yanıt vermedi.'
  }
  return hata instanceof Error ? hata.message : 'Google Places çağrısı başarısız oldu.'
}

/**
 * Metin araması — bir POI'yi Google'daki karşılığıyla eşleştirmek için.
 *
 * Konum verilirse arama o noktanın çevresine yönlendiriliyor: "Muhittin
 * Eczanesi" Türkiye'de onlarca yerde var ve en yakını istiyoruz.
 */
export async function yerAra(
  payload: Payload,
  sorgu: string,
  konum?: { enlem: number; boylam: number },
  yaricapMetre = 2_000,
): Promise<GoogleSonucu<GoogleAdayi[]>> {
  if (googlePlacesAnahtari() === '') return { durum: 'kapali' }
  if (sorgu.trim() === '') return { durum: 'tamam', veri: [] }

  const govde: Record<string, unknown> = {
    textQuery: sorgu,
    languageCode: 'tr',
    regionCode: 'TR',
    maxResultCount: 5,
  }

  if (konum) {
    govde.locationBias = {
      circle: {
        center: { latitude: konum.enlem, longitude: konum.boylam },
        radius: yaricapMetre,
      },
    }
  }

  try {
    const cevap = await istek(ARAMA_ADRESI, ARAMA_ALANLARI, govde)
    await cagriyiSay(payload, 'arama')

    const yerler = Array.isArray(cevap.places) ? cevap.places : []

    const adaylar: GoogleAdayi[] = []
    for (const hamYer of yerler) {
      const yer = (hamYer ?? {}) as Record<string, unknown>
      const placeId = metin(yer.id)
      const ad = gorunenAd(yer.displayName)
      if (placeId === null || ad === null) continue

      const konumu = (yer.location ?? {}) as { latitude?: unknown; longitude?: unknown }

      adaylar.push({
        placeId,
        ad,
        adres: metin(yer.formattedAddress),
        kategori: gorunenAd(yer.primaryTypeDisplayName),
        enlem: typeof konumu.latitude === 'number' ? konumu.latitude : null,
        boylam: typeof konumu.longitude === 'number' ? konumu.longitude : null,
      })
    }

    return { durum: 'tamam', veri: adaylar }
  } catch (hata) {
    return { durum: 'hata', mesaj: hataMesaji(hata) }
  }
}

/**
 * Yer detayı — çalışma saatleri ve güncel durum.
 *
 * ⚠️ Sonuç HİÇBİR YERE YAZILMAZ: ne veritabanına, ne önbelleğe, ne günlüğe.
 * Lisans kısıtı bir yana, saklanan bir çalışma saati birkaç gün içinde
 * yanlışa dönüşür ve yanlış bilgi vermek hiç bilgi vermemekten kötüdür.
 */
export async function yerDetayi(
  payload: Payload,
  placeId: string,
): Promise<GoogleSonucu<GoogleDetayi>> {
  if (googlePlacesAnahtari() === '') return { durum: 'kapali' }

  const temiz = placeId.trim()
  if (temiz === '' || !/^[A-Za-z0-9_-]+$/.test(temiz)) {
    return { durum: 'hata', mesaj: 'Geçersiz Google yer kimliği.' }
  }

  try {
    const cevap = await istek(`${DETAY_ADRESI}/${encodeURIComponent(temiz)}`, DETAY_ALANLARI)
    await cagriyiSay(payload, 'detay')

    const saatler = (cevap.regularOpeningHours ?? {}) as {
      weekdayDescriptions?: unknown
      openNow?: unknown
    }

    const ad = gorunenAd(cevap.displayName)

    return {
      durum: 'tamam',
      veri: {
        placeId: metin(cevap.id) ?? temiz,
        ad: ad ?? '',
        adres: metin(cevap.formattedAddress),
        calismaSaatleri: Array.isArray(saatler.weekdayDescriptions)
          ? saatler.weekdayDescriptions.filter(
              (satir): satir is string => typeof satir === 'string',
            )
          : [],
        suAnAcik: typeof saatler.openNow === 'boolean' ? saatler.openNow : null,
        isletmeDurumu: metin(cevap.businessStatus),
        telefon: metin(cevap.nationalPhoneNumber),
        siteAdresi: metin(cevap.websiteUri),
        haritaAdresi: metin(cevap.googleMapsUri),
      },
    }
  } catch (hata) {
    return { durum: 'hata', mesaj: hataMesaji(hata) }
  }
}
