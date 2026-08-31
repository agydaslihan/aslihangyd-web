'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

import { Buton } from '@/components/ui/Buton'
import {
  CEREZ_ONAY_ADI,
  ONAY_GECERLILIK_GUN,
  ONAY_SURUMU,
  onayYaz,
  type CerezOnayi,
} from '@/lib/kvkk/onay'

/** Altbilgideki "Çerez tercihleri" bağlantısı bu olayı tetikler. */
export const TERCIH_OLAYI = 'aslihangyd:cerez-tercihleri'

function cerezeYaz(onay: CerezOnayi) {
  const guvenli = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie =
    `${CEREZ_ONAY_ADI}=${onayYaz(onay)}` +
    `; path=/; max-age=${ONAY_GECERLILIK_GUN * 86_400}; SameSite=Lax${guvenli}`
}

export function CerezBanneri({ onayVar }: { onayVar: boolean }) {
  // Sunucu onayın olup olmadığını zaten biliyor; banner yalnızca onay
  // yokken render edilir. Bu sayede onay vermiş kullanıcıya banner'ın
  // bir an görünüp kaybolması (flash) yaşanmaz.
  const [acik, setAcik] = useState(!onayVar)
  const [ayrintili, setAyrintili] = useState(false)
  const [analitik, setAnalitik] = useState(false)
  const [pazarlama, setPazarlama] = useState(false)
  const router = useRouter()
  const basligiId = useId()
  const bantRef = useRef<HTMLDivElement | null>(null)

  /**
   * Bandın yüksekliğini sayfaya BİLDİR.
   *
   * ───────────────────────────────────────────────────────────────────────
   * ⚠️ BANT AÇIKKEN VİTRİN KISALIR — GEREKÇE ÖLÇÜMDÜR.
   *
   * Vitrin `100svh` yüksekliğinde ve içeriğini dikeyde ortalıyor. Bant ise
   * ekranın altına sabitlenmiş 236 px'lik bir kart. 1440×900'de ikisi
   * çakışıyordu: "Portföyü incele" ve "Ücretsiz değerleme" butonları
   * y=666–718 aralığında, bant y=649–885 aralığında. Yani sayfanın İLK
   * EKRANINDAKİ İKİ ÇAĞRI BUTONU DA TIKLANAMIYORDU.
   *
   * `pointer-events` düzeltmesi tıklamanın yutulmasını çözüyor ama örtmeyi
   * çözmüyor: buton bandın ARKASINDA kalıyor, görünmüyor. Doğru cevap
   * vitrini bant kadar kısaltmak — ortalanan içerik yukarı kayıyor ve
   * bandın üstünde kalıyor.
   *
   * ⚠️ Yükseklik SABİT YAZILAMAZ: bant, "ayrıntılı" görünümde kategori
   * satırlarıyla birlikte iki katına çıkıyor ve dar ekranda butonlar alt
   * alta diziliyor. Ölçülen değer yayınlanıyor, tahmin edilen değil.
   * ───────────────────────────────────────────────────────────────────────
   */
  useEffect(() => {
    const kok = document.documentElement
    const bant = bantRef.current
    if (!acik || bant === null) {
      kok.style.removeProperty('--cerez-bandi-yuksekligi')
      delete kok.dataset.cerezBandi
      return
    }

    const yaz = () => {
      // Kartın kendi yüksekliği + sarmalayıcının alt boşluğu.
      const yukseklik = Math.ceil(bant.getBoundingClientRect().height) + 32
      kok.style.setProperty('--cerez-bandi-yuksekligi', `${yukseklik}px`)
    }
    yaz()
    /**
     * ⚠️ AYRICA BİR DURUM BAYRAĞI — YALNIZCA YÜKSEKLİK YETMİYOR.
     *
     * Vitrini bant kadar kısaltmak, içeriği o boya sığdığı sürece çalışıyor.
     * 1280×720'de sığmıyor: vitrinin kendi dikey boşluğu (py-24 = 192 px) ve
     * kaydırma göstergesi, kalan 484 px'i tek başına aşıyor. Ölçüm bunu
     * gösterdi — kısaltma sonrası 1440×900 düzeldi ama 1280×720 ve mobil
     * hâlâ örtülüydü.
     *
     * Bayrak açıkken vitrin kendi boşluğunu da daraltıyor. Bant kapanınca
     * her şey aynen geri geliyor; yani bu bir kalıcı tasarım değişikliği
     * değil, bandın açık olduğu birkaç saniyeye ait bir uyarlama.
     */
    kok.dataset.cerezBandi = 'acik'

    const gozcu = new ResizeObserver(yaz)
    gozcu.observe(bant)
    return () => {
      gozcu.disconnect()
      kok.style.removeProperty('--cerez-bandi-yuksekligi')
      delete kok.dataset.cerezBandi
    }
  }, [acik, ayrintili])

  useEffect(() => {
    const ac = () => {
      setAcik(true)
      setAyrintili(true)
    }
    window.addEventListener(TERCIH_OLAYI, ac)
    return () => window.removeEventListener(TERCIH_OLAYI, ac)
  }, [])

  const kaydet = useCallback(
    (secim: { analitik: boolean; pazarlama: boolean }) => {
      cerezeYaz({
        surum: ONAY_SURUMU,
        zorunlu: true,
        analitik: secim.analitik,
        pazarlama: secim.pazarlama,
        tarih: new Date().toISOString(),
      })
      setAcik(false)
      // Sunucuyu yeniden çalıştır: onay verildiyse analitik betiği artık
      // HTML'e eklenir, geri alındıysa çıkarılır. Betik enjeksiyonu
      // istemcide değil sunucuda karara bağlı.
      router.refresh()
    },
    [router],
  )

  if (!acik) return null

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={basligiId}
      data-yazdirma="gizle"
      /**
       * ⚠️ SARMALAYICI TIKLAMA YUTMAZ — `pointer-events-none` ZORUNLU.
       *
       * Bu katman tam genişlikte (`inset-x-0`) ama GÖRÜNEN kart ortada ve
       * en fazla 48rem. Aradaki fark şeffaftır: hiçbir şey çizmez, her şeyi
       * engellerdi. 31 Ağustos 2026'da ölçüldü — bant 1425 px genişliğinde
       * ve 236 px yüksekliğinde bir tıklama duvarı kuruyordu; hero'nun iki
       * çağrı butonu tam onun altında kalıyordu ve tıklamalar bandın
       * başlığına gidiyordu.
       */
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4"
    >
      <div
        ref={bantRef}
        className="border-kenar-guclu bg-yuzey shadow-kalkik rounded-kart pointer-events-auto mx-auto max-w-3xl border-[0.5px] p-4 sm:p-6"
      >
        <h2 id={basligiId} className="text-baslik-3 leading-snug">
          Çerez tercihleriniz
        </h2>

        <p className="text-metin-2 mt-2 text-govde-kucuk leading-relaxed">
          Sitenin çalışması için gereken çerezler her zaman kullanılır. Bunların dışındaki çerezler{' '}
          <strong className="font-medium">yalnızca siz izin verirseniz</strong> yüklenir — izin
          vermezseniz ilgili betikler sayfaya hiç eklenmez.{' '}
          <Link href="/cerez-politikasi" className="text-vurgu underline underline-offset-2">
            Çerez politikası
          </Link>
        </p>

        {ayrintili ? (
          <fieldset className="border-kenar mt-5 flex flex-col gap-3 border-t-[0.5px] pt-4">
            <legend className="yalnizca-okuyucu">Çerez kategorileri</legend>

            <KategoriSatiri
              baslik="Zorunlu çerezler"
              aciklama="Oturum, güvenlik ve bu tercih ekranının hatırlanması. Kapatılamaz."
              secili
              kilitli
            />
            <KategoriSatiri
              baslik="Analitik çerezler"
              aciklama="Hangi sayfaların ilgi gördüğünü anlamamızı sağlar. Kişi bazlı takip yapılmaz."
              secili={analitik}
              onDegisim={setAnalitik}
            />
            <KategoriSatiri
              baslik="Pazarlama çerezleri"
              aciklama="Reklam ölçümleme ve yeniden pazarlama. Şu anda kullanılmıyor."
              secili={pazarlama}
              onDegisim={setPazarlama}
            />
          </fieldset>
        ) : null}

        {/*
          ⚠️ BUTONLAR MOBİLDE DE YAN YANA — ÖLÇÜLMÜŞ SEBEP.

          Alt alta dizildiklerinde bant 390×844'te 397 px oluyordu: ekranın
          %47'si. O yükseklikte bant, kaydırılan her şeyin üstünü örtüyor ve
          vitrinin çağrı butonları hiçbir kaydırma konumunda açığa
          çıkmıyordu. Yan yana dizilim bandı ~240 px'e indiriyor.

          ⚠️ Reddetme "Tümünü kabul et" ile AYNI SATIRDA ve aynı ağırlıkta:
          onayın geçerli olması için reddetmek kabul etmek kadar kolay
          olmalı. Sıra ters (`row-reverse`) çünkü kabul sağda durmalı ama
          okuma sırasında önce reddetme geliyor.
        */}
        <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-5 sm:flex-row-reverse">
          <Buton
            onClick={() => kaydet({ analitik: true, pazarlama: true })}
            sinifAdi="flex-1 sm:flex-none"
          >
            Tümünü kabul et
          </Buton>
          <Buton
            gorunum="ikincil"
            onClick={() => kaydet({ analitik: false, pazarlama: false })}
            sinifAdi="flex-1 sm:flex-none"
          >
            Yalnızca zorunlu çerezler
          </Buton>

          {ayrintili ? (
            <Buton
              gorunum="hayalet"
              onClick={() => kaydet({ analitik, pazarlama })}
              sinifAdi="sm:mr-auto"
            >
              Seçimimi kaydet
            </Buton>
          ) : (
            <Buton gorunum="hayalet" onClick={() => setAyrintili(true)} sinifAdi="sm:mr-auto">
              Tercihleri özelleştir
            </Buton>
          )}
        </div>
      </div>
    </div>
  )
}

function KategoriSatiri({
  baslik,
  aciklama,
  secili,
  kilitli = false,
  onDegisim,
}: {
  baslik: string
  aciklama: string
  secili: boolean
  kilitli?: boolean
  onDegisim?: (deger: boolean) => void
}) {
  const id = useId()

  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={secili}
        disabled={kilitli}
        onChange={(olay) => onDegisim?.(olay.target.checked)}
        className="accent-vurgu mt-0.5 size-4.5 shrink-0 disabled:opacity-60"
      />
      <label htmlFor={id} className="cursor-pointer text-govde-kucuk leading-snug">
        <span className="font-medium">{baslik}</span>
        <span className="text-metin-3 block text-mikro">{aciklama}</span>
      </label>
    </div>
  )
}

/**
 * Altbilgiden tercih ekranını yeniden açar.
 *
 * ⚠️ Renk BELİRTİLMİYOR, `currentColor` devralınıyor.
 *
 * Bu düğme koyu kakao altbilginin içinde yaşıyor ve oradaki metin rengi
 * temaya göre değişmiyor (zemin de değişmiyor). Kendi `text-*` sınıfını
 * taşısaydı altbilgi rengi değiştiğinde sessizce uyumsuz kalırdı — aynı
 * tuzağa gold rozetinde ve harita yedeklerinde düşülmüştü.
 */
export function CerezTercihleriBaglantisi() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(TERCIH_OLAYI))}
      className="underline-offset-2 transition-opacity hover:underline hover:opacity-100 opacity-90"
    >
      Çerez tercihleri
    </button>
  )
}
