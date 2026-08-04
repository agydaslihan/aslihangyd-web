import 'server-only'

import { cache } from 'react'

import type { MahalleProfili } from '@/lib/eslestirme/tipler'

import { ilgiNoktalariniGetir, konumuCoz } from './ilgiNoktalari'
import { mahalleleriGetir } from './mahalleler'

/**
 * Eşleştirme testinin veri katmanı.
 *
 * Mahalle profilinin dört özniteliği (yatırım potansiyeli, sanayi yakınlığı,
 * ulaşım, sosyal donatı) yatırım skorundan yeniden kullanılıyor. Aynı
 * gerçeği iki ayrı alana girdirmek, ikisinin er ya da geç birbirinden
 * ayrılması demek olurdu.
 *
 * Konum bilgisi istemciye ham olarak gönderiliyor: hedef noktaya mesafe
 * orada hesaplanıyor. Böylece kullanıcı hedefini değiştirdiğinde sonuç
 * anında güncelleniyor, sunucuya gidiş dönüş olmuyor. Gönderilen tek şey
 * zaten haritada açıkça görünen mahalle merkezleri ve kamuya açık ilgi
 * noktaları — gizli bir veri sızmıyor.
 */

export interface Koordinat {
  boylam: number
  enlem: number
}

/** İstemciye gönderilen mahalle profili — konumuyla birlikte. */
export interface MahalleProfiliVerisi extends MahalleProfili {
  merkez: Koordinat | null
}

/**
 * Hedef nokta olarak seçilebilecek POI tipleri.
 *
 * "Düzenli gittiğiniz yer" sorusuna market veya park cevabı anlamlı değil;
 * liste gerçekten gidilip gelinen yerlerle sınırlı tutuluyor.
 */
const HEDEF_OLABILEN_TIPLER = ['sanayi', 'universite', 'hastane', 'istasyon', 'avm', 'resmi']

export interface HedefNokta {
  id: string
  ad: string
  konum: Koordinat
}

export const hedefNoktalariniGetir = cache(async (): Promise<HedefNokta[]> => {
  const noktalar = await ilgiNoktalariniGetir()

  return noktalar.flatMap((nokta) => {
    if (!HEDEF_OLABILEN_TIPLER.includes(nokta.tip)) return []
    const konum = konumuCoz(nokta.konum)
    return konum ? [{ id: String(nokta.id), ad: nokta.ad, konum }] : []
  })
})

/**
 * Mahalle profillerini eşleştirme motorunun beklediği biçime çevirir.
 *
 * `hedefeMesafe` burada doldurulmaz; hedef noktayı kullanıcı seçtiği için
 * mesafe istemcide hesaplanır.
 */
export const mahalleProfilleriniGetir = cache(async (): Promise<MahalleProfiliVerisi[]> => {
  const mahalleler = await mahalleleriGetir()

  return mahalleler.map((mahalle) => {
    const skor = mahalle.yatirimSkoru
    const profil = mahalle.eslestirmeProfili

    return {
      slug: mahalle.slug,
      ad: mahalle.ad,
      ortalamaM2Satis: mahalle.ortalamaM2Satis ?? null,
      hedefeMesafe: null,
      merkez: konumuCoz(mahalle.merkez),
      ozellikler: {
        // Yatırım skorundan yeniden kullanılanlar.
        yatirimPotansiyeli: skor?.toplam ?? null,
        sanayiYakinligi: skor?.sanayiYakinligi ?? null,
        ulasim: skor?.ulasim ?? null,
        sosyalDonati: skor?.sosyalDonati ?? null,
        // Yalnızca eşleştirmede kullanılanlar.
        topluTasima: profil?.topluTasima ?? null,
        okulErisimi: profil?.okulErisimi ?? null,
        sessizlik: profil?.sessizlik ?? null,
        merkezeYakinlik: profil?.merkezeYakinlik ?? null,
      },
    }
  })
})
