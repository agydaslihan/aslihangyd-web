import { describe, expect, it } from 'vitest'

import { cepheGunu } from './cephe'
import { gunesGunu } from './hesap'
import {
  anBasligi,
  cepheCizelgeleri,
  cizelgeOzeti,
  gunesliAraliklar,
  hucreAciklamasi,
  MEVSIMLER,
  mevsimIfadesi,
  mevsimTarihi,
  saatlikCizelge,
  zamanPenceresi,
  type SaatHucresi,
  type ZamanPenceresi,
} from './zamanCubugu'

/**
 * Saatlik güneş çizelgesinin doğrulaması.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU TESTLER FİZİĞİ SINAR, KODUN ÇALIŞTIĞINI DEĞİL.
 *
 * `hesap.test.ts` ile aynı gerekçe: ekranda "14:00'te bu cephe gölgede"
 * yazacak ve yanlışsa kimse anlamayacak. Bu yüzden iddialar gökyüzünden
 * geliyor — kuzey cephe kışın güneş göremez, güney cephe öğlen her
 * mevsimde görür, doğu sabah batı akşam alır.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Çorlu merkezi — `lib/harita/ayarlar.ts` ile aynı koordinat. */
const ENLEM = 41.15525
const BOYLAM = 27.81286

const BUGUN = new Date(Date.UTC(2026, 7, 15))
const YAZ = new Date(Date.UTC(2026, 5, 21))
const KIS = new Date(Date.UTC(2026, 11, 21))
const EKINOKS = new Date(Date.UTC(2026, 2, 21))

const PENCERE: ZamanPenceresi = zamanPenceresi(ENLEM, BOYLAM, BUGUN)

function saatte(hucreler: SaatHucresi[], saat: number): SaatHucresi {
  const bulunan = hucreler.find((h) => h.saat === saat)
  if (bulunan === undefined) throw new Error(`${saat}:00 pencerede yok`)
  return bulunan
}

describe('zaman ekseni', () => {
  /**
   * ⚠️ Eksen dört mevsimin BİRLEŞİMİNİ kapsamalı. Kapsamazsa yaz sabahı
   * ya da yaz akşamı çubuktan taşar ve "güneş almıyor" gibi görünür —
   * sessiz ve en kötü türden bir hata.
   */
  it('en erken gün doğumunu ve en geç gün batımını kapsıyor', () => {
    // Çorlu: en erken doğuş 05:36 (21 Haziran), en geç batış 20:45.
    expect(PENCERE.ilk).toBeLessThanOrEqual(5)
    expect(PENCERE.son).toBeGreaterThanOrEqual(20)
  })

  it('pencere makul — bütün günü kaplamıyor', () => {
    // 41° enlemde gece diye bir şey var; eksen 24 saate yayılırsa
    // gündüz bloğu okunamayacak kadar sıkışır.
    expect(PENCERE.son - PENCERE.ilk).toBeLessThan(20)
  })

  /**
   * ⚠️ Eksen KONUMDAN hesaplanıyor, koda gömülü değil. Kuzeye çıkıldıkça
   * yaz günü uzuyor; pencere de uzamalı. Sabit yazılmış bir pencere burada
   * sessizce kırpardı.
   */
  it('daha kuzey bir enlemde pencere genişliyor', () => {
    const kuzey = zamanPenceresi(60, BOYLAM, BUGUN)
    expect(kuzey.son - kuzey.ilk).toBeGreaterThan(PENCERE.son - PENCERE.ilk)
  })
})

describe('mevsim seçimi', () => {
  it('dört seçenek ve hepsinin cümle içi hâli var', () => {
    expect(MEVSIMLER.map((m) => m.anahtar)).toEqual(['bugun', 'yaz', 'kis', 'ilkbahar'])
    for (const mevsim of MEVSIMLER) {
      expect(mevsim.ifade.length, mevsim.anahtar).toBeGreaterThan(3)
    }
  })

  it('gündönümü tarihleri sabit', () => {
    const yaz = mevsimTarihi('yaz', BUGUN)
    expect(yaz.getUTCMonth()).toBe(5)
    expect(yaz.getUTCDate()).toBe(21)

    const kis = mevsimTarihi('kis', BUGUN)
    expect(kis.getUTCMonth()).toBe(11)
    expect(kis.getUTCDate()).toBe(21)
  })

  it('"bugün" verilen günün kendisi', () => {
    const bugun = mevsimTarihi('bugun', BUGUN)
    expect(bugun.getUTCMonth()).toBe(7)
    expect(bugun.getUTCDate()).toBe(15)
  })

  /** ⚠️ Türkçe ek: "21 Haziran ~9 saat" değil "21 Haziran'da ~9 saat". */
  it('cümle içi ifade özel adı küçültmüyor ve ek taşıyor', () => {
    expect(mevsimIfadesi('yaz')).toBe("21 Haziran'da")
    expect(mevsimIfadesi('kis')).toBe("21 Aralık'ta")
    expect(mevsimIfadesi('bugun')).toBe('bugün')
  })
})

describe('güney cephe', () => {
  /**
   * ⚠️ EN SAĞLAM İDDİA: Kuzey yarımkürede güney cephe, ÖĞLEN her mevsimde
   * doğrudan güneş alır. Bu ihlal edilirse azimut hesabı ya da cephe
   * eşleştirmesi temelden bozuk demektir.
   */
  it('öğlen her mevsimde doğrudan güneş alıyor', () => {
    for (const [ad, tarih] of [
      ['yaz', YAZ],
      ['kış', KIS],
      ['ekinoks', EKINOKS],
    ] as const) {
      const hucreler = saatlikCizelge(ENLEM, BOYLAM, tarih, 'guney', PENCERE)
      expect(saatte(hucreler, 12).durum, `${ad} 12:00`).toBe('dogrudan')
      expect(saatte(hucreler, 13).durum, `${ad} 13:00`).toBe('dogrudan')
    }
  })

  /**
   * ⚠️ ⭐ SEZGİYE AYKIRI VE ÖLÇÜLDÜ: GÜNEY CEPHE YAZIN NEREDEYSE HİÇ
   * KAZANMIYOR.
   *
   * Çorlu'da 21 Haziran günü 21 Aralık gününden 357 dakika (~6 saat) uzun.
   * Buna rağmen güney cephenin doğrudan güneş süresi 485 ve 480 dakika —
   * arada 5 dakika var.
   *
   * Sebep geometrik: kışın güneş güneydoğudan doğup güneybatıdan batıyor,
   * yani gün boyu cephenin önünde. Yazın kuzeydoğudan doğup kuzeybatıdan
   * batıyor ve günün ilk ve son saatlerini cephenin ARKASINDA geçiriyor.
   * Uzayan gün güney cepheye yaramıyor.
   *
   * ⚠️ Bu testi ilk yazışımda "kışın daha uzun olmalı" diye iddia ettim ve
   * 5 dakikayla kırmızıya döndü. Gökyüzü ikisini de haklı çıkarmıyor;
   * doğru iddia "fark yok" — ve asıl anlatılmaya değer olan da bu.
   */
  it('yazın ve kışın neredeyse eşit — 6 saat uzayan gün güney cepheye yaramıyor', () => {
    const yaz = cepheGunu(ENLEM, BOYLAM, YAZ, 'guney').dakika
    const kis = cepheGunu(ENLEM, BOYLAM, KIS, 'guney').dakika

    const yazGunduz = gunesGunu(ENLEM, BOYLAM, YAZ).gunduzDakika!
    const kisGunduz = gunesGunu(ENLEM, BOYLAM, KIS).gunduzDakika!

    // Gün gerçekten çok daha uzun…
    expect(yazGunduz - kisGunduz).toBeGreaterThan(300)
    // …ama güney cephenin aldığı güneş neredeyse aynı.
    expect(Math.abs(yaz - kis)).toBeLessThan(60)
  })
})

describe('kuzey cephe', () => {
  /**
   * ⚠️ Kuzey cephe kışın doğrudan güneş GÖRMEZ. Güneş gün boyu güney
   * yarısında kalıyor.
   */
  it('kışın hiçbir saatte doğrudan güneş almıyor', () => {
    const hucreler = saatlikCizelge(ENLEM, BOYLAM, KIS, 'kuzey', PENCERE)
    const gunesli = hucreler.filter((h) => h.dogrudanDakika > 0)
    expect(gunesli, 'kuzey cephe kışın güneş almamalı').toEqual([])
  })

  it('ekinoksta da doğrudan güneş almıyor', () => {
    // 21 Mart'ta güneş tam doğudan doğup tam batıdan batıyor; kuzey cephe
    // teğet açıda kalıyor ve doğrudan ışık saymıyoruz.
    const hucreler = saatlikCizelge(ENLEM, BOYLAM, EKINOKS, 'kuzey', PENCERE)
    expect(hucreler.filter((h) => h.durum === 'dogrudan')).toEqual([])
  })

  /** ⚠️ Yazın ise sabah erken ve akşam geç güneş alır — kuzeyden doğuyor. */
  it('yazın sabah ve akşam uçlarında güneş alıyor, öğlen almıyor', () => {
    const hucreler = saatlikCizelge(ENLEM, BOYLAM, YAZ, 'kuzey', PENCERE)

    expect(
      hucreler.some((h) => h.dogrudanDakika > 0),
      'yazın hiç güneş almıyor',
    ).toBe(true)
    expect(saatte(hucreler, 12).dogrudanDakika, 'öğlen kuzeye güneş vurmamalı').toBe(0)

    /**
     * Hepsi ya sabahın erken saatleri ya akşamüstü olmalı — ortada bir
     * blok OLMAMALI. Ölçülen: 06–09 ve 17–20.
     */
    const gunesliSaatler = hucreler.filter((h) => h.dogrudanDakika > 0).map((h) => h.saat)
    expect(gunesliSaatler.length).toBeGreaterThan(0)
    expect(
      gunesliSaatler.every((saat) => saat <= 9 || saat >= 17),
      gunesliSaatler.join(','),
    ).toBe(true)
  })
})

describe('doğu ve batı cepheleri', () => {
  /**
   * ⚠️ Gün TOPLAMINDA neredeyse eşit, DAĞILIMDA taban tabana zıt.
   * Zaman çubuğunun var olma sebebi tam olarak bu.
   */
  it('doğu sabah, batı akşam güneş alıyor', () => {
    const dogu = saatlikCizelge(ENLEM, BOYLAM, EKINOKS, 'dogu', PENCERE)
    const bati = saatlikCizelge(ENLEM, BOYLAM, EKINOKS, 'bati', PENCERE)

    expect(saatte(dogu, 9).dogrudanDakika).toBeGreaterThan(0)
    expect(saatte(dogu, 16).dogrudanDakika).toBe(0)

    expect(saatte(bati, 9).dogrudanDakika).toBe(0)
    expect(saatte(bati, 16).dogrudanDakika).toBeGreaterThan(0)
  })

  it('gün toplamları birbirine yakın', () => {
    const dogu = cepheGunu(ENLEM, BOYLAM, EKINOKS, 'dogu').dakika
    const bati = cepheGunu(ENLEM, BOYLAM, EKINOKS, 'bati').dakika
    expect(Math.abs(dogu - bati)).toBeLessThanOrEqual(20)
  })
})

describe('hücre durumları', () => {
  it('gece saatleri "gece", gündüz gölgesi "golge" — ikisi ayrı', () => {
    const hucreler = saatlikCizelge(ENLEM, BOYLAM, KIS, 'kuzey', PENCERE)

    // 21 Aralık'ta Çorlu'da güneş ~08:30 doğuyor, ~17:43 batıyor.
    expect(saatte(hucreler, 6).durum, '06:00 kışın gece').toBe('gece')
    expect(saatte(hucreler, 12).durum, '12:00 kışın gündüz ama kuzey gölgede').toBe('golge')
    expect(saatte(hucreler, 20).durum, '20:00 kışın gece').toBe('gece')
  })

  /**
   * ⚠️ "Sınırda" gerçekten oluşmalı. Oluşmuyorsa ya örnekleme çok kaba ya
   * da durum çözümü yanlış — her iki hâlde de çubuk üç durumdan birini
   * hiç göstermez ve efsanedeki "yarım" karşılığı olmayan bir işaret olur.
   */
  it('gün içinde en az bir "sınırda" saat oluşuyor', () => {
    const hucreler = saatlikCizelge(ENLEM, BOYLAM, YAZ, 'guney', PENCERE)
    expect(hucreler.some((h) => h.durum === 'sinirda')).toBe(true)
  })

  it('doğrudan saatlerde 60 dakika, gölgede 0 dakika', () => {
    const hucreler = saatlikCizelge(ENLEM, BOYLAM, EKINOKS, 'guney', PENCERE)
    for (const hucre of hucreler) {
      if (hucre.durum === 'dogrudan') expect(hucre.dogrudanDakika, `${hucre.saat}:00`).toBe(60)
      if (hucre.durum === 'golge' || hucre.durum === 'gece') {
        expect(hucre.dogrudanDakika, `${hucre.saat}:00`).toBe(0)
      }
      if (hucre.durum === 'sinirda') {
        expect(hucre.dogrudanDakika).toBeGreaterThan(0)
        expect(hucre.dogrudanDakika).toBeLessThan(60)
      }
    }
  })

  it('çubuğun toplamı gün toplamıyla tutarlı', () => {
    /**
     * ⚠️ İKİ RAKAM AYNI EKRANDA. Çubuğun saatleri toplandığında, üstteki
     * "yazın ~X saat" ile aynı sayıyı vermeli. Farklı örnekleme aralığı
     * kullanılsaydı tutmazdı; ikisi de 5 dakikada bir örnekliyor.
     *
     * Tek fark pencere dışında kalan saatler — Çorlu'da orada güneş zaten
     * ufkun altında, yani fark sıfır olmalı.
     */
    const cizelgeler = cepheCizelgeleri(ENLEM, BOYLAM, YAZ, ['guney', 'bati'], PENCERE)
    for (const cizelge of cizelgeler) {
      const gun = cepheGunu(ENLEM, BOYLAM, YAZ, cizelge.yon).dakika
      expect(cizelge.toplamDakika, cizelge.yon).toBe(gun)
    }
  })
})

describe('köşe daire', () => {
  /**
   * ⚠️ Cepheler TOPLANMAZ, ayrı ayrı raporlanır. Aynı saatte iki cephe
   * birden güneş alabiliyor; toplasaydık günün uzunluğunu aşan sayılar
   * çıkardı.
   */
  it('her cephe kendi satırını alıyor', () => {
    const cizelgeler = cepheCizelgeleri(ENLEM, BOYLAM, YAZ, ['guney', 'bati'], PENCERE)
    expect(cizelgeler).toHaveLength(2)
    expect(cizelgeler.map((c) => c.yon)).toEqual(['guney', 'bati'])
    expect(cizelgeler[0]!.etiket).toBe('Güney')
  })

  it('iki cephenin saat dağılımı farklı', () => {
    const [guney, bati] = cepheCizelgeleri(ENLEM, BOYLAM, EKINOKS, ['guney', 'bati'], PENCERE)
    const desen = (cizelge: typeof guney) => cizelge!.hucreler.map((h) => h.durum).join('')
    expect(desen(guney)).not.toBe(desen(bati))
  })
})

describe('cephe yönü girilmemişse', () => {
  /**
   * ⚠️ TAHMİN YOK. Cephe yönü bilinmiyorsa çizelge de yok — arayüz boş
   * durum gösteriyor. "Muhtemelen güney" demek, alım kararı doğrudan bu
   * bilgiye dayandığı için uydurma veri yasağının en pahalı ihlali olurdu.
   */
  it('boş cephe listesi boş çizelge üretiyor, varsayılan cephe uydurmuyor', () => {
    expect(cepheCizelgeleri(ENLEM, BOYLAM, YAZ, [], PENCERE)).toEqual([])
  })
})

describe('metinler', () => {
  it('hücre açıklaması azimut, yükseklik ve durumu birlikte veriyor', () => {
    const hucreler = saatlikCizelge(ENLEM, BOYLAM, EKINOKS, 'guney', PENCERE)
    const metin = hucreAciklamasi(saatte(hucreler, 12))

    expect(metin).toMatch(/^12:00 — /)
    expect(metin).toContain('güneş azimutu')
    expect(metin).toContain('yükseklik')
    expect(metin).toContain('doğrudan güneş alıyor')
  })

  /**
   * ⚠️ Gün doğumunu içeren saat "gölgede" ama ufkun ÜSTÜNDE bir yükseklik
   * göstermeli — negatif bir yükseklikle "gölgede" demek çelişkili
   * okunuyordu. Gerekçe `SaatHucresi.yukseklik` üzerinde yazılı.
   */
  it('gün doğumunu içeren saatte yükseklik negatif görünmüyor', () => {
    const hucreler = saatlikCizelge(ENLEM, BOYLAM, YAZ, 'kuzey', PENCERE)
    const dogusSaati = saatte(hucreler, 5)

    expect(dogusSaati.durum).not.toBe('gece')
    expect(dogusSaati.yukseklik).toBeGreaterThan(0)
    expect(hucreAciklamasi(dogusSaati)).not.toContain('-')
  })

  it('gece saatinde azimut ve yükseklik yazılmıyor — anlamsız olurdu', () => {
    const hucreler = saatlikCizelge(ENLEM, BOYLAM, KIS, 'guney', PENCERE)
    const metin = hucreAciklamasi(saatte(hucreler, 6))

    expect(metin).toBe('06:00 — güneş ufkun altında')
    expect(metin).not.toContain('azimut')
  })

  it('sınırda saatte kaç dakika olduğu yazıyor', () => {
    const hucreler = saatlikCizelge(ENLEM, BOYLAM, YAZ, 'guney', PENCERE)
    const sinirda = hucreler.find((h) => h.durum === 'sinirda')
    expect(sinirda).toBeDefined()
    expect(hucreAciklamasi(sinirda!)).toMatch(/\(\d+ dk\)$/)
  })

  it('özet cümlesi seçili günü söylüyor, sabit "bugün" demiyor', () => {
    const metin = cizelgeOzeti("21 Aralık'ta", 300, 540, 300)
    expect(metin).toContain("Bu cephe 21 Aralık'ta")
    expect(metin).toContain('Yazın')
    expect(metin).toContain('kışın')
    expect(metin).not.toContain('bugün')
  })

  /** ⚠️ Sıfır dürüstçe söyleniyor, "0 saat" diye yazılmıyor. */
  it('güneş almayan cephede özet bunu açıkça söylüyor', () => {
    const metin = cizelgeOzeti('bugün', 0, 120, 0)
    expect(metin).toContain('Bu cephe bugün doğrudan güneş almıyor.')
    expect(metin).toContain('kışın doğrudan güneş almıyor')
  })
})

describe('ekran okuyucu karşılığı', () => {
  /**
   * ⚠️ WCAG 1.4.1 — bilgi renkle taşınamaz. Çubuk renkli bloklardan
   * ibaret; bu aralık listesi onun metin karşılığı ve çubuğun
   * `aria-label`ında kullanılıyor.
   */
  it('güneşli saatleri aralık olarak veriyor', () => {
    const hucreler = saatlikCizelge(ENLEM, BOYLAM, EKINOKS, 'dogu', PENCERE)
    const araliklar = gunesliAraliklar(hucreler)

    expect(araliklar.length).toBeGreaterThan(0)
    for (const aralik of araliklar) expect(aralik).toMatch(/^\d{2}:00–\d{2}:00$/)
  })

  it('kopuk saatleri ayrı aralık sayıyor — kuzey cephe yazın iki blok', () => {
    const hucreler = saatlikCizelge(ENLEM, BOYLAM, YAZ, 'kuzey', PENCERE)
    expect(gunesliAraliklar(hucreler)).toHaveLength(2)
  })

  it('hiç güneş almayan cephede boş liste — uydurma aralık yok', () => {
    const hucreler = saatlikCizelge(ENLEM, BOYLAM, KIS, 'kuzey', PENCERE)
    expect(gunesliAraliklar(hucreler)).toEqual([])
  })

  it('an başlığı cepheden bağımsız — azimut ve yükseklik veriyor', () => {
    const hucreler = saatlikCizelge(ENLEM, BOYLAM, EKINOKS, 'guney', PENCERE)
    expect(anBasligi(saatte(hucreler, 12))).toMatch(/^12:00 — güneş azimutu \d+°, yükseklik \d+°$/)
  })
})
