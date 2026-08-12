import { describe, expect, it } from 'vitest'

import { csvAyristir } from '@/lib/csv/ayristir'

import {
  eksikZorunluAlanlar,
  eslenmemisSutunlar,
  guveniCoz,
  kaynagiCoz,
  mahalleyiCoz,
  odaTipiniCoz,
  sadelestir,
  satirlariCozumle,
  sutunlariEslestir,
  tipiCoz,
  type CozumlemeBaglami,
} from './iceAktarma'

/**
 * ⚠️ Buradaki mahalle adları ve rakamlar UYDURMADIR; ayrıştırma mantığını
 * sınamak içindir. Gerçek veri CMS'ten gelir (CLAUDE.md kural 2).
 */
const MAHALLELER = [
  { id: 1, ad: 'Muhittin', slug: 'muhittin' },
  { id: 2, ad: 'Şeyhsinan', slug: 'seyhsinan' },
  { id: 3, ad: 'Alipaşa', slug: 'alipasa' },
]

const BAGLAM: CozumlemeBaglami = {
  mahalleler: MAHALLELER,
  varsayilanKaynak: 'portal_ilan',
  varsayilanGuven: 'dusuk',
}

// ═══════════════════════════════════════════════════════════════════════════
describe('sadelestir', () => {
  it('Türkçe büyük İ/I kurallarını doğru uygular', () => {
    // 'I'.toLowerCase() İngilizce kurala göre 'i' verir; Türkçe'de 'ı'dır.
    expect(sadelestir('IŞIK')).toBe(sadelestir('ışık'))
    expect(sadelestir('İSTASYON')).toBe(sadelestir('istasyon'))
  })

  it('aksanları ve noktalamayı temizler', () => {
    expect(sadelestir('Bina Yaşı')).toBe('binayasi')
    expect(sadelestir('Brüt m²')).toBe('brutm2')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('sutunlariEslestir', () => {
  it('ENDEKS-VERI-YONETIMI.md şablonundaki başlıkları tanır', () => {
    const basliklar = [
      'Tarih',
      'Mahalle',
      'Tip',
      'Kategori',
      'Oda',
      'm²',
      'Fiyat',
      'Bina Yaşı',
      'Kat',
      'Kaynak',
      'Güven',
      'Not',
    ]
    const eslesme = sutunlariEslestir(basliklar)

    expect(eslesme.gozlemTarihi).toBe(0)
    expect(eslesme.mahalle).toBe(1)
    expect(eslesme.tip).toBe(2)
    expect(eslesme.odaTipi).toBe(4)
    expect(eslesme.m2).toBe(5)
    expect(eslesme.fiyat).toBe(6)
    expect(eslesme.binaYasi).toBe(7)
    expect(eslesme.kat).toBe(8)
    expect(eslesme.kaynak).toBe(9)
    expect(eslesme.guvenSeviyesi).toBe(10)
  })

  it('farklı yazılmış başlıkları da yakalar', () => {
    const eslesme = sutunlariEslestir([
      'GÖZLEM TARİHİ',
      'Semt',
      'İşlem Tipi',
      'Oda Sayısı',
      'Metrekare',
      'Bedel',
    ])

    expect(eslesme.gozlemTarihi).toBe(0)
    expect(eslesme.mahalle).toBe(1)
    expect(eslesme.tip).toBe(2)
    expect(eslesme.odaTipi).toBe(3)
    expect(eslesme.m2).toBe(4)
    expect(eslesme.fiyat).toBe(5)
  })

  it('bir sütunu iki alana birden bağlamaz', () => {
    const eslesme = sutunlariEslestir(['Tarih', 'Mahalle', 'Tip', 'Oda', 'm2', 'Fiyat'])
    const kullanilan = Object.values(eslesme).filter((s) => s !== null)
    expect(new Set(kullanilan).size).toBe(kullanilan.length)
  })

  it('tanınmayan sütunu bildirir — sessizce atmaz', () => {
    const basliklar = ['Tarih', 'Mahalle', 'Tip', 'Oda', 'm2', 'Fiyat', 'Kategori', 'İlan No']
    const eslesme = sutunlariEslestir(basliklar)
    const eslenmeyen = eslenmemisSutunlar(basliklar, eslesme).map((s) => s.baslik)

    expect(eslenmeyen).toContain('İlan No')
  })

  it('eksik zorunlu alanı bildirir', () => {
    const eslesme = sutunlariEslestir(['Mahalle', 'Tip', 'Oda', 'm2', 'Fiyat'])
    expect(eksikZorunluAlanlar(eslesme)).toContain('Gözlem tarihi')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('değer çözümleyiciler', () => {
  it('tip yazımlarını tanır', () => {
    expect(tipiCoz('Satılık')).toBe('satilik')
    expect(tipiCoz('SATILIK')).toBe('satilik')
    expect(tipiCoz('satis')).toBe('satilik')
    expect(tipiCoz('Kiralık')).toBe('kiralik')
    expect(tipiCoz('kira')).toBe('kiralik')
    expect(tipiCoz('devren')).toBeNull()
  })

  it('oda tipini normalleştirir', () => {
    expect(odaTipiniCoz('3+1')).toBe('3+1')
    expect(odaTipiniCoz('3 + 1')).toBe('3+1')
    expect(odaTipiniCoz('3+1 daire')).toBe('3+1')
  })

  it('katman dışı oda tipini kabul etmez — uydurmaz', () => {
    // 5+2 endeks katmanlarında yok; sessizce 4+1'e yuvarlanmamalı.
    expect(odaTipiniCoz('5+2')).toBeNull()
    expect(odaTipiniCoz('stüdyo')).toBeNull()
  })

  it('kaynak ve güveni tanır', () => {
    expect(kaynagiCoz('Portal ilan gözlemi (istenen fiyat)')).toBe('portal_ilan')
    expect(kaynagiCoz('meslektaş')).toBe('meslektas')
    expect(kaynagiCoz('kendi işlemimiz')).toBe('kendi_islem')
    expect(guveniCoz('Düşük')).toBe('dusuk')
    expect(guveniCoz('yuksek')).toBe('yuksek')
  })

  it('mahalle adını eklerine rağmen bulur', () => {
    expect(mahalleyiCoz('Muhittin', MAHALLELER)?.id).toBe(1)
    expect(mahalleyiCoz('MUHİTTİN MAHALLESİ', MAHALLELER)?.id).toBe(1)
    expect(mahalleyiCoz('Şeyhsinan Mah.', MAHALLELER)?.id).toBe(2)
    expect(mahalleyiCoz('alipasa', MAHALLELER)?.id).toBe(3)
  })

  it('bilinmeyen mahalleyi tahmin etmez', () => {
    expect(mahalleyiCoz('Kazımiye', MAHALLELER)).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('satirlariCozumle', () => {
  const BASLIK = 'Tarih;Mahalle;Tip;Oda;m²;Fiyat'

  function coz(govde: string, baglam: CozumlemeBaglami = BAGLAM) {
    const cikti = csvAyristir(`${BASLIK}\n${govde}`)
    return satirlariCozumle(cikti.satirlar, sutunlariEslestir(cikti.basliklar), baglam)
  }

  it('geçerli satırı Türkçe sayılarla birlikte çözer', () => {
    const sonuc = coz('03.08.2026;Muhittin;Satılık;3+1;135;4.300.000')
    const satir = sonuc.satirlar[0]

    expect(satir?.hatalar).toEqual([])
    expect(satir?.veri?.fiyat).toBe(4_300_000)
    expect(satir?.veri?.m2).toBe(135)
    expect(satir?.veri?.gozlemTarihi).toBe('2026-08-03')
    expect(satir?.veri?.mahalleId).toBe(1)
    expect(sonuc.hazirSayisi).toBe(1)
  })

  it('m² fiyatını hesaplar', () => {
    const sonuc = coz('03.08.2026;Muhittin;Satılık;3+1;100;4.000.000')
    expect(sonuc.satirlar[0]?.veri?.m2Fiyati).toBe(40_000)
  })

  it('hatalı satırı aktarmaz ve sebebini yazar', () => {
    const sonuc = coz('03.08.2026;Kazımiye;Satılık;3+1;135;4.300.000')
    const satir = sonuc.satirlar[0]

    expect(satir?.veri).toBeNull()
    expect(satir?.hatalar.join(' ')).toContain('Kazımiye')
    expect(sonuc.hataliSayisi).toBe(1)
  })

  it('satır numarasını dosyadaki gerçek numarayla verir', () => {
    const sonuc = coz(
      '03.08.2026;Muhittin;Satılık;3+1;135;4.300.000\n04.08.2026;Kazımiye;Satılık;3+1;120;3.000.000',
    )
    // Başlık 1. satır; ikinci veri satırı dosyada 3. satırdır.
    expect(sonuc.satirlar[1]?.satirNo).toBe(3)
  })

  it('dosya içi mükerreri uyarır ama engellemez', () => {
    const sonuc = coz(
      '03.08.2026;Muhittin;Satılık;3+1;135;4.300.000\n03.08.2026;Muhittin;Satılık;3+1;135;4.300.000',
    )

    expect(sonuc.satirlar[1]?.veri).not.toBeNull()
    expect(sonuc.satirlar[1]?.uyarilar.join(' ')).toContain('2. satırda')
    expect(sonuc.uyariliSayisi).toBe(1)
  })

  it('olağandışı m² değerini uyarır ama aktarımı engellemez', () => {
    const sonuc = coz('03.08.2026;Muhittin;Satılık;3+1;5;4.300.000')
    expect(sonuc.satirlar[0]?.veri).not.toBeNull()
    expect(sonuc.satirlar[0]?.uyarilar.join(' ')).toContain('olağandışı')
  })

  it('sütunu olmayan alanlarda varsayılanı kullanır', () => {
    const sonuc = coz('03.08.2026;Muhittin;Satılık;3+1;135;4.300.000')
    expect(sonuc.satirlar[0]?.veri?.kaynak).toBe('portal_ilan')
    expect(sonuc.satirlar[0]?.veri?.guvenSeviyesi).toBe('dusuk')
  })

  it('tanınmayan kaynak değerini uyarır, sessizce yutmaz', () => {
    const cikti = csvAyristir(
      'Tarih;Mahalle;Tip;Oda;m²;Fiyat;Kaynak\n03.08.2026;Muhittin;Satılık;3+1;135;4.300.000;falan filan',
    )
    const sonuc = satirlariCozumle(cikti.satirlar, sutunlariEslestir(cikti.basliklar), BAGLAM)

    expect(sonuc.satirlar[0]?.uyarilar.join(' ')).toContain('tanınmadı')
    expect(sonuc.satirlar[0]?.veri?.kaynak).toBe('portal_ilan')
  })

  it('kiralıkta düşük m² fiyatı uyarısı vermez — kira zaten düşüktür', () => {
    const sonuc = coz('03.08.2026;Muhittin;Kiralık;3+1;135;25.000')
    expect(sonuc.satirlar[0]?.uyarilar.join(' ')).not.toContain('Fiyat eksik')
  })
})
