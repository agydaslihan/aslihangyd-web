import { describe, expect, it } from 'vitest'

import {
  ASGARI_PUAN,
  aranilanIlanTipi,
  butceUyumu,
  elenirMi,
  ilaniPuanla,
  mesajdanOda,
  talebeUygunIlanlar,
  type IlanOzeti,
  type TalepProfili,
} from './eslestirme'

const talep = (ek: Partial<TalepProfili> = {}): TalepProfili => ({
  tip: 'alici',
  butceMin: null,
  butceMax: null,
  mahalleId: null,
  ilanId: null,
  mesaj: null,
  ...ek,
})

const ilan = (ek: Partial<IlanOzeti> = {}): IlanOzeti => ({
  id: 1,
  baslik: 'Muhittin Mahallesi 3+1 daire',
  tip: 'satilik',
  kategori: 'konut',
  fiyat: 2_000_000,
  mahalleId: 10,
  mahalleAdi: 'Muhittin',
  odaSayisi: '3+1',
  brutM2: 120,
  ...ek,
})

describe('sert eleme', () => {
  /**
   * ⚠️ Bu "zayıf eşleşme" değil, YANLIŞ eşleşme. Puanla ifade edilseydi
   * kiralık arayan birine satılık ilan "%40 uyumlu" diye listenin
   * ortasında görünürdü.
   */
  it('kiracıya satılık ilan gösterilmez', () => {
    expect(elenirMi(talep({ tip: 'kiraci' }), ilan({ tip: 'satilik' }))).toContain('kiralık arıyor')
    expect(ilaniPuanla(talep({ tip: 'kiraci' }), ilan({ tip: 'satilik' }))).toBeNull()
  })

  it('alıcıya kiralık ilan gösterilmez', () => {
    expect(ilaniPuanla(talep({ tip: 'alici' }), ilan({ tip: 'kiralik' }))).toBeNull()
  })

  it('belirsiz talep tipinde ilan tipi kısıtı yok', () => {
    expect(aranilanIlanTipi('genel')).toBeNull()
    expect(aranilanIlanTipi('degerleme')).toBeNull()
    expect(elenirMi(talep({ tip: 'genel' }), ilan({ tip: 'kiralik' }))).toBeNull()
  })

  it('talebin geldiği ilan tekrar önerilmez', () => {
    expect(elenirMi(talep({ ilanId: 1 }), ilan({ id: 1 }))).toBe('Talebin geldiği ilan')
    expect(elenirMi(talep({ ilanId: 1 }), ilan({ id: 2 }))).toBeNull()
  })

  it('bütçenin iki katından pahalı ilan elenir', () => {
    const t = talep({ butceMax: 1_000_000 })
    expect(elenirMi(t, ilan({ fiyat: 2_100_000 }))).toBe('Bütçenin iki katından pahalı')
    // Tam iki kat elenmez — eşik bilinçli olarak geniş.
    expect(elenirMi(t, ilan({ fiyat: 2_000_000 }))).toBeNull()
  })
})

describe('bütçe uyumu', () => {
  /**
   * ⚠️ Alt sınırın altı CEZALANDIRILMAZ. İnsanlar alt sınırı "bundan
   * ucuzu kötüdür" diye değil, arama aralığını daraltmak için yazar.
   */
  it('bütçenin altındaki ilan tam puan alır', () => {
    expect(butceUyumu(talep({ butceMin: 2_000_000, butceMax: 3_000_000 }), 1_500_000)).toBe(1)
  })

  it('aralık içinde tam puan', () => {
    expect(butceUyumu(talep({ butceMin: 2_000_000, butceMax: 3_000_000 }), 2_500_000)).toBe(1)
  })

  it('üst sınırın üstünde uzaklıkla azalır', () => {
    const t = talep({ butceMax: 2_000_000 })
    expect(butceUyumu(t, 2_200_000)).toBeCloseTo(0.8, 2) // %10 aşım
    expect(butceUyumu(t, 2_500_000)).toBeCloseTo(0.5, 2) // %25 aşım
    expect(butceUyumu(t, 3_000_000)).toBe(0) // %50 aşım → sıfır
  })

  it('bütçe hiç yazılmamışsa ölçüt devre dışı', () => {
    expect(butceUyumu(talep(), 9_999_999)).toBe(1)
  })
})

describe('mesajdan oda okuma', () => {
  it('açık yazımı okur', () => {
    expect(mesajdanOda('3+1 bir daire arıyorum')).toBe('3+1')
    expect(mesajdanOda('2 + 1 olsun')).toBe('2+1')
  })

  /**
   * ⚠️ Yanlış okunan bir ipucu, hiç okunmamış bir ipucundan kötüdür:
   * sıralamayı sessizce bozar. Bu yüzden yalnızca açık yazımlar okunuyor.
   */
  it('belirsiz yazımı okumaz', () => {
    expect(mesajdanOda('üç artı bir')).toBeNull()
    expect(mesajdanOda('geniş bir ev')).toBeNull()
    expect(mesajdanOda(null)).toBeNull()
  })

  it('geçersiz oda birleşimini kabul etmez', () => {
    expect(mesajdanOda('9+7 istiyorum')).toBeNull()
  })
})

describe('puanlama', () => {
  /**
   * ⚠️ EKSİK BİLGİ CEZALANDIRILMAZ. Bütçesini yazmayan talep, bütçesi
   * uymayan talep değildir. Ağırlıklar yeniden ölçeklenmeseydi hiç bilgi
   * vermemiş bir talep her ilanla düşük puan alır ve motor sessizce işe
   * yaramaz hale gelirdi.
   */
  it('değerlendirilemeyen ölçüt paydaya girmez', () => {
    // Yalnızca mahalle bilinen bir talep, aynı mahalledeki ilanla tam puan.
    const sonuc = ilaniPuanla(talep({ mahalleId: 10 }), ilan({ mahalleId: 10 }))
    expect(sonuc?.puan).toBe(100)
    expect(sonuc?.bilesenler).toHaveLength(1)
  })

  it('hiçbir ölçüt değerlendirilemezse eşleşme üretilmez', () => {
    // Sahte bir kesinlik üretmektense hiç sonuç üretmemek.
    expect(ilaniPuanla(talep(), ilan({ fiyat: null, mahalleId: null }))).toBeNull()
  })

  it('tam uyumlu talep yüksek puan alır', () => {
    const sonuc = ilaniPuanla(
      talep({ butceMin: 1_800_000, butceMax: 2_200_000, mahalleId: 10, mesaj: '3+1 arıyorum' }),
      ilan({ fiyat: 2_000_000, mahalleId: 10, odaSayisi: '3+1' }),
    )
    expect(sonuc?.puan).toBe(100)
    expect(sonuc?.bilesenler.map((b) => b.ad)).toEqual(['Bütçe', 'Mahalle', 'Oda'])
  })

  /**
   * ⚠️ Farklı mahalle sıfır değil 0,35: sıfır olsaydı ilgilendiği
   * mahallede uygun ilan olmayan bir talebe hiçbir şey önerilemezdi.
   */
  it('farklı mahalle puanı düşürür ama sıfırlamaz', () => {
    const ayni = ilaniPuanla(talep({ mahalleId: 10 }), ilan({ mahalleId: 10 }))
    const farkli = ilaniPuanla(talep({ mahalleId: 10 }), ilan({ mahalleId: 99 }))

    expect(ayni?.puan).toBe(100)
    expect(farkli?.puan).toBe(35)
    expect(farkli?.puan).toBeGreaterThan(0)
  })

  /**
   * ⚠️ Duman testinde yakalandı: fiyatı girilmemiş bir ilan, bütçe
   * ölçütünü tamamen atladığı için bütçeye TAM UYAN bir ilanı geçmişti
   * (84'e 69). Eksik bilgi cezalandırılmaz kuralı TALEBİN eksiklerini
   * korumak için var; ilanın fiyatsızlığı bizim veri boşluğumuz.
   */
  it('fiyatı olmayan ilan en ağır ölçütten bedava geçmez', () => {
    const t = talep({ butceMin: 1_800_000, butceMax: 2_200_000, mahalleId: 10, mesaj: '3+1' })

    const fiyatli = ilaniPuanla(
      t,
      ilan({ id: 1, fiyat: 2_000_000, mahalleId: 10, odaSayisi: '3+1' }),
    )
    const fiyatsiz = ilaniPuanla(t, ilan({ id: 2, fiyat: null, mahalleId: 10, odaSayisi: '4+1' }))

    expect(fiyatli?.puan).toBe(100)
    expect(fiyatsiz?.puan).toBeLessThan(fiyatli?.puan ?? 0)
    expect(fiyatsiz?.bilesenler.map((b) => b.ad)).toContain('Bütçe')
    // Boşluk görünür olmalı: yapılacak iş fiyatı girmek.
    expect(fiyatsiz?.bilesenler.find((b) => b.ad === 'Bütçe')?.aciklama).toContain('fiyat yok')
  })

  it('talep bütçe vermediyse fiyatsız ilan için bütçe ölçütü hiç kurulmaz', () => {
    const sonuc = ilaniPuanla(talep({ mahalleId: 10 }), ilan({ fiyat: null, mahalleId: 10 }))
    expect(sonuc?.bilesenler.map((b) => b.ad)).not.toContain('Bütçe')
  })

  /**
   * ⚠️ İlk yazımda "4+1 istendi" yazıyordu — oysa istenen 3+1, ilan 4+1.
   * Cümle gerçeğin tersini söylüyordu. Yanlış bir gerekçe, gerekçe
   * olmaktan çıkar.
   */
  it('oda uyumsuzluğunda hangi sayının istendiği doğru yazılır', () => {
    const sonuc = ilaniPuanla(talep({ mesaj: '3+1 arıyorum' }), ilan({ odaSayisi: '4+1' }))
    const oda = sonuc?.bilesenler.find((b) => b.ad === 'Oda')

    expect(oda?.aciklama).toBe('4+1 (3+1 istenmişti)')
    expect(oda?.aciklama).not.toBe('4+1 istendi')
  })

  it('gerekçe en ağırlıklı iki bileşenden üretilir', () => {
    const sonuc = ilaniPuanla(
      talep({ butceMax: 2_500_000, mahalleId: 10, mesaj: '3+1' }),
      ilan({ fiyat: 2_000_000, mahalleId: 10, odaSayisi: '3+1' }),
    )
    expect(sonuc?.gerekce).toBe('Bütçe aralığında · İlgilendiği mahalle')
  })
})

describe('sıralama', () => {
  const havuz: IlanOzeti[] = [
    ilan({ id: 1, fiyat: 2_000_000, mahalleId: 10 }),
    ilan({ id: 2, fiyat: 2_000_000, mahalleId: 99 }),
    ilan({ id: 3, fiyat: 3_400_000, mahalleId: 10 }),
    ilan({ id: 4, tip: 'kiralik', fiyat: 20_000, mahalleId: 10 }),
  ]

  it('en uygun ilan başta', () => {
    const sonuc = talebeUygunIlanlar(talep({ butceMax: 2_200_000, mahalleId: 10 }), havuz)
    expect(sonuc[0]?.ilan.id).toBe(1)
  })

  it('yanlış tipteki ilan listede yok', () => {
    const sonuc = talebeUygunIlanlar(talep({ tip: 'alici', mahalleId: 10 }), havuz)
    expect(sonuc.map((e) => e.ilan.id)).not.toContain(4)
  })

  it('asgari puanın altı listelenmez', () => {
    const sonuc = talebeUygunIlanlar(talep({ butceMax: 2_200_000, mahalleId: 10 }), havuz)
    for (const eslesme of sonuc) {
      expect(eslesme.puan).toBeGreaterThanOrEqual(ASGARI_PUAN)
    }
  })

  it('eşit puanda sıralama kararlı — kimliğe göre', () => {
    const esitler = [ilan({ id: 7, mahalleId: 10 }), ilan({ id: 3, mahalleId: 10 })]
    const sonuc = talebeUygunIlanlar(talep({ mahalleId: 10 }), esitler)
    expect(sonuc.map((e) => e.ilan.id)).toEqual([3, 7])
  })

  it('istenen adetten fazla dönmez', () => {
    const cok = Array.from({ length: 20 }, (_, i) => ilan({ id: i + 1, mahalleId: 10 }))
    expect(talebeUygunIlanlar(talep({ mahalleId: 10 }), cok, 5)).toHaveLength(5)
  })

  it('uygun ilan yoksa boş liste döner', () => {
    // Bütçesi çok düşük: hepsi elenir ya da eşiğin altında kalır.
    const sonuc = talebeUygunIlanlar(talep({ tip: 'alici', butceMax: 100_000 }), havuz)
    expect(sonuc).toEqual([])
  })
})
