import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { sayiyaCevir } from '@/lib/csv/ayristir'

import {
  CORLU_KUTUSU,
  konumuDenetle,
  koordinatCoz,
  koordinatYaz,
  noktadanCoz,
  noktayaCevir,
} from './dogrula'

/** Alipaşa'nın gerçek merkezi — üretim veritabanından. */
const ALIPASA = { enlem: 41.14893, boylam: 27.827424 }

describe('konum denetimi', () => {
  it('Çorlu içindeki nokta temiz geçiyor', () => {
    expect(konumuDenetle(ALIPASA.enlem, ALIPASA.boylam)).toEqual({
      durum: 'tamam',
      mesaj: null,
      takas: null,
    })
  })

  /**
   * ⚠️ ÜRETİMDEN ALINAN GERÇEK HATA. İlan #4'ün kaydı birebir buydu ve
   * nokta Suudi Arabistan'da çıkıyordu.
   */
  it('ters girilmiş koordinatı yakalıyor (ilan #4)', () => {
    const sonuc = konumuDenetle(27.828600915, 41.150169137)

    expect(sonuc.durum).toBe('ters')
    expect(sonuc.mesaj).toContain('karıştırmış olabilirsiniz')
    expect(sonuc.takas).toEqual({ enlem: 41.150169137, boylam: 27.828600915 })
  })

  /** ⚠️ Takas, düzeltilmiş değeri VERİYOR — yalnızca "yanlış" demiyor. */
  it('takas edilen değer denetimden temiz geçiyor', () => {
    const ilk = konumuDenetle(27.828600915, 41.150169137)
    const takas = ilk.takas

    expect(takas).not.toBeNull()
    expect(konumuDenetle(takas?.enlem, takas?.boylam).durum).toBe('tamam')
  })

  /**
   * ⚠️ ÜRETİMDEN ALINAN İKİNCİ GERÇEK HATA. İlan #2'nin kaydı POINT(1 1)
   * idi — Gine Körfezi.
   *
   * Önceki hâli bunu "Çorlu dışında" sayıyor ve kullanıcıya "enlem ve
   * boylamı karıştırmış olabilirsiniz" diyordu. Yanlış tavsiye: ortada
   * karıştırılacak bir konum yok. Doğrusu alanı boş bırakmak.
   */
  it('yer tutucu değeri yakalıyor (ilan #2)', () => {
    const sonuc = konumuDenetle(1, 1)

    expect(sonuc.durum).toBe('yer_tutucu')
    expect(sonuc.takas).toBeNull()
    expect(sonuc.mesaj).toContain('boş bırakın')
    expect(sonuc.mesaj).not.toContain('karıştırmış')
  })

  it('sıfır noktası da yer tutucu', () => {
    expect(konumuDenetle(0, 0).durum).toBe('yer_tutucu')
  })

  /** ⚠️ Kutu denetiminden ÖNCE: tam sayı derece Çorlu kutusuna düşse de bina değil. */
  it('Çorlu kutusuna düşen tam sayı derece de yer tutucu', () => {
    expect(konumuDenetle(41, 28).durum).toBe('yer_tutucu')
  })

  /** Ters yer tutucu takas önermiyor — takası da anlamsız. */
  it('yer tutucu takas edilebilir görünse bile takas önerilmiyor', () => {
    expect(konumuDenetle(28, 41).takas).toBeNull()
  })

  /** Ölçüt dar: tek bir ondalık yeter, gerçek ama uzak koordinat "dışarıda" kalıyor. */
  it('ondalıklı uzak koordinat yer tutucu sayılmıyor', () => {
    expect(konumuDenetle(1.5, 1.5).durum).toBe('disarida')
    expect(konumuDenetle(41.15, 28).durum).toBe('tamam')
  })

  it('dünya dışı değeri geçersiz sayıyor', () => {
    expect(konumuDenetle(91, 27.8).durum).toBe('gecersiz')
    expect(konumuDenetle(41.1, 181).durum).toBe('gecersiz')
  })

  it('eksik değer uyarı üretmiyor', () => {
    // Henüz yazmamış kullanıcıya hata göstermek gürültüdür.
    expect(konumuDenetle(null, null).durum).toBe('eksik')
    expect(konumuDenetle(41.1, null).mesaj).toBeNull()
    expect(konumuDenetle(undefined, 27.8).durum).toBe('eksik')
  })

  it('kutunun kenarları dahil', () => {
    expect(konumuDenetle(CORLU_KUTUSU.enlemEnAz, CORLU_KUTUSU.boylamEnAz).durum).toBe('tamam')
    expect(konumuDenetle(CORLU_KUTUSU.enlemEnCok, CORLU_KUTUSU.boylamEnCok).durum).toBe('tamam')
  })

  /**
   * ⚠️ KUTU BİLEREK GENİŞ — komşu ilçeler İÇİNDE kalıyor.
   *
   * Velimeşe ve Ergene OSB'leri Çorlu'nun hemen dışında ve portföy oraya
   * uzanabilir. Kutuyu ilçe sınırına daraltmak, meşru bir ilanı her
   * seferinde uyarırdı; sürekli uyaran bir denetim kapatılır.
   *
   * Kutunun işi coğrafi kesinlik değil, MERTEBE hatasını yakalamak:
   * enlem/boylam takası noktayı yüzlerce kilometre öteye atıyor.
   */
  it('komşu ilçeler uyarı üretmiyor', () => {
    expect(konumuDenetle(41.02, 27.95).durum).toBe('tamam') // Ergene civarı
    expect(konumuDenetle(41.28, 27.99).durum).toBe('tamam') // Çerkezköy civarı
  })

  it('başka şehir uyarı üretiyor', () => {
    const sonuc = konumuDenetle(41.01, 28.98) // İstanbul
    expect(sonuc.durum).toBe('disarida')
    expect(sonuc.takas).toBeNull()
  })
})

describe('koordinat ayrıştırma', () => {
  it('nokta ve virgül aynı sayıyı veriyor', () => {
    expect(koordinatCoz('41.150169')).toBeCloseTo(41.150169, 9)
    expect(koordinatCoz('41,150169')).toBeCloseTo(41.150169, 9)
  })

  /**
   * ⚠️ ASIL TUZAK BU SATIRDA.
   *
   * `sayiyaCevir` para rakamları için yazıldı ve son grubu tam üç haneli
   * olan noktayı BİNLİK ayırıcı sayıyor — "41.150" onun için kırk bir bin
   * yüz elli. Koordinatta binlik ayırıcı yoktur; aynı ayrıştırıcıyı
   * kullanmak noktayı Kuzey Kutbu'nun ötesine atardı.
   */
  it('binlik ayırıcı sanılmıyor — para ayrıştırıcısından FARKLI', () => {
    expect(sayiyaCevir('41.150')).toBe(41150)
    expect(koordinatCoz('41.150')).toBeCloseTo(41.15, 9)
  })

  it('negatif ve işaretli değer okunuyor', () => {
    expect(koordinatCoz('-41.15')).toBeCloseTo(-41.15, 9)
    expect(koordinatCoz('+27.8')).toBeCloseTo(27.8, 9)
  })

  it('boşluk temizleniyor', () => {
    expect(koordinatCoz('  41.15  ')).toBeCloseTo(41.15, 9)
  })

  it('sayı olmayan metin null', () => {
    expect(koordinatCoz('41.15 N')).toBeNull()
    expect(koordinatCoz('abc')).toBeNull()
    expect(koordinatCoz('')).toBeNull()
    expect(koordinatCoz('41.15.20')).toBeNull()
  })
})

describe('yazım', () => {
  it('ondalık ayırıcı NOKTA — Türkçe virgül değil', () => {
    // Kullanıcı bu değeri haritaya/tapu sorgusuna yapıştırıyor.
    expect(koordinatYaz(41.150169)).toBe('41.150169')
  })

  it('altı basamağa yuvarlanıyor', () => {
    expect(koordinatYaz(41.150169137)).toBe('41.150169')
  })

  it('gereksiz sıfır yazılmıyor', () => {
    expect(koordinatYaz(41.15)).toBe('41.15')
  })

  it('değer yoksa boş', () => {
    expect(koordinatYaz(null)).toBe('')
    expect(koordinatYaz(Number.NaN)).toBe('')
  })
})

describe('Payload point dönüşümü', () => {
  /** ⚠️ Payload dizide [boylam, enlem] tutuyor — arayüzün sırası tersi. */
  it('diziden çözerken sıra GeoJSON', () => {
    expect(noktadanCoz([27.827424, 41.14893])).toEqual({
      boylam: 27.827424,
      enlem: 41.14893,
    })
  })

  it('diziye çevirirken sıra GeoJSON', () => {
    expect(noktayaCevir(41.14893, 27.827424)).toEqual([27.827424, 41.14893])
  })

  it('gidiş–dönüş değeri korunuyor', () => {
    const nokta = noktayaCevir(ALIPASA.enlem, ALIPASA.boylam)
    expect(noktadanCoz(nokta)).toEqual(ALIPASA)
  })

  it('biri eksikse nokta üretilmiyor', () => {
    expect(noktayaCevir(41.1, null)).toBeNull()
    expect(noktayaCevir(null, 27.8)).toBeNull()
  })

  it('bozuk girdi çökertmiyor', () => {
    expect(noktadanCoz(null)).toEqual({ enlem: null, boylam: null })
    expect(noktadanCoz([1])).toEqual({ enlem: null, boylam: null })
    expect(noktadanCoz('metin')).toEqual({ enlem: null, boylam: null })
  })
})

/* ══════════════════════════════════════════════════════════════════════════
   Arayüz sözleşmesi
   ══════════════════════════════════════════════════════════════════════════ */

describe('alan sırası ve bağlantılar', () => {
  const oku = (goreli: string) => readFileSync(join(process.cwd(), goreli), 'utf-8')

  /**
   * ⚠️ BU TESTİN TAMAMI TEK BİR İDDİA İÇİN: ENLEM ÖNCE GELİYOR.
   *
   * Payload'ın varsayılan `point` editörü GeoJSON sırasını izleyip önce
   * "Boylam" soruyor; insanın bildiği sıra bunun tersi. 13 Eylül 2026'da
   * panelden girilen iki ilanın da koordinatı bu yüzden bozuktu.
   *
   * Sıra geri alınırsa bu test kırılır — ve kırılmalı.
   */
  it('panelde enlem kutusu boylamdan ÖNCE çiziliyor', () => {
    const bilesen = oku('src/components/panel/KonumAlaniIstemci.tsx')
    const enlem = bilesen.indexOf('Enlem (kuzey–güney)')
    const boylam = bilesen.indexOf('Boylam (doğu–batı)')

    expect(enlem).toBeGreaterThan(-1)
    expect(boylam).toBeGreaterThan(-1)
    expect(enlem).toBeLessThan(boylam)
  })

  it('sihirbazda da enlem önce', () => {
    const sihirbaz = oku('src/components/sihirbaz/PortfoySihirbazi.tsx')
    const enlem = sihirbaz.indexOf('Enlem (kuzey–güney)')
    const boylam = sihirbaz.indexOf('Boylam (doğu–batı)')

    expect(enlem).toBeGreaterThan(-1)
    expect(enlem).toBeLessThan(boylam)
  })

  /**
   * ⚠️ `type="number"` KULLANILMIYOR. Tarayıcı sayı girdisinde yerel
   * ondalık ayırıcıyı dayatıyor; Türkçe yerelde "41.15" ile "41,15"
   * farklı davranıyor. `TurkceSayiAlani`daki dersin aynısı.
   */
  it('girdiler metin — tarayıcının sayı girdisi değil', () => {
    const bilesen = oku('src/components/panel/KonumAlaniIstemci.tsx')
    const girdiBloklari = [...bilesen.matchAll(/<input[\s\S]*?\/>/g)].map((e) => e[0])

    expect(girdiBloklari.length).toBe(2)
    for (const girdi of girdiBloklari) {
      expect(girdi).toContain('type="text"')
      expect(girdi).toContain('inputMode="decimal"')
    }
  })

  /** Üç koleksiyonun `point` alanı da aynı bileşenle çiziliyor. */
  it.each([
    ['src/collections/Ilanlar.ts', 'konum'],
    ['src/collections/Mahalleler.ts', 'merkez'],
    ['src/collections/IlgiNoktalari.ts', 'konum'],
  ])('%s → %s alanı KonumAlani kullanıyor', (yol, alan) => {
    const kaynak = oku(yol)
    const konum = kaynak.indexOf(`name: '${alan}'`)

    expect(konum).toBeGreaterThan(-1)
    expect(kaynak.slice(konum, konum + 500)).toContain('KonumAlani')
  })

  /**
   * ⚠️ TEK MOTOR. Panel ve sihirbaz aynı `konumuDenetle`yi çağırıyor;
   * iki ayrı doğrulama zamanla ayrışır ve biri yakalarken diğeri
   * kaçırırdı.
   */
  it('panel ve sihirbaz aynı doğrulama motorunu çağırıyor', () => {
    for (const yol of [
      'src/components/panel/KonumAlaniIstemci.tsx',
      'src/components/sihirbaz/PortfoySihirbazi.tsx',
    ]) {
      expect(oku(yol)).toContain('konumuDenetle')
      expect(oku(yol)).toContain('@/lib/konum/dogrula')
    }
  })

  /** Uyarı ENGELLEMİYOR — `validate` ile kaydı reddeden bir yol yok. */
  it('koordinat uyarısı kaydı engellemiyor', () => {
    const bilesen = oku('src/components/panel/KonumAlaniIstemci.tsx')
    expect(bilesen).toContain('role="status"')
    expect(bilesen).not.toContain('validate:')
  })
})
