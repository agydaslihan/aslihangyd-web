import { describe, expect, it } from 'vitest'

import { gecerliGorevMi, GOREV_KAYDI, gorevTanimi } from './gorevler'

/**
 * Görev kaydının sözleşmesi.
 *
 * Bu testler görevlerin ne YAPTIĞINI denetlemiyor — onu entegrasyon
 * testi yapıyor. Buradaki iş, kaydın işletme belgesiyle tutarlı kalmasını
 * sağlamak: her görevin bir sıklığı, bir başarısızlık sonucu ve doğru bir
 * yasal etiketi olmalı.
 */
describe('bakım görev kaydı', () => {
  it('üç görev tanımlı', () => {
    expect(GOREV_KAYDI.map((gorev) => gorev.anahtar)).toEqual([
      'eids-kaldir',
      'eids-uyar',
      'kvkk-sil',
    ])
  })

  it('anahtarlar benzersiz', () => {
    const anahtarlar = GOREV_KAYDI.map((gorev) => gorev.anahtar)
    expect(new Set(anahtarlar).size).toBe(anahtarlar.length)
  })

  /**
   * ⚠️ Her görevin "çalışmazsa ne olur" cümlesi zorunlu.
   *
   * Bir bakım görevinin en tehlikeli hali sessizce çalışmamasıdır.
   * Sonucu yazılmamış bir görev, aksadığında kimsenin aciliyetini
   * ölçemediği bir görevdir.
   */
  it('her görevin başarısızlık sonucu yazılı', () => {
    for (const gorev of GOREV_KAYDI) {
      expect(gorev.calismazsaSonuc.length, gorev.anahtar).toBeGreaterThan(80)
      expect(gorev.siklik.length, gorev.anahtar).toBeGreaterThan(5)
    }
  })

  /**
   * ⚠️ EİDS yayından kaldırma ve KVKK silme YASAL yükümlülüktür.
   *
   * Bu bayrak işletme belgesindeki aciliyet sıralamasını sürüyor. Biri
   * yanlışlıkla `false` yapılırsa, aksadığında "ertelenebilir" muamelesi
   * görür — ve bu tam olarak yapılmaması gereken şey.
   */
  it('yasal görevler doğru işaretli', () => {
    expect(gorevTanimi('eids-kaldir').yasal).toBe(true)
    expect(gorevTanimi('kvkk-sil').yasal).toBe(true)
    // Uyarı görevi bilgilendirmedir; aksaması yasal ihlal doğurmaz.
    expect(gorevTanimi('eids-uyar').yasal).toBe(false)
  })

  it('EİDS kaldırma görevi günlük çalışacak şekilde tanımlı', () => {
    // Yasal risk taşıyan görev haftalığa çekilirse en fazla 7 gün boyunca
    // yetkisiz ilan yayında kalabilirdi.
    expect(gorevTanimi('eids-kaldir').siklik).toMatch(/[Hh]er gün/)
    expect(gorevTanimi('kvkk-sil').siklik).toMatch(/[Hh]er gün/)
  })

  it('geçerli görev denetimi bilinmeyeni reddeder', () => {
    expect(gecerliGorevMi('eids-kaldir')).toBe(true)
    expect(gecerliGorevMi('kvkk-sil')).toBe(true)
    expect(gecerliGorevMi('rm-rf')).toBe(false)
    expect(gecerliGorevMi('')).toBe(false)
  })

  it('bilinmeyen görev tanımı hata verir', () => {
    // @ts-expect-error — bilinçli olarak geçersiz anahtar.
    expect(() => gorevTanimi('yok')).toThrow(/Bilinmeyen bakım görevi/)
  })
})
