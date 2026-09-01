import { readFileSync } from 'node:fs'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { bildirimleriUret, ONCELIK_SIRASI, type BildirimGirdisi } from '@/lib/bildirim/motor'

import { semaDurumu, semaDurumunuAyarla, semayiGunlukleYaz } from './denetim'

const KOK = path.resolve(path.join(import.meta.dirname, '..', '..', '..'))
const oku = (yol: string) => readFileSync(path.join(KOK, yol), 'utf8')

/**
 * Yorumları çıkarır.
 *
 * ⚠️ Gerekli ve bu projede DÖRDÜNCÜ kez: "şu dizge kaynakta olmasın"
 * biçimindeki denetimler, kararın GEREKÇESİNİ anlatan yorumla eşleşip
 * kırmızı veriyor. Doğru cevap gerekçeyi silmek değil, denetimi koda
 * bakacak hâle getirmek.
 */
const kodu = (yol: string) =>
  oku(yol)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '')

/**
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ PROJEDEKİ DÖRDÜNCÜ SESSİZ ARIZANIN KALICI DENETİMİ.
 *
 * 18–20 Ağustos 2026: sayfa içerikleri sürümü dağıtıldı, göç adımı
 * atlandı. `sayfa_icerikleri`, `altbilgi_ayarlari` ve `danisman_ol`ın yeni
 * sütunları veritabanında yoktu.
 *
 * Site HİÇ BOZULMADI: bütün sayfalar 200, sağlık ucu "saglikli", 24 saatte
 * tek hata satırı yok. İçerik okuyucularındaki `try/catch` blokları eksik
 * tabloyu yakalayıp koddaki varsayılan metne düşüyordu — geri düşüş
 * DOĞRUYDU ama gürültülü bir arızayı sessiz bir özellik kaybına çevirdi.
 *
 * Önceki üçü: kullanıcı rolü okunamıyordu, OSM "elle düzenlendi" koruması
 * çalışmıyordu, Turnstile site anahtarı boştu. Dördünün ortak yanı: hata
 * YOK, davranış yanlış.
 * ─────────────────────────────────────────────────────────────────────────
 */

const TEMEL: BildirimGirdisi = {
  yetkisiBitecekIlan: 0,
  yetkisiDolmusYayindaIlan: 0,
  bakimGorevleri: [],
  ilgisizPortfoy: 0,
  gozlemsizMahalle: 0,
  yetkiBelgesiVar: true,
  onayBekleyenIlan: 0,
  altMetniEksikGorsel: 0,
  eksikAyarlar: [],
  eskiAdliAyarlar: [],
  siteAdresindePortVar: false,
  semaDurumu: { eksikTablolar: [], beklenenSayi: 63, hata: null },
  surumDurumu: null,
  alanSagligi: {
    saglik: 'saglikli',
    ozet: 'Alan adı sağlıklı.',
    eylem: 'Bir işlem gerekmiyor.',
    sorguZamani: new Date().toISOString(),
  },
}

afterEach(() => semaDurumunuAyarla(undefined))

describe('şema denetimi — beklenen liste', () => {
  /**
   * ⚠️ BEKLENEN TABLO LİSTESİ ELLE YAZILMAMALI.
   *
   * Elle tutulan bir liste, tam da denetlemek istediğimiz şeyi (birinin bir
   * adımı atlaması) kendi içinde tekrarlardı: yeni koleksiyon eklenir,
   * listeye eklenmesi unutulur, denetim sessizce eksik kalır.
   */
  it('liste Payload’ın kendi tablo kaydından geliyor', () => {
    const kaynak = kodu('src/lib/sema/denetim.ts')
    expect(kaynak).toContain('payload.db as unknown as { tables?')
    // Sabit bir tablo adı listesi olmamalı.
    expect(kaynak).not.toMatch(/const BEKLENEN_TABLOLAR\s*=\s*\[/)
  })

  /** ⚠️ Tek sorgu: tablo başına gidiş-dönüş açılışta gereksiz yük olurdu. */
  it('tek sorguyla karşılaştırıyor', () => {
    const kaynak = kodu('src/lib/sema/denetim.ts')
    expect(kaynak).toContain('FROM pg_tables')
    expect(kaynak.match(/drizzle\.execute/g)).toHaveLength(1)
  })
})

describe('şema denetimi — uygulamayı çökertmiyor', () => {
  /**
   * ⚠️ ŞARTNAMENİN SERT KURALI: uygulama çökmesin, ziyaretçi etkilenmesin.
   * Bir bütünlük kontrolünün siteyi düşürmesi, korumaya çalıştığı şeyden
   * büyük zarar olurdu.
   */
  it('denetim her hatayı yutuyor', () => {
    const kaynak = kodu('src/lib/sema/denetim.ts')
    expect(kaynak).toContain('} catch (hata) {')
    // Hiçbir yerde yeniden fırlatma olmamalı.
    expect(kaynak).not.toMatch(/throw /)
  })

  /** ⚠️ Açılış beklemiyor: `void` ile çağrılıyor ve gecikmeli başlıyor. */
  it('açılışı bekletmiyor', () => {
    expect(oku('src/instrumentation.ts')).toContain('void semayiAcilistaDenetle()')

    const acilis = oku('src/lib/sema/acilis.ts')
    expect(acilis).toContain('SEMA_GECIKME_MS')
    // Zamanlayıcı süreci canlı tutmamalı.
    expect(acilis).toContain('zamanlayici.unref?.()')
  })

  it('açılış kancası da hata yutuyor', () => {
    expect(kodu('src/lib/sema/acilis.ts')).toContain('} catch (hata) {')
  })

  /**
   * ⚠️ PAYLOAD İÇE AKTARIMI `instrumentation.ts` İÇİNDE OLAMAZ.
   *
   * Next o dosyayı Edge derlemesi için de derliyor; `@payload-config`
   * doğrudan oradan içe aktarılınca Turbopack `node:path`'i Edge paketine
   * çözmeye çalışıyor ve DERLEME KIRILIYOR. Çalışma zamanı kontrolü
   * yetmiyor — hata derleme anında veriliyor. Bir kez yaşandı.
   */
  it('payload içe aktarımı ara modülde', () => {
    const kancalar = kodu('src/instrumentation.ts')
    expect(kancalar).not.toContain('@payload-config')
    expect(kancalar).toContain("import('@/lib/sema/acilis')")
    expect(kodu('src/lib/sema/acilis.ts')).toContain('@payload-config')
  })
})

describe('şema denetimi — günlük', () => {
  it('eksik tablo varsa hata seviyesinde ve çözümüyle yazıyor', () => {
    const satirlar: string[] = []
    const eski = console.error
    console.error = (...parcalar: unknown[]) => satirlar.push(parcalar.join(' '))

    semayiGunlukleYaz({
      eksikTablolar: ['sayfa_icerikleri', 'altbilgi_ayarlari'],
      beklenenSayi: 63,
      kontrolZamani: new Date().toISOString(),
      hata: null,
    })

    console.error = eski
    expect(satirlar.join('\n')).toContain('2/63 TABLO EKSİK')
    // ⚠️ Ne yapılacağını söylemeyen uyarı işe yaramaz.
    expect(satirlar.join('\n')).toContain('--profile gocmen')
  })
})

describe('panel uyarısı', () => {
  it('eksik tablo kırmızı bütünlük uyarısı üretiyor', () => {
    const bildirimler = bildirimleriUret({
      ...TEMEL,
      semaDurumu: {
        eksikTablolar: ['altbilgi_ayarlari', 'danisman_ol_ek_gorseller', 'sayfa_icerikleri'],
        beklenenSayi: 63,
        hata: null,
      },
    })

    const bildirim = bildirimler.find((b) => b.anahtar === 'sema-eksik')
    expect(bildirim).toBeDefined()
    expect(bildirim?.oncelik).toBe('butunluk')
    expect(bildirim?.baslik).toContain('3 tablo eksik')
    // ⚠️ Ne yapılacağı yazılı olmalı.
    expect(bildirim?.aciklama).toContain('gocmen')
  })

  /**
   * ⚠️ BÜTÜNLÜK YASALIN ÜSTÜNDE — gerekçesi ince.
   *
   * Eksik bir tablo dağıtımın yarım kaldığı anlamına geliyor ve şeritteki
   * DİĞER uyarıların dayandığı varsayımları geçersiz kılıyor: EİDS sayımı
   * eksik bir tablodan okuyorsa "0 ilan" der ve sorun yokmuş gibi görünür.
   * Yani bütünlük sorunu, yasal uyarıyı YANLIŞ gösterebilir.
   */
  it('bütünlük yasalın üstünde, erişimin altında', () => {
    expect(ONCELIK_SIRASI.erisim).toBeLessThan(ONCELIK_SIRASI.butunluk)
    expect(ONCELIK_SIRASI.butunluk).toBeLessThan(ONCELIK_SIRASI.yasal)
  })

  it('eksik tablo yasal uyarının üstünde görünüyor', () => {
    const bildirimler = bildirimleriUret({
      ...TEMEL,
      yetkisiDolmusYayindaIlan: 3,
      semaDurumu: { eksikTablolar: ['sayfa_icerikleri'], beklenenSayi: 63, hata: null },
    })

    const anahtarlar = bildirimler.map((b) => b.anahtar)
    expect(anahtarlar.indexOf('sema-eksik')).toBeLessThan(anahtarlar.indexOf('eids-dolmus-yayinda'))
  })

  it('denetim yapılamadıysa da uyarı var', () => {
    const bildirimler = bildirimleriUret({
      ...TEMEL,
      semaDurumu: { eksikTablolar: [], beklenenSayi: 0, hata: 'bağlanılamadı' },
    })
    expect(bildirimler.find((b) => b.anahtar === 'sema-denetlenemedi')).toBeDefined()
  })

  /** Her şey yerindeyse şerit susmalı — gereksiz uyarı, uyarıyı öldürür. */
  it('eksik yoksa uyarı yok', () => {
    const bildirimler = bildirimleriUret(TEMEL)
    expect(bildirimler.find((b) => b.anahtar?.startsWith('sema-'))).toBeUndefined()
  })

  /**
   * ⚠️ "Hiç denetlenmedi" durumu sessiz kalıyor ve bu BİLİNÇLİ.
   *
   * Denetim açılıştan 15 sn sonra koşuyor; o pencerede paneli açan biri
   * yanlış bir uyarı görmemeli. Denetimin hiç çalışmaması ayrı bir arıza
   * ama onu bakım şeridi değil, sunucu günlüğü ve `semaDurumu()` gösteriyor.
   */
  it('hiç denetlenmediyse uyarı üretilmiyor', () => {
    expect(semaDurumu()).toBeNull()
    const bildirimler = bildirimleriUret({ ...TEMEL, semaDurumu: null })
    expect(bildirimler.find((b) => b.anahtar?.startsWith('sema-'))).toBeUndefined()
  })
})

describe('şerit bütünlük etiketini tanıyor', () => {
  /** ⚠️ Renk tek taşıyıcı değil (WCAG 1.4.1): metin etiketi de olmalı. */
  it('etiket ve simge tanımlı', () => {
    const serit = oku('src/components/panel/BildirimSeridi.tsx')
    expect(serit).toContain("butunluk: 'Bütünlük'")
    expect(serit).toContain("butunluk: '!'")
  })
})
