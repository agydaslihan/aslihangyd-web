import { readFileSync } from 'node:fs'
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
   * ⚠️ İKİ DOSYA BİRDEN gerekiyor — ve bu liste eksik kalabilir.
   *
   * Worker'ın ilk satırı `import "./maplibre-gl-shared.mjs"`. Yanına o
   * dosya konmazsa worker yüklenir ve ilk satırında 404 alır: harita yine
   * boş kalır. Turbopack'in `.next/static/media/` altına attığı kopya tam
   * olarak burada kırılıyor.
   *
   * ⚠️ DENETİM KOPYAYA DEĞİL KAYNAĞA BAKIYOR. Kopya `pnpm build` ürünü ve
   * CI testleri derlemeden ÖNCE koşuyor; kopyanın varlığını şart koşan bir
   * test, ilk CI koşusunda kendi kurduğu tuzağa düştü. Kaynağa bakmak hem
   * her zaman çalışıyor hem de daha erken uyarıyor: worker yarın yeni bir
   * dosyaya bağımlı olursa, kopyalama listesi eksik kaldığı ANDA görünür.
   */
  it("kopyalama listesi worker'ın bütün bağımlılıklarını kapsıyor", async () => {
    const { GEREKEN_DOSYALAR } = await import('../../../scripts/maplibre-worker-hazirla.mjs')
    const govde = oku('node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs')

    const bagimliliklar = [...govde.matchAll(/from\s*["']\.\/([^"']+)["']/g)]
      .map(([, ad]) => ad)
      .filter((ad): ad is string => ad !== undefined)

    expect(bagimliliklar.length).toBeGreaterThan(0)
    for (const ad of bagimliliklar) {
      expect(
        GEREKEN_DOSYALAR,
        `worker "${ad}" dosyasını içe aktarıyor ama kopyalama listesinde yok — ` +
          'yüklenince 404 alır ve harita boş kalır',
      ).toContain(ad)
    }
    expect(GEREKEN_DOSYALAR).toContain('maplibre-gl-worker.mjs')
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
