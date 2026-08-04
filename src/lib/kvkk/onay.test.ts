import { describe, expect, it } from 'vitest'

import {
  bosOnay,
  izinVarMi,
  onayCoz,
  ONAY_GECERLILIK_GUN,
  ONAY_SURUMU,
  onayYaz,
  type CerezOnayi,
} from './onay'

const SIMDI = new Date('2026-08-04T12:00:00Z')

function onay(degisiklik: Partial<CerezOnayi> = {}): CerezOnayi {
  return {
    surum: ONAY_SURUMU,
    zorunlu: true,
    analitik: true,
    pazarlama: false,
    tarih: '2026-08-01T00:00:00.000Z',
    ...degisiklik,
  }
}

describe('onayYaz / onayCoz', () => {
  it('yazılan onay aynen geri okunur', () => {
    const cozulen = onayCoz(onayYaz(onay()), SIMDI)
    expect(cozulen).toEqual(onay())
  })

  it('Türkçe karakter içeren değerlerde bile bozulmaz', () => {
    // encodeURIComponent kullanılmasının sebebi budur.
    const yazilan = onayYaz(onay())
    expect(yazilan).not.toContain(' ')
    expect(onayCoz(yazilan, SIMDI)).not.toBeNull()
  })
})

describe('onayCoz — şüphe halinde izin verme', () => {
  it.each([
    ['değer yok', null],
    ['boş metin', ''],
    ['bozuk JSON', 'abc'],
    ['JSON ama nesne değil', encodeURIComponent('"merhaba"')],
    ['null', encodeURIComponent('null')],
    ['dizi', encodeURIComponent('[]')],
  ])('%s → null', (_ad, girdi) => {
    expect(onayCoz(girdi, SIMDI)).toBeNull()
  })

  it('eski sürümlü onay geçersizdir — onay yeniden istenir', () => {
    const eski = onayYaz({ ...onay(), surum: ONAY_SURUMU - 1 })
    expect(onayCoz(eski, SIMDI)).toBeNull()
  })

  it('eksik alanlı onay geçersizdir', () => {
    const eksik = encodeURIComponent(JSON.stringify({ surum: ONAY_SURUMU, analitik: true }))
    expect(onayCoz(eksik, SIMDI)).toBeNull()
  })

  it('boolean olmayan kategori değeri geçersizdir', () => {
    const bozuk = encodeURIComponent(JSON.stringify({ ...onay(), analitik: 'evet' }))
    expect(onayCoz(bozuk, SIMDI)).toBeNull()
  })

  it('okunamayan tarih geçersizdir', () => {
    expect(onayCoz(onayYaz({ ...onay(), tarih: 'dün' }), SIMDI)).toBeNull()
  })
})

describe('onayCoz — geçerlilik süresi', () => {
  it(`${ONAY_GECERLILIK_GUN} günden eski onay geçersizdir`, () => {
    const cokEski = onayYaz({ ...onay(), tarih: '2024-01-01T00:00:00.000Z' })
    expect(onayCoz(cokEski, SIMDI)).toBeNull()
  })

  it('süre sınırının hemen içindeki onay geçerlidir', () => {
    const tarih = new Date(SIMDI.getTime() - (ONAY_GECERLILIK_GUN - 1) * 86_400_000)
    const gecerli = onayYaz({ ...onay(), tarih: tarih.toISOString() })
    expect(onayCoz(gecerli, SIMDI)).not.toBeNull()
  })

  it('gelecek tarihli onay geçersizdir — kurcalanmış çerez', () => {
    const ileri = onayYaz({ ...onay(), tarih: '2027-01-01T00:00:00.000Z' })
    expect(onayCoz(ileri, SIMDI)).toBeNull()
  })
})

describe('izinVarMi', () => {
  it('onay yoksa hiçbir kategoriye izin yoktur', () => {
    expect(izinVarMi(null, 'analitik')).toBe(false)
    expect(izinVarMi(null, 'pazarlama')).toBe(false)
  })

  it('yalnızca açıkça verilen izni döner', () => {
    const secim = onay({ analitik: true, pazarlama: false })
    expect(izinVarMi(secim, 'analitik')).toBe(true)
    expect(izinVarMi(secim, 'pazarlama')).toBe(false)
  })

  it('boş onayda isteğe bağlı kategorilerin hepsi kapalıdır', () => {
    const secim = bosOnay()
    expect(izinVarMi(secim, 'analitik')).toBe(false)
    expect(izinVarMi(secim, 'pazarlama')).toBe(false)
  })
})
