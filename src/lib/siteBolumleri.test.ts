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
  it('tanımlı bölümler ve sıraları', () => {
    expect(BOLUMLER.map((b) => b.anahtar)).toEqual([
      'danisman_ol',
      'harita',
      'ticari',
      'endeks',
      'raporlar',
      'gizli_portfoy',
      'mahalle_testi',
      'simulator',
      'ai_arama',
      'google_places',
      'bolge_radari',
    ])
  })

  /**
   * Varsayılan kapalı başlayan bölümler ve SEBEPLERİ.
   *
   * ⚠️ Liste bilinçli olarak açıkça yazılıyor; "kapalı olanları atla"
   * demek, yeni bir bölümün yanlışlıkla kapalı doğmasını gizlerdi.
   *
   * · `danisman_ol`   — şartname gereği (henüz danışman alımı yok)
   * · `ai_arama`      — KVKK: aydınlatma metni avukattan gelmeden açılmaz
   * · `google_places` — MALİYET: ücretli servis, kendiliğinden açılmamalı.
   *                     Anahtar tanımlı olsa bile bu anahtar açılmadan
   *                     hiçbir Google çağrısı yapılmaz.
   */
  const VARSAYILAN_KAPALILAR: BolumAnahtari[] = ['danisman_ol', 'ai_arama', 'google_places']

  it('yalnızca gerekçesi olan bölümler kapalı başlar', () => {
    const varsayilan = varsayilanDurumlar()

    for (const bolum of BOLUMLER) {
      const beklenen = !VARSAYILAN_KAPALILAR.includes(bolum.anahtar)
      expect(varsayilan[bolum.anahtar], bolum.anahtar).toBe(beklenen)
    }
  })

  /**
   * ⚠️ Her bölüm bir SAYFA değil.
   *
   * `ai_arama` mevcut bir sayfanın üzerindeki bir bileşen; kendi rotası
   * yok ve olmamalı. Kural "her bölümün rotası vardır"dan "rotasız bölüm
   * gezinmede görünmez"e daraltıldı: rotasız bir bölümü altbilgiye koymak,
   * hiçbir yere gitmeyen bir bağlantı üretirdi.
   */
  it('sayfa bölümlerinin rotası var, bileşen bölümleri gezinmede görünmez', () => {
    for (const bolum of BOLUMLER) {
      expect(bolum.aciklama.length, bolum.anahtar).toBeGreaterThan(10)
      expect(bolum.adres.startsWith('/'), bolum.anahtar).toBe(true)

      if (bolum.rotalar.length === 0) {
        expect(bolum.gezinmede, `${bolum.anahtar} rotasız ama gezinmede`).toBe(false)
      }
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

// ═══════════════════════════════════════════════════════════════════════════
describe('AI arama bölümü', () => {
  it('VARSAYILAN KAPALI — KVKK kararı', () => {
    // ⚠️ Aydınlatma metni avukattan gelmeden açılmamalı.
    // docs/AI-ARAMA-KVKK-NOTU.md
    expect(bolumTanimi('ai_arama').varsayilanAcik).toBe(false)
    expect(varsayilanDurumlar().ai_arama).toBe(false)
  })

  it('rotası yok — sayfa değil, bileşen', () => {
    expect(bolumTanimi('ai_arama').rotalar).toEqual([])
  })

  it('rotası olmadığı için hiçbir yolu 404 yapmaz', () => {
    const durumlar = { ...varsayilanDurumlar(), ai_arama: false }
    expect(kapaliBolumeAitMi('/portfoy', durumlar)).not.toBe('ai_arama')
    expect(kapaliBolumeAitMi('/portfoy/bir-ilan', durumlar)).not.toBe('ai_arama')
  })

  it('altbilgi gezinmesinde görünmez', () => {
    expect(bolumTanimi('ai_arama').gezinmede).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('Google Places bölümü', () => {
  it('VARSAYILAN KAPALI — maliyet kararı', () => {
    // ⚠️ Ücretli servis. Anahtar sunucuya konur konmaz kendiliğinden
    // açılmamalı; açma kararı insanın.
    expect(bolumTanimi('google_places').varsayilanAcik).toBe(false)
    expect(varsayilanDurumlar().google_places).toBe(false)
  })

  it('rotası yok — sayfa değil, mevcut sayfaların üzerinde bir katman', () => {
    expect(bolumTanimi('google_places').rotalar).toEqual([])
  })

  it('rotası olmadığı için hiçbir yolu 404 yapmaz', () => {
    const durumlar = { ...varsayilanDurumlar(), google_places: false }
    expect(kapaliBolumeAitMi('/mahalleler/muhittin', durumlar)).not.toBe('google_places')
    expect(kapaliBolumeAitMi('/veri-kaynaklari', durumlar)).not.toBe('google_places')
  })

  it('altbilgi gezinmesinde görünmez', () => {
    expect(bolumTanimi('google_places').gezinmede).toBe(false)
  })
})
