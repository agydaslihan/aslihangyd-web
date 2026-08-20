import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { LIGHTHOUSE_ESIKLERI, cihazEsikleri } from '../../../scripts/lighthouse-esikleri.mjs'

/**
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: YANLIŞ EŞİK, DOĞRU ÖLÇÜMDEN ZARARLIDIR.
 *
 * 20 Ağustos 2026'da özet betiği hâlâ eski şartnamenin sayılarını
 * kullanıyordu (her cihazda performans ≥90) ve `/portfoy` mobilini 89 ile
 * uyarı işaretliyordu — oysa geçerli taban 75'ti. Her koşumda kırmızı
 * gören bir kapı kısa sürede görmezden gelinir; o noktada gerçek bir
 * gerileme de fark edilmez.
 *
 * Sayı iki yerde yaşıyor ve yaşamak zorunda: `CLAUDE.md` insanın okuduğu
 * yer, `scripts/lighthouse-esikleri.mjs` makinenin okuduğu yer. Bu test
 * ikisinin ayrışmasını engelliyor.
 *
 * ⚠️ TESTİ SUSTURMANIN DOĞRU YOLU BİRİNİ SİLMEK DEĞİL: hangisi doğruysa
 * diğerini ona çekmek. Şartname değiştiğinde her ikisi birden güncellenir.
 * ─────────────────────────────────────────────────────────────────────────
 */

const KOK = path.resolve(path.join(import.meta.dirname, '..', '..', '..'))
const CLAUDE = readFileSync(path.join(KOK, 'CLAUDE.md'), 'utf8')

/**
 * CLAUDE.md'deki eşik tablosunu okur.
 *
 * ⚠️ Tablo satırı `| Masaüstü | ≥90 | ≥95 | 100 | 100 |` biçiminde.
 * `≥` işareti okunurluk için; sayıya çevrilirken düşürülüyor.
 */
function belgedekiEsikler(): Record<string, number[]> {
  const sonuc: Record<string, number[]> = {}

  for (const [, cihaz, sayilar] of CLAUDE.matchAll(/^\|\s*(Masaüstü|Mobil)\s*\|([^\n]*)\|\s*$/gm)) {
    const degerler = [...(sayilar ?? '').matchAll(/≥?\s*(\d+)/g)].map((eslesme) =>
      Number(eslesme[1]),
    )
    sonuc[cihaz === 'Masaüstü' ? 'masaustu' : 'mobil'] = degerler
  }

  return sonuc
}

describe('Lighthouse eşikleri tek kaynakta', () => {
  const belge = belgedekiEsikler()

  it('CLAUDE.md eşik tablosu okunabiliyor', () => {
    /**
     * ⚠️ Tablo bulunamazsa test SESSİZCE GEÇMEMELİ. Aksi hâlde biri
     * tabloyu silse ya da biçimini bozsa, karşılaştırma yapılmadan yeşil
     * kalırdı — koruduğu şeyi kaybetmiş bir kapı.
     */
    expect(
      Object.keys(belge).sort(),
      'CLAUDE.md → Performans hedefleri tablosu bulunamadı',
    ).toEqual(['masaustu', 'mobil'])
    expect(belge.masaustu).toHaveLength(4)
    expect(belge.mobil).toHaveLength(4)
  })

  it.each(['masaustu', 'mobil'] as const)('%s eşikleri belgeyle aynı', (cihaz) => {
    const kod = LIGHTHOUSE_ESIKLERI[cihaz]
    const [performans, erisilebilirlik, enIyiUygulamalar, seo] = belge[cihaz] ?? []

    expect(
      [kod.performance, kod.accessibility, kod['best-practices'], kod.seo],
      `${cihaz}: CLAUDE.md tablosu ile scripts/lighthouse-esikleri.mjs ayrıştı. ` +
        'Hangisi doğruysa diğerini ona çekin — şartname değiştiğinde ikisi birden güncellenir.',
    ).toEqual([performans, erisilebilirlik, enIyiUygulamalar, seo])
  })

  /**
   * ⚠️ Mobil eşiği masaüstünden GEVŞEK olmalı ve bu bir tercih değil
   * ölçümün sonucu: aynı sayfa masaüstünde 100 alırken mobilde 90 alıyorsa
   * arada arıza değil model farkı var (simüle 4G + 4× CPU).
   */
  it('mobil performans eşiği masaüstünden gevşek', () => {
    expect(LIGHTHOUSE_ESIKLERI.mobil.performance).toBeLessThan(
      LIGHTHOUSE_ESIKLERI.masaustu.performance,
    )
  })

  /**
   * ⚠️ Erişilebilirlik CİHAZA GÖRE DEĞİŞMEZ. Ekran okuyucu kullanan biri
   * telefondaysa daha az erişilebilir bir sayfayı hak etmiyor.
   */
  it('erişilebilirlik eşiği iki cihazda da aynı', () => {
    expect(LIGHTHOUSE_ESIKLERI.mobil.accessibility).toBe(LIGHTHOUSE_ESIKLERI.masaustu.accessibility)
  })

  /**
   * ⚠️ Bilinmeyen cihaz anahtarında DAHA SIKI eşik uygulanmalı: gevşek
   * varsayılan, kapıyı sessizce açık bırakırdı.
   */
  it('bilinmeyen cihaz masaüstü eşiğine düşüyor', () => {
    expect(cihazEsikleri('tablet')).toEqual(LIGHTHOUSE_ESIKLERI.masaustu)
  })
})
