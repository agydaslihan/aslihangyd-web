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
  // ── Adaçayı: eylem rengi ───────────────────────────────────────────────
  {
    on: '--color-aksan-metin',
    arka: '--color-zemin',
    asgari: AA_METIN,
    nerede: '"Erişim talep et →"',
  },
  {
    on: '--color-aksan-metin',
    arka: '--color-yuzey',
    asgari: AA_METIN,
    nerede: 'kilitli kart kapanış satırı',
  },
  {
    on: '--color-aksan-metin',
    arka: '--color-yuzey-2',
    asgari: AA_METIN,
    nerede: 'tint bölümdeki adaçayı bağlantı',
  },
  {
    on: '--color-aksan-metin',
    arka: '--color-aksan-zemin',
    asgari: AA_METIN,
    nerede: 'adaçayı tint rozet',
  },
  {
    on: BEYAZ,
    arka: '--color-aksan',
    asgari: AA_METIN,
    nerede: 'dolu eylem butonu — "Evimi değerlendir"',
  },
  {
    on: BEYAZ,
    arka: '--color-aksan-koyu',
    asgari: AA_METIN,
    nerede: 'dolu eylem butonu, hover',
  },
  {
    on: '--color-aksan',
    arka: '--color-zemin',
    asgari: AA_BILESEN,
    nerede: 'dolu buton zeminin kendisi sayfadan ayrışmalı',
  },

  // ── Gold: dekoratif ────────────────────────────────────────────────────
  //
  // ⚠️ `--color-gold-cizgi` BİLİNÇLİ OLARAK BU LİSTEDE YOK.
  //
  // Açık zeminde 2,06:1 verir ve 1.4.11'in 3:1 eşiğini geçmez. Listeye
  // eklemek testi kırardı; eşiği düşürmek ise kuralı anlamsızlaştırırdı.
  // Doğru cevap üçüncüsü: gold çizgi HİÇBİR BİLGİYİ TEK BAŞINA TAŞIMAZ,
  // dolayısıyla 1.4.11 kapsamına girmez (dekoratif içerik muaf). Bu, aşağıda
  // ayrı bir testle ("gold metin rengi olarak kullanılmıyor") ve
  // disiplin.test.ts ile korunuyor.
  //
  // Anlam taşıyan gold öğe için ayrı jeton var ve o ÖLÇÜLÜYOR:
  {
    on: '--color-gold-guclu',
    arka: '--color-zemin',
    asgari: AA_BILESEN,
    nerede: 'anlam taşıyan gold ikon',
  },
  /**
   * ⚠️ Gold rozetin metni `--color-metin` DEĞİL, doğrudan antrasit.
   *
   * Gold zemin iki temada da aynı açıklıkta duruyor; koyu temada
   * `--color-metin` kırık beyaza dönüyor ve gold üzerinde 2,06:1 veriyor.
   * Yani "tema jetonu kullan" kuralının istisnası: zemin temaya göre
   * değişmiyorsa üzerindeki metin de değişmemeli. Kontrast testi yakaladı.
   */
  {
    on: '--color-notr-900',
    arka: '--color-gold-zemin',
    asgari: AA_METIN,
    nerede: 'gold dolu rozet — üzerine daima antrasit',
  },

  // ── Sabit lacivert yüzeyler (üst şerit, altbilgi) ──────────────────────
  //
  // ⚠️ BU ÇİFTLER TEMA JETONU KULLANMIYOR VE BU BİLİNÇLİ.
  //
  // Üst şerit ve altbilgi iki temada da lacivert. Zemin değişmiyorsa
  // üzerindeki metin de değişmemeli: `--color-metin` açık temada antrasite
  // dönüyor ve lacivert üzerinde okunmuyor. Aynı tuzağa gold rozetinde
  // düşülmüştü; orada da çözüm rampanın sabit basamağına bağlamaktı.
  //
  // Rampa basamakları temaya göre değişmediği için bu ölçümler iki temada
  // da aynı sonucu verir — ama listede durmaları şart: biri değişirse
  // (örn. altbilgi lacivert-800'e çekilirse) kapı kırılsın.
  {
    on: '--color-notr-50',
    arka: '--color-lacivert-900',
    asgari: AA_METIN,
    nerede: 'altbilgi başlıkları ve üst şerit metni',
  },
  {
    on: '--color-notr-300',
    arka: '--color-lacivert-900',
    asgari: AA_METIN,
    nerede: 'altbilgi bağlantıları',
  },
  {
    on: '--color-notr-400',
    arka: '--color-lacivert-900',
    asgari: AA_METIN,
    nerede: 'altbilgi künyesi, feragat metni, adres',
  },
  {
    on: '--color-gold-400',
    arka: '--color-lacivert-900',
    asgari: AA_BILESEN,
    nerede: 'altbilgi üst çizgisi ve logo aksanı',
  },
  {
    on: '--color-adacayi-300',
    arka: '--color-lacivert-900',
    asgari: AA_METIN,
    nerede: 'lacivert bölümlerdeki eyebrow etiketi (hero, gizli portföy)',
  },
  {
    on: '--color-lacivert-700',
    arka: '--color-lacivert-900',
    asgari: 1.5,
    nerede: 'altbilgi künye ayracı — yalnızca görünür olmalı, bilgi taşımaz',
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
  /**
   * ⚠️ TABAN RENKLER PAZARLIĞA KAPALI.
   *
   * Bu altı değer `docs/FRONTEND-YENIDEN-TASARIM.md` §1'de Aslıhan
   * tarafından verildi. Rampanın geri kalanı türetilmiştir ama BU
   * basamaklar birebir korunur — türetme algoritması değişse bile paletin
   * kimliği değişmemeli.
   */
  it('dokümandaki taban renkler birebir korunur', () => {
    const taban: Record<string, string> = {
      '--color-lacivert-900': '#0f2747', // lacivert
      '--color-adacayi-600': '#4f7c6a', // adaçayı
      '--color-notr-50': '#f7f6f2', // kırık beyaz
      '--color-notr-100': '#e9eceb', // açık gri
      '--color-gold-400': '#c9a96e', // soft gold
      '--color-notr-900': '#20252b', // antrasit
    }

    for (const [ad, deger] of Object.entries(taban)) {
      expect(jeton(temalar.acik, ad), ad).toBe(deger)
      // Rampa temaya göre değişmez — anlamsal jetonlar değişir.
      expect(jeton(temalar.koyu, ad), `${ad} (koyu)`).toBe(deger)
    }
  })

  it('her rampa on basamaklı ve eksiksiz', () => {
    const basamaklar = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]
    for (const rampa of ['lacivert', 'adacayi', 'gold', 'notr']) {
      for (const basamak of basamaklar) {
        const ad = `--color-${rampa}-${basamak}`
        expect(() => jeton(temalar.acik, ad), ad).not.toThrow()
      }
    }
  })

  /**
   * ⚠️ Rampa monoton olmalı: her basamak bir öncekinden koyu.
   *
   * Bir basamağın sırayı bozması gözle fark edilmez ama "bir ton açığını
   * al" demek anlamsızlaşır ve türetilmiş her jeton şüpheli hale gelir.
   */
  it('rampalar açıktan koyuya monoton', () => {
    const basamaklar = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]
    for (const rampa of ['lacivert', 'adacayi', 'gold', 'notr']) {
      let oncekiParlaklik = Number.POSITIVE_INFINITY
      for (const basamak of basamaklar) {
        const ad = `--color-${rampa}-${basamak}`
        const p = bagilParlaklik(jeton(temalar.acik, ad))
        expect(p, `${ad} kendinden önceki basamaktan açık`).toBeLessThan(oncekiParlaklik)
        oncekiParlaklik = p
      }
    }
  })

  /**
   * ⚠️ BAKIR TAMAMEN GİTTİ — geri sızmasın.
   *
   * Yeniden tasarım bir iyileştirme değil yön değişikliğiydi. Eski rampanın
   * tek bir jetonu kalsaydı, sonraki bir bileşende "elimde vardı" diye
   * kullanılır ve iki palet yan yana yaşamaya başlardı.
   */
  it('bakır rampasından hiçbir jeton kalmadı', () => {
    for (const harita of [temalar.acik, temalar.koyu]) {
      const bakir = [...harita.keys()].filter((ad) => ad.includes('bakir'))
      expect(bakir, 'bakır jetonları kaldırılmalıydı').toEqual([])
    }
  })

  /**
   * ⚠️ GOLD ASLA METİN RENGİ DEĞİL — dokümanın en net kuralı.
   *
   * Ölçüm: gold-400 kırık beyaz üzerinde 2,06:1. Bu bir "zayıf kontrast"
   * değil, ağır ihlal. Test rengin metin rolü taşıyan bir jetona
   * bağlanmadığını denetliyor; kullanım tarafını disiplin.test.ts kovuyor.
   */
  it('gold hiçbir metin jetonuna bağlı değil', () => {
    const metinJetonlari = [
      '--color-metin',
      '--color-metin-2',
      '--color-metin-3',
      '--color-vurgu',
      '--color-aksan-metin',
    ]

    for (const [temaAdi, harita] of [
      ['açık', temalar.acik],
      ['koyu', temalar.koyu],
    ] as const) {
      const goldDegerleri = new Set(
        [...harita.entries()]
          .filter(([ad]) => /^--color-gold-\d+$/.test(ad))
          .map(([, deger]) => deger),
      )

      for (const ad of metinJetonlari) {
        expect(goldDegerleri.has(jeton(harita, ad)), `${ad} (${temaAdi}) gold'a bağlanmış`).toBe(
          false,
        )
      }
    }
  })

  /**
   * ⚠️ Adaçayının DOLU ZEMİN değeri metin jetonu olarak kullanılamaz.
   *
   * Kırık beyaz üzerinde 4,38:1 — AA'nın altında. Doküman bunu açıkça
   * yazıyor ve koyulaştırılmış bir varyant istiyor; bu test ikisinin
   * karışmadığını güvenceye alıyor.
   */
  it('adaçayı dolu zemin değeri metin rengi olarak kullanılmıyor', () => {
    const doluZemin = jeton(temalar.acik, '--color-aksan')
    expect(jeton(temalar.acik, '--color-aksan-metin')).not.toBe(doluZemin)

    // Ve koyulaştırılmış varyant gerçekten AA'yı geçmeli.
    const oran = kontrastOrani(
      jeton(temalar.acik, '--color-aksan-metin'),
      jeton(temalar.acik, '--color-zemin'),
    )
    expect(
      oraniYuvarla(oran),
      'adaçayı metin varyantı kırık beyaz üzerinde',
    ).toBeGreaterThanOrEqual(AA_METIN)

    // Dolu zemin değeri ise METİN olarak AA'yı geçmiyor olmalı —
    // ayrı bir jeton gerekmesinin sebebi tam olarak bu.
    const doluOran = kontrastOrani(doluZemin, jeton(temalar.acik, '--color-zemin'))
    expect(oraniYuvarla(doluOran), 'dolu zemin metin olarak AA geçmemeli').toBeLessThan(AA_METIN)
  })
})
