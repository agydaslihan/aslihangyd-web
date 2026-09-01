import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { sayiyaCevir } from '@/lib/csv/ayristir'

import { panelSayisiCoz, panelSayisiYaz, TURKCE_SAYI_ALANLARI } from './sayiAlani'

const oku = (goreli: string) => readFileSync(join(process.cwd(), 'src', goreli), 'utf-8')

describe('panel sayı çözümü', () => {
  /**
   * ⚠️ ASIL HATA BU SATIRDA. 31 Ağustos 2026'da Alipaşa'nın m² satışı
   * "39.704" yazılmış, veritabanına 39,704 girmişti. Tarayıcının sayı
   * girdisi noktayı ondalık sayıyordu.
   */
  it('Türkçe binlik ayırıcıyı binlik okur', () => {
    expect(panelSayisiCoz('39.704').deger).toBe(39704)
    expect(panelSayisiCoz('21.302').deger).toBe(21302)
    expect(panelSayisiCoz('10.918').deger).toBe(10918)
    expect(panelSayisiCoz('5.650.000').deger).toBe(5650000)
  })

  /** ⚠️ Ters yön: Chrome `type="number"` girdisinde virgülü hiç kabul etmiyor. */
  it('Türkçe ondalık virgülü ondalık okur', () => {
    expect(panelSayisiCoz('2,55').deger).toBeCloseTo(2.55, 10)
    expect(panelSayisiCoz('-3,4').deger).toBeCloseTo(-3.4, 10)
  })

  it('ayırıcısız ve İngilizce biçimi de okur', () => {
    expect(panelSayisiCoz('39704').deger).toBe(39704)
    expect(panelSayisiCoz('1,234.56').deger).toBeCloseTo(1234.56, 10)
  })

  it('para simgesi ve boşluk temizlenir', () => {
    expect(panelSayisiCoz(' 5.650.000 ₺ ').deger).toBe(5650000)
  })

  it('boş girdi null — hata değil', () => {
    expect(panelSayisiCoz('')).toEqual({ deger: null, hata: null })
    expect(panelSayisiCoz('   ')).toEqual({ deger: null, hata: null })
  })

  it('sayı olmayan metin hata verir, değeri null yapar', () => {
    const sonuc = panelSayisiCoz('abc')
    expect(sonuc.deger).toBeNull()
    expect(sonuc.hata).toMatch(/okunamadı/)
  })

  /**
   * ⚠️ PANEL, İÇE AKTARICIDAN DAHA SIKI. `sayiyaCevir` "1..2" için 12
   * döndürür — bin satırlık CSV tek bozuk hücre yüzünden durmasın diye.
   * Panelde tek alan yazılıyor ve kullanıcı ekranın başında; hatayı
   * şimdi göstermek en ucuz an.
   */
  it('bozuk ayırıcı dizilişi reddedilir (içe aktarıcıdan farklı)', () => {
    expect(sayiyaCevir('1..2')).toBe(12)
    expect(panelSayisiCoz('1..2').deger).toBeNull()
    expect(panelSayisiCoz('.5').deger).toBeNull()
    expect(panelSayisiCoz('5.').deger).toBeNull()
  })

  /**
   * ⚠️ TEK AYRIŞTIRICI. Elle yazılan "39.704" ile CSV'den gelen "39.704"
   * aynı sayıyı üretmek zorunda; iki ayrı ayrıştırıcı zamanla ayrışır.
   */
  it('geçerli girdilerde içe aktarıcıyla aynı sonucu verir', () => {
    for (const ham of ['39.704', '2,55', '1,234.56', '5.650.000', '-3,4', '42']) {
      expect(panelSayisiCoz(ham).deger).toBe(sayiyaCevir(ham))
    }
  })
})

describe('panel sayı yazımı', () => {
  /**
   * ⚠️ BU SATIR GERİ BİLDİRİMİN TAMAMI. Bindebir kaydedilen rakamın tek
   * kusuru ekranda yanlış görünmemesiydi; binlik ile ondalık okuma burada
   * farklı görünmek zorunda.
   */
  it('binlik ile ondalık okuma ekranda AYRIŞIR', () => {
    expect(panelSayisiYaz(39704)).toBe('39.704')
    expect(panelSayisiYaz(39.704)).toBe('39,704')
  })

  it('ondalık basamak kırpılmaz', () => {
    expect(panelSayisiYaz(2.55)).toBe('2,55')
  })

  it('değer yoksa boş dize', () => {
    expect(panelSayisiYaz(null)).toBe('')
    expect(panelSayisiYaz(undefined)).toBe('')
    expect(panelSayisiYaz(Number.NaN)).toBe('')
  })
})

describe('alanlara bağlanma', () => {
  const mahalleler = oku('collections/Mahalleler.ts')
  const ilanlar = oku('collections/Ilanlar.ts')

  it('bileşen her iki koleksiyonda da kullanılıyor', () => {
    expect(mahalleler).toContain('TurkceSayiAlani')
    expect(ilanlar).toContain('TurkceSayiAlani')
  })

  /** 31 Ağustos'ta bozulan dört alan. */
  it.each(['ortalamaM2Satis', 'ortalamaKira', 'nufus'])('%s Türkçe girdiyle çiziliyor', (alan) => {
    const konum = mahalleler.indexOf(`name: '${alan}'`)
    expect(konum).toBeGreaterThan(-1)
    expect(mahalleler.slice(konum, konum + 600)).toContain('TurkceSayiAlani')
  })

  it('aidat Türkçe girdiyle çiziliyor', () => {
    const konum = ilanlar.indexOf("name: 'aidat'")
    expect(konum).toBeGreaterThan(-1)
    expect(ilanlar.slice(konum, konum + 600)).toContain('TurkceSayiAlani')
  })

  /**
   * ⚠️ Kancayla hesaplanan alan insan tarafından yazılmıyor; oraya
   * yazılabilir bir girdi koymak kullanıcının yazdığını sessizce
   * kaybettirir.
   */
  it('hesaplanan kira çarpanına BAĞLANMIYOR', () => {
    const konum = ilanlar.indexOf("name: 'kiraCarpani'")
    const govde = ilanlar.slice(konum, konum + 600)
    expect(govde).toContain('readOnly: true')
    expect(govde.slice(0, govde.indexOf('brutGetiri'))).not.toContain('TurkceSayiAlani')
  })

  it('listedeki her alan gerçekten var', () => {
    for (const alan of TURKCE_SAYI_ALANLARI) {
      expect(mahalleler.includes(`name: '${alan}'`) || ilanlar.includes(`name: '${alan}'`)).toBe(
        true,
      )
    }
  })
})

describe('bileşen sözleşmesi', () => {
  const bilesen = oku('components/panel/TurkceSayiAlani.tsx')

  /**
   * ⚠️ KÖK NEDENİ KAPATAN ŞEY `type="text"`. `inputMode="decimal"`
   * yalnızca mobil klavyeyi seçer; masaüstünde `type="number"` davranışı
   * sürer ve nokta yine ondalık sayılır.
   */
  it('girdi type="text" — number DEĞİL', () => {
    // Yalnızca <input …/> gövdesine bakılıyor: dosyanın açıklama satırları
    // kök nedeni anlatırken `type="number"` ifadesini zaten geçiriyor.
    const bas = bilesen.search(/^\s*<input$/m)
    const girdi = bilesen.slice(bas, bilesen.indexOf('/>', bas))

    expect(bas).toBeGreaterThan(-1)
    expect(girdi).toContain('type="text"')
    expect(girdi).toContain('inputMode="decimal"')
    expect(girdi).not.toContain('type="number"')
  })

  it('forma sayı yazılır, metin değil', () => {
    expect(bilesen).toContain('setValue(cozum.deger)')
  })

  it('salt okunur alan kilitlenir', () => {
    expect(bilesen).toContain('disabled={kilitli}')
  })
})
