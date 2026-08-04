'use client'

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
}: {
  eylem: (oncekiDurum: FormDurumu, form: FormData) => Promise<FormDurumu>
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
        <h2 className="text-xl leading-tight">{baslik}</h2>
        {aciklama ? (
          <p className="text-murekkep-2 mt-2 text-sm leading-relaxed">{aciklama}</p>
        ) : null}
      </div>

      {durum.genelHata ? (
        <div
          ref={ozetRef}
          tabIndex={-1}
          role="alert"
          className="border-azalis/30 bg-azalis-acik text-azalis rounded-yumusak border p-4 text-sm"
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
      <p className="text-murekkep-3 -mt-3 text-mikro">
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
            <Link
              href="/kvkk"
              target="_blank"
              className="text-lacivert underline underline-offset-2"
            >
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

      <GonderButonu />

      <p className="text-murekkep-3 text-mikro leading-relaxed">
        Verileriniz yalnızca bu talebin karşılanması için kullanılır, üçüncü kişilerle paylaşılmaz
        ve saklama süresi dolduğunda otomatik olarak silinir.
      </p>
    </form>
  )
}

function GonderButonu() {
  const { pending } = useFormStatus()

  return (
    <Buton type="submit" boyut="buyuk" disabled={pending} tamGenislik>
      {pending ? 'Gönderiliyor…' : 'Talebi gönder'}
    </Buton>
  )
}

function BasariEkrani() {
  return (
    <div
      role="status"
      className="border-artis/30 bg-artis-acik rounded-yumusak flex flex-col items-center gap-3 border p-8 text-center"
    >
      <DogrulanmisIkon width={32} height={32} className="text-artis" />
      <h2 className="text-xl leading-tight">Talebiniz bize ulaştı</h2>
      <p className="text-murekkep-2 max-w-md text-sm leading-relaxed">
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
    'w-full rounded-yumusak border bg-yuzey px-3.5 py-2.5 text-[0.9375rem]',
    'focus:border-lacivert transition-colors',
    hata ? 'border-azalis' : 'border-cizgi',
  )

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {etiket}
        {gerekli ? (
          <span className="text-azalis ml-0.5" aria-hidden>
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
        <p id={ipucuId} className="text-murekkep-3 text-mikro">
          {ipucu}
        </p>
      ) : null}
      {hata ? (
        <p id={hataId} className="text-azalis text-mikro font-medium">
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
      <label htmlFor={id} className="text-sm font-medium">
        {etiket}
      </label>
      <select
        id={id}
        name={ad}
        defaultValue={varsayilan}
        aria-describedby={hata ? hataId : undefined}
        aria-invalid={hata ? true : undefined}
        className={sinif(
          'rounded-yumusak bg-yuzey focus:border-lacivert min-h-11 w-full border px-3 text-[0.9375rem]',
          hata ? 'border-azalis' : 'border-cizgi',
        )}
      >
        {TALEP_TIPLERI.map((secenek) => (
          <option key={secenek.value} value={secenek.value}>
            {secenek.label}
          </option>
        ))}
      </select>
      {hata ? (
        <p id={hataId} className="text-azalis text-mikro font-medium">
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
        <label htmlFor={id} className="text-murekkep-2 cursor-pointer text-sm leading-relaxed">
          {etiket}
        </label>
      </div>
      {hata ? (
        <p id={hataId} className="text-azalis ml-7.5 text-mikro font-medium">
          {hata}
        </p>
      ) : null}
    </div>
  )
}
