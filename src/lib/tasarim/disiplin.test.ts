import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * Tasarım disiplini denetimi.
 *
 * Tasarım sistemi bir belge değil, bir sözleşmedir. Belge unutulur;
 * sözleşme testle bağlanır. Burada üç kural denetlenir:
 *
 *   1. Bileşenlerde ham hex yok — renk yalnızca jetondan gelir.
 *   2. 600/700 font ağırlığı yok — sakin ton kalın metinle bozulur.
 *   3. Dolu bakır zemin yalnızca iki eylemde.
 *
 * ⚠️ KAPSAM KASITLI OLARAK DAR BAŞLIYOR. A aşamasında yalnızca tasarım
 * sisteminin kendi yüzeyi (`src/components/ui`) denetleniyor; E aşaması
 * (feature/tasarim-uyarlama) sayfaları uyarladıkça `UYARLANMIS_ALANLAR`
 * listesine ekleyecek. Testi bugün tüm koda açmak, kırmızı bir testle
 * yaşamayı normalleştirirdi — bir kez olduğunda testin uyarı değeri biter.
 *
 * Bakır kuralı (3) ise bugünden İTİBAREN tüm koda uygulanır: kural nadirlik
 * üzerine kurulu, kademeli uygulanamaz.
 */

const dirname = path.dirname(fileURLToPath(import.meta.url))
const KOK = path.resolve(dirname, '../..')

/** Tasarım diline uyarlanmış ve denetlenen alanlar. */
const UYARLANMIS_ALANLAR = ['components/ui', 'app/(site)/stil-rehberi'] as const

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

function tumTsx(): Dosya[] {
  return [...tsxDosyalari('components'), ...tsxDosyalari('app')]
}

const uyarlanmis = UYARLANMIS_ALANLAR.flatMap((alan) => tsxDosyalari(alan))
const hepsi = tumTsx()

/** Yorum satırlarını düşürür — kural metni kuralın kendisini tetiklemesin. */
function yorumsuz(icerik: string): string {
  return icerik.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

describe('kapsam', () => {
  it('denetlenecek dosya bulunuyor', () => {
    // Yol yanlışsa test sessizce "hiç ihlal yok" derdi.
    expect(uyarlanmis.length).toBeGreaterThan(5)
    expect(hepsi.length).toBeGreaterThan(30)
  })
})

describe('ham hex kullanılmıyor', () => {
  /**
   * Harita, MapLibre'ye stil nesnesi verir; MapLibre CSS değişkeni okumaz,
   * hex bekler. Tek istisna burasıdır ve B aşamasında harita stilinin
   * jetonlardan türetilmesiyle kapatılacak.
   */
  const MUAF = new Set<string>([])

  it.each(uyarlanmis.filter((d) => !MUAF.has(d.yol)).map((d) => [d.yol, d] as const))(
    '%s',
    (_yol, dosya) => {
      const bulunan = yorumsuz(dosya.icerik).match(/#[0-9a-fA-F]{3,8}\b/g) ?? []
      expect(bulunan, `ham hex bulundu: ${bulunan.join(', ')} — jeton kullanın`).toEqual([])
    },
  )
})

describe('font ağırlığı 500 ile sınırlı', () => {
  const YASAK = /\bfont-(semibold|bold|extrabold|black)\b/g

  it.each(uyarlanmis.map((d) => [d.yol, d] as const))('%s', (_yol, dosya) => {
    const bulunan = yorumsuz(dosya.icerik).match(YASAK) ?? []
    expect(
      bulunan,
      `600/700 ağırlık bulundu: ${bulunan.join(', ')} — font-medium kullanın`,
    ).toEqual([])
  })
})

describe('bakır kuralı', () => {
  /**
   * Dolu bakır zemine izin verilen dosyalar.
   *
   * ⚠️ BU LİSTEYE EKLEME YAPMAK TASARIM KARARIDIR.
   *
   * Bakır aksan yalnızca iki eylemde kullanılır: "Evimi değerlendir" ve
   * "Erişim talep et". Üçüncü bir yerde kullanıldığı anda ikisi de
   * sıradanlaşır ve kural işlevini kaybeder. Yeni bir satır eklemeden önce
   * sorulacak soru: bu gerçekten o iki eylemden biri mi?
   */
  const IZINLI_DOLU_BAKIR = new Set([
    // Görünümün kendisi burada tanımlanır; başka yerde sınıf yazılmaz.
    'components/ui/Buton.tsx',
    // Stil rehberi bileşenleri sergiler; yalnızca geliştirme ortamında açık.
    'app/(site)/stil-rehberi/page.tsx',
  ])

  /** `bg-bakir-400` … `bg-bakir-700` — dolu zemin. Tint (100/200) serbest. */
  const DOLU_BAKIR = /\bbg-bakir-([4-7]00)\b/g

  it('dolu bakır zemin yalnızca izinli dosyalarda geçiyor', () => {
    const ihlaller = hepsi
      .filter((dosya) => !IZINLI_DOLU_BAKIR.has(dosya.yol))
      .flatMap((dosya) => {
        const bulunan = yorumsuz(dosya.icerik).match(DOLU_BAKIR) ?? []
        return bulunan.map((sinif) => `${dosya.yol}: ${sinif}`)
      })

    expect(ihlaller, 'bakır aksan iki eylem dışında kullanılmış').toEqual([])
  })

  it('bakır buton görünümü sayılabilir kadar az çağrılıyor', () => {
    const cagrilar = hepsi.flatMap((dosya) => {
      if (dosya.yol === 'components/ui/Buton.tsx') return []
      const bulunan = yorumsuz(dosya.icerik).match(/gorunum="bakir"/g) ?? []
      return bulunan.map(() => dosya.yol)
    })

    /**
     * Üst sınır 4: iki eylem × (ana sayfa + kendi sayfası) kadar yer
     * tutuyor. Stil rehberi de bunun içinde. Sınır aşıldığında bakır
     * seyrekliğini kaybetmiş demektir.
     */
    expect(cagrilar.length, `bakır buton çağrıları: ${cagrilar.join(', ')}`).toBeLessThanOrEqual(4)
  })
})

describe('rakamlar hizalı', () => {
  it('gövde tabular-nums ile başlatılıyor', () => {
    const css = readFileSync(path.join(KOK, 'app/(site)/globals.css'), 'utf8')
    const govde = css.slice(css.indexOf('body {'), css.indexOf('body {') + 600)

    // İstisna yok kuralı: bir bileşen unutulsa bile gövde doğru davranmalı.
    expect(govde).toContain('font-variant-numeric: tabular-nums')
  })
})
