import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { jeton, temalariCoz } from '@/lib/tasarim/kontrast'

import { haritaRenkleri, jetonRengi } from './jetonlar'

/**
 * Harita yedek renklerinin paletten sapmadığını sınar.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: YEDEK LİSTESİ SESSİZCE BAYATLADI.
 *
 * MapLibre CSS değişkeni anlamaz; `jetonlar.ts` renkleri çalışma zamanında
 * `getComputedStyle` ile okuyor ve tarayıcı dışında elle yazılmış bir yedek
 * listesine düşüyor.
 *
 * 12 Ağustos 2026'daki palet değişiminde o liste eski paletten kaldı ve
 * içindeki `--color-bakir-600` globals.css'ten tamamen silindi.
 * `getComputedStyle` bulunmayan jeton için boş dize döndürüyor, kod da
 * yedeğe düşüyor — yani **seçili mahalle sütunu, palet değişmiş olmasına
 * rağmen bakır çiziliyordu.** Ne derleme ne test hata veriyordu; harita
 * yalnızca yanlış renkteydi.
 *
 * Bu test iki şeyi birden kapatıyor: yedek değerin globals.css'teki karşılığı
 * ile aynı olması, ve o jetonun gerçekten VAR olması.
 * ─────────────────────────────────────────────────────────────────────────
 */

const dirname = path.dirname(fileURLToPath(import.meta.url))
const GLOBALS_YOLU = path.resolve(dirname, '../../app/(site)/globals.css')
const JETONLAR_YOLU = path.resolve(dirname, './jetonlar.ts')

const temalar = temalariCoz(readFileSync(GLOBALS_YOLU, 'utf8'))

/** `jetonlar.ts` içindeki YEDEKLER tablosunu kaynaktan okur. */
function yedekleriOku(): Map<string, string> {
  const kaynak = readFileSync(JETONLAR_YOLU, 'utf8')
  const blok = /const YEDEKLER: Record<string, string> = \{([\s\S]*?)\n\}/.exec(kaynak)
  if (blok === null) throw new Error('YEDEKLER tablosu bulunamadı')

  const bulunan = new Map<string, string>()
  for (const [, ad, deger] of blok[1]!.matchAll(/'(--color-[a-z0-9-]+)':\s*'(#[0-9a-f]{3,8})'/gi)) {
    if (ad !== undefined && deger !== undefined) bulunan.set(ad, deger.toLowerCase())
  }
  return bulunan
}

describe('harita yedek renkleri', () => {
  const yedekler = yedekleriOku()

  it('yedek tablosu okunabildi', () => {
    expect(yedekler.size).toBeGreaterThan(5)
  })

  it('her yedek globals.css içindeki açık tema değeriyle aynı', () => {
    const sapmalar: string[] = []

    for (const [ad, yedek] of yedekler) {
      const gercek = temalar.acik.get(ad)

      if (gercek === undefined) {
        sapmalar.push(`${ad}: globals.css'te YOK (jeton silinmiş olabilir)`)
        continue
      }
      if (gercek.toLowerCase() !== yedek) {
        sapmalar.push(`${ad}: yedek ${yedek}, globals.css ${gercek}`)
      }
    }

    expect(
      sapmalar,
      'Harita yedek renkleri paletten sapmış. Tarayıcı dışında ve jeton ' +
        'bulunamadığında bu değerler kullanılıyor — sapan bir yedek, haritayı ' +
        'sessizce eski paletle çizer.\n' +
        `Sapmalar:\n  ${sapmalar.join('\n  ')}`,
    ).toEqual([])
  })

  /**
   * ⚠️ Asıl arıza buydu: kullanılan jetonun globals.css'te var olması.
   * Yedek listesi güncel olsa bile, olmayan bir jetona başvuran bir çağrı
   * her zaman yedeğe düşer ve tema değişimini hiç görmez.
   */
  it('haritanın kullandığı her jeton globals.css içinde tanımlı', () => {
    const kaynak = readFileSync(JETONLAR_YOLU, 'utf8')
    const eksikler: string[] = []

    for (const [, ad] of kaynak.matchAll(/jetonRengi\('(--color-[a-z0-9-]+)'\)/g)) {
      if (ad !== undefined && temalar.acik.get(ad) === undefined) eksikler.push(ad)
    }

    expect(eksikler, 'harita var olmayan bir jetona başvuruyor').toEqual([])
  })

  it('sunucu tarafında yedeğe düşer, çökmez', () => {
    // Node ortamında `window` yok; yedek dönmeli.
    expect(jetonRengi('--color-zemin')).toBe('#f7f6f2')
    expect(haritaRenkleri().sutunSecili).toBe(jeton(temalar.acik, '--color-aksan'))
  })

  it('tanınmayan jeton için siyaha düşer — sessiz beyaz değil', () => {
    // Siyah bilinçli: gözle fark edilir. Beyaz olsaydı harita üzerinde
    // kaybolur ve eksik jeton hiç anlaşılmazdı.
    expect(jetonRengi('--color-boyle-bir-sey-yok')).toBe('#000000')
  })
})
