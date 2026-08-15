import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  AZAMI_KOTA_BEKLEMESI_MS,
  overpassSunuculari,
  retryAfterMs,
  VARSAYILAN_SUNUCULAR,
} from './istemci'

const ONCEKI = process.env.OVERPASS_ADRESI

afterEach(() => {
  if (ONCEKI === undefined) delete process.env.OVERPASS_ADRESI
  else process.env.OVERPASS_ADRESI = ONCEKI
})

describe('overpassSunuculari', () => {
  beforeEach(() => {
    delete process.env.OVERPASS_ADRESI
  })

  it('yapılandırma yoksa varsayılan listeye düşer', () => {
    expect(overpassSunuculari()).toEqual([...VARSAYILAN_SUNUCULAR])
  })

  /**
   * ⚠️ TEK ADRES YAZAN MEVCUT KURULUMLAR BOZULMAMALI.
   *
   * Yedek sunucu için yeni bir değişken eklemek yerine mevcut olan
   * genişletildi. Sunucudaki `.env`i düzenlemeyi unutan biri, eskisi gibi
   * tek sunucuyla çalışmaya devam eder — sessizce yedeksiz kalmaz, çünkü
   * zaten bilinçli olarak o adresi yazmıştır.
   */
  it('tek adres aynen kullanılır', () => {
    process.env.OVERPASS_ADRESI = 'https://ornek.test/api/interpreter'
    expect(overpassSunuculari()).toEqual(['https://ornek.test/api/interpreter'])
  })

  it('virgülle ayrılmış liste sırayla okunur', () => {
    process.env.OVERPASS_ADRESI = 'https://bir.test/api, https://iki.test/api ,https://uc.test/api'
    expect(overpassSunuculari()).toEqual([
      'https://bir.test/api',
      'https://iki.test/api',
      'https://uc.test/api',
    ])
  })

  /**
   * ⚠️ BOŞ DİZE TUZAĞI — DAHA ÖNCE BU PROJEDE YAŞANDI.
   *
   * compose `OVERPASS_ADRESI: ${OVERPASS_ADRESI:-}` yazıyor: değişken
   * ayarlanmadığında kaba **boş dize** olarak ulaşıyor. `??` kullanılsaydı
   * boş dize "tanımlı" sayılır ve `fetch('')` çağrılırdı.
   */
  it('boş dize ve yalnızca virgül varsayılana düşer', () => {
    process.env.OVERPASS_ADRESI = ''
    expect(overpassSunuculari()).toEqual([...VARSAYILAN_SUNUCULAR])

    process.env.OVERPASS_ADRESI = '  ,  , '
    expect(overpassSunuculari()).toEqual([...VARSAYILAN_SUNUCULAR])
  })

  /**
   * ⚠️ Yedek listesi tek elemanlı olamaz — yedek sunucunun bütün anlamı
   * 504 veren örnekten başkasına geçebilmek.
   */
  it('varsayılan listede birden çok bağımsız sunucu var', () => {
    expect(VARSAYILAN_SUNUCULAR.length).toBeGreaterThan(1)
    const alanAdlari = new Set(VARSAYILAN_SUNUCULAR.map((adres) => new URL(adres).hostname))
    expect(alanAdlari.size).toBe(VARSAYILAN_SUNUCULAR.length)
  })
})

/**
 * ⚠️ BÖLGESEL AYNA LİSTEYE GİRMESİN.
 *
 * `overpass.osm.ch` yalnızca İsviçre'yi sunuyor ve Türkiye kimlikleri için
 * HTTP 200 + boş `elements` döndürüyor — hata yok, `remark` yok. Listede
 * kalsaydı dört grup "başarıyla" boş gelir ve 12 mahalle sessizce sınırsız
 * kalırdı.
 *
 * Bu test o adresi geri koymayı zorlaştırıyor. Yeni bir ayna eklenecekse
 * önce küresel veri sunduğu ölçülmeli.
 */
describe('bölgesel ayna koruması', () => {
  it('yalnızca belirli bir ülkeyi sunan bilinen örnekler listede yok', () => {
    const bilinenBolgeseller = ['overpass.osm.ch']
    for (const adres of VARSAYILAN_SUNUCULAR) {
      const alanAdi = new URL(adres).hostname
      expect(
        bilinenBolgeseller,
        `${alanAdi} bölgesel: Türkiye sorgularına sessizce boş cevap veriyor`,
      ).not.toContain(alanAdi)
    }
  })
})

describe('retryAfterMs', () => {
  it('saniye biçimini okur', () => {
    expect(retryAfterMs('120')).toBe(120_000)
    expect(retryAfterMs('  30 ')).toBe(30_000)
    expect(retryAfterMs('0')).toBe(0)
  })

  it('HTTP tarihi biçimini okur', () => {
    const ileri = new Date(Date.now() + 60_000).toUTCString()
    const sonuc = retryAfterMs(ileri)
    expect(sonuc).not.toBeNull()
    expect(sonuc as number).toBeGreaterThan(50_000)
    expect(sonuc as number).toBeLessThanOrEqual(60_000)
  })

  it('geçmiş tarih sıfır verir — eksi bekleme olmaz', () => {
    expect(retryAfterMs(new Date(Date.now() - 60_000).toUTCString())).toBe(0)
  })

  it('başlık yoksa ya da anlamsızsa null', () => {
    expect(retryAfterMs(null)).toBeNull()
    expect(retryAfterMs('')).toBeNull()
    expect(retryAfterMs('yakında')).toBeNull()
  })

  /**
   * ⚠️ ÜST SINIR ŞART: bozuk ya da düşmanca bir başlık yüzünden panel
   * yarım saat donmasın. Sunucuya uyuyoruz ama sınırsız değil.
   */
  it('saçma uzun değerler üst sınıra kırpılıyor', () => {
    expect(retryAfterMs('999999')).toBe(AZAMI_KOTA_BEKLEMESI_MS)
  })
})
