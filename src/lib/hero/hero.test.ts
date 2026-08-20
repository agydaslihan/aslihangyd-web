import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  ASGARI_OVERLAY,
  AZAMI_OVERLAY,
  HERO_ORANI,
  overlayOpakligi,
  type HeroSlayti,
} from './tipler'

const KOK = path.resolve(path.join(import.meta.dirname, '..', '..'))
const oku = (yol: string) => readFileSync(path.join(KOK, yol), 'utf8')

describe('overlayOpakligi', () => {
  it('yüzdeyi opaklığa çevirir', () => {
    expect(overlayOpakligi(0)).toBe(0)
    expect(overlayOpakligi(45)).toBeCloseTo(0.45, 5)
    expect(overlayOpakligi(80)).toBeCloseTo(0.8, 5)
  })

  /**
   * ⚠️ Sınır dışı değer KIRPILIYOR, hata vermiyor. Panelde `min`/`max` var
   * ama veritabanına elle yazılan bir değer hero'yu tümden siyaha
   * boyayabilirdi — bir sayı yüzünden ana sayfanın kaybolması kabul
   * edilemez.
   */
  it('sınır dışı değerleri kırpar', () => {
    expect(overlayOpakligi(-40)).toBe(ASGARI_OVERLAY / 100)
    expect(overlayOpakligi(500)).toBe(AZAMI_OVERLAY / 100)
  })

  /**
   * ⚠️ Azami karartma %100 DEĞİL. Tam siyah bir perde altındaki görseli
   * tamamen yok eder; o durumda slider değil düz renkli bir kutu olurdu ve
   * kullanıcı görselini neden göremediğini anlamazdı.
   */
  it('azami karartma tam siyahın altında', () => {
    expect(AZAMI_OVERLAY).toBeLessThan(100)
  })
})

/**
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ PERFORMANS ŞARTLARI PAZARLIĞA KAPALI — BU YÜZDEN KAYNAK DÜZEYİNDE
 * KİLİTLENİYOR.
 *
 * Hero sayfanın LCP öğesi. Buradaki her madde ölçülebilir bir sonuca
 * bağlı ve gerilemeleri SESSİZ: `priority` düşerse LCP birkaç yüz
 * milisaniye kayar, kimse fark etmez; `sizes` düşerse mobile masaüstü
 * görseli iner, kimse fark etmez.
 * ─────────────────────────────────────────────────────────────────────────
 */
describe('LCP ve CLS sözleşmesi', () => {
  const slayt = oku('components/hero/HeroSlaydi.tsx')
  const bolum = oku('components/hero/HeroBolumu.tsx')
  const kumanda = oku('components/hero/HeroKumandasi.tsx')

  it('ilk slayt öncelikli, sonrakiler tembel', () => {
    expect(slayt).toContain('priority={oncelikli}')
    expect(slayt).toContain("loading={oncelikli ? undefined : 'lazy'}")
    // ⚠️ Artık koşullu: slider sayfanın hero'su değilse `priority` almıyor.
    // Gerekçesi aşağıdaki "iki `<h1>` ve iki `priority`" notunda.
    expect(bolum).toContain('<HeroSlaydi slayt={ilk} oncelikli={sayfaHerosu}')
  })

  /**
   * ─────────────────────────────────────────────────────────────────────
   * ⚠️ SUNUCU YALNIZCA İLK SLAYDI BASMALI — ÖLÇÜMLE ÖĞRENİLDİ.
   *
   * İlk sürümde bütün slaytlar sunucuda basılıyor, sonrakiler
   * `loading="lazy"` ile işaretleniyordu. Lighthouse gösterdi ki bu
   * YETMİYOR: slaytlar `inset-0` ile görüntü alanının İÇİNDE duruyor
   * (yalnızca saydamlıkları sıfır) ve tembel yükleme yalnızca görüntü
   * alanı DIŞINI erteliyor.
   *
   * Ölçülen bedel: ikinci slaydın 33,4 kB'lık görseli mobilde de indi ve
   * LCP görseliyle bant genişliği için yarıştı — mobil ana sayfada
   * LCP 3,30 s → 3,67 s.
   *
   * Bu test o gerilemeyi kilitliyor: sunucu bileşeni slaytlar üzerinde
   * DÖNGÜ KURMAMALI.
   * ─────────────────────────────────────────────────────────────────────
   */
  it('sunucu sonraki slaytları basmıyor', () => {
    expect(bolum).not.toContain('slaytlar.map')
    expect(kumanda).toContain('slaytlar.map')
    expect(kumanda).toContain('yuklenenler.has(sira)')
  })

  /**
   * ⚠️ `sizes` olmadan tarayıcı en büyük varyantı iner ve 80 kB'lık mobil
   * hero bütçesi anlamını kaybeder.
   */
  it('mobil varyantın inmesi için sizes tanımlı', () => {
    expect(slayt).toContain('sizes="100vw"')
  })

  /**
   * ⚠️ CLS 0: oran sabit olmalı ve slayta göre DEĞİŞMEMELİ. Slayt başına
   * yükseklik açılsaydı geçişte düzen zıplardı.
   */
  it('en-boy oranı sabit ve slayta bağlı değil', () => {
    expect(slayt).toContain('aspectRatio')
    expect(HERO_ORANI.en).toBeGreaterThan(0)
    expect(HERO_ORANI.boy).toBeGreaterThan(0)
    // Oran tek yerde tanımlı; bileşen kendi sayısını uydurmuyor.
    expect(slayt).toContain('HERO_ORANI.en')
  })

  /**
   * ⚠️ İLK SLAYT SUNUCUDA GÖRÜNÜR BASILIYOR.
   *
   * Başlangıç durumu istemciye bırakılsaydı JS inene kadar hero boş kalır
   * ve LCP ölçümü onu beklerdi.
   */
  it('ilk slaydın görünürlüğü sunucuda veriliyor', () => {
    expect(bolum).toContain('style={{ opacity: 1 }}')
    expect(bolum).toContain('data-hero-ilk')
  })
})

/**
 * ⚠️ TEK SLAYTTA SLIDER KODU HİÇ İNMEMELİ.
 *
 * Koşullu render tek başına yetmez: bileşen yine ana parçaya girer ve
 * indirilirdi. `next/dynamic` ayrı bir parça üretiyor ve o parça yalnızca
 * kumanda gerçekten render edildiğinde isteniyor.
 */
describe('tek slayt maliyeti', () => {
  const bolum = oku('components/hero/HeroBolumu.tsx')
  const kumanda = oku('components/hero/HeroKumandasi.tsx')

  it('kumanda dinamik olarak ayrı parçaya alınmış', () => {
    expect(bolum).toContain("import dynamic from 'next/dynamic'")
    expect(bolum).toContain("import('./HeroKumandasi')")
  })

  it('kumanda yalnızca birden çok slaytta render ediliyor', () => {
    expect(bolum).toContain('slaytlar.length > 1')
    /**
     * ⚠️ BİÇİME DEĞİL YAPIYA BAKILIYOR.
     *
     * Önceki hâli `'{cok ? <HeroKumandasi'` dizgesini arıyordu ve prettier
     * prop eklendiği anda JSX'i çok satıra bölünce test CI'da kırıldı —
     * yerelde yeşildi çünkü testler commit öncesi biçimlendirmeden ÖNCE
     * koşmuştu. Sözleşme "şu satır şöyle yazılsın" değil, "kumanda `cok`
     * koşuluna bağlı olsun".
     */
    expect(/\{cok \?\s*\(?\s*<HeroKumandasi/.test(bolum)).toBe(true)
  })

  /**
   * ⚠️ Bir kez gösterilen slayt hatırlanıyor: ileri-geri gidildiğinde
   * yeniden kurulup görseli yeniden istenmiyor.
   */
  it('gösterilen slaytlar hatırlanıyor', () => {
    expect(kumanda).toContain('new Set([0])')
  })

  /**
   * ⚠️ Slaytların kendisi SUNUCU bileşeninde çizilmeli. İstemcide
   * çizilseydi ilk boyama JS'i beklerdi ve tek slaytlı sayfa bile JS'siz
   * çalışmazdı.
   */
  it('slayt bileşeni istemci bileşeni değil', () => {
    expect(oku('components/hero/HeroSlaydi.tsx').trimStart().startsWith("'use client'")).toBe(false)
    expect(bolum.trimStart().startsWith("'use client'")).toBe(false)
  })
})

/**
 * ⚠️ ERİŞİLEBİLİRLİK — otomatik hareket WCAG 2.2.2'nin konusu.
 */
describe('erişilebilirlik sözleşmesi', () => {
  const kumanda = oku('components/hero/HeroKumandasi.tsx')

  it('klavye ok tuşları destekleniyor', () => {
    expect(kumanda).toContain("olay.key === 'ArrowRight'")
    expect(kumanda).toContain("olay.key === 'ArrowLeft'")
  })

  it('aria-live var ve yalnızca otomatik geçişte konuşuyor', () => {
    expect(kumanda).toContain('aria-live={otomatikCalisiyor')
  })

  it('duraklat düğmesi var', () => {
    expect(kumanda).toContain('aria-pressed={duraklatildi}')
  })

  /**
   * ⚠️ `prefers-reduced-motion` otomatik geçişi TÜMDEN kapatmalı. Yalnızca
   * süreyi kısaltmak yetmez: WCAG'in konusu hareketin kendisi.
   */
  it('hareket azalt tercihi otomatik geçişi kapatıyor', () => {
    expect(kumanda).toContain('prefers-reduced-motion: reduce')
    expect(kumanda).toContain('!hareketAzalt')
  })

  /**
   * ⚠️ Görünmeyen slayttaki bağlantılar klavye sırasından da çıkmalı;
   * `opacity: 0` tek başına odaklanmayı engellemiyor.
   */
  it('görünmeyen slayt klavye sırasından çıkarılıyor', () => {
    expect(kumanda).toContain('dugum.inert')
  })

  it('nokta göstergeleri 44 piksellik dokunma hedefi taşıyor', () => {
    expect(kumanda).toContain('size-11')
  })
})

/**
 * ⚠️ VARSAYILAN KAPALI — hem erişilebilirlik hem LCP kararı.
 */
describe('otomatik geçiş varsayılanı', () => {
  const global = oku('globals/HeroSlider.ts')

  it('otomatik geçiş varsayılan olarak kapalı', () => {
    const blok = global.slice(global.indexOf("name: 'otomatikGecis'"))
    expect(blok.slice(0, 300)).toContain('defaultValue: false')
  })

  /**
   * ⚠️ 4 saniyenin altına inilemiyor: okumaya vakit bırakmayan bir slider,
   * olmayan bir slider'dan kötüdür.
   */
  it('geçiş süresi asgari sınırı var', () => {
    const blok = global.slice(global.indexOf("name: 'gecisSuresi'"))
    expect(blok.slice(0, 200)).toContain('min: 4')
  })
})

describe('yedek davranış', () => {
  /**
   * ⚠️ GÖRSEL YOKSA SİTE KIRILMAZ. Slider bir ek, bir varlık şartı değil.
   */
  it('slayt yoksa hero bölümü hiç çizilmiyor', () => {
    expect(oku('components/hero/HeroBolumu.tsx')).toContain('slaytlar.length === 0) return null')
  })

  /**
   * ─────────────────────────────────────────────────────────────────────
   * ⚠️ SÖZLEŞME BİLEŞENİN ADI DEĞİL, DAVRANIŞI.
   *
   * Eskiden "slayt varsa slider, yoksa metin hero'su" idi ve test
   * `<Kahraman>` arıyordu. Yeniden tasarımda düzen değişti: vitrin DAİMA
   * açılışta, slider onun altında kendi bandında. Sebebi aşağıda ve
   * `page.tsx` içinde yazılı — yeni vitrin yalnızca slayt yokken görünseydi
   * Aslıhan sitenin yeni yüzünü hiç görmeyecekti.
   * ─────────────────────────────────────────────────────────────────────
   */
  it('sayfa hero’su sinematik vitrin ve koşulsuz çiziliyor', () => {
    const sayfa = oku('app/(site)/page.tsx')
    expect(sayfa).toContain('<SinematikHero')

    /**
     * ⚠️ SLIDER ARTIK İKİNCİ SLAYTTAN İTİBAREN ÇİZİLİYOR.
     *
     * Aurora'da hero'nun tam ekran zemini ilk slaydın görseli. Slider bandı
     * eskisi gibi "slayt varsa" koşuluna bağlı kalsaydı aynı fotoğraf
     * sayfada iki kez görünürdü — biri tam ekran, biri bant içinde.
     */
    expect(sayfa).toContain('hero.slaytlar.length > 1 ? (')
  })

  /**
   * ⚠️ NEDEN VAR: İKİ `<h1>` VE İKİ `priority` — İKİSİ DE SESSİZ.
   *
   * Slider ana sayfada artık ikinci bant. Kendi `<h1>`ini basmaya devam
   * etseydi sayfada iki `<h1>` olurdu (ekran okuyucuda iki ayrı konu) ve
   * `priority` görselini indirmeye devam etseydi vitrinin LCP görseliyle
   * bant genişliği için yarışırdı. İkisi de ekranda hiçbir iz bırakmaz.
   *
   * Bu yüzden ikisi TEK bayrağa bağlı ve ayrışamıyorlar.
   */
  it('ana sayfada slider bandı hero değil', () => {
    expect(oku('app/(site)/page.tsx')).toContain('sayfaHerosu={false}')
  })

  it('sayfaHerosu bayrağı hem başlık seviyesini hem önceliği çeviriyor', () => {
    const bolum = oku('components/hero/HeroBolumu.tsx')
    expect(bolum).toContain('oncelikli={sayfaHerosu}')
    expect(bolum).toContain('baslikSeviyesi={sayfaHerosu ? 1 : 2}')
  })

  /** Vitrin sahnesi ana sayfanın LCP öğesi — `priority` ve `sizes` şart. */
  it('vitrin sahnesi öncelikli ve sizes tanımlı', () => {
    const sahne = oku('components/hero/VitrinSahnesi.tsx')
    expect(sahne).toContain('priority')
    expect(sahne).toContain('sizes="(min-width: 1024px) 32rem, 90vw"')
  })

  it('görselsiz slayt çizilmiyor', () => {
    expect(oku('lib/hero/sunucu.ts')).toContain('if (url === null) return null')
  })

  /**
   * ─────────────────────────────────────────────────────────────────────
   * ⚠️ BAŞLIKSIZ SLAYT ARTIK GEÇERLİ — AMA SESSİZ OLAMAZ.
   *
   * Yalnızca fotoğraf gösteren slayt istendi ve makul. Ama başlık da alt
   * metin de yoksa slaytta okunacak HİÇBİR ŞEY kalmıyor: ekran okuyucu
   * kullanan ziyaretçi boş bir slayt görür.
   *
   * İki kapı birden: panelde kaydetme doğrulaması ve sunucuda çözümleme.
   * Panel kapısı tek başına yetmez — eski kayıtlar ve elle düzenlenen veri
   * oradan geçmiyor.
   * ─────────────────────────────────────────────────────────────────────
   */
  it('metinsiz slaytta alt metin zorunlu', () => {
    expect(oku('lib/hero/sunucu.ts')).toContain(
      "if (baslik === null && gorselAlt.trim() === '') return null",
    )
    expect(oku('globals/HeroSlider.ts')).toContain('ALT METNİ zorunlu')
  })

  /**
   * ⚠️ Metin yoksa karartma da çizilmiyor: karartma metnin okunabilmesi
   * için var, okunacak metin olmayan slaytta yalnızca fotoğrafı bozar.
   */
  it('metinsiz slaytta karartma ve metin katmanı çizilmiyor', () => {
    const slayt = oku('components/hero/HeroSlaydi.tsx')
    expect(slayt).toContain('const metinVar =')
    // Perde ve metin katmanı aynı koşula bağlı.
    expect(slayt.match(/\{metinVar \? \(/g)).toHaveLength(2)
  })
})

describe('slayt çözümleme', () => {
  it('tip sözleşmesi eksiksiz', () => {
    const slayt: HeroSlayti = {
      anahtar: 's0',
      gorselUrl: '/a.avif',
      gorselAlt: '',
      gorselEn: 1920,
      gorselBoy: 1080,
      baslik: 'Başlık',
      altBaslik: null,
      butonMetni: null,
      butonLink: null,
      metinHizasi: 'sol',
      overlayKoyulugu: 45,
    }
    expect(slayt.metinHizasi).toBe('sol')
  })
})
