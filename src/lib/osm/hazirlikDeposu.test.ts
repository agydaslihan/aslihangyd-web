import { describe, expect, it } from 'vitest'

import { HazirlikDeposu } from './hazirlikDeposu'

describe('HazirlikDeposu', () => {
  it('yazılanı okur', () => {
    const depo = new HazirlikDeposu<number>()
    depo.yaz(1, 42)
    expect(depo.oku(1)).toBe(42)
  })

  it('olmayan kullanıcı için null', () => {
    expect(new HazirlikDeposu<number>().oku('yok')).toBeNull()
  })

  /**
   * ⚠️ KULLANICI BAŞINA AYRI — İKİ YÖNETİCİ BİRBİRİNİN PARÇASINI GÖRMEMELİ.
   *
   * Aynı anda içe aktarma yapan iki kişi tek bir hazırlığı paylaşsaydı,
   * birinin yazdığı geometri diğerinin önizlemesinde belirirdi.
   */
  it('kullanıcılar birbirinin hazırlığını görmez', () => {
    const depo = new HazirlikDeposu<string>()
    depo.yaz('aslihan', 'A')
    depo.yaz('danisman', 'D')
    expect(depo.oku('aslihan')).toBe('A')
    expect(depo.oku('danisman')).toBe('D')
  })

  it('silinen hazırlık geri gelmez', () => {
    const depo = new HazirlikDeposu<string>()
    depo.yaz(7, 'x')
    depo.sil(7)
    expect(depo.oku(7)).toBeNull()
  })

  /**
   * ⚠️ Bellek kaza koruması: sınırsız birikirse uzun süre ayakta duran bir
   * kap, terk edilmiş hazırlıkların geometrisini taşımaya devam ederdi.
   */
  it('kayıt sayısı sınırlı — en eski düşer', () => {
    const depo = new HazirlikDeposu<number>()
    for (let i = 0; i < 20; i += 1) depo.yaz(i, i)

    const yasayan = Array.from({ length: 20 }, (_, i) => depo.oku(i)).filter((v) => v !== null)
    expect(yasayan.length).toBeLessThanOrEqual(8)
    // En son yazılan mutlaka duruyor.
    expect(depo.oku(19)).toBe(19)
  })
})
