import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * Filtre parametre adlarının üç yerde de aynı olduğunu sınar.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: BU HATA SESSİZ.
 *
 * Aynı sözleşmeyi üç dosya kullanıyor:
 *   · `AramaWidgeti`   — hero'daki arama, URL'i ÜRETİYOR
 *   · `FiltrePaneli`   — listeleme filtreleri, URL'i ÜRETİYOR ve OKUYOR
 *   · `portfoy/page`   — URL'i OKUYOR ve sorguya çeviriyor
 *
 * Birinde `enAz`, diğerinde `fiyatMin` yazılsaydı hiçbir şey patlamazdı:
 * sayfa açılır, filtre uygulanmaz, ziyaretçi filtrelediğini sanır.
 * Derleme geçer, tip denetimi geçer, test yeşil kalır — çünkü hepsi
 * sıradan dize.
 *
 * Bu test o sessizliği bozuyor: üç dosyada geçen anahtar kümesini
 * karşılaştırıyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

const dirname = path.dirname(fileURLToPath(import.meta.url))
const KOK = path.resolve(dirname, '../..')

function oku(goreli: string): string {
  return readFileSync(path.join(KOK, goreli), 'utf8')
}

/** Sunucunun `parametreler.X` ve `metin('X')` biçiminde okuduğu adlar. */
function sunucununOkuduklari(): Set<string> {
  const kaynak = oku('app/(site)/portfoy/(liste)/page.tsx')
  const bulunan = new Set<string>()

  for (const [, ad] of kaynak.matchAll(/parametreler\.([a-zA-Z0-9]+)/g)) {
    if (ad !== undefined) bulunan.add(ad)
  }
  for (const [, ad] of kaynak.matchAll(/metin\('([a-zA-Z0-9]+)'\)/g)) {
    if (ad !== undefined) bulunan.add(ad)
  }
  return bulunan
}

/** Panelin `ANAHTARLAR` tablosundaki adlar. */
function panelinAnahtarlari(): string[] {
  const kaynak = oku('components/ilan/FiltrePaneli.tsx')
  const blok = /const ANAHTARLAR = \[([\s\S]*?)\] as const/.exec(kaynak)
  if (blok === null) throw new Error('FiltrePaneli içinde ANAHTARLAR bulunamadı')

  return [...blok[1]!.matchAll(/'([a-zA-Z0-9]+)'/g)].map((eslesme) => eslesme[1]!)
}

/** Hero widget'ının `parametreler.set('X', …)` ile yazdığı adlar. */
function widgetinYazdiklari(): string[] {
  const kaynak = oku('components/ilan/AramaWidgeti.tsx')
  return [...kaynak.matchAll(/parametreler\.set\('([a-zA-Z0-9]+)'/g)].map((e) => e[1]!)
}

describe('filtre parametre sözleşmesi', () => {
  const sunucu = sunucununOkuduklari()

  it('kaynaklar okunabildi', () => {
    expect(sunucu.size).toBeGreaterThan(5)
    expect(panelinAnahtarlari().length).toBeGreaterThan(5)
    expect(widgetinYazdiklari().length).toBeGreaterThan(0)
  })

  it('filtre panelinin ürettiği her anahtarı sunucu okuyor', () => {
    const okunmayan = panelinAnahtarlari().filter((ad) => !sunucu.has(ad))

    expect(
      okunmayan,
      "Panel bu anahtarları URL'e yazıyor ama sunucu okumuyor — filtre " +
        'sessizce uygulanmaz.\n' +
        `Okunmayanlar: ${okunmayan.join(', ')}`,
    ).toEqual([])
  })

  it("hero arama widget'ının ürettiği her anahtarı sunucu okuyor", () => {
    const okunmayan = widgetinYazdiklari().filter((ad) => !sunucu.has(ad))

    expect(
      okunmayan,
      "Hero widget'ı bu anahtarları yazıyor ama listeleme sayfası okumuyor — " +
        'ziyaretçi filtrelediğini sanır, filtresiz liste görür.\n' +
        `Okunmayanlar: ${okunmayan.join(', ')}`,
    ).toEqual([])
  })

  /**
   * ⚠️ Yatırım filtreleri bizim ayrıştırıcımız; sessizce düşmemeli.
   *
   * Üçü de listede yoksa panel onları gösterir ama sunucu yok sayar —
   * "kira çarpanı ≤ 15" diyen biri filtrelenmemiş liste görür ve bunu
   * anlamaz.
   */
  it('üç yatırım filtresi sözleşmede', () => {
    for (const ad of ['carpan', 'getiri', 'sanayi']) {
      expect(panelinAnahtarlari(), `panel: ${ad}`).toContain(ad)
      expect(sunucu.has(ad), `sunucu: ${ad}`).toBe(true)
    }
  })

  /**
   * ⚠️ "goster" filtre DEĞİL, sunuş parametresi.
   *
   * Aktif filtre çipleri `ANAHTARLAR` listesinden üretiliyor; `goster`
   * oraya girseydi "24 göster" diye bir çip belirir ve "filtreleri
   * temizle" sayacı yanlış çalışırdı.
   */
  it('goster filtre anahtarları arasında değil', () => {
    expect(panelinAnahtarlari()).not.toContain('goster')
    // Ama sunucu onu okumak zorunda.
    expect(sunucu.has('goster')).toBe(true)
  })
})
