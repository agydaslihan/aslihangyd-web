import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { mesafeYaz, olgusalIskelet, type OlgusalGirdi } from './olgusal'

/**
 * Mahallenin olgusal iskeleti.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU TESTLERİN ÇOĞU BİR ŞEYİN ÇİZİLMEDİĞİNİ KANITLIYOR.
 *
 * Talimat iki kez aynı şeyi söylüyor: "Sayı sıfırsa 'veri yok' yaz,
 * '0 okul' yazma" ve "Hesaplanamayan satır ÇİZİLMESİN. Sıfır veya tahmin
 * yazma."
 *
 * Sebebi basit: OSM'de bir mahallenin okulları henüz işaretlenmemişse
 * "0 okul" yazmak, veri eksikliğini olguya çevirmektir. Bir yatırım
 * sitesinde bu, eksik bilgiden daha kötüdür.
 * ─────────────────────────────────────────────────────────────────────────
 */

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const bosGirdi: OlgusalGirdi = {
  cevre: [],
  sanayi: [],
  merkezeMetre: null,
  nufus: null,
  ilceNufusu: null,
  ilceNufusuKaynagi: null,
}

const poi = (tip: string, ad: string, metre: number, yakinda: number) => ({
  tip: tip as never,
  enYakinAd: ad,
  enYakinMetre: metre,
  yakindaSayi: yakinda,
  onemli: false,
  kaynak: 'osm' as const,
  enYakinId: 1,
  googleBagliMi: false,
})

describe('mesafe biçimi', () => {
  it('bir kilometrenin altı metre, üstü kilometre', () => {
    expect(mesafeYaz(340)).toBe('340 m')
    expect(mesafeYaz(3_200)).toBe('3,2 km')
  })

  it('metre on metreye yuvarlanıyor', () => {
    /**
     * ⚠️ "347 m" kuş uçuşu bir mesafede sahte bir kesinlik. Mahalle
     * merkezinin kendisi bir yaklaşıklık; metre hassasiyeti iddia etmek
     * ölçümden fazlasını söylemek olurdu.
     */
    expect(mesafeYaz(347)).toBe('350 m')
  })
})

describe('⚠️ hesaplanamayan satır çizilmiyor', () => {
  it('hiç veri yoksa hiç bölüm yok', () => {
    expect(olgusalIskelet(bosGirdi)).toEqual([])
  })

  it('merkez bilinmiyorsa "Çorlu merkezine" satırı yok', () => {
    const bolumler = olgusalIskelet({
      ...bosGirdi,
      cevre: [poi('istasyon', 'Çorlu', 1200, 1)],
    })
    const ulasim = bolumler.find((b) => b.baslik === 'Konum ve ulaşım')
    expect(ulasim?.satirlar.map((s) => s.etiket)).not.toContain('Çorlu merkezine')
  })

  it('D-100 satırı HİÇ üretilmiyor', () => {
    /**
     * ⚠️ D-100 bir nokta değil bir yol; mesafesi ancak yol geometrisiyle
     * hesaplanır ve o veri sistemde yok. "Yaklaşık 2 km" yazmak
     * doğrulanamaz bir sayı üretirdi.
     */
    const bolumler = olgusalIskelet({
      ...bosGirdi,
      merkezeMetre: 2000,
      cevre: [poi('istasyon', 'Çorlu', 1200, 1)],
    })
    const tumEtiketler = bolumler.flatMap((b) => b.satirlar.map((s) => s.etiket)).join(' ')
    expect(tumEtiketler).not.toMatch(/D-?100/i)
  })
})

describe('⚠️ sıfır yazılmıyor', () => {
  it('1 km içinde kayıt yoksa satır hiç çizilmiyor', () => {
    const bolumler = olgusalIskelet({
      ...bosGirdi,
      cevre: [poi('okul', 'Uzak Okul', 4000, 0), poi('eczane', 'Uzak Eczane', 5000, 0)],
    })
    // Donatı bölümü hiç oluşmamalı — en yakın hastane de yok.
    expect(bolumler.find((b) => b.baslik === 'Sosyal donatı')).toBeUndefined()
  })

  it('dolu tür sayılıyor, boş tür atlanıyor', () => {
    const bolumler = olgusalIskelet({
      ...bosGirdi,
      cevre: [poi('okul', 'Okul', 300, 4), poi('park', 'Park', 900, 0)],
    })
    const donati = bolumler.find((b) => b.baslik === 'Sosyal donatı')
    const etiketler = donati?.satirlar.map((s) => s.etiket) ?? []
    expect(etiketler).toContain('Okul (1 km içinde)')
    expect(etiketler.join(' ')).not.toContain('Park')
  })

  it('nüfus sıfır ya da yoksa bölüm çizilmiyor', () => {
    expect(olgusalIskelet({ ...bosGirdi, nufus: 0 }).length).toBe(0)
    expect(olgusalIskelet({ ...bosGirdi, nufus: null }).length).toBe(0)
  })
})

describe('kaynak her satırın yanında', () => {
  it('her satırın kaynağı dolu', () => {
    const bolumler = olgusalIskelet({
      ...bosGirdi,
      merkezeMetre: 2500,
      cevre: [poi('okul', 'Okul', 300, 4), poi('hastane', 'Devlet Hastanesi', 2100, 1)],
      sanayi: [{ ad: 'Çorlu 1. Organize Sanayi Bölgesi', metre: 3400 }],
      nufus: 10_918,
      ilceNufusu: 306_939,
      ilceNufusuKaynagi: 'TÜİK ADNKS 2025',
    })
    const kaynaksiz = bolumler
      .flatMap((b) => b.satirlar)
      .filter((s) => s.kaynak.trim() === '')
      .map((s) => s.etiket)
    expect(kaynaksiz).toEqual([])
  })

  it('kuş uçuşu uyarısı bölümde YAZILI', () => {
    const bolumler = olgusalIskelet({ ...bosGirdi, merkezeMetre: 2500 })
    expect(bolumler[0]?.not).toMatch(/kuş uçuşu/i)
  })

  it('ilçe payı yalnızca kaynaklı paydayla hesaplanıyor', () => {
    const kaynaksiz = olgusalIskelet({ ...bosGirdi, nufus: 10_918, ilceNufusu: null })
    expect(kaynaksiz.find((b) => b.baslik === 'Nüfus')?.satirlar).toHaveLength(1)

    const kaynakli = olgusalIskelet({
      ...bosGirdi,
      nufus: 10_918,
      ilceNufusu: 306_939,
      ilceNufusuKaynagi: 'TÜİK ADNKS 2025',
    })
    const pay = kaynakli.find((b) => b.baslik === 'Nüfus')?.satirlar[1]
    expect(pay?.deger).toBe('%3,6')
    expect(pay?.kaynak).toBe('TÜİK ADNKS 2025')
  })
})

describe('sanayi yakınlığı', () => {
  it('Ergene’deki OSB işaretleniyor — KAYNAKLI', () => {
    /**
     * ⚠️ Bu işaret önce GEOMETRİYLE hesaplanmaya çalışıldı ve olmadı:
     * mahalle poligonları ilçenin tamamını kaplamıyor (üretimde 544
     * POI'nin %80'i bir sınırın içinde). Çorlu Deri OSB o testte
     * "dışarıda" çıkıyordu — oysa Çorlu TSO onu Çorlu'da listeliyor.
     *
     * Şimdi kaynaklı bir eşleme kullanılıyor ve kaynak satırda yazılı.
     */
    const bolumler = olgusalIskelet({
      ...bosGirdi,
      sanayi: [
        { ad: 'Çorlu 1. Organize Sanayi Bölgesi', metre: 3400 },
        { ad: 'Velimeşe Organize Sanayi Bölgesi', metre: 11_000 },
      ],
    })
    const satirlar = bolumler.find((b) => b.baslik === 'Sanayi yakınlığı')?.satirlar ?? []
    expect(satirlar[0]?.etiket).not.toMatch(/Ergene/)
    expect(satirlar[1]?.etiket).toContain('(Ergene ilçesinde)')
    expect(satirlar[1]?.kaynak).toMatch(/Ticaret ve Sanayi Odası/)
  })

  it('Çorlu Deri OSB Ergene’de SAYILMIYOR', () => {
    /**
     * ⚠️ Geometrik testin ürettiği yanlış tam olarak buydu. Regresyon
     * olarak kilitleniyor.
     */
    const bolumler = olgusalIskelet({
      ...bosGirdi,
      sanayi: [{ ad: 'Çorlu Deri Organize Sanayi Bölgesi (OSB)', metre: 5352 }],
    })
    expect(bolumler[0]?.satirlar[0]?.etiket).not.toMatch(/Ergene/)
  })

  it('listede olmayan OSB için ilçe İDDİA EDİLMİYOR', () => {
    // Veliköy OSB, TSO'nun listesinde geçmiyor.
    const bolumler = olgusalIskelet({
      ...bosGirdi,
      sanayi: [{ ad: 'Veliköy Organize Sanayi Bölgesi', metre: 12_450 }],
    })
    expect(bolumler[0]?.satirlar[0]?.etiket).toBe('Veliköy Organize Sanayi Bölgesi')
    expect(bolumler[0]?.satirlar[0]?.kaynak).not.toMatch(/Ticaret ve Sanayi/)
  })

  it('Deri OSB için İKİ TARAFLI not var', () => {
    /**
     * ⚠️ Yalnızca istihdam avantajını yazmak, bir yatırım sitesinde eksik
     * değil YANLIŞ bilgi olur; yalnızca kokuyu yazmak da öyle.
     */
    const bolumler = olgusalIskelet({
      ...bosGirdi,
      sanayi: [{ ad: 'Çorlu Deri Organize Sanayi Bölgesi (OSB)', metre: 2100 }],
    })
    const not = bolumler[0]?.satirlar[0]?.not ?? ''
    expect(not).toMatch(/istihdam/i)
    expect(not).toMatch(/koku|çevre/i)
  })

  it('deri olmayan OSB’de o not YOK', () => {
    const bolumler = olgusalIskelet({
      ...bosGirdi,
      sanayi: [{ ad: 'Çorlu 1. Organize Sanayi Bölgesi', metre: 3400 }],
    })
    expect(bolumler[0]?.satirlar[0]?.not).toBeUndefined()
  })
})

describe('kaynak disiplini — kodda', () => {
  const oku = (goreli: string) => readFileSync(path.join(KOK, goreli), 'utf8')

  it('Çorlu merkezi koda GÖMÜLMÜYOR, türetiliyor', () => {
    // CLAUDE.md: "Çorlu koordinatı koda gömülmez."
    const yakinlik = oku('lib/veri/yakinlik.ts')
    expect(yakinlik).toContain('ST_Centroid(ST_Collect')
    expect(yakinlik).toContain('corluMerkeziGetir')
  })

  it('sanayi sorgusu İLÇE İDDİASI üretmiyor', () => {
    /**
     * ⚠️ Geometrik "hangi ilçede" çıkarımı KALDIRILDI; ölçüm onu
     * çürüttü. Sorgu artık yalnızca mesafe veriyor.
     */
    const yakinlik = oku('lib/veri/yakinlik.ts')
    expect(yakinlik).not.toContain('corlu_icinde')
    // Satır sonu biçimlendirmesine takılmayan kısa parça.
    expect(yakinlik).toContain('544 ilgi noktasının yalnızca')
  })

  it('ODbL atfı gösterimde var', () => {
    expect(oku('components/mahalle/OlgusalIskelet.tsx')).toContain('© OpenStreetMap katkıcıları')
  })

  it('kaynaksız ilçe nüfusu kullanılmıyor', () => {
    expect(oku('lib/veri/ilceOlgulari.ts')).toContain(
      'if (nufus === null || kaynak === null) return bos',
    )
  })
})
