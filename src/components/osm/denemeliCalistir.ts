'use client'

import { AZAMI_DENEME, beklemeSuresi, kotaMetni, yenidenDenemeMetni } from '@/lib/osm/yenidenDeneme'

/**
 * Geçici hatalarda üstel beklemeyle yeniden deneyen çağrı sarmalayıcısı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN İSTEMCİDE
 *
 * Yeniden deneme sunucu eyleminin içinde olsaydı kullanıcı bir dakika
 * boyunca donmuş bir butona bakardı — ne olduğunu bilmeden, iptal
 * edemeden. Sunucu eylemi ara durum yayınlayamaz.
 *
 * Burada her bekleme saniye saniye geri sayılıyor ve ekranda görünüyor:
 * "OpenStreetMap sunucusu yoğun, 15 sn sonra tekrar denenecek (2/4)".
 * Aslıhan butona tekrar basmıyor; ne olduğunu okuyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ `denemeSirasi` çağrıya geçiriliyor: sunucu tarafı bununla YEDEK
 * SUNUCU seçiyor. 504 veren örnekte ısrar etmek yerine sıradakine geçiliyor.
 */

export interface DenemeBilgisi {
  deneme: number
  kalanSaniye: number
  mesaj: string
  /** Kota sınırı mı — ekranda farklı anlatılıyor. */
  kota: boolean
}

/**
 * Bir sonucun yeniden denenip denenmeyeceği ve nasıl.
 *
 * ⚠️ `kota` ayrı bir bayrak, `tekrar`ın bir türü değil: bekleme merdiveni
 * ve ekran metni ikisinde de farklı.
 */
export interface DenemeKarari {
  tekrar: boolean
  kota?: boolean
  /** Sunucunun `Retry-After` ile istediği bekleme; varsa merdivene yeğlenir. */
  sunucuBeklemesiMs?: number | null
}

export type DenemeBildirimi = (bilgi: DenemeBilgisi | null) => void

function bekle(ms: number): Promise<void> {
  return new Promise((coz) => setTimeout(coz, ms))
}

export async function denemeliCalistir<T>({
  cagir,
  karar,
  bildir,
  iptal,
}: {
  /** Asıl çağrı; `denemeSirasi` 1'den başlar ve yedek sunucuyu belirler. */
  cagir: (denemeSirasi: number) => Promise<T>
  /** Sonuç yeniden denenmeli mi, kota mı, sunucu ne kadar bekle dedi? */
  karar: (sonuc: T) => DenemeKarari
  bildir: DenemeBildirimi
  /** true dönerse bekleme kesilir ve son sonuç döner. */
  iptal?: () => boolean
}): Promise<T> {
  let sonuc = await cagir(1)

  for (let deneme = 2; deneme <= AZAMI_DENEME; deneme += 1) {
    const su = karar(sonuc)
    if (!su.tekrar) return sonuc
    if (iptal?.()) return sonuc

    const kota = su.kota === true

    /**
     * ⚠️ Sunucunun `Retry-After` isteği merdivenin ÖNÜNDE.
     *
     * Sunucu ne kadar beklememizi istediğini açıkça söylediyse tahmin
     * yürütmenin anlamı yok — ve söylediğinden erken dönmek kısıtlamayı
     * uzatmanın en hızlı yolu. Yine de merdivenden kısa olamaz: 429'da
     * hızlanmak yanlış yön.
     */
    const merdivenMs = beklemeSuresi(deneme, kota)
    const sunucuMs = su.sunucuBeklemesiMs ?? null
    const beklemeMs = sunucuMs === null ? merdivenMs : Math.max(sunucuMs, merdivenMs)

    let kalan = Math.round(beklemeMs / 1000)

    // Saniye saniye geri sayım: bekleme süresi ekranda akıyor, donmuş
    // görünmüyor.
    while (kalan > 0) {
      bildir({
        deneme,
        kalanSaniye: kalan,
        kota,
        mesaj: kota ? kotaMetni(deneme, kalan) : yenidenDenemeMetni(deneme, kalan),
      })
      await bekle(1_000)
      if (iptal?.()) {
        bildir(null)
        return sonuc
      }
      kalan -= 1
    }

    bildir(null)
    sonuc = await cagir(deneme)
  }

  return sonuc
}
