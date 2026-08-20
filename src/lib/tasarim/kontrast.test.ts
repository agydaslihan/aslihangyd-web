import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  AA_BILESEN,
  AA_BUYUK_METIN,
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
    arka: '--color-bant-zemin',
    asgari: AA_METIN,
    nerede: 'pudra bant metni',
  },
  {
    on: '--color-metin-3',
    arka: '--color-bant-zemin',
    asgari: AA_METIN,
    nerede: 'pudra bantta yardımcı metin',
  },
  {
    on: '--color-vurgu',
    arka: '--color-bant-zemin',
    asgari: AA_METIN,
    nerede: 'pudra bantta terracotta başlık',
  },
  {
    on: '--color-aksan-metin',
    arka: '--color-bant-zemin',
    asgari: AA_METIN,
    nerede: 'hero eyebrow — pudra gülü zeminde',
  },
  /**
   * ⚠️ DOLU ALTIN BANDIN ÜZERİ BEYAZ DEĞİL MÜREKKEP — ÖLÇÜM DEĞİŞTİRDİ.
   *
   * Önceki palette bu bant terracotta'ydı ve üzerine beyaz yazılıyordu
   * (4,99:1). Altın üzerinde beyaz 2,36:1 — ağır ihlal; mürekkep 7,20:1.
   * Renk değişince bandın metni de değişmek zorundaydı; bu çift o kararı
   * ölçüye bağlıyor.
   */
  {
    on: '--color-vurgu-uzeri',
    arka: '--color-dolu-vurgu',
    asgari: AA_METIN,
    nerede: 'DOLU altın bant — üzerine daima mürekkep',
  },
  /**
   * ⚠️ Bu çift TERS YÖNÜ DE kapsıyor: `acikBant` butonu beyaz zemin üzerine
   * `koyu-bant` metin kullanıyor. WCAG kontrast oranı simetriktir
   * (L1/L2 sıralaması sabit), yani ayrı bir çift eklemek aynı sayıyı ikinci
   * kez ölçmek olurdu.
   */
  {
    on: BEYAZ,
    arka: '--color-koyu-bant',
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
    on: '--color-koyu-bant-vurgu',
    arka: '--color-koyu-bant',
    asgari: AA_METIN,
    nerede: 'mürekkep bantta altın eyebrow',
  },

  /**
   * ⚠️ SINIRI ARTIK DOLGU DEĞİL KENARLIK TAŞIYOR.
   *
   * Altın dolgu sayfadan yalnızca 2,28:1 ayrışıyor ve WCAG 1.4.11 bileşen
   * sınırı için 3:1 istiyor. Şartnamenin istediği rengi bu yüzden
   * bırakmak yerine butona kenarlık kondu (`--color-aksan-kenar`, 4,21:1).
   * Marka panelinden başka bir renk seçilirse kenarlık dolgudan
   * TÜRETİLİYOR — gerekçe `lib/marka/ctaKenari.ts`.
   */
  {
    on: '--color-aksan-kenar',
    arka: '--color-zemin',
    asgari: AA_BILESEN,
    nerede: 'dolu buton sınırı sayfadan ayrışmalı',
  },

  /**
   * ⚠️ BU ÇİFT BİR HATADAN DOĞDU.
   *
   * `text-vurgu-uzeri` sınıfı AI arama düğmesinde kullanılıyordu ama
   * `--color-vurgu-uzeri` jetonu HİÇ TANIMLI DEĞİLDİ. Tailwind tanımsız
   * yardımcıyı sessizce atıyor: metin `--color-metin`de kalıyor, yani
   * terracotta zeminin üstünde koyu kahve — ~2,4:1. AI arama varsayılan
   * KAPALI olduğu için hata üretimde hiç göze görünmedi.
   *
   * Jeton eklendi ve ölçüsü buraya bağlandı: jeton eklemenin bedeli,
   * ölçülmeyi kabul etmektir.
   */
  /**
   * ⚠️ "DOLU VURGU BUTONU" ÇİFTİ KALDIRILDI — ÇÜNKÜ ARTIK ÖYLE BİR BUTON YOK.
   *
   * AI arama düğmesi `bg-vurgu` kullanıyordu: metin jetonunu dolu zemin
   * olarak. Aurora'da `vurgu` gold-700, yani koyu bir kahve; üzerindeki
   * mürekkep metin 2,81:1 veriyordu. Düğme mürekkep butona çevrildi
   * (16,46:1) ve `vurgu-uzeri` yalnızca dolu altın bantta kaldı.
   *
   * Ölçülmeyen bir çift bırakmıyoruz: o kombinasyon artık sitede yok.
   */

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
  // (örn. altbilgi notr-800'e çekilirse) kapı kırılsın.
  {
    on: '--color-notr-50',
    arka: '--color-notr-900',
    asgari: AA_METIN,
    nerede: 'altbilgi başlıkları ve üst şerit metni',
  },
  {
    on: '--color-notr-300',
    arka: '--color-notr-900',
    asgari: AA_METIN,
    nerede: 'altbilgi bağlantıları',
  },
  {
    on: '--color-notr-400',
    arka: '--color-notr-900',
    asgari: AA_METIN,
    nerede: 'altbilgi künyesi, feragat metni, adres',
  },
  {
    on: '--color-gold-400',
    arka: '--color-notr-900',
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
    arka: '--color-notr-900',
    asgari: AA_METIN,
    nerede: 'altbilgi uyarı metni — "yetki belgesi girilmedi"',
  },
  {
    on: '--color-gold-300',
    arka: '--color-notr-900',
    asgari: AA_METIN,
    nerede: 'koyu kakao bölümlerdeki eyebrow etiketi (hero, gizli portföy)',
  },
  {
    on: '--color-notr-700',
    arka: '--color-notr-900',
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
        --color-notr-700: #1d4270;
        --color-notr-300: #a3bfd9;
        --color-vurgu: var(--color-notr-700);
      }
      :root[data-tema='koyu'] {
        @theme {
          --color-vurgu: var(--color-notr-300);
        }
      }
    `)
    expect(acik.get('--color-vurgu')).toBe('#1d4270')
    expect(koyu.get('--color-vurgu')).toBe('#a3bfd9')
    expect(koyu.get('--color-notr-700')).toBe('#1d4270')
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
const RAMPALAR = ['gold', 'notr'] as const

describe('palet bütünlüğü', () => {
  /**
   * ⚠️ TABAN RENKLER PAZARLIĞA KAPALI.
   *
   * Bu beş değer Aurora Luxury şartnamesinde (§2) verildi. Rampaların
   * geri kalanı türetilmiştir ama BU basamaklar birebir korunur — türetme
   * algoritması değişse bile paletin kimliği değişmemeli.
   *
   * ⚠️ Şartnamedeki "kartlar #FFFFFF" bir rampa basamağı değil, anlamsal
   * jeton (`--color-yuzey`) ve aşağıda ayrıca ölçülüyor.
   */
  it('dokümandaki taban renkler birebir korunur', () => {
    const taban: Record<string, string> = {
      '--color-notr-50': '#fcfbf8', // arka plan — ANA ZEMİN
      '--color-notr-100': '#f5f0e8', // sıcak bej
      '--color-notr-200': '#ece7df', // kenarlıklar
      '--color-notr-900': '#1c1c1c', // ana metin — MÜREKKEP
      '--color-gold-400': '#c7a36b', // altın
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
   * ⚠️ ALTININ AÇIK BASAMAKLARI METİN OLAMAZ — KURAL DEĞİŞTİ, EŞİK DEĞİL.
   *
   * Önceki palette kural mutlaktı: "gold asla metin rengi değil". Aurora'da
   * altın TEK marka rengi; bağlantı ve başlık aksanı ondan geliyor. Ama
   * ölçüm hâlâ aynı şeyi söylüyor: gold-400 açık zeminde 2,28:1.
   *
   * Kural bu yüzden basamağa bağlandı: AÇIK temada metin jetonları
   * yalnızca 600 ve daha koyu basamaklara bağlanabilir. Koyu temada tam
   * tersi — orada zemin mürekkep, metin açık basamaklardan gelir.
   */
  it('altın metin jetonları yalnızca doğru uçtaki basamaklara bağlı', () => {
    const metinJetonlari = [
      '--color-metin',
      '--color-metin-2',
      '--color-metin-3',
      '--color-vurgu',
      '--color-aksan-metin',
    ]

    const basamak = (harita: typeof temalar.acik, deger: string): number | null => {
      for (const [ad, d] of harita.entries()) {
        const eslesme = /^--color-gold-(\d+)$/.exec(ad)
        if (eslesme && d === deger) return Number(eslesme[1])
      }
      return null
    }

    for (const ad of metinJetonlari) {
      const acik = basamak(temalar.acik, jeton(temalar.acik, ad))
      if (acik !== null) {
        expect(acik, `${ad} (açık) altının açık ucuna bağlanmış`).toBeGreaterThanOrEqual(600)
      }

      const koyu = basamak(temalar.koyu, jeton(temalar.koyu, ad))
      if (koyu !== null) {
        expect(koyu, `${ad} (koyu) altının koyu ucuna bağlanmış`).toBeLessThanOrEqual(400)
      }
    }
  })

  /**
   * ⚠️ DOLU EYLEM ZEMİNİ METİN JETONU OLAMAZ.
   *
   * `--color-aksan` (gold-400) açık zeminde 2,28:1 — metin olarak
   * görünmez. Bu test dolu zemin ile metin varyantının karışmadığını ve
   * metin varyantının paletin ÜÇ açık yüzeyinde de AA'yı geçtiğini
   * güvenceye alıyor. Üçüncü yüzey (sıcak bej) şartnamenin önerdiği
   * #8A6B2E'yi eleyen ölçümün ta kendisi: orada 4,38 veriyordu.
   */
  it('dolu altın zemin değeri metin rengi olarak kullanılmıyor', () => {
    const doluZemin = jeton(temalar.acik, '--color-aksan')
    expect(jeton(temalar.acik, '--color-aksan-metin')).not.toBe(doluZemin)

    for (const zemin of ['--color-zemin', '--color-yuzey', '--color-yuzey-2']) {
      const oran = kontrastOrani(
        jeton(temalar.acik, '--color-aksan-metin'),
        jeton(temalar.acik, zemin),
      )
      expect(oraniYuvarla(oran), `aksan-metin / ${zemin}`).toBeGreaterThanOrEqual(AA_METIN)
    }

    // Dolu zemin metin olarak kullanılsaydı geçmezdi — ayrı jetonun sebebi.
    const doluOran = kontrastOrani(doluZemin, jeton(temalar.acik, '--color-zemin'))
    expect(
      oraniYuvarla(doluOran),
      'dolu altın zemin, sayfa zemininde metin olarak AA geçmemeli',
    ).toBeLessThan(AA_METIN)
  })

  /**
   * ⚠️ BAŞLIK VARYANTI BÜYÜK METİN EŞİĞİNİ GEÇİYOR, NORMALİNİ GEÇMİYOR.
   *
   * `--color-vurgu-baslik` yalnızca ≥24px başlıklarda kullanılıyor ve
   * eşiği 3:1. Şartnamenin önerdiği #A8854A da geçiyordu (bejde 3,02) ama
   * payı 0,02'ydi; bir basamak koyusu 3,84 veriyor. Test ikisini birden
   * bağlıyor: eşiği geçmeli, ama normal metin eşiğini geçmediği için
   * gövde metninde kullanılamayacağı da ölçülü kalmalı.
   */
  it('altın başlık varyantı büyük metin eşiğini geçiyor', () => {
    for (const zemin of ['--color-zemin', '--color-yuzey', '--color-yuzey-2']) {
      const oran = kontrastOrani(
        jeton(temalar.acik, '--color-vurgu-baslik'),
        jeton(temalar.acik, zemin),
      )
      expect(oraniYuvarla(oran), `vurgu-baslik / ${zemin}`).toBeGreaterThanOrEqual(AA_BUYUK_METIN)
    }
  })

  /**
   * ⚠️ BEJ VE ALTIN TİNTLER ASLA METİN DEĞİL.
   *
   * İkisi de zemin rengi; açık temada bir metin jetonuna bağlanmaları
   * 1,09 ve 1,19 verirdi — "zayıf kontrast" değil, görünmezlik.
   *
   * ⚠️ KOYU TEMA BİLİNÇLİ OLARAK DIŞARIDA. Orada rol tersine dönüyor:
   * açık temanın zemini koyu temanın metni oluyor. Kural "bu renk metin
   * olamaz" değil, "AÇIK zeminde metin olamaz".
   */
  it('bej ve altın tint açık temada hiçbir metin jetonuna bağlı değil', () => {
    const metinJetonlari = [
      '--color-metin',
      '--color-metin-2',
      '--color-metin-3',
      '--color-vurgu',
      '--color-aksan-metin',
    ]

    const zeminDegerleri = new Set([
      jeton(temalar.acik, '--color-notr-100'),
      jeton(temalar.acik, '--color-gold-50'),
      jeton(temalar.acik, '--color-gold-100'),
      jeton(temalar.acik, '--color-gold-200'),
    ])

    for (const ad of metinJetonlari) {
      expect(zeminDegerleri.has(jeton(temalar.acik, ad)), `${ad} zemin rengine bağlanmış`).toBe(
        false,
      )
    }
  })
})
