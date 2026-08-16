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
  { on: '--color-vurgu', arka: '--color-zemin', asgari: AA_METIN, nerede: 'terracotta bağlantı' },
  { on: '--color-vurgu', arka: '--color-yuzey', asgari: AA_METIN, nerede: 'kart içi bağlantı' },
  /**
   * ⚠️ Yeni palette KREM gerçek bir metin zemini: bölüm ayrımları ve kart
   * zeminleri onun üzerinde duruyor. Eski palette bu çift listede yoktu —
   * vurgu lacivertti ve her zeminde bol bol geçiyordu. Terracotta ile pay
   * daraldı; ölçülmeyen bir çift bırakılamaz.
   */
  {
    on: '--color-vurgu',
    arka: '--color-yuzey-2',
    asgari: AA_METIN,
    nerede: 'krem bölümdeki terracotta başlık aksanı',
  },
  {
    on: '--color-vurgu',
    arka: '--color-vurgu-zemin',
    asgari: AA_METIN,
    nerede: 'doğrulanmış ilan rozeti',
  },
  /**
   * ⚠️ PUDRA GÜLÜ ZEMİNİN ÜZERİ — paletin en dar yeri.
   *
   * Terracotta'nın rampa değeri (600) burada 3,37:1 veriyor, AA'yı
   * geçmiyor. `--color-vurgu` koyulaştırılmış varyant olduğu için 4,88'e
   * çıkıyor. Bu çiftler o koyulaştırmanın gerekçesidir; kaldırılırsa
   * gerekçe de kaybolur.
   */
  {
    on: '--color-metin',
    arka: '--color-pudra-zemin',
    asgari: AA_METIN,
    nerede: 'pudra bant metni',
  },
  {
    on: '--color-metin-3',
    arka: '--color-pudra-zemin',
    asgari: AA_METIN,
    nerede: 'pudra bantta yardımcı metin',
  },
  {
    on: '--color-vurgu',
    arka: '--color-pudra-zemin',
    asgari: AA_METIN,
    nerede: 'pudra bantta terracotta başlık',
  },
  {
    on: '--color-aksan-metin',
    arka: '--color-pudra-zemin',
    asgari: AA_METIN,
    nerede: 'hero eyebrow — pudra gülü zeminde',
  },
  {
    on: BEYAZ,
    arka: '--color-terracotta-yuzey',
    asgari: AA_METIN,
    nerede: 'DOLU terracotta bant — üzerine daima beyaz',
  },
  /**
   * ⚠️ Bu çift TERS YÖNÜ DE kapsıyor: `acikBant` butonu beyaz zemin üzerine
   * `kakao-yuzey` metin kullanıyor. WCAG kontrast oranı simetriktir
   * (L1/L2 sıralaması sabit), yani ayrı bir çift eklemek aynı sayıyı ikinci
   * kez ölçmek olurdu.
   */
  {
    on: BEYAZ,
    arka: '--color-kakao-yuzey',
    asgari: AA_METIN,
    nerede: 'WhatsApp butonu, şerit, hero açık bant butonu (ters yön)',
  },
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
  /**
   * ⚠️ ÖN PLAN ARTIK `BEYAZ` DEĞİL, JETON.
   *
   * Eskiden buton metni her iki temada beyazdı ve test de öyle ölçüyordu.
   * Yeni koyu temada bu kırıldı: adaçayı-600 kakao zeminden yalnızca
   * 2,79:1 ayrışıyor (1.4.11 için 3:1 gerek). Zemin açılınca beyaz metin
   * 2,67'ye düştü. Çözüm ikisini birden jetonlaştırmak; aşağıdaki "dolu
   * buton zeminin kendisi" çifti ayrışmayı ayrıca ölçüyor.
   */
  {
    on: '--color-aksan-uzeri',
    arka: '--color-aksan',
    asgari: AA_METIN,
    nerede: 'dolu eylem butonu — "Evimi değerlendir"',
  },
  {
    on: '--color-aksan-uzeri',
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
    on: '--color-kakao-900',
    arka: '--color-gold-zemin',
    asgari: AA_METIN,
    nerede: 'gold dolu rozet — üzerine daima koyu kakao',
  },

  // ── Sabit koyu kakao yüzeyler (üst şerit, altbilgi) ───────────────────
  //
  // ⚠️ BU ÇİFTLER TEMA JETONU KULLANMIYOR VE BU BİLİNÇLİ.
  //
  // Üst şerit ve altbilgi iki temada da koyu kakao. Zemin değişmiyorsa
  // üzerindeki metin de değişmemeli: `--color-metin` açık temada kakaoya
  // dönüyor ve kendi üzerinde okunmuyor. Aynı tuzağa gold rozetinde
  // düşülmüştü; orada da çözüm rampanın sabit basamağına bağlamaktı.
  //
  // Rampa basamakları temaya göre değişmediği için bu ölçümler iki temada
  // da aynı sonucu verir — ama listede durmaları şart: biri değişirse
  // (örn. altbilgi kakao-800'e çekilirse) kapı kırılsın.
  {
    on: '--color-notr-50',
    arka: '--color-kakao-900',
    asgari: AA_METIN,
    nerede: 'altbilgi başlıkları ve üst şerit metni',
  },
  {
    on: '--color-notr-300',
    arka: '--color-kakao-900',
    asgari: AA_METIN,
    nerede: 'altbilgi bağlantıları',
  },
  {
    on: '--color-notr-400',
    arka: '--color-kakao-900',
    asgari: AA_METIN,
    nerede: 'altbilgi künyesi, feragat metni, adres',
  },
  {
    on: '--color-gold-400',
    arka: '--color-kakao-900',
    asgari: AA_BILESEN,
    nerede: 'altbilgi üst çizgisi ve logo aksanı',
  },
  /**
   * ⚠️ LIGHTHOUSE'UN BULDUĞU, BU LİSTENİN KAÇIRDIĞI ÇİFT.
   *
   * Altbilgideki "yetki belgesi girilmedi" uyarısı `uyari-metin`
   * kullanıyordu ve koyu bant üzerinde 2,01:1 veriyordu. Bu test onu
   * göremedi çünkü çift LİSTEDE YOKTU — jeton doğru ölçülüyordu, yanlış
   * yerde kullanılıyordu.
   *
   * Ders listenin kendisiyle ilgili: bir jetonun ölçülmüş olması, her
   * zemin üzerinde ölçülmüş olduğu anlamına gelmiyor. Sabit koyu bant
   * üzerinde geçen her renk buraya yazılmalı.
   */
  {
    on: '--color-uyari-koyu-bant',
    arka: '--color-kakao-900',
    asgari: AA_METIN,
    nerede: 'altbilgi uyarı metni — "yetki belgesi girilmedi"',
  },
  {
    on: '--color-adacayi-300',
    arka: '--color-kakao-900',
    asgari: AA_METIN,
    nerede: 'koyu kakao bölümlerdeki eyebrow etiketi (hero, gizli portföy)',
  },
  {
    on: '--color-kakao-700',
    arka: '--color-kakao-900',
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
        --color-kakao-700: #1d4270;
        --color-kakao-300: #a3bfd9;
        --color-vurgu: var(--color-kakao-700);
      }
      :root[data-tema='koyu'] {
        @theme {
          --color-vurgu: var(--color-kakao-300);
        }
      }
    `)
    expect(acik.get('--color-vurgu')).toBe('#1d4270')
    expect(koyu.get('--color-vurgu')).toBe('#a3bfd9')
    expect(koyu.get('--color-kakao-700')).toBe('#1d4270')
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

/** Sistemdeki bütün rampalar — eksiksizlik ve monotonluk burada sınanıyor. */
const RAMPALAR = ['kakao', 'terracotta', 'adacayi', 'gold', 'notr'] as const

describe('palet bütünlüğü', () => {
  /**
   * ⚠️ TABAN RENKLER PAZARLIĞA KAPALI.
   *
   * Bu yedi değer 15 Ağustos 2026'da Aslıhan tarafından verildi (bohem /
   * pudra paleti). Rampaların geri kalanı türetilmiştir ama BU basamaklar
   * birebir korunur — türetme algoritması değişse bile paletin kimliği
   * değişmemeli.
   *
   * ⚠️ Terracotta rampası İKİ çapa taşıyor (200 ve 600) ve ikisi de
   * burada. Tek çapadan türetseydik pudra gülü #E4C3B9 çıkıyordu; yakın
   * ama verilen renk değil.
   */
  it('dokümandaki taban renkler birebir korunur', () => {
    const taban: Record<string, string> = {
      '--color-notr-50': '#fbfaf7', // kırık beyaz — ANA ZEMİN
      '--color-notr-100': '#f2ebe3', // krem
      '--color-terracotta-200': '#e8cfc8', // pudra gülü
      '--color-terracotta-600': '#a85a42', // terracotta
      '--color-adacayi-600': '#4f7c6a', // adaçayı
      '--color-gold-400': '#c9a96e', // soft gold
      '--color-kakao-900': '#3d2b2f', // koyu kakao — METİN
    }

    for (const [ad, deger] of Object.entries(taban)) {
      expect(jeton(temalar.acik, ad), ad).toBe(deger)
      // Rampa temaya göre değişmez — anlamsal jetonlar değişir.
      expect(jeton(temalar.koyu, ad), `${ad} (koyu)`).toBe(deger)
    }
  })

  it('her rampa on basamaklı ve eksiksiz', () => {
    const basamaklar = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]
    for (const rampa of RAMPALAR) {
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
    for (const rampa of RAMPALAR) {
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
   * ⚠️ LACİVERT TAMAMEN GİTTİ — bakırla aynı gerekçe.
   *
   * Bohem palete geçiş bir iyileştirme değil yön değişikliğiydi ve bu
   * üçüncü palet. Eski rampanın tek bir jetonu kalsaydı, sonraki bir
   * bileşende "elimde vardı" diye kullanılır ve iki palet yan yana
   * yaşamaya başlardı. Renk adı da bir belge: "lacivert" adlı bir jetonun
   * kakao değeri taşıması, dosyayı okuyan herkesi yanıltırdı.
   */
  it('lacivert rampasından hiçbir jeton kalmadı', () => {
    for (const harita of [temalar.acik, temalar.koyu]) {
      const lacivert = [...harita.keys()].filter((ad) => ad.includes('lacivert'))
      expect(lacivert, 'lacivert jetonları kaldırılmalıydı').toEqual([])
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

    /**
     * ⚠️ ÖLÇÜT ZEMİNİ DEĞİŞTİ VE BU BİR GEVŞETME DEĞİL.
     *
     * Eski palette adaçayı-600 kırık beyaz (#F7F6F2) üzerinde 4,38 veriyor
     * ve AA'nın altında kalıyordu; test tam olarak bunu iddia ediyordu.
     * Yeni kırık beyaz (#FBFAF7) bir tık daha açık ve aynı yeşil orada
     * 4,54'e çıkıyor — yani eski iddia artık YANLIŞ.
     *
     * Ama ayrı jeton gerekçesi ortadan kalkmadı, yer değiştirdi: KREM
     * (yuzey-2) üzerinde adaçayı-600 hâlâ 4,01, pudra üzerinde 3,20. Krem
     * bu palette gerçek bir metin zemini — bölüm ayrımları onun üzerinde.
     * Taşınan şey ölçüt zemini; eşik değil.
     */
    const doluOran = kontrastOrani(doluZemin, jeton(temalar.acik, '--color-yuzey-2'))
    expect(
      oraniYuvarla(doluOran),
      'dolu adaçayı zemin, krem üzerinde metin olarak AA geçmemeli',
    ).toBeLessThan(AA_METIN)
  })

  /**
   * ⚠️ TERRACOTTA'NIN RAMPA DEĞERİ METİN DEĞİL.
   *
   * Aslıhan bunu önceden sordu: "terracotta metin olarak sınırda olabilir."
   * Ölçüm haklı çıkardı — kırık beyazda 4,78 ile kıl payı geçiyor ama
   * paletin kendi kullanım kuralı başlıkları KREM ve PUDRA zeminlere
   * koyuyor ve orada 4,22 / 3,37'ye düşüyor.
   *
   * Bu test iki şeyi birden bağlıyor: `--color-vurgu` rampanın 600
   * basamağı OLMAMALI, ve koyulaştırılmış hâli üç zeminde de geçmeli.
   */
  it('terracotta dolu zemin değeri metin rengi olarak kullanılmıyor', () => {
    const doluZemin = jeton(temalar.acik, '--color-terracotta-600')
    expect(jeton(temalar.acik, '--color-vurgu')).not.toBe(doluZemin)

    for (const zemin of ['--color-zemin', '--color-yuzey-2', '--color-pudra-zemin']) {
      const oran = kontrastOrani(jeton(temalar.acik, '--color-vurgu'), jeton(temalar.acik, zemin))
      expect(oraniYuvarla(oran), `vurgu / ${zemin}`).toBeGreaterThanOrEqual(AA_METIN)
    }

    // Rampa değeri pudra üzerinde AA'yı geçmiyor olmalı — ayrı jetonun sebebi.
    const doluOran = kontrastOrani(doluZemin, jeton(temalar.acik, '--color-pudra-zemin'))
    expect(
      oraniYuvarla(doluOran),
      'terracotta-600 pudra üzerinde metin olarak AA geçmemeli',
    ).toBeLessThan(AA_METIN)
  })

  /**
   * ⚠️ PUDRA GÜLÜ VE KREM ASLA METİN DEĞİL.
   *
   * Gold için yazılan kuralın aynısı. İkisi de zemin renkleri; açık temada
   * bir metin jetonuna bağlanmaları kırık beyaz üzerinde 1,41 ve 1,13
   * verirdi — "zayıf kontrast" değil, görünmezlik.
   *
   * ⚠️ KOYU TEMA BİLİNÇLİ OLARAK DIŞARIDA. Orada rol tersine dönüyor:
   * açık temanın zemini koyu temanın metni oluyor ve `--color-vurgu`
   * gerçekten pudra basamağına bağlanıyor (kakao üzerinde 8,95). Kural
   * "bu renk metin olamaz" değil, "AÇIK zeminde metin olamaz".
   */
  it('pudra ve krem açık temada hiçbir metin jetonuna bağlı değil', () => {
    const metinJetonlari = [
      '--color-metin',
      '--color-metin-2',
      '--color-metin-3',
      '--color-vurgu',
      '--color-aksan-metin',
    ]

    const zeminDegerleri = new Set([
      jeton(temalar.acik, '--color-terracotta-200'),
      jeton(temalar.acik, '--color-notr-100'),
    ])

    for (const ad of metinJetonlari) {
      expect(zeminDegerleri.has(jeton(temalar.acik, ad)), `${ad} zemin rengine bağlanmış`).toBe(
        false,
      )
    }
  })
})
