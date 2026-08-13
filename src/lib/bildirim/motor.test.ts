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
  // Varsayılan: yapılandırma eksiksiz. Eksiklik senaryoları ayrı testlerde.
  eksikAyarlar: [],
  eskiAdliAyarlar: [],
  siteAdresindePortVar: false,
  onayBekleyenIlan: 0,
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

// ═══════════════════════════════════════════════════════════════════════════
describe('onay bekleyen ilan bildirimi', () => {
  it('kuyruk boşken bildirim üretmez', () => {
    const bildirimler = bildirimleriUret(temiz(), SIMDI)
    expect(bildirimler.find((b) => b.anahtar === 'onay-bekleyen-ilan')).toBeUndefined()
  })

  it('kuyrukta ilan varsa bildirir ve kuyruğa bağlantı verir', () => {
    const bildirimler = bildirimleriUret(temiz({ onayBekleyenIlan: 3 }), SIMDI)
    const bildirim = bildirimler.find((b) => b.anahtar === 'onay-bekleyen-ilan')

    expect(bildirim).toBeDefined()
    expect(bildirim?.baslik).toContain('3 ilan')
    expect(bildirim?.adres).toContain('onay_bekliyor')
  })

  it('tek ilanda tekil dil kullanır', () => {
    const bildirimler = bildirimleriUret(temiz({ onayBekleyenIlan: 1 }), SIMDI)
    expect(bildirimler.find((b) => b.anahtar === 'onay-bekleyen-ilan')?.baslik).toBe(
      '1 ilan yayın onayı bekliyor',
    )
  })

  it('YASAL değil önemli — yetkisiz yayınla aynı ağırlıkta gösterilmez', () => {
    // Kuyrukta bekleyen ilan duran bir iştir, ihlal değil. İkisini aynı
    // görsel ağırlıkta göstermek yasal olanı görünmez kılar.
    const bildirimler = bildirimleriUret(temiz({ onayBekleyenIlan: 2 }), SIMDI)
    expect(bildirimler.find((b) => b.anahtar === 'onay-bekleyen-ilan')?.oncelik).toBe('onemli')
  })
})

/**
 * Çalışma zamanı yapılandırması bildirimleri.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: EKSİK AYAR SESSİZDİ VE ÜRETİMDE FORMLARI KORUMASIZ BIRAKTI.
 *
 * 13 Ağustos 2026'da canlıda dokuz çalışma zamanı ayarının dokuzu da boştu:
 * `.env` eski `NEXT_PUBLIC_*` adlarında kalmıştı. En ağırı Turnstile'dı —
 * GİZLİ anahtar dolu, SİTE anahtarı boştu; yani doğrulama katmanı kapalıydı
 * ama yapılandırma "yarım dolu" göründüğü için hiçbir yerde uyarı yoktu.
 *
 * Bu testler eksikliğin artık GÖRÜNÜR olduğunu güvenceye alıyor.
 * ─────────────────────────────────────────────────────────────────────────
 */
describe('çalışma zamanı yapılandırması bildirimleri', () => {
  const turnstileEksik = {
    ad: 'TURNSTILE_SITE_ANAHTARI',
    aciklama: 'Cloudflare Turnstile site anahtarı',
    eksikseNeOlur: 'Formlar BOT KORUMASIZ çalışır.',
    kritik: true,
  }

  it('kritik eksik ayar YASAL öncelikle ve kendi bildirimiyle görünür', () => {
    const bildirimler = bildirimleriUret(temiz({ eksikAyarlar: [turnstileEksik] }), SIMDI)
    const bildirim = bildirimler.find((b) => b.anahtar.startsWith('ayar-eksik-turnstile'))

    expect(bildirim, 'Turnstile eksikliği kendi bildirimini almalı').toBeDefined()
    expect(bildirim?.oncelik).toBe('yasal')
    // ⚠️ Ne yapılacağı yazmalı: "eksik" demek tek başına eyleme dönük değil.
    expect(bildirim?.aciklama).toContain('TURNSTILE_SITE_ANAHTARI')
  })

  it('kritik olmayan eksikler tek bildirimde toplanır', () => {
    const bildirimler = bildirimleriUret(
      temiz({
        eksikAyarlar: [
          { ad: 'UMAMI_URL', aciklama: 'Umami', eksikseNeOlur: 'Ölçüm yapılmaz.', kritik: false },
          {
            ad: 'UMAMI_SITE_ID',
            aciklama: 'Umami',
            eksikseNeOlur: 'Ölçüm yapılmaz.',
            kritik: false,
          },
        ],
      }),
      SIMDI,
    )

    const toplu = bildirimler.filter((b) => b.anahtar === 'ayar-eksik')
    expect(toplu, 'iki eksik tek bildirimde toplanmalı').toHaveLength(1)
    expect(toplu[0]?.baslik).toContain('2')
  })

  it('site adresindeki port yasal öncelikli bildirim üretir', () => {
    const bildirimler = bildirimleriUret(temiz({ siteAdresindePortVar: true }), SIMDI)
    const bildirim = bildirimler.find((b) => b.anahtar === 'site-adresinde-port')

    expect(bildirim).toBeDefined()
    expect(bildirim?.oncelik).toBe('yasal')
  })

  /**
   * ⚠️ Eski adla okunan ayar bir ARIZA DEĞİL: site çalışıyor. Ama borç
   * olduğu için görünmeli — destek bir gün kaldırılacak ve o gün sürpriz
   * olmamalı. Bu yüzden "bilgi" önceliğinde.
   */
  it('eski adla okunan ayar bilgi önceliğinde görünür', () => {
    const bildirimler = bildirimleriUret(
      temiz({ eskiAdliAyarlar: [{ ad: 'WHATSAPP_NUMARA', aciklama: 'WhatsApp' }] }),
      SIMDI,
    )
    const bildirim = bildirimler.find((b) => b.anahtar === 'ayar-eski-ad')

    expect(bildirim).toBeDefined()
    expect(bildirim?.oncelik).toBe('bilgi')
  })

  it('yapılandırma eksiksizken hiçbir ayar bildirimi çıkmaz', () => {
    const bildirimler = bildirimleriUret(temiz(), SIMDI)
    expect(bildirimler.filter((b) => b.anahtar.startsWith('ayar-'))).toEqual([])
    expect(bildirimler.find((b) => b.anahtar === 'site-adresinde-port')).toBeUndefined()
  })
})
