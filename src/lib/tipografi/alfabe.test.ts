import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { ALFABE, alfabeDisiKarakterler, karakterEtiketi } from './alfabe'

/**
 * Sitedeki metinlerin font alt kümesinin dışına taşmadığını sınar.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: EKSİK GLİF SESSİZCE BOZULUR.
 *
 * Fontlar artık Türkçe alt kümesiyle taşınıyor (`src/fonts/`, gerekçe
 * `OKUBENI.md`). Alt kümede olmayan bir karakter yazıldığında tarayıcı
 * hata vermez — yedek fonta düşer, harf başka bir tipografiyle çizilir.
 * Tek bir "≠" yüzünden cümlenin ortasında farklı bir font belirir ve bunu
 * fark etmek aylar alır; kimse hata günlüğünde göremez.
 *
 * Bu test o sessizliği bozuyor: alfabe dışında bir karakter kaynağa
 * girdiği anda kapı kırmızıya döner ve ne yapılacağını söyler.
 *
 * ⚠️ TESTİ SUSTURMANIN DOĞRU YOLU: alfabeyi büyütüp FONTU YENİDEN ÜRETMEK.
 *     1. `src/lib/tipografi/alfabe.ts` içine karakteri ekle
 *     2. `pnpm font:altkume` çalıştır
 *     3. Değişen `.woff2` dosyalarını commit et
 * Yalnızca 1. adımı yapmak testi yeşile döndürür ama fontta glif yine
 * olmaz — bu yüzden aşağıda alt küme dosyalarının alfabeyle birlikte
 * güncellendiğini sınayan ayrı bir test daha var.
 * ─────────────────────────────────────────────────────────────────────────
 */

const KOK = join(import.meta.dirname, '..', '..')

/**
 * Taranmayanlar.
 *
 * ⚠️ Her satırın gerekçesi yazılı olmak zorunda; gerekçesiz muafiyet testi
 * anlamsızlaştırır.
 */
const ATLANAN_DIZINLER = new Set([
  'node_modules',
  '.next',
  // Font dosyalarının kendisi ve künyesi; ikili veri ve belge.
  'fonts',
])

/**
 * Alt kümede OLMAYACAK, ama kaynakta bulunması normal karakterler.
 *
 * ⚠️ Her satırın gerekçesi yazılı. Buraya bir karakter eklemek "bu
 * tarayıcıda yedek fonta düşecek ve bu bizim için sorun değil" demektir —
 * gerekçesiz bir muafiyet, testin var olma sebebini ortadan kaldırır.
 */
const MUAF: Record<string, string> = {
  '⚠':
    'Uyarı emojisi. Hiçbir Latin metin fontu renkli emoji taşımaz; bugün de ' +
    'sistemin emoji fontuyla çiziliyor. Alt kümeye eklemek mümkün değil.',
  '️':
    'Emoji sunum seçicisi (VS16). Çizilen bir glif değil, önündeki ' +
    'karakterin emoji biçiminde gösterilmesini isteyen görünmez işaret.',
  '̀':
    'Birleşen aksan işareti — slug.ts içindeki Unicode ayrıştırma ' +
    'aralığının (\\u0300-\\u036f) sınırı. Kod, içerik değil.',
  'ͯ': 'Birleşen aksan işaretlerinin üst sınırı — yukarıdakiyle aynı regex. ' + 'Kod, içerik değil.',
}

/**
 * Yorum satırlarını düşürür.
 *
 * ⚠️ Gerekli: bu depoda yorumlar `═`, `─`, `⚠️` gibi kutu ve işaret
 * karakterleri kullanıyor. Yorumlar kullanıcıya GÖRÜNMEZ, dolayısıyla
 * fontta karşılıkları olması da gerekmez. Yorumları saymak, testin
 * ilk günden kalıcı olarak kırmızı olması demekti.
 */
function yorumsuz(kaynak: string): string {
  return (
    kaynak
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
      /**
       * ⚠️ YORUM AÇILIŞI ÖNÜNDEKİ KARAKTERLE SINANIYOR — VE BU BİR KÖRLÜK
       * DÜZELTMESİ.
       *
       * Desen eskiden düpedüz `/\*[\s\S]*?\*\//` idi ve `accept="image/*"`
       * dizesindeki `/*` ONUN İÇİN BİR YORUM AÇILIŞIYDI. O dizeden sonraki
       * ilk `*\/` neredeyse her zaman uzakta bir JSDoc bloğunun sonunda
       * oluyor; arada kalan onlarca satır sessizce TARAMA DIŞI kalıyordu.
       *
       * Ölçüldü: `PortfoySihirbazi.tsx` içinde bir `✕` (U+2715) vardı, font
       * alt kümesinde yoktu ve bu test aylarca yeşil kaldı. Yani denetimin
       * kendi ölçüm aracı, denetlediği şeyi gizliyordu — `otomatikKayit.test.ts`
       * aynı tuzağa düşmüş ve orada ham kaynağa dönülerek çözülmüştü.
       *
       * Gerçek bir yorum daima satır başı, boşluk ya da bir açılış
       * karakterinden sonra gelir; `image/*` içindeki `/` bir harften sonra
       * geliyor. Önceki karakter geri yazılıyor ki sonraki eşleşmeler kaymasın.
       */
      .replace(/(^|[\s({[])\/\*[\s\S]*?\*\//g, '$1')
      .replace(/^\s*\/\/.*$/gm, '')
  )
}

function kaynakDosyalari(dizin: string, biriktir: string[] = []): string[] {
  for (const ad of readdirSync(dizin)) {
    if (ATLANAN_DIZINLER.has(ad)) continue
    const yol = join(dizin, ad)
    if (statSync(yol).isDirectory()) kaynakDosyalari(yol, biriktir)
    // Testler kullanıcıya görünmez; kendi içlerinde örnek karakter taşıyabilirler.
    else if (/\.(ts|tsx)$/.test(ad) && !/\.test\.tsx?$/.test(ad)) biriktir.push(yol)
  }
  return biriktir
}

describe('font alt kümesi içeriği kapsıyor', () => {
  const dosyalar = kaynakDosyalari(join(KOK, 'app')).concat(
    kaynakDosyalari(join(KOK, 'components')),
    kaynakDosyalari(join(KOK, 'lib')),
    kaynakDosyalari(join(KOK, 'collections')),
    kaynakDosyalari(join(KOK, 'globals')),
  )

  it('taranacak dosya bulunuyor', () => {
    expect(dosyalar.length).toBeGreaterThan(50)
  })

  it('kaynakta alfabe dışı karakter yok', () => {
    const bulunan = new Map<string, string[]>()

    for (const dosya of dosyalar) {
      const kaynak = yorumsuz(readFileSync(dosya, 'utf8'))
      for (const karakter of alfabeDisiKarakterler(kaynak)) {
        if (karakter in MUAF) continue
        const yerler = bulunan.get(karakter) ?? []
        if (yerler.length < 3) yerler.push(dosya.replace(`${KOK}/`, ''))
        bulunan.set(karakter, yerler)
      }
    }

    const rapor = [...bulunan]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([karakter, yerler]) => `${karakterEtiketi(karakter)} → ${yerler.join(', ')}`)

    expect(
      rapor,
      'Bu karakterler font alt kümesinde YOK; tarayıcıda yedek fontla çizilirler.\n' +
        'Düzeltmek için: (1) src/lib/tipografi/alfabe.ts içine ekle, ' +
        '(2) pnpm font:altkume, (3) değişen .woff2 dosyalarını commit et.\n' +
        `Bulunanlar:\n  ${rapor.join('\n  ')}`,
    ).toEqual([])
  })
})

describe('alt küme dosyaları alfabeyle tutarlı', () => {
  /**
   * ⚠️ Alfabeyi büyütüp fontu yeniden üretmeyi UNUTMAK, bu işin tek gerçek
   * riski. Üstteki test o durumda yeşile döner (karakter artık alfabede),
   * ama fontta glif hâlâ yoktur ve site sessizce yedek fonta düşer.
   *
   * Bu yüzden üretilen dosyaların yanına alfabenin özeti yazılıyor
   * (`src/fonts/uretim.json`). Özet tutmuyorsa font bayat demektir.
   */
  it('üretim künyesi güncel alfabeyi yansıtıyor', async () => {
    const { createHash } = await import('node:crypto')
    const kunyeYolu = join(KOK, 'fonts', 'uretim.json')

    const kunye = JSON.parse(readFileSync(kunyeYolu, 'utf8')) as { alfabeOzeti: string }
    const guncelOzet = createHash('sha256').update(ALFABE).digest('hex')

    expect(
      kunye.alfabeOzeti,
      'Alfabe değişmiş ama font alt kümeleri yeniden üretilmemiş. ' +
        '`pnpm font:altkume` çalıştır ve değişen dosyaları commit et.',
    ).toBe(guncelOzet)
  })
})
