import { describe, expect, it } from 'vitest'

import { csvAyristir } from '@/lib/csv/ayristir'

import { eksikZorunluAlanlar, kaynagiCoz, satirlariCozumle, sutunlariEslestir } from './iceAktarma'
import { harcMatrahi, rayicPiyasaOrani } from './tipler'

/**
 * ⚠️ Buradaki rakamlar UYDURMADIR; hesabın doğruluğunu sınamak içindir.
 * Gerçek rayiç bedeller belediye tablolarından, panele elle girilir
 * (CLAUDE.md kural 2).
 */
const MAHALLELER = [
  { id: 1, ad: 'Muhittin', slug: 'muhittin' },
  { id: 2, ad: 'Şeyhsinan', slug: 'seyhsinan' },
]

const BAGLAM = {
  mahalleler: MAHALLELER,
  varsayilanYil: 2026,
  varsayilanKaynak: 'belediye' as const,
}

describe('rayicPiyasaOrani', () => {
  it('piyasanın rayiç bedele oranını verir', () => {
    expect(rayicPiyasaOrani(32_000, 10_000)).toBeCloseTo(3.2, 6)
  })

  it('eksik ya da sıfır veride null döner — uydurma oran üretmez', () => {
    expect(rayicPiyasaOrani(null, 10_000)).toBeNull()
    expect(rayicPiyasaOrani(32_000, null)).toBeNull()
    expect(rayicPiyasaOrani(32_000, 0)).toBeNull()
    expect(rayicPiyasaOrani(0, 10_000)).toBeNull()
    expect(rayicPiyasaOrani(Number.NaN, 10_000)).toBeNull()
  })
})

describe('harcMatrahi', () => {
  it('rayiç bedel satış bedelinden yüksekse harcı O belirler', () => {
    const sonuc = harcMatrahi(1_000_000, 1_400_000)
    expect(sonuc.matrah).toBe(1_400_000)
    expect(sonuc.rayicMiBelirledi).toBe(true)
  })

  it('satış bedeli yüksekse rayiç bedel harcı belirlemez', () => {
    const sonuc = harcMatrahi(2_000_000, 1_400_000)
    expect(sonuc.matrah).toBe(2_000_000)
    expect(sonuc.rayicMiBelirledi).toBe(false)
  })

  it('rayiç bedel bilinmiyorsa satış bedeli kullanılır', () => {
    expect(harcMatrahi(2_000_000, null)).toEqual({ matrah: 2_000_000, rayicMiBelirledi: false })
    expect(harcMatrahi(2_000_000, 0)).toEqual({ matrah: 2_000_000, rayicMiBelirledi: false })
  })
})

describe('kaynagiCoz', () => {
  it('yaygın yazımları tanır', () => {
    expect(kaynagiCoz('Belediye')).toBe('belediye')
    expect(kaynagiCoz('belediyesi')).toBe('belediye')
    expect(kaynagiCoz('TKGM')).toBe('tkgm')
    expect(kaynagiCoz('Tapu Kadastro')).toBe('tkgm')
  })

  it('tanımadığını uydurmaz', () => {
    expect(kaynagiCoz('kim bilir')).toBeNull()
    expect(kaynagiCoz('')).toBeNull()
  })
})

describe('sutunlariEslestir', () => {
  it('Türkçe başlıkları tanır', () => {
    const eslesme = sutunlariEslestir([
      'Mahalle',
      'Cadde/Sokak',
      'Yıl',
      'Bina m² rayiç',
      'Arsa m² rayiç',
    ])

    expect(eslesme.mahalle).toBe(0)
    expect(eslesme.sokak).toBe(1)
    expect(eslesme.yil).toBe(2)
    expect(eslesme.metrekareRayicBedel).toBe(3)
    expect(eslesme.arsaRayicBedel).toBe(4)
  })

  it('zorunlu alan eşlenmediyse bildirir', () => {
    const eslesme = sutunlariEslestir(['Sokak', 'Bina m² rayiç'])
    expect(eksikZorunluAlanlar(eslesme)).toContain('Mahalle')
  })
})

describe('satirlariCozumle', () => {
  it('Türkçe Excel çıktısını (noktalı virgül + binlik nokta) çözer', () => {
    const cikti = csvAyristir(
      'Mahalle;Sokak;Bina m² rayiç;Arsa m² rayiç\nMuhittin;Atatürk Cad.;9.500;6.200\n',
    )
    const eslesme = sutunlariEslestir(cikti.basliklar)
    const sonuc = satirlariCozumle(cikti.satirlar, eslesme, BAGLAM)

    expect(sonuc.hataliSayisi).toBe(0)
    const veri = sonuc.satirlar[0]?.veri
    expect(veri?.mahalleId).toBe(1)
    expect(veri?.sokak).toBe('Atatürk Cad.')
    expect(veri?.metrekareRayicBedel).toBe(9500)
    expect(veri?.arsaRayicBedel).toBe(6200)
    // Sütunda yıl yok — varsayılan kullanıldı.
    expect(veri?.yil).toBe(2026)
    expect(veri?.kaynak).toBe('belediye')
  })

  it('bilinmeyen mahalleyi TAHMİN ETMEZ, hatalı sayar', () => {
    const cikti = csvAyristir('Mahalle;Bina m² rayiç\nVelimeşe;9.500\n')
    const sonuc = satirlariCozumle(cikti.satirlar, sutunlariEslestir(cikti.basliklar), BAGLAM)

    expect(sonuc.hataliSayisi).toBe(1)
    expect(sonuc.satirlar[0]?.veri).toBeNull()
    expect(sonuc.satirlar[0]?.hatalar[0]).toContain('eşleşmedi')
  })

  it('"Muhittin Mahallesi" yazımını da bağlar', () => {
    const cikti = csvAyristir('Mahalle;Bina m² rayiç\nMUHİTTİN MAHALLESİ;9500\n')
    const sonuc = satirlariCozumle(cikti.satirlar, sutunlariEslestir(cikti.basliklar), BAGLAM)
    expect(sonuc.satirlar[0]?.veri?.mahalleId).toBe(1)
  })

  it('ne bina ne arsa rakamı olan satırı yazmaz', () => {
    const cikti = csvAyristir('Mahalle;Bina m² rayiç;Arsa m² rayiç\nMuhittin;;\n')
    const sonuc = satirlariCozumle(cikti.satirlar, sutunlariEslestir(cikti.basliklar), BAGLAM)

    expect(sonuc.hataliSayisi).toBe(1)
    expect(sonuc.satirlar[0]?.hatalar.join(' ')).toContain('En az biri dolu olmalı')
  })

  it('olağandışı rakamı ENGELLEMEZ ama uyarır — sessiz sıfır kayması yakalanır', () => {
    const cikti = csvAyristir('Mahalle;Bina m² rayiç\nMuhittin;9\n')
    const sonuc = satirlariCozumle(cikti.satirlar, sutunlariEslestir(cikti.basliklar), BAGLAM)

    expect(sonuc.satirlar[0]?.veri).not.toBeNull()
    expect(sonuc.satirlar[0]?.uyarilar.join(' ')).toContain('olağandışı')
  })

  it('dosya içi mükerreri uyarı olarak bildirir', () => {
    const cikti = csvAyristir(
      'Mahalle;Sokak;Bina m² rayiç\nMuhittin;Atatürk Cad.;9500\nMuhittin;Atatürk Cad.;9800\n',
    )
    const sonuc = satirlariCozumle(cikti.satirlar, sutunlariEslestir(cikti.basliklar), BAGLAM)

    expect(sonuc.satirlar[1]?.uyarilar.join(' ')).toContain('2. satırda da var')
  })

  it('geçersiz yılı hata sayar', () => {
    const cikti = csvAyristir('Mahalle;Yıl;Bina m² rayiç\nMuhittin;yirmi;9500\n')
    const sonuc = satirlariCozumle(cikti.satirlar, sutunlariEslestir(cikti.basliklar), BAGLAM)

    expect(sonuc.satirlar[0]?.veri).toBeNull()
    expect(sonuc.satirlar[0]?.hatalar.join(' ')).toContain('yıl olarak okunamadı')
  })

  it('tanınmayan kaynağı sessizce kabul etmez, varsayılana düşer ve uyarır', () => {
    const cikti = csvAyristir('Mahalle;Kaynak;Bina m² rayiç\nMuhittin;kim bilir;9500\n')
    const sonuc = satirlariCozumle(cikti.satirlar, sutunlariEslestir(cikti.basliklar), BAGLAM)

    expect(sonuc.satirlar[0]?.veri?.kaynak).toBe('belediye')
    expect(sonuc.satirlar[0]?.uyarilar.join(' ')).toContain('tanınmadı; varsayılan kullanıldı')
  })
})
