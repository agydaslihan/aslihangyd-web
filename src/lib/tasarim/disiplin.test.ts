import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * Tasarım disiplini denetimi.
 *
 * Tasarım sistemi bir belge değil, bir sözleşmedir. Belge unutulur;
 * sözleşme testle bağlanır. Burada üç kural denetlenir:
 *
 *   1. Bileşenlerde ham hex yok — renk yalnızca jetondan gelir.
 *   2. 600/700 font ağırlığı yok — sakin ton kalın metinle bozulur.
 *   3. Dolu bakır zemin yalnızca iki eylemde.
 *
 * Kapsam A aşamasında bilinçli olarak dar başladı (`components/ui`) ve
 * E aşamasında tüm arayüze açıldı. Kademeli açmanın sebebi kırmızı bir
 * testle yaşamayı normalleştirmemekti: bir kez olduğunda testin uyarı
 * değeri biter.
 *
 * Aksan kuralı (3) ise ilk günden tüm koda uygulandı — kural nadirlik
 * üzerine kurulu, kademeli uygulanamaz.
 */

const dirname = path.dirname(fileURLToPath(import.meta.url))
const KOK = path.resolve(dirname, '../..')

/**
 * Tasarım diline uyarlanmış ve denetlenen alanlar.
 *
 * E aşamasında TÜM arayüz kapsama alındı. Buradan bir yol çıkarmak,
 * o klasörde ham hex ve 600 ağırlık kullanılabilir demektir — yani
 * tasarım sisteminden çıkmak.
 */
const UYARLANMIS_ALANLAR = ['components', 'app'] as const

interface Dosya {
  yol: string
  icerik: string
}

function tsxDosyalari(gorece: string): Dosya[] {
  const mutlak = path.join(KOK, gorece)
  let girdiler: string[]

  try {
    girdiler = readdirSync(mutlak, { recursive: true, encoding: 'utf8' })
  } catch {
    return []
  }

  return girdiler
    .filter((ad) => ad.endsWith('.tsx'))
    .map((ad) => ({
      yol: path.posix.join(gorece, ad.split(path.sep).join('/')),
      icerik: readFileSync(path.join(mutlak, ad), 'utf8'),
    }))
}

function tumTsx(): Dosya[] {
  return [...tsxDosyalari('components'), ...tsxDosyalari('app')]
}

const uyarlanmis = UYARLANMIS_ALANLAR.flatMap((alan) => tsxDosyalari(alan))
const hepsi = tumTsx()

/** Yorum satırlarını düşürür — kural metni kuralın kendisini tetiklemesin. */
function yorumsuz(icerik: string): string {
  return icerik.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

describe('kapsam', () => {
  it('denetlenecek dosya bulunuyor', () => {
    // Yol yanlışsa test sessizce "hiç ihlal yok" derdi.
    expect(uyarlanmis.length).toBeGreaterThan(5)
    expect(hepsi.length).toBeGreaterThan(30)
  })
})

describe('tipografi ölçeğinden sapılmıyor', () => {
  /**
   * ⚠️ NEDEN VAR: ÖLÇEK ELDE TUTULMAZSA DAĞILIR.
   *
   * Yeniden tasarımdan önce sayfalarda 64 ayrı elle yazılmış punto vardı:
   * `text-[2rem]`, `text-[1.375rem]`, `text-[0.9375rem]`… Her biri tek
   * başına makuldü ama toplamı bir ölçek değil, bir yığındı — iki sayfanın
   * "bölüm başlığı" farklı boydaydı ve kimse fark etmiyordu.
   *
   * Ölçek artık `globals.css` içinde tanımlı (`--text-*`). Bir bileşen
   * ölçeğin dışına çıkmak zorundaysa önce oraya bir jeton eklenir; jeton
   * eklemek, "bu boyut sistemin parçası" demenin bedelidir ve o bedel
   * bilinçli olarak ödenmelidir.
   *
   * ⚠️ Bu testi susturmanın doğru yolu muafiyet eklemek DEĞİL, jeton
   * eklemektir. `--text-skor` tam olarak böyle doğdu.
   */
  const KEYFI_PUNTO = /\btext-\[[0-9.]+rem\]/g

  it('bileşenlerde ve sayfalarda keyfi punto yok', () => {
    const ihlaller = hepsi.flatMap((dosya) => {
      const bulunan = yorumsuz(dosya.icerik).match(KEYFI_PUNTO) ?? []
      return bulunan.map((sinif) => `${dosya.yol}: ${sinif}`)
    })

    expect(
      ihlaller,
      'Tipografi ölçeğinin dışında punto kullanılmış. Ölçek globals.css ' +
        'içinde tanımlı; gerçekten yeni bir boyut gerekiyorsa oraya jeton ' +
        'ekleyin (örn. --text-skor).\n' +
        `İhlaller:\n  ${ihlaller.join('\n  ')}`,
    ).toEqual([])
  })

  /**
   * ⚠️ Ağırlık 600/700 yasağı zaten ayrı bir testte; burada ölçeğin
   * KENDİSİNİN eksiksiz olduğunu doğruluyoruz. Bir jeton silinirse onu
   * kullanan sayfa sessizce varsayılan puntoya düşerdi.
   */
  it('ölçeğin taşıyıcı jetonları tanımlı', () => {
    const css = readFileSync(path.join(KOK, 'app/(site)/globals.css'), 'utf8')
    for (const jeton of [
      '--text-baslik-1',
      '--text-baslik-1-mobil',
      '--text-baslik-2',
      '--text-baslik-2-mobil',
      '--text-baslik-3',
      '--text-govde',
      '--text-eyebrow',
      '--text-rakam',
      '--text-rakam-buyuk',
      '--text-kart-fiyat',
      '--text-skor',
    ]) {
      expect(css.includes(`${jeton}:`), `${jeton} globals.css içinde yok`).toBe(true)
    }
  })
})

describe('ham hex kullanılmıyor', () => {
  /**
   * Muafiyet listesi.
   *
   * `layout.tsx` tarayıcının `theme-color` meta etiketini yazar; tarayıcı
   * orada `var()` çözmez, somut renk ister. Değerler `zemin` jetonuyla
   * birebir aynı ve dosyada bu ilişki yorumda yazılı.
   *
   * ⚠️ Harita MUAF DEĞİL: MapLibre de CSS değişkeni okumuyor ama orada
   * renkler `getComputedStyle` ile çalışma zamanında jetondan okunuyor
   * (`src/lib/harita/jetonlar.ts`). Aynı çözüm burada uygulanamıyor
   * çünkü meta etiketi sunucuda, stil hesaplanmadan önce yazılıyor.
   */
  /**
   * ⚠️ Sosyal medya görsel rotası da MUAF — ama denetimsiz değil.
   *
   * `next/og` bir tarayıcı değil: Satori ne `globals.css` yüklüyor ne de
   * `var(--...)` çözüyor. Jeton adı yazmak, görselin renksiz üretilmesine
   * yol açardı.
   *
   * Bu muafiyetin bedeli aşağıdaki "onaylı palete eşit" testiyle
   * ödeniyor: hex'ler serbest değil, onaylanan rampanın birebir aynısı
   * olmak zorunda. Muafiyet "istediğini yaz" demek değil.
   */
  const MUAF = new Set<string>([
    'app/(site)/layout.tsx',
    'app/(site)/api/sosyal/gorsel/[bicim]/[id]/route.tsx',
  ])

  it.each(uyarlanmis.filter((d) => !MUAF.has(d.yol)).map((d) => [d.yol, d] as const))(
    '%s',
    (_yol, dosya) => {
      const bulunan = yorumsuz(dosya.icerik).match(/#[0-9a-fA-F]{3,8}\b/g) ?? []
      expect(bulunan, `ham hex bulundu: ${bulunan.join(', ')} — jeton kullanın`).toEqual([])
    },
  )
})

describe('font ağırlığı 500 ile sınırlı', () => {
  const YASAK = /\bfont-(semibold|bold|extrabold|black)\b/g

  it.each(uyarlanmis.map((d) => [d.yol, d] as const))('%s', (_yol, dosya) => {
    const bulunan = yorumsuz(dosya.icerik).match(YASAK) ?? []
    expect(
      bulunan,
      `600/700 ağırlık bulundu: ${bulunan.join(', ')} — font-medium kullanın`,
    ).toEqual([])
  })
})

describe('adaçayı ve gold kuralı', () => {
  /**
   * Dolu bakır zemine izin verilen dosyalar.
   *
   * ⚠️ BU LİSTEYE EKLEME YAPMAK TASARIM KARARIDIR.
   *
   * Dolu adaçayı zemin yalnızca ASIL EYLEMDE kullanılır: "Evimi
   * değerlendir" ve "Erişim talep et". Üçüncü bir yerde kullanıldığı anda
   * ikisi de sıradanlaşır ve kural işlevini kaybeder. Yeni bir satır
   * eklemeden önce sorulacak soru: bu gerçekten o iki eylemden biri mi?
   *
   * ⚠️ Kural bakırdan devralındı. Renk değişti, nadirlik gerekçesi aynı.
   */
  const IZINLI_DOLU_AKSAN = new Set([
    // Görünümün kendisi burada tanımlanır; başka yerde sınıf yazılmaz.
    'components/ui/Buton.tsx',
    // Stil rehberi bileşenleri sergiler; yalnızca geliştirme ortamında açık.
    'app/(site)/stil-rehberi/page.tsx',
    /**
     * Header'daki "Evimi değerlendir" — şartname §4'ün istediği eylem ve
     * kuralın izin verdiği iki eylemden biri. Masaüstünde bir, mobil menüde
     * bir kez geçiyor; ikisi de AYNI eylem, iki farklı kırılım noktası.
     */
    'components/duzen/Baslik.tsx',
  ])

  /** `bg-adacayi-500` … `bg-adacayi-800` ve `bg-aksan` — dolu zemin. */
  const DOLU_AKSAN = /\bbg-(adacayi-[5-8]00|aksan)\b/g

  it('dolu adaçayı zemin yalnızca izinli dosyalarda geçiyor', () => {
    const ihlaller = hepsi
      .filter((dosya) => !IZINLI_DOLU_AKSAN.has(dosya.yol))
      .flatMap((dosya) => {
        const bulunan = yorumsuz(dosya.icerik).match(DOLU_AKSAN) ?? []
        return bulunan.map((sinif) => `${dosya.yol}: ${sinif}`)
      })

    expect(ihlaller, 'dolu adaçayı iki eylem dışında kullanılmış').toEqual([])
  })

  /**
   * ⚠️ GOLD ASLA METİN RENGİ DEĞİL.
   *
   * Kırık beyaz üzerinde 2,06:1 — ağır ihlal. Kontrast testi jetonun
   * bağlantısını denetliyor; bu test KULLANIMI kovalıyor. İkisi ayrı
   * kapılar: biri "gold bir metin jetonuna bağlanmış mı", diğeri "bir
   * bileşende text-gold-* yazılmış mı".
   */
  it('gold metin rengi olarak kullanılmıyor', () => {
    const METIN_GOLD = /\btext-gold(-\d+)?\b/g
    const ihlaller = hepsi.flatMap((dosya) => {
      const bulunan = yorumsuz(dosya.icerik).match(METIN_GOLD) ?? []
      return bulunan.map((sinif) => `${dosya.yol}: ${sinif}`)
    })

    expect(
      ihlaller,
      'gold metin rengi olamaz (kırık beyaz üzerinde 2,06:1). ' +
        'Anlam taşıyan bir öğe gerekiyorsa --color-gold-guclu kullanın.',
    ).toEqual([])
  })

  it('adaçayı buton görünümü sayılabilir kadar az çağrılıyor', () => {
    const cagrilar = hepsi.flatMap((dosya) => {
      if (dosya.yol === 'components/ui/Buton.tsx') return []
      const bulunan = yorumsuz(dosya.icerik).match(/gorunum="aksan"/g) ?? []
      return bulunan.map(() => dosya.yol)
    })

    /**
     * Üst sınır 4: iki eylem × (ana sayfa + kendi sayfası) kadar yer
     * tutuyor. Stil rehberi de bunun içinde. Sınır aşıldığında adaçayı
     * seyrekliğini kaybetmiş demektir.
     */
    expect(cagrilar.length, `adaçayı buton çağrıları: ${cagrilar.join(', ')}`).toBeLessThanOrEqual(
      4,
    )
  })
})

describe('rakamlar hizalı', () => {
  it('gövde tabular-nums ile başlatılıyor', () => {
    const css = readFileSync(path.join(KOK, 'app/(site)/globals.css'), 'utf8')
    const govde = css.slice(css.indexOf('body {'), css.indexOf('body {') + 600)

    // İstisna yok kuralı: bir bileşen unutulsa bile gövde doğru davranmalı.
    expect(govde).toContain('font-variant-numeric: tabular-nums')
  })
})

/**
 * Muaf tutulan sosyal medya görselinin renkleri, onaylanan paletin
 * birebir aynısı olmak zorunda.
 *
 * ⚠️ Bu test muafiyetin bedeli. Ham hex yazma izni verilen tek yerin
 * serbest bırakılması, paletin sessizce ikiye ayrılması demek olurdu:
 * sitede bir lacivert, paylaşılan görselde başka bir lacivert.
 */
describe('sosyal medya görseli onaylı palete bağlı', () => {
  // KOK zaten `src`e işaret ediyor.
  const ROTA = 'app/(site)/api/sosyal/gorsel/[bicim]/[id]/route.tsx'

  /** Onaylanan rampadan birebir alınan değerler. */
  const IZINLI = new Set(['#0F1E33', '#F8F7F3', '#A3BFD9', '#1D4270'])

  it('yalnızca onaylanan rampa değerlerini kullanır', () => {
    const kaynak = readFileSync(path.join(KOK, ROTA), 'utf8')
    const bulunan = yorumsuz(kaynak).match(/#[0-9a-fA-F]{3,8}\b/g) ?? []

    expect(bulunan.length).toBeGreaterThan(0)
    const kacak = bulunan.filter((hex) => !IZINLI.has(hex.toUpperCase()))
    expect(
      kacak,
      `Onaylı palette olmayan renk: ${kacak.join(', ')}. ` +
        'Görsel ile site aynı laciverti kullanmalı.',
    ).toEqual([])
  })

  /**
   * ⚠️ Aksan kuralı — pazarlığa kapalı. Dolu adaçayı yalnızca "Evimi değerlendir"
   * ve "Erişim talep et" eylemlerinde kullanılır; bir ilan görseli
   * bunların hiçbiri değil.
   */
  it('bakır kullanmaz', () => {
    const kaynak = readFileSync(path.join(KOK, ROTA), 'utf8')
    const ESKI_BAKIR = /#(F7E6D9|EFCBB2|E3A981|D68551|C4682F|A85529|8A4423)\b/gi
    expect(
      yorumsuz(kaynak).match(ESKI_BAKIR) ?? [],
      'bakır palet kaldırıldı; bu hex değerleri geri sızmamalı',
    ).toEqual([])
  })
})
