'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { gozlemOlayi } from '@/lib/olcum/istemci'

import { HeroSlaydi } from '@/components/hero/HeroSlaydi'
import { OkIkon } from '@/components/ui/Ikon'
import type { HeroAyarlari } from '@/lib/hero/tipler'

/**
 * Slider kumandası — YALNIZCA birden çok slayt varken yükleniyor.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ TEK SLAYTTA BU DOSYA HİÇ İNMİYOR.
 *
 * `HeroBolumu` bu bileşeni `next/dynamic` ile çağırıyor ve yalnızca
 * `slaytlar.length > 1` iken render ediyor. Tek slaytlı bir ana sayfada
 * paket bu kodu hiç indirmiyor — koşullu render tek başına yetmezdi,
 * bileşen yine ana parçaya girerdi.
 *
 * Bu, isteğin "tek slayt varsa slider mekanizması hiç yüklenmesin"
 * şartının kelimesi kelimesine karşılığı.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN SLAYTLARI BU BİLEŞEN ÇİZMİYOR
 *
 * Slaytların işaretlemesi SUNUCUDA basılıyor (`HeroSlaydi`, sunucu
 * bileşeni). Bu bileşen yalnızca hangisinin görüneceğini yönetiyor.
 *
 * Gerekçe LCP: slaytlar istemcide çizilseydi ilk boyama JS'in inip
 * çalışmasını beklerdi ve hero — sayfanın LCP öğesi — o kadar gecikirdi.
 * Sunucuda basılan işaretleme, JS hiç gelmese bile ilk slaydı gösteriyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

export interface KumandaOzellikleri {
  ayarlar: HeroAyarlari
  /** Slayt kapsayıcılarının ortak sınıf adı — görünürlük buradan sürülür. */
  hedefSecici: string
}

export function HeroKumandasi({ ayarlar, hedefSecici }: KumandaOzellikleri) {
  const { slaytlar, otomatikGecis, gecisSuresiMs } = ayarlar
  const toplam = slaytlar.length

  const [aktif, setAktif] = useState(0)
  const [duraklatildi, setDuraklatildi] = useState(!otomatikGecis)
  const kapsayiciRef = useRef<HTMLDivElement>(null)

  /**
   * ⚠️ `prefers-reduced-motion` OTOMATİK GEÇİŞİ TÜMDEN KAPATIYOR.
   *
   * Yalnızca animasyon süresini kısaltmak yetmez: WCAG 2.2.2'nin konusu
   * hareketin kendisi, hızı değil. Tercihi olan ziyaretçide slider elle
   * kullanılabilir bir galeriye dönüşüyor.
   */
  const [hareketAzalt, setHareketAzalt] = useState(false)
  useEffect(() => {
    const sorgu = window.matchMedia('(prefers-reduced-motion: reduce)')
    const uygula = () => setHareketAzalt(sorgu.matches)
    uygula()
    sorgu.addEventListener('change', uygula)
    return () => sorgu.removeEventListener('change', uygula)
  }, [])

  /**
   * ⚠️ SONRAKİ SLAYTLAR İLK GÖSTERİLDİKLERİNDE KURULUYOR.
   *
   * Hepsini baştan basmak, görsellerini de baştan indirtiyordu: slaytlar
   * `inset-0` ile görüntü alanının İÇİNDE duruyor (yalnızca saydamlıkları
   * sıfır) ve `loading="lazy"` yalnızca görüntü alanı DIŞINI erteliyor.
   * Lighthouse'ta ölçüldü — ikinci slaydın 33,4 kB'lık görseli LCP
   * görseliyle bant genişliği için yarışıyordu.
   *
   * `yuklenenler` bir kez gösterilen slaytları hatırlıyor: ileri-geri
   * gidildiğinde yeniden kurulmuyorlar.
   */
  const [yuklenenler, setYuklenenler] = useState<ReadonlySet<number>>(new Set([0]))

  /**
   * ⚠️ Kayıt EFEKTTE değil, geçişin kendisinde yapılıyor.
   *
   * İlk hâli `useEffect(() => setYuklenenler(...), [aktif])` idi ve lint
   * haklı olarak uyardı: efektte durum yazmak fazladan bir render turu
   * doğurur ve slaytın kurulmasını bir kare geciktirir. Geçiş zaten tek
   * bir yerden yapılıyor; kaydı oraya koymak hem daha az render hem daha
   * dürüst bir ifade.
   */
  const slaydaGit = useCallback((sira: number) => {
    setAktif(sira)
    setYuklenenler((onceki) => (onceki.has(sira) ? onceki : new Set([...onceki, sira])))
  }, [])

  /** İlk slaydın görünürlüğü — sunucunun bastığı düğüme dokunuluyor. */
  useEffect(() => {
    const dugum = document
      .querySelector(`[data-hero="${hedefSecici}"]`)
      ?.querySelector<HTMLElement>('[data-hero-ilk]')
    if (!dugum) return

    const gorunur = aktif === 0
    dugum.style.opacity = gorunur ? '1' : '0'
    dugum.setAttribute('aria-hidden', gorunur ? 'false' : 'true')
    // ⚠️ Görünmeyen slayttaki bağlantılar klavye sırasından da çıkmalı;
    // `opacity: 0` tek başına odaklanmayı engellemiyor.
    dugum.inert = !gorunur
  }, [aktif, hedefSecici])

  /**
   * ⚠️ `elle` bayrağı ölçüm için var ve gerekli: `git(1)` hem oklar hem
   * OTOMATİK GEÇİŞ tarafından çağrılıyor. Ayrım yapılmasaydı otomatik geçiş
   * açık olan bir sitede "ziyaretçi slaytları geziyor" sinyali kendiliğinden
   * üretilir ve düpedüz yanlış olurdu.
   */
  const git = useCallback(
    (yon: 1 | -1, elle = false) => {
      if (elle) gozlemOlayi('slider_gezinme')
      setAktif((onceki) => {
        const yeni = (onceki + yon + toplam) % toplam
        setYuklenenler((oncekiKume) =>
          oncekiKume.has(yeni) ? oncekiKume : new Set([...oncekiKume, yeni]),
        )
        return yeni
      })
    },
    [toplam],
  )

  /* ── Otomatik geçiş ── */
  useEffect(() => {
    if (!otomatikGecis || duraklatildi || hareketAzalt) return

    const zamanlayici = window.setInterval(() => git(1), gecisSuresiMs)
    return () => window.clearInterval(zamanlayici)
  }, [otomatikGecis, duraklatildi, hareketAzalt, gecisSuresiMs, git])

  /* ── Klavye ── */
  function tusaBasildi(olay: React.KeyboardEvent): void {
    if (olay.key === 'ArrowRight') {
      olay.preventDefault()
      git(1, true)
    } else if (olay.key === 'ArrowLeft') {
      olay.preventDefault()
      git(-1, true)
    }
  }

  const otomatikCalisiyor = otomatikGecis && !duraklatildi && !hareketAzalt

  return (
    <>
      {/*
        ⚠️ Sonraki slaytlar BURADA, istemcide kuruluyor. İlk slayt
        sunucuda basılı ve LCP öğesi; ona dokunulmuyor.
      */}
      <div className="absolute inset-0" aria-live="off">
        {slaytlar.map((slayt, sira) =>
          sira === 0 || !yuklenenler.has(sira) ? null : (
            <div
              key={slayt.anahtar}
              className="absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none"
              style={{ opacity: sira === aktif ? 1 : 0 }}
              aria-hidden={sira === aktif ? 'false' : 'true'}
              inert={sira !== aktif}
            >
              <HeroSlaydi slayt={slayt} oncelikli={false} />
            </div>
          ),
        )}
      </div>

      <div
        ref={kapsayiciRef}
        className="absolute inset-x-0 bottom-0 z-10"
        role="group"
        aria-roledescription="karusel"
        aria-label="Ana sayfa slaytları"
        onKeyDown={tusaBasildi}
        // ⚠️ Otomatik geçiş fareyle üzerine gelince duruyor: okumaya
        // başlayan birinin altından slaydı çekmek en sinir bozucu davranış.
        onMouseEnter={() => otomatikGecis && setDuraklatildi(true)}
        onMouseLeave={() => otomatikGecis && setDuraklatildi(false)}
        onFocusCapture={() => otomatikGecis && setDuraklatildi(true)}
      >
        {/*
        ⚠️ `aria-live` yalnızca otomatik geçişte "polite".
        Elle geçişte kullanıcı zaten ne yaptığını biliyor; her tıklamada
        ekran okuyucuya duyuru yapmak gürültü olurdu.
      */}
        <p className="sr-only" aria-live={otomatikCalisiyor ? 'polite' : 'off'}>
          Slayt {aktif + 1} / {toplam}: {slaytlar[aktif]?.baslik}
        </p>

        <div className="kapsayici pb-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => git(-1, true)}
              aria-label="Önceki slayt"
              className="text-koyu-bant-metin bg-black/35 hover:bg-black/50 flex size-11 items-center justify-center rounded-full backdrop-blur-sm transition-colors"
            >
              <OkIkon width={18} height={18} className="rotate-180" />
            </button>

            <button
              type="button"
              onClick={() => git(1, true)}
              aria-label="Sonraki slayt"
              className="text-koyu-bant-metin bg-black/35 hover:bg-black/50 flex size-11 items-center justify-center rounded-full backdrop-blur-sm transition-colors"
            >
              <OkIkon width={18} height={18} />
            </button>

            {/* ── Nokta göstergeleri ── */}
            <div className="ml-2 flex items-center gap-2">
              {slaytlar.map((slayt, sira) => (
                <button
                  key={slayt.anahtar}
                  type="button"
                  onClick={() => slaydaGit(sira)}
                  aria-label={`${sira + 1}. slayda git: ${slayt.baslik}`}
                  aria-current={sira === aktif}
                  /* ⚠️ Dokunma hedefi 44 px; görünen nokta küçük ama basılabilir
                   alan tam boy (WCAG 2.5.8). */
                  className="flex size-11 items-center justify-center"
                >
                  <span
                    aria-hidden="true"
                    className={`block size-2.5 rounded-full transition-all ${
                      sira === aktif ? 'bg-koyu-bant-metin w-6' : 'bg-koyu-bant-metin/50'
                    }`}
                  />
                </button>
              ))}
            </div>

            {/*
            ⚠️ DURAKLAT DÜĞMESİ YALNIZCA OTOMATİK GEÇİŞ AÇIKKEN VAR.
            Kapalıyken duraklatılacak bir şey yok; düğmeyi göstermek
            kullanıcıyı olmayan bir davranışa karşı uyarmak olurdu.
          */}
            {otomatikGecis && !hareketAzalt ? (
              <button
                type="button"
                onClick={() => setDuraklatildi((o) => !o)}
                aria-pressed={duraklatildi}
                className="text-koyu-bant-metin bg-black/35 hover:bg-black/50 ml-auto flex h-11 items-center gap-2 rounded-full px-4 text-govde-kucuk backdrop-blur-sm transition-colors"
              >
                {duraklatildi ? 'Devam ettir' : 'Duraklat'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </>
  )
}
