import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: `docs/ILERLEME.md` HER PR'DA ÇAKIŞIYORDU.
 *
 * Sebep içerik değil ŞEKİLDİ: her dal aynı yere — dosyanın sonuna —
 * ekliyordu. Aynı satır aralığına iki farklı ekleme yapan iki dal, git'in
 * üç yollu birleştirmesinde DAİMA çakışır. Dört PR'lık bir turda bu, her
 * turda tekrarlayan elle iş demekti ve maliyeti birikiyordu.
 *
 * ⚠️ Kaydı dosyanın BAŞINA almak bunu çözmezdi — yalnızca çakışmanın
 * yerini değiştirirdi. Git satır aralığına bakar, dosyadaki konuma değil:
 * 1. satıra ekleyen iki dal da sona ekleyen ikisi gibi çakışır.
 *
 * Çakışmayı gerçekten ortadan kaldıran tek şey iki dalın AYNI DOSYAYA
 * dokunmaması. Bu yüzden her kayıt kendi dosyasında.
 *
 * ⚠️ Elle tutulan bir dizin de eklenmedi: her PR'da bir satır alacağı için
 * çakışmayı geri getirirdi. Dizin, dosya adlarının kendisi.
 *
 * Bu test kuralı ayakta tutuyor. Kural yazılı bir gelenek olarak
 * bırakılsaydı ilk yoğun turda unutulurdu — nitekim "ILERLEME.md'yi
 * güncelle" alışkanlığı tam da böyle yerleşmişti.
 * ─────────────────────────────────────────────────────────────────────────
 */

const KOK = path.resolve(path.join(import.meta.dirname, '..', '..', '..'))
const ARSIV = path.join(KOK, 'docs', 'ILERLEME.md')
const DIZIN = path.join(KOK, 'docs', 'ilerleme')

const NOBETCI = 'ARSIV-SONU'

describe('ilerleme kaydı arşivi', () => {
  const arsiv = readFileSync(ARSIV, 'utf8')

  /**
   * ⚠️ ASIL DENETİM BU.
   *
   * Nöbetçi satırı dosyanın SONUNDA olmalı. Biri eski alışkanlıkla sona
   * ekleme yaparsa nöbetçi son satır olmaktan çıkar ve test kırılır —
   * çakışma bir sonraki PR'da patlamadan önce, kendi PR'ında.
   */
  it('arşivin sonuna ekleme yapılmamış', () => {
    const satirlar = arsiv.trimEnd().split('\n')
    const sonNobetci = satirlar.findLastIndex((satir) => satir.includes(NOBETCI))

    expect(sonNobetci, `Arşivde "${NOBETCI}" nöbetçisi bulunamadı.`).toBeGreaterThan(-1)
    expect(
      satirlar.length - 1 - sonNobetci,
      'docs/ILERLEME.md ARŞİVDİR, sonuna ekleme yapılmaz. Yeni kaydı ' +
        'docs/ilerleme/YYYY-AA-GG-kisa-ad.md dosyasına yazın — bu dosya her PR’da ' +
        'çakıştığı için bölündü.',
    ).toBeLessThanOrEqual(2)
  })

  it('arşiv nereye yazılacağını söylüyor', () => {
    expect(arsiv).toContain('docs/ilerleme/')
    expect(arsiv).toContain('ARTIK EKLEME YAPILMIYOR')
  })
})

describe('ilerleme kayıtları', () => {
  const dosyalar = readdirSync(DIZIN).filter((ad) => ad.endsWith('.md') && ad !== 'OKUBENI.md')

  it('en az bir kayıt var', () => {
    expect(dosyalar.length).toBeGreaterThan(0)
  })

  /**
   * ⚠️ Ad kalıbı zorunlu, çünkü DİZİN YOK: sıralamayı dosya adının
   * kendisi taşıyor. Tarihi önde olmayan bir dosya listede yanlış yere
   * düşer ve kronoloji sessizce bozulur.
   */
  it('dosya adları YYYY-AA-GG-kisa-ad.md kalıbında', () => {
    const bozuk = dosyalar.filter((ad) => !/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.md$/.test(ad))
    expect(
      bozuk,
      'Kayıt dosyası adı `YYYY-AA-GG-kisa-ad.md` olmalı — sıralama dosya adından geliyor.',
    ).toEqual([])
  })

  /** Her kayıt kendini tanıtsın: başlıksız bir dosya listede işe yaramaz. */
  it('her kayıt bir başlıkla açılıyor', () => {
    const basliksiz = dosyalar.filter(
      (ad) => !readFileSync(path.join(DIZIN, ad), 'utf8').trimStart().startsWith('# '),
    )
    expect(basliksiz).toEqual([])
  })
})
