'use client'

import Link from 'next/link'
import Script from 'next/script'
import { useActionState, useEffect, useId, useRef } from 'react'
import { useFormStatus } from 'react-dom'

import { Buton } from '@/components/ui/Buton'
import { DogrulanmisIkon, UyariIkon } from '@/components/ui/Ikon'
import { DENEYIM_SECENEKLERI } from '@/lib/danisman/secenekler'
import type { BasvuruDurumu } from '@/lib/danisman/sema'
import { sinif } from '@/lib/sinif'

/**
 * Danışman başvuru formu.
 *
 * Talep formuyla aynı erişilebilirlik kalıbı: hatalar alanın hemen
 * altında ve `aria-describedby` ile bağlı, hata özetine odak taşınıyor,
 * başarı ekranı formun yerini alıyor.
 *
 * ⚠️ KVKK onayı ayrı ve zorunlu. Pazarlama onayı bu formda HİÇ YOK: bir
 * iş başvurusundan pazarlama izni istemek, farklı amaçlı iki işlemeyi
 * aynı kutuya sıkıştırmak olurdu.
 */

const BASLANGIC: BasvuruDurumu = { basarili: false }

export function BasvuruFormu({
  eylem,
  turnstileSiteAnahtari,
}: {
  eylem: (oncekiDurum: BasvuruDurumu, form: FormData) => Promise<BasvuruDurumu>
  /** Boşsa Turnstile widget'ı hiç render edilmez. */
  turnstileSiteAnahtari: string
}) {
  const [durum, gonder] = useActionState(eylem, BASLANGIC)
  const ozetRef = useRef<HTMLDivElement>(null)

  // Hata olduğunda odağı özete taşı: klavye ve ekran okuyucu kullanıcısı
  // neyin yanlış gittiğini kaçırmasın.
  useEffect(() => {
    if (durum.hatalar || durum.genelHata) ozetRef.current?.focus()
  }, [durum])

  if (durum.basarili) {
    return (
      <div className="bg-basari-zemin rounded-kart flex flex-col gap-2 p-6">
        <p className="text-basari inline-flex items-center gap-2 font-medium">
          <DogrulanmisIkon width={18} height={18} />
          Başvurunuz bize ulaştı
        </p>
        <p className="text-metin-2 text-govde-kucuk olcu">
          Uygun bir pozisyon açıldığında ya da başvurunuzu değerlendirdiğimizde sizinle iletişime
          geçeceğiz. Acil bir konu varsa WhatsApp&apos;tan da yazabilirsiniz.
        </p>
      </div>
    )
  }

  return (
    <form action={gonder} className="flex flex-col gap-5" noValidate>
      {durum.genelHata ? (
        <div
          ref={ozetRef}
          tabIndex={-1}
          role="alert"
          className="bg-hata-zemin text-hata rounded-kart text-govde-kucuk flex items-start gap-2 p-4"
        >
          <UyariIkon width={16} height={16} className="mt-0.5 shrink-0" />
          <span>{durum.genelHata}</span>
        </div>
      ) : null}

      <Alan etiket="Ad soyad" ad="ad" hata={durum.hatalar?.ad} zorunlu>
        {(ozellikler) => <input type="text" autoComplete="name" {...ozellikler} />}
      </Alan>

      <div className="grid gap-5 sm:grid-cols-2">
        <Alan etiket="Telefon" ad="telefon" hata={durum.hatalar?.telefon} zorunlu>
          {(ozellikler) => (
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="05XX XXX XX XX"
              {...ozellikler}
            />
          )}
        </Alan>

        <Alan etiket="E-posta" ad="email" hata={durum.hatalar?.email} zorunlu>
          {(ozellikler) => <input type="email" autoComplete="email" {...ozellikler} />}
        </Alan>
      </div>

      <Alan etiket="Gayrimenkul deneyimi" ad="deneyim" hata={durum.hatalar?.deneyim} zorunlu>
        {(ozellikler) => (
          <select defaultValue="" {...ozellikler}>
            <option value="" disabled>
              Seçiniz
            </option>
            {DENEYIM_SECENEKLERI.map((secenek) => (
              <option key={secenek.value} value={secenek.value}>
                {secenek.label}
              </option>
            ))}
          </select>
        )}
      </Alan>

      <label className="flex min-h-11 cursor-pointer items-center gap-2.5">
        <input type="checkbox" name="mykBelgesi" className="accent-vurgu size-4 shrink-0" />
        <span className="text-govde-kucuk">
          Mesleki yeterlilik (MYK) belgem var
          <span className="text-metin-3 block text-mikro">
            Taşınmaz Ticareti / Emlak Danışmanı belgesi. Yoksa da başvurabilirsiniz.
          </span>
        </span>
      </label>

      <Alan etiket="Eklemek istedikleriniz" ad="mesaj" hata={durum.hatalar?.mesaj}>
        {(ozellikler) => <textarea rows={4} {...ozellikler} />}
      </Alan>

      {/* Bal küpü — göz görmez, ekran okuyucu atlar, bot doldurur. */}
      <div className="yalnizca-okuyucu" aria-hidden>
        <label htmlFor="websitesi">Web siteniz (bu alanı boş bırakın)</label>
        <input id="websitesi" name="websitesi" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <label className="flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          name="kvkkOnay"
          className="accent-vurgu mt-1 size-4 shrink-0"
          aria-describedby={durum.hatalar?.kvkkOnay ? 'kvkk-hata' : undefined}
        />
        <span className="text-govde-kucuk">
          <Link href="/kvkk" className="text-vurgu underline underline-offset-2">
            Aydınlatma metnini
          </Link>{' '}
          okudum; başvurumun değerlendirilmesi için kişisel verilerimin işlenmesini kabul ediyorum.
          {durum.hatalar?.kvkkOnay ? (
            <span id="kvkk-hata" className="text-hata mt-1 block text-mikro">
              {durum.hatalar.kvkkOnay}
            </span>
          ) : null}
        </span>
      </label>

      {turnstileSiteAnahtari !== '' ? (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            strategy="lazyOnload"
          />
          <div className="cf-turnstile" data-sitekey={turnstileSiteAnahtari} data-language="tr" />
        </>
      ) : null}

      <GonderButonu />
    </form>
  )
}

function GonderButonu() {
  const { pending } = useFormStatus()

  return (
    <Buton
      type="submit"
      gorunum="lacivert"
      boyut="buyuk"
      pasif={pending}
      pasifSebebi={pending ? 'Başvurunuz gönderiliyor, sayfayı kapatmayın.' : undefined}
      tamGenislik
    >
      {pending ? 'Gönderiliyor…' : 'Başvuruyu gönder'}
    </Buton>
  )
}

/** Etiket + giriş + hata üçlüsü; `aria-describedby` bağını kurar. */
function Alan({
  etiket,
  ad,
  hata,
  zorunlu = false,
  children,
}: {
  etiket: string
  ad: string
  hata?: string
  zorunlu?: boolean
  children: (ozellikler: {
    id: string
    name: string
    className: string
    'aria-describedby'?: string
    'aria-invalid'?: true
  }) => React.ReactNode
}) {
  const id = useId()
  const hataId = `${id}-hata`

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-govde-kucuk font-medium">
        {etiket}
        {zorunlu ? (
          <span className="text-metin-3 font-normal"> (zorunlu)</span>
        ) : (
          <span className="text-metin-3 font-normal"> (isteğe bağlı)</span>
        )}
      </label>

      {children({
        id,
        name: ad,
        className: sinif(
          'rounded-buton bg-yuzey text-govde min-h-11 w-full border-[0.5px] px-3 py-2',
          'transition-colors duration-[150ms]',
          hata ? 'border-hata' : 'border-kenar-giris',
        ),
        ...(hata ? { 'aria-describedby': hataId, 'aria-invalid': true as const } : {}),
      })}

      {hata ? (
        <p id={hataId} className="text-hata text-mikro">
          {hata}
        </p>
      ) : null}
    </div>
  )
}
