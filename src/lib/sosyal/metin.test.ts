import { describe, expect, it } from 'vitest'

import {
  etiketler,
  gecerliBicimMi,
  paylasimBaglantisi,
  paylasimMetni,
  type PaylasimGirdisi,
} from './metin'

const ADRES = 'https://aslihangyd.com:8443'

const girdi = (ek: Partial<PaylasimGirdisi> = {}): PaylasimGirdisi => ({
  baslik: 'Ferah 3+1 daire',
  slug: 'ferah-3-1-daire',
  tip: 'satilik',
  kategori: 'konut',
  mahalleAdi: 'Şeyhsinan Mahallesi',
  fiyat: 2_450_000,
  brutM2: 135,
  odaSayisi: '3+1',
  ozet: 'Asansörlü binada, otoparklı.',
  tasinmazNo: '2026/123456',
  ...ek,
})

describe('paylaşım bağlantısı', () => {
  /**
   * ⚠️ UTM olmadan Instagram'dan gelen ziyaretçi analitikte "yönlendiren
   * yok" görünür (uygulama içi tarayıcılar referrer göndermez) ve
   * paylaşımın işe yarayıp yaramadığı hiç bilinemez.
   */
  it('UTM etiketleri taşır', () => {
    const adres = new URL(paylasimBaglantisi(ADRES, 'ferah-3-1-daire', 'instagram'))
    expect(adres.pathname).toBe('/portfoy/ferah-3-1-daire')
    expect(adres.searchParams.get('utm_source')).toBe('instagram')
    expect(adres.searchParams.get('utm_medium')).toBe('sosyal')
    expect(adres.searchParams.get('utm_campaign')).toBe('portfoy')
  })

  it('port düşürülmez', () => {
    // 8443 kaybolursa bağlantı başka bir uygulamaya gider.
    expect(paylasimBaglantisi(ADRES, 'x', 'whatsapp')).toContain(':8443')
  })
})

describe('etiketler', () => {
  it('mahalle adından etiket türetir', () => {
    expect(etiketler(girdi())).toContain('#şeyhsinan')
  })

  it('"Mahallesi" ekini ve boşlukları temizler', () => {
    expect(etiketler(girdi({ mahalleAdi: 'Cemaliye Mahallesi' }))).toContain('#cemaliye')
    expect(etiketler(girdi({ mahalleAdi: 'Hıdır Ağa' }))).toContain('#hıdırağa')
  })

  it('mahalle yoksa mahalle etiketi üretmez', () => {
    const liste = etiketler(girdi({ mahalleAdi: null }))
    expect(liste.some((e) => e.startsWith('#şeyh'))).toBe(false)
    expect(liste).toContain('#çorlu')
  })

  it('kategoriye göre etiket ekler', () => {
    expect(etiketler(girdi({ kategori: 'fabrika' }))).toContain('#sanayi')
    expect(etiketler(girdi({ kategori: 'arsa' }))).toContain('#arsa')
  })

  /**
   * ⚠️ Alakasız etiket yığını erişimi artırmaz; hesabı emlak spam'i gibi
   * gösterir. Sekiz sınırı bilinçli.
   */
  it('sekiz etiketi aşmaz ve tekrar etmez', () => {
    const liste = etiketler(girdi({ kategori: 'konut', tip: 'kiralik' }))
    expect(liste.length).toBeLessThanOrEqual(8)
    expect(new Set(liste).size).toBe(liste.length)
  })
})

describe('paylaşım metni', () => {
  /**
   * ⚠️ CLAUDE.md kural 2: uydurma veri yasak. Fiyatı olmayan ilan için
   * "cazip fiyatlı" gibi doldurma ifade üretilmez — o cümle hiç kurulmaz.
   */
  it('olmayan rakamı yazmaz', () => {
    const metin = paylasimMetni(girdi({ fiyat: null, brutM2: null, odaSayisi: null }), ADRES)
    expect(metin).not.toContain('₺')
    expect(metin).not.toContain('m²')
    expect(metin).not.toMatch(/cazip|uygun fiyat|kaçırılmayacak/i)
  })

  it('var olan rakamları yazar', () => {
    const metin = paylasimMetni(girdi(), ADRES)
    expect(metin).toContain('3+1')
    expect(metin).toContain('135 m²')
    expect(metin).toContain('2.450.000 ₺')
  })

  it('kiralıkta aylık işareti ekler', () => {
    expect(paylasimMetni(girdi({ tip: 'kiralik', fiyat: 18_500 }), ADRES)).toContain('18.500 ₺/ay')
  })

  /**
   * ⚠️ CLAUDE.md kural 5. Feragat metnin İÇİNDE: gönderi kopyalanıp
   * başka yere taşındığında feragat de onunla gitsin. Ayrı bir alanda
   * dursaydı ilk kopyalamada düşerdi.
   */
  it('yatırım tavsiyesi feragati metnin içinde', () => {
    const metin = paylasimMetni(girdi(), ADRES)
    expect(metin).toContain('yatırım tavsiyesi niteliğinde değildir')
    expect(metin).toContain('Geçmiş veriler gelecekteki getiriyi garanti etmez')
  })

  it('taşınmaz numarası ve doğrulanmış ilan ibaresi geçer', () => {
    expect(paylasimMetni(girdi(), ADRES)).toContain('Taşınmaz no: 2026/123456')
  })

  it('taşınmaz numarası yoksa rozet cümlesi kurulmaz', () => {
    expect(paylasimMetni(girdi({ tasinmazNo: null }), ADRES)).not.toContain('Doğrulanmış ilan')
  })

  it('bağlantı UTM etiketli', () => {
    expect(paylasimMetni(girdi(), ADRES, 'whatsapp')).toContain('utm_source=whatsapp')
  })

  it('mahalle yoksa yalnızca Çorlu yazar', () => {
    expect(paylasimMetni(girdi({ mahalleAdi: null }), ADRES).split('\n')[0]).toBe(
      'Çorlu — Ferah 3+1 daire',
    )
  })
})

describe('görsel biçimleri', () => {
  it('yalnızca tanımlı biçimleri kabul eder', () => {
    expect(gecerliBicimMi('kare')).toBe(true)
    expect(gecerliBicimMi('hikaye')).toBe(true)
    expect(gecerliBicimMi('banner')).toBe(false)
  })
})
