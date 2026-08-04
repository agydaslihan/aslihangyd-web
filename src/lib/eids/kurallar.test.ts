import { describe, expect, it } from 'vitest'

import {
  ASGARI_YETKI_SURESI_GUN,
  eidsDegerlendir,
  eidsYayinaUygunMu,
  engelleriYaz,
  YETKI_UYARI_ESIGI_GUN,
  yetkiyeKalanGun,
} from './kurallar'
import { EIDS_DURUMLARI, type EidsDurum, type EidsGirdisi } from './types'

/**
 * Sabit bir "şimdi": 4 Ağustos 2026, Türkiye saatiyle 12:00.
 * Testlerin gerçek saate bağlı olmaması için her çağrıda enjekte edilir.
 */
const SIMDI = new Date('2026-08-04T09:00:00Z')

/** Her açıdan kusursuz, yayınlanabilir bir ilan. Testler bunu bozarak ilerler. */
function gecerliGirdi(degisiklik: Partial<EidsGirdisi> = {}): EidsGirdisi {
  return {
    eidsDurum: 'yetkili',
    tasinmazNo: '34-1-2-3-4',
    ada: '1234',
    parsel: '56',
    eidsYetkiBaslangic: '2026-06-01',
    eidsYetkiBitis: '2026-12-31',
    ...degisiklik,
  }
}

function kodlar(girdi: EidsGirdisi) {
  return eidsDegerlendir(girdi, SIMDI).engeller.map((engel) => engel.kod)
}

describe('eidsDegerlendir — geçerli ilan', () => {
  it('tüm alanları tam olan ilanı yayına uygun bulur', () => {
    const sonuc = eidsDegerlendir(gecerliGirdi(), SIMDI)

    expect(sonuc.yayinlanabilir).toBe(true)
    expect(sonuc.engeller).toEqual([])
    expect(sonuc.uyarilar).toEqual([])
  })

  it('kalan gün sayısını doğru hesaplar', () => {
    // 4 Ağustos 2026 → 31 Aralık 2026 arası 149 gün.
    const sonuc = eidsDegerlendir(gecerliGirdi(), SIMDI)
    expect(sonuc.kalanGun).toBe(149)
  })
})

describe('eidsDegerlendir — yetki durumu', () => {
  it('durum seçilmemişse yayını engeller', () => {
    expect(kodlar(gecerliGirdi({ eidsDurum: null }))).toContain('durum_secilmemis')
    expect(eidsYayinaUygunMu(gecerliGirdi({ eidsDurum: null }), SIMDI)).toBe(false)
  })

  it.each(EIDS_DURUMLARI.filter((durum) => durum !== 'yetkili'))(
    '"%s" durumunda ilan yayınlanamaz',
    (durum) => {
      const sonuc = eidsDegerlendir(gecerliGirdi({ eidsDurum: durum as EidsDurum }), SIMDI)

      expect(sonuc.yayinlanabilir).toBe(false)
      expect(sonuc.engeller.map((engel) => engel.kod)).toContain('durum_yetkili_degil')
    },
  )

  it('yalnızca "yetkili" durumu geçer — kural gevşetilmemiş olmalı', () => {
    const gecenler = EIDS_DURUMLARI.filter((durum) =>
      eidsYayinaUygunMu(gecerliGirdi({ eidsDurum: durum as EidsDurum }), SIMDI),
    )

    expect(gecenler).toEqual(['yetkili'])
  })
})

describe('eidsDegerlendir — taşınmaz kimliği', () => {
  it.each([
    ['tasinmazNo', 'tasinmaz_no_yok'],
    ['ada', 'ada_yok'],
    ['parsel', 'parsel_yok'],
  ] as const)('%s alanı eksikse yayını engeller', (alan, beklenenKod) => {
    expect(kodlar(gecerliGirdi({ [alan]: null }))).toContain(beklenenKod)
  })

  it.each(['', '   ', '\t\n'])('boşluktan ibaret taşınmaz numarası (%j) kabul edilmez', (deger) => {
    expect(kodlar(gecerliGirdi({ tasinmazNo: deger }))).toContain('tasinmaz_no_yok')
  })
})

describe('eidsDegerlendir — yetki süresi', () => {
  it('süresi dün dolmuş yetkide yayını engeller', () => {
    const sonuc = eidsDegerlendir(gecerliGirdi({ eidsYetkiBitis: '2026-08-03' }), SIMDI)

    expect(sonuc.yayinlanabilir).toBe(false)
    expect(sonuc.engeller.map((engel) => engel.kod)).toContain('yetki_suresi_dolmus')
    expect(sonuc.kalanGun).toBe(-1)
  })

  it('bitiş tarihi bugün olan yetki hâlâ geçerlidir (gün sonuna kadar)', () => {
    const sonuc = eidsDegerlendir(
      gecerliGirdi({ eidsYetkiBaslangic: '2026-04-01', eidsYetkiBitis: '2026-08-04' }),
      SIMDI,
    )

    expect(sonuc.yayinlanabilir).toBe(true)
    expect(sonuc.kalanGun).toBe(0)
  })

  it('bitiş tarihi yoksa yayını engeller', () => {
    expect(kodlar(gecerliGirdi({ eidsYetkiBitis: null }))).toContain('yetki_bitis_yok')
  })

  it('başlangıç tarihi yoksa yayını engeller', () => {
    expect(kodlar(gecerliGirdi({ eidsYetkiBaslangic: null }))).toContain('yetki_baslangic_yok')
  })

  it('okunamayan tarih, girilmemiş sayılır', () => {
    expect(kodlar(gecerliGirdi({ eidsYetkiBitis: 'yakında' }))).toContain('yetki_bitis_yok')
  })

  it('başlangıcı gelecekte olan yetkide yayını engeller', () => {
    expect(
      kodlar(gecerliGirdi({ eidsYetkiBaslangic: '2026-09-01', eidsYetkiBitis: '2026-12-31' })),
    ).toContain('yetki_baslamamis')
  })

  it('bitiş başlangıçtan önceyse tutarsızlık olarak engeller', () => {
    expect(
      kodlar(gecerliGirdi({ eidsYetkiBaslangic: '2026-07-01', eidsYetkiBitis: '2026-06-01' })),
    ).toContain('yetki_tarihleri_tutarsiz')
  })
})

describe('eidsDegerlendir — uyarılar (yayını engellemez)', () => {
  it(`bitişe ${YETKI_UYARI_ESIGI_GUN} gün veya daha az kaldıysa uyarır ama engellemez`, () => {
    // 4 Ağustos + 15 gün = 19 Ağustos.
    const sonuc = eidsDegerlendir(
      gecerliGirdi({ eidsYetkiBaslangic: '2026-05-01', eidsYetkiBitis: '2026-08-19' }),
      SIMDI,
    )

    expect(sonuc.yayinlanabilir).toBe(true)
    expect(sonuc.uyarilar.map((uyari) => uyari.kod)).toContain('yetki_yakinda_bitiyor')
  })

  it(`eşiğin bir gün ötesinde uyarı üretmez`, () => {
    const sonuc = eidsDegerlendir(
      gecerliGirdi({ eidsYetkiBaslangic: '2026-05-01', eidsYetkiBitis: '2026-08-20' }),
      SIMDI,
    )

    expect(sonuc.uyarilar).toEqual([])
  })

  it(`${ASGARI_YETKI_SURESI_GUN} günden kısa yetki süresini uyarı sayar, engel saymaz`, () => {
    const sonuc = eidsDegerlendir(
      gecerliGirdi({ eidsYetkiBaslangic: '2026-08-01', eidsYetkiBitis: '2026-09-15' }),
      SIMDI,
    )

    expect(sonuc.yayinlanabilir).toBe(true)
    expect(sonuc.uyarilar.map((uyari) => uyari.kod)).toContain('yetki_suresi_uc_aydan_kisa')
  })
})

describe('eidsDegerlendir — birden fazla eksik', () => {
  it('tüm engelleri birden bildirir, ilkinde durmaz', () => {
    const sonuc = eidsDegerlendir(
      {
        eidsDurum: 'yetkisiz',
        tasinmazNo: null,
        ada: null,
        parsel: null,
        eidsYetkiBaslangic: null,
        eidsYetkiBitis: null,
      },
      SIMDI,
    )

    expect(sonuc.yayinlanabilir).toBe(false)
    expect(sonuc.engeller).toHaveLength(6)
  })

  it('tamamen boş girdi yayınlanamaz', () => {
    expect(eidsYayinaUygunMu({}, SIMDI)).toBe(false)
  })

  it('engel mesajları Türkçe ve boş olmayan metinlerdir', () => {
    const sonuc = eidsDegerlendir({}, SIMDI)

    for (const engel of sonuc.engeller) {
      expect(engel.mesaj.trim().length).toBeGreaterThan(10)
    }
  })

  it('engelleriYaz okunabilir bir liste üretir', () => {
    const sonuc = eidsDegerlendir({ eidsDurum: 'yetkisiz' }, SIMDI)
    const metin = engelleriYaz(sonuc.engeller)

    expect(metin).toContain('•')
    expect(metin.split('\n')).toHaveLength(sonuc.engeller.length)
  })
})

describe('yetkiyeKalanGun', () => {
  it('gelecekteki tarih için pozitif değer döner', () => {
    expect(yetkiyeKalanGun('2026-08-14', SIMDI)).toBe(10)
  })

  it('geçmişteki tarih için negatif değer döner', () => {
    expect(yetkiyeKalanGun('2026-07-25', SIMDI)).toBe(-10)
  })

  it('tarih yoksa null döner', () => {
    expect(yetkiyeKalanGun(null, SIMDI)).toBeNull()
    expect(yetkiyeKalanGun(undefined, SIMDI)).toBeNull()
  })

  it('Date nesnesiyle de çalışır', () => {
    expect(yetkiyeKalanGun(new Date('2026-08-09T21:00:00Z'), SIMDI)).toBe(6)
  })
})

describe('saat dilimi kenar durumları', () => {
  /**
   * Sunucu UTC'de çalışır. Türkiye UTC+3'tür. Bu testler, gün sınırının
   * Türkiye saatine göre çekilmesini güvence altına alır — aksi halde
   * yetkisi biten bir ilan bir gün fazla yayında kalabilir.
   */

  it('Türkiye saatiyle yeni gün başlamışken (UTC hâlâ dün) bugünü doğru sayar', () => {
    // 4 Ağustos 01:00 Türkiye = 3 Ağustos 22:00 UTC.
    const geceYarisiSonrasi = new Date('2026-08-03T22:00:00Z')

    const sonuc = eidsDegerlendir(
      gecerliGirdi({ eidsYetkiBaslangic: '2026-04-01', eidsYetkiBitis: '2026-08-03' }),
      geceYarisiSonrasi,
    )

    // Türkiye'de gün 4 Ağustos; yetki 3 Ağustos'ta bitmiş → engellenmeli.
    expect(sonuc.yayinlanabilir).toBe(false)
    expect(sonuc.engeller.map((engel) => engel.kod)).toContain('yetki_suresi_dolmus')
  })

  it('Türkiye saatiyle günün son dakikasında yetki hâlâ geçerlidir', () => {
    // 4 Ağustos 23:30 Türkiye = 4 Ağustos 20:30 UTC.
    const gunSonu = new Date('2026-08-04T20:30:00Z')

    const sonuc = eidsDegerlendir(
      gecerliGirdi({ eidsYetkiBaslangic: '2026-04-01', eidsYetkiBitis: '2026-08-04' }),
      gunSonu,
    )

    expect(sonuc.yayinlanabilir).toBe(true)
  })
})
