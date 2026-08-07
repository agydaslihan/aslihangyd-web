import { describe, expect, it } from 'vitest'

import {
  ASGARI_CARPAN_GOZLEMI,
  OLCUTLER,
  olcutTanimi,
  olcutUygula,
  ortalamaCarpan,
  tekrarlariAyikla,
  type OlcutGirdisi,
} from './bolumler'

const ilan = (id: number, ek: Partial<OlcutGirdisi> = {}): OlcutGirdisi & { id: number } => ({
  id,
  kategori: 'konut',
  kiraCarpani: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...ek,
})

describe('ölçüt tanımları', () => {
  it('dördü de tanımlı', () => {
    expect(OLCUTLER.map((o) => o.anahtar)).toEqual([
      'yatirimGetirisi',
      'yeniEklenenler',
      'gizliPortfoy',
      'ticariSanayi',
    ])
  })

  /**
   * ⚠️ Alt başlık ölçütü anlatır. Boş bırakılan bir alt başlık, başlığın
   * "neye göre?" sorusunu cevapsız bırakması demektir.
   */
  it('her ölçütün alt başlığı dolu', () => {
    for (const olcut of OLCUTLER) {
      expect(olcut.varsayilanAltBaslik.length, olcut.anahtar).toBeGreaterThan(15)
    }
  })

  it('başlıklarda emoji yok', () => {
    const emoji = /\p{Extended_Pictographic}/u
    for (const olcut of OLCUTLER) {
      expect(emoji.test(olcut.varsayilanBaslik), olcut.anahtar).toBe(false)
      expect(emoji.test(olcut.varsayilanAltBaslik), olcut.anahtar).toBe(false)
    }
  })

  /**
   * ⚠️ "İlçe ortalaması" iddiası piyasa verisi gerektirir; bizde yok.
   * Elimizdeki portföy ortalamasını ilçe ortalamasıymış gibi sunmak
   * doğrulanamayan bir iddia olurdu.
   */
  it('yatırım getirisi ölçütü ilçe ortalaması iddia etmiyor', () => {
    expect(olcutTanimi('yatirimGetirisi').varsayilanAltBaslik).not.toMatch(/ilçe/i)
    expect(olcutTanimi('yatirimGetirisi').varsayilanAltBaslik).toMatch(/portföy/i)
  })

  it('yalnızca gizli portföy kilitli', () => {
    expect(olcutTanimi('gizliPortfoy').kilitli).toBe(true)
    expect(olcutTanimi('yeniEklenenler').kilitli).toBe(false)
  })

  it('bilinmeyen ölçüt hata verir', () => {
    // @ts-expect-error — bilinçli olarak geçersiz ölçüt.
    expect(() => olcutTanimi('yok')).toThrow(/Bilinmeyen bölüm ölçütü/)
  })
})

describe('ortalama kira çarpanı', () => {
  it('yetersiz gözlemde null döner', () => {
    const az = Array.from({ length: ASGARI_CARPAN_GOZLEMI - 1 }, (_, i) =>
      ilan(i, { kiraCarpani: 10 }),
    )
    expect(ortalamaCarpan(az)).toBeNull()
  })

  it('eşiğe ulaşınca hesaplar', () => {
    const yeterli = Array.from({ length: ASGARI_CARPAN_GOZLEMI }, (_, i) =>
      ilan(i, { kiraCarpani: 10 }),
    )
    expect(ortalamaCarpan(yeterli)).toBe(10)
  })

  it('çarpanı olmayan ilanlar ortalamaya girmez', () => {
    const karisik = [
      ...Array.from({ length: 4 }, (_, i) => ilan(i, { kiraCarpani: 12 })),
      ilan(90, { kiraCarpani: null }),
      ilan(91, { kiraCarpani: 0 }),
    ]
    expect(ortalamaCarpan(karisik)).toBe(12)
  })
})

describe('yatırım getirisi ölçütü', () => {
  const havuz = [
    ilan(1, { kiraCarpani: 8 }),
    ilan(2, { kiraCarpani: 12 }),
    ilan(3, { kiraCarpani: 16 }),
    ilan(4, { kiraCarpani: 24 }),
  ]

  it('ortalamanın altındakileri seçer', () => {
    // Ortalama 15 → 8 ve 12 kalır.
    const sonuc = olcutUygula('yatirimGetirisi', havuz, havuz, 10)
    expect(sonuc.ilanlar.map((i) => i.id)).toEqual([1, 2])
  })

  it('en düşük çarpan başa gelir', () => {
    const sonuc = olcutUygula('yatirimGetirisi', havuz, havuz, 10)
    expect(sonuc.ilanlar[0]?.kiraCarpani).toBe(8)
  })

  it('adet sınırına uyar', () => {
    expect(olcutUygula('yatirimGetirisi', havuz, havuz, 1).ilanlar).toHaveLength(1)
  })

  /** Boş sıra göstermek yerine sebebi yazılır. */
  it('yetersiz gözlemde sebebi bildirir', () => {
    const az = [ilan(1, { kiraCarpani: 8 }), ilan(2, { kiraCarpani: 12 })]
    const sonuc = olcutUygula('yatirimGetirisi', az, az, 10)

    expect(sonuc.ilanlar).toEqual([])
    expect(sonuc.bosSebebi).toContain(String(ASGARI_CARPAN_GOZLEMI))
  })

  it('ortalama altında ilan yoksa sebebi bildirir', () => {
    const esit = Array.from({ length: 4 }, (_, i) => ilan(i, { kiraCarpani: 10 }))
    const sonuc = olcutUygula('yatirimGetirisi', esit, esit, 10)

    expect(sonuc.ilanlar).toEqual([])
    expect(sonuc.bosSebebi).toMatch(/ortalamasının altında/)
  })

  it('çarpanı olmayan ilan seçilmez', () => {
    const karisik = [...havuz, ilan(9, { kiraCarpani: null })]
    const sonuc = olcutUygula('yatirimGetirisi', karisik, karisik, 10)
    expect(sonuc.ilanlar.map((i) => i.id)).not.toContain(9)
  })
})

describe('yeni eklenenler ölçütü', () => {
  it('en yeni başa gelir', () => {
    const havuz = [
      ilan(1, { createdAt: '2026-01-01T00:00:00.000Z' }),
      ilan(2, { createdAt: '2026-06-01T00:00:00.000Z' }),
      ilan(3, { createdAt: '2026-03-01T00:00:00.000Z' }),
    ]
    expect(olcutUygula('yeniEklenenler', havuz, havuz, 10).ilanlar.map((i) => i.id)).toEqual([
      2, 3, 1,
    ])
  })

  it('boş portföyde sebebi bildirir', () => {
    expect(olcutUygula('yeniEklenenler', [], [], 10).bosSebebi).toBeTruthy()
  })
})

describe('ticari ve sanayi ölçütü', () => {
  it('yalnızca ticari kategorileri alır', () => {
    const havuz = [
      ilan(1, { kategori: 'konut' }),
      ilan(2, { kategori: 'isyeri' }),
      ilan(3, { kategori: 'depo' }),
      ilan(4, { kategori: 'fabrika' }),
      ilan(5, { kategori: 'arsa' }),
    ]
    expect(olcutUygula('ticariSanayi', havuz, havuz, 10).ilanlar.map((i) => i.id)).toEqual([
      2, 3, 4, 5,
    ])
  })
})

describe('tekrar ayıklama', () => {
  /**
   * ⚠️ Aynı ilanı üç sırada gören ziyaretçi portföyün göründüğünden
   * küçük olduğunu anlar ve başlıkların gerçek bir ölçüt taşımadığını
   * düşünür. RE/MAX bunu yapıyor ve sayfa ucuzluyor.
   */
  it('aynı ilan ikinci sırada tekrarlanmaz', () => {
    const siralar = [
      { ilanlar: [ilan(1), ilan(2)] },
      { ilanlar: [ilan(2), ilan(3)] },
      { ilanlar: [ilan(1), ilan(3), ilan(4)] },
    ]
    tekrarlariAyikla(siralar)

    expect(siralar.map((s) => s.ilanlar.map((i) => i.id))).toEqual([[1, 2], [3], [4]])
  })

  it('önce gelen sıra ilanı kapar', () => {
    const siralar = [{ ilanlar: [ilan(7)] }, { ilanlar: [ilan(7)] }]
    tekrarlariAyikla(siralar)

    expect(siralar[0]?.ilanlar).toHaveLength(1)
    expect(siralar[1]?.ilanlar).toHaveLength(0)
  })

  it('boş sıralarda çökmez', () => {
    const siralar = [{ ilanlar: [] as ReturnType<typeof ilan>[] }]
    expect(() => tekrarlariAyikla(siralar)).not.toThrow()
  })
})
