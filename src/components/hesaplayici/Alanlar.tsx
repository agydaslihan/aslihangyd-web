'use client'

import { useId, type ReactNode } from 'react'

import { sinif } from '@/lib/sinif'

/**
 * Hesaplayıcı form alanları.
 *
 * Sayı girişi kararları:
 * - `inputMode="decimal"` — mobilde sayı klavyesi açılır ama `type="number"`
 *   kullanılmıyor: Chrome'da kaydırma tekerleği değeri kazara değiştiriyor
 *   ve Türkçe ondalık ayracı (virgül) ile çakışıyor.
 * - Değer metin olarak tutulup ayrıştırılıyor; kullanıcı "4.800.000" veya
 *   "4800000" yazabilir, ikisi de çalışır.
 */

/** "4.800.000" veya "4800000,50" gibi Türkçe yazımı sayıya çevirir. */
export function sayiyaCevir(metin: string): number | null {
  const temiz = metin.trim().replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
  if (temiz === '') return null
  const sayi = Number(temiz)
  return Number.isFinite(sayi) ? sayi : null
}

const bicimlendirici = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 })

/** Girilen değeri binlik ayraçlı gösterir. */
export function sayiyiYaz(deger: number | null): string {
  return deger === null ? '' : bicimlendirici.format(deger)
}

export function SayiAlani({
  etiket,
  deger,
  onDegisim,
  birim,
  ipucu,
  yerTutucu,
  bicimli = true,
}: {
  etiket: string
  deger: string
  onDegisim: (yeni: string) => void
  /** Alanın sağında görünen birim: ₺, %, ay, m² */
  birim?: string
  ipucu?: string
  yerTutucu?: string
  /** Odaktan çıkınca binlik ayraç uygula. Faiz/oran alanlarında kapatılır. */
  bicimli?: boolean
}) {
  const id = useId()
  const ipucuId = `${id}-ipucu`

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {etiket}
      </label>

      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={deger}
          placeholder={yerTutucu}
          aria-describedby={ipucu ? ipucuId : undefined}
          onChange={(olay) => onDegisim(olay.target.value)}
          onBlur={(olay) => {
            if (!bicimli) return
            const sayi = sayiyaCevir(olay.target.value)
            if (sayi !== null) onDegisim(sayiyiYaz(sayi))
          }}
          className={sinif(
            'border-cizgi bg-yuzey rounded-yumusak focus:border-lacivert rakam min-h-11 w-full border px-3.5 text-[0.9375rem] transition-colors',
            birim && 'pr-12',
          )}
        />
        {birim ? (
          <span
            className="text-murekkep-3 pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm"
            aria-hidden
          >
            {birim}
          </span>
        ) : null}
      </div>

      {ipucu ? (
        <p id={ipucuId} className="text-murekkep-3 text-mikro">
          {ipucu}
        </p>
      ) : null}
    </div>
  )
}

export function SecimAlani<T extends string>({
  etiket,
  deger,
  onDegisim,
  secenekler,
  ipucu,
}: {
  etiket: string
  deger: T
  onDegisim: (yeni: T) => void
  secenekler: readonly { readonly value: T; readonly label: string }[]
  ipucu?: string
}) {
  const id = useId()

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {etiket}
      </label>
      <select
        id={id}
        value={deger}
        onChange={(olay) => onDegisim(olay.target.value as T)}
        className="border-cizgi bg-yuzey rounded-yumusak focus:border-lacivert min-h-11 w-full border px-3 text-[0.9375rem]"
      >
        {secenekler.map((secenek) => (
          <option key={secenek.value} value={secenek.value}>
            {secenek.label}
          </option>
        ))}
      </select>
      {ipucu ? <p className="text-murekkep-3 text-mikro">{ipucu}</p> : null}
    </div>
  )
}

export function OnayAlani({
  etiket,
  secili,
  onDegisim,
}: {
  etiket: string
  secili: boolean
  onDegisim: (yeni: boolean) => void
}) {
  const id = useId()

  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={secili}
        onChange={(olay) => onDegisim(olay.target.checked)}
        className="accent-lacivert mt-0.5 size-4.5 shrink-0"
      />
      <label htmlFor={id} className="cursor-pointer text-sm leading-snug">
        {etiket}
      </label>
    </div>
  )
}

/** Sonuç satırı — etiket solda, rakam sağda, hizalı. */
export function SonucSatiri({
  etiket,
  deger,
  aciklama,
  vurgulu = false,
  ton = 'notr',
}: {
  etiket: string
  deger: ReactNode
  aciklama?: string
  vurgulu?: boolean
  ton?: 'notr' | 'artis' | 'azalis'
}) {
  const tonlar = {
    notr: '',
    artis: 'text-artis',
    azalis: 'text-azalis',
  } as const

  return (
    <div
      className={sinif(
        'flex items-baseline justify-between gap-4 py-2.5',
        vurgulu && 'border-cizgi border-t pt-3',
      )}
    >
      <div className="min-w-0">
        <dt className={sinif('text-sm', vurgulu ? 'font-medium' : 'text-murekkep-2')}>{etiket}</dt>
        {aciklama ? <p className="text-murekkep-3 text-mikro">{aciklama}</p> : null}
      </div>
      <dd
        className={sinif(
          'rakam shrink-0 text-right font-medium',
          vurgulu ? 'text-lg' : 'text-[0.9375rem]',
          tonlar[ton],
        )}
      >
        {deger}
      </dd>
    </div>
  )
}
