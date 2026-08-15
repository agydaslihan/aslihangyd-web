'use client'

import { useField, FieldLabel } from '@payloadcms/ui'
import type { TextFieldClientProps } from 'payload'

import { gecerliHex } from '@/lib/marka/kontrastKapisi'
import { yuvaTanimi } from '@/lib/marka/yuvalar'

import './marka.css'

/**
 * Tek renk yuvası — renk seçici + hex girişi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU BİLEŞEN İSTEMCİ TARAFI VE `@payloadcms/ui` KULLANIYOR.
 *
 * Proje bugüne kadar özel panel bileşenlerini SUNUCU bileşeni olarak yazdı
 * ve `@payloadcms/ui`yi doğrudan bağımlılık yapmaktan kaçındı (bkz.
 * `GorselButceRozeti`). O kararın gerekçesi "gerekli değil" idi.
 *
 * Burada gerekli: istek "renk seçildiği ANDA kontrast gösterilsin" ve
 * "AA geçmeyen kombinasyon varsa KAYDET butonu PASİF" diyor. İkisi de
 * canlı form durumunu okumayı gerektiriyor; kaydedilmiş veriyi okuyan bir
 * sunucu bileşeniyle yapılamaz.
 * ─────────────────────────────────────────────────────────────────────────
 */
export function RenkAlani(props: TextFieldClientProps) {
  const { path, field } = props
  const { value, setValue, showError, errorMessage } = useField<string>({ path })

  // `custom` istemci alan tipinde yok ama çalışma zamanında geliyor.
  const anahtar =
    ((field as { custom?: { yuva?: string } }).custom?.yuva as string | undefined) ?? ''
  const yuva = yuvaTanimi(anahtar)
  const gecerli = gecerliHex(value)

  return (
    <div className="marka-renk">
      <FieldLabel htmlFor={`renk-${path}`} label={field.label} required={field.required} />

      <div className="marka-renk__satir">
        {/*
          ⚠️ Yerleşik `input[type=color]` bilinçli: klavyeyle erişilebilir,
          ekran okuyucularda tanımlı ve işletim sisteminin kendi seçicisini
          açıyor. Özel bir seçici yazmak, mobilde kullanılabilirliği
          düşürür ve erişilebilirliği sıfırdan üstlenmek demekti.
        */}
        <input
          id={`renk-${path}`}
          type="color"
          className="marka-renk__secici"
          value={gecerli ? value : '#000000'}
          onChange={(olay) => setValue(olay.target.value)}
          aria-label={`${String(field.label)} renk seçici`}
        />

        <input
          type="text"
          className="marka-renk__hex"
          value={value ?? ''}
          onChange={(olay) => setValue(olay.target.value.trim().toLowerCase())}
          placeholder="#000000"
          spellCheck={false}
          aria-label={`${String(field.label)} hex kodu`}
          aria-invalid={!gecerli}
        />

        {/* ⚠️ Renk tek taşıyıcı değil (WCAG 1.4.1): durum metinle de yazılı. */}
        {!gecerli ? <span className="marka-renk__uyari">Geçersiz — #rrggbb bekleniyor</span> : null}
      </div>

      {yuva?.rol === 'dekoratif' ? (
        <p className="marka-renk__not marka-renk__not--dekoratif">
          Yalnızca zemin/dekoratif — metin rengi olarak kullanılmaz, kontrast eşiği aranmaz.
        </p>
      ) : null}

      {yuva?.anahtar === 'yumusakZemin' ? (
        <p className="marka-renk__not marka-renk__not--dekoratif">
          Yalnızca zemin — üstüne metin gelir, kendisi metin rengi olamaz.
        </p>
      ) : null}

      {yuva ? <p className="marka-renk__not">{yuva.aciklama}</p> : null}

      {showError ? <p className="marka-renk__uyari">{errorMessage}</p> : null}
    </div>
  )
}
