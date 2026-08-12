import { describe, expect, it } from 'vitest'

import { ayiriciSez, csvAyristir, sayiyaCevir, tariheCevir } from './ayristir'

// ═══════════════════════════════════════════════════════════════════════════
describe('ayiriciSez', () => {
  it('Türkçe Excel çıktısında noktalı virgülü seçer', () => {
    const metin = 'Tarih;Mahalle;m²;Fiyat\n03.08.2026;Muhittin;135;4.300.000'
    expect(ayiriciSez(metin)).toBe(';')
  })

  it('virgülle ayrılmış dosyada virgülü seçer', () => {
    const metin = 'Tarih,Mahalle,m2,Fiyat\n2026-08-03,Muhittin,135,4300000'
    expect(ayiriciSez(metin)).toBe(',')
  })

  it('sekmeyle ayrılmış dosyayı tanır', () => {
    const metin = 'Tarih\tMahalle\tm2\n2026-08-03\tMuhittin\t135'
    expect(ayiriciSez(metin)).toBe('\t')
  })

  it('tırnak içindeki ayırıcıyı saymaz', () => {
    // Virgül yalnızca tırnak içinde geçiyor; gerçek ayırıcı noktalı virgül.
    const metin = 'Ad;Not\nMuhittin;"3+1, güney cephe"\nAlipaşa;"2+1, ara kat"'
    expect(ayiriciSez(metin)).toBe(';')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('csvAyristir', () => {
  it('başlık ve satırları ayırır', () => {
    const sonuc = csvAyristir('Mahalle;m2;Fiyat\nMuhittin;135;4300000\nAlipaşa;90;2100000')

    expect(sonuc.basliklar).toEqual(['Mahalle', 'm2', 'Fiyat'])
    expect(sonuc.satirlar).toHaveLength(2)
    expect(sonuc.satirlar[0]).toEqual(['Muhittin', '135', '4300000'])
  })

  it('BOM temizler — yoksa ilk başlık eşleşmez', () => {
    const sonuc = csvAyristir('﻿Tarih;Mahalle\n03.08.2026;Muhittin')
    expect(sonuc.basliklar[0]).toBe('Tarih')
  })

  it('CRLF satır sonlarını işler', () => {
    const sonuc = csvAyristir('A;B\r\n1;2\r\n3;4')
    expect(sonuc.satirlar).toEqual([
      ['1', '2'],
      ['3', '4'],
    ])
  })

  it('tırnak içindeki ayırıcıyı ve satır sonunu korur', () => {
    const sonuc = csvAyristir('Ad;Not\nMuhittin;"3+1; güney\ncephe"')
    expect(sonuc.satirlar[0]?.[1]).toBe('3+1; güney\ncephe')
  })

  it('çift tırnak kaçışını çözer', () => {
    const sonuc = csvAyristir('Ad;Not\nX;"12"" balkon"')
    expect(sonuc.satirlar[0]?.[1]).toBe('12" balkon')
  })

  it('boş satırları atlar ve sayar', () => {
    const sonuc = csvAyristir('A;B\n1;2\n\n\n3;4\n')
    expect(sonuc.satirlar).toHaveLength(2)
    expect(sonuc.atlananBosSatir).toBeGreaterThan(0)
  })

  it('eksik hücreli satırı başlık sayısına hizalar', () => {
    const sonuc = csvAyristir('A;B;C\n1;2')
    expect(sonuc.satirlar[0]).toEqual(['1', '2', ''])
  })

  it('son satır satır sonuyla bitmese de okunur', () => {
    const sonuc = csvAyristir('A;B\n1;2')
    expect(sonuc.satirlar).toHaveLength(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('sayiyaCevir', () => {
  it('Türkçe binlik ayırıcıyı doğru okur — sessiz felaket sınavı', () => {
    // Yanlış ayrıştırılırsa 4,3 çıkar ve endekse öyle girer.
    expect(sayiyaCevir('4.300.000')).toBe(4_300_000)
    expect(sayiyaCevir('4.300')).toBe(4_300)
  })

  it('Türkçe ondalık virgülü okur', () => {
    expect(sayiyaCevir('1234,5')).toBe(1234.5)
    expect(sayiyaCevir('0,75')).toBe(0.75)
  })

  it('her iki ayırıcı varken sondakini ondalık sayar', () => {
    expect(sayiyaCevir('1.234,56')).toBe(1234.56)
    expect(sayiyaCevir('1,234.56')).toBe(1234.56)
  })

  it('üç haneli olmayan tek nokta grubunu ondalık sayar', () => {
    expect(sayiyaCevir('4.35')).toBe(4.35)
    expect(sayiyaCevir('4.3')).toBe(4.3)
  })

  it('para birimi simgesini ve boşlukları temizler', () => {
    expect(sayiyaCevir('4.300.000 ₺')).toBe(4_300_000)
    expect(sayiyaCevir(' 135 ')).toBe(135)
  })

  it('sayı olmayanda null döner — sıfır DEĞİL', () => {
    expect(sayiyaCevir('')).toBeNull()
    expect(sayiyaCevir('bilinmiyor')).toBeNull()
    expect(sayiyaCevir('4.300.000 TL/ay')).toBeNull()
  })

  it('negatif sayıyı korur', () => {
    expect(sayiyaCevir('-12,5')).toBe(-12.5)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('tariheCevir', () => {
  it('Türkçe gün.ay.yıl biçimini okur', () => {
    expect(tariheCevir('03.08.2026')).toBe('2026-08-03')
  })

  it('gün/ay/yıl ve gün-ay-yıl biçimlerini okur', () => {
    expect(tariheCevir('03/08/2026')).toBe('2026-08-03')
    expect(tariheCevir('3-8-2026')).toBe('2026-08-03')
  })

  it('ISO biçimini okur', () => {
    expect(tariheCevir('2026-08-03')).toBe('2026-08-03')
  })

  it('ay/gün sırasını Amerikan varsaymaz', () => {
    // 03.08.2026 → 3 Ağustos. 8 Mart olsaydı endekste beş aylık kayma olurdu.
    expect(tariheCevir('03.08.2026')).toBe('2026-08-03')
  })

  it('olmayan tarihi reddeder', () => {
    expect(tariheCevir('31.02.2026')).toBeNull()
    expect(tariheCevir('45.01.2026')).toBeNull()
  })

  it('iki haneli yılı reddeder — tahmin etmiyoruz', () => {
    expect(tariheCevir('03.08.26')).toBeNull()
  })

  it('geçersiz girdide null döner', () => {
    expect(tariheCevir('')).toBeNull()
    expect(tariheCevir('geçen hafta')).toBeNull()
    expect(tariheCevir('2026')).toBeNull()
  })
})
