import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { eidsIlerlemesi } from '@/lib/eids'
import { sayiIyelik } from '@/lib/metin/iyelik'

/**
 * Gezinme dumanının SÖZLEŞMESİ.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Betiğin kendisi CI'da gerçek tarayıcıda koşuyor; bu dosya betiğin
 * kapsamının sessizce daralmadığını kanıtlıyor. İki ders üstüne kurulu:
 *
 * 1. `(pointer: fine)` yaması kaldırılırsa headless Chrome hareket kodunu
 *    hiç çalıştırmıyor ve test kırık yolu denemeden "geçti" diyor.
 * 2. 14 Eylül 2026: panel koordinat alanı yazılanı siliyordu ve bütün
 *    rotalar 200 dönüyordu. Davranış turu o yüzden var; sayaç metinleri de
 *    elle yazılmış sabitler — motor değişip betik eskide kalırsa test
 *    CI'da yanlış şeyi bekler.
 * ─────────────────────────────────────────────────────────────────────────
 */

const betik = readFileSync(join(process.cwd(), 'scripts/gezinme-dumani.mjs'), 'utf-8')
const isAkisi = readFileSync(join(process.cwd(), '.github/workflows/lighthouse.yml'), 'utf-8')

describe('hareket yaması korunuyor', () => {
  it('(pointer: fine) sorgusu her yeni belgede yamalanıyor', () => {
    expect(betik).toContain('Page.addScriptToEvaluateOnNewDocument')
    expect(betik).toContain("q.includes('pointer: fine')")
  })
})

describe('panel davranışı turu', () => {
  it('panel oturumu varken varsayılan olarak koşuyor', () => {
    expect(betik).toContain("const davranis = SADECE !== 'genel'")
    expect(betik).toContain('davranisTuru(wsAdresi, cerez)')
  })

  /** ⚠️ `input.value = …` React'in olay yolunu atlar — silme hatası o yoldaydı. */
  it('koordinat kutusuna gerçek klavye olayıyla yazıyor', () => {
    expect(betik).toContain('Input.insertText')
    expect(betik).toContain("key: 'Tab'")
    expect(betik).toContain('/admin/collections/ilanlar/create')
    expect(betik).toContain("'41.'")
  })

  /**
   * ⚠️ BETİKTEKİ BEKLENEN METİNLER MOTORDAN GELENLE AYNI. Sayaç metni
   * değişirse CI yanlış metni beklemesin — önce burada kırılsın.
   */
  it('sayaç metinleri iyelik ekiyle birebir', () => {
    for (const n of [0, 1, 2, 3, 4, 5]) {
      expect(betik).toContain(`EİDS: 6 eksikten ${sayiIyelik(n)} tamamlandı`)
    }
    const tam = eidsIlerlemesi(
      {
        eidsDurum: 'yetkili',
        ada: '1',
        parsel: '1',
        tasinmazNo: '1',
        eidsYetkiBaslangic: '2026-01-01',
        eidsYetkiBitis: '2027-01-01',
      },
      new Date('2026-09-14T12:00:00Z'),
    )
    expect(betik).toContain(tam.ozet)
  })

  it('rozet eksik sayısını ve alan dolunca düşüşünü denetliyor', () => {
    expect(betik).toContain("'EİDS eksik (6)'")
    expect(betik).toContain("'EİDS eksik (5)'")
  })

  it('kontrast iki temada, çizilen hâl üzerinden ölçülüyor', () => {
    expect(betik).toContain("for (const tema of ['light', 'dark'])")
    expect(betik).toContain("o.metin('.ilan-durum-rozet')")
    expect(betik).toContain("o.cubuk('.sihirbaz-eids-cubuk')")
    expect(betik).toContain('.sihirbaz-adimlar button:not(.etkin):not(.tamam) .sihirbaz-adim-ad')
  })

  it('deneme kaydı her durumda siliniyor', () => {
    expect(betik).toMatch(/finally \{\s*await api\(`\/api\/ilanlar\/\$\{ilanId\}`, 'DELETE'\)/)
  })
})

describe('CI süresi ölçülüyor', () => {
  it('toplam süre özete yazılıyor ve 15 dakika eşiği uyarıyor', () => {
    expect(isAkisi).toContain('Gezinme dumanı: $(( sure / 60 )) dk')
    expect(isAkisi).toContain('if [ "$sure" -gt 900 ]')
    // stderr de günlüğe girmeli — ✗ satırları console.error ile yazılıyor.
    expect(isAkisi).toContain('2>&1 | tee gezinme-dumani.log')
    expect(isAkisi).toContain('exit "$cikis"')
  })
})
