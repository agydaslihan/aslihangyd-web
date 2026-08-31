import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { sayiyaCevir } from '@/lib/csv/ayristir'

import { ornekCsv, satirlariCozumle, sutunlariEslestir } from './iceAktarma'

/**
 * Rayiç içe aktarma hataları — NE OLDU, NEREDE, NE BEKLENİYORDU.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ "BELEDİYEDEN ALINAN RAYİÇ VERİSİ İŞLENMİYOR" ŞİKÂYETİ, BİR HATA
 *    MESAJI ŞİKÂYETİYDİ.
 *
 * Ayrıştırıcı zaten hem `12.500,50` hem `12,500.50` biçimini tanıyordu;
 * sorun okunamayan bir hücrede kullanıcının NE yapacağını bilememesiydi.
 * "Bina rayiç bedeli okunamadı" cümlesi, altı sütunlu bir dosyada hangi
 * sütuna bakılacağını da, neyin beklendiğini de söylemiyor.
 *
 * Bu testler mesajın üç şeyi birden taşıdığını kilitliyor: satır numarası,
 * sütun (sıra + başlık + alan adı) ve beklenen biçim.
 * ─────────────────────────────────────────────────────────────────────────
 */

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const BASLIKLAR = ['Mahalle', 'Sokak', 'Yıl', 'Bina m² Rayiç', 'Arsa m² Rayiç', 'Kaynak']
const eslesme = sutunlariEslestir(BASLIKLAR)
const MAHALLELER = [{ id: 1, ad: 'Muhittin', slug: 'muhittin' }]

const coz = (satirlar: string[][]) =>
  satirlariCozumle(satirlar, eslesme, {
    mahalleler: MAHALLELER,
    basliklar: BASLIKLAR,
    varsayilanYil: 2026,
    varsayilanKaynak: 'belediye',
  })

describe('sayı biçimi — ikisi de tanınıyor', () => {
  /**
   * ⚠️ Bu, D maddesinin ilk şüphesiydi ve ayrıştırıcı zaten doğruydu.
   * Test, davranışı belgelemek ve bir daha kaybolmamasını sağlamak için.
   */
  it('Türkçe biçim', () => {
    expect(sayiyaCevir('12.500,50')).toBe(12_500.5)
    expect(sayiyaCevir('1.234')).toBe(1234)
  })

  it('İngilizce biçim', () => {
    expect(sayiyaCevir('12,500.50')).toBe(12_500.5)
    expect(sayiyaCevir('1,234,567')).toBe(1_234_567)
  })

  it('TEK virgül BELİRSİZ ve Türkçe sayılıyor — bilinçli', () => {
    /**
     * ⚠️ `1,234` iki şey olabilir: bin iki yüz otuz dört (İngilizce binlik)
     * ya da bir tam iki yüz otuz dört (Türkçe ondalık). Ayrıştırıcı tek
     * virgülü ondalık sayıyor.
     *
     * Doğru tercih bu: veri Türkçe kaynaklardan geliyor ve rayiç bedelde
     * kuruş yazmak yaygın. Yanlış tercih bin kat sapma üretirdi; bu tercih
     * en fazla küsurat farkı üretir.
     */
    expect(sayiyaCevir('1,234')).toBe(1.234)
  })

  it('para simgesi ve boşluk temizleniyor', () => {
    expect(sayiyaCevir(' ₺ 12.500,50 ')).toBe(12_500.5)
  })

  it('birim yazılıysa okunmuyor — ve mesaj bunu söylüyor', () => {
    // Hücrede "TL/m²" varsa sayı değil; kullanıcının bilmesi gereken şey bu.
    expect(sayiyaCevir('12.500 TL/m²')).toBeNull()
  })
})

describe('hata mesajı satır, sütun ve beklentiyi söylüyor', () => {
  it('okunamayan sayı: sütun sırası, başlığı ve beklenen biçim', () => {
    const sonuc = coz([['Muhittin', '', '2026', '12.500 TL/m²', '', '']])
    const mesaj = sonuc.satirlar[0]!.hatalar.join(' ')

    expect(mesaj).toContain('4. sütun')
    expect(mesaj).toContain('Bina m² Rayiç')
    expect(mesaj).toContain('12.500,50')
    expect(mesaj).toContain('12,500.50')
    expect(mesaj).toMatch(/birim/i)
  })

  it('satır numarası dosyadaki numarayla aynı — başlık 1, veri 2', () => {
    const sonuc = coz([
      ['Muhittin', '', '2026', '9500', '', ''],
      ['Muhittin', '', 'iki bin yirmi altı', '9500', '', ''],
    ])
    expect(sonuc.satirlar[1]!.satirNo).toBe(3)
  })

  it('tanınmayan mahalle: ne beklendiği ve ne yapılacağı yazılı', () => {
    const sonuc = coz([['Bilinmeyen', '', '2026', '9500', '', '']])
    const mesaj = sonuc.satirlar[0]!.hatalar.join(' ')

    expect(mesaj).toContain('1. sütun')
    expect(mesaj).toContain('Mahalleler koleksiyonundaki adlardan biri')
    expect(mesaj).toMatch(/yazım farklıysa düzeltin/i)
  })

  it('yıl hatası beklenen aralığı söylüyor', () => {
    const sonuc = coz([['Muhittin', '', '26', '9500', '', '']])
    expect(sonuc.satirlar[0]!.hatalar.join(' ')).toContain('1990–2100')
  })

  it('boş satır hangi iki sütunun boş olduğunu söylüyor', () => {
    const sonuc = coz([['Muhittin', '', '2026', '', '', '']])
    const mesaj = sonuc.satirlar[0]!.hatalar.join(' ')
    expect(mesaj).toContain('Bina m² Rayiç')
    expect(mesaj).toContain('Arsa m² Rayiç')
    expect(mesaj).toContain('En az biri dolu olmalı')
  })

  it('tanınmayan kaynak, tanınan değerleri listeliyor', () => {
    const sonuc = coz([['Muhittin', '', '2026', '9500', '', 'nereden bilim']])
    expect(sonuc.satirlar[0]!.uyarilar.join(' ')).toMatch(/Tanınan değerler:/)
  })

  it('sütun eşlenmemişse mesaj yine de anlaşılır', () => {
    // Başlık verilmediğinde sıra numarası yok; alan adı yine yazılı.
    const kissa = satirlariCozumle([['Muhittin', '', '2026', 'abc', '', '']], eslesme, {
      mahalleler: MAHALLELER,
      varsayilanYil: 2026,
      varsayilanKaynak: 'belediye',
    })
    expect(kissa.satirlar[0]!.hatalar.join(' ')).toContain('Bina m² rayiç bedeli')
  })
})

describe('genel hatalar yol gösteriyor', () => {
  const cekirdek = readFileSync(path.join(KOK, 'lib/rayic/iceAktarmaCekirdegi.ts'), 'utf8')

  it('boş dosya: xlsx uyarısı var', () => {
    expect(cekirdek).toContain('.xlsx dosyası doğrudan okunamaz')
  })

  it('başlık okunamadı: ne yapılacağı yazılı', () => {
    /**
     * ⚠️ Kısa parça aranıyor: mesaj kaynakta `+` ile bölünmüş satırlarda
     * duruyor ve tam cümleyi aramak, biçimlendirici satırı başka yerden
     * böldüğü gün testi kırardı — mesajda hiçbir şey değişmemişken.
     */
    expect(cekirdek).toContain('Dosyanın İLK satırı sütun adlarını taşımalı')
    expect(cekirdek).toContain('logo ya da boş satırlar varsa onları silin')
  })
})

describe('örnek CSV', () => {
  it('kendi ayrıştırıcımız tarafından sorunsuz okunuyor', () => {
    /**
     * ⚠️ Örnek dosyanın sütun adları, ayrıştırıcının tanıdığı adlarla AYNI
     * olmak zorunda. Ayrıştıkları gün, örneği indirip dolduran kişi
     * "sütunlar eşleşmedi" hatası alır — ve hatayı örnek dosya üretmiş
     * olur.
     */
    const satirlar = ornekCsv()
      .split('\n')
      .filter((s) => !s.startsWith('#'))
    const eslesmeOrnek = sutunlariEslestir(satirlar[0]!.split(';'))

    for (const alan of [
      'mahalle',
      'sokak',
      'yil',
      'metrekareRayicBedel',
      'arsaRayicBedel',
    ] as const) {
      expect(eslesmeOrnek[alan], `${alan} eşleşmedi`).toEqual(expect.any(Number))
    }
  })

  it('iki sayı biçimi de örnekte gösteriliyor', () => {
    // "Ondalık ayracını değiştireyim mi?" sorusunu dosyanın kendisi kapatıyor.
    expect(ornekCsv()).toContain('12.500,50')
    expect(ornekCsv()).toContain('9,750.25')
  })

  it('ÖRNEK olduğu dosyanın içinde yazıyor', () => {
    expect(ornekCsv()).toContain('ÖRNEK VERİ — YAYINLANMAYACAK')
  })

  it('örnekteki satırlar gerçekten aktarılabilir durumda', () => {
    const satirlar = ornekCsv()
      .split('\n')
      .filter((s) => !s.startsWith('#'))
    const basliklarOrnek = satirlar[0]!.split(';')
    const veri = satirlar.slice(1).map((s) => s.split(';'))
    const sonuc = satirlariCozumle(veri, sutunlariEslestir(basliklarOrnek), {
      mahalleler: [
        { id: 1, ad: 'Muhittin', slug: 'muhittin' },
        { id: 2, ad: 'Alipaşa', slug: 'alipasa' },
      ],
      basliklar: basliklarOrnek,
      varsayilanYil: 2026,
      varsayilanKaynak: 'belediye',
    })
    expect(sonuc.hataliSayisi, JSON.stringify(sonuc.satirlar.map((s) => s.hatalar))).toBe(0)
  })
})
