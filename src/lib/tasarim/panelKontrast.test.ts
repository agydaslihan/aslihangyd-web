import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  metinRenginiOlc,
  metinRenkleriniBul,
  PANEL_METIN_ESIGI,
  panelTemalariniCoz,
  renkCoz,
} from './panelTema'

/**
 * Panel metin renklerinin kontrastı — Payload'ın YÜKLÜ temasına karşı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: SORUNUN TEKRAR ETMEMESİNİN YOLU TEK TEK DÜZELTME DEĞİL,
 * TESTİN KAPSAMI.
 *
 * 14 Eylül 2026'da sihirbazda üç soluk metin tek tek bulundu; ardından
 * aynı ton on dosyada daha, AA altı hata kırmızısı sekiz kuralda çıktı.
 * `kontrast.test.ts` yalnızca sitenin jetonlarını ölçüyordu; panelin
 * `--theme-*` renklerine bakan hiçbir şey yoktu.
 *
 * Bu dosya `src` altındaki BÜTÜN CSS'i tarıyor: `--theme-*` ya da
 * `--panel-*` jetonuna dayanan her `color` bildirimi iki temada çözülüp
 * ölçülüyor. Yeni bir panel bileşeni eklendiğinde kendiliğinden kapsama
 * giriyor — elle tutulan bir liste yok.
 *
 * ⚠️ Zemin: kural kendi zeminini tanımlıyorsa o; tanımlamıyorsa panelin
 * standart zeminlerinin (elevation-0/50/100) EN KÖTÜSÜ. Renkli bir kutu
 * içindeki metnin gerçek zemini statik olarak bilinemiyor — asıl çizilen
 * hâli `scripts/gezinme-dumani.mjs` CI'da tarayıcıda ölçüyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

const KOK = process.cwd()
const PAYLOAD_STILI = join(KOK, 'node_modules/@payloadcms/next/dist/prod/styles.css')
const PANEL_JETONLARI = join(KOK, 'src/app/(payload)/panelJetonlari.css')

const temalar = panelTemalariniCoz(
  readFileSync(PAYLOAD_STILI, 'utf-8'),
  readFileSync(PANEL_JETONLARI, 'utf-8'),
)

function cssDosyalari(dizin: string): string[] {
  return readdirSync(dizin).flatMap((ad) => {
    const yol = join(dizin, ad)
    if (statSync(yol).isDirectory()) return cssDosyalari(yol)
    return /\.(css|scss)$/.test(ad) ? [yol] : []
  })
}

const kayitlar = cssDosyalari(join(KOK, 'src')).flatMap((dosya) =>
  metinRenkleriniBul(readFileSync(dosya, 'utf-8')).map((k) => ({
    ...k,
    dosya: relative(KOK, dosya),
  })),
)

describe('panel metin renkleri — iki temada AA', () => {
  /** ⚠️ Sessizce hiçbir şey taramayan bir test de "geçer". */
  it("tarama gerçekten panel CSS'ini buluyor", () => {
    expect(kayitlar.length).toBeGreaterThan(100)
    expect(kayitlar.some((k) => k.dosya.endsWith('sihirbaz/sihirbaz.css'))).toBe(true)
    expect(kayitlar.some((k) => k.dosya.endsWith('panel/bildirimSeridi.css'))).toBe(true)
  })

  it("her metin rengi iki temada 4,5:1'i geçiyor", () => {
    const kalanlar = kayitlar.flatMap((k) =>
      metinRenginiOlc(temalar, k)
        .filter((b) => b.oran === null || b.oran < PANEL_METIN_ESIGI)
        .map(
          (b) =>
            `${k.dosya}:${k.satir} ${k.secici} → ${k.renk} ` +
            `(${b.tema === 'acik' ? 'açık' : 'koyu'}: ${b.oran === null ? 'ÇÖZÜLEMEDİ' : b.oran.toFixed(2)} / ${b.zemin})`,
        ),
    )
    expect(kalanlar).toEqual([])
  })
})

describe('kaynak: rampanın ortası metin rengi olamaz', () => {
  /**
   * ⚠️ TESTİN DUYARLILIĞI. Sorunun kaynağı olan iki ton gerçekten kırılmalı;
   * Payload rampayı değiştirip onları geçer hâle getirirse bu test haber
   * verir ve jeton seçimi yeniden düşünülür.
   */
  it('elevation-500 ve error-500 iki temadan en az birinde AA altında', () => {
    for (const renk of ['var(--theme-elevation-500)', 'var(--theme-error-500)']) {
      const oranlar = metinRenginiOlc(temalar, { renk, zemin: null }).map((b) => b.oran ?? 0)
      expect(Math.min(...oranlar), renk).toBeLessThan(PANEL_METIN_ESIGI)
    }
  })

  it('elevation-500 koyu temada EZİLMİYOR — iki temada aynı renk', () => {
    expect(renkCoz(temalar.acik, 'var(--theme-elevation-500)')).toEqual(
      renkCoz(temalar.koyu, 'var(--theme-elevation-500)'),
    )
  })

  it('panel jetonları iki temada çözülüyor ve geçiyor', () => {
    for (const renk of ['var(--panel-metin-soluk)', 'var(--panel-metin-hata)']) {
      for (const b of metinRenginiOlc(temalar, { renk, zemin: null })) {
        expect(b.oran, `${renk} ${b.tema}`).not.toBeNull()
        expect(b.oran ?? 0, `${renk} ${b.tema}`).toBeGreaterThanOrEqual(PANEL_METIN_ESIGI)
      }
    }
  })

  it('panel jetonları panel düzeninde Payload stillerinden SONRA yükleniyor', () => {
    const duzen = readFileSync(join(KOK, 'src/app/(payload)/layout.tsx'), 'utf-8')
    const payload = duzen.indexOf("import '@payloadcms/next/css'")
    const jetonlar = duzen.indexOf("import './panelJetonlari.css'")
    expect(payload).toBeGreaterThan(-1)
    expect(jetonlar).toBeGreaterThan(payload)
  })
})

describe('tarayıcı — ayrıştırma', () => {
  it('border-color ve background-color metin sayılmıyor', () => {
    const css = `.a { border-color: var(--theme-elevation-100); background-color: var(--theme-elevation-50); }`
    expect(metinRenkleriniBul(css)).toEqual([])
  })

  it('kuralın kendi zemini varsa ona göre ölçülüyor', () => {
    const [kayit] = metinRenkleriniBul(
      `.dugme {\n  color: var(--theme-elevation-0);\n  background: var(--theme-elevation-800);\n}`,
    )
    expect(kayit?.zemin).toBe('var(--theme-elevation-800)')
    expect(kayit?.satir).toBe(2)
    for (const b of metinRenginiOlc(temalar, kayit ?? { renk: '', zemin: null })) {
      expect(b.oran ?? 0).toBeGreaterThan(PANEL_METIN_ESIGI)
    }
  })

  it('yorum içindeki bildirim sayılmıyor', () => {
    expect(metinRenkleriniBul(`/* color: var(--theme-elevation-500); */ .a { top: 0 }`)).toEqual([])
  })

  it('site jetonları bu testin kapsamı dışında', () => {
    expect(metinRenkleriniBul(`.a { color: var(--renk-metin); }`)).toEqual([])
  })

  it('yedek değerli var() çözülüyor', () => {
    expect(renkCoz({}, 'var(--yok, #ffffff)')).toEqual({ r: 255, g: 255, b: 255 })
    expect(renkCoz({}, 'var(--yok)')).toBeNull()
  })
})
