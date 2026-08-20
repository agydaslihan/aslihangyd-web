import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const KOK = path.resolve(dirname, '../..')
const oku = (yol: string) => readFileSync(path.join(KOK, yol), 'utf8')

/** Yorumları düşürür — gerekçe metni kuralın kendisini tetiklemesin. */
function kodu(icerik: string): string {
  return icerik.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

/**
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ALAN VERİSİ ÖLÇÜMÜNÜN KVKK SÖZLEŞMESİ.
 *
 * Core Web Vitals bir tarayıcı betiği gerektiriyor ve CLAUDE.md kural 8
 * ihlal edilemezler listesinde: "onay alınmadan analitik betiği YÜKLENMEZ."
 * Ölçülen şeyin teknik bir zamanlama olması kuralı gevşetmiyor — kural
 * betiğin niteliğine değil VARLIĞINA bakıyor.
 *
 * Ayrıca ham değer saklanmıyor: "LCP = 2.431 ms" tek bir ziyarete ait bir
 * kayıt olurdu. Bu testler o iki taahhüdü koda bağlıyor.
 * ─────────────────────────────────────────────────────────────────────────
 */
describe('vital ölçümü — onay kapısı', () => {
  const UC = oku('app/api/olcum/vital/route.ts')
  const KATMAN_B = oku('components/olcum/KatmanB.tsx')

  /**
   * ⚠️ İKİ BAĞIMSIZ KAPI, tıpkı olay ucunda olduğu gibi. Betiğin yalnızca
   * onay varsa yüklenmesi ilk kapı; uca doğrudan istek atılması ihtimalini
   * kapatan ikinci kapı sunucuda.
   */
  it('uç onay çerezini kontrol ediyor', () => {
    const kod = kodu(UC)
    expect(kod).toContain("izinVarMi(onay, 'analitik')")
    expect(kod).toContain('return new NextResponse(null, { status: 204 })')
  })

  it('izleyici onay kapısının arkasında render ediliyor', () => {
    const kod = kodu(KATMAN_B)
    expect(kod).toContain("izinVarMi(onay, 'analitik')")
    expect(kod).toContain('<VitalIzleyici />')
  })

  /**
   * ⚠️ `web-vitals` DİNAMİK içe aktarılmalı. Statik `import` olsaydı
   * kütüphane onay veren ziyaretçinin ilk paketine girer ve LCP'yi
   * geciktirirdi: performansı ölçmek için performansı bozardık.
   */
  it('web-vitals dinamik olarak yükleniyor', () => {
    const kod = kodu(oku('components/olcum/VitalIzleyici.tsx'))
    expect(kod).toContain("import('web-vitals')")
    expect(
      /^\s*import\s+.*from\s+'web-vitals'/m.test(kod),
      'web-vitals statik olarak içe aktarılmış: ilk pakete girer ve ölçtüğü ' +
        'şeyi bozar. Dinamik `import()` kullanın.',
    ).toBe(false)
  })
})

describe('vital ölçümü — ham değer saklanmıyor', () => {
  const UC = kodu(oku('app/api/olcum/vital/route.ts'))
  const TAMPON = kodu(oku('lib/olcum/tampon.ts'))

  /**
   * ⚠️ ASIL DENETİM BU. Uç, gelen sayıyı kovaya çevirip atmalı; tampona
   * ham değer geçirilmemeli.
   */
  it('uç değeri kovaya çevirip öyle sayıyor', () => {
    expect(UC).toContain('kovaSirasi(')
    expect(UC).toContain('vitalSay(sonuc.data.ad, cihaz, kova)')
    expect(
      /vitalSay\([^)]*deger/.test(UC),
      'Ham değer `vitalSay`e geçiriliyor: veritabanında tek ziyarete ait bir ' +
        'kayıt oluşur. Yalnızca kova sırası geçilmeli.',
    ).toBe(false)
  })

  /** Tampon imzası ham sayıyı kabul etmemeli. */
  it('tampon kova alıyor, değer değil', () => {
    expect(TAMPON).toContain(
      'export function vitalSay(ad: string, cihaz: CihazSinifi, kova: number)',
    )
  })

  /**
   * ⚠️ ROTA GÖNDERİLMİYOR: metrik + rota + cihaz + zaman birleşimi, az
   * ziyaretçili bir sayfada tek bir kişiyi işaret edebilirdi.
   */
  it('istemci rota göndermiyor', () => {
    const kod = kodu(oku('components/olcum/VitalIzleyici.tsx'))
    expect(kod).not.toContain('usePathname')
    expect(kod).not.toContain('location.pathname')
  })

  /**
   * ⚠️ Üst sınır: `Number.MAX_VALUE` gönderip histogramı bozmak mümkün
   * olmasın.
   */
  it('uç değer aralığını sınırlıyor', () => {
    expect(UC).toContain('.min(0)')
    expect(UC).toContain('.max(600_000)')
  })
})
