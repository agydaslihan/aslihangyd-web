import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ `src/migrations/index.ts` DEPODA TUTULMUYOR — ÇAKIŞMA KAYNAĞIYDI.
 *
 * Payload her `migrate:create` çağrısında bu dosyanın SONUNA bir satır
 * ekliyor. Göç içeren her PR aynı yeri değiştirdiği için ikinci PR daima
 * çakışıyordu — `docs/ILERLEME.md` ile birebir aynı hastalık, aynı sebep:
 * iki dal aynı satır aralığına yazıyor.
 *
 * ⚠️ Dosya KALDIRILABİLDİ, çünkü Payload ona ihtiyaç duymuyor: göçleri
 * `migrationDir` altındaki dizini okuyarak buluyor. Kaynak kodda hiçbir
 * yer onu içe aktarmıyor.
 *
 * ⚠️ Bu varsayılmadı, ÖLÇÜLDÜ. Gerçek göçmen imajında
 * (`docker build --target gocmen`) dosya silinip
 * `pnpm payload migrate:status` koşuldu; yirmi göçü de eksiksiz listeledi.
 * Üretimde göçü çalıştıran yol tam olarak budur (`CMD pnpm payload migrate`).
 *
 * `migrate:create` dosyayı yeniden üretmeye devam ediyor; sorun değil,
 * git'e girmiyor. Bu test o kapıyı kapalı tutuyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

const KOK = path.resolve(path.join(import.meta.dirname, '..', '..'))
const IZLENEN = 'src/migrations/index.ts'

describe('göç indeksi', () => {
  it('depoda izlenmiyor', () => {
    const cikti = execFileSync('git', ['ls-files', '--', IZLENEN], {
      cwd: KOK,
      encoding: 'utf8',
    }).trim()

    expect(
      cikti,
      `${IZLENEN} git tarafından izleniyor. Bu dosya üretilir ve göç içeren her ` +
        "PR'da çakışır. Çözüm: `git rm --cached " +
        IZLENEN +
        '` — Payload dosyaya ihtiyaç duymuyor, göçleri dizinden okuyor.',
    ).toBe('')
  })

  it('yok sayma kuralı yerinde', () => {
    expect(readFileSync(path.join(KOK, '.gitignore'), 'utf8')).toContain(`/${IZLENEN}`)
  })

  /**
   * ⚠️ Kaynak kodda hiçbir yer indeksi içe aktarmamalı. Biri
   * `import { migrations } from './migrations'` yazarsa dosya yeniden
   * zorunlu hâle gelir ve depoya geri girmesi gerekir — ama bunu fark
   * etmenin tek yolu üretimde göçün patlaması olurdu.
   */
  it('kaynak kodda indekse başvuran yok', () => {
    // ⚠️ `git grep` eşleşme yoksa 1 ile çıkıyor; bu bir hata değil,
    // aradığımız sonuç. Yakalanmasaydı test her zaman kırmızı olurdu.
    let cikti = ''
    try {
      cikti = execFileSync(
        'git',
        ['grep', '-l', '-e', "from '@/migrations'", '-e', "from './migrations'", '--', 'src'],
        { cwd: KOK, encoding: 'utf8' },
      ).trim()
    } catch (hata) {
      const kod = (hata as { status?: number }).status
      if (kod !== 1) throw hata
    }

    expect(
      cikti,
      'Bu dosyalar göç indeksini içe aktarıyor; indeks depoda tutulmadığı için ' +
        'üretimde bulunamaz.',
    ).toBe('')
  }, 10_000)
})
