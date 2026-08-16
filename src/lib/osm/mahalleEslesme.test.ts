import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { eslesmeyiOzetle, type EslesmeSonucu } from './mahalleEslesme'

const KOK = path.resolve(path.join(import.meta.dirname, '..', '..'))

function sonuc(kismi: Partial<EslesmeSonucu>): EslesmeSonucu {
  return { sira: 0, mahalleId: 1, mahalleAdi: 'Muhittin', yaklasik: false, metre: null, ...kismi }
}

describe('eslesmeyiOzetle', () => {
  /**
   * ⚠️ "KESİN" İLE "YAKLAŞIK" AYNI KUTUYA KONAMAZ.
   *
   * OSM'de sınır kapsaması eksiksiz değil; ilçe sınırına yakın noktalar
   * hiçbir poligona düşmeyebiliyor. Onları en yakın merkeze atamak makul
   * bir tahmin — ama TAHMİN olduğu görünmeli. Karıştırılsaydı mahalle
   * sayfası komşu mahallenin okulunu kendi okulu gibi gösterir ve bunu
   * kimse fark edemezdi.
   */
  it('kesin, yaklaşık ve eşleşmeyeni ayrı sayıyor', () => {
    const ozet = eslesmeyiOzetle([
      sonuc({}),
      sonuc({ yaklasik: true, metre: 1200 }),
      sonuc({ yaklasik: true, metre: 3400 }),
      sonuc({ mahalleId: null, mahalleAdi: null, yaklasik: false }),
    ])

    expect(ozet).toEqual({ kesin: 1, yaklasik: 2, eslesmeyen: 1 })
  })

  it('boş girdide sıfırlar', () => {
    expect(eslesmeyiOzetle([])).toEqual({ kesin: 0, yaklasik: 0, eslesmeyen: 0 })
  })

  /**
   * ⚠️ Mahalle bulunamadıysa "yaklaşık" da denmiyor. Yaklaşık bir şey yok,
   * hiçbir şey yok. Boş bırakmak, yanlış bilgiden iyidir.
   */
  it('mahallesiz kayıt yaklaşık sayılmıyor', () => {
    const ozet = eslesmeyiOzetle([sonuc({ mahalleId: null, yaklasik: true })])
    expect(ozet.yaklasik).toBe(0)
    expect(ozet.eslesmeyen).toBe(1)
  })
})

/**
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ SORGU SÖZLEŞMESİ — dizeye bakan testler.
 *
 * Korunacak şey bir davranış değil bir KARAR: sorgunun nokta başına değil
 * toplu çalışması, geçersiz geometride düşmemesi ve enjeksiyona kapalı
 * kalması. Bunlar gerçek veritabanı olmadan sınanamaz ama gerilemeleri
 * sessizdir — o yüzden kaynak düzeyinde kilitleniyor.
 * ─────────────────────────────────────────────────────────────────────────
 */
describe('eşleştirme sorgusu sözleşmesi', () => {
  const kaynak = readFileSync(path.join(KOK, 'lib/osm/mahalleEslesme.ts'), 'utf8')

  it('nokta-poligon testi ST_Contains ile yapılıyor', () => {
    expect(kaynak).toContain('ST_Contains')
  })

  /**
   * ⚠️ `ST_MakeValid` şart: OSM poligonları kendi kendini kesebiliyor ve
   * geçersiz geometride `ST_Contains` hata fırlatıp BÜTÜN içe aktarmayı
   * düşürürdü. Bozuk bir sınır yüzünden yüzlerce POI'nin kaybolması, o
   * sınırı onarmaktan çok daha pahalı.
   */
  it('geçersiz geometri içe aktarmayı düşürmüyor', () => {
    expect(kaynak).toContain('ST_MakeValid')
  })

  /**
   * ⚠️ Nokta başına sorgu atılmamalı. Yüzlerce POI'de nokta başına gidip
   * gelmek veritabanına yüzlerce tur demek.
   */
  it('toplu çalışıyor — tek VALUES listesi', () => {
    expect(kaynak).toContain('VALUES ${noktaDegerleri}')
    expect(kaynak).toContain('sql.join')
  })

  /**
   * ⚠️ Ham dize birleştirme YOK. Koordinatlar dış kaynaktan (OSM) geliyor;
   * sorguya dize olarak eklenselerdi enjeksiyon yüzeyi açılırdı.
   * CLAUDE.md: "PostGIS sorguları raw SQL ile, parametreli".
   */
  it('koordinatlar parametre olarak geçiyor', () => {
    expect(kaynak).toContain('${g.boylam}::float8')
    expect(kaynak).toContain('${g.enlem}::float8')
  })

  it('en yakın merkez araması indeks dostu operatörle', () => {
    // `<->` mesafe operatörü GiST indeksini kullanabiliyor.
    expect(kaynak).toContain('<->')
  })
})

describe('geriye dönük eşleştirme sözleşmesi', () => {
  const kaynak = readFileSync(path.join(KOK, 'lib/osm/geriyeDonukEslesme.ts'), 'utf8')

  /**
   * ⚠️ ELLE DÜZELTİLMİŞ KAYIT ATLANMALI.
   *
   * `elleDuzenlendi` işaretli bir kayıt panelden düzenlenmiş demektir ve
   * mahalle ilişkisi de elle verilmiş olabilir. Burada delinirse koruma
   * "bazen geçerli" olur — ki bu korumasızlıktır.
   */
  it('elle düzeltilmiş kayıtlar atlanıyor', () => {
    expect(kaynak).toContain('elleDuzenlendi === true')
  })

  /**
   * ⚠️ `osmIceAktarma` bayrağı olmadan `osmElleDuzenlemeIzi` kancası bizi
   * insan sanar ve HER kaydı "elle düzeltildi" işaretlerdi — bir sonraki
   * içe aktarma hiçbir şeyi güncelleyemezdi.
   */
  it('kancaya içe aktarıcı olduğunu söylüyor', () => {
    expect(kaynak).toContain('osmIceAktarma: true')
  })

  it('değişmeyen kayda yazma yapmıyor', () => {
    expect(kaynak).toContain('degismeyen')
  })

  /** Bellek koruması: tüm POI'leri tek seferde belleğe almıyor. */
  it('yığın yığın işliyor', () => {
    expect(kaynak).toContain('const YIGIN')
    expect(kaynak).toContain('hasNextPage')
  })
})
