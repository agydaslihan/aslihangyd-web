'use client'

import Script from 'next/script'

import Link from 'next/link'
import { useActionState, useEffect, useId, useRef } from 'react'
import { useFormStatus } from 'react-dom'

import { Buton } from '@/components/ui/Buton'
import { DogrulanmisIkon } from '@/components/ui/Ikon'
import { TALEP_TIPLERI } from '@/lib/secenekler'
import { sinif } from '@/lib/sinif'
import type { FormDurumu } from '@/lib/talep/sema'

/**
 * Talep formu.
 *
 * Kararlar:
 * - Alan sayısı asgaride tutuldu. Her ek alan dönüşümü düşürür; bütçe,
 *   kriter gibi ayrıntılar görüşmede alınır.
 * - Hata mesajları alanın hemen altında ve `aria-describedby` ile bağlı.
 * - Gönderim sırasında buton kilitlenir ve metni değişir; çift gönderim
 *   engellenir.
 * - Başarı ekranı formun yerini alır — "gönderildi mi?" belirsizliği kalmaz.
 * - KVKK onayı ayrı ve zorunlu; pazarlama onayı ayrı ve isteğe bağlı.
 *   İkisini tek kutuda birleştirmek KVKK açısından geçersiz onaydır.
 */

const BASLANGIC: FormDurumu = { basarili: false }

export function TalepFormu({
  eylem,
  varsayilanTip = 'genel',
  ilgiliIlan,
  ilgiliMahalle,
  baslik = 'Bize yazın',
  aciklama,
  turnstileSiteAnahtari = '',
}: {
  eylem: (oncekiDurum: FormDurumu, form: FormData) => Promise<FormDurumu>
  /**
   * Turnstile site anahtarı. Boşsa widget hiç basılmaz ve form yine
   * çalışır — anahtar girilene kadar formu kapatmak, kimsenin
   * ulaşamaması demek olurdu.
   */
  turnstileSiteAnahtari?: string
  varsayilanTip?: string
  ilgiliIlan?: string
  ilgiliMahalle?: string
  baslik?: string
  aciklama?: string
}) {
  const [durum, gonder] = useActionState(eylem, BASLANGIC)
  const ozetRef = useRef<HTMLDivElement>(null)

  // Hata olduğunda odağı hata özetine taşı: ekran okuyucu ve klavye
  // kullanıcısı neyin yanlış gittiğini kaçırmasın.
  useEffect(() => {
    if (durum.hatalar || durum.genelHata) ozetRef.current?.focus()
  }, [durum])

  if (durum.basarili) {
    return <BasariEkrani />
  }

  return (
    <form action={gonder} className="flex flex-col gap-5" noValidate>
      <div>
        <h2 className="text-baslik-3 leading-tight">{baslik}</h2>
        {aciklama ? (
          <p className="text-metin-2 mt-2 text-govde-kucuk leading-relaxed">{aciklama}</p>
        ) : null}
      </div>

      {durum.genelHata ? (
        <div
          ref={ozetRef}
          tabIndex={-1}
          role="alert"
          className="border-hata/30 bg-hata-zemin text-hata rounded-kart border-[0.5px] p-4 text-govde-kucuk"
        >
          {durum.genelHata}
        </div>
      ) : null}

      <input type="hidden" name="ilgiliIlan" value={ilgiliIlan ?? ''} />
      <input type="hidden" name="ilgiliMahalle" value={ilgiliMahalle ?? ''} />

      {/* Bal küpü: ekran okuyucudan da gizli, sekme sırasından çıkarılmış. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="websitesi">Web siteniz (bu alanı boş bırakın)</label>
        <input id="websitesi" name="websitesi" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <Alan
        ad="adSoyad"
        etiket="Ad soyad"
        gerekli
        otomatikTamamla="name"
        hata={durum.hatalar?.adSoyad}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Alan
          ad="telefon"
          etiket="Telefon"
          tur="tel"
          ipucu="05XX XXX XX XX"
          otomatikTamamla="tel"
          hata={durum.hatalar?.telefon}
        />
        <Alan
          ad="eposta"
          etiket="E-posta"
          tur="email"
          otomatikTamamla="email"
          hata={durum.hatalar?.eposta}
        />
      </div>
      <p className="text-metin-3 -mt-3 text-mikro">
        Telefon veya e-postadan en az birini yazmanız yeterli.
      </p>

      <SecimAlani
        ad="tip"
        etiket="Ne hakkında yazıyorsunuz?"
        varsayilan={varsayilanTip}
        hata={durum.hatalar?.tip}
      />

      <Alan
        ad="mesaj"
        etiket="Mesajınız"
        cokSatirli
        ipucu="Aradığınız taşınmazı, bütçenizi veya sorunuzu kısaca anlatın."
        hata={durum.hatalar?.mesaj}
      />

      <OnayKutusu
        ad="kvkkOnay"
        hata={durum.hatalar?.kvkkOnay}
        etiket={
          <>
            <Link href="/kvkk" target="_blank" className="text-vurgu underline underline-offset-2">
              KVKK aydınlatma metnini
            </Link>{' '}
            okudum; iletişim bilgilerimin bu talep kapsamında işlenmesini kabul ediyorum.
          </>
        }
      />

      <OnayKutusu
        ad="pazarlamaOnayi"
        etiket="Çorlu gayrimenkul raporlarını ve yeni portföy bildirimlerini e-posta ile almak istiyorum. (isteğe bağlı)"
      />

      {/* ⚠️ Bot koruması. 13 Ağustos 2026'ya kadar bu formda Turnstile
          yoktu: widget yalnızca /danisman-ol'a bağlıydı ve o bölüm kapalı
          olduğu için üretimde çalışan tek public form korumasızdı. */}
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

      <p className="text-metin-3 text-mikro leading-relaxed">
        Verileriniz yalnızca bu talebin karşılanması için kullanılır, üçüncü kişilerle paylaşılmaz
        ve saklama süresi dolduğunda otomatik olarak silinir.
      </p>
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
      pasifSebebi={pending ? 'Talebiniz gönderiliyor, sayfayı kapatmayın.' : undefined}
      tamGenislik
    >
      {pending ? 'Gönderiliyor…' : 'Talebi gönder'}
    </Buton>
  )
}

function BasariEkrani() {
  return (
    <div
      role="status"
      className="border-basari/30 bg-basari-zemin rounded-kart flex flex-col items-center gap-3 border-[0.5px] p-8 text-center"
    >
      <DogrulanmisIkon width={32} height={32} className="text-basari" />
      <h2 className="text-baslik-3 leading-tight">Talebiniz bize ulaştı</h2>
      <p className="text-metin-2 max-w-md text-govde-kucuk leading-relaxed">
        En kısa sürede size döneceğiz. Acele bir konuysa WhatsApp&apos;tan da yazabilirsiniz —
        genellikle oradan daha hızlı yanıt veriyoruz.
      </p>
    </div>
  )
}

function Alan({
  ad,
  etiket,
  tur = 'text',
  ipucu,
  hata,
  gerekli = false,
  cokSatirli = false,
  otomatikTamamla,
}: {
  ad: string
  etiket: string
  tur?: string
  ipucu?: string
  hata?: string
  gerekli?: boolean
  cokSatirli?: boolean
  otomatikTamamla?: string
}) {
  const id = useId()
  const ipucuId = `${id}-ipucu`
  const hataId = `${id}-hata`
  const aciklayanlar = [ipucu ? ipucuId : null, hata ? hataId : null].filter(Boolean).join(' ')

  const siniflar = sinif(
    'w-full rounded-buton border-[0.5px] bg-yuzey px-3.5 py-2.5 text-govde',
    'focus:border-vurgu transition-colors',
    hata ? 'border-hata' : 'border-kenar-giris',
  )

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-govde-kucuk font-medium">
        {etiket}
        {gerekli ? (
          <span className="text-hata ml-0.5" aria-hidden>
            *
          </span>
        ) : null}
      </label>

      {cokSatirli ? (
        <textarea
          id={id}
          name={ad}
          rows={4}
          aria-describedby={aciklayanlar || undefined}
          aria-invalid={hata ? true : undefined}
          className={sinif(siniflar, 'min-h-28 resize-y')}
        />
      ) : (
        <input
          id={id}
          name={ad}
          type={tur}
          autoComplete={otomatikTamamla}
          aria-describedby={aciklayanlar || undefined}
          aria-invalid={hata ? true : undefined}
          className={sinif(siniflar, 'min-h-11')}
        />
      )}

      {ipucu ? (
        <p id={ipucuId} className="text-metin-3 text-mikro">
          {ipucu}
        </p>
      ) : null}
      {hata ? (
        <p id={hataId} className="text-hata text-mikro font-medium">
          {hata}
        </p>
      ) : null}
    </div>
  )
}

function SecimAlani({
  ad,
  etiket,
  varsayilan,
  hata,
}: {
  ad: string
  etiket: string
  varsayilan: string
  hata?: string
}) {
  const id = useId()
  const hataId = `${id}-hata`

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-govde-kucuk font-medium">
        {etiket}
      </label>
      <select
        id={id}
        name={ad}
        defaultValue={varsayilan}
        aria-describedby={hata ? hataId : undefined}
        aria-invalid={hata ? true : undefined}
        className={sinif(
          'rounded-buton bg-yuzey focus:border-vurgu min-h-11 w-full border-[0.5px] px-3 text-govde',
          hata ? 'border-hata' : 'border-kenar-giris',
        )}
      >
        {TALEP_TIPLERI.map((secenek) => (
          <option key={secenek.value} value={secenek.value}>
            {secenek.label}
          </option>
        ))}
      </select>
      {hata ? (
        <p id={hataId} className="text-hata text-mikro font-medium">
          {hata}
        </p>
      ) : null}
    </div>
  )
}

function OnayKutusu({ ad, etiket, hata }: { ad: string; etiket: React.ReactNode; hata?: string }) {
  const id = useId()
  const hataId = `${id}-hata`

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start gap-3">
        <input
          id={id}
          name={ad}
          type="checkbox"
          aria-describedby={hata ? hataId : undefined}
          aria-invalid={hata ? true : undefined}
          className="accent-lacivert mt-0.5 size-4.5 shrink-0"
        />
        <label
          htmlFor={id}
          className="text-metin-2 cursor-pointer text-govde-kucuk leading-relaxed"
        >
          {etiket}
        </label>
      </div>
      {hata ? (
        <p id={hataId} className="text-hata ml-7.5 text-mikro font-medium">
          {hata}
        </p>
      ) : null}
    </div>
  )
}
