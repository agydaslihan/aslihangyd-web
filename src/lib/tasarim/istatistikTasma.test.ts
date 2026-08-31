import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { degerBoyu } from '@/components/ui/IstatistikKarti'

/**
 * İstatistik kartlarında taşma.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ "+%23,0" KUTUDAN TAŞIYORDU.
 *
 * Kartlar ızgarada yan yana duruyor ve değer sabit boyda yazılıyordu;
 * uzun bir değer hücreyi aşıp komşusunun üstüne biniyordu.
 *
 * ⚠️ KIRPMA KULLANILMADI: kırpılan bir rakam yanlış bir rakamdır.
 * "1.250.0…" hiçbir şey söylemiyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const kart = readFileSync(path.join(KOK, 'components/ui/IstatistikKarti.tsx'), 'utf8')

/** Sitede gerçekten üretilen en uzun değerler. */
const GERCEK_DEGERLER = [
  '42.500 ₺',
  '1.250.000 ₺',
  '+%23,0',
  '−%12,4',
  '19,5 yıl',
  '12.345.678 ₺',
  '1.250.000 ₺/m²',
  'Veri bekleniyor',
]

describe('uzun değerler küçülüyor', () => {
  it('kısa değer tam boyda', () => {
    expect(degerBoyu('42.500 ₺', false)).toBe('text-rakam')
    expect(degerBoyu('+%23,0', false)).toBe('text-rakam')
  })

  it('orta uzunluk bir kademe küçülüyor', () => {
    expect(degerBoyu('12.345.678 ₺', false)).toBe('text-govde')
  })

  it('çok uzun değer iki kademe küçülüyor', () => {
    expect(degerBoyu('1.250.000 ₺/m² · n=142', false)).toBe('text-govde-kucuk')
  })

  it('vurgulu kart da kademeleniyor ama daha büyük kalıyor', () => {
    // Sayfanın öne çıkan tek rakamı; küçülüyor ama gövde boyuna düşmüyor.
    expect(degerBoyu('42.500 ₺', true)).toBe('text-rakam-buyuk')
    expect(degerBoyu('12.345.678 ₺', true)).toBe('text-rakam')
    expect(degerBoyu('1.250.000 ₺/m² · n=142', true)).toBe('text-baslik-3')
  })

  it('⚠️ gerçekte üretilen her değer bir boy alıyor', () => {
    for (const deger of GERCEK_DEGERLER) {
      expect(degerBoyu(deger, false), deger).toMatch(/^text-/)
      expect(degerBoyu(deger, true), deger).toMatch(/^text-/)
    }
  })
})

describe('taşma korumaları yerinde', () => {
  it('kırpma KULLANILMIYOR', () => {
    /**
     * ⚠️ Kırpılan bir rakam yanlış bir rakamdır. İddia YORUMLARI
     * SOYULMUŞ gövdeye bakıyor: dosyada `truncate` sözcüğü tam da onu
     * yasaklayan yorumda geçiyor ve ham metin araması testi kendi
     * belgesinde kırıyordu.
     */
    const govde = kart.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    expect(govde).not.toContain('truncate')
    expect(govde).not.toContain('text-ellipsis')
  })

  it('sayı sarabiliyor', () => {
    expect(kart).toContain('[overflow-wrap:anywhere]')
  })

  it('ızgara hücresi küçülebiliyor', () => {
    /**
     * ⚠️ `min-w-0` olmadan flex/grid hücresi içeriğinden küçülemez ve
     * taşmayı dışarı taşır — sarma kuralı tek başına yetmez.
     */
    expect(kart).toContain('min-w-0')
  })
})
