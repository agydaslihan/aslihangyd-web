import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ HARİTA ÜRETİMDE TAMAMEN KIRIKTI VE DÖRT KAPI DA YEŞİLDİ.
 *
 * `pnpm typecheck && lint && test && build` temiz geçiyordu. Kırılan şey
 * tipte ya da davranışta değil, PAKETLEMEDEYDİ:
 *
 * MapLibre GL JS v6 worker'ını ayrı bir dosyadan yükler ve adresini
 * `import.meta.url`den türetir:
 *
 *     function di() {
 *       let e = import.meta.url
 *       if (!/^https?:/.test(e)) return ''
 *       return new URL('./maplibre-gl-worker.mjs', e).href
 *     }
 *
 * Turbopack oraya bir dosya yolu koyuyor — derlenmiş çıktıdan birebir:
 *
 *     ck = { get url() { return `file://${…/maplibre-gl.mjs}` } }
 *
 * `file://…` testi geçmiyor → adres boş dizge → `new Worker('')` → boş
 * adres belgenin adresine çözülüyor → tarayıcı worker olarak `/harita`
 * SAYFASINI istiyor → HTML geliyor → "non-JavaScript MIME type of
 * text/html". Worker başlamıyor, harita hiçbir şey çizmiyor.
 *
 * BU DOSYA SÖZLEŞMEYİ KORUR, ARIZAYI DEĞİL. Arızanın kendisini ancak
 * derlenmiş çıktı ve çalışan sunucu gösterebilir; onu
 * `scripts/harita-worker-duman.mjs` ölçüyor ve CI'da koşuyor. Buradaki
 * denetimler o duman testinin varsayımlarını ayakta tutuyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

const KOK = path.resolve(path.join(import.meta.dirname, '..', '..', '..'))
const oku = (yol: string) => readFileSync(path.join(KOK, yol), 'utf8')

const maplibreSurumu = (): string =>
  JSON.parse(oku('node_modules/maplibre-gl/package.json')).version

describe('MapLibre worker adresi', () => {
  const bilesen = oku('src/components/harita/Harita3B.tsx')

  it('worker adresi elle veriliyor', () => {
    expect(bilesen).toContain('setWorkerUrl(')
    expect(bilesen).toContain('/maplibre-gl-worker.mjs')
  })

  /**
   * ⚠️ Sürüm ELLE YAZILMAMALI. Yazılsaydı bir `pnpm update` sonrası adres
   * sessizce 404'e düşerdi: harita yine boş kalır, hata mesajı yine
   * anlaşılmaz olurdu.
   */
  it('sürüm kütüphanenin kendisinden geliyor', () => {
    expect(bilesen).toContain('getVersion()')
    expect(bilesen).toMatch(/setWorkerUrl\(`\/maplibre\/\$\{getVersion\(\)\}\//)
  })

  /**
   * ⚠️ Modül düzeyinde olmalı — harita kurulmadan önce çalışsın.
   * `useEffect` içine alınsaydı ilk haritada geç kalabilirdi.
   */
  it('çağrı bileşen gövdesinde değil modül düzeyinde', () => {
    const satir = bilesen.split('\n').findIndex((s) => s.startsWith('setWorkerUrl('))
    const bilesenBasi = bilesen.split('\n').findIndex((s) => s.includes('export function Harita3B'))
    expect(satir).toBeGreaterThan(-1)
    expect(satir).toBeLessThan(bilesenBasi)
  })
})

describe('worker dosyalarının hazırlanması', () => {
  /**
   * ⚠️ Kopyalama derleme adımına BAĞLI olmalı. `prebuild` kancasına
   * bırakılsaydı sessizce atlanabilirdi: pnpm ön/son betikleri varsayılan
   * olarak çalıştırmıyor ve eksikliği ancak üretimde görünürdü.
   */
  it('kopyalama betiği build ve dev komutlarına bağlı', () => {
    const paket = JSON.parse(oku('package.json'))
    expect(paket.scripts.build).toContain('maplibre-worker-hazirla')
    expect(paket.scripts.dev).toContain('maplibre-worker-hazirla')
  })

  it('kopyalar depoya girmiyor', () => {
    expect(oku('.gitignore')).toContain('/public/maplibre/')
  })

  /**
   * ⚠️ İKİ DOSYA BİRDEN gerekiyor.
   *
   * Turbopack'in `.next/static/media/` altına attığı kopya tam olarak
   * burada kırılıyor: worker orada ama ilk satırındaki
   * `import "./maplibre-gl-shared.mjs"` yanında bir dosya bulamıyor.
   */
  it('worker göreli içe aktarımı yanındaki dosyaya düşüyor', () => {
    const surum = maplibreSurumu()
    const dizin = path.join(KOK, 'public', 'maplibre', surum)
    const worker = path.join(dizin, 'maplibre-gl-worker.mjs')

    // Kopya yoksa test atlanmıyor, ipucu veriliyor: `pnpm build` üretir.
    expect(existsSync(worker), `public/maplibre/${surum}/ yok — \`pnpm build\` çalıştırın`).toBe(
      true,
    )

    const govde = readFileSync(worker, 'utf8')
    const hedefler = [...govde.matchAll(/from\s*["'](\.[^"']+)["']/g)]
      .map(([, h]) => h)
      .filter((h): h is string => h !== undefined)
    expect(hedefler.length).toBeGreaterThan(0)
    for (const hedef of hedefler) {
      expect(existsSync(path.join(dizin, hedef)), `${hedef} worker'ın yanında yok`).toBe(true)
    }
  })
})

/**
 * ⚠️ GEÇİCİ ÇÖZÜMÜN GEREKÇESİ HÂLÂ GEÇERLİ Mİ?
 *
 * Bu denetim kütüphanenin kaynağına bakıyor. MapLibre bir gün worker
 * adresini başka türlü çözerse burası kırılır — ve o an geçici çözümü
 * kaldırıp kaldıramayacağımıza bakmanın tam zamanıdır. Sessizce taşınan
 * gereksiz bir yama, eksik bir yama kadar pahalıya patlar.
 */
describe('kütüphanenin varsayılan davranışı', () => {
  it('adresi hâlâ import.meta.url üzerinden kuruyor ve https değilse boş dönüyor', () => {
    const kaynak = oku('node_modules/maplibre-gl/dist/maplibre-gl.mjs')
    expect(kaynak).toContain('import.meta.url')
    expect(kaynak).toMatch(/\/\^https\?:\/\.test\([a-zA-Z_$]+\)\)return``/)
    expect(kaynak).toContain('WORKER_URL')
  })
})
