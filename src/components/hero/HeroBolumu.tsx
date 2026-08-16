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
export function HeroBolumu({ ayarlar }: { ayarlar: HeroAyarlari }) {
  const { slaytlar } = ayarlar

  // ⚠️ Slayt yoksa sayfa kendi metin hero'sunu çiziyor. Slider bir ek,
  // bir varlık şartı değil.
  if (slaytlar.length === 0) return null

  const cok = slaytlar.length > 1

  return (
    <section aria-label="Öne çıkanlar" className="relative">
      <HeroCercevesi>
        <div data-hero={HERO_ANAHTARI} className="absolute inset-0">
          {slaytlar.map((slayt, sira) => (
            <div
              key={slayt.anahtar}
              data-hero-slayt=""
              className="absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none"
              /*
                ⚠️ İlk slayt sunucuda GÖRÜNÜR basılıyor.
                Başlangıç durumunu istemciye bıraksaydık JS inene kadar
                hero boş kalır ve LCP ölçümü onu beklerdi.
              */
              style={{ opacity: sira === 0 ? 1 : 0 }}
              aria-hidden={sira === 0 ? 'false' : 'true'}
            >
              <HeroSlaydi slayt={slayt} oncelikli={sira === 0} />
            </div>
          ))}
        </div>

        {cok ? <HeroKumandasi ayarlar={ayarlar} hedefSecici={HERO_ANAHTARI} /> : null}
      </HeroCercevesi>
    </section>
  )
}
