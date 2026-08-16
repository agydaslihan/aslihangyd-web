import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Özel panel bileşenlerinin Payload'ın içe aktarma haritasında olduğunu sınar.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: PANEL SESSİZCE BOŞ SAYFA DÖNDÜ.
 *
 * 16 Ağustos 2026'da "Marka ve Görünüm" globali eklendi ve dört özel
 * bileşen tanımlandı (`RenkAlani`, `AcikPaletPaneli`, `KoyuPaletPaneli`,
 * `MarkaOzeti`). Ama `payload generate:importmap` çalıştırılmadı.
 *
 * Sonuç: "Renkler — açık tema" ve "Renkler — koyu tema" sekmelerinde
 * **yalnızca başlık göründü.** On renk alanının hiçbiri render edilmedi,
 * kaydetme çalışmadı. Panel kullanılamaz hâldeydi.
 *
 * ⚠️ HİÇBİR ŞEY HATA VERMEDİ:
 *  · `pnpm typecheck` geçti — bileşenler geçerli TypeScript
 *  · `pnpm lint` geçti
 *  · `pnpm test` geçti
 *  · `pnpm build` geçti — Next.js bu dosyaları zaten derliyordu
 *  · CI'nin dört kontrolü de yeşildi
 *
 * Çünkü içe aktarma haritası bir KOD dosyası değil, bir KAYIT dosyası:
 * Payload'ın çalışma zamanında "bu yol hangi bileşen" sorusuna cevabı.
 * Kayıt eksikse Payload bileşeni bulamıyor ve sessizce hiçbir şey
 * çizmiyor — istisna bile fırlatmıyor.
 *
 * Tarayıcı konsolunda görülen
 * "Failed to load module script: non-JavaScript MIME type text/html"
 * hatası da aynı ailedendi: var olmayan bir modül isteniyor, sunucu 404
 * HTML döndürüyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ BU TEST BİR DERLEME ADIMININ YERİNE GEÇİYOR VE BU BİLİNÇLİ.
 *
 * `generate:importmap`i derlemeye eklemek de bir seçenekti; eklenmedi.
 * Sebep: o zaman depodaki dosya ile üretilen dosya sessizce ayrışabilir ve
 * "yerelde çalışıyor, üretimde çalışmıyor" sınıfına yeni bir örnek eklerdi.
 * Harita depoda duruyor, gözle görülüyor ve bu test onu koddan sapmaya
 * karşı koruyor.
 *
 * Kırıldığında yapılacak: `pnpm payload generate:importmap`
 */

const KOK = path.resolve(path.join(import.meta.dirname, '..', '..'))
const HARITA_YOLU = path.join(KOK, 'app/(payload)/admin/importMap.js')

/** Yapılandırma dosyalarında geçen özel bileşen yolları. */
function basvurulanBilesenler(): string[] {
  const bulunan = new Set<string>()

  function tara(dizin: string): void {
    for (const ad of readdirSync(dizin)) {
      if (ad === 'node_modules' || ad === '.next') continue
      const yol = path.join(dizin, ad)

      if (statSync(yol).isDirectory()) {
        // ⚠️ Panel rotalarının kendisi taranmıyor: `importMap.js` orada
        // duruyor ve kendi kendini başvuru sayardı.
        if (yol.includes(`app${path.sep}(payload)`)) continue
        tara(yol)
        continue
      }

      if (!/\.(ts|tsx)$/.test(ad)) continue
      if (ad.endsWith('.test.ts') || ad.endsWith('.test.tsx')) continue

      const icerik = readFileSync(yol, 'utf8')
      // Payload bileşen yolları daima `dosya#dışaAktarım` biçiminde.
      for (const eslesme of icerik.matchAll(/'(@\/components\/[^']+#[A-Za-z_]\w*)'/g)) {
        const deger = eslesme[1]
        if (deger !== undefined) bulunan.add(deger)
      }
    }
  }

  tara(KOK)
  return [...bulunan].sort()
}

describe('panel içe aktarma haritası', () => {
  const harita = readFileSync(HARITA_YOLU, 'utf8')
  const basvurulan = basvurulanBilesenler()

  it('taranan yapılandırmalarda özel bileşen bulundu', () => {
    // Test kendi kendini boşa çıkarmasın: hiç bileşen bulunamazsa
    // aşağıdaki asıl kontrol anlamsız biçimde yeşil geçerdi.
    expect(basvurulan.length).toBeGreaterThan(10)
  })

  /**
   * ⚠️ ASIL KONTROL. Yapılandırmada başvurulan her yol haritada olmalı;
   * yoksa Payload o bileşeni bulamaz ve **sessizce hiçbir şey çizmez**.
   */
  it('başvurulan her özel bileşen haritada kayıtlı', () => {
    const eksikler = basvurulan.filter((yol) => !harita.includes(`"${yol}"`))

    expect(
      eksikler,
      'Bu bileşenler yapılandırmada tanımlı ama içe aktarma haritasında yok. ' +
        'Payload onları bulamaz ve ilgili panel alanı BOŞ görünür — hata vermez.\n' +
        'Çözüm: pnpm payload generate:importmap\n' +
        `Eksikler:\n  ${eksikler.join('\n  ')}`,
    ).toEqual([])
  })

  /**
   * ⚠️ TERS YÖN DE ÖNEMLİ AMA HATA DEĞİL.
   *
   * Haritada olup yapılandırmada geçmeyen bir giriş, silinmiş bir
   * bileşenin artığı olabilir. Derlemeyi kırmaz ama var olmayan bir
   * dosyaya `import` yazarsa kırar — o yüzden dosya varlığı sınanıyor.
   */
  it('haritadaki her bileşen dosyası gerçekten var', () => {
    const eksikDosyalar: string[] = []

    for (const eslesme of harita.matchAll(/from '@\/([^']+)'/g)) {
      const goreli = eslesme[1]
      if (goreli === undefined) continue

      const adaylar = ['.ts', '.tsx', '/index.ts', '/index.tsx'].map((son) =>
        path.join(KOK, `${goreli}${son}`),
      )
      const varMi = adaylar.some((aday) => {
        try {
          return statSync(aday).isFile()
        } catch {
          return false
        }
      })

      if (!varMi) eksikDosyalar.push(goreli)
    }

    expect(
      eksikDosyalar,
      'İçe aktarma haritası var olmayan dosyalara başvuruyor; panel modül ' +
        'yüklenirken 404 alır ve "non-JavaScript MIME type text/html" hatası verir.\n' +
        `Eksikler:\n  ${eksikDosyalar.join('\n  ')}`,
    ).toEqual([])
  })

  /**
   * ⚠️ Haritanın kendisi elle düzenlenmemeli — üretilen bir dosya.
   * Başlıktaki uyarı kaybolduysa biri onu elle kurcalamış olabilir.
   */
  it('harita üretilmiş dosya olarak duruyor', () => {
    expect(harita).toContain('importMap')
  })
})
