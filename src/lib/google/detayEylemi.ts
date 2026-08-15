'use server'

import { headers } from 'next/headers'

import { hizSinirindaMi, istemciAnahtari, type HizSiniriAyari } from '@/lib/guvenlik/hizSiniri'
import { payloadGetir } from '@/lib/veri/istemci'

import { googlePlacesKapaliSebebi } from './ayarlar'
import { yerDetayi, type GoogleDetayi } from './istemci'

/**
 * Google yer detayı — ZİYARETÇİYE AÇIK okuma eylemi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN YÖNETİCİ EYLEMLERİNDEN AYRI DOSYA
 *
 * `eylemler.ts` içindeki her şey yönetici kapısının arkasında; bu eylem
 * değil. İkisini aynı dosyada tutmak, güvenlik denetimini yapan kişiye
 * (ve `formKorumasi.test.ts`'e) tek bir sınıf gösterirdi — oysa iki ayrı
 * saldırı yüzeyi var.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ HIZ SINIRI BURADA MALİYET KORUMASI
 *
 * Her çağrı Google'a ücretli bir istek demek. Sınırsız bırakmak, faturayı
 * bir betiğin eline vermek olurdu — AI aramadaki gerekçenin aynısı.
 *
 * İkinci koruma: parametre bir Google yer kimliği DEĞİL, bizim POI
 * kimliğimiz. Yer kimliği veritabanından okunuyor; böylece dışarıdan gelen
 * bir istek yalnızca bizim zaten eşleştirdiğimiz noktaları sorabiliyor.
 * Aksi hâlde bu uç, Google Places'in ücretsiz vekil sunucusu olurdu.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Dakikada 20 detay: gerçek bir ziyaretçiyi rahatsız etmez, betiği durdurur. */
const DETAY_SINIRI: HizSiniriAyari = { adet: 20, pencereMs: 60_000 }

export type DetayCevabi =
  { durum: 'kapali' } | { durum: 'hata'; mesaj: string } | { durum: 'tamam'; detay: GoogleDetayi }

export async function googleDetayiGetir(poiId: number): Promise<DetayCevabi> {
  if (!Number.isInteger(poiId) || poiId <= 0) {
    return { durum: 'hata', mesaj: 'Geçersiz nokta.' }
  }

  // ⚠️ Katman kapalıysa hiç sorgulamadan dön: hız sınırı kovasını da boşuna
  // tüketmeyelim.
  if ((await googlePlacesKapaliSebebi()) !== null) return { durum: 'kapali' }

  const basliklar = await headers()
  const sinirAnahtari = istemciAnahtari(basliklar, 'google-detay')

  if (sinirAnahtari === null) {
    // IP başlığı yoksa herkesi tek kovaya koymak özelliği herkese
    // kapatırdı; gerekçe `danisman-ol/eylemler.ts` içinde ayrıntılı.
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '[guvenlik] İstemci IP başlığı yok — Google detay hız sınırı uygulanamadı. ' +
          'Caddy trusted_proxies / header_up yapılandırmasını kontrol edin.',
      )
    }
  } else {
    const sinir = hizSinirindaMi(sinirAnahtari, DETAY_SINIRI)
    if (!sinir.gecebilir) {
      return {
        durum: 'hata',
        mesaj: `Çok fazla istek yaptınız. ${sinir.yenidenDeneSaniye} saniye sonra tekrar deneyin.`,
      }
    }
  }

  try {
    const payload = await payloadGetir()

    const poi = await payload.findByID({
      collection: 'ilgi-noktalari',
      id: poiId,
      depth: 0,
      overrideAccess: false,
    })

    const placeId = typeof poi.googlePlaceId === 'string' ? poi.googlePlaceId.trim() : ''
    if (placeId === '') return { durum: 'kapali' }

    const sonuc = await yerDetayi(payload, placeId)

    if (sonuc.durum === 'kapali') return { durum: 'kapali' }
    if (sonuc.durum === 'hata') {
      // ⚠️ Google'ın ham hata metni ziyaretçiye gösterilmiyor: anahtar
      // durumu, kota ve uç nokta ayrıntısı sızdırabilir.
      return { durum: 'hata', mesaj: 'Güncel bilgi şu anda alınamadı. Biraz sonra tekrar deneyin.' }
    }

    return { durum: 'tamam', detay: sonuc.veri }
  } catch {
    return { durum: 'hata', mesaj: 'Güncel bilgi şu anda alınamadı.' }
  }
}
