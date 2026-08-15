import { describe, expect, it } from 'vitest'

import { kontrastOrani } from '@/lib/tasarim/kontrast'

import {
  alternatifOner,
  gecerliHex,
  kapiMesaji,
  paletiDegerlendir,
  yuvaIcinOner,
} from './kontrastKapisi'
import { CIFTLER, HAZIR_PALETLER, varsayilanPalet, YUVALAR, type Palet } from './yuvalar'

describe('kontrast kapısı — geçen paletler', () => {
  it('varsayılan açık palet kapıdan geçer', () => {
    const sonuc = paletiDegerlendir(varsayilanPalet('acik'))
    expect(sonuc.kalanlar.map((c) => `${c.etiket} ${c.oran}`)).toEqual([])
    expect(sonuc.gecti).toBe(true)
  })

  it('varsayılan koyu palet kapıdan geçer', () => {
    const sonuc = paletiDegerlendir(varsayilanPalet('koyu'))
    expect(sonuc.kalanlar.map((c) => `${c.etiket} ${c.oran}`)).toEqual([])
    expect(sonuc.gecti).toBe(true)
  })

  /**
   * ⚠️ HAZIR PALETLERİN HEPSİ GEÇMEK ZORUNDA.
   *
   * Geçmeyen bir hazır palet, Aslıhan'a "bu palete dön" dedirtip sonra
   * kaydettirmeyen bir tuzak olurdu — üstelik hatanın kendi seçiminden
   * değil bizim hazır setimizden geldiğini anlaması imkânsız.
   */
  it('her hazır palet iki temada da kapıdan geçer', () => {
    const sorunlar: string[] = []

    for (const hazir of HAZIR_PALETLER) {
      for (const [tema, palet] of [
        ['açık', hazir.acik],
        ['koyu', hazir.koyu],
      ] as const) {
        const sonuc = paletiDegerlendir(palet)
        for (const cift of sonuc.kalanlar) {
          sorunlar.push(`${hazir.ad} (${tema}) · ${cift.etiket}: ${cift.oran} < ${cift.esik}`)
        }
      }
    }

    expect(sorunlar).toEqual([])
  })

  it('her hazır palet tüm yuvaları dolduruyor', () => {
    for (const hazir of HAZIR_PALETLER) {
      for (const palet of [hazir.acik, hazir.koyu]) {
        for (const yuva of YUVALAR) {
          expect(gecerliHex(palet[yuva.anahtar]), `${hazir.ad} → ${yuva.anahtar}`).toBe(true)
        }
      }
    }
  })
})

describe('kontrast kapısı — geçmeyen paletler', () => {
  /**
   * ⚠️ İSTEKTE VERİLEN TERRACOTTA (#A85A42) KAPIDAN GEÇMİYOR.
   *
   * Ana zeminde 4,78 ile geçiyor ama krem bölüm zemininde 4,22'ye düşüyor.
   * Sitede kullanılan `#844632` tam da bu yüzden türetilmişti.
   *
   * Bu test hem kapının gerçekten çalıştığını hem de bu somut vakayı
   * belgeliyor: "renk kartelasında güzel duruyor" ile "sitede okunuyor"
   * ayrı şeyler.
   */
  it('rampa terracottası vurgu yuvasına konursa kapı kapanır', () => {
    const palet: Palet = { ...varsayilanPalet('acik'), vurgu: '#a85a42' }
    const sonuc = paletiDegerlendir(palet)

    expect(sonuc.gecti).toBe(false)
    const kalan = sonuc.kalanlar.find((c) => c.etiket === 'Başlık / Bölüm arka planı')
    expect(kalan).toBeDefined()
    expect(kalan?.oran).toBeLessThan(4.5)
  })

  it('metin ile zemin aynı olursa kapı kapanır', () => {
    const palet: Palet = { ...varsayilanPalet('acik'), metin: '#fbfaf7' }
    expect(paletiDegerlendir(palet).gecti).toBe(false)
  })

  it('soluk buton zemini bileşen eşiğinde takılır', () => {
    // Beyaza yakın buton, açık zeminde 3:1 bileşen eşiğini geçemez.
    const palet: Palet = {
      ...varsayilanPalet('acik'),
      butonZemin: '#f0efe9',
      butonMetin: '#2a2a2a',
    }
    const sonuc = paletiDegerlendir(palet)
    const kalan = sonuc.kalanlar.find((c) => c.etiket === 'Buton zemini / Ana arka plan')
    expect(kalan).toBeDefined()
    expect(kalan?.esik).toBe(3)
  })

  /**
   * ⚠️ Boş yuva sessizce "geçti" sayılmamalı. Sayılsaydı yarım bir palet
   * kaydedilir ve site tanımsız CSS değişkeniyle çalışırdı.
   */
  it('boş ya da bozuk renk geçersiz sayılır', () => {
    for (const bozuk of ['', '#fff', 'kırmızı', '#gggggg', undefined]) {
      const palet = { ...varsayilanPalet('acik'), metin: bozuk } as Palet
      expect(paletiDegerlendir(palet).gecti, String(bozuk)).toBe(false)
    }
  })

  it('hata mesajı hangi çift, kaç, ne gerektiğini yazar', () => {
    const palet: Palet = { ...varsayilanPalet('acik'), vurgu: '#a85a42' }
    const metin = kapiMesaji(paletiDegerlendir(palet), 'açık')

    expect(metin).toContain('Başlık / Bölüm arka planı')
    expect(metin).toContain('4.5')
    expect(metin).toContain('kaydedilemez')
  })

  it('geçen palette hata mesajı boş', () => {
    expect(kapiMesaji(paletiDegerlendir(varsayilanPalet('acik')), 'açık')).toBe('')
  })
})

describe('alternatif önerisi', () => {
  it('açık zeminde koyulaştırıp eşiği geçirir', () => {
    const oneri = alternatifOner('#a85a42', '#f2ebe3', 4.5)
    expect(oneri).not.toBeNull()
    expect(kontrastOrani(oneri as string, '#f2ebe3')).toBeGreaterThanOrEqual(4.5)
  })

  it('koyu zeminde açıklaştırıp eşiği geçirir', () => {
    const oneri = alternatifOner('#5c3a2e', '#3d2b2f', 4.5)
    expect(oneri).not.toBeNull()
    expect(kontrastOrani(oneri as string, '#3d2b2f')).toBeGreaterThanOrEqual(4.5)
  })

  /**
   * ⚠️ Öneri EŞİĞİN TAM ÜSTÜNDE durmamalı. Tam eşikte duran bir değer, bir
   * sonraki küçük düzenlemede sessizce altına düşer. Bu projede pudra
   * zemini için aynı karar bilinçle verilmişti.
   */
  it('öneri eşiğin hemen üstünde bırakılmıyor — pay var', () => {
    const oneri = alternatifOner('#a85a42', '#f2ebe3', 4.5)
    expect(kontrastOrani(oneri as string, '#f2ebe3')).toBeGreaterThan(4.6)
  })

  /**
   * ⚠️ TON KORUNMALI. sRGB'de siyaha karıştırmak terracottayı kahverengiye
   * çevirir; OKLab algısal olarak eşit adımlıdır. Kırmızı kanalın baskın
   * kalması bunun kaba ama yeterli göstergesi.
   */
  it('önerilen renk özgün tonu koruyor', () => {
    const oneri = alternatifOner('#a85a42', '#f2ebe3', 4.5) as string
    const r = parseInt(oneri.slice(1, 3), 16)
    const g = parseInt(oneri.slice(3, 5), 16)
    const b = parseInt(oneri.slice(5, 7), 16)
    expect(r).toBeGreaterThan(g)
    expect(g).toBeGreaterThan(b)
  })

  it('geçersiz girdide null', () => {
    expect(alternatifOner('kırmızı', '#ffffff', 4.5)).toBeNull()
    expect(alternatifOner('#ffffff', 'yok', 4.5)).toBeNull()
  })

  /**
   * ⚠️ ÖNERİ YUVANIN TÜM ÇİFTLERİNİ BİRDEN KARŞILAMALI.
   *
   * Vurgu rengi üç ayrı zeminde kullanılıyor. Yalnızca birine göre
   * önerilen renk diğerinde kapıyı geçmez; kullanıcı öneriyi uygulayıp
   * yine kırmızı görürdü.
   */
  it('yuva önerisi o yuvanın bütün çiftlerini geçiriyor', () => {
    const palet: Palet = { ...varsayilanPalet('acik'), vurgu: '#a85a42' }
    const oneri = yuvaIcinOner('vurgu', palet)
    expect(oneri).not.toBeNull()

    const duzeltilmis = { ...palet, vurgu: oneri as string }
    const sonuc = paletiDegerlendir(duzeltilmis)
    expect(sonuc.kalanlar.filter((c) => c.on === 'vurgu')).toEqual([])
  })

  it('çifti olmayan yuva için öneri üretilmez', () => {
    expect(yuvaIcinOner('dekoratifCizgi', varsayilanPalet('acik'))).toBeNull()
  })
})

describe('yuva ve çift tanımları', () => {
  /**
   * ⚠️ YUVA SAYISI ARTIRILMAYACAK. Her yeni yuva yeni bir kontrast çifti
   * demek ve çift sayısı yuvaların birleşimiyle büyür.
   */
  it('on yuva var — ne eksik ne fazla', () => {
    expect(YUVALAR).toHaveLength(10)
  })

  it('yuva anahtarları benzersiz', () => {
    const anahtarlar = YUVALAR.map((y) => y.anahtar)
    expect(new Set(anahtarlar).size).toBe(anahtarlar.length)
  })

  it('her yuva farklı bir CSS jetonu sürüyor', () => {
    const jetonlar = YUVALAR.map((y) => y.jeton)
    expect(new Set(jetonlar).size).toBe(jetonlar.length)
  })

  /**
   * ⚠️ DEKORATİF YUVALAR METİN OLARAK ÖLÇÜLMEZ.
   *
   * Gold açık zeminde 2,14:1 verir. Onu bir metin eşiğine sokmaya çalışmak
   * ya paleti kırardı ya kapıyı anlamsızlaştırırdı. Yerine rol işareti ve
   * panelde açık uyarı var.
   */
  it('dekoratif yuva hiçbir çiftte ön plan değil', () => {
    const dekoratifler = YUVALAR.filter((y) => y.rol === 'dekoratif').map((y) => y.anahtar)
    for (const cift of CIFTLER) {
      expect(dekoratifler, `${cift.etiket} dekoratif bir yuvayı metin sayıyor`).not.toContain(
        cift.on,
      )
    }
  })

  it('her çift var olan yuvalara başvuruyor', () => {
    const anahtarlar = new Set(YUVALAR.map((y) => y.anahtar))
    for (const cift of CIFTLER) {
      expect(anahtarlar.has(cift.on), `${cift.etiket} → ${cift.on}`).toBe(true)
      expect(anahtarlar.has(cift.arka), `${cift.etiket} → ${cift.arka}`).toBe(true)
    }
  })

  /**
   * ⚠️ METİN ROLÜNDEKİ HER YUVA EN AZ BİR ÇİFTTE ÖLÇÜLMELİ.
   *
   * Ölçülmeyen bir metin yuvası, kapının göremediği bir yuvadır: panel
   * yeşil gösterir, site okunmaz olur.
   */
  it('metin rolündeki her yuva en az bir çiftte ölçülüyor', () => {
    const olculen = new Set(CIFTLER.map((c) => c.on))
    for (const yuva of YUVALAR.filter((y) => y.rol === 'metin')) {
      expect(olculen.has(yuva.anahtar), `${yuva.etiket} hiçbir çiftte ölçülmüyor`).toBe(true)
    }
  })
})
