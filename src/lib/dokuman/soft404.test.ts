import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: `loading.tsx`, `notFound()`İN DURUM KODUNU YUTUYOR.
 *
 * 21 Ağustos 2026'da var olmayan bir ilan adresi **HTTP 200** dönüyordu.
 * Sayfa "İlan bulunamadı" yazıyordu, yani `notFound()` gerçekten
 * çağrılıyordu — ama durum kodu 200'dü.
 *
 * Sebep: `loading.tsx` bulunduğu segmentin TÜM ALTINA uygulanıyor. Next
 * kabuğu hemen akıtmaya başlıyor, yanıt 200 olarak açılıyor ve sonradan
 * çağrılan `notFound()` yalnızca EKRANI değiştirebiliyor.
 *
 * Arama motoru için bu bir SOFT 404: adres geçerli sanılıp indeksleniyor,
 * içerik bulunamayınca site kalitesi düşüyor. Ekranda hiçbir iz yok.
 *
 * Deneyle doğrulandı: `portfoy/loading.tsx` kaldırılınca detay 404 döndü,
 * geri konunca 200.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ ÇÖZÜM `loading.tsx`İ SİLMEK DEĞİL, KAPSAMINI DARALTMAK: liste sayfası
 * bir rota grubuna (`(liste)`) alınıp `loading.tsx` oraya konuyor. Adres
 * değişmiyor, iskelet duruyor, detay sayfası akışa girmiyor.
 */

const KOK = path.resolve(path.join(import.meta.dirname, '..', '..'))
const SITE = path.join(KOK, 'app', '(site)')

/** `notFound()` çağırabilen sayfalar — doğrudan ya da bölüm kapısı üzerinden. */
const KAPI_DESENI = /notFound\(\)|bolumKapisi\(/

function sayfalariTopla(dizin: string, gorece = ''): string[] {
  const sonuc: string[] = []
  for (const oge of readdirSync(dizin, { withFileTypes: true })) {
    const yol = path.posix.join(gorece, oge.name)
    if (oge.isDirectory()) sonuc.push(...sayfalariTopla(path.join(dizin, oge.name), yol))
    else if (oge.name === 'page.tsx') sonuc.push(yol)
  }
  return sonuc
}

/** Sayfanın kendi klasörü ve üstündeki tüm klasörler (site kökine kadar). */
function ustKlasorler(sayfaYolu: string): string[] {
  const parcalar = path.posix
    .dirname(sayfaYolu)
    .split('/')
    .filter((p) => p !== '.')
  const yollar: string[] = ['']
  let birikim = ''
  for (const parca of parcalar) {
    birikim = birikim === '' ? parca : `${birikim}/${parca}`
    yollar.push(birikim)
  }
  return yollar
}

const sayfalar = sayfalariTopla(SITE)

describe('soft 404 — loading.tsx ile notFound() çakışması', () => {
  it('denetlenecek sayfa bulunuyor', () => {
    expect(sayfalar.length).toBeGreaterThan(20)
  })

  /**
   * ⚠️ YORUMLAR DÜŞÜRÜLÜYOR. İlk turda bu testin kendi gerekçesi — liste
   * sayfalarına yazdığım "notFound() yalnızca ekranı değiştirebiliyor"
   * açıklaması — kuralı tetikledi: metin, çağrı sanıldı.
   */
  const kodu = (icerik: string) =>
    icerik.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  const kapili = sayfalar.filter((yol) =>
    KAPI_DESENI.test(kodu(readFileSync(path.join(SITE, yol), 'utf8'))),
  )

  it('notFound() çağıran sayfa var', () => {
    expect(kapili.length).toBeGreaterThan(0)
  })

  it.each(kapili)('%s üzerinde akışı başlatan loading.tsx yok', (sayfaYolu) => {
    const engelleyenler = ustKlasorler(sayfaYolu)
      .map((klasor) => path.posix.join(klasor, 'loading.tsx'))
      .filter((aday) => existsSync(path.join(SITE, aday)))

    expect(
      engelleyenler,
      `${sayfaYolu} notFound() çağırıyor ama üstünde loading.tsx var: yanıt 200 olarak ` +
        'açılıyor ve durum kodu artık değiştirilemiyor (soft 404). Liste sayfasını bir rota ' +
        'grubuna alıp loading.tsx’i oraya taşıyın — adres değişmez, iskelet kalır.',
    ).toEqual([])
  })
})
