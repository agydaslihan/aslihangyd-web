import { describe, expect, it } from 'vitest'

import {
  acikBolumler,
  BOLUMLER,
  bolumTanimi,
  kapaliBolumeAitMi,
  varsayilanDurumlar,
  type BolumAnahtari,
} from './siteBolumleri'

describe('bölüm tanımları', () => {
  it('şartnamedeki sekiz bölüm tanımlı', () => {
    expect(BOLUMLER.map((b) => b.anahtar)).toEqual([
      'danisman_ol',
      'ticari',
      'endeks',
      'raporlar',
      'gizli_portfoy',
      'mahalle_testi',
      'simulator',
      'bolge_radari',
    ])
  })

  /** ⚠️ Şartname: danışman ol varsayılan KAPALI. */
  it('danışman ol kapalı, diğerleri açık başlar', () => {
    const varsayilan = varsayilanDurumlar()
    expect(varsayilan.danisman_ol).toBe(false)

    for (const bolum of BOLUMLER) {
      if (bolum.anahtar === 'danisman_ol') continue
      expect(varsayilan[bolum.anahtar], bolum.anahtar).toBe(true)
    }
  })

  it('her bölümün rotası ve açıklaması var', () => {
    for (const bolum of BOLUMLER) {
      expect(bolum.rotalar.length, bolum.anahtar).toBeGreaterThan(0)
      expect(bolum.aciklama.length, bolum.anahtar).toBeGreaterThan(10)
      expect(bolum.adres.startsWith('/'), bolum.anahtar).toBe(true)
    }
  })

  it('bilinmeyen bölüm hata verir', () => {
    // @ts-expect-error — bilinçli olarak geçersiz anahtar.
    expect(() => bolumTanimi('yok')).toThrow(/Bilinmeyen site bölümü/)
  })
})

describe('rota kapısı', () => {
  const hepsiAcik = varsayilanDurumlar()
  const kapali = (...anahtarlar: BolumAnahtari[]): Record<BolumAnahtari, boolean> => {
    const durumlar = { ...hepsiAcik, danisman_ol: true }
    for (const anahtar of anahtarlar) durumlar[anahtar] = false
    return durumlar
  }

  it('açık bölümün rotası geçer', () => {
    expect(kapaliBolumeAitMi('/ticari', kapali())).toBeNull()
  })

  it('kapalı bölümün rotasını yakalar', () => {
    expect(kapaliBolumeAitMi('/ticari', kapali('ticari'))).toBe('ticari')
  })

  it('alt rotaları da kapatır', () => {
    expect(kapaliBolumeAitMi('/rapor/degerleme', kapali('raporlar'))).toBe('raporlar')
    expect(kapaliBolumeAitMi('/rapor/yatirim-simulatoru', kapali('raporlar'))).toBe('raporlar')
  })

  /**
   * ⚠️ Ön ek eşleşmesi sınır karakteri arar. Aksi halde `/ticari` kapalıyken
   * ileride açılacak bir `/ticaridukkanlar` rotası da kazara kapanırdı.
   */
  it('benzer adlı komşu rotayı kapatmaz', () => {
    expect(kapaliBolumeAitMi('/ticaridukkanlar', kapali('ticari'))).toBeNull()
    expect(kapaliBolumeAitMi('/raporlama', kapali('raporlar'))).toBeNull()
  })

  it('sondaki eğik çizgiyi ve sorgu dizesini yok sayar', () => {
    expect(kapaliBolumeAitMi('/ticari/', kapali('ticari'))).toBe('ticari')
    expect(kapaliBolumeAitMi('/ticari?a=1', kapali('ticari'))).toBe('ticari')
  })

  it('kök yolu hiçbir bölüme bağlamaz', () => {
    expect(kapaliBolumeAitMi('/', kapali('ticari', 'endeks'))).toBeNull()
  })

  it('araçlar altındaki simülatör ayrı kapanır, diğer araçlar açık kalır', () => {
    const durumlar = kapali('simulator')
    expect(kapaliBolumeAitMi('/araclar/yatirim-simulatoru', durumlar)).toBe('simulator')
    expect(kapaliBolumeAitMi('/araclar/kredi', durumlar)).toBeNull()
    expect(kapaliBolumeAitMi('/araclar', durumlar)).toBeNull()
  })
})

describe('açık bölüm listesi', () => {
  it('yalnızca açık olanları döner', () => {
    const durumlar = { ...varsayilanDurumlar(), ticari: false }
    const acik = acikBolumler(durumlar).map((b) => b.anahtar)

    expect(acik).not.toContain('ticari')
    expect(acik).not.toContain('danisman_ol')
    expect(acik).toContain('endeks')
  })
})
