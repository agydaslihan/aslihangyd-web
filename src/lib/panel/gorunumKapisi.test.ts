import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * Özel panel görünümlerinin sözleşmesi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: BU EKRANLAR SESSİZCE BOŞ AÇILIYOR.
 *
 * Payload'ın özel görünümleri bir hata vermeden hiçbir şey çizmeyebilir.
 * Üç ayrı arıza aynı sınıftan çıktı:
 *
 *   1. Bileşen `importMap`te yoktu → görünüm hiç yüklenmedi.
 *   2. Oturum kapısı gövdede değildi → ekran herkese açıktı.
 *   3. Oturum YANLIŞ PROP'tan okundu → kapı herkesi çevirdi, ekran boş
 *      kaldı. (27 Ağustos 2026; `anasayfa-bolumleri` ve
 *      `gozlemlenebilirlik` günlerce bomboş açıldı.)
 *
 * Üçüncüsü en sinsisi: `AdminViewServerProps` tipinde `user` ALANI VAR —
 * ama isteğe bağlı (`user?: TypedUser`) ve Payload özel görünümlere onu
 * GEÇMİYOR. Yani `{ user }` yazmak derlemeden geçiyor, çalışma zamanında
 * `undefined` oluyor ve `if (!user) return null` sayfayı boşaltıyor.
 * Konsol sessiz, sunucu günlüğü temiz, HTTP 200.
 *
 * Oturumun geçtiği tek yer `initPageResult.req`.
 *
 * ⚠️ Bu dosya KAYNAĞA bakıyor. Gerçek tarayıcı denetimi ayrı ve
 * tamamlayıcı: `scripts/gezinme-dumani.mjs` panelin bütün rotalarını
 * oturumlu açıp gövdenin boş olmadığını doğruluyor, CI'da engelleyici.
 * ─────────────────────────────────────────────────────────────────────────
 */

const dizin = path.dirname(fileURLToPath(import.meta.url))
const KOK = path.resolve(dizin, '../..')

const YAPILANDIRMA = readFileSync(path.join(KOK, 'payload.config.ts'), 'utf8')
const IMPORT_HARITASI = readFileSync(path.join(KOK, 'app/(payload)/admin/importMap.js'), 'utf8')

/**
 * `views` bloğundaki her `Component: '@/…#default'` girdisi.
 *
 * ⚠️ `afterNavLinks` ve `beforeDashboard` de aynı `importMap` kuralına
 * tabi; onlar da toplanıyor.
 */
const bilesenler = [
  ...YAPILANDIRMA.matchAll(/'(@\/components\/[A-Za-z0-9/_-]+)#([A-Za-z0-9_]+)'/g),
].map((e) => ({ modul: e[1]!, disaAktarim: e[2]!, tam: `${e[1]}#${e[2]}` }))

/** Yalnızca `views:` altındaki görünümler — oturum kapısı onlar için şart. */
const gorunumler = [
  ...(/views:\s*\{([\s\S]*?)\n {6}\},\n/.exec(YAPILANDIRMA)?.[1] ?? YAPILANDIRMA).matchAll(
    /Component:\s*'(@\/components\/[A-Za-z0-9/_-]+)#/g,
  ),
].map((e) => e[1]!)

function kaynak(modul: string): string {
  const goreli = modul.replace('@/', '')
  for (const uzanti of ['.tsx', '.ts']) {
    const tam = path.join(KOK, `${goreli}${uzanti}`)
    if (existsSync(tam)) return readFileSync(tam, 'utf8')
  }
  throw new Error(`Panel bileşeni bulunamadı: ${modul}`)
}

describe('panel bileşenleri', () => {
  it('yapılandırmada en az bir özel görünüm var — denetim boşa koşmasın', () => {
    expect(gorunumler.length).toBeGreaterThan(5)
  })

  it.each(bilesenler.map((b) => [b.tam, b] as const))('%s — dosyası var', (_ad, bilesen) => {
    expect(() => kaynak(bilesen.modul)).not.toThrow()
  })

  it.each(bilesenler.map((b) => [b.tam, b] as const))('%s — importMap içinde', (_ad, bilesen) => {
    /**
     * ⚠️ ÜÇÜNCÜ TEKRAR. `importMap.js` üretilen bir dosya ama depoda
     * duruyor ve yeni bir bileşen eklenip `pnpm payload generate:importmap`
     * unutulduğunda görünüm sessizce boş açılıyor.
     */
    expect(
      IMPORT_HARITASI,
      `${bilesen.tam} importMap'te yok. \`pnpm payload generate:importmap\` çalıştırın —\n` +
        'yoksa bu görünüm panelde bomboş açılır ve hiçbir hata vermez.',
    ).toContain(`"${bilesen.tam}"`)
  })
})

describe('özel görünümlerin oturum kapısı', () => {
  it.each(gorunumler.map((m) => [m, kaynak(m)] as const))(
    '%s — oturumu `initPageResult.req`ten okuyor',
    (_ad, icerik) => {
      const govde = icerik.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

      expect(
        govde,
        'Oturum `initPageResult.req.user`dan okunmalı.\n' +
          '`AdminViewServerProps` içinde `user` alanı var ama İSTEĞE BAĞLI ve\n' +
          'Payload özel görünümlere onu geçmiyor: tip denetimi geçer, ekran\n' +
          'çalışma zamanında bomboş açılır.',
      ).toMatch(/\{\s*initPageResult\s*[,}]/)

      expect(govde, "Üst düzey `user` prop'u okunmuş. Payload bunu geçmiyor.").not.toMatch(
        /export default (async )?function \w+\(\{\s*user\s*[,}]/,
      )
    },
  )

  it.each(gorunumler.map((m) => [m, kaynak(m)] as const))(
    '%s — gövdede oturum kapısı var',
    (_ad, icerik) => {
      const govde = icerik.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

      expect(
        govde,
        'Admin görünümleri OTURUMSUZ DA çalışıyor. `if (!req.user) return null`\n' +
          'olmadan ekran herkese açık olur.',
      ).toMatch(/if\s*\(\s*!req\.user\s*\)\s*return null/)
    },
  )
})
