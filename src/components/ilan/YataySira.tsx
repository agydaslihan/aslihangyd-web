'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { ChevronIkon } from '@/components/ui/Ikon'
import { sinif } from '@/lib/sinif'

/**
 * Yatay kaydırmalı kart sırası.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Neden yatay sıra
 *
 * Tema sıraları dikey ızgaraya konsaydı sayfa metrelerce uzardı ve
 * "yatırım getirisi öne çıkanlar" ile "yeni eklenenler" arasındaki ayrım
 * kaybolurdu. Yatay sıra her temayı bir ekran yüksekliğine sığdırır ve
 * karşılaştırmayı aynı satırda tutar.
 *
 * ⚠️ Sağda kesilmiş kart bilinçli: devamı olduğunu gösteren tek dürüst
 * sinyal budur. Kartları tam sığdırmak, sıranın bittiği izlenimi verir ve
 * kimse kaydırmaz.
 *
 * Erişilebilirlik:
 *   · Kap `role="region"` ve odaklanabilir; ok tuşlarıyla kaydırılır.
 *   · Kartlar zaten sekmeyle gezilebilir; tarayıcı odaklanan kartı
 *     kendiliğinden görünür alana kaydırır.
 *   · Ok DÜĞMELERİ `aria-hidden` DEĞİL — gerçek düğmeler, etiketleri var.
 *     Klavye kullanıcısı için gereksiz tekrar olmasınlar diye sekme
 *     sırasından çıkarılmadılar; fare kullanıcısı için tek yol onlar.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Bir tık kaç piksel kaydırır — yaklaşık iki kart. */
const ADIM_ORANI = 0.8

export function YataySira({
  etiket,
  children,
}: {
  /** Ekran okuyucuya bölgenin ne olduğunu söyler. */
  etiket: string
  children: ReactNode
}) {
  const kapRef = useRef<HTMLDivElement>(null)
  const [ilerleme, setIlerleme] = useState(0)
  const [kaydirilabilir, setKaydirilabilir] = useState(false)
  const [basta, setBasta] = useState(true)
  const [sonda, setSonda] = useState(false)

  const durumuOlc = useCallback(() => {
    const kap = kapRef.current
    if (kap === null) return

    const azami = kap.scrollWidth - kap.clientWidth
    // 1px pay: tarayıcılar kesirli kaydırma değeri döndürüyor.
    setKaydirilabilir(azami > 1)
    setBasta(kap.scrollLeft <= 1)
    setSonda(kap.scrollLeft >= azami - 1)
    setIlerleme(azami <= 0 ? 0 : kap.scrollLeft / azami)
  }, [])

  useEffect(() => {
    durumuOlc()

    const kap = kapRef.current
    if (kap === null) return

    /**
     * Kart genişlikleri kırılma noktalarıyla değişiyor; pencere yeniden
     * boyutlandığında sıra kaydırılamaz hale gelebilir ve oklar öylece
     * kalır. `ResizeObserver` bunu yakalar.
     */
    const gozlemci = new ResizeObserver(durumuOlc)
    gozlemci.observe(kap)
    return () => gozlemci.disconnect()
  }, [durumuOlc])

  function kaydir(yon: -1 | 1) {
    const kap = kapRef.current
    if (kap === null) return
    kap.scrollBy({ left: yon * kap.clientWidth * ADIM_ORANI, behavior: 'smooth' })
  }

  function tusaBas(olay: React.KeyboardEvent<HTMLDivElement>) {
    if (olay.key === 'ArrowRight') {
      olay.preventDefault()
      kaydir(1)
    } else if (olay.key === 'ArrowLeft') {
      olay.preventDefault()
      kaydir(-1)
    }
  }

  return (
    <div className="relative">
      <div
        ref={kapRef}
        role="region"
        aria-label={etiket}
        tabIndex={0}
        onScroll={durumuOlc}
        onKeyDown={tusaBas}
        className={sinif(
          'flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1',
          // Kaydırma çubuğu gizlenmiyor: dokunmatik olmayan cihazlarda
          // kaydırılabilirliğin en doğrudan işareti o.
          'scroll-smooth',
        )}
      >
        {children}
        {/*
          Sağ boşluk: son kart kenara yapışmasın, kesilmiş kart hissi
          bozulmasın.
        */}
        <span className="w-px shrink-0" aria-hidden />
      </div>

      {kaydirilabilir ? (
        <>
          {/* İlerleme çubuğu — sıranın neresinde olduğunu gösterir. */}
          <div className="bg-kenar mt-3 h-0.5 w-full overflow-hidden rounded-rozet" aria-hidden>
            <div
              className="bg-gosterge h-full rounded-rozet transition-[width,margin] duration-[150ms]"
              style={{
                width: '32%',
                marginInlineStart: `${ilerleme * 68}%`,
              }}
            />
          </div>

          <div className="mt-2 flex justify-end gap-1.5">
            <OkButonu yon="sol" pasif={basta} onClick={() => kaydir(-1)} />
            <OkButonu yon="sag" pasif={sonda} onClick={() => kaydir(1)} />
          </div>
        </>
      ) : null}
    </div>
  )
}

function OkButonu({
  yon,
  pasif,
  onClick,
}: {
  yon: 'sol' | 'sag'
  pasif: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      // Uçta pasif ama sekme sırasında kalıyor: kaybolan bir düğme,
      // odağın sayfada zıplamasına yol açar.
      aria-disabled={pasif}
      aria-label={yon === 'sol' ? 'Önceki taşınmazlar' : 'Sonraki taşınmazlar'}
      className={sinif(
        'flex size-11 items-center justify-center rounded-buton border-[0.5px]',
        'transition-colors duration-[150ms] ease-[cubic-bezier(0.2,0,0,1)]',
        pasif
          ? 'border-transparent text-metin-pasif'
          : 'border-kenar-guclu text-metin-2 hover:border-vurgu hover:text-vurgu',
      )}
    >
      <ChevronIkon yon={yon} width={18} height={18} />
    </button>
  )
}

/** Sıradaki tek bir kartın sarmalayıcısı — sabit genişlik ve tutma noktası. */
/**
 * Yatay sıradaki tek kart.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ `gercekSizes` VERİLİRSE GÖRSEL İNDİRMESİ ERTELENİR.
 *
 * Sorun: `loading="lazy"` yatay kaydırmada işe yaramıyor. Tarayıcı
 * "yakında görünecek mi" kararını ağırlıklı olarak DİKEY yakınlığa göre
 * veriyor; sağa kaydırılmış kartlar dikeyde aynı hizada olduğu için
 * hepsini indiriyor. Ölçüm: /portfoy mobilde ilk ekranda HİÇBİR kart
 * görseli görünmezken 6 görsel (152 kB) iniyordu.
 *
 * Çözüm `src`i boşaltmak DEĞİL — öyle yapmak arama motorundan görseli
 * gizlerdi. Bunun yerine kart sunucuda küçük bir `sizes` bildirimiyle
 * basılıyor; `<img>`, `src`, `srcset` ve `alt` olduğu gibi HTML'de. Yalnızca
 * tarayıcının `srcset` içinden seçtiği aday küçük oluyor (~3 kB). Kart
 * görünür alana yaklaşınca buradaki gözlemci gerçek `sizes` değerini
 * yazıyor ve tarayıcı tam çözünürlüklü sürümü indiriyor.
 *
 * ⚠️ Gözlemcinin kökü `null` (görünüm alanı) — bilinçli. Kaydırma kabını
 * kök yapmak yalnızca YATAY konumu ölçerdi; `null` ile tarayıcı ata
 * öğelerin kırpmasını da hesaba katıyor, yani hem yatay hem dikey
 * görünürlük tek seferde doğru çıkıyor.
 *
 * ⚠️ Bedeli: JavaScript çalışmazsa ertelenen kartlar bulanık kalır.
 * Görsel, alt metni ve bağlantı yerinde; yalnızca çözünürlük düşük.
 * İlk iki kart erteleme dışında (`ERTELEMESIZ_KART`), yani sıranın
 * görünen kısmı JavaScript'siz de net.
 * ─────────────────────────────────────────────────────────────────────────
 */
export function SiraOgesi({
  children,
  gercekSizes,
}: {
  children: ReactNode
  /** Verilirse kart ertelenmiş sayılır ve görünürlükte bu değere yükseltilir. */
  gercekSizes?: string
}) {
  const ogeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (gercekSizes === undefined) return
    const oge = ogeRef.current
    if (oge === null) return

    const gorsel = oge.querySelector('img')
    if (gorsel === null) return
    // Zaten yükseltilmişse (yeniden bağlanma) tekrar gözlemeye gerek yok.
    if (gorsel.getAttribute('sizes') === gercekSizes) return

    // ⚠️ IntersectionObserver yoksa erteleme yapılmamalı: görsel bulanık
    // kalırdı ve bunu düzeltecek kimse olmazdı. Hemen yükselt.
    if (typeof IntersectionObserver === 'undefined') {
      gorsel.setAttribute('sizes', gercekSizes)
      return
    }

    const gozlemci = new IntersectionObserver(
      (girisler) => {
        for (const giris of girisler) {
          if (!giris.isIntersecting) continue
          gorsel.setAttribute('sizes', gercekSizes)
          gozlemci.disconnect()
        }
      },
      // Kart görünmeden biraz önce yükselt: kullanıcı bulanık hâli görmesin.
      { root: null, rootMargin: '250px' },
    )

    gozlemci.observe(oge)
    return () => gozlemci.disconnect()
  }, [gercekSizes])

  return (
    <div ref={ogeRef} className="w-[248px] shrink-0 snap-start sm:w-[264px]">
      {children}
    </div>
  )
}
