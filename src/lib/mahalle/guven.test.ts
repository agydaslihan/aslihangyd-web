import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { KATMAN_MINIMUM_GOZLEM } from '@/lib/endeks/tipler'

import {
  CARPAN_ALT,
  CARPAN_UST,
  DEGISIM_SINIRI,
  GUVEN_ESIGI,
  dusukGuvenliMi,
  guvenUyarilari,
  rakamVarMi,
} from './guven'
import { ornekCsv, satirlariCozumle, sutunlariEslestir } from './rakamIceAktarma'

/**
 * Mahalle rakamlarının güven kuralları.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU KURALLAR GERÇEK BİR TABLODAN DOĞDU.
 *
 * Aslıhan 26 mahalle için rakam gönderdi ve tabloda tutarsızlıklar vardı:
 *
 *     Silahtarağa  +%115 değişim, 4 gözlem
 *     Seymen       20 yıl çarpan, gözlem "—"
 *     Türkgücü     63.064 ₺/m², 2 gözlem
 *     Önerler      kira, m² satışın %92'si
 *
 * Beş mahalle metodolojimizin 8 gözlem eşiğinin altında. Bu testler, o
 * satırların içe aktarmada GÖRÜLMEDEN geçemeyeceğini kilitliyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

const dizin = path.dirname(fileURLToPath(import.meta.url))
const KOK = path.resolve(dizin, '../..')

describe('güven eşiği', () => {
  it('eşik ENDEKSTEN geliyor — ikinci bir "yeterli veri" tanımı yok', () => {
    /**
     * ⚠️ Burada 8 yazsaydık, endeksin eşiği değiştiğinde mahalle sayfası
     * eski eşikle "güvenilir" demeye devam ederdi. Aynı projede iki farklı
     * yeterlilik tanımı, hangisinin geçerli olduğu sorulamayan bir durum.
     */
    expect(GUVEN_ESIGI).toBe(KATMAN_MINIMUM_GOZLEM)
  })

  it('gözlem sayısı GİRİLMEMİŞSE de düşük güven', () => {
    /**
     * ⚠️ "n girilmemiş" ile "n yeterli" aynı şey değil. Seymen satırında
     * gözlem "—" idi; boş bırakılmış bir n, rakamın neye dayandığını
     * kimsenin bilmediği anlamına gelir.
     */
    expect(dusukGuvenliMi({ gozlemSayisi: null })).toBe(true)
    expect(dusukGuvenliMi({})).toBe(true)
  })

  it('eşiğin altı düşük, eşik ve üstü değil', () => {
    expect(dusukGuvenliMi({ gozlemSayisi: GUVEN_ESIGI - 1 })).toBe(true)
    expect(dusukGuvenliMi({ gozlemSayisi: GUVEN_ESIGI })).toBe(false)
    expect(dusukGuvenliMi({ gozlemSayisi: 24 })).toBe(false)
  })
})

describe('uyarılar — gerçek tablodaki satırlar', () => {
  const kodlar = (rakamlar: Parameters<typeof guvenUyarilari>[0]) =>
    guvenUyarilari(rakamlar).map((u) => u.kod)

  it('Türkgücü: 2 gözlem → az_gozlem', () => {
    expect(kodlar({ ortalamaM2Satis: 63_064, gozlemSayisi: 2 })).toContain('az_gozlem')
  })

  it('Seymen: gözlem yok → gozlem_yok', () => {
    expect(kodlar({ kiraCarpani: 20, gozlemSayisi: null })).toContain('gozlem_yok')
  })

  it('Silahtarağa: +%115 değişim → degisim_asiri', () => {
    expect(kodlar({ degisim12Ay: 115, gozlemSayisi: 4 })).toContain('degisim_asiri')
  })

  it('Önerler: kira m² satışın %92’si → kira_orani', () => {
    /**
     * ⚠️ Aylık kira, m² satış fiyatının 0,27–0,67 katı aralığında olmalı
     * (türetimi `guven.ts`te yazılı). 0,92 bandın dışında ve en olası
     * açıklaması birim karışıklığı.
     */
    expect(kodlar({ ortalamaM2Satis: 30_000, ortalamaKira: 27_600, gozlemSayisi: 20 })).toContain(
      'kira_orani',
    )
  })

  it('sağlıklı satır hiç uyarı üretmiyor', () => {
    expect(
      guvenUyarilari({
        ortalamaM2Satis: 32_500,
        ortalamaKira: 13_000,
        kiraCarpani: 19.5,
        degisim12Ay: 18.2,
        gozlemSayisi: 24,
      }),
    ).toEqual([])
  })

  it('sınır değerleri uyarı ÜRETMİYOR — eşik dışı demek eşitlik değil', () => {
    expect(kodlar({ degisim12Ay: DEGISIM_SINIRI, gozlemSayisi: 10 })).not.toContain('degisim_asiri')
    expect(kodlar({ kiraCarpani: CARPAN_ALT, gozlemSayisi: 10 })).not.toContain('carpan_disi')
    expect(kodlar({ kiraCarpani: CARPAN_UST, gozlemSayisi: 10 })).not.toContain('carpan_disi')
  })

  it('birim karışıklığının iki klasik hâli de yakalanıyor', () => {
    // Kira m² başına girilmiş (aylık yerine).
    expect(kodlar({ ortalamaM2Satis: 30_000, ortalamaKira: 300, gozlemSayisi: 20 })).toContain(
      'kira_orani',
    )
    // Satış fiyatı TOPLAM girilmiş (m² başına yerine).
    expect(
      kodlar({ ortalamaM2Satis: 3_000_000, ortalamaKira: 12_000, gozlemSayisi: 20 }),
    ).toContain('kira_orani')
  })

  it('hiç rakam yoksa gözlem uyarısı da çıkmıyor', () => {
    /**
     * ⚠️ Rakamı olmayan bir mahalle için "n eksik" demek gürültüdür:
     * gösterilecek bir şey yok ki güveni sorgulansın.
     */
    expect(rakamVarMi({ gozlemSayisi: null })).toBe(false)
    expect(kodlar({ gozlemSayisi: null })).toEqual([])
  })
})

describe('içe aktarma — uyarı engellemiyor, işaretliyor', () => {
  const mahalleler = [
    { id: 1, ad: 'Muhittin', slug: 'muhittin' },
    { id: 2, ad: 'Türkgücü', slug: 'turkgucu' },
  ]
  const basliklar = ['Mahalle', 'Ortalama m² satış', 'Ortalama kira', 'Gözlem sayısı']
  const eslesme = sutunlariEslestir(basliklar)

  it('başlıklar otomatik eşleşiyor', () => {
    expect(eslesme.mahalle).toBe(0)
    expect(eslesme.ortalamaM2Satis).toBe(1)
    expect(eslesme.ortalamaKira).toBe(2)
    expect(eslesme.gozlemSayisi).toBe(3)
  })

  it('az gözlemli satır AKTARILIR ama uyarılı', () => {
    const sonuc = satirlariCozumle([['Türkgücü', '63064', '20000', '2']], eslesme, { mahalleler })
    const satir = sonuc.satirlar[0]!
    expect(satir.veri).not.toBeNull()
    expect(satir.uyarilar.join(' ')).toContain('Gözlem sayısı 2')
    expect(sonuc.uyariliSayisi).toBe(1)
    expect(sonuc.hataliSayisi).toBe(0)
  })

  it('Türkçe ve İngilizce sayı biçimi ikisi de okunuyor', () => {
    /**
     * ⚠️ Belediye ve emlak tabloları ikisini de kullanıyor; hangi biçimde
     * geldiğini dosyayı açmadan bilmek mümkün değil.
     */
    const tr = satirlariCozumle([['Muhittin', '32.500,50', '12.400', '24']], eslesme, {
      mahalleler,
    })
    const en = satirlariCozumle([['Muhittin', '32,500.50', '12,400', '24']], eslesme, {
      mahalleler,
    })
    expect(tr.satirlar[0]!.veri?.ortalamaM2Satis).toBe(32_500.5)
    expect(en.satirlar[0]!.veri?.ortalamaM2Satis).toBe(32_500.5)
  })

  it('tanınmayan mahalle HATA — yeni kayıt açılmıyor', () => {
    /**
     * ⚠️ Kayıt açsaydık "Şeyhsinan" ve "Seyhsinan" iki ayrı mahalle
     * sayfası, iki ayrı slug ve bölünmüş bir portföy üretirdi.
     */
    const sonuc = satirlariCozumle([['Bilinmeyen', '30000', '', '10']], eslesme, { mahalleler })
    expect(sonuc.satirlar[0]!.veri).toBeNull()
    expect(sonuc.satirlar[0]!.hatalar.join(' ')).toContain('eşleşmedi')
  })

  it('yalnızca mahalle adı olan satır HATA — silme değil güncelleme', () => {
    const sonuc = satirlariCozumle([['Muhittin', '', '', '']], eslesme, { mahalleler })
    expect(sonuc.satirlar[0]!.veri).toBeNull()
    expect(sonuc.satirlar[0]!.hatalar.join(' ')).toContain('yazılacak hiçbir rakam yok')
  })

  it('hata mesajı SATIR NUMARASI taşıyor', () => {
    /**
     * ⚠️ "CSV okunamadı" hiçbir şey söylemez. Kullanıcının dosyada
     * arayabileceği bir numara şart; başlık 1, veri 2'den başlıyor.
     */
    const sonuc = satirlariCozumle(
      [
        ['Muhittin', '30000', '12000', '10'],
        ['Muhittin', 'abc', '', ''],
      ],
      eslesme,
      { mahalleler },
    )
    expect(sonuc.satirlar[1]!.satirNo).toBe(3)
    expect(sonuc.satirlar[1]!.hatalar.join(' ')).toContain('okunamadı')
  })

  it('aynı mahalle iki kez yazılmışsa uyarı çıkıyor', () => {
    const sonuc = satirlariCozumle(
      [
        ['Muhittin', '30000', '12000', '10'],
        ['Muhittin', '31000', '12500', '10'],
      ],
      eslesme,
      { mahalleler },
    )
    expect(sonuc.satirlar[1]!.uyarilar.join(' ')).toContain('2. satırda da var')
  })
})

describe('örnek CSV', () => {
  it('kendi ayrıştırıcımız tarafından sorunsuz okunuyor', () => {
    /**
     * ⚠️ Örnek dosyanın sütun adları, ayrıştırıcının tanıdığı adlarla
     * AYNI olmak zorunda. Ayrıştıkları gün, örneği indirip dolduran kişi
     * "sütunlar eşleşmedi" hatası alır — ve hatayı örnek dosya üretmiş
     * olur.
     */
    const satirlar = ornekCsv()
      .split('\n')
      .filter((s) => !s.startsWith('#'))
    const basliklar = satirlar[0]!.split(';')
    const eslesme = sutunlariEslestir(basliklar)
    for (const alan of [
      'mahalle',
      'ortalamaM2Satis',
      'ortalamaKira',
      'kiraCarpani',
      'degisim12Ay',
      'nufus',
      'gozlemSayisi',
    ] as const) {
      expect(eslesme[alan], `${alan} eşleşmedi`).not.toBeNull()
      expect(eslesme[alan], `${alan} eşleşmedi`).not.toBeUndefined()
    }
  })

  it('ÖRNEK olduğu dosyanın içinde yazıyor', () => {
    // CLAUDE.md kural 2: örnek veri açıkça etiketlenir.
    expect(ornekCsv()).toContain('ÖRNEK VERİ — YAYINLANMAYACAK')
  })
})

describe('sitede gösterim', () => {
  const oku = (goreli: string) => readFileSync(path.join(KOK, goreli), 'utf8')

  it('düşük güvenli rakam "tahmini" olarak işaretleniyor', () => {
    /**
     * ⚠️ Gizlemek mahalle sayfasını boşaltırdı; olduğu gibi göstermek ise
     * 2 gözlemi 24 gözlemle aynı görünürlükte sunmak olurdu. Üçüncü yol:
     * göster ve neye dayandığını yaz.
     */
    const kart = oku('components/ui/IstatistikKarti.tsx')
    expect(kart).toContain('GUVEN_ESIGI')
    expect(kart).toContain('tahmini')
  })

  it('eşik kartın içine SAYI olarak yazılmamış', () => {
    const kart = oku('components/ui/IstatistikKarti.tsx')
    expect(kart).toContain("from '@/lib/mahalle/guven'")
  })

  it('içe aktarma ile site AYNI eşiği kullanıyor', () => {
    const iceAktarma = oku('lib/mahalle/rakamIceAktarma.ts')
    expect(iceAktarma).toContain("from './guven'")
    expect(iceAktarma).toContain('guvenUyarilari')
  })
})

describe('yazma yolu', () => {
  const cekirdek = readFileSync(path.join(KOK, 'lib/mahalle/rakamIceAktarmaCekirdegi.ts'), 'utf8')

  it('erişim kuralları ve kancalar ATLANMIYOR', () => {
    expect(cekirdek).toContain('overrideAccess: false')
    expect(cekirdek).not.toContain('overrideAccess: true')
  })

  it('yeni mahalle AÇMIYOR', () => {
    expect(cekirdek).not.toContain('payload.create')
  })

  it('boş alan SİLMİYOR', () => {
    // `?? undefined` — Payload tanımsız alana dokunmuyor.
    expect(cekirdek).toContain('veri.ortalamaM2Satis ?? undefined')
  })
})
