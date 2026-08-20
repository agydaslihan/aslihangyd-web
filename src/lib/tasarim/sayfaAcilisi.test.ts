import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: AÇILIŞ BANDI SESSİZCE UNUTULUR.
 *
 * Yeniden tasarımın son adımı (FRONTEND-YENIDEN-TASARIM §10, Aşama 6)
 * "kalan sayfaların uyarlanması"ydı ve tam olarak böyle yarım kaldı: ana
 * sayfa, portföy ve mahalleler yeni bandı aldı, kalan 28 sayfa eski küçük
 * başlıkla açılmaya devam etti. Aradaki fark hiçbir yerde hata vermiyor —
 * yalnızca sayfadan sayfaya geçen ziyaretçi iki farklı site geziyor.
 *
 * Yeni bir sayfa eklendiğinde aynı şey tekrar olur. Bu test onu, sayfa
 * yayına girmeden önce yakalıyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ TESTİ SUSTURMANIN DOĞRU YOLU MUAFİYET EKLEMEK DEĞİL: sayfaya bandı
 * ekle. Muafiyet yalnızca bandın YANLIŞ olacağı sayfa için ve gerekçesi
 * buraya yazılarak eklenir — gerekçe alanı zorunlu tutuluyor.
 */

const KOK = path.resolve(path.join(import.meta.dirname, '..', '..'))
const SITE = path.join(KOK, 'app', '(site)')

/** Bandı doğrudan değil, bir kabuk üzerinden alan sayfalar. */
const KABUKLAR = ['HesaplayiciKabugu']

const MUAF: Record<string, string> = {
  'page.tsx':
    'Ana sayfanın açılışı `VitrinHero` — bandın kendisi değil, büyük kardeşi. ' +
    'İkisini birden basmak sayfayı iki kez açardı.',
  'harita/page.tsx':
    'Tam ekran harita; sayfa değil uygulama yüzeyi. Üstüne bant koymak ' +
    'haritanın yüksekliğini yer.',
  'stil-rehberi/page.tsx': 'Geliştirme aracı, ziyaretçiye kapalı.',
  'danisman-ol/page.tsx':
    'Kendi hero bloğu CMS’ten gelen bir görseli arka plan olarak kullanıyor ' +
    '(karartma katmanıyla). Ortak bant o görseli taşıyamaz.',
  'portfoy/[slug]/page.tsx': 'Detay sayfasının açılışı galeri; ikinci bir bant araya girerdi.',
  'mahalleler/[slug]/page.tsx': 'Detay sayfasının açılışı drone videosu / görsel hero.',
  'rapor/degerleme/page.tsx': YAZDIRMA_GEREKCESI(),
  'rapor/kira-mi-satin-alma-mi/page.tsx': YAZDIRMA_GEREKCESI(),
  'rapor/yatirim-simulatoru/page.tsx': YAZDIRMA_GEREKCESI(),
}

/**
 * ⚠️ Rapor sayfaları YAZDIRMA çıktısı (`@media print` + tarayıcının "PDF
 * olarak kaydet"i). Dekoratif bir bant kâğıdın üst şeridini yer ve giriş
 * animasyonu yazdırmada hiçbir şey ifade etmez.
 */
function YAZDIRMA_GEREKCESI(): string {
  return 'Yazdırma çıktısı: bant kâğıtta yer yer, giriş hareketi anlamsız.'
}

function sayfalariTopla(dizin: string, gorece = ''): string[] {
  const sonuc: string[] = []
  for (const oge of readdirSync(dizin, { withFileTypes: true })) {
    const yol = path.join(dizin, oge.name)
    if (oge.isDirectory()) {
      sonuc.push(...sayfalariTopla(yol, path.posix.join(gorece, oge.name)))
    } else if (oge.name === 'page.tsx') {
      sonuc.push(path.posix.join(gorece, oge.name))
    }
  }
  return sonuc
}

const sayfalar = sayfalariTopla(SITE)

describe('sayfa açılışı', () => {
  it('denetlenecek sayfa bulunuyor', () => {
    expect(sayfalar.length).toBeGreaterThan(20)
  })

  it.each(sayfalar.filter((yol) => MUAF[yol] === undefined))(
    '%s ortak açılış bandını kullanıyor',
    (yol) => {
      const kod = readFileSync(path.join(SITE, yol), 'utf8')
      const bandiVar = kod.includes('SayfaVitrini') || KABUKLAR.some((kabuk) => kod.includes(kabuk))

      expect(
        bandiVar,
        `${yol} açılış bandını kullanmıyor. Sayfaya <SayfaVitrini> ekleyin — ` +
          'ya da bandın yanlış olacağı bir sayfaysa MUAF listesine GEREKÇESİYLE yazın.',
      ).toBe(true)
    },
  )

  /**
   * ⚠️ Muafiyet listesi de denetleniyor: silinen bir sayfanın muafiyeti
   * listede kalırsa, aynı adla açılan yeni bir sayfa denetimden sessizce
   * kaçardı.
   */
  it('muafiyet listesinde var olmayan sayfa yok', () => {
    const olmayanlar = Object.keys(MUAF).filter((yol) => !sayfalar.includes(yol))
    expect(
      olmayanlar,
      `Muafiyeti olan ama artık var olmayan sayfalar: ${olmayanlar.join(', ')}`,
    ).toEqual([])
  })

  it('her muafiyetin gerekçesi yazılı', () => {
    for (const [yol, gerekce] of Object.entries(MUAF)) {
      expect(gerekce.length, `${yol} için gerekçe çok kısa`).toBeGreaterThan(30)
    }
  })
})
