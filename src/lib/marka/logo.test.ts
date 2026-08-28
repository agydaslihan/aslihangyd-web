import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: LOGO SESSİZCE BOZULUR.
 *
 * Küçük bir logo, bulanık bir logo ya da hiç görünmeyen bir logo hiçbir
 * hata üretmez. Site çalışır, testler yeşildir, yalnızca marka zayıf durur
 * ve bunu ancak siteye bakan bir insan fark eder.
 *
 * Buradaki üç kural o boşluğu kapatıyor: ölçüler, yedek zinciri ve bant
 * yüksekliğinin sabit kalması.
 * ─────────────────────────────────────────────────────────────────────────
 */

const KOK = path.resolve(path.join(import.meta.dirname, '..', '..'))
const oku = (yol: string) => readFileSync(path.join(KOK, yol), 'utf8')

/**
 * Yorumları düşürür.
 *
 * ⚠️ Gerekçe metinleri kuralın kendisini tetikliyordu: kanca sırasını
 * denetleyen test, açıklama satırlarındaki "beforeChange" kelimesini kodun
 * kendisi sandı ve yanlış yerde kırıldı.
 */
const kodu = (icerik: string) =>
  icerik.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('logo ölçüleri', () => {
  const baslik = oku('components/duzen/Baslik.tsx')
  const altbilgi = oku('components/duzen/Altbilgi.tsx')

  /**
   * ⚠️ LOGO BÜYÜDÜ, BANT BÜYÜMEDİ. Başlığın yüksekliği `h-18` (72 px) ve
   * öyle kalmalı: bandı büyütmek her sayfada ilk ekrandan yer çalar.
   */
  it('başlık bandı 72 px olarak kalıyor', () => {
    expect(baslik).toContain('h-18')
  })

  it('başlık logosu mobilde 40, masaüstünde 48 px', () => {
    expect(baslik).toContain('yukseklik={48}')
    expect(baslik).toMatch(/sinif="h-10 w-auto[^"]*lg:h-12/)
  })

  /**
   * ⚠️ Genişlik tavanı olmadan çok geniş bir logo mobilde menü düğmesini
   * ekrandan itiyordu.
   */
  it('logolarda genişlik tavanı var', () => {
    expect(baslik).toMatch(/max-w-\[/)
    expect(altbilgi).toMatch(/max-w-\[/)
  })

  it('altbilgi logosu 56 px ile sınırlı', () => {
    expect(altbilgi).toContain('yukseklik={56}')
    expect(altbilgi).toContain('h-14 w-auto')
  })

  /**
   * ⚠️ `w-auto` + `object-contain` birlikte: kare bir logo da, 4:1 bir logo
   * da aynı kutuda oranını koruyor. Yalnızca yükseklik sabitlenirse geniş
   * logo taşar; yalnızca genişlik sabitlenirse kare logo ezilir.
   */
  it('oran korunuyor', () => {
    expect(baslik).toContain('object-contain')
    expect(altbilgi).toContain('object-contain')
  })
})

describe('logo yedek zinciri', () => {
  const bilesen = oku('components/marka/MarkaLogosu.tsx')

  /**
   * ⚠️ ÜÇ BASAMAKLI YEDEK: koyu logo → ana logo → site adı yazıyla.
   *
   * Bozuk ya da eksik bir görsel HİÇBİR durumda gösterilmiyor. Logoya bağlı
   * çalışan bir başlık, o logo silindiğinde siteyi kimliksiz bırakırdı.
   */
  it('koyu zeminde önce koyu logo, sonra ana logo deneniyor', () => {
    expect(bilesen).toContain('marka.logoKoyu ?? marka.logo')
  })

  it('logo yoksa metin yedeğine düşülüyor', () => {
    expect(bilesen).toContain('if (!marka.logo)')
    expect(bilesen).toContain('AdMetni')
  })

  /**
   * ⚠️ SVG optimize EDİLMİYOR. Next'in görsel işlemcisi SVG'yi
   * rasterleştiriyor ve "her boyutta keskin" özelliğini öldürüyor.
   */
  it('SVG optimize edilmeden servis ediliyor', () => {
    expect(bilesen).toContain("unoptimized={secilen.url.endsWith('.svg')}")
  })
})

describe('SVG yükleme', () => {
  const medya = oku('collections/Medya.ts')

  it('SVG yüklenebiliyor', () => {
    expect(medya).toContain("'image/svg+xml'")
  })

  /**
   * ⚠️ TEMİZLİK `beforeOperation`DA OLMAK ZORUNDA — ÖLÇÜMLE BULUNDU.
   *
   * İlk kurulumda `beforeChange` içindeydi ve hiçbir etkisi olmadı: dosya
   * dış referansıyla birlikte kaydedildi ve öyle servis edildi. Sebep sıra:
   * Payload `generateFileData`yı `beforeChange`ten önce çalıştırıp diske
   * yazılacak tamponu orada hazırlıyor.
   *
   * Deneyle görüldü — temizlenmesi gereken SVG 233 baytla, `href`i yerinde
   * duruyordu. `beforeOperation`a taşındıktan sonra 194 bayt ve temiz.
   *
   * Bu test kancanın yerini tutuyor: geri taşınırsa sessizce etkisiz kalır.
   */
  it('temizlik beforeOperation kancasında', () => {
    const kaynak = kodu(medya)
    const bas = kaynak.indexOf('beforeOperation')
    const son = kaynak.indexOf('beforeChange')
    expect(bas, 'beforeOperation kancası yok').toBeGreaterThan(-1)
    expect(kaynak.indexOf('svgTemizle')).toBeGreaterThan(bas)
    expect(kaynak.indexOf('svgTemizle'), 'temizlik beforeChange’e kaymış').toBeLessThan(son)
  })

  /** ⚠️ Sessizce temizlemek, yükleyene ne olduğunu söylememek demek. */
  it('temizlik günlüğe yazılıyor', () => {
    expect(medya).toContain('logger.warn')
  })
})

describe('panel yardım metinleri', () => {
  const global = oku('globals/MarkaGorunum.ts')

  /**
   * ⚠️ Bu metin bir tercih değil, gözlenmiş bir arızanın cevabı: açık zemin
   * için hazırlanmış PNG'nin kenarları koyu zeminde hale bırakıyor.
   */
  it('koyu tema logosu için açık renkli SVG isteniyor', () => {
    expect(global).toContain('AÇIK RENKLİ')
    expect(global).toContain('şeffaf arka planlı')
    expect(global).toContain('3x')
  })

  it('yedek davranışı panelde yazılı', () => {
    expect(global).toContain('ANA LOGO kullanılır')
  })
})

describe('altbilgi logosunun simetrisi', () => {
  const altbilgi = kodu(oku('components/duzen/Altbilgi.tsx'))

  /**
   * ─────────────────────────────────────────────────────────────────────
   * ⚠️ NEDEN VAR: LOGO SÜTUN DÜZENİNİ KAYDIRIYORDU.
   *
   * Logo, tanıtım metniyle aynı `gap-2` yığınının içindeydi ve iki şey
   * birden bozuluyordu:
   *
   *   · Metne 8 px kalıyordu; 56 px'lik bir logonun altında bu boşluk
   *     logoyu metne yapıştırıyor, ikisi tek blok gibi okunuyordu.
   *   · Kutu yüksekliği İÇERİĞE göre değişiyordu — logo yüklüyse 56 px,
   *     metin yedeğindeyse satır yüksekliği kadar. Beş sütunlu ızgarada
   *     bu, komşu sütunların üst hizasını kaydırıyordu.
   *
   * İkisi de "hata vermeyen" sınıftan: site çalışır, testler yeşildir,
   * yalnızca altbilgi hizasız durur.
   * ─────────────────────────────────────────────────────────────────────
   */
  it('logo SABİT YÜKSEKLİKLİ bir kutuda — sütun düzeni içerikten bağımsız', () => {
    expect(
      altbilgi,
      'Logo kutusu `h-14` olmalı: yükseklik içeriğe göre değişirse, logo\n' +
        'yüklü olan ve olmayan sitede sütunların üst hizası farklı olur.',
    ).toMatch(/className="flex h-14 items-center justify-start"/)
  })

  it('logo SOLA hizalı — sütun başlığıyla aynı kenardan başlıyor', () => {
    /**
     * ⚠️ `items-start`/`justify-start` şart: `object-contain` dar bir
     * logoyu kutuya ORTALAR ve sütun başlığının sol kenarıyla hizası kayar.
     */
    expect(altbilgi).toMatch(/justify-start/)
  })

  it('logo ile tanıtım metni arasında yeterli boşluk var', () => {
    expect(
      altbilgi,
      'Tanıtım metni `mt-4` ile ayrılmalı; 8 px logoyu metne yapıştırıyordu.',
    ).toMatch(/className="text-notr-300 mt-4 text-govde-kucuk/)
  })
})

describe('altbilgide logo anahtarı', () => {
  const altbilgi = kodu(oku('components/duzen/Altbilgi.tsx'))
  const logoBileseni = kodu(oku('components/marka/MarkaLogosu.tsx'))
  const sunucu = kodu(oku('lib/marka/sunucu.ts'))

  it('anahtar altbilgiye bağlı', () => {
    expect(altbilgi).toMatch(/metneZorla=\{!marka\.altbilgideLogo\}/)
  })

  it('kapalıyken görsel GİZLENMİYOR, yerine site adı geliyor', () => {
    /**
     * ⚠️ "Logo yok" ile "logo istenmiyor" ayrı durumlar. Kapalıyken
     * bileşen `null` dönseydi sütun kimliksiz kalırdı; `metneZorla` metin
     * yedeğine düşürüyor.
     */
    expect(logoBileseni).toMatch(/if \(metneZorla\) \{[\s\S]{0,120}AdMetni/)
  })

  it('varsayılan AÇIK — hem kayıtta hem okuma hatasında', () => {
    /**
     * ⚠️ Kapalı varsayılan, paneli hiç açmamış bir kurulumda logoyu
     * sessizce gizlerdi. `!== false` eski kayıtları da açık sayıyor.
     */
    expect(sunucu).toMatch(/altbilgideLogo: marka\.altbilgideLogo !== false/)
    expect(sunucu).toMatch(/altbilgideLogo: true/)
  })
})
