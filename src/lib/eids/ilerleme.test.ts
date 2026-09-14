import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { ADIMLAR } from '@/lib/sihirbaz/sema'

import { ASGARI_YETKI_SURESI_GUN, eidsDegerlendir } from './kurallar'
import { eidsIlerlemesi, eidsKaynagi, eslenmemisKodlar, EIDS_GEREKLILIKLERI } from './ilerleme'
import { EIDS_ENGEL_KODLARI, type EidsGirdisi } from './types'

const BUGUN = new Date('2026-09-13T12:00:00.000Z')

const TAM: EidsGirdisi = {
  eidsDurum: 'yetkili',
  tasinmazNo: '1234567',
  ada: '1847',
  parsel: '12',
  eidsYetkiBaslangic: '2026-08-01',
  eidsYetkiBitis: '2027-08-01',
}

describe('EİDS ilerlemesi', () => {
  it('boş girdide altı eksiğin altısı da duruyor', () => {
    const ilerleme = eidsIlerlemesi({}, BUGUN)

    expect(ilerleme.toplam).toBe(6)
    expect(ilerleme.tamamlanan).toBe(0)
    expect(ilerleme.eksikler).toHaveLength(6)
    expect(ilerleme.ozet).toBe('EİDS: 6 eksikten 0’si tamamlandı')
  })

  it('tam girdide hiç eksik yok', () => {
    const ilerleme = eidsIlerlemesi(TAM, BUGUN)

    expect(ilerleme.tamamlanan).toBe(6)
    expect(ilerleme.eksikler).toEqual([])
    expect(ilerleme.ozet).toContain('hepsi tamamlandı')
  })

  /**
   * ⚠️ ASIL İSTENEN DAVRANIŞ: LİSTE KISALIYOR.
   *
   * Önceden altı engel tek seferde çıkıyor, biri doldurulunca beşi
   * kalıyordu ama kullanıcı ilerlediğini göremiyordu.
   */
  it('alan doldukça eksik listesinden düşüyor', () => {
    const sayilar = [
      eidsIlerlemesi({}, BUGUN).tamamlanan,
      eidsIlerlemesi({ ada: '1847' }, BUGUN).tamamlanan,
      eidsIlerlemesi({ ada: '1847', parsel: '12' }, BUGUN).tamamlanan,
      eidsIlerlemesi({ ada: '1847', parsel: '12', tasinmazNo: '123' }, BUGUN).tamamlanan,
    ]

    expect(sayilar).toEqual([0, 1, 2, 3])
  })

  /**
   * ⚠️ HER ENGEL KODU BİR GEREKLİLİĞE EŞLENMEK ZORUNDA.
   *
   * Eşlenmeyen bir kod sayacı sessizce yanıltırdı: ilan yayına
   * alınamazken sayaç "hepsi tamam" derdi — yani panel ile sunucu
   * ayrışırdı. Kod eklendiğinde bu test kırılır.
   */
  it('tüm engel kodları eşlenmiş', () => {
    expect(eslenmemisKodlar()).toEqual([])
    expect(EIDS_ENGEL_KODLARI.length).toBeGreaterThan(EIDS_GEREKLILIKLERI.length)
  })

  /**
   * ⚠️ SAYAÇ MOTORLA AYNI ŞEYİ SÖYLEMELİ. İkisi ayrışsaydı listede
   * "tamam" yazan bir ilan kaydetmede hata verirdi.
   */
  it('eksik yoksa motor da yayınlanabilir diyor', () => {
    for (const girdi of [
      TAM,
      { ...TAM, ada: undefined },
      { ...TAM, eidsDurum: 'yetkisiz' as const },
      {},
    ]) {
      const ilerleme = eidsIlerlemesi(girdi, BUGUN)
      const degerlendirme = eidsDegerlendir(girdi, BUGUN)
      expect(ilerleme.eksikler.length === 0).toBe(degerlendirme.yayinlanabilir)
    }
  })

  /** ⚠️ Uyarılar (yakında bitiyor) EKSİK SAYILMIYOR — yayını engellemiyorlar. */
  it('yayını engellemeyen uyarı sayacı düşürmüyor', () => {
    const yakinBitis = {
      ...TAM,
      eidsYetkiBitis: '2026-09-20', // 7 gün sonra — uyarı var, engel yok
    }
    const ilerleme = eidsIlerlemesi(yakinBitis, BUGUN)

    expect(eidsDegerlendir(yakinBitis, BUGUN).uyarilar.length).toBeGreaterThan(0)
    expect(ilerleme.eksikler).toEqual([])
  })

  /**
   * ⚠️ İşletmenin kendi ekranı: Ticaret Bakanlığı duyurusuna göre TTBS'deki
   * izin ekranı taşınmaz numarasını ve yetki bitiş tarihini listeliyor.
   */
  it('taşınmaz no ve yetki bitişi TTBS izin ekranını gösteriyor', () => {
    expect(eidsKaynagi('tasinmazNo')).toContain('TTBS → EİDS İlan Yayınlama İzinlerim')
    expect(eidsKaynagi('yetkiBitis')).toContain('TTBS → EİDS İlan Yayınlama İzinlerim')
  })

  /** Metindeki "3 ay" kuralla aynı kalmalı — kural değişip metin eskide kalmasın. */
  it('yetki bitişi metnindeki asgari süre kuralla aynı', () => {
    expect(ASGARI_YETKI_SURESI_GUN).toBe(90)
    expect(eidsKaynagi('yetkiBitis')).toContain('en az 3 ay')
  })

  it('bilinmeyen gereklilik sessizce boş metin dönmüyor', () => {
    expect(() => eidsKaynagi('yok' as never)).toThrow('Bilinmeyen EİDS gerekliliği')
  })

  it('her gerekliliğin kaynağı yazılı', () => {
    for (const gereklilik of EIDS_GEREKLILIKLERI) {
      expect(gereklilik.kaynak.length).toBeGreaterThan(10)
    }
  })

  /** Eksiklerin sırası tanım sırasıyla aynı — ekran her seferinde aynı görünmeli. */
  it('eksikler kararlı sırada', () => {
    const eksikler = eidsIlerlemesi({}, BUGUN).eksikler.map((e) => e.anahtar)
    expect(eksikler).toEqual(EIDS_GEREKLILIKLERI.map((g) => g.anahtar))
  })
})

describe('sihirbaz akışı', () => {
  /**
   * ⚠️ EİDS ADIMI EN BAŞTA — kategoriden hemen sonra.
   *
   * Önceden üçüncüydü: ilan baştan sona dolduruluyor, sonda altı eksik
   * birden görünüyordu. Yetki belgesi mülk sahibinden geliyor ve
   * dakikalar içinde halledilmiyor; engeli sonda görmek, yapılan işin
   * boşa gitmesi demek.
   */
  it('tapu adımı ikinci sırada', () => {
    const sira = ADIMLAR.map((a) => a.anahtar)
    expect(sira[0]).toBe('kategori')
    expect(sira[1]).toBe('tapu')
  })

  it('adım listesi bozulmadı', () => {
    const sira = ADIMLAR.map((a) => a.anahtar)
    expect(new Set(sira).size).toBe(sira.length)
    expect(sira).toContain('temel')
    expect(sira[sira.length - 1]).toBe('yayin')
  })
})

describe('arayüz sözleşmesi', () => {
  const oku = (goreli: string) => readFileSync(join(process.cwd(), goreli), 'utf-8')

  it('panel sayacı ve kaynak metnini çiziyor', () => {
    const panel = oku('src/components/sihirbaz/EidsHazirlikPaneli.tsx')
    expect(panel).toContain('ilerleme.ozet')
    expect(panel).toContain('eksik.kaynak')
    expect(panel).toContain('role="progressbar"')
  })

  /**
   * ⚠️ KURAL GEVŞEMEDİ. Panel hâlâ bir ayna; gerçek kapı sunucudaki
   * kanca. Sihirbazda yayına alma düğmesi `eids.yayinlanabilir`e bağlı
   * ve kanca `overrideAccess: false` ile çalışıyor.
   */
  it('yayına alma hâlâ değerlendirmeye bağlı', () => {
    const sihirbaz = oku('src/components/sihirbaz/PortfoySihirbazi.tsx')
    expect(sihirbaz).toContain('!eids.yayinlanabilir')
  })

  /** Taslak düğmesi EİDS eksikken asıl eylem — "sessiz" stilini bırakıyor. */
  it('taslak düğmesi eksik durumda öne çıkıyor', () => {
    const sihirbaz = oku('src/components/sihirbaz/PortfoySihirbazi.tsx')
    expect(sihirbaz).toContain("`sihirbaz-dugme ${eids.yayinlanabilir ? 'sessiz' : ''}`")
  })

  /**
   * ⚠️ HER EİDS ALANININ YANINDA KAYNAK — sihirbazda VE panel formunda.
   * Metin tek yerden (`eidsKaynagi`) okunuyor; kopya yazılırsa bu test
   * çağrının kaybolduğunu yakalar.
   */
  it('her EİDS alanının ipucu ortak kaynaktan okunuyor', () => {
    const sihirbaz = oku('src/components/sihirbaz/PortfoySihirbazi.tsx')
    for (const g of EIDS_GEREKLILIKLERI) {
      expect(sihirbaz, `sihirbaz: ${g.anahtar}`).toContain(`eidsKaynagi('${g.anahtar}')`)
    }

    const koleksiyon = oku('src/collections/Ilanlar.ts')
    for (const anahtar of ['ada', 'parsel', 'tasinmazNo', 'yetkiBaslangic', 'yetkiBitis']) {
      expect(koleksiyon, `panel: ${anahtar}`).toContain(`eidsKaynagi('${anahtar}')`)
    }
  })

  it('liste hücresi aynı motoru kullanıyor', () => {
    const hucre = oku('src/components/panel/IlanDurumHucresi.tsx')
    expect(hucre).toContain('eidsIlerlemesi')
    expect(oku('src/collections/Ilanlar.ts')).toContain('IlanDurumHucresi')
  })

  /** Yayındaki ilanda rozet yok — EİDS'ten geçmiş demektir. */
  it('rozet yalnızca yayına gidemeyen kayıtlarda', () => {
    const hucre = oku('src/components/panel/IlanDurumHucresi.tsx')
    expect(hucre).toContain("durum !== 'yayinda'")
    expect(hucre).toContain("durum !== 'rezerve'")
  })
})
