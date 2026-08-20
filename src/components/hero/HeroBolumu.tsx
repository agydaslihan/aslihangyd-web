import dynamic from 'next/dynamic'

import type { HeroAyarlari } from '@/lib/hero/tipler'

import { HeroCercevesi, HeroSlaydi } from './HeroSlaydi'

/**
 * Ana sayfa hero'su — slaytlar varsa slider, yoksa yedek.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ÜÇ YOL VE ÜÇÜ DE FARKLI MİKTARDA JS TAŞIYOR
 *
 *   slayt yok     → `null` döner, sayfa mevcut metin hero'sunu çizer · 0 JS
 *   tek slayt     → sunucuda basılmış tek görsel · 0 JS
 *   çok slayt     → aynı işaretleme + kumanda parçası · yalnızca burada JS
 *
 * `next/dynamic` olmadan koşullu render yetmezdi: kumanda bileşeni tek
 * slaytlı sayfada da ana parçaya girer ve indirilirdi. İsteğin "tek slayt
 * varsa slider mekanizması hiç yüklenmesin" şartı tam olarak bunu diyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ SLAYTLAR SUNUCUDA BASILIYOR, İSTEMCİDE DEĞİL. Hero sayfanın LCP
 * öğesi; istemcide çizilseydi ilk boyama JS'i beklerdi. JS hiç gelmese
 * bile ilk slayt görünüyor ve okunuyor.
 */

const HeroKumandasi = dynamic(() =>
  import('./HeroKumandasi').then((modul) => ({ default: modul.HeroKumandasi })),
)

/** DOM'da kumandanın slaytları bulmasını sağlayan çapa. */
const HERO_ANAHTARI = 'anasayfa'

/**
 * ⚠️ Ayarlar PROP olarak geliyor, burada okunmuyor.
 *
 * Sayfa da aynı veriyi okuyor (hangi hero'yu çizeceğine karar vermek
 * için). İkinci bir okuma ikinci bir veritabanı turu demekti.
 */
export function HeroBolumu({
  ayarlar,
  sayfaHerosu = true,
}: {
  ayarlar: HeroAyarlari
  /**
   * Slider sayfanın hero'su mu?
   *
   * ─────────────────────────────────────────────────────────────────────
   * ⚠️ TEK BAYRAK, İKİ SONUÇ — VE BİLİNÇLİ OLARAK TEK.
   *
   * "Sayfanın hero'su olmak" iki şeyi birden belirliyor ve ikisi asla
   * ayrışmamalı:
   *
   *   · `<h1>` mi `<h2>` mi — sayfada tek bir `<h1>` olabilir.
   *   · `priority` mi değil mi — LCP öğesi tektir.
   *
   * Ayrı iki prop olsaydı biri unutulduğunda ortaya sessiz bir gerileme
   * çıkardı: iki `<h1>` (ekran okuyucuda iki konu) ya da iki `priority`
   * görsel (birbirinin bant genişliğini yiyen iki LCP adayı). İkisi de
   * ekranda hiçbir iz bırakmadan geçer.
   *
   * Ana sayfada yeniden tasarımdan sonra `false`: `<h1>` vitrinde ve LCP
   * öğesi vitrinin sahnesi. Slider onun altındaki bant.
   * ─────────────────────────────────────────────────────────────────────
   */
  sayfaHerosu?: boolean
}) {
  const { slaytlar } = ayarlar

  // ⚠️ Slayt yoksa sayfa kendi metin hero'sunu çiziyor. Slider bir ek,
  // bir varlık şartı değil.
  if (slaytlar.length === 0) return null

  const cok = slaytlar.length > 1
  const ilk = slaytlar[0] as (typeof slaytlar)[number]

  return (
    <section aria-label="Öne çıkanlar" className="relative">
      <HeroCercevesi>
        {/*
          ⚠️ SUNUCU YALNIZCA İLK SLAYDI BASIYOR — ÖLÇÜMLE ÖĞRENİLDİ.

          İlk sürümde bütün slaytlar sunucuda basılıyor, sonrakiler
          `loading="lazy"` ile işaretleniyordu. Lighthouse gösterdi ki
          bu YETMİYOR: slaytlar `inset-0` ile görüntü alanının İÇİNDE
          duruyor (yalnızca saydamlıkları sıfır), tembel yükleme ise
          görüntü alanı dışındaki görselleri erteliyor.

          Sonuç: ikinci slaydın görseli (33,4 kB) mobilde de iniyor ve
          LCP görseliyle bant genişliği için yarışıyordu. Ölçülen bedel
          mobil ana sayfada LCP 3,30 s → 3,67 s.

          Artık sonraki slaytlar hiç basılmıyor; kumanda onları ilk kez
          gösterildiklerinde istemcide kuruyor. LCP öğesi olan ilk slayt
          sunucuda ve `priority` ile kalıyor.
        */}
        <div data-hero={HERO_ANAHTARI} className="absolute inset-0">
          <div
            data-hero-ilk=""
            className="absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none"
            style={{ opacity: 1 }}
          >
            <HeroSlaydi slayt={ilk} oncelikli={sayfaHerosu} baslikSeviyesi={sayfaHerosu ? 1 : 2} />
          </div>
        </div>

        {cok ? (
          <HeroKumandasi
            ayarlar={ayarlar}
            hedefSecici={HERO_ANAHTARI}
            baslikSeviyesi={sayfaHerosu ? 1 : 2}
          />
        ) : null}
      </HeroCercevesi>
    </section>
  )
}
