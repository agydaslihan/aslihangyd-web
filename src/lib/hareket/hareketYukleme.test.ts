import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: ŞARTNAMENİN YÜKLEME STRATEJİSİ EKRANDA İZ BIRAKMAZ.
 *
 * "framer-motion mobilde de indi", "gsap ana pakete girdi", "az hareket
 * isteyen ziyaretçiye lenis indi" — üçü de sayfayı bozmaz. Site çalışır,
 * testler yeşildir, yalnızca fatura büyür ve kimse fark etmez.
 *
 * Bu projede aynı sınıf hata bir kez yaşandı: tek bir sabit uğruna zod'un
 * tamamı `/portfoy` paketine giriyordu — 63 kB, hiç çalıştırılmadan.
 *
 * Kural şu: üç kütüphane de YALNIZCA yükleyici dosyalarından ve YALNIZCA
 * dinamik olarak içeri girer.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ Testi susturmanın doğru yolu izinli listeye dosya eklemek DEĞİL:
 * kütüphaneyi `lib/hareket/yukleyiciler.ts` üzerinden iste.
 */

const KOK = path.resolve(path.join(import.meta.dirname, '..', '..'))

/** Yükleme stratejisine tabi kütüphaneler. */
const KUTUPHANELER = ['framer-motion', 'gsap', 'lenis'] as const

/**
 * Statik `import` yazmasına izin verilen tek dosya.
 *
 * ⚠️ `Devinim.tsx` istisna DEĞİL, kendi kuralı var: `LazyMotion` bir
 * bileşen ve render edilmek zorunda. Ama o dosyanın kendisi de yalnızca
 * `next/dynamic` ile yükleniyor — aşağıda ayrıca denetleniyor.
 */
const STATIK_IZINLI = new Set(['components/hareket/Devinim.tsx'])

/** Dinamik `import()` yazabilecek dosyalar. */
const DINAMIK_IZINLI = new Set(['lib/hareket/yukleyiciler.ts'])

function dosyalariTopla(dizin: string, gorece = ''): { yol: string; icerik: string }[] {
  const sonuc: { yol: string; icerik: string }[] = []
  for (const oge of readdirSync(dizin, { withFileTypes: true })) {
    if (oge.name === 'node_modules' || oge.name.startsWith('.')) continue
    const tam = path.join(dizin, oge.name)
    const yol = path.posix.join(gorece, oge.name)
    if (oge.isDirectory()) {
      sonuc.push(...dosyalariTopla(tam, yol))
    } else if (/\.tsx?$/.test(oge.name) && !/\.test\.tsx?$/.test(oge.name)) {
      sonuc.push({ yol, icerik: readFileSync(tam, 'utf8') })
    }
  }
  return sonuc
}

/** Yorumları düşürür — gerekçe metni kuralın kendisini tetiklemesin. */
function kodu(icerik: string): string {
  return icerik.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

const dosyalar = dosyalariTopla(KOK)

describe('hareket kütüphanelerinin yükleme stratejisi', () => {
  it('denetlenecek dosya bulunuyor', () => {
    expect(dosyalar.length).toBeGreaterThan(100)
  })

  /**
   * ⚠️ `import type` BU KURALIN DIŞINDA. TypeScript tür içe aktarmalarını
   * derlemede tamamen siliyor; üretilen JavaScript'te satırdan iz kalmıyor
   * ve paketleyici kütüphaneyi görmüyor. Yasak olan RUNTIME içe aktarma.
   */
  it.each(KUTUPHANELER)('%s statik olarak içe aktarılmıyor', (kutuphane) => {
    const desen = new RegExp(`^\\s*import\\s(?!type\\s)[^\\n]*['"]${kutuphane}(/[^'"]*)?['"]`, 'm')

    const ihlaller = dosyalar
      .filter((dosya) => !STATIK_IZINLI.has(dosya.yol))
      .filter((dosya) => desen.test(kodu(dosya.icerik)))
      .map((dosya) => dosya.yol)

    expect(
      ihlaller,
      `${kutuphane} statik içe aktarılmış — o dosyanın paketine giriyor ve ` +
        'kullanılmasa bile indiriliyor. lib/hareket/yukleyiciler.ts üzerinden isteyin.',
    ).toEqual([])
  })

  it.each(KUTUPHANELER)('%s yalnızca yükleyici dosyasından dinamik geliyor', (kutuphane) => {
    const desen = new RegExp(`import\\(\\s*['"]${kutuphane}(/[^'"]*)?['"]`, 'm')

    const ihlaller = dosyalar
      .filter((dosya) => !DINAMIK_IZINLI.has(dosya.yol))
      .filter((dosya) => desen.test(kodu(dosya.icerik)))
      .map((dosya) => dosya.yol)

    expect(ihlaller, `${kutuphane} yükleyici dışında dinamik olarak da isteniyor`).toEqual([])
  })

  /**
   * ⚠️ ASIL KURAL BU: `import()` ÇAĞRISINDAN ÖNCE KAPI SORULMALI.
   *
   * "Yükle ama animasyonu kapat" bu şartnamede reddedildi. Kapı sorulmadan
   * yapılan bir dinamik import, az hareket isteyen ziyaretçiye kütüphaneyi
   * yine indirir — üstelik hiçbir animasyon oynamadığı için kimse fark
   * etmez.
   */
  it('her yükleyici, import çağrısından önce hareket kapısına soruyor', () => {
    const kaynak = kodu(readFileSync(path.join(KOK, 'lib/hareket/yukleyiciler.ts'), 'utf8'))

    // Kapı çağrısı olmayan bir `import(` kalmamalı.
    const bloklar = kaynak.split(/export async function /).slice(1)
    expect(bloklar.length).toBeGreaterThan(0)

    for (const blok of bloklar) {
      if (!blok.includes('import(')) continue
      const ad = blok.slice(0, blok.indexOf('('))

      // `devinimOzellikleri` istisna: onu yalnızca `Devinim` çağırıyor ve o
      // bileşen zaten kapının arkasında dinamik yükleniyor.
      if (ad === 'devinimOzellikleri') continue

      const kapiSirasi = blok.indexOf('azHareketIsteniyor()')
      const importSirasi = blok.indexOf('import(')
      expect(kapiSirasi, `${ad}: kapı hiç sorulmuyor`).toBeGreaterThan(-1)
      expect(kapiSirasi, `${ad}: kapı import'tan SONRA soruluyor`).toBeLessThan(importSirasi)
    }
  })

  /**
   * ⚠️ Lenis'in masaüstü koşulu da import'tan önce olmalı — aynı gerekçe,
   * bu sefer mobil için.
   */
  it('lenis, masaüstü kontrolünü import öncesinde yapıyor', () => {
    const kaynak = kodu(readFileSync(path.join(KOK, 'lib/hareket/yukleyiciler.ts'), 'utf8'))
    const blok = kaynak.slice(kaynak.indexOf('export async function lenisBaslat'))

    expect(blok.indexOf('masaustuMu()')).toBeGreaterThan(-1)
    expect(blok.indexOf('masaustuMu()')).toBeLessThan(blok.indexOf("import('lenis')"))
  })

  /**
   * ⚠️ `Devinim` statik olarak içe aktarılırsa `LazyMotion` çekirdeği o
   * sayfanın ilk paketine girer — kütüphaneyi tembelleştirmenin bütün
   * amacı kaybolur.
   */
  it('Devinim yalnızca dinamik olarak yükleniyor', () => {
    const statik = dosyalar
      .filter((dosya) => dosya.yol !== 'components/hareket/Devinim.tsx')
      .filter((dosya) => /^\s*import\s[^\n]*Devinim['"/]/m.test(kodu(dosya.icerik)))
      .map((dosya) => dosya.yol)

    expect(statik, 'Devinim statik içe aktarılmış — next/dynamic kullanın').toEqual([])
  })
})
