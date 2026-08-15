import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { paletCss, paletiGuvenliOku } from './sunucu'
import { varsayilanPalet, YUVALAR, type Palet } from './yuvalar'

const KOK = path.join(import.meta.dirname, '..', '..', '..')

describe('paletCss', () => {
  it('her yuvayı kendi CSS jetonuna yazıyor', () => {
    const css = paletCss(varsayilanPalet('acik'), varsayilanPalet('koyu'))
    for (const yuva of YUVALAR) {
      expect(css, `${yuva.etiket} → ${yuva.jeton}`).toContain(`${yuva.jeton}:`)
    }
  })

  it('açık ve koyu temayı ayrı seçicilere yazıyor', () => {
    const css = paletCss(varsayilanPalet('acik'), varsayilanPalet('koyu'))
    expect(css).toContain(':root{')
    expect(css).toContain(":root[data-tema='koyu']{")
  })

  /**
   * ─────────────────────────────────────────────────────────────────────
   * ⚠️ BU DİZE DOĞRUDAN HTML'E BASILIYOR.
   *
   * Değerler kapıdan `#rrggbb` olarak geçiyor ama "zaten doğrulandı"
   * demek, savunmayı tek bir noktaya bağlamaktır. Buraya sızacak bir
   * `</style>` etiketi ya da bir CSS ifadesi enjeksiyon olurdu.
   * ─────────────────────────────────────────────────────────────────────
   */
  it('hex olmayan değer CSS’e hiç yazılmaz', () => {
    const kotu: Palet = {
      ...varsayilanPalet('acik'),
      zemin: '</style><script>alert(1)</script>',
      metin: 'red; background: url(javascript:alert(1))',
    }

    const css = paletCss(kotu, varsayilanPalet('koyu'))

    expect(css).not.toContain('<')
    expect(css).not.toContain('script')
    expect(css).not.toContain('javascript')

    /**
     * ⚠️ İddia AÇIK TEMA BLOĞUNA daraltılmış.
     *
     * İlk hâli `expect(css).not.toContain('--color-zemin:')` idi ve
     * kırmızı verdi — ama kod doğruydu: koyu tema kendi GEÇERLİ zeminini
     * yazıyordu. Test, süzgecin çalışmadığını değil, kendi kapsamının
     * yanlış olduğunu göstermişti.
     */
    const acikBlok = css.slice(css.indexOf(':root{'), css.indexOf(':root[data-tema'))

    // Zehirli iki yuva açık blokta hiç yazılmadı; geçerli olanlar duruyor.
    expect(acikBlok).not.toContain('--color-zemin:')
    expect(acikBlok).not.toContain('--color-metin:')
    expect(acikBlok).toContain('--color-vurgu:')
  })

  it('CSS içinde süslü parantez dengesi bozulmuyor', () => {
    const css = paletCss(varsayilanPalet('acik'), varsayilanPalet('koyu'))
    expect((css.match(/\{/g) ?? []).length).toBe((css.match(/\}/g) ?? []).length)
  })
})

describe('paletiGuvenliOku — çalışma zamanı doğrulaması', () => {
  it('geçerli paleti aynen döndürür', () => {
    const palet = varsayilanPalet('acik')
    expect(paletiGuvenliOku(palet, 'acik')).toEqual(palet)
  })

  /**
   * ⚠️ KAPI ZATEN ENGELLİYOR AMA YETMEZ.
   *
   * Panel kaydetmeyi engelliyor, sunucu kancası veritabanını koruyor.
   * Yine de bir göç betiği, elle SQL ya da eski bir kayıt AA'nın altında
   * bir palet bırakabilir. O durumda siteyi okunmaz hâlde yayınlamaktansa
   * varsayılana düşüyoruz: erişilebilirlik, kişiselleştirmeden önce gelir.
   */
  it('AA’nın altındaki kayıtlı palet varsayılana düşer', () => {
    const bozuk = { ...varsayilanPalet('acik'), metin: '#fbfaf7' }
    expect(paletiGuvenliOku(bozuk, 'acik')).toEqual(varsayilanPalet('acik'))
  })

  it('eksik ya da boş kayıt varsayılana düşer', () => {
    expect(paletiGuvenliOku(null, 'acik')).toEqual(varsayilanPalet('acik'))
    expect(paletiGuvenliOku({}, 'koyu')).toEqual(varsayilanPalet('koyu'))
  })
})

/**
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ RENK DEĞİŞİKLİĞİ İMAJ DERLEMEDEN ETKİLİ OLMALI.
 *
 * Bu, `NEXT_PUBLIC_*` tuzağının aynısı. 12 Ağustos 2026'da dokuz değişken
 * birden ölüydü çünkü derleme anına bağlıydılar. Renkler `globals.css`e
 * yazılsaydı Aslıhan panelde rengi değiştirir, kaydeder ve HİÇBİR ŞEY
 * OLMAZDI — üstelik sebebini anlamasının yolu olmazdı.
 *
 * Bu testler o bağı kod seviyesinde koruyor.
 * ─────────────────────────────────────────────────────────────────────────
 */
describe('çalışma zamanı bağı', () => {
  const layout = readFileSync(path.join(KOK, 'src/app/(site)/layout.tsx'), 'utf8')

  it('layout paleti sunucuda okuyup <head> içine basıyor', () => {
    expect(layout).toContain('markaAyarlari()')
    expect(layout).toContain('paletCss(')
    expect(layout).toContain('id="marka-paleti"')
  })

  /**
   * ⚠️ Palet İSTEMCİDE yazılırsa FOUC olur: ziyaretçi bir kare varsayılan
   * paleti görür, sonra renkler sıçrar. Enjeksiyonun sunucu bileşeninde
   * kalması bunu engelliyor.
   */
  it('palet enjeksiyonu sunucu bileşeninde — layout istemci değil', () => {
    expect(layout.trimStart().startsWith("'use client'")).toBe(false)
  })

  it('site adı ve ikonlar sabit metadata değil, generateMetadata ile', () => {
    expect(layout).toContain('export async function generateMetadata')
    expect(layout).toContain('/favicon.ico')
  })

  /**
   * ⚠️ MARKA YUVALARININ SÜRDÜĞÜ JETONLAR `globals.css`TE TANIMLI OLMALI.
   *
   * Tanımsız bir jetonu ezmek sessizce hiçbir şey yapmaz: panel kaydeder,
   * kullanıcı sonuç bekler, hiçbir şey değişmez. Bu tam olarak bu projede
   * haritayı öldüren arıza sınıfı.
   */
  it('her yuvanın jetonu globals.css içinde tanımlı', () => {
    const css = readFileSync(path.join(KOK, 'src/app/(site)/globals.css'), 'utf8')
    const eksikler = YUVALAR.filter((yuva) => !css.includes(`${yuva.jeton}:`)).map((y) => y.jeton)

    expect(
      eksikler,
      'Bu jetonlar globals.css içinde tanımlı değil; ezmek hiçbir şey yapmaz.',
    ).toEqual([])
  })
})
