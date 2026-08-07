import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * Seed betiğinin ortam koruması.
 *
 * ⚠️ Bu test betiği ÇALIŞTIRMAZ — çalıştırmak demo veri yazmak olurdu.
 * Kaynağı okuyup korumanın yerinde olduğunu doğrular.
 *
 * Neden gerekli: koruma önceden yalnızca `NODE_ENV === 'production'` ise
 * duruyordu. `NODE_ENV` tanımsızsa — kabuktan elle çalıştırırken en yaygın
 * durum — betik çalışıyordu. Üretim veritabanına bağlı bir kabukta
 * `pnpm seed` yazmak siteye "[DEMO]" kayıtlar basmak demekti.
 */
const dirname = path.dirname(fileURLToPath(import.meta.url))
const kaynak = readFileSync(path.resolve(dirname, '../../scripts/seed.ts'), 'utf8')

describe('seed betiği ortam koruması', () => {
  it('yalnızca development ortamında çalışır — beyaz liste', () => {
    expect(kaynak).toContain("process.env.NODE_ENV !== 'development'")
  })

  it('koruma process.exit ile sonlanır', () => {
    const kapi = kaynak.slice(
      kaynak.indexOf("process.env.NODE_ENV !== 'development'"),
      kaynak.indexOf("process.env.NODE_ENV !== 'development'") + 600,
    )
    expect(kapi).toContain('process.exit(1)')
  })

  /**
   * ⚠️ Kara liste yaklaşımına geri dönülmemeli. Bu test, birinin
   * korumayı "production değilse çalış" biçimine çevirmesini engeller.
   */
  it('yalnızca production kara listesi kullanılmıyor', () => {
    expect(kaynak).not.toContain("process.env.NODE_ENV === 'production'")
  })

  it('demo kayıtlar tanınabilir bir önek taşıyor', () => {
    expect(kaynak).toContain("const DEMO_ONEKI = '[DEMO]'")
  })
})
