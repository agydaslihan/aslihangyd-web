'use client'

import { AZAMI_DENEME, beklemeSuresi } from '@/lib/osm/yenidenDeneme'

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
}

export type DenemeBildirimi = (bilgi: DenemeBilgisi | null) => void

function bekle(ms: number): Promise<void> {
  return new Promise((coz) => setTimeout(coz, ms))
}

export async function denemeliCalistir<T>({
  cagir,
  geciciMi,
  mesajAl,
  bildir,
  iptal,
}: {
  /** Asıl çağrı; `denemeSirasi` 1'den başlar ve yedek sunucuyu belirler. */
  cagir: (denemeSirasi: number) => Promise<T>
  /** Sonuç geçici bir hata mı — tekrar denenmeli mi? */
  geciciMi: (sonuc: T) => boolean
  /** Geçici hatanın kullanıcıya gösterilecek metni. */
  mesajAl: (sonuc: T) => string
  bildir: DenemeBildirimi
  /** true dönerse bekleme kesilir ve son sonuç döner. */
  iptal?: () => boolean
}): Promise<T> {
  let sonuc = await cagir(1)

  for (let deneme = 2; deneme <= AZAMI_DENEME; deneme += 1) {
    if (!geciciMi(sonuc)) return sonuc
    if (iptal?.()) return sonuc

    const mesaj = mesajAl(sonuc)
    let kalan = Math.round(beklemeSuresi(deneme) / 1000)

    // Saniye saniye geri sayım: bekleme süresi ekranda akıyor, donmuş
    // görünmüyor.
    while (kalan > 0) {
      bildir({ deneme, kalanSaniye: kalan, mesaj })
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
