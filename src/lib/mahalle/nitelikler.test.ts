import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  KIMLER_ICIN,
  NITELIK_ALANLARI,
  SOKAK_DOKULARI,
  eksikNitelikler,
  nitelikBloklari,
  nitelikDolulugu,
} from './nitelikler'

/**
 * Mahallenin niteliksel profili.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ EN ÖNEMLİ İDDİA: DOLDURULMADAN HİÇBİR ŞEY ÇİZİLMİYOR.
 *
 * Bu bölüm araştırmayla doldurulamaz. Yarım bir profil yayınlamak,
 * mahalleyi eksik anlatmaktan kötü: okuyucu "Neye dikkat etmeli: —"
 * satırını görür ve mahallede hiçbir sorun olmadığını sanır.
 * ─────────────────────────────────────────────────────────────────────────
 */

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

describe('boş profil hiçbir şey üretmiyor', () => {
  it('tamamen boş kayıt sıfır blok', () => {
    expect(nitelikBloklari({})).toEqual([])
  })

  it('boş dizeler ve boş diziler blok üretmiyor', () => {
    expect(
      nitelikBloklari({
        kimlerIcin: [],
        kimlerIcinNotu: '   ',
        sokakDokusu: '',
        sonUcYil: '',
        dikkatEdilmeli: '\n\n',
      }),
    ).toEqual([])
  })

  it('tanınmayan sokak dokusu blok üretmiyor', () => {
    // Veritabanına elle yazılmış geçersiz bir değer ekranda görünmemeli.
    expect(nitelikBloklari({ sokakDokusu: 'belki' })).toEqual([])
  })
})

describe('dolu alanlar blok üretiyor', () => {
  it('kimler için — etiket ve açıklama birlikte', () => {
    const bloklar = nitelikBloklari({
      kimlerIcin: ['aile', 'ogrenci'],
      kimlerIcinNotu: 'İki ilkokul ve pazar yeri yürüme mesafesinde.',
    })
    expect(bloklar[0]?.baslik).toBe('Kimler için uygun?')
    expect(bloklar[0]?.etiketler).toEqual(['Aileler', 'Öğrenciler'])
    expect(bloklar[0]?.paragraflar?.[0]).toContain('pazar yeri')
  })

  it('tanınmayan seçim etiketi sessizce düşüyor', () => {
    const bloklar = nitelikBloklari({ kimlerIcin: ['aile', 'uzayli'] })
    expect(bloklar[0]?.etiketler).toEqual(['Aileler'])
  })

  it('serbest metin paragraflara bölünüyor', () => {
    const bloklar = nitelikBloklari({ sonUcYil: 'Birinci paragraf.\n\nİkinci paragraf.' })
    expect(bloklar[0]?.paragraflar).toHaveLength(2)
  })

  it('yalnızca dolu olan bloklar sırayla geliyor', () => {
    const bloklar = nitelikBloklari({
      sokakDokusu: 'sessiz',
      dikkatEdilmeli: 'Yaz aylarında pazar günleri trafik yoğun.',
    })
    expect(bloklar.map((b) => b.baslik)).toEqual(['Sokak dokusu', 'Neye dikkat etmeli?'])
  })
})

describe('tamamlanma yüzdesi', () => {
  it('boş profil %0', () => {
    expect(nitelikDolulugu({}).yuzde).toBe(0)
  })

  it('tüm alanlar dolu %100', () => {
    const tam = {
      kimlerIcin: ['aile'],
      sokakDokusu: 'sessiz',
      sonUcYil: 'x',
      dikkatEdilmeli: 'y',
      oneCikanOzellikler: [{ metin: 'z' }],
    }
    expect(nitelikDolulugu(tam).yuzde).toBe(100)
    expect(eksikNitelikler(tam)).toEqual([])
  })

  it('eksikler ADIYLA listeleniyor', () => {
    /**
     * ⚠️ "%40 tamam" tek başına ne yapılacağını söylemiyor. Yirmi altı
     * mahalleyi dolduran kişinin hangisine devam edeceğini bilmesi için
     * eksiğin adı gerekiyor.
     */
    const eksik = eksikNitelikler({ kimlerIcin: ['aile'] })
    expect(eksik).toContain('Sokak dokusu')
    expect(eksik).toContain('Neye dikkat etmeli')
  })

  it('uzun analiz metni yüzdeye GİRMİYOR', () => {
    /**
     * ⚠️ Tek paragraf yazan kişiye "%60 tamam" demek, yüzdeyi işe yaramaz
     * kılardı. Yüzde yapılandırılmış alanları ölçüyor.
     */
    expect(NITELIK_ALANLARI.map((a) => a.anahtar)).not.toContain('icerik')
  })
})

describe('seçenek listeleri', () => {
  it('talimatın istediği beş kitle var', () => {
    expect(KIMLER_ICIN.map((k) => k.value)).toEqual([
      'aile',
      'ogrenci',
      'yatirimci',
      'isci',
      'emekli',
    ])
  })

  it('sokak dokusu üç kademe', () => {
    expect(SOKAK_DOKULARI.map((d) => d.value)).toEqual(['sessiz', 'orta', 'islek'])
  })
})

describe('boş durum korunuyor', () => {
  const sayfa = readFileSync(path.join(KOK, 'app/(site)/mahalleler/[slug]/page.tsx'), 'utf8')

  it('mevcut boş durum metni DEĞİŞMEDİ', () => {
    /**
     * ⚠️ Talimat açıkça "koru" dedi: "gerçekten işinize yarayacak olanı
     * yazmayı tercih ediyoruz" cümlesi doğru şeyi söylüyor.
     */
    expect(sayfa).toContain('gerçekten işinize yarayacak olanı yazmayı tercih ediyoruz')
  })

  it('profil bölümü koşulsuz çizilmiyor', () => {
    // Bileşen boş listede `null` dönüyor; sayfa da onu koşulsuz basıyor.
    expect(readFileSync(path.join(KOK, 'components/mahalle/NitelikProfili.tsx'), 'utf8')).toContain(
      'if (bloklar.length === 0) return null',
    )
  })
})

describe('panelde ne yazıyor', () => {
  const koleksiyon = readFileSync(path.join(KOK, 'collections/Mahalleler.ts'), 'utf8')

  it('“neye dikkat etmeli” alanı zayıf tarafı istediğini söylüyor', () => {
    /**
     * ⚠️ Boş bırakılan bir "dikkat" alanı, mahallede hiçbir sorun olmadığı
     * izlenimi verir — ve o izlenim ilk ziyarette bozulur.
     */
    expect(koleksiyon).toContain('mahallenin ZAYIF tarafını')
  })

  it('emin olunmayan seçimin işaretlenmemesi yazılı', () => {
    expect(koleksiyon).toContain('Emin olmadığınızı işaretlemeyin')
  })

  it('tamamlanma göstergesi alanlardan ÖNCE', () => {
    expect(koleksiyon.indexOf("name: 'nitelikDurumu'")).toBeLessThan(
      koleksiyon.indexOf("name: 'kimlerIcin'"),
    )
  })
})
