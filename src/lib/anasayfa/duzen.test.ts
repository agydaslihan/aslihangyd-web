import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  ANASAYFA_BOLUMLERI,
  BOLUM_BOSLUKLARI,
  BOLUM_HIZALAMALARI,
  BOLUM_ZEMINLERI,
  VARSAYILAN_ANASAYFA_SIRASI,
  VARSAYILAN_GORUNUM,
  anaSayfaBolumleri,
  anaSayfaSirasi,
  gorunumuCoz,
} from './duzen'

/**
 * Ana sayfa bölüm düzeni.
 *
 * ⚠️ İKİ TARAF EŞİT OLMAK ZORUNDA: panelde seçilebilen anahtarlar ile
 * sayfada çizilen anahtarlar. Eşitlik bozulduğunda iki sessiz arıza
 * doğuyor:
 *
 *   · Listede olup çizilmeyen anahtar → panelde seçiliyor, sayfada
 *     hiçbir şey olmuyor. Kullanıcı ayarı yanlış yaptığını sanıyor.
 *   · Çizilip listede olmayan bölüm → sıralanamıyor, kapatılamıyor ve
 *     bunu kimse söylemiyor.
 */

const dizin = path.dirname(fileURLToPath(import.meta.url))
const SAYFA = readFileSync(path.resolve(dizin, '../../app/(site)/page.tsx'), 'utf8')

/** `bolumCizimleri` haritasındaki anahtarlar. */
function cizilenAnahtarlar(): string[] {
  const bas = SAYFA.indexOf('const bolumCizimleri: Record<string, ReactNode> = {')
  const son = SAYFA.indexOf('\n  }\n', bas)
  const govde = SAYFA.slice(bas, son)
  // ⚠️ Hem `anahtar: (` hem tek satıra sığan `anahtar: <>…</>` biçimi.
  // Prettier kısa bölümleri tek satıra topluyor; yalnızca ilkini aramak
  // bir bölümü sessizce kapsam dışı bırakırdı.
  return [...govde.matchAll(/^ {4}([a-z_]+): [(<]/gm)].map((e) => e[1]!)
}

describe('ana sayfa bölüm kataloğu', () => {
  it('anahtarlar benzersiz', () => {
    const anahtarlar = ANASAYFA_BOLUMLERI.map((b) => b.anahtar)
    expect(new Set(anahtarlar).size).toBe(anahtarlar.length)
  })

  it('her bölümün adı ve açıklaması dolu', () => {
    for (const bolum of ANASAYFA_BOLUMLERI) {
      expect(bolum.ad.trim().length, `${bolum.anahtar} adsız`).toBeGreaterThan(0)
      expect(bolum.aciklama.trim().length, `${bolum.anahtar} açıklamasız`).toBeGreaterThan(0)
    }
  })

  it('katalog ile sayfadaki çizim haritası birebir aynı', () => {
    const cizilen = cizilenAnahtarlar()

    expect(cizilen.length, 'sayfada çizim haritası bulunamadı').toBeGreaterThan(5)
    expect(
      [...cizilen].sort(),
      'Panelde seçilebilen anahtarlar ile sayfada çizilenler ayrışmış.\n' +
        'Katalogda olup çizilmeyen bir anahtar panelde hiçbir şey yapmaz;\n' +
        'çizilip katalogda olmayan bir bölüm sıralanamaz.',
    ).toEqual([...VARSAYILAN_ANASAYFA_SIRASI].sort())
  })

  it('vitrin sıralanabilir bölümler arasında DEĞİL', () => {
    /**
     * ⚠️ Sinematik vitrin sayfanın LCP öğesi. Sıralanabilir olsaydı aşağı
     * alınabilir, ön yüklenen hero görseli boşa iner ve mobil performans
     * hedefi ölçülebilir biçimde düşerdi.
     */
    expect(VARSAYILAN_ANASAYFA_SIRASI).not.toContain('hero')
  })
})

describe('anaSayfaSirasi', () => {
  it('kayıt yoksa varsayılan kod sırası', () => {
    expect(anaSayfaSirasi(null)).toEqual([...VARSAYILAN_ANASAYFA_SIRASI])
    expect(anaSayfaSirasi([])).toEqual([...VARSAYILAN_ANASAYFA_SIRASI])
  })

  it('kayıtlı sırayı uyguluyor', () => {
    const sonuc = anaSayfaSirasi([
      { bolum: 'cagri', acik: true },
      { bolum: 'arama', acik: true },
      ...VARSAYILAN_ANASAYFA_SIRASI.filter((a) => a !== 'cagri' && a !== 'arama').map((a) => ({
        bolum: a,
        acik: true,
      })),
    ])
    expect(sonuc[0]).toBe('cagri')
    expect(sonuc[1]).toBe('arama')
  })

  it('kapalı bölüm çizilmiyor', () => {
    const kayit = VARSAYILAN_ANASAYFA_SIRASI.map((a) => ({
      bolum: a,
      acik: a !== 'anlati',
    }))
    expect(anaSayfaSirasi(kayit)).not.toContain('anlati')
    expect(anaSayfaSirasi(kayit)).toContain('arama')
  })

  it('tanınmayan anahtar sayfayı kırmıyor', () => {
    const sonuc = anaSayfaSirasi([
      { bolum: 'artik-olmayan-bolum', acik: true },
      { bolum: 'arama', acik: true },
    ])
    expect(sonuc).not.toContain('artik-olmayan-bolum')
    expect(sonuc).toContain('arama')
  })

  it('tekrar eden anahtar bir kez çiziliyor', () => {
    const sonuc = anaSayfaSirasi([
      { bolum: 'arama', acik: true },
      { bolum: 'arama', acik: true },
    ])
    expect(sonuc.filter((a) => a === 'arama')).toHaveLength(1)
  })

  it('kayıtta hiç geçmeyen bölüm KAYBOLMUYOR', () => {
    /**
     * ⚠️ Yeni bir bölüm eklendiğinde eski kayıt onu içermez. Sona atmak
     * kolay olurdu ama yanlış: bölüm kapanış çağrı bandının bile altında
     * belirirdi. Varsayılan komşuluğuna yerleşmeli.
     */
    const kayit = VARSAYILAN_ANASAYFA_SIRASI.filter((a) => a !== 'endeks').map((a) => ({
      bolum: a,
      acik: true,
    }))
    const sonuc = anaSayfaSirasi(kayit)

    expect(sonuc).toContain('endeks')
    expect(sonuc.indexOf('endeks')).toBeGreaterThan(sonuc.indexOf('anlati'))
    expect(sonuc.indexOf('endeks')).toBeLessThan(sonuc.indexOf('cagri'))
  })

  it('bütün bölümler kapalıysa boş dizi — sayfa yine de çöküyor değil', () => {
    const kayit = VARSAYILAN_ANASAYFA_SIRASI.map((a) => ({ bolum: a, acik: false }))
    expect(anaSayfaSirasi(kayit)).toEqual([])
  })
})

describe('bölüm görünüm ayarları', () => {
  it('değer kümeleri KAPALI ve küçük', () => {
    /**
     * ⚠️ Serbest bir renk ya da piksel girişi, tasarım sisteminin dışına
     * çıkan tek bir bölüm üretmeye yeter. Küme büyüdükçe panelin yanlış
     * yapılandırılabilme ihtimali büyür.
     */
    expect(BOLUM_ZEMINLERI.length).toBeLessThanOrEqual(4)
    expect(BOLUM_BOSLUKLARI.length).toBe(3)
    expect(BOLUM_HIZALAMALARI.length).toBe(2)
  })

  it('panel seçenekleri koddaki kümelerden türetiliyor', () => {
    /**
     * ⚠️ Elle yazılmış bir seçenek listesi, yeni bir değer eklendiğinde
     * güncellenmeyi unutur ve panelde seçilemeyen bir değer doğar.
     */
    const global = readFileSync(path.resolve(dizin, '../../globals/AnaSayfaDuzeni.ts'), 'utf8')
    expect(global).toContain('BOLUM_ZEMINLERI.map(')
    expect(global).toContain('BOLUM_BOSLUKLARI.map(')
    expect(global).toContain('BOLUM_HIZALAMALARI.map(')
  })

  it('tanınmayan değer varsayılana düşüyor, çizimi kırmıyor', () => {
    expect(gorunumuCoz({ zemin: 'neon' as never })).toEqual(VARSAYILAN_GORUNUM)
    expect(gorunumuCoz(null)).toEqual(VARSAYILAN_GORUNUM)
  })

  it('varsayılan zemin "kâğıt" DEĞİL — bölümün kendi zemini korunuyor', () => {
    /**
     * ⚠️ Hepsini beyaza çevirmek, kendi bandını taşıyan bölümleri
     * (Çorlu deneyimi, çağrı bandı) tanınmaz hâle getirirdi. Varsayılan
     * davranış müdahale etmemek.
     */
    expect(VARSAYILAN_GORUNUM.zemin).toBe('varsayilan')
  })

  it('görünüm ayarları sıra ile birlikte dönüyor', () => {
    const bolumler = anaSayfaBolumleri([
      { bolum: 'arama', acik: true, zemin: 'bej', bosluk: 'genis', hizalama: 'orta' },
      ...VARSAYILAN_ANASAYFA_SIRASI.filter((a) => a !== 'arama').map((a) => ({
        bolum: a,
        acik: true,
      })),
    ])

    const arama = bolumler.find((b) => b.anahtar === 'arama')
    expect(arama).toEqual({ anahtar: 'arama', zemin: 'bej', bosluk: 'genis', hizalama: 'orta' })
    // Ayarı verilmeyen bölümler varsayılanı alıyor.
    expect(bolumler.find((b) => b.anahtar === 'cagri')).toMatchObject(VARSAYILAN_GORUNUM)
  })

  it('sarmalayıcı, ayar değişmediyse fazladan düğüm basmıyor', () => {
    /**
     * ⚠️ On dört bölümün on dördünü sarmak, DOM'a on dört boş katman
     * eklemek demek; `:has()` ve kardeş seçicileri olan bir tasarımda o
     * katmanlar sessizce kural bozar.
     */
    const bolum = readFileSync(path.resolve(dizin, '../../components/ui/Bolum.tsx'), 'utf8')
    expect(bolum).toMatch(/if \(varsayilanMi\) return <>\{children\}<\/>/)
  })
})
