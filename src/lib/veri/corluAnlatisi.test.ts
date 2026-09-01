import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { CorluAnlatisi } from '@/globals/CorluAnlatisi'

/**
 * Çorlu Değer Anlatısı — kaynak disiplini.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU TESTLER BİR ÜSLUP TERCİHİNİ DEĞİL, BİR KURALI KORUYOR.
 *
 * Talimat pazarlığa kapalıydı: her iddia için kaynak, kaynağı
 * bulunamayan cümleyi yazma, rakam veriyorsan yılını ve kaynağını yaz,
 * "muhtemelen / genelde / bilinir" yasak.
 *
 * Bu bir yatırım sitesi. "Çorlu'da 41 firma 4.800 kişi çalıştırıyor"
 * cümlesine bakıp taşınmaz alan biri için kaynak bir süs değil.
 * ─────────────────────────────────────────────────────────────────────────
 */

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

interface Blok {
  baslik: string
  metin: string
  kaynaklar: { ad: string; adres: string; erisim?: string }[]
}

/** Global'in varsayılan içeriği — yayına çıkan metin bu. */
const bloklar = (
  CorluAnlatisi.fields.find((alan) => (alan as { name?: string }).name === 'bloklar') as {
    defaultValue?: Blok[]
  }
).defaultValue as Blok[]

describe('her blok kaynaklı', () => {
  it('en az bir blok var', () => {
    expect(bloklar.length).toBeGreaterThan(0)
  })

  it('her bloğun en az bir kaynağı var', () => {
    const kaynaksiz = bloklar.filter((b) => (b.kaynaklar?.length ?? 0) === 0).map((b) => b.baslik)
    expect(kaynaksiz, 'kaynaksız blok').toEqual([])
  })

  it('her kaynak https adresi taşıyor', () => {
    const bozuk: string[] = []
    for (const blok of bloklar) {
      for (const kaynak of blok.kaynaklar) {
        if (!kaynak.adres.startsWith('https://')) bozuk.push(`${blok.baslik}: ${kaynak.adres}`)
        if (kaynak.ad.trim() === '') bozuk.push(`${blok.baslik}: adsız kaynak`)
      }
    }
    expect(bozuk).toEqual([])
  })

  it('kaynaklar resmî alan adlarından', () => {
    /**
     * ⚠️ Talimat "resmi site, belediye, TSO, TÜİK" diyor. Blog ve forum
     * kaynağı, doğrulanamayan bir iddiayı doğrulanmış gibi gösterir.
     */
    const izinli = [
      'corlu1osb.org.tr',
      'corluderiosb.org.tr',
      'corlu.bel.tr',
      'corlutso.org.tr',
      'dhmi.gov.tr',
      'nku.edu.tr',
      'saglik.gov.tr',
      'aa.com.tr',
      'tuik.gov.tr',
      'corlu.gov.tr',
      'tekirdagyenihaber.com',
    ]
    const disaridakiler: string[] = []
    for (const blok of bloklar) {
      for (const kaynak of blok.kaynaklar) {
        const alan = new URL(kaynak.adres).hostname.replace(/^www\./, '')
        if (!izinli.some((i) => alan === i || alan.endsWith(`.${i}`))) {
          disaridakiler.push(alan)
        }
      }
    }
    expect(disaridakiler, 'izinli olmayan kaynak alan adı').toEqual([])
  })
})

describe('⚠️ yasak ifadeler', () => {
  /**
   * ⚠️ "Muhtemelen", "genelde", "bilinir" — talimatta açıkça yasak.
   * Bunlar bir cümleyi doğrulanamaz yapar ama doğrulanmış gibi okutur.
   */
  const YASAKLI = [
    /\bmuhtemelen\b/i,
    /\bgenelde\b/i,
    /\bbilinir\b/i,
    /\btahminen\b/i,
    /\bsanılıyor\b/i,
    /\bolarak bilinen\b/i,
  ]

  it('hiçbir blok metninde geçmiyor', () => {
    const ihlaller: string[] = []
    for (const blok of bloklar) {
      for (const kalip of YASAKLI) {
        if (kalip.test(blok.metin)) ihlaller.push(`${blok.baslik}: ${kalip}`)
      }
    }
    expect(ihlaller).toEqual([])
  })
})

describe('rakamlar yılıyla ve kaynağıyla', () => {
  it('nüfus rakamı yılını söylüyor', () => {
    const nufus = bloklar.find((b) => b.baslik.includes('Nüfus'))
    expect(nufus?.metin).toContain('2025')
    expect(nufus?.metin).toContain('TÜİK')
  })

  it('hızlı tren ilerlemesi tarihiyle veriliyor', () => {
    const ulasim = bloklar.find((b) => b.baslik === 'Ulaşım')
    expect(ulasim?.metin).toMatch(/31 Ocak 2025/)
  })
})

describe('⚠️ araştırmada doğrulanan düzeltmeler', () => {
  it('Ergene’deki OSB’ler Çorlu’da SAYILMIYOR', () => {
    /**
     * ⚠️ Velimeşe OSB ile Ergene 1-2 OSB, Çorlu TSO’nun listesinde Ergene
     * ilçesi altında. Bunları Çorlu’nun sanayisi diye yazmak, ilçenin
     * ekonomik büyüklüğünü olduğundan fazla göstermek olurdu.
     */
    const sanayi = bloklar.find((b) => b.baslik === 'Sanayi ve istihdam')
    expect(sanayi?.metin).toMatch(/Ergene ilçesi/)
    expect(sanayi?.metin).toMatch(/Çorlu ilçe sınırları içinde değil/)
  })

  it('Çorlu hızlı tren istasyonu İDDİA EDİLMİYOR', () => {
    /**
     * ⚠️ İncelenen resmî açıklamalarda (AA, 31 Ocak 2025) hattın
     * istasyonları arasında Çorlu geçmiyor. Kaynağı olmayan bir iddia
     * yazılmadı ve bunun yazılmadığı metinde AÇIKÇA söyleniyor.
     */
    const ulasim = bloklar.find((b) => b.baslik === 'Ulaşım')
    expect(ulasim?.metin).toMatch(/Çorlu.*geçmiyor/s)
    expect(ulasim?.metin).not.toMatch(/Çorlu(’|')?(ya|da) hızlı tren istasyonu (olacak|var)/)
  })

  it('MEVCUT tren istasyonu kaynaklı olarak yazılıyor', () => {
    /**
     * ⚠️ Hızlı tren istasyonu iddia edilmiyor ama Çorlu'nun KONVANSİYONEL
     * hat üzerindeki istasyonu gerçek ve kaynaklı: Çorlu Kaymakamlığı'nın
     * 27 Temmuz 2016 duyurusu. İkisini karıştırmamak şart — biri
     * doğrulanmamış bir varsayım, diğeri belgeli bir ulaşım bağlantısı.
     */
    const ulasim = bloklar.find((b) => b.baslik === 'Ulaşım')
    expect(ulasim?.metin).toMatch(/konvansiyonel hat/)
    expect(ulasim?.metin).toMatch(/27 Temmuz 2016/)
    expect(ulasim?.kaynaklar.some((k) => k.adres.includes('corlu.gov.tr'))).toBe(true)
  })

  it('güncel sefer sıklığı İDDİA EDİLMİYOR', () => {
    // Elimizdeki kaynak 2016 tarihli; bugünkü sefer sayısı bilinmiyor.
    const ulasim = bloklar.find((b) => b.baslik === 'Ulaşım')
    expect(ulasim?.metin).toMatch(/bugünkü sefer sayısı[\s\S]*?iddiada bulunmuyoruz/)
  })

  it('çelişen iki kaynak da yazılıyor', () => {
    // Deri OSB'nin fabrika sayısı ve istihdamı iki resmî kaynakta farklı.
    const sanayi = bloklar.find((b) => b.baslik === 'Sanayi ve istihdam')
    expect(sanayi?.metin).toContain('118 fabrika')
    expect(sanayi?.metin).toContain('106 deri')
    expect(sanayi?.metin).toMatch(/iki resmî kaynak farklı rakam veriyor/)
  })

  it('kaynaklanamayan rakam VERİLMİYOR', () => {
    /**
     * ⚠️ Hastanenin yatak kapasitesi kurumun kendi sayfasında yok;
     * haber ve toplayıcı sitelerden alıp resmîymiş gibi yazmak, tam da
     * yasaklanan şey. Metin bunu açıkça söylüyor.
     */
    const saglik = bloklar.find((b) => b.baslik.includes('sağlık'))
    expect(saglik?.metin).toMatch(/rakam vermiyoruz/)
  })
})

describe('gösterim', () => {
  const oku = (goreli: string) => readFileSync(path.join(KOK, goreli), 'utf8')

  it('kaynaksız blok siteye ÇIKMIYOR — kod seviyesinde', () => {
    // Panelde `minRows: 1` var; kural kodda da uygulanıyor.
    expect(oku('lib/veri/corluAnlatisi.ts')).toContain('if (kaynaklar.length === 0) continue')
  })

  it('kaynak listesi bölümün sonunda görünüyor', () => {
    expect(oku('components/mahalle/CorluAnlatisi.tsx')).toContain('Bu bölümde kullanılan kaynaklar')
  })

  it('mahalle sayfasında çiziliyor', () => {
    expect(oku('app/(site)/mahalleler/[slug]/page.tsx')).toContain('<CorluAnlatisi')
  })

  it('bölüm kapalıysa hiç çizilmiyor', () => {
    expect(oku('lib/veri/corluAnlatisi.ts')).toContain('if (kayit.acik === false) return null')
  })
})
