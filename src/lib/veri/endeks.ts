import 'server-only'

import { cache } from 'react'

import { endeksHesapla, yayinKontrolu } from '@/lib/endeks/motor'
import type { EndeksSerisi, Gozlem, KatmanAgirligi, YayinKontrolu } from '@/lib/endeks/tipler'

import { payloadGetir, ZIYARETCI } from './istemci'

/**
 * Gözlemleri ve ağırlıkları okuyup endeksi hesaplar.
 *
 * ⚠️ Gözlemler `overrideAccess: true` ile okunur — koleksiyon ziyaretçiye
 * kapalı, ama endeks hesabı sunucuda çalışıyor ve toplulaştırılmış sonucu
 * yayınlıyor. Ham gözlemler istemciye HİÇ gönderilmez; bu fonksiyon
 * yalnızca hesaplanmış seriyi döner.
 */

interface EndeksVerisi {
  seri: EndeksSerisi | null
  kontrol: YayinKontrolu
  /** Ayarlardaki "yayında" kutusu işaretli mi. */
  yayinIsaretli: boolean
  toplamGozlem: number
}

export const endeksVerisiniGetir = cache(async (): Promise<EndeksVerisi> => {
  const bosSonuc: EndeksVerisi = {
    seri: null,
    kontrol: { yayinlanabilir: false, engeller: ['Veri okunamadı.'], saglananlar: [] },
    yayinIsaretli: false,
    toplamGozlem: 0,
  }

  try {
    const payload = await payloadGetir()

    const ayarlar = await payload.findGlobal({
      slug: 'endeks-ayarlari',
      depth: 1,
      ...ZIYARETCI,
    })

    const agirliklar: KatmanAgirligi[] = (ayarlar.sepetAgirliklari ?? []).flatMap((satir) => {
      const mahalle = satir.mahalle
      const slug = typeof mahalle === 'object' && mahalle !== null ? mahalle.slug : null
      if (!slug || !satir.odaTipi || typeof satir.agirlik !== 'number') return []
      return [{ mahalleSlug: slug, odaTipi: satir.odaTipi, agirlik: satir.agirlik }]
    })

    const sonuc = await payload.find({
      collection: 'gozlemler',
      limit: 20_000,
      depth: 1,
      // Koleksiyon ziyaretçiye kapalı; bu sunucu içi bir hesaplama.
      overrideAccess: true,
    })

    const gozlemler: Gozlem[] = sonuc.docs.flatMap((kayit) => {
      const mahalle = kayit.mahalle
      const slug = typeof mahalle === 'object' && mahalle !== null ? mahalle.slug : null
      if (!slug || !kayit.ay || typeof kayit.m2Fiyati !== 'number') return []

      return [
        {
          ay: kayit.ay,
          mahalleSlug: slug,
          odaTipi: kayit.odaTipi,
          tip: kayit.tip,
          kaynak: kayit.kaynak,
          m2Fiyati: kayit.m2Fiyati,
          guvenSeviyesi: kayit.guvenSeviyesi ?? undefined,
        },
      ]
    })

    const kontrol = yayinKontrolu(gozlemler, agirliklar, ayarlar.metodolojiYayinda === true)

    return {
      seri: endeksHesapla(gozlemler, agirliklar, 'istenen_fiyat'),
      kontrol,
      yayinIsaretli: ayarlar.yayinda === true,
      toplamGozlem: gozlemler.length,
    }
  } catch {
    return bosSonuc
  }
})

/**
 * `/endeks` sayfası açılabilir mi?
 *
 * ⚠️ İKİ koşul birden gerekir: Aslıhan'ın onayı VE verinin yeterliliği.
 * Onay kutusu tek başına yetmez — "bir ay erken açalım" cazibesine karşı
 * duran kod budur (ENDEKS-VERI-YONETIMI.md §5).
 */
export async function endeksSayfasiAcikMi(): Promise<boolean> {
  const veri = await endeksVerisiniGetir()

  /**
   * ⚠️ `seri !== null` şartı da BURADA olmalı.
   *
   * Sayfanın kendi kapısı üç koşula bakıyor (`yayinIsaretli`,
   * `kontrol.yayinlanabilir`, `seri`). Bu yardımcı yalnızca ikisine
   * bakarsa, üçüncüsünün tuttuğu bir durumda gezinme "Endeks" bağlantısı
   * gösterir ve ziyaretçi 404'e gider. İki yerde ayrı yazılan bir koşul,
   * er ya da geç ayrışan bir koşuldur.
   */
  return veri.yayinIsaretli && veri.kontrol.yayinlanabilir && veri.seri !== null
}
