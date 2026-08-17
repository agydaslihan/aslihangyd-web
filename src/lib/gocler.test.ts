import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Göç dosyalarının kendi içinde tutarlı olduğunu sınar.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: AYNI SÜTUN İKİ KEZ EKLENDİ VE DAĞITIMI KIRACAKTI.
 *
 * 16 Ağustos 2026'da iki göç PARALEL DALLARDA üretildi:
 * `poi_mahalle_yaklasik` (#58) ve `hero_slider` (#59). `migrate:create`
 * yeni göçü bir öncekinin `.json` şema fotoğrafına göre çıkarıyor;
 * `hero_slider` fotoğrafı #58 birleşmeden önce alındığı için
 * `mahalle_yaklasik` sütununu bilmiyordu.
 *
 * Sonuç: ondan SONRA üretilen her göç o sütunu "eksik" sanıp yeniden
 * ekledi. Üretimde:
 *
 *     column "mahalle_yaklasik" of relation "ilgi_noktalari" already exists
 *
 * ve §5.3'ün göç adımı yarıda durur; site yeni şemayla eşleşmeyen bir kodla
 * açılırdı.
 *
 * Aynı tuzağa İKİ KEZ düşüldü (marka başlık eylemi, hakkımızda içeriği).
 * İkisi de yerelde `pnpm payload migrate` çalıştırıldığı için yakalandı —
 * ama o adım unutulabilir ve CI göç koşturmuyor. Bu test onu kapatıyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ Bu test SQL'i ayrıştırmıyor, DESEN arıyor. Amaç eksiksiz bir doğrulama
 * değil; tam olarak yaşanan arızayı bir daha yaşamamak.
 */

/**
 * ⚠️ BU TEST `src/migrations/` İÇİNDE DURAMAZ.
 *
 * İlk hâli oradaydı ve `pnpm payload migrate` komutunu TÜMDEN kırdı:
 * Payload göç dizinindeki HER dosyayı içe aktarıyor, `.test.ts` ayrımı
 * yapmıyor. Test dosyası yüklenince vitest koşum bağlamı dışında
 * `describe()` çağrılıyor ve komut şu satırla ölüyordu:
 *
 *     TypeError: Cannot read properties of undefined (reading 'config')
 *
 * Yani göçleri koruyacak test, göç adımının kendisini imkânsız hâle
 * getiriyordu — CLAUDE.md §5.3'ün koşulsuz zorunlu adımını. Dosya bu
 * yüzden `src/lib/` altında; göç dizinine yalnızca okumak için bakıyor.
 */
const DIZIN = path.resolve(import.meta.dirname, '..', 'migrations')

interface Gocs {
  ad: string
  icerik: string
}

function gocleriOku(): Gocs[] {
  return readdirSync(DIZIN)
    .filter((ad) => /^\d{8}_\d{6}_.+\.ts$/.test(ad))
    .sort()
    .map((ad) => ({ ad, icerik: readFileSync(path.join(DIZIN, ad), 'utf8') }))
}

/** `ALTER TABLE "x" ADD COLUMN "y"` çiftlerini çıkarır. */
function eklenenSutunlar(icerik: string): string[] {
  const up = icerik.slice(
    icerik.indexOf('export async function up'),
    icerik.indexOf('export async function down'),
  )
  return [...up.matchAll(/ALTER TABLE "(\w+)" ADD COLUMN "(\w+)"/g)].map((m) => `${m[1]}.${m[2]}`)
}

/** `CREATE TABLE "x"` adlarını çıkarır. */
function olusturulanTablolar(icerik: string): string[] {
  const up = icerik.slice(
    icerik.indexOf('export async function up'),
    icerik.indexOf('export async function down'),
  )
  return [...up.matchAll(/CREATE TABLE "(\w+)"/g)].map((m) => m[1] as string)
}

describe('göç dosyaları', () => {
  const gocler = gocleriOku()

  it('göç dosyaları bulundu', () => {
    // Test kendi kendini boşa çıkarmasın.
    expect(gocler.length).toBeGreaterThan(5)
  })

  /**
   * ⚠️ ASIL KONTROL. Aynı sütunu iki göç eklerse ikincisi
   * `column … already exists` ile patlar ve dağıtım yarıda kalır.
   */
  it('aynı sütun iki kez eklenmiyor', () => {
    const gorulen = new Map<string, string>()
    const cakismalar: string[] = []

    for (const goc of gocler) {
      for (const sutun of eklenenSutunlar(goc.icerik)) {
        const once = gorulen.get(sutun)
        if (once !== undefined) {
          cakismalar.push(`${sutun} — önce ${once}, sonra ${goc.ad}`)
        } else {
          gorulen.set(sutun, goc.ad)
        }
      }
    }

    expect(
      cakismalar,
      'Bu sütunlar birden çok göçte ekleniyor. Boş bir veritabanında ikinci ekleme ' +
        '"column … already exists" verir ve göç adımı yarıda durur.\n' +
        'Sebebi genelde paralel dallarda üretilmiş göçlerin bayat şema fotoğrafıdır; ' +
        'fazladan ALTER satırını elle silin.\n' +
        `Çakışmalar:\n  ${cakismalar.join('\n  ')}`,
    ).toEqual([])
  })

  /** Aynı gerekçe: iki kez `CREATE TABLE` de dağıtımı durdurur. */
  it('aynı tablo iki kez oluşturulmuyor', () => {
    const gorulen = new Map<string, string>()
    const cakismalar: string[] = []

    for (const goc of gocler) {
      for (const tablo of olusturulanTablolar(goc.icerik)) {
        const once = gorulen.get(tablo)
        if (once !== undefined) cakismalar.push(`${tablo} — önce ${once}, sonra ${goc.ad}`)
        else gorulen.set(tablo, goc.ad)
      }
    }

    expect(cakismalar).toEqual([])
  })

  /**
   * ⚠️ SIRA ARTIK YALNIZCA DOSYA ADINDAN GELİYOR.
   *
   * Eskiden burada `index.ts` sırasının dosya adı sırasıyla aynı olduğu
   * denetleniyordu. O dosya depodan çıktı: Payload ona ihtiyaç duymuyor
   * (göçleri dizinden okuyor) ve her göçte sonuna satır eklendiği için
   * göç içeren her ikinci PR'da çakışıyordu.
   *
   * Bunun bedeli, sıralamanın TAMAMEN dosya adına bağlanması. Damgası
   * bozuk ya da tekrar eden bir dosya, göçleri sessizce yanlış sırada
   * çalıştırır — şemayı hiç geçmediği bir durumdan geçirir. Denetim o
   * yüzden buraya taşındı.
   */
  it('her göç dosyasının damgası benzersiz ve sıralanabilir', () => {
    const damgalar = gocler.map((g) => g.ad.match(/^(\d{8}_\d{6})_/)?.[1] ?? null)

    expect(
      gocler.filter((_, i) => damgalar[i] === null).map((g) => g.ad),
      'Göç dosyası adı `YYYYAAGG_SSDDss_ad.ts` kalıbında olmalı — sıralama buradan geliyor.',
    ).toEqual([])

    const dolu = damgalar.filter((d): d is string => d !== null)
    expect(new Set(dolu).size, 'Aynı damgayı taşıyan iki göç var; sıraları belirsiz.').toBe(
      dolu.length,
    )

    // Dizin okuması alfabetik; damga önde olduğu için bu kronolojik demek.
    expect([...dolu].sort()).toEqual(dolu)
  })
})
