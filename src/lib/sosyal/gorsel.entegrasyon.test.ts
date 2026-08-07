import { ImageResponse } from 'next/og'
import { describe, expect, it, vi } from 'vitest'

import { GORSEL_BICIMLERI } from './metin'

/**
 * Sosyal medya görselinde Türkçe karakter ve ağ bağımlılığı denetimi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU TESTİN NEDEN VAR OLDUĞU.
 *
 * PDF üretiminde tam bu sınıftan bir hata yaşandı: pdf-lib'in standart
 * fontları ğ, ş, ı, ç karakterlerini kodlayamıyordu ve kütüphane yolundan
 * tamamen vazgeçmek gerekti.
 *
 * `next/og` (Satori) aynı tuzağı farklı biçimde kuruyor: gömülü fontta
 * bulunmayan bir glif görünce ÇALIŞMA ANINDA Google Fonts'a gidiyor.
 * Geliştirmede ₺ (U+20BA) tam bunu tetikledi, istek 400 döndü ve görsel
 * üretimi 500 ile düştü.
 *
 * ⚠️ Asıl tehlike hata değil, SESSİZ BAŞARI: internet erişimi olan bir
 * makinede font indirilir, her şey çalışır görünür. Üretim kabının dışarı
 * çıkışı yoksa aynı kod orada sessizce bozulur — ya da her görsel isteği
 * Google'a bir tur atar.
 *
 * Bu test ağ çağrısını YASAKLAYARAK koşuyor: `fetch` sahteleniyor ve
 * çağrılırsa test düşüyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Metinde geçen her Türkçe karakter, gömülü fontta bulunmak zorunda. */
const TURKCE_SINAV = 'Şeyhsinan ğüşıöçĞÜŞİÖÇ — 4.800.000 TL · 135 m² · Doğrulanmış ilan'

/** PNG dosya imzası. */
const PNG_IMZA = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/** PNG başlığındaki genişlik ve yükseklik (IHDR, 16. bayttan itibaren). */
function pngOlculeri(govde: Buffer): { genislik: number; yukseklik: number } {
  return { genislik: govde.readUInt32BE(16), yukseklik: govde.readUInt32BE(20) }
}

async function gorselUret(genislik: number, yukseklik: number): Promise<Buffer> {
  const yanit = new ImageResponse(
    {
      type: 'div',
      key: null,
      props: {
        style: {
          width: genislik,
          height: yukseklik,
          display: 'flex',
          background: '#0F1E33',
          color: '#F8F7F3',
          fontSize: 48,
          padding: 60,
        },
        children: TURKCE_SINAV,
      },
    },
    { width: genislik, height: yukseklik },
  )

  return Buffer.from(await yanit.arrayBuffer())
}

describe('sosyal medya görseli', () => {
  it.each(Object.entries(GORSEL_BICIMLERI))(
    '%s biçimi Türkçe metinle üretilir ve ölçüleri doğrudur',
    async (_ad, olcu) => {
      /**
       * ⚠️ `fetch` engellenmiyor, KAYDA ALINIYOR.
       *
       * İlk yazımda tamamen yasaklanmıştı ve test düştü: `@vercel/og`
       * kendi gömülü fontunu da `fetch` ile (yerel dosya olarak) okuyor.
       * Yasak, ayırt etmediği için işe yaramaz bir uyarı üretiyordu.
       *
       * Asıl aranan şey UZAK ADRES: Satori bilmediği bir glif görünce
       * Google Fonts'a gider. Yerel okuma serbest, dışarı çıkış yasak.
       */
      const gercekFetch = globalThis.fetch
      const adresler: string[] = []
      const kayitliFetch = vi.fn((girdi: unknown, secenekler?: unknown) => {
        adresler.push(String(girdi instanceof Request ? girdi.url : girdi))
        return (gercekFetch as (a: unknown, b?: unknown) => Promise<Response>)(girdi, secenekler)
      })
      vi.stubGlobal('fetch', kayitliFetch)

      try {
        const govde = await gorselUret(olcu.genislik, olcu.yukseklik)

        expect(govde.subarray(0, 8)).toEqual(PNG_IMZA)
        expect(pngOlculeri(govde)).toEqual({
          genislik: olcu.genislik,
          yukseklik: olcu.yukseklik,
        })

        const uzak = adresler.filter((adres) => /^https?:\/\//.test(adres))
        expect(
          uzak,
          'Görsel üretimi çalışma anında uzak adrese çıktı. Gömülü fontta ' +
            'olmayan bir glif eklenmiş olabilir — metinden çıkarın ya da fontu gömün. ' +
            `Adresler: ${uzak.join(', ')}`,
        ).toEqual([])
      } finally {
        vi.unstubAllGlobals()
      }
    },
    30_000,
  )

  /**
   * ⚠️ ₺ işareti bilinçli olarak KULLANILMIYOR; "TL" yazılıyor.
   *
   * Bu test o kararı kilitliyor: biri görsele ₺ eklerse üretim sessizce
   * Google'a bağımlı hale gelir. Site arayüzünde ₺ kullanılmaya devam
   * ediyor — orada tarayıcının fontu var, sorun yok.
   */
  it('görsel rotası ₺ işareti içermiyor', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')

    const kaynak = readFileSync(
      join(
        import.meta.dirname,
        '..',
        '..',
        'app',
        '(site)',
        'api',
        'sosyal',
        'gorsel',
        '[bicim]',
        '[id]',
        'route.tsx',
      ),
      'utf8',
    )

    // Yorum satırlarında geçiyor (gerekçe orada yazılı); JSX çıktısında geçmemeli.
    const jsxSatirlari = kaynak
      .split('\n')
      .filter((satir) => !satir.trim().startsWith('*') && !satir.trim().startsWith('//'))

    expect(jsxSatirlari.some((satir) => satir.includes('} ₺') || satir.includes('₺{'))).toBe(false)
  })
})
