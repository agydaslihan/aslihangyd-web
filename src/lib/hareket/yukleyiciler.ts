import type { gsap as GsapTuru } from 'gsap'
import type { ScrollTrigger as ScrollTriggerTuru } from 'gsap/ScrollTrigger'
import type Lenis from 'lenis'

import { azHareketIsteniyor, masaustuMu } from './kapi'

/**
 * Hareket kütüphanelerinin TEK giriş kapısı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ `gsap` VE `lenis` BAŞKA HİÇBİR DOSYADAN İÇE AKTARILMAZ.
 *
 * Sebebi paketleyicinin çalışma biçimi: statik bir `import` gördüğü anda
 * kütüphaneyi o modülün parçasına koyuyor ve o parça, kullanılmasa bile
 * indiriliyor. Bu projede aynı tuzağa bir kez düşüldü — tek bir sabit
 * uğruna zod'un tamamı `/portfoy` paketine giriyordu (63 kB).
 *
 * ⚠️ `import type` KURAL DIŞI ve sebebi teknik: TypeScript tür içe
 * aktarmalarını derlemede TAMAMEN SİLİYOR, yani üretilen JavaScript'te o
 * satırdan hiçbir iz kalmıyor ve paketleyici kütüphaneyi görmüyor. Tür
 * bilgisi olmadan yükleyicilerin dönüş tipi `any` olurdu — projede
 * gerekçesiz `any` yasak.
 *
 * Kural `hareketYukleme.test.ts` içinde denetleniyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ HER YÜKLEYİCİ ÖNCE KAPIYA SORAR. `prefers-reduced-motion` açıksa
 * `null` dönüyor ve `import()` HİÇ ÇAĞRILMIYOR — yani ağ isteği de yok.
 * "Yükle ama animasyonu kapat" yaklaşımı bilinçli olarak reddedildi.
 */

/** GSAP ve ScrollTrigger — yalnızca kaydırma anlatısı olan sayfalarda. */
export async function gsapGetir(): Promise<{
  gsap: typeof GsapTuru
  ScrollTrigger: typeof ScrollTriggerTuru
} | null> {
  if (azHareketIsteniyor()) return null

  /**
   * ⚠️ İkisi AYNI ANDA isteniyor ama ayrı parçalar: ScrollTrigger'ı ayrı
   * tutmak, yalnızca `gsap.to()` kullanan bir sayfanın eklentiyi
   * indirmemesini sağlıyor.
   */
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
  ])

  gsap.registerPlugin(ScrollTrigger)
  return { gsap, ScrollTrigger }
}

/**
 * ⚠️ FRAMER-MOTION DÜŞÜRÜLDÜ — ÖLÇÜM KARAR VERDİ.
 *
 * Kütüphane Adım 2'de eklendi, Adım 3 ve 4'te sıfır kez kullanıldı ve
 * ölçüldüğünde bütçenin yarısını tutuyordu (52,7 kB gzip / 120 kB sınır).
 *
 * Sebep alışkanlık değil, iş bölümünün gerçeği: hover, fade, basma, alt
 * çizgi, yavaş zoom ve sayfa geçişi CSS'te; kaydırmaya bağlı anlatı
 * GSAP'ta. Geriye framer'a kalan bir iş kalmadı — düzen animasyonu
 * (`layout`) zaten CLS 0 hedefiyle çelişiyor, sürükleme jesti bu sayfalarda
 * yok.
 *
 * Geri gelirse şu üç işten biri için gelmeli: paylaşılan düzen geçişi,
 * sürükleme, ya da CSS'in taşıyamadığı bir yay fiziği. Bağımlılığın
 * yokluğu `hareketYukleme.test.ts` içinde denetleniyor.
 */

/**
 * Lenis — yumuşak kaydırma. YALNIZCA MASAÜSTÜ.
 *
 * ⚠️ Mobilde hiç yüklenmiyor: dokunmatik cihazda native kaydırmayı
 * devralmak iOS'ta takılma ve "kaydırma geride kalıyor" hissi üretiyor.
 * Şartname bunu kısıtlama değil doğru kullanım olarak yazıyor.
 *
 * ⚠️ Örnek TEKİL: iki Lenis örneği aynı kaydırmayı iki kez sürer ve sayfa
 * titrer. Modül ömrü boyunca tek örnek tutuluyor.
 */
let acikLenis: Lenis | null = null

export async function lenisBaslat(): Promise<Lenis | null> {
  if (azHareketIsteniyor() || !masaustuMu()) return null
  if (acikLenis) return acikLenis

  const { default: Lenis } = await import('lenis')
  const lenis = new Lenis({
    // ⚠️ Süre ve eğri arayüz jetonlarıyla aynı ailede: 1,1 sn ve yumuşak
    // çıkış. Daha uzunu "kaydırma geç tepki veriyor" hissi veriyor.
    duration: 1.1,
    easing: (t: number) => Math.min(1, 1.001 - 2 ** (-10 * t)),
    // ⚠️ Dokunmatik jestler Lenis'e VERİLMİYOR: hibrit dizüstülerde
    // (fare + dokunmatik ekran) parmakla kaydırma native kalsın.
    syncTouch: false,
    touchMultiplier: 0,
  })

  acikLenis = lenis

  let kare = 0
  const dongu = (zaman: number) => {
    lenis.raf(zaman)
    kare = requestAnimationFrame(dongu)
  }
  kare = requestAnimationFrame(dongu)

  const eskiYokEt = lenis.destroy.bind(lenis)
  lenis.destroy = () => {
    cancelAnimationFrame(kare)
    acikLenis = null
    eskiYokEt()
  }

  return lenis
}
