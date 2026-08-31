import { describe, expect, it } from 'vitest'

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  ADIMLAR,
  VARSAYILAN_KATEGORI,
  VARSAYILAN_TIP,
  adimHatalari,
  fiyatSemasi,
  kategoriSemasi,
  nitelikSemasi,
  sihirbazSemasi,
  tapuSemasi,
  temelSemasi,
} from './sema'

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

/**
 * ⚠️ Buradaki değerler UYDURMADIR; şema mantığını sınamak içindir.
 */
function tamGirdi(degisiklik: Record<string, unknown> = {}) {
  return {
    baslik: 'Muhittin Mahallesinde 3+1 bahçe katı',
    tip: 'satilik',
    kategori: 'konut',
    ozet: '',
    il: 'Tekirdağ',
    ilce: 'Çorlu',
    mahalle: '12',
    adres: '',
    ada: '',
    parsel: '',
    fiyat: '',
    paraBirimi: 'TRY',
    tahminiKira: '',
    aidat: '',
    brutM2: '',
    netM2: '',
    bulunduguKat: '',
    toplamKat: '',
    binaYasi: '',
    eidsDurum: '',
    tasinmazNo: '',
    eidsYetkiBaslangic: '',
    eidsYetkiBitis: '',
    gizliPortfoy: false,
    ...degisiklik,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
describe('temelSemasi', () => {
  /**
   * ─────────────────────────────────────────────────────────────────────
   * ⚠️ BAŞLIK ARTIK ZORUNLU DEĞİL — VE BU BİLİNÇLİ BİR KARAR.
   *
   * Sihirbaz sahada, telefondan, taşınmazın içinde kullanılıyor. Girişe
   * fotoğraftan ya da oda sayısından başlayan biri başlığı en sona
   * bırakıyor. Zorunlu tutmak, o anda girilebilecek bilgiyi de girilemez
   * yapardı: yarım bırakılamayan bir form, hiç başlanmayan bir formdur.
   *
   * Payload'da `baslik` zorunlu; eylem boş başlık için tarihli bir taslak
   * adı üretiyor ve bunu kullanıcıya söylüyor.
   * ─────────────────────────────────────────────────────────────────────
   */
  it('kısa başlığı KABUL eder — tüm alanlar isteğe bağlı', () => {
    expect(temelSemasi.safeParse({ baslik: 'Ev' }).success).toBe(true)
    expect(temelSemasi.safeParse({}).success).toBe(true)
  })

  it('çok uzun başlığı reddeder', () => {
    expect(temelSemasi.safeParse({ baslik: 'x'.repeat(161) }).success).toBe(false)
  })

  it('geçersiz tip değerini KATEGORİ şeması reddeder', () => {
    // `tip` ve `kategori` artık ayrı bir adımda (bkz. `kategoriSemasi`).
    expect(kategoriSemasi.safeParse({ tip: 'devren' }).success).toBe(false)
    expect(kategoriSemasi.safeParse({ tip: 'satilik' }).success).toBe(true)
  })
})

describe('varsayılanlar koleksiyonla aynı', () => {
  /**
   * ⚠️ `tip` ve `kategori` koleksiyonda `required` ve `defaultValue`
   * taşıyor. Sihirbaz aynı değerleri ekranda seçili gösteriyor ve
   * göndermiyorsa aynı değerleri yazıyor. İkisi ayrışırsa, kullanıcının
   * ekranda gördüğüyle kaydedilen farklı olurdu.
   */
  const koleksiyon = readFileSync(path.join(KOK, 'collections/Ilanlar.ts'), 'utf8')

  it('ilan tipi varsayılanı koleksiyondakiyle aynı', () => {
    expect(koleksiyon).toContain(`defaultValue: '${VARSAYILAN_TIP}'`)
  })

  it('kategori varsayılanı koleksiyondakiyle aynı', () => {
    expect(koleksiyon).toContain(`defaultValue: '${VARSAYILAN_KATEGORI}'`)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('tapuSemasi', () => {
  /**
   * Ada, parsel ve EİDS alanları yayın için gerekli ama TASLAK için değil.
   * Zorunlu kılmak, "yetkiyi henüz almadım, önce taşınmazı gireyim" gibi
   * tamamen meşru bir akışı imkânsız kılardı.
   */
  it('tapu ve EİDS alanları taslak için zorunlu değildir', () => {
    expect(tapuSemasi.safeParse({}).success).toBe(true)
  })

  it('geçersiz tarih biçimini reddeder', () => {
    expect(tapuSemasi.safeParse({ eidsYetkiBitis: '31.12.2099' }).success).toBe(false)
    expect(tapuSemasi.safeParse({ eidsYetkiBitis: '2099-12-31' }).success).toBe(true)
  })

  it('tanınmayan yetki durumunu reddeder', () => {
    expect(tapuSemasi.safeParse({ eidsDurum: 'belki' }).success).toBe(false)
  })

  /**
   * ⚠️ GPS'ten gelen koordinat sayı olmak zorunda. Metin kabul edilseydi
   * haritaya çizilemeyen bir "konum" kaydedilirdi.
   */
  it('koordinat sayı olmalı', () => {
    expect(tapuSemasi.safeParse({ boylam: 'kuzey' }).success).toBe(false)
    expect(tapuSemasi.safeParse({ boylam: '27.81', enlem: '41.15' }).success).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('fiyatSemasi — girilmedi ile sıfır ayrımı', () => {
  /**
   * Bu ayrım motorların temel varsayımı. Boş alan sıfıra düşerse yatırım
   * göstergeleri sessizce yanlış hesaplanır (CLAUDE.md kural 2).
   */
  it('boş sayı alanı undefined olur, sıfır DEĞİL', () => {
    const fiyat = fiyatSemasi.safeParse({ fiyat: '' })
    const nitelik = nitelikSemasi.safeParse({ brutM2: '' })
    expect(fiyat.success).toBe(true)
    expect(nitelik.success).toBe(true)
    if (!fiyat.success || !nitelik.success) return

    expect(fiyat.data.fiyat).toBeUndefined()
    expect(nitelik.data.brutM2).toBeUndefined()
  })

  it('açıkça girilen sıfır korunur', () => {
    const sonuc = fiyatSemasi.safeParse({ aidat: '0' })
    expect(sonuc.success).toBe(true)
    if (!sonuc.success) return
    expect(sonuc.data.aidat).toBe(0)
  })

  it('sayı olmayan değeri reddeder', () => {
    expect(fiyatSemasi.safeParse({ fiyat: 'beş milyon' }).success).toBe(false)
  })

  it('negatif değeri reddeder', () => {
    expect(fiyatSemasi.safeParse({ fiyat: '-100' }).success).toBe(false)
  })

  it('para birimi girilmezse TRY varsayılır', () => {
    const sonuc = fiyatSemasi.safeParse({})
    expect(sonuc.success).toBe(true)
    if (!sonuc.success) return
    expect(sonuc.data.paraBirimi).toBe('TRY')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('sihirbazSemasi', () => {
  it('eksiksiz girdiyi kabul eder', () => {
    const sonuc = sihirbazSemasi.safeParse(tamGirdi({ eidsDurum: undefined }))
    expect(sonuc.success).toBe(true)
  })

  it('gizli portföy onay kutusunun "on" değerini boolean yapar', () => {
    const sonuc = sihirbazSemasi.safeParse(tamGirdi({ eidsDurum: undefined, gizliPortfoy: 'on' }))
    expect(sonuc.success).toBe(true)
    if (!sonuc.success) return
    expect(sonuc.data.gizliPortfoy).toBe(true)
  })

  it('gizli portföy gönderilmezse false olur', () => {
    const sonuc = sihirbazSemasi.safeParse(
      tamGirdi({ eidsDurum: undefined, gizliPortfoy: undefined }),
    )
    expect(sonuc.success).toBe(true)
    if (!sonuc.success) return
    expect(sonuc.data.gizliPortfoy).toBe(false)
  })

  /**
   * Şemada `durum` alanı YOK. Bu bir eksiklik değil, güvenlik kararı:
   * eylem `durum`u sabit `taslak` yazar ve istemciden gelen hiçbir değer
   * o alana ulaşamaz.
   */
  it('durum alanı şemada yoktur — istemci yayın durumu dayatamaz', () => {
    const sonuc = sihirbazSemasi.safeParse(tamGirdi({ eidsDurum: undefined, durum: 'yayinda' }))
    expect(sonuc.success).toBe(true)
    if (!sonuc.success) return
    expect('durum' in sonuc.data).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('adimHatalari', () => {
  it('hata yoksa boş nesne döner', () => {
    expect(adimHatalari(temelSemasi, { baslik: 'Bir ilan başlığı' })).toEqual({})
  })

  it('alan başına tek mesaj döndürür', () => {
    const hatalar = adimHatalari(temelSemasi, { baslik: 'x'.repeat(200) })

    expect(Object.keys(hatalar)).toEqual(['baslik'])
    expect(typeof hatalar.baslik).toBe('string')
  })

  it('mesajlar Türkçedir — Zod varsayılanı sızmaz', () => {
    const hatalar = adimHatalari(tapuSemasi, { eidsYetkiBitis: '31.12.2099', boylam: 'kuzey' })

    expect(Object.keys(hatalar).length).toBeGreaterThan(0)
    for (const mesaj of Object.values(hatalar)) {
      expect(mesaj).not.toMatch(/Invalid|expected|required/i)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('adımlar', () => {
  it('on adım ve hepsinin şeması var', () => {
    /**
     * ⚠️ Şartname dokuz adım sayıyor; koddaki onuncu "Ön izleme" ile
     * "Yayın"ın ayrı ekranlar olması. Şartnamenin 8. ve 9. maddeleri
     * bunlar; ayrı tutuldular çünkü biri gösteriyor, diğeri karar
     * aldırıyor.
     */
    expect(ADIMLAR).toHaveLength(10)
    for (const adim of ADIMLAR) expect(adim.sema).toBeDefined()
  })

  it('adım anahtarları benzersiz', () => {
    const anahtarlar = ADIMLAR.map((a) => a.anahtar)
    expect(new Set(anahtarlar).size).toBe(anahtarlar.length)
  })

  /**
   * ⚠️ Yüzde göstergesinin paydası bu liste. Şemada olmayan bir alan adı
   * yazılırsa yüzde asla %100 olmaz ve kullanıcı hiç bitmeyen bir adım
   * görür.
   */
  it('doluluk alanları gerçekten şemada var', () => {
    const tumAlanlar = new Set([
      ...Object.keys(kategoriSemasi.shape),
      ...Object.keys(temelSemasi.shape),
      ...Object.keys(tapuSemasi.shape),
      ...Object.keys(nitelikSemasi.shape),
      ...Object.keys(fiyatSemasi.shape),
    ])
    const bilinmeyen: string[] = []
    for (const adim of ADIMLAR) {
      if (adim.anahtar === 'gorseller' || adim.anahtar === 'aciklama') continue
      if (adim.anahtar === 'medya' || adim.anahtar === 'yayin') continue
      if (adim.anahtar === 'onizleme') continue
      for (const alan of adim.alanlar) if (!tumAlanlar.has(alan)) bilinmeyen.push(alan)
    }
    expect(bilinmeyen).toEqual([])
  })
})
