'use client'

import { useEffect, useRef } from 'react'

import { azHareketIsteniyor, lcpSonrasi, masaustuMu } from '@/lib/hareket/kapi'
import { gsapGetir } from '@/lib/hareket/yukleyiciler'

/**
 * Yatay anlatı — şartname §6.6.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ İÇERİK JAVASCRIPT'E BAĞLI DEĞİL.
 *
 * Dört bölümün tamamı sunucuda basılıyor ve CSS ile okunabilir bir dikey
 * yığın olarak duruyor. GSAP inmezse, az hareket tercihi açıksa ya da
 * cihaz dokunmatikse sayfa aynen çalışıyor — yalnızca yatay akış olmuyor.
 *
 * Ters kurulum (JS ile çizmek) daha yaygın ve çok daha kırılgan: tek bir
 * betik hatası anlatının tamamını boş bırakırdı. Aynı karar `Sahne`
 * bileşeninde de verilmişti.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ SABİTLEME (PIN) "KAYDIRMA ELE GEÇİRME" DEĞİL — ve şartname ikincisini
 * yasaklıyor.
 *
 * Ele geçirme, tekerlek olayını yakalayıp kendi kaydırma miktarını
 * dayatmaktır: kullanıcı üç satır kaydırır, sayfa bir bölüm atlar. Burada
 * öyle bir şey yok — tarayıcının KENDİ kaydırması ilerliyor, biz yalnızca
 * o ilerlemeyi yatay bir `transform`a çeviriyoruz (`scrub`). Kullanıcı
 * durabilir, geri gidebilir, hızlanabilir; klavyeyle de aynı.
 *
 * ⚠️ Sabitleme mesafesi yatay mesafeye EŞİT: fazlası, hiçbir şeyin
 * değişmediği "ölü" bir kaydırma bölgesi üretir ve sayfa donmuş hissettirir.
 *
 * ⚠️ GSAP BURADA HAK EDİYOR. Kaydırmaya bağlı (`scrub`) bir zaman çizelgesi
 * CSS geçişleriyle yazılamıyor: kaydırma konumu ile animasyon ilerlemesi
 * arasında sürekli bir bağ gerekiyor. Basit belirmeler için CSS katmanı
 * kullanılıyor; kütüphane yalnızca bunun için iniyor.
 */
export interface AnlatiBolumu {
  anahtar: string
  ustBaslik: string
  baslik: string
  metin: string
}

export function YatayAnlati({ bolumler }: { bolumler: readonly AnlatiBolumu[] }) {
  /**
   * Üç düğüm, üçü de React'in. Rolleri ayrı ve bu ayrım zorunlu —
   * gerekçesi hemen aşağıda.
   */
  const disRef = useRef<HTMLDivElement | null>(null)
  const sabitRef = useRef<HTMLDivElement | null>(null)
  const rayRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (azHareketIsteniyor() || !masaustuMu()) return

    let temizle: (() => void) | undefined

    const vazgec = lcpSonrasi(() => {
      void gsapGetir()
        .then((motor) => {
          const dis = disRef.current
          const sabit = sabitRef.current
          const ray = rayRef.current
          if (!motor || !dis || !sabit || !ray) return

          const mesafe = () => ray.scrollWidth - window.innerWidth

          const tween = motor.gsap.to(ray, {
            x: () => -mesafe(),
            ease: 'none',
            scrollTrigger: {
              trigger: dis,
              start: 'top top',
              end: () => `+=${mesafe()}`,
              pin: sabit,
              /**
               * ─────────────────────────────────────────────────────────
               * ⚠️ `pinSpacer` OLMADAN BU SAYFADAN ÇIKILAMIYOR. SİTENİN
               *    TAMAMI KIRILIYORDU.
               *
               * ScrollTrigger sabitlediği öğeyi normalde KENDİ ürettiği
               * `<div class="pin-spacer">` içine TAŞIR:
               *
               *     main
               *       └─ pin-spacer          ← GSAP ekledi, React bilmiyor
               *            └─ bölüm          ← React "ebeveynim main" sanıyor
               *
               * Ziyaretçi menüden bir bağlantıya bastığında React bu
               * bölümü sökmek için `main.removeChild(bölüm)` çağırıyor ve
               * tarayıcı reddediyor: düğüm artık `main`in çocuğu değil.
               *
               *     NotFoundError: The node to be removed is not a child
               *     of this node.
               *
               * Hata `commit` aşamasında düştüğü için React kökün TAMAMINI
               * söküyor: ekran boş kalıyor, menü gidiyor, "sayfa
               * yüklenemedi". F5 çalışıyor çünkü yeniden boyamada DOM
               * baştan kuruluyor. Sunucu tarafında hiçbir iz yok — tüm
               * rotalar 200, Lighthouse yeşil.
               *
               * ⚠️ Yalnızca ana sayfadan çıkarken oluyordu: sabitlenen
               * bölüm burada. Ziyaretçinin çoğu ana sayfaya indiği için
               * pratikte menünün tamamı ölüydü.
               *
               * ÇÖZÜM: aracı düğümü GSAP üretmesin, BİZ verelim.
               * `pinSpacer` verildiğinde ScrollTrigger'ın kendi kaynağı
               * (`_swapPinIn`) şunu yapıyor:
               *
               *     if (pin.parentNode !== spacer) { ...taşı... }
               *
               * `dis` zaten `sabit`in React'teki ebeveyni olduğu için bu
               * koşul HİÇ sağlanmıyor: tek bir `appendChild` bile
               * çalışmıyor, yalnızca satır içi stiller yazılıyor. React'in
               * gördüğü ağaç ile tarayıcıdaki ağaç aynı kalıyor.
               *
               * ⚠️ Bu yüzden `dis` ile `sabit` AYRI DÜĞÜM OLMAK ZORUNDA.
               * İkisini birleştiren biri bu hatayı geri getirir; kalıcı
               * denetim `lib/hareket/pinYalitimi.test.ts` içinde.
               * ─────────────────────────────────────────────────────────
               */
              pinSpacer: dis,
              scrub: 0.6,
              invalidateOnRefresh: true,
              anticipatePin: 1,
            },
          })

          temizle = () => {
            // ⚠️ `kill(true)`: `revert` açık. Sabitlemenin yazdığı satır içi
            // stiller (genişlik, yükseklik, position, padding) geri alınır;
            // aksi hâlde bölüm sökülmese bile donmuş ölçülerle kalır.
            tween.scrollTrigger?.kill(true)
            tween.kill()
            // ⚠️ `transform` elle sıfırlanıyor: GSAP öldürülse de son değer
            // stilde kalıyor ve bölüm yatay kaymış hâlde donuyor.
            ray.style.transform = ''
          }
        })
        .catch(() => {
          /**
           * ⚠️ HAREKET BİR SÜS; GEZİNME İŞLEV.
           *
           * Kütüphane inmezse, ölçüm başarısız olursa ya da tarayıcı bir
           * API'yi desteklemezse sayfa AYNEN çalışmalı. Yutulan hata
           * burada bilinçli: alternatifi, süslü bir efektin başarısızlığının
           * sayfayı kullanılamaz hâle getirmesi.
           */
        })
    })

    return () => {
      vazgec()
      temizle?.()
    }
  }, [])

  return (
    /*
      ⚠️ ÜÇ KATMAN, ÜÇÜ DE GEREKLİ:

        dis    — ScrollTrigger'a `pinSpacer` olarak verilen düğüm. Görsel
                 rolü yok; işi, sabitleme sırasında bölümün bıraktığı
                 boşluğu tutmak. GSAP buraya satır içi ölçü yazıyor.
        sabit  — sabitlenen (`pin`) bölüm. Görünüşü taşıyan sınıflar burada.
        ray    — yatay olarak kaydırılan şerit.

      `dis` ile `sabit`i tek düğümde birleştirmek, GSAP'ın kendi aracı
      düğümünü üretmesine ve React'in ağacından habersiz DOM taşıması
      yapmasına yol açar. Gerekçenin tamamı yukarıda, `pinSpacer` notunda.
    */
    <div ref={disRef}>
      <div ref={sabitRef} className="bg-yuzey-2/60 border-kenar border-y-[0.5px]">
        {/*
          ⚠️ MOBİLDE DİKEY, MASAÜSTÜNDE YATAY — ve mobil düzeni CSS'in kendi
          işi (`scroll-snap`), JS'in değil.
        */}
        <div
          ref={rayRef}
          className="kapsayici flex snap-y snap-mandatory flex-col gap-6 py-16 lg:h-[100svh] lg:max-w-none lg:snap-none lg:flex-row lg:items-center lg:gap-10 lg:py-0"
        >
          {bolumler.map((bolum, sira) => (
            <article
              key={bolum.anahtar}
              className="border-kenar bg-yuzey rounded-buyuk shadow-kart flex snap-start flex-col justify-center border-[0.5px] p-8 sm:p-10 lg:h-[68svh] lg:w-[min(38rem,72vw)] lg:shrink-0"
            >
              {/*
              ⚠️ Sıra numarası GERÇEKTEN sıra bildiriyor: dört adım, ilk
              temastan pazarlamaya kadar bir akış. Süs olsaydı yazılmazdı.
            */}
              <span className="text-metin-3 text-mikro tabular-nums">
                {String(sira + 1).padStart(2, '0')} / {String(bolumler.length).padStart(2, '0')}
              </span>
              <p className="text-aksan-metin text-eyebrow mt-4 font-medium uppercase">
                {bolum.ustBaslik}
              </p>
              <h3 className="text-metin font-baslik mt-3 text-baslik-2-mobil font-medium sm:text-baslik-2">
                {bolum.baslik}
              </h3>
              <p className="text-metin-2 mt-5 text-govde leading-relaxed">{bolum.metin}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
