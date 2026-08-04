'use client'

import { useId, type ReactNode } from 'react'

/**
 * Sihirbaz form alanları.
 *
 * ⚠️ Site tarafındaki `components/hesaplayici/Alanlar.tsx` bileşenleri
 * BİLEREK yeniden kullanılmadı. O bileşenler Tailwind sınıflarıyla sitenin
 * tasarım sistemine bağlı; sihirbaz ise Payload admin'in içinde çalışıyor ve
 * admin'in kendi temasını (koyu/açık tema, renk değişkenleri, tipografi)
 * miras almalı. Site paletini admin'e taşımak, iki tasarım sisteminin
 * ortasında kalan yamalı bir ekran üretirdi.
 *
 * Bu yüzden buradaki sınıflar `sihirbaz-*` önekli ve stilleri
 * `sihirbaz.css` içinde Payload'ın CSS değişkenleriyle yazıldı.
 */

/**
 * Alan sarmalayıcı.
 *
 * Etiket, girdiyi `<label>` içine alarak **örtük olarak** bağlar. Böylece
 * her alana ayrı `id` geçirmeye gerek kalmadan etikete tıklamak girdiyi
 * odaklar ve ekran okuyucu doğru adı seslendirir.
 *
 * Etiketi olmayan durum (`etiket=""`) yalnızca kendi etiketini taşıyan
 * onay kutuları için; orada `<label>` sarmalayıcı çift etiket üretirdi.
 */
export function Alan({
  etiket,
  hata,
  ipucu,
  gerekli = false,
  children,
}: {
  etiket: string
  hata?: string
  ipucu?: string
  gerekli?: boolean
  children: ReactNode
}) {
  const altMetin = hata ? (
    <p className="sihirbaz-hata" role="alert">
      {hata}
    </p>
  ) : ipucu ? (
    <p className="sihirbaz-ipucu">{ipucu}</p>
  ) : null

  if (etiket === '') {
    return (
      <div className="sihirbaz-alan">
        {children}
        {altMetin}
      </div>
    )
  }

  return (
    <div className="sihirbaz-alan">
      <label className="sihirbaz-etiketli">
        <span className="sihirbaz-etiket">
          {etiket}
          {gerekli ? (
            <span className="sihirbaz-gerekli" aria-label="zorunlu alan">
              *
            </span>
          ) : null}
        </span>
        {children}
      </label>
      {altMetin}
    </div>
  )
}

export function Metin({
  deger,
  onDegisim,
  yerTutucu,
  cokSatirli = false,
}: {
  deger: string
  onDegisim: (yeni: string) => void
  yerTutucu?: string
  cokSatirli?: boolean
}) {
  if (cokSatirli) {
    return (
      <textarea
        className="sihirbaz-girdi"
        rows={3}
        value={deger}
        placeholder={yerTutucu}
        onChange={(olay) => onDegisim(olay.target.value)}
      />
    )
  }

  return (
    <input
      type="text"
      className="sihirbaz-girdi"
      value={deger}
      placeholder={yerTutucu}
      autoComplete="off"
      onChange={(olay) => onDegisim(olay.target.value)}
    />
  )
}

/**
 * Sayı alanı.
 *
 * `type="number"` kullanılmıyor: Chrome'da kaydırma tekerleği değeri kazara
 * değiştiriyor. `inputMode="decimal"` mobilde sayı klavyesini açar.
 */
export function Sayi({
  deger,
  onDegisim,
  birim,
}: {
  deger: string
  onDegisim: (yeni: string) => void
  birim?: string
}) {
  return (
    <div className="sihirbaz-birimli">
      <input
        type="text"
        inputMode="decimal"
        className="sihirbaz-girdi"
        value={deger}
        autoComplete="off"
        onChange={(olay) => {
          // Yalnızca rakam, nokta ve eksi kabul edilir; kullanıcı harf
          // yazdığında sessizce yok sayılır.
          const temiz = olay.target.value.replace(/[^\d.-]/g, '')
          onDegisim(temiz)
        }}
      />
      {birim ? (
        <span className="sihirbaz-birim" aria-hidden>
          {birim}
        </span>
      ) : null}
    </div>
  )
}

export function Secim({
  deger,
  onDegisim,
  secenekler,
  bosEtiket,
}: {
  deger: string
  onDegisim: (yeni: string) => void
  secenekler: readonly { readonly value: string; readonly label: string }[]
  bosEtiket?: string
}) {
  return (
    <select
      className="sihirbaz-girdi"
      value={deger}
      onChange={(olay) => onDegisim(olay.target.value)}
    >
      {bosEtiket ? <option value="">{bosEtiket}</option> : null}
      {secenekler.map((secenek) => (
        <option key={secenek.value} value={secenek.value}>
          {secenek.label}
        </option>
      ))}
    </select>
  )
}

export function Tarih({ deger, onDegisim }: { deger: string; onDegisim: (yeni: string) => void }) {
  return (
    <input
      type="date"
      className="sihirbaz-girdi"
      value={deger}
      onChange={(olay) => onDegisim(olay.target.value)}
    />
  )
}

export function Onay({
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
    <div className="sihirbaz-onay">
      <input
        id={id}
        type="checkbox"
        checked={secili}
        onChange={(olay) => onDegisim(olay.target.checked)}
      />
      <label htmlFor={id}>{etiket}</label>
    </div>
  )
}
