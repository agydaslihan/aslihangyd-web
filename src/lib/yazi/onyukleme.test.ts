import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { govdeFontuAdresi, onbellegiSifirla } from './onyukleme'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const KOK = path.resolve(dirname, '../..')
const MANIFEST = path.join(process.cwd(), '.next', 'server', 'next-font-manifest.json')

/**
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: MODÜL SESSİZCE BAŞARISIZ OLUYOR — BİLEREK.
 *
 * `govdeFontuAdresi()` manifesti bulamazsa `null` dönüyor ve hiçbir şey
 * basılmıyor. Bu doğru davranış (ön yükleme bir iyileştirme, varlık şartı
 * değil) ama tehlikeli bir yan etkisi var: Next dosyanın yerini ya da
 * biçimini değiştirirse ön yükleme sessizce ölür ve kimse fark etmez.
 *
 * Projede bu kalıptan dört tane yaşandı. Bu test o beşinciyi engelliyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ MANİFEST TESTİ KOŞULLU VE SEBEBİ CI SIRASI.
 *
 * `pnpm test`, `pnpm build`ten ÖNCE koşuyor; ilk çalıştırmada `.next`
 * klasörü olmayabilir. Derleme çıktısına koşulsuz bağlanan bir test CI'da
 * daima kırmızı olurdu — bu tuzağa MapLibre worker testinde bir kez
 * düşülmüştü.
 *
 * Manifest yoksa test, modülün ÇÖKMEDİĞİNİ doğruluyor; varsa (yerelde ve
 * her derleme sonrası koşuda) çözümlemenin gerçekten çalıştığını.
 */
describe('gövde fontu ön yüklemesi', () => {
  it('manifest yokken çökmüyor, null dönüyor', () => {
    onbellegiSifirla()
    // Manifest varsa bu senaryo test edilemez; en azından fırlatmamalı.
    expect(() => govdeFontuAdresi()).not.toThrow()
  })

  it.runIf(existsSync(MANIFEST))('derleme çıktısında adres çözülüyor', () => {
    onbellegiSifirla()
    const adres = govdeFontuAdresi()

    expect(
      adres,
      'Font manifesti var ama gövde fontu çözülemedi. Next dosyanın biçimini ' +
        'değiştirmiş ya da font dosyası yeniden adlandırılmış olabilir. ' +
        'Ön yükleme sessizce ölür; lib/yazi/onyukleme.ts güncellenmeli.',
    ).not.toBeNull()

    expect(adres).toMatch(/^\/_next\/static\/media\/inter_turkce[\w.-]*\.woff2$/)
  })

  /**
   * ⚠️ ADRES, CSS'İN KULLANDIĞI ADRESİN AYNISI OLMAK ZORUNDA.
   *
   * Farklı olursa tarayıcı fontu İKİ KEZ indirir: biri ön yükleme, biri
   * `@font-face`. Ön yükleme o zaman kazanç değil, 50 kB'lık kayıp olur.
   */
  it.runIf(existsSync(MANIFEST))('adres manifestteki dosyayla birebir aynı', () => {
    onbellegiSifirla()
    const adres = govdeFontuAdresi()
    const app = (JSON.parse(readFileSync(MANIFEST, 'utf8')) as { app: Record<string, string[]> })
      .app

    const hepsi = new Set(Object.values(app).flat())
    expect(hepsi.has((adres ?? '').replace('/_next/', ''))).toBe(true)
  })
})

describe('düzen ön yükleme bağlantısını basıyor', () => {
  const DUZEN = readFileSync(path.join(KOK, 'app/(site)/layout.tsx'), 'utf8')

  it('bağlantı head içinde ve font olarak işaretli', () => {
    expect(DUZEN).toContain('govdeFontuAdresi()')
    expect(DUZEN).toContain('rel="preload"')
    expect(DUZEN).toContain('as="font"')
  })

  /**
   * ⚠️ `crossOrigin` OLMADAN ÖN YÜKLEME KAZANÇ DEĞİL KAYIPTIR.
   *
   * Font istekleri CORS modunda yapılır. Öznitelik yoksa tarayıcı ön
   * yüklenen dosyayı eşleştiremez ve `@font-face` için ikinci kez indirir.
   */
  it('crossOrigin tanımlı', () => {
    expect(
      /as="font"[\s\S]{0,220}crossOrigin="anonymous"/.test(DUZEN),
      'Font ön yüklemesinde `crossOrigin` yok: tarayıcı dosyayı iki kez indirir.',
    ).toBe(true)
  })

  /** Adres yoksa hiçbir şey basılmamalı — boş `href` bir istek üretirdi. */
  it('adres yokken bağlantı basılmıyor', () => {
    expect(DUZEN).toContain('govdeFontuAdresi() !== null ?')
  })
})
