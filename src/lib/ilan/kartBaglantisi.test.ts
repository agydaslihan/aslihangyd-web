import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: TIKLANMAYAN KART EKRANDA DOĞRU GÖRÜNÜYOR.
 *
 * 21 Ağustos 2026'da ilan kartına tıklanınca detay açılmıyordu. Kart doğru
 * çiziliyor, hover çalışıyor, Next önyüklemesi bile isteği atıyordu —
 * yalnızca tıklama gitmiyordu. Hiçbir test kırılmadı, hiçbir hata çıkmadı.
 *
 * Sebep "kartı kaplayan bağlantı" (stretched link) deseninin iki sessiz
 * bağımlılığı:
 *   1. `content` yoksa `::after` sözde öğesi hiç üretilmez.
 *   2. `z-index` yoksa boyama sırası DOM sırasına kalır ve karttaki
 *      konumlandırılmış her öğe örtünün üstüne çıkabilir.
 *
 * Bu test deseni kullanan HER kartı denetliyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

const KOK = path.resolve(path.join(import.meta.dirname, '..', '..'))

function dosyalariTopla(dizin: string, gorece = ''): { yol: string; icerik: string }[] {
  const sonuc: { yol: string; icerik: string }[] = []
  for (const oge of readdirSync(dizin, { withFileTypes: true })) {
    if (oge.name === 'node_modules' || oge.name.startsWith('.')) continue
    const tam = path.join(dizin, oge.name)
    const yol = path.posix.join(gorece, oge.name)
    if (oge.isDirectory()) sonuc.push(...dosyalariTopla(tam, yol))
    else if (/\.tsx$/.test(oge.name) && !/\.test\.tsx$/.test(oge.name)) {
      sonuc.push({ yol, icerik: readFileSync(tam, 'utf8') })
    }
  }
  return sonuc
}

const kodu = (icerik: string) =>
  icerik.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const dosyalar = dosyalariTopla(KOK).map((d) => ({ ...d, kod: kodu(d.icerik) }))
const orten = dosyalar.filter((d) => /after:absolute\s+after:inset-0/.test(d.kod))

describe('kartı kaplayan bağlantı', () => {
  it('deseni kullanan en az bir kart var', () => {
    expect(orten.length).toBeGreaterThan(0)
  })

  /**
   * ⚠️ `content` OLMADAN SÖZDE ÖĞE YOK. Tailwind bir varsayılan enjekte
   * ediyor ama ona güvenmek, sürüm ya da sınıf sırası değiştiğinde sessizce
   * tıklanamaz bir kart bırakıyor.
   */
  it.each(orten.map((d) => d.yol))('%s örtüsü açıkça content yazıyor', (yol) => {
    const dosya = orten.find((d) => d.yol === yol)!
    expect(
      dosya.kod,
      "after:content-[''] eksik — sözde öğe hiç üretilmeyebilir ve kart tıklanamaz olur.",
    ).toContain("after:content-['']")
  })

  /**
   * ⚠️ `z-index` OLMADAN BOYAMA SIRASI DOM SIRASINA KALIYOR: rozetler,
   * medya sayacı ve görsel kabı örtünün üstüne çıkıp tıklamayı yutabiliyor.
   */
  it.each(orten.map((d) => d.yol))('%s örtüsü z-index taşıyor', (yol) => {
    const dosya = orten.find((d) => d.yol === yol)!
    expect(dosya.kod, 'after:z-* eksik — kartın üstündeki bir katman tıklamayı yutabilir.').toMatch(
      /after:z-\d+/,
    )
  })

  /**
   * ⚠️ Örtü, konumlandırılmış bir ata gerektiriyor. `relative` yoksa örtü
   * karta değil sayfaya göre yerleşir ve kart tıklanamaz kalır.
   */
  it.each(orten.map((d) => d.yol))('%s içinde konumlandırılmış kap var', (yol) => {
    const dosya = orten.find((d) => d.yol === yol)!
    expect(dosya.kod).toMatch(/\brelative\b/)
  })

  /**
   * ⚠️ `line-clamp` bağlantının ÜSTÜNDE olamaz: `overflow: hidden` +
   * `-webkit-box` örtüyü kırpma riski taşıyor. Kırpma başlığın işi.
   */
  it.each(orten.map((d) => d.yol))('%s bağlantısında line-clamp yok', (yol) => {
    const dosya = orten.find((d) => d.yol === yol)!
    const satirlar = dosya.kod.split('\n').filter((satir) => satir.includes('after:absolute'))
    for (const satir of satirlar) {
      expect(satir, 'line-clamp bağlantı sınıfında — başlığa taşıyın').not.toContain('line-clamp')
    }
  })

  /**
   * ⚠️ Bağlantı GERÇEK bir `<Link>`/`<a>` olmalı: tıklama işleyicisi olan
   * bir `<div>` klavyeyle açılmaz ve odak halkası almaz.
   */
  it.each(orten.map((d) => d.yol))('%s örtüsü gerçek bir bağlantıda', (yol) => {
    const dosya = orten.find((d) => d.yol === yol)!
    const kesit = dosya.kod.slice(
      Math.max(0, dosya.kod.indexOf('after:absolute') - 400),
      dosya.kod.indexOf('after:absolute'),
    )
    expect(kesit, 'örtü <Link>/<a> üzerinde değil — klavyeyle açılamaz').toMatch(/<Link|<a\s/)
  })
})
