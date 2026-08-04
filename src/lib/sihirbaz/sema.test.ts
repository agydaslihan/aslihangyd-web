import { describe, expect, it } from 'vitest'

import {
  adimHatalari,
  eidsSemasi,
  konumSemasi,
  rakamlarSemasi,
  sihirbazSemasi,
  temelSemasi,
} from './sema'

/**
 * ⚠️ Buradaki değerler UYDURMADIR; şema mantığını sınamak içindir.
 */
function tamGirdi(degisiklik: Record<string, unknown> = {}) {
  return {
    baslik: 'Muhittin Mahallesinde 3+1 bahçe katı',
    tip: 'satilik',
    kategori: 'konut',
    ozet: '',
    il: 'Tekirdağ',
    ilce: 'Çorlu',
    mahalle: '12',
    adres: '',
    ada: '',
    parsel: '',
    fiyat: '',
    paraBirimi: 'TRY',
    tahminiKira: '',
    aidat: '',
    brutM2: '',
    netM2: '',
    bulunduguKat: '',
    toplamKat: '',
    binaYasi: '',
    eidsDurum: '',
    tasinmazNo: '',
    eidsYetkiBaslangic: '',
    eidsYetkiBitis: '',
    gizliPortfoy: false,
    ...degisiklik,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
describe('temelSemasi', () => {
  it('kısa başlığı reddeder — arama sonuçlarında bu metin görünecek', () => {
    const sonuc = temelSemasi.safeParse({ baslik: 'Ev', tip: 'satilik', kategori: 'konut' })
    expect(sonuc.success).toBe(false)
  })

  it('geçersiz tip değerini reddeder', () => {
    const sonuc = temelSemasi.safeParse({
      baslik: 'Yeterince uzun bir ilan başlığı',
      tip: 'devren',
      kategori: 'konut',
    })
    expect(sonuc.success).toBe(false)
  })

  it('özet isteğe bağlıdır', () => {
    const sonuc = temelSemasi.safeParse({
      baslik: 'Yeterince uzun bir ilan başlığı',
      tip: 'satilik',
      kategori: 'konut',
    })
    expect(sonuc.success).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('konumSemasi', () => {
  it('mahalle seçilmeden geçmez', () => {
    const sonuc = konumSemasi.safeParse({ il: 'Tekirdağ', ilce: 'Çorlu', mahalle: '' })
    expect(sonuc.success).toBe(false)
  })

  /**
   * Ada ve parsel EİDS için gerekli ama TASLAK için değil. Burada zorunlu
   * kılmak, "yetkiyi henüz almadım, önce taşınmazı gireyim" gibi tamamen
   * meşru bir akışı imkânsız kılardı.
   */
  it('ada ve parsel taslak için zorunlu değildir', () => {
    const sonuc = konumSemasi.safeParse({ il: 'Tekirdağ', ilce: 'Çorlu', mahalle: '3' })
    expect(sonuc.success).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('rakamlarSemasi — girilmedi ile sıfır ayrımı', () => {
  /**
   * Bu ayrım motorların temel varsayımı. Boş alan sıfıra düşerse yatırım
   * göstergeleri sessizce yanlış hesaplanır (CLAUDE.md kural 2).
   */
  it('boş sayı alanı undefined olur, sıfır DEĞİL', () => {
    const sonuc = rakamlarSemasi.safeParse({ fiyat: '', brutM2: '' })
    expect(sonuc.success).toBe(true)
    if (!sonuc.success) return

    expect(sonuc.data.fiyat).toBeUndefined()
    expect(sonuc.data.brutM2).toBeUndefined()
  })

  it('açıkça girilen sıfır korunur', () => {
    const sonuc = rakamlarSemasi.safeParse({ aidat: '0' })
    expect(sonuc.success).toBe(true)
    if (!sonuc.success) return
    expect(sonuc.data.aidat).toBe(0)
  })

  it('sayı olmayan değeri reddeder', () => {
    expect(rakamlarSemasi.safeParse({ fiyat: 'beş milyon' }).success).toBe(false)
  })

  it('negatif değeri reddeder', () => {
    expect(rakamlarSemasi.safeParse({ fiyat: '-100' }).success).toBe(false)
  })

  it('para birimi girilmezse TRY varsayılır', () => {
    const sonuc = rakamlarSemasi.safeParse({})
    expect(sonuc.success).toBe(true)
    if (!sonuc.success) return
    expect(sonuc.data.paraBirimi).toBe('TRY')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('eidsSemasi', () => {
  /**
   * ⚠️ Sihirbaz taslak üretir; taslak için EİDS aranmaz. Bu gevşeklik
   * yayın kapısını GEVŞETMEZ — kapı `eidsYayinEngeli` kancasındadır ve
   * entegrasyon testiyle ayrıca kanıtlanır.
   */
  it('EİDS alanları boş bırakılabilir — taslak için zorunlu değil', () => {
    const sonuc = eidsSemasi.safeParse({
      eidsDurum: '',
      tasinmazNo: '',
      eidsYetkiBaslangic: '',
      eidsYetkiBitis: '',
    })
    // Boş dize enum'a uymaz; alan hiç gönderilmemiş sayılmalı.
    expect(sonuc.success).toBe(false)

    const bossuz = eidsSemasi.safeParse({ tasinmazNo: '' })
    expect(bossuz.success).toBe(true)
  })

  it('geçersiz tarih biçimini reddeder', () => {
    expect(eidsSemasi.safeParse({ eidsYetkiBitis: '31.12.2099' }).success).toBe(false)
    expect(eidsSemasi.safeParse({ eidsYetkiBitis: '2099-12-31' }).success).toBe(true)
  })

  it('tanınmayan yetki durumunu reddeder', () => {
    expect(eidsSemasi.safeParse({ eidsDurum: 'belki' }).success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('sihirbazSemasi', () => {
  it('eksiksiz girdiyi kabul eder', () => {
    const sonuc = sihirbazSemasi.safeParse(tamGirdi({ eidsDurum: undefined }))
    expect(sonuc.success).toBe(true)
  })

  it('gizli portföy onay kutusunun "on" değerini boolean yapar', () => {
    const sonuc = sihirbazSemasi.safeParse(tamGirdi({ eidsDurum: undefined, gizliPortfoy: 'on' }))
    expect(sonuc.success).toBe(true)
    if (!sonuc.success) return
    expect(sonuc.data.gizliPortfoy).toBe(true)
  })

  it('gizli portföy gönderilmezse false olur', () => {
    const sonuc = sihirbazSemasi.safeParse(
      tamGirdi({ eidsDurum: undefined, gizliPortfoy: undefined }),
    )
    expect(sonuc.success).toBe(true)
    if (!sonuc.success) return
    expect(sonuc.data.gizliPortfoy).toBe(false)
  })

  /**
   * Şemada `durum` alanı YOK. Bu bir eksiklik değil, güvenlik kararı:
   * eylem `durum`u sabit `taslak` yazar ve istemciden gelen hiçbir değer
   * o alana ulaşamaz.
   */
  it('durum alanı şemada yoktur — istemci yayın durumu dayatamaz', () => {
    const sonuc = sihirbazSemasi.safeParse(tamGirdi({ eidsDurum: undefined, durum: 'yayinda' }))
    expect(sonuc.success).toBe(true)
    if (!sonuc.success) return
    expect('durum' in sonuc.data).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('adimHatalari', () => {
  it('hata yoksa boş nesne döner', () => {
    expect(
      adimHatalari(temelSemasi, {
        baslik: 'Yeterince uzun bir ilan başlığı',
        tip: 'satilik',
        kategori: 'konut',
      }),
    ).toEqual({})
  })

  it('alan başına tek mesaj döndürür', () => {
    const hatalar = adimHatalari(temelSemasi, { baslik: 'Ev', tip: 'satilik', kategori: 'konut' })

    expect(Object.keys(hatalar)).toEqual(['baslik'])
    expect(typeof hatalar.baslik).toBe('string')
  })

  it('mesajlar Türkçedir — Zod varsayılanı sızmaz', () => {
    const hatalar = adimHatalari(temelSemasi, {})

    for (const mesaj of Object.values(hatalar)) {
      expect(mesaj).not.toMatch(/Invalid|expected|required/i)
    }
  })
})
