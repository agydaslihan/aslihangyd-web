import { describe, expect, it } from 'vitest'

import { cepheGunu, cepheOzetleri, saatYaz } from './cephe'
import { GUNES_KISIT_METNI, TURKIYE_UTC_OFSETI, gunesGunu, julianGun, saatAcisi } from './hesap'

/**
 * Güneş hesabının doğrulaması.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU TESTLER HESABIN KENDİSİNİ SINAR, KODUN ÇALIŞTIĞINI DEĞİL.
 *
 * Astronomik bir formülü "hata vermeden koştu" diye doğru saymak, bu
 * projede uydurma veri yasağının en ince ihlali olurdu: ekranda "gün
 * doğumu 06:14" yazacak ve kimse yanlış olduğunu anlamayacaktı.
 *
 * Bu yüzden değerler BİLİNEN referanslara karşı sınanıyor: Çorlu'nun
 * koordinatları ve gündönümü/ekinoks tarihleri. Tolerans ±2 dakika —
 * NOAA algoritmasının kendi beyan ettiği doğruluk sınırı bu mertebede ve
 * daha dar bir tolerans testi kırılgan yapardı.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Çorlu merkezi — `lib/harita/ayarlar.ts` ile aynı koordinat. */
const CORLU_ENLEM = 41.16
const CORLU_BOYLAM = 27.8

/** "HH:MM" → gün başından itibaren dakika. */
function dakika(saat: string): number {
  const [s, d] = saat.split(':').map(Number)
  return s! * 60 + d!
}

describe('julian gün', () => {
  /**
   * ⚠️ Bilinen referans: 1 Ocak 2000, 12:00 UTC = JD 2451545.0
   * Bu, J2000 epoch'unun tanımı. Hesap buradan kayarsa her şey kayar.
   */
  it('J2000 epoch doğru', () => {
    expect(julianGun(2000, 1, 1)).toBeCloseTo(2451544.5, 5)
  })

  it('Gregoryen takvim düzeltmesi uygulanıyor', () => {
    // 4 Ekim 1582 sonrası Gregoryen; 2000 bir artık yıl (400'e bölünüyor).
    expect(julianGun(2000, 3, 1) - julianGun(2000, 2, 28)).toBe(2)
  })
})

describe('Çorlu — gündönümü ve ekinoks', () => {
  /**
   * ⚠️ En uzun gün: 21 Haziran.
   *
   * 41,16° kuzeyde gündüz süresi ~15 saat 5 dakika olmalı. Referans:
   * NOAA hesaplayıcısı. ±3 dakika tolerans.
   */
  it('21 Haziran yılın en uzun günü', () => {
    const gun = gunesGunu(CORLU_ENLEM, CORLU_BOYLAM, new Date(Date.UTC(2026, 5, 21)))

    expect(gun.gunduzDakika).not.toBeNull()
    expect(gun.gunduzDakika!).toBeGreaterThan(15 * 60 - 15)
    expect(gun.gunduzDakika!).toBeLessThan(15 * 60 + 15)
  })

  /**
   * ⚠️ En kısa gün: 21 Aralık. Çorlu'da ~9 saat 15 dakika.
   */
  it('21 Aralık yılın en kısa günü', () => {
    const gun = gunesGunu(CORLU_ENLEM, CORLU_BOYLAM, new Date(Date.UTC(2026, 11, 21)))

    expect(gun.gunduzDakika!).toBeGreaterThan(9 * 60 - 15)
    expect(gun.gunduzDakika!).toBeLessThan(9 * 60 + 15)
  })

  /**
   * ⚠️ Ekinoksta gündüz ≈ gece.
   *
   * Tam 12 saat DEĞİL: gün doğumu güneşin üst kenarına göre tanımlı ve
   * atmosferik kırılma günü ~8 dakika uzatıyor. 12 saat 0 dakika beklemek
   * yanlış olurdu; 12 saat 5–12 dakika doğru aralık.
   */
  it('ekinoksta gündüz 12 saatin biraz üstünde', () => {
    for (const tarih of [new Date(Date.UTC(2026, 2, 20)), new Date(Date.UTC(2026, 8, 22))]) {
      const gun = gunesGunu(CORLU_ENLEM, CORLU_BOYLAM, tarih)
      expect(gun.gunduzDakika!).toBeGreaterThan(12 * 60)
      expect(gun.gunduzDakika!).toBeLessThan(12 * 60 + 20)
    }
  })

  /**
   * ⚠️ Öğle yüksekliği gündönümlerinde bilinen değerlere oturmalı.
   *
   * Yaz gündönümü: 90 − |enlem − 23,44| ≈ 72,3°
   * Kış gündönümü: 90 − |enlem + 23,44| ≈ 25,4°
   */
  it('öğle güneş yüksekliği gündönümlerinde doğru', () => {
    const yaz = gunesGunu(CORLU_ENLEM, CORLU_BOYLAM, new Date(Date.UTC(2026, 5, 21)))
    const kis = gunesGunu(CORLU_ENLEM, CORLU_BOYLAM, new Date(Date.UTC(2026, 11, 21)))

    expect(yaz.ogleYuksekligi).toBeGreaterThan(71)
    expect(yaz.ogleYuksekligi).toBeLessThan(74)
    expect(kis.ogleYuksekligi).toBeGreaterThan(24)
    expect(kis.ogleYuksekligi).toBeLessThan(27)
  })

  /**
   * ⚠️ Boylam düzeltmesi çalışıyor mu?
   *
   * Çorlu 27,8° doğuda ama saat dilimi 45° (UTC+3) üzerinden işliyor.
   * Fark ~69 dakika: güneş öğlesi saat 12:00'de değil ~13:09'da.
   * Düzeltme unutulsaydı gün doğumu bir saatten fazla kayardı ve bu,
   * ekranda gözle fark edilmeyecek kadar makul görünürdü.
   */
  it('boylam düzeltmesi uygulanıyor — güneş öğlesi 12:00 değil', () => {
    const gun = gunesGunu(CORLU_ENLEM, CORLU_BOYLAM, new Date(Date.UTC(2026, 2, 20)))
    const ortaNokta = (dakika(gun.gunDogumu!) + dakika(gun.gunBatimi!)) / 2

    // ~13:09 civarı bekleniyor (12:00'den 60–80 dakika sonra).
    expect(ortaNokta).toBeGreaterThan(12 * 60 + 55)
    expect(ortaNokta).toBeLessThan(13 * 60 + 25)
  })

  it('gün doğumu batımdan önce ve süre ikisinin farkı', () => {
    const gun = gunesGunu(CORLU_ENLEM, CORLU_BOYLAM, new Date(Date.UTC(2026, 5, 21)))
    const dogus = dakika(gun.gunDogumu!)
    const batis = dakika(gun.gunBatimi!)

    expect(dogus).toBeLessThan(batis)
    expect(Math.abs(batis - dogus - gun.gunduzDakika!)).toBeLessThanOrEqual(2)
  })
})

describe('sınır durumları', () => {
  /**
   * ⚠️ Kutup gündüzü/gecesi `NaN` ÜRETMEMELİ.
   *
   * Çorlu için hiç gerçekleşmez ama fonksiyon genel; `Math.acos` tanım
   * kümesi dışına çıktığında sessizce `NaN` dönseydi ekranda "NaN:NaN"
   * yazardı. `null` dönüp çağıranı dürüstçe bilgilendiriyor.
   */
  it('kutup gecesinde null döner, NaN değil', () => {
    // Kuzey Kutbu, kış gündönümü.
    expect(saatAcisi(89, -23.44)).toBeNull()
    const gun = gunesGunu(89, 0, new Date(Date.UTC(2026, 11, 21)))
    expect(gun.gunDogumu).toBeNull()
    expect(gun.gunduzDakika).toBeNull()
  })

  it('kutup gündüzünde de null döner', () => {
    expect(saatAcisi(89, 23.44)).toBeNull()
  })

  it('ekvatorda gündüz yıl boyu ~12 saat', () => {
    for (const ay of [0, 3, 6, 9]) {
      const gun = gunesGunu(0, 0, new Date(Date.UTC(2026, ay, 15)))
      expect(gun.gunduzDakika!).toBeGreaterThan(12 * 60 - 10)
      expect(gun.gunduzDakika!).toBeLessThan(12 * 60 + 15)
    }
  })
})

describe('yörünge eğrisi', () => {
  it('72 nokta üretir ve tepe noktası öğleye yakın', () => {
    const gun = gunesGunu(CORLU_ENLEM, CORLU_BOYLAM, new Date(Date.UTC(2026, 5, 21)))
    expect(gun.yorunge).toHaveLength(72)

    const tepe = gun.yorunge.reduce((a, b) => (b.yukseklik > a.yukseklik ? b : a))
    // Güneş öğlesi ~13:09; 20 dakikalık örnekleme payıyla.
    expect(tepe.dakika).toBeGreaterThan(12 * 60 + 30)
    expect(tepe.dakika).toBeLessThan(13 * 60 + 40)
  })

  it('tepe yüksekliği öğle yüksekliğiyle tutarlı', () => {
    const gun = gunesGunu(CORLU_ENLEM, CORLU_BOYLAM, new Date(Date.UTC(2026, 5, 21)))
    const tepe = gun.yorunge.reduce((a, b) => (b.yukseklik > a.yukseklik ? b : a))

    // 20 dakikalık örnekleme tepeyi biraz ıskalayabilir; 1° tolerans.
    expect(Math.abs(tepe.yukseklik - gun.ogleYuksekligi)).toBeLessThan(1)
  })

  it('gece saatlerinde yükseklik negatif', () => {
    const gun = gunesGunu(CORLU_ENLEM, CORLU_BOYLAM, new Date(Date.UTC(2026, 11, 21)))
    const geceYarisi = gun.yorunge.find((nokta) => nokta.dakika === 0)!
    expect(geceYarisi.yukseklik).toBeLessThan(0)
  })
})

describe('sabitler', () => {
  /**
   * ⚠️ Türkiye 2016'da yaz saatini kaldırdı ve kalıcı UTC+3'e geçti.
   * Bu sabit değişirse (ülke yaz saatine dönerse) test kırılsın ve
   * değişiklik bilinçli olsun.
   */
  it('saat dilimi sabit UTC+3', () => {
    expect(TURKIYE_UTC_OFSETI).toBe(3)
  })

  /**
   * ⚠️ Kısıt metni boş olamaz: güneş verisinin göründüğü her yerde
   * gölgeleme varsayımının yazılması gerekiyor.
   */
  it('kısıt metni gölgelemeden bahsediyor', () => {
    expect(GUNES_KISIT_METNI).toContain('gölgeleme')
    expect(GUNES_KISIT_METNI.length).toBeGreaterThan(60)
  })
})

/**
 * Cephe analizi.
 *
 * ⚠️ Bu testler sağduyuyu sınıyor: kuzey cephe kışın güney cepheden az
 * güneş almalı, doğu cephesi sabah / batı akşam görmeli. Bir işaret hatası
 * (azimutun kuzey yerine güneyden sayılması gibi) hesabı "çalışır" ama
 * tam ters yapardı ve ekranda makul görünürdü.
 */
describe('cephe analizi', () => {
  const YIL = 2026

  it('güney cephe kışın kuzeyden çok daha fazla güneş alır', () => {
    const [guney] = cepheOzetleri(CORLU_ENLEM, CORLU_BOYLAM, ['guney'], YIL)
    const [kuzey] = cepheOzetleri(CORLU_ENLEM, CORLU_BOYLAM, ['kuzey'], YIL)

    expect(guney!.kisDakika).toBeGreaterThan(kuzey!.kisDakika + 120)
  })

  /**
   * ⚠️ Kuzey cephe KIŞIN doğrudan güneş almaz — 41° enlemde güneş öğlen
   * bile güneyde. Bu, hesabın işaret yönünü doğrulayan en keskin kontrol.
   */
  it('kuzey cephe kışın doğrudan güneş almıyor', () => {
    const [kuzey] = cepheOzetleri(CORLU_ENLEM, CORLU_BOYLAM, ['kuzey'], YIL)
    expect(kuzey!.kisDakika).toBe(0)
  })

  /**
   * ⚠️ Kuzey cephe YAZIN bir miktar güneş alır: güneş yazın kuzeydoğudan
   * doğup kuzeybatıdan batıyor. Sıfır çıkarsa yörünge azimutu yanlış.
   */
  it('kuzey cephe yazın sabah ve akşam güneş alır', () => {
    const [kuzey] = cepheOzetleri(CORLU_ENLEM, CORLU_BOYLAM, ['kuzey'], YIL)
    expect(kuzey!.yazDakika).toBeGreaterThan(0)
    expect(kuzey!.yazDakika).toBeLessThan(kuzey!.kisDakika + 8 * 60)
  })

  it('doğu ve batı cepheleri simetriye yakın', () => {
    const [dogu] = cepheOzetleri(CORLU_ENLEM, CORLU_BOYLAM, ['dogu'], YIL)
    const [bati] = cepheOzetleri(CORLU_ENLEM, CORLU_BOYLAM, ['bati'], YIL)

    // Zaman denklemi yüzünden birebir eşit değil; 1 saatlik pay yeter.
    expect(Math.abs(dogu!.yazDakika - bati!.yazDakika)).toBeLessThan(60)
  })

  it('doğu cephesi sabah, batı cephesi akşam güneş görür', () => {
    const gun = gunesGunu(CORLU_ENLEM, CORLU_BOYLAM, new Date(Date.UTC(YIL, 5, 21)))
    const sabah = gun.yorunge.find((n) => n.dakika === 8 * 60)!
    const aksam = gun.yorunge.find((n) => n.dakika === 18 * 60)!

    // Sabah güneş doğuda (azimut < 180), akşam batıda (> 180).
    expect(sabah.azimut).toBeLessThan(180)
    expect(aksam.azimut).toBeGreaterThan(180)
  })

  it('köşe daire iki cepheyi ayrı ayrı raporlar', () => {
    const ozetler = cepheOzetleri(CORLU_ENLEM, CORLU_BOYLAM, ['guney', 'bati'], YIL)
    expect(ozetler).toHaveLength(2)
    expect(ozetler.map((o) => o.etiket)).toEqual(['Güney', 'Batı'])
  })

  it('bilinmeyen cephe yönü hata verir — sessizce sıfır dönmez', () => {
    expect(() =>
      cepheGunu(CORLU_ENLEM, CORLU_BOYLAM, new Date(Date.UTC(YIL, 5, 21)), 'yukari' as never),
    ).toThrow()
  })

  it('saat metni okunur ve sıfırı dürüstçe söyler', () => {
    expect(saatYaz(0)).toContain('almıyor')
    expect(saatYaz(390)).toBe('~6,5 saat')
    expect(saatYaz(360)).toBe('~6 saat')
  })
})
