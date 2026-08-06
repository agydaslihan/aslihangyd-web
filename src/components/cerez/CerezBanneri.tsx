'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useId, useState } from 'react'

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
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4"
    >
      <div className="border-kenar-guclu bg-yuzey shadow-kalkik rounded-kart mx-auto max-w-3xl border-[0.5px] p-5 sm:p-6">
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

        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse sm:items-center">
          <Buton onClick={() => kaydet({ analitik: true, pazarlama: true })} tamGenislik>
            Tümünü kabul et
          </Buton>
          <Buton
            gorunum="ikincil"
            onClick={() => kaydet({ analitik: false, pazarlama: false })}
            tamGenislik
          >
            Yalnızca zorunlu çerezler
          </Buton>

          {ayrintili ? (
            <Buton
              gorunum="hayalet"
              onClick={() => kaydet({ analitik, pazarlama })}
              sinifAdi="sm:mr-auto"
              tamGenislik
            >
              Seçimimi kaydet
            </Buton>
          ) : (
            <Buton
              gorunum="hayalet"
              onClick={() => setAyrintili(true)}
              sinifAdi="sm:mr-auto"
              tamGenislik
            >
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
        className="accent-lacivert mt-0.5 size-4.5 shrink-0 disabled:opacity-60"
      />
      <label htmlFor={id} className="cursor-pointer text-govde-kucuk leading-snug">
        <span className="font-medium">{baslik}</span>
        <span className="text-metin-3 block text-mikro">{aciklama}</span>
      </label>
    </div>
  )
}

/** Altbilgiden tercih ekranını yeniden açar. */
export function CerezTercihleriBaglantisi() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(TERCIH_OLAYI))}
      className="hover:text-metin underline-offset-2 hover:underline"
    >
      Çerez tercihleri
    </button>
  )
}
