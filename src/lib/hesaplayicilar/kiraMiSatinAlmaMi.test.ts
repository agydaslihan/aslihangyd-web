import { describe, expect, it } from 'vitest'

import { kiraMiSatinAlmaMiHesapla, type KiraMiSatinAlmaMiGirdisi } from './kiraMiSatinAlmaMi'

/**
 * ⚠️ Buradaki rakamlar UYDURMADIR ve yalnızca hesap mantığını sınamak
 * içindir. Gerçek Çorlu fiyat/kira verisi değildir (CLAUDE.md kural 2).
 * Testler rakamların doğruluğunu değil, MANTIĞIN doğruluğunu kanıtlar.
 */
function girdi(degisiklik: Partial<KiraMiSatinAlmaMiGirdisi> = {}): KiraMiSatinAlmaMiGirdisi {
  return {
    konutFiyati: 5_000_000,
    pesinat: 1_500_000,
    aylikFaizYuzdesi: 2.5,
    vadeAy: 120,
    aylikKira: 20_000,
    sureYil: 10,
    yillikDegerArtisiYuzdesi: 30,
    yillikKiraArtisiYuzdesi: 25,
    yillikAlternatifGetiriYuzdesi: 35,
    ...degisiklik,
  }
}

function hesapla(degisiklik: Partial<KiraMiSatinAlmaMiGirdisi> = {}) {
  const sonuc = kiraMiSatinAlmaMiHesapla(girdi(degisiklik))
  if (sonuc.durum !== 'hesaplandi') {
    throw new Error(`Hesaplanamadı: ${sonuc.durum} — ${JSON.stringify(sonuc.eksikler)}`)
  }
  return sonuc.veri
}

// ═══════════════════════════════════════════════════════════════════════════
describe('kiraMiSatinAlmaMiHesapla — girdi doğrulama', () => {
  it('varsayımlar girilmeden hesap yapmaz — makul bir oran uydurmaz', () => {
    const sonuc = kiraMiSatinAlmaMiHesapla({
      konutFiyati: 5_000_000,
      pesinat: 1_500_000,
      aylikKira: 20_000,
      sureYil: 10,
    })

    expect(sonuc.durum).toBe('girdi_eksik')
    if (sonuc.durum !== 'girdi_eksik') return

    const anahtarlar = sonuc.eksikler.map((eksik) => eksik.anahtar)
    expect(anahtarlar).toContain('yillikDegerArtisiYuzdesi')
    expect(anahtarlar).toContain('yillikKiraArtisiYuzdesi')
    expect(anahtarlar).toContain('yillikAlternatifGetiriYuzdesi')
  })

  it('sıfır varsayım geçerlidir — girilmemişle karıştırılmaz', () => {
    const sonuc = kiraMiSatinAlmaMiHesapla(
      girdi({
        yillikDegerArtisiYuzdesi: 0,
        yillikKiraArtisiYuzdesi: 0,
        yillikAlternatifGetiriYuzdesi: 0,
      }),
    )

    expect(sonuc.durum).toBe('hesaplandi')
  })

  it('peşinat fiyattan büyükse sessizce kırpmaz, hata döner', () => {
    const sonuc = kiraMiSatinAlmaMiHesapla(girdi({ pesinat: 6_000_000 }))

    expect(sonuc.durum).toBe('girdi_eksik')
    if (sonuc.durum !== 'girdi_eksik') return
    expect(sonuc.eksikler[0]?.anahtar).toBe('pesinat')
  })

  it('kredi kullanılacaksa faiz ve vade zorunludur', () => {
    const sonuc = kiraMiSatinAlmaMiHesapla(girdi({ aylikFaizYuzdesi: null, vadeAy: null }))

    expect(sonuc.durum).toBe('girdi_eksik')
    if (sonuc.durum !== 'girdi_eksik') return
    const anahtarlar = sonuc.eksikler.map((eksik) => eksik.anahtar)
    expect(anahtarlar).toEqual(['aylikFaizYuzdesi', 'vadeAy'])
  })

  it('peşin alımda faiz ve vade istenmez, taksit de gösterilmez', () => {
    const veri = hesapla({
      pesinat: 5_000_000,
      aylikFaizYuzdesi: null,
      vadeAy: null,
    })

    expect(veri.aylikTaksit).toBeNull()
    expect(veri.son.kalanBorc).toBe(0)
  })

  it('süre 30 yılla sınırlanır — daha uzun projeksiyon anlamsızlaşır', () => {
    const veri = hesapla({ sureYil: 50 })
    expect(veri.yillar).toHaveLength(30)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('kiraMiSatinAlmaMiHesapla — simetrik fark yatırımı', () => {
  it('taksit kiradan yüksekse aradaki farkı KİRACI yatırır', () => {
    // Aylık taksit ~55 bin, kira 20 bin → kiracı her ay ~35 bin yatırır.
    const veri = hesapla({ yillikKiraArtisiYuzdesi: 0 })

    expect(veri.son.kiraciYatirimi).toBeGreaterThan(veri.baslangicNakitCikisi)
    expect(veri.son.satinAlanYatirimi).toBe(0)
  })

  it('kira taksitten yüksekse farkı SATIN ALAN yatırır', () => {
    // Peşin alım → satın alanın aylık gideri sıfır, kiracı 40 bin öder.
    const veri = hesapla({
      pesinat: 5_000_000,
      aylikFaizYuzdesi: null,
      vadeAy: null,
      aylikKira: 40_000,
    })

    expect(veri.son.satinAlanYatirimi).toBeGreaterThan(0)
    // Kiracının kasasına yeni katkı GİRMEZ; başlangıç sermayesi yalnızca
    // getiri oranıyla büyür.
    expect(veri.son.kiraciYatirimi).toBeCloseTo(5_000_000 * 1.35 ** 10, 0)
  })

  it('kiracının başlangıç serveti, satın alanın peşin çıkışına eşittir', () => {
    // Peşin alım, getiri sıfır, kira 1 TL. Satın alanın aylık gideri sıfır
    // olduğu için farkı SATIN ALAN yatırır; kiracının kasası hiç değişmez.
    const veri = hesapla({
      pesinat: 5_000_000,
      aylikFaizYuzdesi: null,
      vadeAy: null,
      alimMasraflari: 200_000,
      aylikKira: 1,
      yillikAlternatifGetiriYuzdesi: 0,
      yillikKiraArtisiYuzdesi: 0,
      sureYil: 1,
    })

    expect(veri.baslangicNakitCikisi).toBe(5_200_000)
    expect(veri.son.kiraciNetVarlik).toBe(5_200_000)
    // Satın alan, kiracıdan 1 TL/ay az ödediği için 12 TL biriktirir.
    expect(veri.son.satinAlanYatirimi).toBeCloseTo(12, 2)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('kiraMiSatinAlmaMiHesapla — kredi ve konut değeri', () => {
  it('vade sonunda kredi tamamen kapanır', () => {
    const veri = hesapla({ vadeAy: 120, sureYil: 10 })
    expect(veri.son.kalanBorc).toBe(0)
  })

  it('vade karşılaştırma süresinden uzunsa borç kalır ve varlıktan düşülür', () => {
    const veri = hesapla({ vadeAy: 240, sureYil: 10 })

    expect(veri.son.kalanBorc).toBeGreaterThan(0)
    expect(veri.son.satinAlanNetVarlik).toBeLessThan(veri.son.konutDegeri)
    expect(veri.uyarilar.some((u) => u.includes('Kredi vadesi'))).toBe(true)
  })

  it('değer artışı yıllık bileşik uygulanır', () => {
    const veri = hesapla({ yillikDegerArtisiYuzdesi: 10, sureYil: 3 })

    // Aylık bileşiklendirme yıl sonunda tam olarak yıllık orana denk gelir.
    expect(veri.yillar[0]?.konutDegeri).toBeCloseTo(5_500_000, 0)
    expect(veri.yillar[2]?.konutDegeri).toBeCloseTo(5_000_000 * 1.1 ** 3, 0)
  })

  it('kira yılda bir kez zamlanır, her ay değil', () => {
    const veri = hesapla({
      pesinat: 5_000_000,
      aylikFaizYuzdesi: null,
      vadeAy: null,
      aylikKira: 10_000,
      yillikKiraArtisiYuzdesi: 20,
      sureYil: 2,
    })

    // İlk 12 ay 10.000 sabit → 120.000
    expect(veri.yillar[0]?.kiraciYillikOdeme).toBe(120_000)
    // İkinci yıl %20 zamlı → 144.000
    expect(veri.yillar[1]?.kiraciYillikOdeme).toBeCloseTo(144_000, 0)
  })

  it('satış masrafı girilirse net varlıktan düşülür', () => {
    const masrafsiz = hesapla()
    const masrafli = hesapla({ satisMasrafiYuzdesi: 3 })

    expect(masrafli.son.satinAlanNetVarlik).toBeLessThan(masrafsiz.son.satinAlanNetVarlik)
    expect(masrafsiz.son.satinAlanNetVarlik - masrafli.son.satinAlanNetVarlik).toBeCloseTo(
      masrafsiz.son.konutDegeri * 0.03,
      0,
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('kiraMiSatinAlmaMiHesapla — başabaş', () => {
  it('başabaş yılı, farkın ilk kez pozitife döndüğü yıldır', () => {
    const veri = hesapla()

    if (veri.basabasYili === null) {
      // Hiç öne geçmiyorsa tüm yıllar negatif olmalı.
      expect(veri.yillar.every((satir) => satir.fark < 0)).toBe(true)
      return
    }

    const oncesi = veri.yillar.filter((satir) => satir.yil < (veri.basabasYili as number))
    expect(oncesi.every((satir) => satir.fark < 0)).toBe(true)
    expect(
      veri.yillar.find((satir) => satir.yil === veri.basabasYili)?.fark,
    ).toBeGreaterThanOrEqual(0)
  })

  /**
   * Bu, motorun en önemli testi. Başabaş değer artışı oranı, aracın
   * kullanıcıya varsayım dayatmadan verdiği tek eşik; yanlışsa aracın
   * bütün değeri gider.
   */
  it('başabaş değer artışı oranıyla koşturulursa fark sıfıra yakın çıkar', () => {
    const veri = hesapla()
    expect(veri.basabasDegerArtisi).not.toBeNull()

    const dogrulama = hesapla({ yillikDegerArtisiYuzdesi: veri.basabasDegerArtisi })

    // 0,1 puanlık yuvarlama payı var; farkın büyüklüğü konut değerinin
    // %1'ini aşmamalı.
    expect(Math.abs(dogrulama.son.fark)).toBeLessThan(dogrulama.son.konutDegeri * 0.01)
  })

  it('başabaş eşiğinin üstünde satın alma, altında kiralama kazanır', () => {
    const veri = hesapla()
    const esik = veri.basabasDegerArtisi as number

    expect(hesapla({ yillikDegerArtisiYuzdesi: esik + 5 }).son.fark).toBeGreaterThan(0)
    expect(hesapla({ yillikDegerArtisiYuzdesi: esik - 5 }).son.fark).toBeLessThan(0)
  })

  it('başabaş aranan aralıkta yoksa uydurulmaz, null döner', () => {
    // Alternatif getiri %500 → hiçbir makul değer artışı yetişemez.
    const veri = hesapla({ yillikAlternatifGetiriYuzdesi: 500 })
    expect(veri.basabasDegerArtisi).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('kiraMiSatinAlmaMiHesapla — enflasyon ve şeffaflık', () => {
  it('enflasyon girilmezse bugünkü para gösterilmez — sıfır varsayılmaz', () => {
    expect(hesapla().bugunkuParaylaFark).toBeNull()
  })

  it('enflasyon girilirse fark bugünkü paraya indirgenir', () => {
    const veri = hesapla({ yillikEnflasyonYuzdesi: 25, sureYil: 10 })

    expect(veri.bugunkuParaylaFark).not.toBeNull()
    expect(veri.bugunkuParaylaFark).toBeCloseTo(veri.son.fark / 1.25 ** 10, 0)
  })

  it('girilmeyen gider kalemleri için uyarı üretilir', () => {
    const veri = hesapla()

    expect(veri.uyarilar.some((u) => u.includes('Alım masrafları'))).toBe(true)
    expect(veri.uyarilar.some((u) => u.includes('Emlak vergisi'))).toBe(true)
  })

  it('gider kalemleri girilince o uyarılar kalkar', () => {
    const veri = hesapla({
      alimMasraflari: 200_000,
      yillikMulkiyetGideri: 30_000,
      satisMasrafiYuzdesi: 3,
    })

    expect(veri.uyarilar.some((u) => u.includes('Alım masrafları'))).toBe(false)
    expect(veri.uyarilar.some((u) => u.includes('Emlak vergisi'))).toBe(false)
  })

  it('her durumda kredi maliyeti ve kira mevzuatı uyarısı verilir', () => {
    const veri = hesapla({
      alimMasraflari: 200_000,
      yillikMulkiyetGideri: 30_000,
      satisMasrafiYuzdesi: 3,
    })

    expect(veri.uyarilar.some((u) => u.includes('KKDF'))).toBe(true)
    expect(veri.uyarilar.some((u) => u.includes('mevzuatla sınırlanmış'))).toBe(true)
  })
})
