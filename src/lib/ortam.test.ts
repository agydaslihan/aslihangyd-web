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
