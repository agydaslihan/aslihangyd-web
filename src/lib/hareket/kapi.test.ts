import { afterEach, describe, expect, it, vi } from 'vitest'

import { azHareketIsteniyor, EN_GEC_MS, lcpSonrasi, masaustuMu, MASAUSTU_ESIGI } from './kapi'

/**
 * ⚠️ NEDEN VAR: KAPI YANLIŞ TARAFA AÇILIRSA KİMSE FARK ETMEZ.
 *
 * "Hareket kodu inmedi" görünmez bir davranış: sayfa çalışmaya devam eder.
 * Yani kapı ters çalıştığında (az hareket isteyen ziyaretçiye kütüphane
 * inmesi) hiçbir ekranda iz kalmaz. Testin işi tam olarak bu sessizliği
 * kırmak.
 */

/**
 * ⚠️ TARAYICI ORTAMI TAKLİT EDİLİYOR, jsdom EKLENMİYOR.
 *
 * Test ortamı `node` (vitest.config.ts) ve öyle kalmalı: jsdom bütün
 * paket için bir bağımlılık ve her testin açılışını yavaşlatır. Burada
 * ihtiyaç duyulan yüzey üç şeyden ibaret — `matchMedia`, `setTimeout`,
 * `clearTimeout`.
 *
 * ⚠️ Zamanlayıcılar `globalThis`e ÇAĞRI ANINDA yönlendiriliyor. Doğrudan
 * atansaydı `vi.useFakeTimers()` sahte zamanlayıcıyı kuramazdı: taklit
 * pencere gerçek olanı yakalamış olurdu.
 */
function pencereKur(cevaplar: Record<string, boolean>) {
  ;(globalThis as { window?: unknown }).window = {
    matchMedia: (sorgu: string) => ({
      matches: cevaplar[sorgu] ?? false,
      media: sorgu,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
    setTimeout: (...girdi: Parameters<typeof globalThis.setTimeout>) =>
      globalThis.setTimeout(...girdi),
    clearTimeout: (kimlik: number) => globalThis.clearTimeout(kimlik),
  }
}

function medyaKur(cevaplar: Record<string, boolean>) {
  pencereKur(cevaplar)
}

afterEach(() => {
  delete (globalThis as { window?: unknown }).window
  vi.useRealTimers()
})

describe('az hareket tercihi', () => {
  it('tercih açıksa kapı kapalı', () => {
    medyaKur({ '(prefers-reduced-motion: reduce)': true })
    expect(azHareketIsteniyor()).toBe(true)
  })

  it('tercih kapalıysa kapı açık', () => {
    medyaKur({ '(prefers-reduced-motion: reduce)': false })
    expect(azHareketIsteniyor()).toBe(false)
  })

  /**
   * ⚠️ `matchMedia` YOKSA CEVAP "AZ HAREKET". Sunucuda ve çok eski
   * tarayıcılarda API yok; varsayılan hareketsizlik olmalı. Yanlış tarafta
   * yanılmak: kodun inmemesi bir eksiklik, inmemesi gereken yerde inmesi
   * bir ihlal.
   */
  it('matchMedia yoksa varsayılan hareketsizlik', () => {
    ;(globalThis as { window?: unknown }).window = {}
    expect(azHareketIsteniyor()).toBe(true)
  })

  /** ⚠️ Sunucuda `window` hiç yok — orada da cevap hareketsizlik. */
  it('sunucuda varsayılan hareketsizlik', () => {
    delete (globalThis as { window?: unknown }).window
    expect(azHareketIsteniyor()).toBe(true)
    expect(masaustuMu()).toBe(false)
  })
})

describe('masaüstü kontrolü — Lenis kapısı', () => {
  it('fare + geniş ekran → masaüstü', () => {
    medyaKur({ '(pointer: fine)': true, [`(min-width: ${MASAUSTU_ESIGI}px)`]: true })
    expect(masaustuMu()).toBe(true)
  })

  /**
   * ⚠️ GENİŞLİK TEK BAŞINA YETMEZ. 1024 px genişliğindeki bir tablet de
   * dokunmatik; Lenis orada native kaydırmayı bozuyor.
   */
  it('geniş ama dokunmatik ekran → masaüstü değil', () => {
    medyaKur({ '(pointer: fine)': false, [`(min-width: ${MASAUSTU_ESIGI}px)`]: true })
    expect(masaustuMu()).toBe(false)
  })

  it('fare var ama ekran dar → masaüstü değil', () => {
    medyaKur({ '(pointer: fine)': true, [`(min-width: ${MASAUSTU_ESIGI}px)`]: false })
    expect(masaustuMu()).toBe(false)
  })
})

describe('LCP sonrası zamanlama', () => {
  /**
   * ⚠️ ÜÇ KADEMENİN HEPSİ TETİKLENEBİLİR — iş bir kez çalışmalı.
   * İki kez çalışsaydı iki Lenis örneği doğar ve sayfa titrerdi.
   */
  it('iş yalnızca bir kez çalışıyor', () => {
    medyaKur({})
    vi.useFakeTimers()
    const is = vi.fn()
    lcpSonrasi(is)

    vi.advanceTimersByTime(EN_GEC_MS * 3)
    expect(is).toHaveBeenCalledTimes(1)
  })

  it('zaman aşımı en geç sınırında çalışıyor', () => {
    medyaKur({})
    vi.useFakeTimers()
    const is = vi.fn()
    lcpSonrasi(is)

    vi.advanceTimersByTime(EN_GEC_MS - 1)
    expect(is).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(is).toHaveBeenCalledTimes(1)
  })

  /**
   * ⚠️ Bileşen sökülürse iş HİÇ çalışmamalı: sayfadan ayrılmış bir
   * ziyaretçi için kütüphane indirmek net kayıp.
   */
  it('vazgeçilirse iş hiç çalışmıyor', () => {
    medyaKur({})
    vi.useFakeTimers()
    const is = vi.fn()
    const vazgec = lcpSonrasi(is)
    vazgec()

    vi.advanceTimersByTime(EN_GEC_MS * 2)
    expect(is).not.toHaveBeenCalled()
  })
})
