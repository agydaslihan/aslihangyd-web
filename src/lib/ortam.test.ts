import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Ortam değişkeni belgelerinin koddan sapmadığını sınar.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: BELGE SESSİZCE YANLIŞLAŞMIŞTI.
 *
 * 7 Ağustos 2026'da yapılan denetimde `.env.example` ile kodun okuduğu
 * değişkenler İKİ YÖNDE birden ayrışmıştı:
 *
 *  · Kod `NEXT_PUBLIC_WHATSAPP_NUMARA` okuyordu, belgede
 *    `NEXT_PUBLIC_WHATSAPP_NUMARASI` yazıyordu. Belgeyi harfiyen izleyen
 *    biri WhatsApp düğmesini BOŞ NUMARAYLA yayına alırdı ve hiçbir hata
 *    görmezdi.
 *  · `BAKIM_ANAHTARI`, `RESTIC_REPOSITORY`, `TURNSTILE_GIZLI_ANAHTAR`,
 *    `SITE_ADRESI` gibi 8 değişken hiç belgelenmemişti. `.env.example`'ı
 *    kopyalayarak kurulan bir sunucuda bakım görevleri ve yedekleme
 *    çalışmazdı — ikisi de yasal yükümlülük taşıyor.
 *
 * Bu test tek yönü zorunlu kılıyor: **kodun okuduğu her değişken
 * belgelenmiş olmalı.** Ters yön serbest — ileriye dönük yer tutucular
 * (SMTP, Bunny) henüz okunmadan belgede durabilsin.
 * ─────────────────────────────────────────────────────────────────────────
 */

const KOK = join(import.meta.dirname, '..', '..')

/**
 * Belgelenmesi beklenmeyen değişkenler.
 *
 * ⚠️ Bu listeye ekleme yapmak, "bunu kimsenin bilmesi gerekmiyor" demektir.
 * Her satırın gerekçesi yazılı olmalı; gerekçesiz muafiyet, testin kendisini
 * anlamsızlaştırır.
 */
const MUAF: Record<string, string> = {
  NODE_ENV: 'Node ve compose tarafından verilir; elle yazılmaz.',
  MEDYA_DIZINI: 'compose.prod.yml sabit değer veriyor.',
  TEMIZLE: 'Yalnızca `pnpm seed` bayrağı; tohumlama üretimde zaten çalışmaz.',
  NEXT_PUBLIC_SITE_ADRESI: 'SITE_ADRESI için derleme zamanı yedeği; ikisi birlikte belgeleniyor.',
  GITHUB_ACTIONS: 'GitHub Actions koşumu tarafından verilir; .env ile ilgisi yok.',
  GITHUB_STEP_SUMMARY: 'GitHub Actions koşumu tarafından verilir; .env ile ilgisi yok.',
}

function kaynakDosyalari(dizin: string, biriktir: string[] = []): string[] {
  for (const ad of readdirSync(dizin)) {
    if (ad === 'node_modules' || ad === '.next') continue
    const yol = join(dizin, ad)
    if (statSync(yol).isDirectory()) kaynakDosyalari(yol, biriktir)
    else if (/\.(ts|tsx|mjs)$/.test(ad)) biriktir.push(yol)
  }
  return biriktir
}

function okunanDegiskenler(): Set<string> {
  const bulunan = new Set<string>()
  const dosyalar = [
    ...kaynakDosyalari(join(KOK, 'src')),
    ...kaynakDosyalari(join(KOK, 'scripts')),
    join(KOK, 'next.config.ts'),
  ]

  for (const dosya of dosyalar) {
    const icerik = readFileSync(dosya, 'utf8')
    for (const eslesme of icerik.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
      const ad = eslesme[1]
      if (ad !== undefined && !(ad in MUAF)) bulunan.add(ad)
    }
  }
  return bulunan
}

function belgelenenler(dosya: string): Set<string> {
  const icerik = readFileSync(join(KOK, dosya), 'utf8')
  const bulunan = new Set<string>()
  for (const satir of icerik.split('\n')) {
    // Hem `AD=deger` hem de yorumlanmış `# AD=deger` biçimini say:
    // ikincisi "isteğe bağlı" demek, "belgelenmemiş" değil.
    const eslesme = /^#?\s*([A-Z0-9_]+)=/.exec(satir.trim())
    if (eslesme?.[1] !== undefined) bulunan.add(eslesme[1])
  }
  return bulunan
}

describe('ortam değişkeni belgeleri', () => {
  it('kodun okuduğu her değişken bir örnek dosyada belgelenmiş', () => {
    const okunan = okunanDegiskenler()
    const belgeli = new Set([
      ...belgelenenler('.env.example'),
      ...belgelenenler('.env.production.example'),
    ])

    const eksik = [...okunan].filter((ad) => !belgeli.has(ad)).sort()

    expect(
      eksik,
      `Kod bu değişkenleri okuyor ama hiçbir örnek dosyada yok: ${eksik.join(', ')}. ` +
        'Belgelenmemiş bir değişken, kurulumda sessizce boş kalır.',
    ).toEqual([])
  })

  /**
   * ⚠️ Üretimde olmazsa olmazlar ayrıca sınanıyor.
   *
   * Bunların hepsi bir YASAL ya da GERİ ALINAMAZ sonuca bağlı:
   * bakım anahtarı olmadan EİDS kontrolü koşmaz, restic parolası olmadan
   * yedek geri alınamaz, SITE_ADRESI olmadan site haritası yanlış adres
   * yayınlar.
   */
  it('üretim örneği kritik değişkenleri içerir', () => {
    const belgeli = belgelenenler('.env.production.example')
    for (const ad of [
      'BAKIM_ANAHTARI',
      'RESTIC_REPOSITORY',
      'RESTIC_PASSWORD',
      'SITE_ADRESI',
      'PAYLOAD_SECRET',
      'DATABASE_URI',
      'NEXT_PUBLIC_SERVER_URL',
    ]) {
      expect(belgeli.has(ad), `.env.production.example içinde ${ad} yok`).toBe(true)
    }
  })

  /**
   * ─────────────────────────────────────────────────────────────────────
   * ⚠️ `NEXT_PUBLIC_` OKUMASI YASAK — HARİTAYI ÜRETİMDE KAPATAN HATA BUYDU.
   *
   * Next.js `NEXT_PUBLIC_` önekli değişkenleri **derleme anında** paketin
   * içine gömer. Üretim imajımız GitHub Actions'ta derleniyor ve orada bu
   * değişkenlerin hiçbiri tanımlı değil (`Dockerfile`da `ARG` yok,
   * `imaj.yml`de `build-args` yok). Sonuç: yayına giden pakette **dokuz
   * değişken birden boş dizeydi.**
   *
   * `compose.prod.yml` üçünü çalışma zamanı `environment:` olarak
   * veriyordu — çoktan derlenmiş bir pakete bunun hiçbir etkisi yok.
   * Yani dosya çalışıyormuş gibi görünüyor, çalışmıyordu.
   *
   * 12 Ağustos 2026'da bulunanlar: `/harita` kalıcı boş durumda (OSM'den
   * içe aktarılan POI verisinin görüneceği tek yer), Turnstile bot koruması
   * kapalı, Umami analitiği hiç yüklenmiyor, Bunny videoları
   * "yapılandırılmadı", WhatsApp/telefon/e-posta yedekleri boş.
   *
   * Hepsi ön eksiz çalışma zamanı adlarına taşındı. Değer artık `.env`
   * içinde yaşıyor — `PAYLOAD_SECRET`in yanında, Aslıhan'ın zaten
   * düzenlediği tek dosyada — ve imajı yeniden derlemeden değişebiliyor.
   *
   * ⚠️ Bu testi susturmanın doğru yolu muafiyet eklemek DEĞİL, değişkeni
   * ön eksiz adlandırıp sunucuda okumak, değeri istemci bileşenine prop
   * olarak indirmektir. Örnek: `lib/harita/sunucu.ts` → `HaritaSahnesi`.
   * ─────────────────────────────────────────────────────────────────────
   */
  it('kod derleme anına gömülen NEXT_PUBLIC_ değişkeni okumuyor', () => {
    /**
     * Tek muafiyet: `site.ts` içindeki derleme zamanı yedeği.
     *
     * Asıl kaynak ön eksiz `SITE_ADRESI` ve çalışma zamanında okunuyor;
     * bunlar yalnızca o tanımsızken devreye giren yedekler. Gerekçe
     * `src/lib/site.ts` içinde yazılı.
     */
    const MUAF_DOSYA = 'src/lib/site.ts'

    const ihlaller: string[] = []
    const dosyalar = [
      ...kaynakDosyalari(join(KOK, 'src')),
      ...kaynakDosyalari(join(KOK, 'scripts')),
    ]

    for (const dosya of dosyalar) {
      const goreli = dosya.replace(`${KOK}/`, '')
      if (goreli === MUAF_DOSYA) continue

      const icerik = readFileSync(dosya, 'utf8')
      for (const eslesme of icerik.matchAll(/process\.env\.(NEXT_PUBLIC_[A-Z0-9_]+)/g)) {
        ihlaller.push(`${goreli} → ${eslesme[1]}`)
      }
    }

    expect(
      ihlaller.sort(),
      'Bu değişkenler DERLEME ANINDA gömülür ve üretim imajı onlar tanımsızken ' +
        'derleniyor — yani yayında BOŞ olurlar, hata vermeden.\n' +
        'Çözüm: öneki kaldırın (ön eksiz adlar çalışma zamanında okunur), ' +
        'sunucuda okuyun ve istemci bileşenine prop olarak geçirin.\n' +
        `İhlaller:\n  ${ihlaller.join('\n  ')}`,
    ).toEqual([])
  })

  /**
   * ─────────────────────────────────────────────────────────────────────
   * ⚠️ BELGELENMİŞ OLMAK YETMEZ — DEĞİŞKEN KABA ULAŞMALI.
   *
   * Yukarıdaki test `.env.production.example` ile kodu karşılaştırıyor.
   * Ama üretimde uygulama bir kapta çalışıyor ve kap yalnızca
   * `compose.prod.yml` içinde `environment:` altında SAYILAN değişkenleri
   * görüyor. Sunucudaki `.env` dosyasında bir değer olması tek başına
   * hiçbir şey ifade etmez.
   *
   * Bu boşluk gerçekti: `MAPTILER_ANAHTARI` `.env`de yazılıydı ama compose
   * onu uygulamaya hiç geçirmiyordu. Belge testi yeşildi, harita ölüydü.
   * ─────────────────────────────────────────────────────────────────────
   */
  it('kodun okuduğu her çalışma zamanı değişkeni compose ile kaba ulaşıyor', () => {
    /**
     * Kaba ulaşması BEKLENMEYENLER — her satırın gerekçesi yazılı.
     */
    const MUAF: Record<string, string> = {
      NODE_ENV: 'compose zaten `production` veriyor; kod okuması dallanma için.',
      PORT: 'Dockerfile `ENV PORT=3000` veriyor.',
      HOSTNAME: 'Dockerfile `ENV HOSTNAME=0.0.0.0` veriyor.',
      NEXT_TELEMETRY_DISABLED: 'Dockerfile veriyor.',
      MEDYA_DIZINI: 'compose sabit değer veriyor (aşağıda zaten var).',
      TEMIZLE: 'Yalnızca `pnpm seed` bayrağı; tohumlama üretimde çalışmaz.',
      DEV_IZINLI_KAYNAKLAR: 'Yalnızca `pnpm dev`; üretim derlemesinde okunmaz.',
      GITHUB_ACTIONS: 'CI koşumu verir.',
      GITHUB_STEP_SUMMARY: 'CI koşumu verir.',
      NEXT_PUBLIC_SITE_ADRESI: 'Derleme zamanı yedeği; çalışma zamanında okunmaz.',
      NEXT_PUBLIC_SERVER_URL: 'Derleme zamanı yedeği; asıl kaynak SITE_ADRESI.',
      ANTHROPIC_API_KEY:
        'AI arama avukat metinleri gelene kadar ERTELENDİ (KVKK: sorgu yurt ' +
        'dışına gidiyor). Anahtarı kaba hiç sokmamak ikinci kapı.',
      ANTHROPIC_ARAMA_MODELI: 'Yukarıdakiyle aynı sebep.',
    }

    const okunan = okunanDegiskenler()

    const compose = readFileSync(join(KOK, 'docker', 'compose.prod.yml'), 'utf8')
    // `uygulama` servisinin `environment:` bloğu altı boşlukla girintili.
    const verilen = new Set(
      [...compose.matchAll(/^ {6}([A-Z0-9_]+):/gm)].map((eslesme) => eslesme[1]),
    )

    const ulasmayan = [...okunan].filter((ad) => !verilen.has(ad) && !(ad in MUAF)).sort()

    expect(
      ulasmayan,
      'Kod bu değişkenleri okuyor ama `docker/compose.prod.yml` onları ' +
        'uygulama kabına geçirmiyor — sunucudaki `.env` içinde dolu olsalar ' +
        'bile kabın içinde TANIMSIZ olurlar.\n' +
        'Çözüm: compose `environment:` bloğuna ekleyin, ya da gerçekten ' +
        'gerekmiyorsa bu testteki MUAF listesine gerekçesiyle yazın.\n' +
        `Ulaşmayanlar:\n  ${ulasmayan.join('\n  ')}`,
    ).toEqual([])
  })

  /**
   * ⚠️ Üretim örneği, uygulamanın kabın İÇİNDEN bağlanacağını yansıtmalı.
   * `localhost` yazan bir örnek dosyayı kopyalayan kişi `ECONNREFUSED`
   * alır ve sebebini bulması saatler sürer.
   */
  it('üretim örneğinde veritabanı adresi servis adını kullanır', () => {
    const icerik = readFileSync(join(KOK, '.env.production.example'), 'utf8')
    const satir = icerik.split('\n').find((s) => s.startsWith('DATABASE_URI='))

    expect(satir).toBeDefined()
    expect(satir).toContain('@postgres:5432')
    expect(satir).not.toContain('localhost')
    expect(satir).not.toContain('127.0.0.1')
  })
})
