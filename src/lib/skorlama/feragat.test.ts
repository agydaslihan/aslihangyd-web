import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ CLAUDE.md KURAL 5 — YATIRIM SKORU GÖSTERİLEN HER YERDE FERAGAT.
 *
 * "Bu bilgiler yatırım tavsiyesi niteliğinde değildir. Geçmiş veriler
 * gelecekteki getiriyi garanti etmez."
 *
 * Kural ihlal edilemezler listesinde ve sebebi çift: itibar ve mevzuat.
 * "Garantili getiri" izlenimi yaratan gösterimler Reklam Kurulu yaptırımı
 * doğurur.
 *
 * ⚠️ NEDEN TEST GEREKTİ: KURAL BİR BİLEŞENE SIZDI.
 *
 * Yeniden tasarımda `MahalleKarti`ne yatırım skoru rozeti eklendi. Skor
 * artık kartın kendisinde — yani kartı çizen HER sayfa farkında olmadan
 * skor yayınlamaya başladı. Ana sayfada feragat gerçekten unutulmuştu ve
 * hiçbir şey uyarmadı.
 *
 * Bu testin denetlediği şey tam olarak bu sızıntı: skor taşıyan bir bileşen
 * kullanan sayfa, feragatı da basmak zorunda.
 *
 * ⚠️ Testi susturmanın doğru yolu listeden dosya çıkarmak DEĞİL, sayfaya
 * `<Feragat />` eklemek. Skoru göstermek istemiyorsan bileşeni kullanma.
 * ─────────────────────────────────────────────────────────────────────────
 */

const dirname = path.dirname(fileURLToPath(import.meta.url))
const KOK = path.resolve(dirname, '../..')

/**
 * Yatırım skoru GÖSTEREN bileşenler.
 *
 * Yeni bir skor gösterimi eklendiğinde adı buraya yazılır; o bileşeni
 * kullanan her sayfa feragat basmak zorunda kalır.
 */
const SKOR_GOSTEREN = ['MahalleKarti', 'MahalleSkoru'] as const

interface Dosya {
  yol: string
  icerik: string
}

function tsxDosyalari(gorece: string): Dosya[] {
  const mutlak = path.join(KOK, gorece)
  let girdiler: string[]

  try {
    girdiler = readdirSync(mutlak, { recursive: true, encoding: 'utf8' })
  } catch {
    return []
  }

  return girdiler
    .filter((ad) => ad.endsWith('.tsx'))
    .map((ad) => ({
      yol: path.posix.join(gorece, ad.split(path.sep).join('/')),
      icerik: readFileSync(path.join(mutlak, ad), 'utf8'),
    }))
}

/** Yorumları düşürür — kural metni kuralın kendisini tetiklemesin. */
function kodu(icerik: string): string {
  return icerik.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

const sayfalar = tsxDosyalari('app').filter((dosya) => /\/(page|template)\.tsx$/.test(dosya.yol))

describe('kapsam', () => {
  it('sayfa dosyaları bulunuyor', () => {
    // Yol yanlışsa test sessizce "hiç ihlal yok" derdi.
    expect(sayfalar.length).toBeGreaterThan(15)
  })

  it('skor rozeti gerçekten kartın içinde', () => {
    // Rozet kaldırılırsa bu testin gerekçesi de biter; sessizce yeşil
    // kalmasın, önce burası kırılsın ve karar bilinçli verilsin.
    const kart = readFileSync(path.join(KOK, 'components/mahalle/MahalleKarti.tsx'), 'utf8')
    expect(kodu(kart)).toContain('yatirimSkoru?.toplam')
  })
})

describe('yatırım skoru gösteren sayfada feragat var', () => {
  it.each(SKOR_GOSTEREN)('%s kullanan her sayfa Feragat basıyor', (bilesen) => {
    const eksik = sayfalar
      .filter((dosya) => kodu(dosya.icerik).includes(`<${bilesen}`))
      .filter((dosya) => !kodu(dosya.icerik).includes('<Feragat'))
      .map((dosya) => dosya.yol)

    expect(
      eksik,
      `${bilesen} yatırım skoru gösteriyor ama bu sayfa(lar)da feragat yok. ` +
        'CLAUDE.md kural 5 ihlal edilemezler listesinde: skor gösterilen her yerde ' +
        '"yatırım tavsiyesi değildir" ibaresi zorunlu. Sayfaya <Feragat /> ekleyin.',
    ).toEqual([])
  })
})
