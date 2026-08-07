import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  AA_BILESEN,
  AA_METIN,
  bagilParlaklik,
  hexCoz,
  jeton,
  kontrastOrani,
  oraniYuvarla,
  temalariCoz,
  type JetonHaritasi,
} from './kontrast'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const GLOBALS_YOLU = path.resolve(dirname, '../../app/(site)/globals.css')

const css = readFileSync(GLOBALS_YOLU, 'utf8')
const temalar = temalariCoz(css)

const BEYAZ = '#ffffff'

interface Kombinasyon {
  /** Ön plan: jeton adı ya da doğrudan hex. */
  on: string
  /** Arka plan: jeton adı ya da doğrudan hex. */
  arka: string
  asgari: number
  /** Bu kombinasyonun arayüzde nerede geçtiği. */
  nerede: string
}

function renk(harita: JetonHaritasi, deger: string): string {
  return deger.startsWith('#') ? deger : jeton(harita, deger)
}

/**
 * Arayüzde gerçekten oluşan renk çiftleri.
 *
 * ⚠️ Bu liste tasarımın sözleşmesidir. Yeni bir renk kombinasyonu
 * kullanılıyorsa önce buraya eklenir. Listede olmayan bir çift, kimsenin
 * kontrastını ölçmediği bir çifttir.
 */
const KOMBINASYONLAR: readonly Kombinasyon[] = [
  // ── Gövde metni ────────────────────────────────────────────────────────
  { on: '--color-metin', arka: '--color-zemin', asgari: AA_METIN, nerede: 'sayfa gövdesi' },
  { on: '--color-metin', arka: '--color-yuzey', asgari: AA_METIN, nerede: 'kart içi metin' },
  { on: '--color-metin', arka: '--color-yuzey-2', asgari: AA_METIN, nerede: 'tint bölüm zemini' },
  { on: '--color-metin-2', arka: '--color-zemin', asgari: AA_METIN, nerede: 'ikincil paragraf' },
  { on: '--color-metin-2', arka: '--color-yuzey', asgari: AA_METIN, nerede: 'kart açıklaması' },
  { on: '--color-metin-2', arka: '--color-yuzey-2', asgari: AA_METIN, nerede: 'tint blok metni' },
  {
    on: '--color-metin-3',
    arka: '--color-zemin',
    asgari: AA_METIN,
    nerede: 'yardımcı metin, "n = 23"',
  },
  { on: '--color-metin-3', arka: '--color-yuzey', asgari: AA_METIN, nerede: 'kart alt bilgisi' },
  {
    on: '--color-metin-3',
    arka: '--color-yuzey-2',
    asgari: AA_METIN,
    nerede: 'tint yüzeydeki gözlem sayısı',
  },

  // ── Marka rolleri ──────────────────────────────────────────────────────
  { on: '--color-vurgu', arka: '--color-zemin', asgari: AA_METIN, nerede: 'lacivert bağlantı' },
  { on: '--color-vurgu', arka: '--color-yuzey', asgari: AA_METIN, nerede: 'kart içi bağlantı' },
  {
    on: '--color-vurgu',
    arka: '--color-vurgu-zemin',
    asgari: AA_METIN,
    nerede: 'doğrulanmış ilan rozeti',
  },
  { on: BEYAZ, arka: '--color-lacivert-yuzey', asgari: AA_METIN, nerede: 'WhatsApp butonu, şerit' },
  {
    on: '--color-bakir-metin',
    arka: '--color-zemin',
    asgari: AA_METIN,
    nerede: '"Erişim talep et →"',
  },
  {
    on: '--color-bakir-metin',
    arka: '--color-yuzey',
    asgari: AA_METIN,
    nerede: 'kilitli kart kapanış satırı',
  },
  {
    on: BEYAZ,
    arka: '--color-bakir-600',
    asgari: AA_METIN,
    nerede: 'birincil buton — iki eylem',
  },

  // ── Durum renkleri ─────────────────────────────────────────────────────
  { on: '--color-basari', arka: '--color-yuzey', asgari: AA_METIN, nerede: 'artış değeri' },
  { on: '--color-basari', arka: '--color-zemin', asgari: AA_METIN, nerede: 'artış değeri' },
  {
    on: '--color-basari',
    arka: '--color-basari-zemin',
    asgari: AA_METIN,
    nerede: 'başarı bildirimi',
  },
  { on: '--color-hata', arka: '--color-yuzey', asgari: AA_METIN, nerede: 'form hata metni' },
  { on: '--color-hata', arka: '--color-zemin', asgari: AA_METIN, nerede: 'azalış değeri' },
  { on: '--color-hata', arka: '--color-hata-zemin', asgari: AA_METIN, nerede: 'hata kutusu' },
  { on: '--color-uyari-metin', arka: '--color-yuzey', asgari: AA_METIN, nerede: 'uyarı metni' },
  {
    on: '--color-uyari-metin',
    arka: '--color-uyari-zemin',
    asgari: AA_METIN,
    nerede: '"yetki N gün sonra bitiyor"',
  },
  { on: '--color-bilgi', arka: '--color-yuzey', asgari: AA_METIN, nerede: 'bilgi metni' },
  { on: '--color-bilgi', arka: '--color-bilgi-zemin', asgari: AA_METIN, nerede: 'bilgi kutusu' },
  {
    on: '--color-yetki-metin',
    arka: '--color-yetki-zemin',
    asgari: AA_METIN,
    nerede: '"yetki N gün sonra bitiyor" rozeti',
  },

  // ── Metin dışı (WCAG 1.4.11) ───────────────────────────────────────────
  {
    on: '--color-kenar-giris',
    arka: '--color-yuzey',
    asgari: AA_BILESEN,
    nerede: 'form kutusu kenarlığı',
  },
  {
    on: '--color-kenar-giris',
    arka: '--color-zemin',
    asgari: AA_BILESEN,
    nerede: 'form kutusu kenarlığı',
  },
  {
    on: '--color-uyari',
    arka: '--color-uyari-zemin',
    asgari: AA_BILESEN,
    nerede: 'uyarı ikonu ve kenarlığı',
  },
  {
    on: '--color-vurgu',
    arka: '--color-yuzey',
    asgari: AA_BILESEN,
    nerede: 'odak halkası, ilerleme çubuğu',
  },
  {
    on: '--color-gosterge',
    arka: '--color-yuzey-2',
    asgari: AA_BILESEN,
    nerede: 'grafik çubuğu / oran göstergesi (tint kanal içinde)',
  },
  {
    on: '--color-gosterge',
    arka: '--color-yuzey',
    asgari: AA_BILESEN,
    nerede: 'radar grafiği çizgisi',
  },

  /**
   * ⚠️ Bilinçli olarak LİSTEDE YOK: pasif buton (notr-200 zemin + notr-400
   * metin). WCAG 1.4.3, devre dışı bileşenleri kontrast şartından muaf
   * tutar ve pasiflik burada renkle değil ALTINDAKİ SEBEP METNİYLE
   * anlatılır — bilgi kaybı olmaz.
   */
]

describe('kontrast hesabı', () => {
  it('hex biçimlerini çözer', () => {
    expect(hexCoz('#fff')).toEqual({ r: 255, g: 255, b: 255 })
    expect(hexCoz('#1A1917')).toEqual({ r: 26, g: 25, b: 23 })
  })

  it('geçersiz hex reddeder', () => {
    expect(() => hexCoz('mavi')).toThrow(TypeError)
    expect(() => hexCoz('#12345')).toThrow(TypeError)
  })

  it('siyah–beyaz oranı 21:1', () => {
    expect(oraniYuvarla(kontrastOrani('#000000', '#ffffff'))).toBe(21)
  })

  it('aynı renk 1:1', () => {
    expect(kontrastOrani('#26588f', '#26588f')).toBeCloseTo(1, 10)
  })

  it('sıra önemsiz', () => {
    expect(kontrastOrani('#000', '#fff')).toBeCloseTo(kontrastOrani('#fff', '#000'), 10)
  })

  it('bağıl parlaklık uçları doğru', () => {
    expect(bagilParlaklik('#000000')).toBeCloseTo(0, 10)
    expect(bagilParlaklik('#ffffff')).toBeCloseTo(1, 10)
  })
})

describe('jeton çözümleyici', () => {
  it('var() zincirlerini hex değerine indirger', () => {
    const { acik } = temalariCoz(`
      @theme {
        --color-notr-900: #1a1917;
        --color-metin: var(--color-notr-900);
        --color-murekkep: var(--color-metin);
      }
    `)
    expect(acik.get('--color-murekkep')).toBe('#1a1917')
  })

  it('koyu tema açık temayı geçersiz kılar, rampaya dokunmaz', () => {
    const { acik, koyu } = temalariCoz(`
      @theme {
        --color-lacivert-700: #1d4270;
        --color-lacivert-300: #a3bfd9;
        --color-vurgu: var(--color-lacivert-700);
      }
      @media (prefers-color-scheme: dark) {
        @theme {
          --color-vurgu: var(--color-lacivert-300);
        }
      }
    `)
    expect(acik.get('--color-vurgu')).toBe('#1d4270')
    expect(koyu.get('--color-vurgu')).toBe('#a3bfd9')
    expect(koyu.get('--color-lacivert-700')).toBe('#1d4270')
  })

  it('tanımsız jetona başvuru hata verir', () => {
    expect(() => temalariCoz('@theme { --color-a: var(--color-yok); }')).toThrow(/Tanımsız jetona/)
  })

  it('döngüsel referans hata verir', () => {
    expect(() =>
      temalariCoz('@theme { --color-a: var(--color-b); --color-b: var(--color-a); }'),
    ).toThrow(/döngüye/)
  })
})

/**
 * Asıl sözleşme: globals.css'teki gerçek değerler AA'yı geçiyor mu?
 *
 * Bu testler paleti değiştiren herkesi durdurur. Kırmızıya döndüğünde
 * yapılacak şey eşiği düşürmek değil, rengi düzeltmek ya da o rengi metin
 * dışı bir role taşımaktır.
 */
describe.each([
  ['açık tema', temalar.acik],
  ['koyu tema', temalar.koyu],
] as const)('%s — WCAG AA', (_ad, harita) => {
  it.each(KOMBINASYONLAR.map((k) => [`${k.on} / ${k.arka} — ${k.nerede}`, k] as const))(
    '%s',
    (_baslik, kombinasyon) => {
      const oran = kontrastOrani(renk(harita, kombinasyon.on), renk(harita, kombinasyon.arka))

      expect(
        oraniYuvarla(oran),
        `${kombinasyon.nerede}: ${oraniYuvarla(oran)}:1, gereken ${kombinasyon.asgari}:1`,
      ).toBeGreaterThanOrEqual(kombinasyon.asgari)
    },
  )
})

describe('palet bütünlüğü', () => {
  it('onaylanan lacivert rampası birebir korunur', () => {
    const beklenen: Record<string, string> = {
      '--color-lacivert-50': '#f2f7fa',
      '--color-lacivert-100': '#e4edf4',
      '--color-lacivert-200': '#cbdce9',
      '--color-lacivert-300': '#a3bfd9',
      '--color-lacivert-400': '#6e9ac6',
      '--color-lacivert-500': '#3a73ac',
      '--color-lacivert-600': '#26588f',
      '--color-lacivert-700': '#1d4270',
      '--color-lacivert-800': '#16304f',
      '--color-lacivert-900': '#0f1e33',
      '--color-lacivert-950': '#0a1524',
    }

    for (const [ad, deger] of Object.entries(beklenen)) {
      expect(jeton(temalar.acik, ad), ad).toBe(deger)
      // Rampa temaya göre değişmez — anlamsal jetonlar değişir.
      expect(jeton(temalar.koyu, ad), `${ad} (koyu)`).toBe(deger)
    }
  })

  it('onaylanan bakır rampası birebir korunur', () => {
    const beklenen: Record<string, string> = {
      '--color-bakir-100': '#f7e6d9',
      '--color-bakir-200': '#efcbb2',
      '--color-bakir-300': '#e3a981',
      '--color-bakir-400': '#d68551',
      '--color-bakir-500': '#c4682f',
      '--color-bakir-600': '#a85529',
      '--color-bakir-700': '#8a4423',
    }

    for (const [ad, deger] of Object.entries(beklenen)) {
      expect(jeton(temalar.acik, ad), ad).toBe(deger)
    }
  })

  it('onaylanan nötr rampası birebir korunur', () => {
    const beklenen: Record<string, string> = {
      '--color-notr-50': '#f8f7f3',
      '--color-notr-100': '#efede7',
      '--color-notr-200': '#e0ddd5',
      '--color-notr-300': '#c4c1b8',
      '--color-notr-400': '#9c998f',
      '--color-notr-500': '#78756d',
      '--color-notr-700': '#45433e',
      '--color-notr-900': '#1a1917',
    }

    for (const [ad, deger] of Object.entries(beklenen)) {
      expect(jeton(temalar.acik, ad), ad).toBe(deger)
    }
  })

  it('onaylanan anlamsal renkler birebir korunur', () => {
    expect(jeton(temalar.acik, '--color-basari')).toBe('#2f6b4f')
    expect(jeton(temalar.acik, '--color-uyari')).toBe('#a87a1e')
    expect(jeton(temalar.acik, '--color-hata')).toBe('#a33a32')
    expect(jeton(temalar.acik, '--color-bilgi')).toBe('#26588f')
    expect(jeton(temalar.acik, '--color-basari-zemin')).toBe('#eaf2ed')
    expect(jeton(temalar.acik, '--color-uyari-zemin')).toBe('#faf3e4')
    expect(jeton(temalar.acik, '--color-hata-zemin')).toBe('#fbedec')
    expect(jeton(temalar.acik, '--color-bilgi-zemin')).toBe('#f2f7fa')
  })
})
