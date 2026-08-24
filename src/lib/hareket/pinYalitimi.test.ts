import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * ScrollTrigger sabitlemesi React'in DOM ağacını bozmasın.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: BU KURAL BİR KEZ ÇİĞNENDİ VE SİTENİN TAMAMI KULLANILAMAZ
 *    HÂLE GELDİ (24 Ağustos 2026).
 *
 * ScrollTrigger `pin` verildiğinde, sabitlediği öğeyi KENDİ ÜRETTİĞİ bir
 * `<div class="pin-spacer">` içine taşır:
 *
 *     main                          main
 *       └─ bölüm          →           └─ pin-spacer     ← GSAP ekledi
 *                                          └─ bölüm     ← taşındı
 *
 * React bu taşımadan habersiz. Bölümün ebeveynini hâlâ `<main>` sanıyor.
 * Ziyaretçi menüden bir bağlantıya bastığında React `main.removeChild(bölüm)`
 * çağırıyor, tarayıcı `NotFoundError` fırlatıyor, hata `commit` aşamasında
 * düştüğü için React kökün TAMAMINI söküyor. Sayfa boşalıyor.
 *
 * ⚠️ Sunucu tarafında hiçbir iz yok: bütün rotalar 200, testler yeşil,
 * Lighthouse masaüstü 100. Arıza yalnızca gerçek bir tarayıcıda, gerçek
 * bir bağlantıya tıklandığında görünüyor.
 *
 * İKİ BAĞIMSIZ KORUMA VAR; bu dosya ikisini de denetliyor:
 *
 *   1. `pinSpacer` — aracı düğümü GSAP değil BİZ veriyoruz. ScrollTrigger
 *      kaynağındaki koşul `if (pin.parentNode !== spacer)` olduğu için,
 *      verdiğimiz düğüm zaten sabitlenenin ebeveyniyse HİÇBİR DOM taşıması
 *      yapılmıyor; yalnızca satır içi stil yazılıyor.
 *   2. `pin` bileşenin KÖK düğümü olamaz. React bir alt ağacı silerken
 *      yalnızca en üstteki düğüm için `removeChild` çağırıyor; taşınan
 *      düğüm kökün İÇİNDE kalırsa React onu hiç görmüyor.
 *
 * Biri yeter, ikisi birden kasıtlı: bu arızanın maliyeti, fazladan bir
 * denetimin maliyetinden büyük.
 *
 * ⚠️ Bu dosya kaynağı OKUYARAK denetliyor, çalıştırarak değil. Gerçek
 * tarayıcı denetimi ayrı: `scripts/gezinme-dumani.mjs`, CI'da her PR'da
 * koşuyor ve ENGELLEYİCİ.
 * ─────────────────────────────────────────────────────────────────────────
 */

const dizin = path.dirname(fileURLToPath(import.meta.url))
const KAYNAK_KOKU = path.resolve(dizin, '../..')

function tumKaynaklar(kok: string): string[] {
  const sonuc: string[] = []
  for (const oge of readdirSync(kok)) {
    const tam = path.join(kok, oge)
    if (statSync(tam).isDirectory()) {
      sonuc.push(...tumKaynaklar(tam))
    } else if (/\.tsx?$/.test(oge) && !/\.test\.tsx?$/.test(oge)) {
      sonuc.push(tam)
    }
  }
  return sonuc
}

/** Yorumları at: gerekçe metinlerindeki `pin:` kelimesi eşleşmesin. */
function yorumsuz(kaynak: string): string {
  return kaynak.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

const sabitlemeKullananlar = tumKaynaklar(KAYNAK_KOKU)
  .map((yol) => ({ yol, kaynak: yorumsuz(readFileSync(yol, 'utf8')) }))
  .filter(({ kaynak }) => /\bscrollTrigger\s*:/.test(kaynak) && /\bpin\s*:/.test(kaynak))

describe('ScrollTrigger sabitlemesi', () => {
  it('en az bir bileşende kullanılıyor — denetim boşa koşmasın', () => {
    // ⚠️ Sabitleme tamamen kaldırılırsa bu test kendiliğinden yeşile döner
    // ve bir daha hiçbir şey denetlemez. O gün bu iddia kırılsın ki
    // dosyanın hâlâ gerekli olup olmadığı bilinçli olarak karara bağlansın.
    expect(sabitlemeKullananlar.length).toBeGreaterThan(0)
  })

  it.each(sabitlemeKullananlar.map((d) => [path.relative(KAYNAK_KOKU, d.yol), d.kaynak]))(
    '%s — kendi `pinSpacer` düğümünü veriyor',
    (_ad, kaynak) => {
      expect(
        kaynak,
        'ScrollTrigger `pinSpacer` verilmezse kendi aracı düğümünü üretir ve\n' +
          'sabitlenen öğeyi oraya TAŞIR. React o taşımadan habersiz kalır ve\n' +
          'sayfadan çıkarken `removeChild` NotFoundError fırlatır.',
      ).toMatch(/\bpinSpacer\s*:/)
    },
  )

  it.each(sabitlemeKullananlar.map((d) => [path.relative(KAYNAK_KOKU, d.yol), d.kaynak]))(
    '%s — `pin` ile `pinSpacer` AYRI düğüm',
    (_ad, kaynak) => {
      const pin = /\bpin\s*:\s*([A-Za-z0-9_.]+)/.exec(kaynak)?.[1]
      const spacer = /\bpinSpacer\s*:\s*([A-Za-z0-9_.]+)/.exec(kaynak)?.[1]

      expect(pin, '`pin` bir değişkene bağlanmalı; `pin: true` kökü sabitler').toBeTruthy()
      expect(pin).not.toBe('true')
      expect(
        spacer,
        'İkisi aynı düğüm olursa `pin.parentNode !== spacer` koşulu sağlanır\n' +
          've ScrollTrigger yine DOM taşıması yapar.',
      ).not.toBe(pin)
    },
  )

  it.each(sabitlemeKullananlar.map((d) => [path.relative(KAYNAK_KOKU, d.yol), d.kaynak]))(
    '%s — temizlikte `kill(true)` ile geri alıyor',
    (_ad, kaynak) => {
      expect(
        kaynak,
        'Argümansız `kill()` sabitlemenin yazdığı satır içi ölçüleri geri\n' +
          'almıyor; bölüm donmuş genişlik/yükseklikle kalıyor.',
      ).toMatch(/\.kill\(\s*true\s*\)/)
    },
  )

  it.each(sabitlemeKullananlar.map((d) => [path.relative(KAYNAK_KOKU, d.yol), d.kaynak]))(
    '%s — hareket kurulumu hata yutuyor, gezinmeyi engellemiyor',
    (_ad, kaynak) => {
      expect(
        kaynak,
        'Hareket bir süs, gezinme işlev. Kütüphane inmezse ya da kurulum\n' +
          'hata verirse sayfa aynen çalışmalı.',
      ).toMatch(/\.catch\(/)
    },
  )
})
