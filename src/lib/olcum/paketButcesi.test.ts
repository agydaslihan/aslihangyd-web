import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * İstemci JS bütçesi — CLAUDE.md ile ölçüm betiği aynı sayıyı söylemeli.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: BÜTÇE YAZILIYDI, DENETLENMİYORDU (14 Eylül 2026).
 *
 * CLAUDE.md "ana sayfa ≤320 kB gzip" diyordu; `scripts/paket-olcumu.mjs`
 * yalnızca 220 kB'ta UYARIYORDU ve her durumda çıkış 0 veriyordu. Yani
 * bütçe aşılsa CI yeşil kalırdı. Aynı gün ana sayfa CLS'inin raporlayıcı
 * bir kapıda iki hafta sessiz kaldığı bulundu.
 *
 * Betik üst seviyede ağ isteği attığı için içe aktarılamıyor; sayı
 * kaynaktan okunuyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

const KOK = path.resolve(path.join(import.meta.dirname, '..', '..', '..'))
const claude = readFileSync(path.join(KOK, 'CLAUDE.md'), 'utf8')
const betik = readFileSync(path.join(KOK, 'scripts/paket-olcumu.mjs'), 'utf8')
const ci = readFileSync(path.join(KOK, '.github/workflows/ci.yml'), 'utf8')

describe('istemci JS bütçesi', () => {
  it('CLAUDE.md bütçesi ile betikteki bütçe aynı', () => {
    const belge = /ana sayfa ≤(\d+) kB gzip/.exec(claude)?.[1]
    const kod = /const BUTCE_BAYT = (\d+) \* 1024/.exec(betik)?.[1]
    expect(belge, 'CLAUDE.md → "Bundle: ana sayfa ≤… kB gzip" bulunamadı').toBeDefined()
    expect(kod, 'paket-olcumu.mjs → BUTCE_BAYT bulunamadı').toBeDefined()
    expect(Number(kod)).toBe(Number(belge))
  })

  it('bütçe aşılınca betik çıkış 1 veriyor', () => {
    expect(betik).toMatch(/if \(butceAsildi\) \{[\s\S]*process\.exit\(1\)/)
  })

  it('trend eşiği bütçenin altında — uyarı bütçeden önce gelmeli', () => {
    const esik = Number(/const ESIK_BAYT = (\d+) \* 1024/.exec(betik)?.[1])
    const butce = Number(/const BUTCE_BAYT = (\d+) \* 1024/.exec(betik)?.[1])
    expect(esik).toBeLessThan(butce)
  })

  /** ⚠️ `|| paket_cikis=$?` olmadan bash -e adımı ilk hatada keserdi; çıkış sonda verilmeli. */
  it('CI adımı bütçe çıkışını yutmuyor', () => {
    expect(ci).toContain('|| paket_cikis=$?')
    expect(ci).toContain('exit "$paket_cikis"')
  })
})
