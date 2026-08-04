import 'server-only'

import { cache } from 'react'

import {
  BOS_PARAMETRE_KUMESI,
  type VergiDilimi,
  type VergiParametreKumesi,
} from '@/lib/vergi/parametreler'

import { payloadGetir, ZIYARETCI } from './istemci'

/**
 * Vergi parametrelerini CMS'ten okur ve hesaplayıcıların beklediği biçime çevirir.
 *
 * Tasarım kuralı: **eksik parametre boş bırakılır, sıfıra düşürülmez.**
 * `sayilar` sözlüğünde bulunmayan anahtar "tanımsız" demektir; hesaplayıcı
 * bunu görüp hesaplamayı reddeder. Sıfır varsaymak, tapu harcını sıfır
 * göstermek gibi sessiz ve pahalı bir hataya yol açardı.
 *
 * Veritabanı erişilemezse boş küme döner — sayfa 500 vermez, hesaplayıcılar
 * "parametreler yüklenemedi" durumuna düşer.
 */
export const vergiParametreleriniGetir = cache(async (): Promise<VergiParametreKumesi> => {
  try {
    const payload = await payloadGetir()

    const sonuc = await payload.find({
      collection: 'vergi-parametreleri',
      limit: 200,
      depth: 0,
      // En güncel yıl önce gelsin; aynı anahtardan birden fazla varsa
      // en yenisi kazanır.
      sort: '-gecerlilikYili',
      ...ZIYARETCI,
    })

    const sayilar: Record<string, number> = {}
    const dilimler: Record<string, VergiDilimi[]> = {}
    let enYeniGuncelleme: string | null = null

    for (const kayit of sonuc.docs) {
      const anahtar = kayit.anahtar
      if (typeof anahtar !== 'string') continue

      // Sıralama gereği ilk gelen en güncel; sonrakiler yok sayılır.
      if (anahtar in sayilar || anahtar in dilimler) continue

      if (Array.isArray(kayit.dilimler) && kayit.dilimler.length > 0) {
        dilimler[anahtar] = kayit.dilimler
          .filter((satir) => typeof satir.oran === 'number')
          .map((satir) => ({
            ustSinir: typeof satir.ustSinir === 'number' ? satir.ustSinir : null,
            oran: satir.oran,
          }))
      } else if (typeof kayit.deger === 'number') {
        sayilar[anahtar] = kayit.deger
      }

      const guncelleme = kayit.guncellemeTarihi
      if (typeof guncelleme === 'string') {
        if (enYeniGuncelleme === null || guncelleme > enYeniGuncelleme) {
          enYeniGuncelleme = guncelleme
        }
      }
    }

    return { sayilar, dilimler, gecerlilikTarihi: enYeniGuncelleme }
  } catch {
    return BOS_PARAMETRE_KUMESI
  }
})
