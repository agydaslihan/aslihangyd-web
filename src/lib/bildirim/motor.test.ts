import { describe, expect, it } from 'vitest'

import {
  BAKIM_ESIK_SAAT,
  bildirimleriUret,
  gecenGun,
  saatFarki,
  siralaBildirimler,
  type BildirimGirdisi,
} from './motor'

const SIMDI = new Date('2026-08-06T12:00:00.000Z')

const temiz = (ek: Partial<BildirimGirdisi> = {}): BildirimGirdisi => ({
  yetkisiBitecekIlan: 0,
  yetkisiDolmusYayindaIlan: 0,
  bakimGorevleri: [],
  ilgisizPortfoy: 0,
  gozlemsizMahalle: 0,
  yetkiBelgesiVar: true,
  ...ek,
})

const gorev = (ek: Partial<BildirimGirdisi['bakimGorevleri'][number]> = {}) => ({
  anahtar: 'eids-kaldir',
  ad: 'EİDS — yetkisi dolan ilanları yayından kaldır',
  yasal: true,
  sonBasariliCalisma: '2026-08-06T03:10:00.000Z',
  sonHata: null,
  ...ek,
})

describe('temiz durum', () => {
  it('her şey yolundaysa hiç bildirim yok', () => {
    expect(bildirimleriUret(temiz({ bakimGorevleri: [gorev()] }), SIMDI)).toEqual([])
  })
})

describe('EİDS bildirimleri', () => {
  it('yaklaşan yetki bitişini bildirir', () => {
    const b = bildirimleriUret(temiz({ yetkisiBitecekIlan: 3 }), SIMDI)
    expect(b[0]?.anahtar).toBe('eids-bitiyor')
    expect(b[0]?.baslik).toContain('3 ilanın')
    expect(b[0]?.oncelik).toBe('yasal')
  })

  /**
   * ⚠️ Normalde imkânsız bir durum: kayıt kancası engelliyor, bakım görevi
   * geceleri temizliyor. Görünüyorsa bakım aksamış demektir ve her gün
   * ihlal süresi — bu yüzden ayrı ve en üstte.
   */
  it('yetkisi dolmuş ama yayındaki ilanı ayrı bildirir', () => {
    const b = bildirimleriUret(temiz({ yetkisiDolmusYayindaIlan: 2 }), SIMDI)
    expect(b[0]?.anahtar).toBe('eids-dolmus-yayinda')
    expect(b[0]?.oncelik).toBe('yasal')
  })

  it('dolmuş ilan uyarısı yaklaşan bitiş uyarısının üstünde', () => {
    const b = bildirimleriUret(temiz({ yetkisiDolmusYayindaIlan: 1, yetkisiBitecekIlan: 5 }), SIMDI)
    expect(b.map((x) => x.anahtar)).toEqual(['eids-dolmus-yayinda', 'eids-bitiyor'])
  })
})

describe('bakım görevi nöbetçisi', () => {
  it('eşik içinde çalışmışsa sessiz', () => {
    const b = bildirimleriUret(
      temiz({ bakimGorevleri: [gorev({ sonBasariliCalisma: '2026-08-06T03:10:00.000Z' })] }),
      SIMDI,
    )
    expect(b).toEqual([])
  })

  it('eşiği aşınca uyarır', () => {
    // 2 gün 9 saat önce çalışmış.
    const b = bildirimleriUret(
      temiz({ bakimGorevleri: [gorev({ sonBasariliCalisma: '2026-08-04T03:10:00.000Z' })] }),
      SIMDI,
    )
    expect(b[0]?.anahtar).toBe('bakim-gecikti-eids-kaldir')
    expect(b[0]?.baslik).toContain('2 gündür')
    expect(b[0]?.oncelik).toBe('yasal')
  })

  /**
   * ⚠️ 27 saat matematiksel olarak "1 gün" ama insan diliyle "dün gece
   * çalışmadı". Tek kaçırılmış koşuyu "1 gündür çalışmıyor" diye sunmak,
   * onu süregelen bir arıza gibi gösterirdi.
   */
  it('tek kaçırılmış koşu "dün çalışmadı" der', () => {
    for (const saat of [27, 30, 40, 47]) {
      const an = new Date(SIMDI.getTime() - saat * 3_600_000).toISOString()
      const b = bildirimleriUret(
        temiz({ bakimGorevleri: [gorev({ sonBasariliCalisma: an })] }),
        SIMDI,
      )
      expect(b[0]?.baslik, `${saat} saat`).toContain('dün çalışmadı')
    }
  })

  /**
   * ⚠️ 26 saat, 24 değil. Cron saat kayması ya da uzun süren bir görev
   * yüzünden 24'ü birkaç dakika aşabilir; 24'e sabitlemek her gün yanlış
   * alarm üretirdi ve yanlış alarm veren uyarı görmezden gelinir.
   */
  it('24-26 saat arası yanlış alarm vermez', () => {
    const yirmiBesSaatOnce = new Date(SIMDI.getTime() - 25 * 3_600_000).toISOString()
    const b = bildirimleriUret(
      temiz({ bakimGorevleri: [gorev({ sonBasariliCalisma: yirmiBesSaatOnce })] }),
      SIMDI,
    )
    expect(b).toEqual([])
  })

  it('eşiğin hemen üstünde uyarır', () => {
    const asan = new Date(SIMDI.getTime() - (BAKIM_ESIK_SAAT + 1) * 3_600_000).toISOString()
    const b = bildirimleriUret(
      temiz({ bakimGorevleri: [gorev({ sonBasariliCalisma: asan })] }),
      SIMDI,
    )
    expect(b).toHaveLength(1)
    expect(b[0]?.baslik).toContain('dün çalışmadı')
  })

  it('hiç çalışmamışsa ayrı mesaj verir', () => {
    const b = bildirimleriUret(
      temiz({ bakimGorevleri: [gorev({ sonBasariliCalisma: null })] }),
      SIMDI,
    )
    expect(b[0]?.anahtar).toBe('bakim-hic-eids-kaldir')
    expect(b[0]?.aciklama).toContain('Cron kurulumu')
  })

  it('hata döndürmüşse bildirir', () => {
    const b = bildirimleriUret(
      temiz({ bakimGorevleri: [gorev({ sonHata: 'bağlantı koptu' })] }),
      SIMDI,
    )
    expect(b[0]?.anahtar).toBe('bakim-hata-eids-kaldir')
    expect(b[0]?.aciklama).toContain('bağlantı koptu')
  })

  it('yasal olmayan görev "önemli" seviyesinde kalır', () => {
    const b = bildirimleriUret(
      temiz({
        bakimGorevleri: [
          gorev({ anahtar: 'eids-uyar', ad: 'Uyarı', yasal: false, sonBasariliCalisma: null }),
        ],
      }),
      SIMDI,
    )
    expect(b[0]?.oncelik).toBe('onemli')
  })

  it('geçersiz tarih "hiç çalışmadı" sayılır', () => {
    const b = bildirimleriUret(
      temiz({ bakimGorevleri: [gorev({ sonBasariliCalisma: 'bozuk-tarih' })] }),
      SIMDI,
    )
    expect(b[0]?.anahtar).toBe('bakim-hic-eids-kaldir')
  })
})

describe('yetki belgesi', () => {
  it('numara yoksa yasal uyarı', () => {
    const b = bildirimleriUret(temiz({ yetkiBelgesiVar: false }), SIMDI)
    expect(b[0]?.anahtar).toBe('yetki-belgesi-yok')
    expect(b[0]?.oncelik).toBe('yasal')
  })
})

describe('ticari bildirimler', () => {
  it('ilgisiz portföyü bildirir', () => {
    const b = bildirimleriUret(temiz({ ilgisizPortfoy: 4 }), SIMDI)
    expect(b[0]?.baslik).toContain('4 portföy')
    expect(b[0]?.oncelik).toBe('bilgi')
  })

  it('gözlemsiz mahalleyi bildirir', () => {
    const b = bildirimleriUret(temiz({ gozlemsizMahalle: 2 }), SIMDI)
    expect(b[0]?.baslik).toContain('2 mahallede')
    expect(b[0]?.oncelik).toBe('bilgi')
  })
})

describe('sıralama', () => {
  /**
   * ⚠️ Bir portföyün ilgi görmemesi ticari bir sorun; yetkisi dolmuş
   * ilanın yayında kalması idari yaptırım. Aynı görsel ağırlıkta
   * göstermek ikincisini görünmez kılar.
   */
  it('yasal olanlar her zaman üstte', () => {
    const b = bildirimleriUret(
      temiz({
        ilgisizPortfoy: 9,
        gozlemsizMahalle: 9,
        yetkisiBitecekIlan: 1,
        yetkiBelgesiVar: false,
      }),
      SIMDI,
    )
    const oncelikler = b.map((x) => x.oncelik)
    expect(oncelikler.slice(0, 2)).toEqual(['yasal', 'yasal'])
    expect(oncelikler[oncelikler.length - 1]).toBe('bilgi')
  })

  it('eşit öncelikte tanım sırası korunur', () => {
    const b = siralaBildirimler([
      { anahtar: 'a', oncelik: 'bilgi', baslik: 'A', aciklama: '' },
      { anahtar: 'b', oncelik: 'bilgi', baslik: 'B', aciklama: '' },
      { anahtar: 'c', oncelik: 'yasal', baslik: 'C', aciklama: '' },
    ])
    expect(b.map((x) => x.anahtar)).toEqual(['c', 'a', 'b'])
  })
})

describe('her bildirimin açıklaması dolu', () => {
  /** Ne yapılacağını söylemeyen uyarı, yalnızca kaygı üretir. */
  it('boş açıklama üretilmiyor', () => {
    const b = bildirimleriUret(
      temiz({
        yetkisiBitecekIlan: 1,
        yetkisiDolmusYayindaIlan: 1,
        ilgisizPortfoy: 1,
        gozlemsizMahalle: 1,
        yetkiBelgesiVar: false,
        bakimGorevleri: [gorev({ sonBasariliCalisma: null })],
      }),
      SIMDI,
    )
    expect(b.length).toBeGreaterThan(4)
    for (const bildirim of b) {
      expect(bildirim.aciklama.length, bildirim.anahtar).toBeGreaterThan(20)
    }
  })
})

describe('yardımcılar', () => {
  it('saat farkı hesaplar', () => {
    expect(saatFarki('2026-08-06T00:00:00.000Z', SIMDI)).toBe(12)
    expect(saatFarki(null, SIMDI)).toBeNull()
    expect(saatFarki('bozuk', SIMDI)).toBeNull()
  })

  it('geçen günü Europe/Istanbul gününe göre sayar', () => {
    expect(gecenGun('2026-08-01T00:00:00.000Z', SIMDI)).toBe(5)
    expect(gecenGun(null, SIMDI)).toBeNull()
  })
})
