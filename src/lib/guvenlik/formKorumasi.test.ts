import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Herkese açık form eylemlerinin koruma katmanları.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: KORUMA YANLIŞ FORMDAYDI.
 *
 * 13 Ağustos 2026'da canlı denetimde çıktı: Turnstile yalnızca
 * `/danisman-ol` formuna bağlıydı ve o site bölümü KAPALIYDI (sayfa 404
 * dönüyordu). Yani üretimde çalışan **tek** herkese açık form —
 * `/iletisim` — hız sınırı ve Turnstile olmadan çalışıyordu.
 *
 * Üstelik sitedeki bütün "iletişime geç" yolları oraya akıyor: gizli
 * portföy erişim talebi, boş durum CTA'ları, ilan sayfasındaki "randevu
 * isteyin". Tek kapı olması, o kapının eksiksiz olmasını zorunlu kılıyor.
 *
 * Hata sessizdi ve ancak spam gelince anlaşılırdı.
 *
 * ⚠️ Bu test yeni bir form eklendiğinde kapıyı düşürür. Katman eklemek
 * unutulabilir; testi susturmak için muafiyet listesine yazmak ise
 * bilinçli bir karar olmak zorunda.
 * ─────────────────────────────────────────────────────────────────────────
 */

const KOK = join(import.meta.dirname, '..', '..')

/** Bir eylem dosyasında aranan koruma izleri. */
interface Katmanlar {
  zod: boolean
  balKupu: boolean
  hizSiniri: boolean
  turnstile: boolean
  /** Panel oturumu gerektiriyor mu — herkese açık olmayan eylemler için. */
  panelKapisi: boolean
}

function katmanlariOku(kaynak: string): Katmanlar {
  return {
    // Şema doğrulaması: doğrudan zod ya da paylaşılan bir `*Semasi`.
    zod: /from 'zod'|Semasi\.safeParse|semasi\.safeParse/.test(kaynak),
    // Bal küpü alanı bu projede `websitesi` adıyla geçiyor.
    balKupu: /websitesi|balKupu|honeypot/.test(kaynak),
    hizSiniri: /hizSinirindaMi/.test(kaynak),
    turnstile: /turnstileDogrula/.test(kaynak),
    /**
     * ⚠️ `payload.auth(` de sayılıyor.
     *
     * İlk yazımda bu desen eksikti ve `lib/gozlem/eylemler.ts` yanlış
     * yere "korumasız" işaretlendi — oysa dosya `payload.auth({ headers })`
     * ile oturumu açıp `if (!user) return null` diyor. Eksik bir dedektör,
     * gerçek bir açık kadar zararlı olabilirdi: ya sahte alarm yüzünden
     * test devre dışı bırakılır, ya kural gevşetilirdi.
     */
    panelKapisi:
      /req\.user|yoneticiMi|rolAl|overrideAccess:\s*false|panelKullanicisi|payload\.auth\(/.test(
        kaynak,
      ),
  }
}

function eylemDosyalari(dizin: string, biriktir: string[] = []): string[] {
  for (const ad of readdirSync(dizin)) {
    if (ad === 'node_modules' || ad === '.next') continue
    const yol = join(dizin, ad)
    if (statSync(yol).isDirectory()) eylemDosyalari(yol, biriktir)
    else if (/\.tsx?$/.test(ad) && !/\.test\.tsx?$/.test(ad)) {
      const icerik = readFileSync(yol, 'utf8')
      if (icerik.includes("'use server'")) biriktir.push(yol)
    }
  }
  return biriktir
}

/**
 * Herkese açık yazma eylemleri — ziyaretçi oturumsuz çağırabiliyor.
 *
 * ⚠️ Buraya bir satır eklemek "bu formu internet çağırabilir" demektir ve
 * dört katmanın hepsini gerektirir.
 */
const HERKESE_ACIK = new Set([
  'app/(site)/iletisim/eylemler.ts',
  'app/(site)/danisman-ol/eylemler.ts',
])

/**
 * Panel arkasındaki eylemler — koruma katmanı OTURUM.
 *
 * ⚠️ Her satırın gerekçesi yazılı. Bir eylem buraya, gerçekten panel
 * kapısı taşımadan yazılırsa aşağıdaki test onu ayrıca yakalıyor.
 */
const PANEL_ARKASI: Record<string, string> = {
  'lib/sihirbaz/eylemler.ts': 'Portföy giriş sihirbazı — yalnızca panel kullanıcısı.',
  'lib/osm/eylemler.ts': 'OSM içe aktarma — yalnızca panel kullanıcısı.',
  'lib/sihirbaz/gorselEylemleri.ts':
    'Sihirbazın görsel yüklemesi — yalnızca panel kullanıcısı; medya koleksiyonuna yazıyor.',
  'lib/sihirbaz/oneriEylemleri.ts':
    'Benzer ilan önerileri — yalnızca panel kullanıcısı; hiçbir şey YAZMIYOR, okuyor.',
  'lib/gozlem/eylemler.ts': 'Gözlem girişi ve CSV içe aktarma — yalnızca panel kullanıcısı.',
  'lib/gozlem/iceAktarmaCekirdegi.ts':
    'Yukarıdakinin çekirdeği; kendi kapısı yok, çağıranınki geçerli.',
  'lib/mahalle/eylemler.ts':
    'Mahalle listesi ve OSM sınır içe aktarma — yalnızca YÖNETİCİ ' +
    '(toplu kayıt açıyor, sınırları topluca değiştiriyor).',
  'lib/google/eylemler.ts':
    'Google Places eşleştirme — yalnızca YÖNETİCİ (her arama ücretli bir çağrı). ' +
    'Ziyaretçiye açık detay çağrısı ayrı dosyada: lib/google/detayEylemi.ts.',
  'lib/rayic/eylemler.ts':
    'Rayiç bedel CSV içe aktarma — yalnızca YÖNETİCİ (alım maliyeti hesabını besliyor).',
  'app/(payload)/layout.tsx': 'Payload panelinin kendi düzeni; form eylemi değil.',
}

/**
 * Herkese açık ama YAZMAYAN eylemler.
 *
 * ⚠️ AI arama hiçbir şey kaydetmiyor; ham sorgu ne veritabanına ne günlüğe
 * yazılıyor (KVKK). Yazma olmadığı için bal küpü ve Turnstile'ın karşılığı
 * yok; kötüye kullanım riski maliyet tarafında ve onu hız sınırı kovalıyor.
 */
const OKUMA_EYLEMLERI: Record<string, string> = {
  'lib/arama/eylemler.ts': 'AI arama — kayıt yapmıyor, yalnızca filtre üretiyor. Hız sınırı var.',
  /**
   * ⚠️ Google detay çağrısı da hiçbir şey KAYDETMİYOR — lisans gereği
   * kaydedemez de. Ama her çağrı Google'a para ödemek demek ve
   * parametresi ziyaretçiden geliyor. İki koruma birden var: hız sınırı,
   * ve parametrenin bir Google yer kimliği değil BİZİM POI kimliğimiz
   * olması (yer kimliği veritabanından okunuyor).
   */
  'lib/google/detayEylemi.ts':
    'Google yer detayı — kayıt yapmıyor, istek anında gösteriyor. Hız sınırı var; ' +
    'sorulabilecek yerler sistemde eşleştirilmiş noktalarla sınırlı.',
}

describe('form koruma katmanları', () => {
  const dosyalar = eylemDosyalari(join(KOK, 'app'))
    .concat(eylemDosyalari(join(KOK, 'lib')))
    .map((yol) => ({ yol: yol.replace(`${KOK}/`, ''), icerik: readFileSync(yol, 'utf8') }))

  it('taranacak eylem bulunuyor', () => {
    expect(dosyalar.length).toBeGreaterThan(4)
  })

  /**
   * ⚠️ Yeni bir `'use server'` dosyası eklendiğinde bu test düşer.
   *
   * Kasıtlı: her sunucu eylemi ya herkese açıktır (dört katman) ya panel
   * arkasındadır (oturum) ya da yazmıyordur. Üçünden birine yazılmadan
   * eklenen bir eylem, kimsenin sınıflandırmadığı bir saldırı yüzeyidir.
   */
  it('her sunucu eylemi sınıflandırılmış', () => {
    const siniflandirilmamis = dosyalar
      .map((d) => d.yol)
      .filter(
        (yol) => !HERKESE_ACIK.has(yol) && !(yol in PANEL_ARKASI) && !(yol in OKUMA_EYLEMLERI),
      )

    expect(
      siniflandirilmamis,
      "Bu 'use server' dosyaları hiçbir sınıfa yazılmamış. Her sunucu eylemi " +
        'ya herkese açıktır (dört koruma katmanı), ya panel arkasındadır ' +
        '(oturum), ya da yazmıyordur. Sınıflandırılmamış bir eylem, kimsenin ' +
        'değerlendirmediği bir saldırı yüzeyidir.\n' +
        `Sınıflandırılmamış:\n  ${siniflandirilmamis.join('\n  ')}`,
    ).toEqual([])
  })

  /**
   * ⚠️ ASIL KAPI — herkese açık formlarda dört katman da zorunlu.
   *
   * Turnstile'ın kendisi anahtar yoksa atlanıyor (`turnstile.ts` içinde) —
   * ama ÇAĞRISI kodda bulunmak zorunda. Aksi hâlde anahtar girildiği gün
   * form yine korumasız kalırdı ve kimse fark etmezdi.
   */
  it.each([...HERKESE_ACIK])('%s dört koruma katmanını da taşıyor', (yol) => {
    const dosya = dosyalar.find((d) => d.yol === yol)
    expect(dosya, `${yol} bulunamadı — taşındıysa liste güncellenmeli`).toBeDefined()

    const katman = katmanlariOku(dosya!.icerik)

    expect(katman.zod, `${yol}: sunucu tarafı şema doğrulaması yok`).toBe(true)
    expect(katman.balKupu, `${yol}: bal küpü alanı yok`).toBe(true)
    expect(katman.hizSiniri, `${yol}: hız sınırı yok`).toBe(true)
    expect(katman.turnstile, `${yol}: Turnstile doğrulaması yok`).toBe(true)
  })

  it.each(Object.keys(PANEL_ARKASI))('%s panel kapısı taşıyor ya da çekirdek', (yol) => {
    const dosya = dosyalar.find((d) => d.yol === yol)
    if (dosya === undefined) return // Payload düzeni gibi form olmayan dosyalar.

    const katman = katmanlariOku(dosya.icerik)
    // Çekirdek dosyalar kendi kapısını taşımıyor; çağıranınki geçerli.
    const cekirdek = yol.includes('Cekirdegi') || yol.includes('(payload)')

    expect(
      katman.panelKapisi || cekirdek,
      `${yol}: panel arkası sayıldı ama oturum kontrolü bulunamadı`,
    ).toBe(true)
  })

  /**
   * ⚠️ Hız sınırı YAZMAYAN eylemlerde de gerekli.
   *
   * AI arama kayıt yapmıyor ama her çağrı Anthropic'e para harcıyor;
   * sınırsız bırakmak faturayı saldırganın eline verirdi.
   */
  it.each(Object.keys(OKUMA_EYLEMLERI))('%s hız sınırı taşıyor', (yol) => {
    const dosya = dosyalar.find((d) => d.yol === yol)
    expect(dosya).toBeDefined()
    expect(katmanlariOku(dosya!.icerik).hizSiniri, `${yol}: hız sınırı yok`).toBe(true)
  })
})
