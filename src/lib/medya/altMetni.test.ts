import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { bildirimleriUret, type BildirimGirdisi } from '@/lib/bildirim/motor'

/**
 * Alt metin: zorunlu değil ama boş da kalmıyor.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU BİR ERİŞİLEBİLİRLİKTEN VAZGEÇİŞ DEĞİL, BİR KADEMELENDİRME.
 *
 * Alan `required: true` idi ve gerekçesi doğruydu. Ama sonucu şuydu:
 * sahada bir dairede yirmi fotoğraf çeken kişi yirmi kez metin yazmak
 * zorunda kalıyor ve yüklemeyi bırakıyor. Yüklenmemiş bir fotoğrafın alt
 * metni de yoktur.
 *
 * Yeni kural üç parçalı ve üçü birden olmadan çalışmaz:
 *   1. Alan boş bırakılabilir.
 *   2. Boş kalan dosya adından TÜRETİLİR — asla boş kaydedilmez.
 *   3. Türetilmiş olanlar SAYILIR ve panelde uyarı olarak durur.
 *
 * Üçüncüsü olmadan bu bir erişilebilirlik borcunu görünmez kılardı.
 * ─────────────────────────────────────────────────────────────────────────
 */

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const oku = (goreli: string) => readFileSync(path.join(KOK, goreli), 'utf8')

describe('koleksiyon kuralı', () => {
  const medya = oku('collections/Medya.ts')

  it('alt metin artık zorunlu DEĞİL', () => {
    expect(medya).toMatch(/name: 'alt'[\s\S]{0,2400}?required: false/)
  })

  it('boş alt metin dosya adından TÜRETİLİYOR', () => {
    // Boş kaydetmek yerine türetmek: otomatik metin, boş metinden iyidir.
    expect(medya).toContain('data.altOtomatik = true')
    expect(medya).toContain('alt metin eklenmedi')
  })

  it('insan yazdıysa işaret KALKIYOR', () => {
    expect(medya).toContain('data.altOtomatik = false')
  })

  it('otomatik olduğu kayıtta işaretli', () => {
    expect(medya).toContain("name: 'altOtomatik'")
  })
})

describe('borç görünür kalıyor', () => {
  const temel: BildirimGirdisi = {
    yetkisiBitecekIlan: 0,
    yetkisiDolmusYayindaIlan: 0,
    bakimGorevleri: [],
    ilgisizPortfoy: 0,
    gozlemsizMahalle: 0,
    yetkiBelgesiVar: true,
    eksikAyarlar: [],
    eskiAdliAyarlar: [],
    siteAdresindePortVar: false,
    semaDurumu: { eksikTablolar: [], beklenenSayi: 63, hata: null },
    alanSagligi: {
      saglik: 'saglikli',
      ozet: 'Alan adı sağlıklı.',
      eylem: 'Bir işlem gerekmiyor.',
      sorguZamani: new Date().toISOString(),
    },
    onayBekleyenIlan: 0,
    altMetniEksikGorsel: 0,
  }

  it('eksik yoksa bildirim yok', () => {
    const bildirimler = bildirimleriUret(temel)
    expect(bildirimler.find((b) => b.anahtar === 'alt-metni-eksik')).toBeUndefined()
  })

  it('eksik varsa sayısıyla birlikte bildirim çıkıyor', () => {
    const bildirimler = bildirimleriUret({ ...temel, altMetniEksikGorsel: 12 })
    const bildirim = bildirimler.find((b) => b.anahtar === 'alt-metni-eksik')
    expect(bildirim?.baslik).toContain('12 görselde')
    expect(bildirim?.adres).toContain('altOtomatik')
  })

  it('öncelik “bilgi” — yasal değil ama görünür', () => {
    /**
     * ⚠️ Yasal bir sonucu yok ve acil değil; ama şeritte durması şart.
     * Kimsenin bakmadığı bir borç olarak birikirse erişilebilirlik
     * sessizce düşer.
     */
    const bildirimler = bildirimleriUret({ ...temel, altMetniEksikGorsel: 3 })
    expect(bildirimler.find((b) => b.anahtar === 'alt-metni-eksik')?.oncelik).toBe('bilgi')
  })
})

describe('sihirbazda toplu yükleme', () => {
  const bilesen = oku('components/sihirbaz/PortfoySihirbazi.tsx')

  it('sürükle-bırak alanı VAR ama dosya seçici de duruyor', () => {
    /**
     * ⚠️ Sürükleme dokunmatikte ve klavyeyle yok; tek yol yapmak masaüstü
     * dışındaki herkesi dışarıda bırakırdı.
     */
    expect(bilesen).toContain('onDrop=')
    expect(bilesen).toContain('type="file"')
    expect(bilesen).toContain('multiple')
  })

  it('ilerleme göstergesi dosya bazında', () => {
    expect(bilesen).toContain('fotoğraf yüklendi')
    expect(bilesen).toContain('aria-live="polite"')
  })

  it('toplu silme var', () => {
    expect(bilesen).toContain('Seçilenleri kaldır')
  })

  it('boyut bütçesi uyarısı ENGEL DEĞİL', () => {
    /**
     * ⚠️ KISA PARÇA ARANIYOR. İlk hâl "sayfayı ağırlaştırıyor" cümlesini
     * arıyordu ve Prettier o cümleyi iki satıra böldüğü an test kırıldı —
     * metinde hiçbir şey değişmemişken. Satır sonuna dayanmayan bir
     * denetim, biçimlendiriciye bağımlı bir denetimdir.
     */
    expect(bilesen).toContain('GORSEL_UYARI_ESIGI')
    expect(bilesen).toContain('ağırlaştırıyor')
    // Uyarı bir engel değil: koşul yalnızca metni gösteriyor, düğmeyi
    // pasifleştirmiyor.
    expect(bilesen).toMatch(/gorseller\.length > GORSEL_UYARI_ESIGI \? \(/)
  })

  it('alt metin BOŞ gönderiliyor — türetme tek yerde', () => {
    /**
     * ⚠️ Sihirbaz kendi metnini üretseydi, panelden yüklenen görsellerle
     * sihirbazdan yüklenenler farklı kurallara tabi olurdu. Türetme
     * koleksiyonun kancasında: tek yer, tek kural.
     */
    expect(bilesen).toContain("form.set('alt', '')")
    expect(bilesen).not.toContain('taslakAlt')
  })

  it('kapak hâlâ sıranın başı', () => {
    expect(bilesen).toContain('ilk sıradaki kapak')
  })
})
