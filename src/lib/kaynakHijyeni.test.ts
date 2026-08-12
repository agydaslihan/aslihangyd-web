import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Kaynak dosyaların düz metin kaldığını sınar.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: TEK BİR HAM BAYT, DOSYAYI ARAÇLARA GÖRÜNMEZ YAPTI.
 *
 * `Harita3B.tsx` içinde MapLibre ifadesinde "hiçbir zaman eşleşme"
 * nöbetçisi olarak **ham bir NUL baytı** yazılmıştı. Çalışma zamanında
 * hiçbir sorun yoktu ve derleme geçiyordu. Ama:
 *
 *  · `file` dosyayı "data" olarak görüyordu — metin değil, ikili.
 *  · **`grep` 684 satırın tamamını sessizce atlıyordu.** Hata vermeden,
 *    "eşleşme yok" diyerek.
 *
 * 12 Ağustos 2026'daki ortam denetiminde tam olarak buna yakalandık:
 * `grep -rn "MAPTILER" src/` yalnızca `lib/harita/ayarlar.ts` döndürdü ve
 * "anahtar istemci tarafında kullanılmıyor" sonucuna varıldı. Oysa
 * `Harita3B.tsx` `stilAdresi()` çağırıyordu — grep onu okumamıştı bile.
 * Yanlış teşhis, yanlış düzeltmeye götürüyordu.
 *
 * `scripts/lighthouse-ozet.mjs` içinde de aynı desen vardı (bileşik anahtar
 * ayracı). İkisi de kaçış dizisine çevrildi: çalışma zamanı değeri birebir
 * aynı, dosya düz metne döndü.
 *
 * ⚠️ Bu testi susturmanın doğru yolu muafiyet eklemek DEĞİL, karakteri
 * kaçış dizisiyle yazmaktır: ters bölü, u, 0, 0, 0, 0 — altı ASCII karakter.
 * Kaçış dizisi aynı değeri üretir ve hiçbir aracın gözünü bağlamaz.
 * ─────────────────────────────────────────────────────────────────────────
 */

const KOK = join(import.meta.dirname, '..', '..')

/**
 * Taranmayan dizinler.
 *
 * ⚠️ Her satırın gerekçesi yazılı olmalı; gerekçesiz muafiyet testi
 * anlamsızlaştırır.
 */
const ATLANAN_DIZINLER = new Set([
  'node_modules',
  '.next',
  '.git',
  // Font dosyaları gerçekten ikili; `.woff2` zaten taranan uzantılarda değil
  // ama dizini hiç gezmemek taramayı hızlandırıyor.
  'fonts',
  // Yüklenen görseller — depoya girmez, geliştiricide durabilir.
  'medya',
])

/**
 * Metin olarak durması gereken uzantılar.
 *
 * Kaynak kod, yapılandırma ve belgeler. Hepsinin ortak yanı: bir insanın
 * `grep`, `git diff` ya da kod incelemesiyle okuyabilmesi gerekiyor.
 */
const METIN_UZANTILARI = /\.(ts|tsx|mjs|js|json|md|yml|yaml|css|sql)$/

/**
 * İzin verilen kontrol karakterleri: sekme, satır sonu, satır başı.
 *
 * Bunlar metin dosyalarının normal yapı taşları; araçlar hepsini bilir.
 */
const IZINLI_KONTROL = new Set([9, 10, 13])

function metinDosyalari(dizin: string, biriktir: string[] = []): string[] {
  for (const ad of readdirSync(dizin)) {
    if (ATLANAN_DIZINLER.has(ad)) continue
    const yol = join(dizin, ad)
    if (statSync(yol).isDirectory()) metinDosyalari(yol, biriktir)
    else if (METIN_UZANTILARI.test(ad)) biriktir.push(yol)
  }
  return biriktir
}

interface Bulgu {
  dosya: string
  kod: number
  satir: number
}

function hamKontrolKarakterleri(dosyalar: string[]): Bulgu[] {
  const bulgular: Bulgu[] = []

  for (const dosya of dosyalar) {
    const icerik = readFileSync(dosya, 'utf8')
    for (let i = 0; i < icerik.length; i++) {
      const kod = icerik.charCodeAt(i)
      if (kod >= 32 || IZINLI_KONTROL.has(kod)) continue

      bulgular.push({
        dosya: dosya.replace(`${KOK}/`, ''),
        kod,
        satir: icerik.slice(0, i).split('\n').length,
      })
    }
  }

  return bulgular
}

describe('kaynak dosyalar düz metin', () => {
  const dosyalar = metinDosyalari(join(KOK, 'src')).concat(
    metinDosyalari(join(KOK, 'scripts')),
    metinDosyalari(join(KOK, 'docker')),
  )

  it('taranacak dosya bulunuyor', () => {
    // ⚠️ Tarama sessizce boşalırsa test hep yeşil kalır ve hiçbir şey korumaz.
    expect(dosyalar.length).toBeGreaterThan(100)
  })

  it('kaynakta ham kontrol karakteri yok', () => {
    const bulgular = hamKontrolKarakterleri(dosyalar)

    const rapor = bulgular.map(
      ({ dosya, kod, satir }) =>
        `${dosya}:${satir} → U+${kod.toString(16).padStart(4, '0').toUpperCase()}`,
    )

    expect(
      rapor,
      'Bu dosyalarda ham kontrol karakteri var. Böyle bir dosyayı `grep` ' +
        'İKİLİ sayar ve TAMAMINI sessizce atlar — arama "eşleşme yok" der, ' +
        'oysa dosya okunmamıştır.\n' +
        'Düzeltme: karakteri kaçış dizisiyle yazın (örn. ters bölü + u0000). ' +
        'Çalışma zamanı değeri aynı kalır, dosya düz metne döner.\n' +
        `Bulunanlar:\n  ${rapor.join('\n  ')}`,
    ).toEqual([])
  })
})
