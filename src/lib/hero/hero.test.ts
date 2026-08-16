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
    expect(bolum).toContain('<HeroSlaydi slayt={ilk} oncelikli />')
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
    expect(bolum).toContain('{cok ? <HeroKumandasi')
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

  it('sayfa slayt yokken metin hero’sunu çiziyor', () => {
    const sayfa = oku('app/(site)/page.tsx')
    expect(sayfa).toContain('heroSlaytVar ?')
    expect(sayfa).toContain('<Kahraman')
  })

  it('görselsiz ya da başlıksız slayt yarım çizilmiyor', () => {
    expect(oku('lib/hero/sunucu.ts')).toContain('if (url === null || baslik === null) return null')
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
