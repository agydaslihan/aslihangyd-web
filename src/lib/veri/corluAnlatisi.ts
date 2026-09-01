import 'server-only'

import { cache } from 'react'

import { payloadGetir, ZIYARETCI } from './istemci'

/**
 * Çorlu Değer Anlatısı — okuma yolu.
 *
 * ⚠️ KAYNAKSIZ BLOK ELENİR. Panelde `minRows: 1` var ama kural kod
 * seviyesinde de uygulanıyor: bir gün alan yapılandırması gevşerse ya da
 * veri başka bir yoldan girerse, kaynaksız bir iddia siteye çıkmasın.
 * Bu bir yatırım sitesi.
 */

export interface AnlatiKaynagi {
  ad: string
  adres: string
  erisim: string | null
}

export interface AnlatiBlogu {
  baslik: string
  paragraflar: string[]
  kaynaklar: AnlatiKaynagi[]
}

export interface CorluAnlatisiVerisi {
  acik: boolean
  baslik: string
  giris: string
  bloklar: AnlatiBlogu[]
  /** Tüm blokların kaynakları, adrese göre tekilleştirilmiş. */
  tumKaynaklar: AnlatiKaynagi[]
}

const metin = (deger: unknown): string => (typeof deger === 'string' ? deger.trim() : '')

export const corluAnlatisiniGetir = cache(async (): Promise<CorluAnlatisiVerisi | null> => {
  try {
    const payload = await payloadGetir()
    const kayit = (await payload.findGlobal({
      slug: 'corlu-anlatisi',
      depth: 0,
      ...ZIYARETCI,
    })) as unknown as Record<string, unknown>

    if (kayit.acik === false) return null

    const hamBloklar = Array.isArray(kayit.bloklar) ? kayit.bloklar : []
    const bloklar: AnlatiBlogu[] = []

    for (const ham of hamBloklar) {
      const blok = ham as Record<string, unknown>
      const baslik = metin(blok.baslik)
      const govde = metin(blok.metin)
      if (baslik === '' || govde === '') continue

      const hamKaynaklar = Array.isArray(blok.kaynaklar) ? blok.kaynaklar : []
      const kaynaklar: AnlatiKaynagi[] = []
      for (const hk of hamKaynaklar) {
        const k = hk as Record<string, unknown>
        const ad = metin(k.ad)
        const adres = metin(k.adres)
        // ⚠️ Yalnızca https: karışık içerik uyarısı ve güvenilirlik.
        if (ad === '' || !adres.startsWith('https://')) continue
        kaynaklar.push({ ad, adres, erisim: metin(k.erisim) === '' ? null : metin(k.erisim) })
      }

      // ⚠️ KAYNAKSIZ BLOK GÖSTERİLMEZ.
      if (kaynaklar.length === 0) continue

      bloklar.push({
        baslik,
        paragraflar: govde
          .split(/\n{2,}/)
          .map((p) => p.trim())
          .filter((p) => p !== ''),
        kaynaklar,
      })
    }

    if (bloklar.length === 0) return null

    const tumKaynaklar: AnlatiKaynagi[] = []
    const gorulen = new Set<string>()
    for (const blok of bloklar) {
      for (const kaynak of blok.kaynaklar) {
        if (gorulen.has(kaynak.adres)) continue
        gorulen.add(kaynak.adres)
        tumKaynaklar.push(kaynak)
      }
    }

    return {
      acik: true,
      baslik: metin(kayit.baslik) === '' ? 'Çorlu neden değerli?' : metin(kayit.baslik),
      giris: metin(kayit.giris),
      bloklar,
      tumKaynaklar,
    }
  } catch {
    return null
  }
})
