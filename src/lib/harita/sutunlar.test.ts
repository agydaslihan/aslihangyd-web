import { describe, expect, it } from 'vitest'

import {
  ASGARI_SUTUN_M,
  AZAMI_SUTUN_M,
  cokgenUret,
  kabaMerkez,
  sutunKatmani,
  SUTUN_YARICAPI_M,
  VERI_KIPLERI,
  veriKipiTanimi,
  yukseklikleriHesapla,
  type Konum,
  type SutunGirdisi,
} from './sutunlar'

const CORLU: Konum = [27.8, 41.16]

describe('çokgen üretimi', () => {
  it('halka kapalı döner', () => {
    const halka = cokgenUret(CORLU, SUTUN_YARICAPI_M)
    expect(halka[0]).toEqual(halka[halka.length - 1])
  })

  it('istenen köşe sayısını üretir', () => {
    // +1 kapanış noktası.
    expect(cokgenUret(CORLU, 300, 12)).toHaveLength(13)
    expect(cokgenUret(CORLU, 300, 6)).toHaveLength(7)
  })

  it('merkez etrafında simetrik', () => {
    const halka = cokgenUret(CORLU, 500, 4)
    const boylamlar = halka.slice(0, 4).map((nokta) => nokta[0] as number)
    const enlemler = halka.slice(0, 4).map((nokta) => nokta[1] as number)

    expect(boylamlar.reduce((a, b) => a + b, 0) / 4).toBeCloseTo(CORLU[0], 6)
    expect(enlemler.reduce((a, b) => a + b, 0) / 4).toBeCloseTo(CORLU[1], 6)
  })

  /**
   * Boylam düzeltmesi olmadan sütunlar 41. paralelde eliptik çıkar.
   * cos(41,16°) ≈ 0,753 → boylam yarıçapı enlem yarıçapının ~1,33 katı olmalı.
   */
  it('boylamı enleme göre düzeltir', () => {
    const halka = cokgenUret(CORLU, 1000, 4)
    const boylamYaricapi = Math.abs((halka[0]?.[0] as number) - CORLU[0])
    const enlemYaricapi = Math.abs((halka[1]?.[1] as number) - CORLU[1])

    expect(boylamYaricapi / enlemYaricapi).toBeCloseTo(1 / Math.cos((41.16 * Math.PI) / 180), 2)
  })

  it('ekvatorda düzeltme yapmaz', () => {
    const halka = cokgenUret([30, 0], 1000, 4)
    const boylamYaricapi = Math.abs((halka[0]?.[0] as number) - 30)
    const enlemYaricapi = Math.abs((halka[1]?.[1] as number) - 0)
    expect(boylamYaricapi / enlemYaricapi).toBeCloseTo(1, 4)
  })
})

describe('kaba merkez', () => {
  it('Polygon köşelerinin ortalamasını verir', () => {
    const merkez = kabaMerkez({
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [2, 0],
          [2, 2],
          [0, 2],
          [0, 0],
        ],
      ],
    })
    // Kapanış noktası da sayılır; ortalama yine kutunun içinde kalır.
    expect(merkez?.[0]).toBeGreaterThan(0)
    expect(merkez?.[0]).toBeLessThan(2)
    expect(merkez?.[1]).toBeGreaterThan(0)
    expect(merkez?.[1]).toBeLessThan(2)
  })

  it('MultiPolygon iç içe dizilerini gezer', () => {
    const merkez = kabaMerkez({
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [0, 0],
            [0, 0],
          ],
        ],
        [
          [
            [4, 4],
            [4, 4],
          ],
        ],
      ],
    })
    expect(merkez).toEqual([2, 2])
  })

  it('geometri yoksa null', () => {
    expect(kabaMerkez(null)).toBeNull()
    expect(kabaMerkez({})).toBeNull()
    expect(kabaMerkez({ type: 'Polygon', coordinates: [] })).toBeNull()
    expect(kabaMerkez('metin')).toBeNull()
  })
})

describe('yükseklik ölçeklemesi', () => {
  const yaz = (deger: number) => `${deger}`

  const girdi = (slug: string, deger: number | null): SutunGirdisi => ({
    slug,
    ad: slug,
    merkez: CORLU,
    deger,
    gozlemSayisi: null,
  })

  it('en büyük değer azami yüksekliği alır', () => {
    const sonuc = yukseklikleriHesapla([girdi('a', 100), girdi('b', 50)], yaz)
    expect(sonuc.find((s) => s.slug === 'a')?.yukseklik).toBe(AZAMI_SUTUN_M)
  })

  /**
   * Ölçek sıfırdan başlar. Alt sınırı en küçük değere çekmek küçük farkları
   * dramatik gösterir — yatırım sitesinde bu doğrudan yanıltmadır.
   */
  it('ölçek sıfırdan başlar, eksen kırpılmaz', () => {
    const sonuc = yukseklikleriHesapla([girdi('a', 44_000), girdi('b', 42_000)], yaz)
    const a = sonuc.find((s) => s.slug === 'a')?.yukseklik ?? 0
    const b = sonuc.find((s) => s.slug === 'b')?.yukseklik ?? 0

    // 42/44 ≈ 0,955 — yükseklik oranı da bu olmalı, abartılmamalı.
    expect(b / a).toBeCloseTo(42 / 44, 3)
  })

  it('çok küçük değerler asgari yükseklikte görünür kalır', () => {
    const sonuc = yukseklikleriHesapla([girdi('a', 100_000), girdi('b', 1)], yaz)
    expect(sonuc.find((s) => s.slug === 'b')?.yukseklik).toBe(ASGARI_SUTUN_M)
  })

  /** ⚠️ CLAUDE.md kural 2: veri yoksa uydurma yükseklik gösterilmez. */
  it('verisi olmayan mahalle için sütun ÜRETİLMEZ', () => {
    const sonuc = yukseklikleriHesapla([girdi('a', 100), girdi('bos', null)], yaz)
    expect(sonuc.map((s) => s.slug)).toEqual(['a'])
  })

  it('sıfır ve negatif değerler de sütun üretmez', () => {
    const sonuc = yukseklikleriHesapla([girdi('sifir', 0), girdi('eksi', -5)], yaz)
    expect(sonuc).toEqual([])
  })

  it('hiç veri yoksa boş dizi', () => {
    expect(yukseklikleriHesapla([girdi('a', null)], yaz)).toEqual([])
  })

  it('etiketi verilen biçimlendiriciyle üretir', () => {
    const sonuc = yukseklikleriHesapla([girdi('a', 42_500)], (d) => `${d / 1000} B ₺`)
    expect(sonuc[0]?.etiket).toBe('42.5 B ₺')
  })
})

describe('sütun katmanı', () => {
  it('merkezi bulunamayan sütunu atlar', () => {
    const sutunlar = yukseklikleriHesapla(
      [
        { slug: 'a', ad: 'A', merkez: CORLU, deger: 10, gozlemSayisi: null },
        { slug: 'b', ad: 'B', merkez: CORLU, deger: 20, gozlemSayisi: null },
      ],
      String,
    )

    const katman = sutunKatmani(sutunlar, (slug) => (slug === 'a' ? CORLU : null))
    expect(katman.features).toHaveLength(1)
    expect(katman.features[0]?.properties?.slug).toBe('a')
  })

  it('yükseklik ve etiket özellik olarak taşınır', () => {
    const sutunlar = yukseklikleriHesapla(
      [{ slug: 'a', ad: 'Muhittin', merkez: CORLU, deger: 10, gozlemSayisi: 8 }],
      () => '10 ₺',
    )
    const ozellikler = sutunKatmani(sutunlar, () => CORLU).features[0]?.properties

    expect(ozellikler).toMatchObject({ slug: 'a', ad: 'Muhittin', etiket: '10 ₺' })
    expect(ozellikler?.yukseklik).toBe(AZAMI_SUTUN_M)
  })
})

describe('veri kipleri', () => {
  it('dördü de tanımlı', () => {
    expect(VERI_KIPLERI.map((kip) => kip.anahtar)).toEqual([
      'satisM2',
      'kira',
      'kiraCarpani',
      'yatirimSkoru',
    ])
  })

  /**
   * Kira çarpanında küçük olan iyidir, ama sütun HAM DEĞERİ gösterir.
   * "İyiyi yükseğe çevirmek" haritaya gizli bir yorum katmanı eklerdi.
   */
  it('kira çarpanında büyük değer iyi sayılmaz', () => {
    expect(veriKipiTanimi('kiraCarpani').buyukIyi).toBe(false)
    expect(veriKipiTanimi('satisM2').buyukIyi).toBe(true)
  })

  it('bilinmeyen kip hata verir', () => {
    // @ts-expect-error — bilinçli olarak geçersiz kip.
    expect(() => veriKipiTanimi('yok')).toThrow(/Bilinmeyen veri kipi/)
  })
})
