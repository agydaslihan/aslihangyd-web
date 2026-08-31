import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { OLCEK_KURALLARI, kayitOlcekSupheleri, olcekSuphesi, ondalikIziVarMi } from './olcek'

/**
 * Ölçek hatası tespiti.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ÜRETİMDE ÖLÇÜLEN GERÇEK DEĞERLER — 31 Ağustos 2026.
 *
 *     mahalleler #1 Alipaşa  ortalamaM2Satis  39,704
 *                            ortalamaKira     21,302
 *                            nufus            10,918
 *     ilanlar    #2          aidat             2,55
 *
 * Kök neden panelin sayı alanı: tarayıcı noktayı ondalık ayırıcı sayıyor
 * ve "39.704" otuz dokuz tam yedi yüz dört binde oluyor.
 *
 * ⚠️ ASIL RİSK YANLIŞ POZİTİF. Bu tespit doğru rakamları şüpheli
 * gösterirse uyarı değersizleşir ve kapatılır; kapatılan uyarı yoktur.
 * Aşağıdaki ikinci blok tam olarak bunu kilitliyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

describe('ondalık izi', () => {
  it('üç haneli kesir bir binlik grubudur', () => {
    expect(ondalikIziVarMi(39.704)).toBe(true)
    expect(ondalikIziVarMi(21.302)).toBe(true)
    expect(ondalikIziVarMi(10.918)).toBe(true)
  })

  it('kayan nokta hatası tespiti bozmuyor', () => {
    /**
     * ⚠️ `2.55 * 1000` kayan noktada 2549,9999… çıkabiliyor. Doğrudan
     * `Number.isInteger` kullanmak bu değeri kaçırırdı — ve o değer
     * üretimdeki gerçek hatalardan biri.
     */
    expect(ondalikIziVarMi(2.55)).toBe(true)
  })

  it('tam sayıda iz yok', () => {
    expect(ondalikIziVarMi(39_704)).toBe(false)
    expect(ondalikIziVarMi(12)).toBe(false)
  })
})

describe('gerçek hatalar yakalanıyor', () => {
  it('Alipaşa’nın üç rakamı da şüpheli', () => {
    const supheler = kayitOlcekSupheleri({
      ortalamaM2Satis: 39.704,
      ortalamaKira: 21.302,
      nufus: 10.918,
    })
    expect(supheler.map((s) => s.alan)).toEqual(['ortalamaM2Satis', 'ortalamaKira', 'nufus'])
    expect(supheler.map((s) => s.onerilen)).toEqual([39_704, 21_302, 10_918])
  })

  it('ilan aidatı şüpheli ve önerisi doğru', () => {
    const suphe = olcekSuphesi('aidat', 2.55)
    expect(suphe).not.toBeNull()
    expect(suphe?.onerilen).toBe(2_550)
  })

  it('mesaj kök nedeni söylüyor', () => {
    // "Rakam küçük" demek kullanıcıya ne yapacağını söylemiyor.
    expect(olcekSuphesi('ortalamaM2Satis', 39.704)?.mesaj).toMatch(/ondalık/i)
  })
})

describe('⚠️ doğru rakamlar ŞÜPHELİ GÖSTERİLMİYOR', () => {
  /**
   * ⚠️ Bu blok, aracın işe yaramaz hâle gelmesini engelliyor. Aşağıdaki
   * değerlerin hepsi üretimde GERÇEK ve DOĞRU.
   */
  it('kira çarpanı 12 yıl — taranan alan değil', () => {
    // `kiraCarpani` kural listesinde hiç yok.
    expect(OLCEK_KURALLARI.map((k) => k.alan)).not.toContain('kiraCarpani')
  })

  it('12 aylık değişim %23 — taranan alan değil', () => {
    expect(OLCEK_KURALLARI.map((k) => k.alan)).not.toContain('degisim12Ay')
  })

  it('gözlem sayısı 3 — taranan alan değil', () => {
    expect(OLCEK_KURALLARI.map((k) => k.alan)).not.toContain('gozlemSayisi')
  })

  it('brüt m² 145 — taranan alan değil', () => {
    expect(OLCEK_KURALLARI.map((k) => k.alan)).not.toContain('brutM2')
  })

  it('doğru fiyat ve kira şüpheli değil', () => {
    expect(olcekSuphesi('fiyat', 5_650_000)).toBeNull()
    expect(olcekSuphesi('tahminiKira', 30_000)).toBeNull()
    expect(olcekSuphesi('aidat', 1_000)).toBeNull()
    expect(olcekSuphesi('nufus', 10_918)).toBeNull()
  })

  it('sıfır bir ölçek hatası değil', () => {
    // Sıfır, "yok" demenin bir yolu olabilir.
    expect(olcekSuphesi('aidat', 0)).toBeNull()
  })

  it('eşik değeri şüpheli DEĞİL — sınır dışı demek eşitlik değil', () => {
    expect(olcekSuphesi('ortalamaM2Satis', 1_000)).toBeNull()
    expect(olcekSuphesi('nufus', 100)).toBeNull()
  })
})

describe('araç engellemiyor', () => {
  const oku = (goreli: string) => readFileSync(path.join(KOK, goreli), 'utf8')

  it('uyarı `validate` DEĞİL — kaydı reddetmiyor', () => {
    /**
     * ⚠️ Reddedilen doğru bir kayıt, kabul edilen yanlış bir kayıttan
     * daha çok zarar verir: kullanıcı bir daha denemez.
     */
    const bilesen = oku('components/panel/OlcekUyarisi.tsx')
    expect(bilesen).toContain('role="status"')
    expect(oku('collections/Mahalleler.ts')).not.toMatch(/validate:.*olcek/i)
  })

  it('uyarı rakamlardan ÖNCE duruyor', () => {
    // Altta dursaydı kaydet düğmesine giden kişi onu hiç görmezdi.
    const koleksiyon = oku('collections/Mahalleler.ts')
    expect(koleksiyon.indexOf("name: 'olcekUyarisi'")).toBeLessThan(
      koleksiyon.indexOf("name: 'ortalamaM2Satis'"),
    )
  })

  it('alan etiketleri birim taşıyor', () => {
    const mahalleler = oku('collections/Mahalleler.ts')
    expect(mahalleler).toContain("label: 'Ortalama m² satış (₺/m²)'")
    expect(mahalleler).toContain("label: 'Ortalama aylık kira (₺/ay)'")
    expect(mahalleler).toContain("label: 'Nüfus (kişi)'")

    const ilanlar = oku('collections/Ilanlar.ts')
    expect(ilanlar).toContain("label: 'Aylık aidat (₺/ay)'")
  })
})

describe('toplu düzeltme güvenlikleri', () => {
  const cekirdek = readFileSync(path.join(KOK, 'lib/veri/olcekTarama.ts'), 'utf8')

  it('yeni değer SUNUCUDA hesaplanıyor', () => {
    /**
     * ⚠️ İstemci yalnızca HANGİ alanların düzeltileceğini söylüyor.
     * Yeni değeri de gönderseydi, form üzerinden istenen her sayı
     * yazdırılabilirdi.
     */
    expect(cekirdek).toContain('const tarama = await olcegiTara(payload, user)')
    expect(cekirdek).toContain('veri[secim.alan] = suphe.onerilen')
  })

  it('geri alma BÖLMÜYOR, eski değeri yazıyor', () => {
    /**
     * ⚠️ Aradan geçen sürede elle düzeltilmiş bir kaydı 1000'e bölmek
     * onu da bozardı.
     */
    expect(cekirdek).toContain('veri[satir.alan] = satir.eskiDeger')
    expect(cekirdek).not.toMatch(/\/ 1000/)
  })

  it('kancalar ve erişim kuralları atlanmıyor', () => {
    expect(cekirdek).toContain('overrideAccess: false')
    expect(cekirdek).not.toContain('overrideAccess: true')
  })

  it('arada değişen kayıt atlanıyor', () => {
    expect(cekirdek).toContain('atlanan')
  })
})
