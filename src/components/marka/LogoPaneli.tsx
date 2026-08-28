'use client'

import { useAllFormFields } from '@payloadcms/ui'
import { useEffect, useMemo, useState } from 'react'

import './marka.css'

/**
 * Logo çerçevesinin canlı önizlemesi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ÖNİZLEME OLMADAN BU AYARLAR KÖR AYARDIR.
 *
 * "Logo yüksekliği 52 px" bir sayı; ekranda ne olduğunu ancak kaydedip
 * siteye bakınca görürsünüz. Kaydet–bak–geri dön döngüsü üç turda
 * insanı bıktırır ve ayar bir daha açılmaz.
 *
 * Burası aynı sayıları YAZMADAN gösteriyor: iki bant (açık ve koyu),
 * gerçek ölçülerle, gerçek boşlukla.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ HAM HEX YEDEĞİ DE YOK. `var(--theme-elevation-0, #fff)` yazmak
 * masumdu ama tasarım disiplini denetimi haklı olarak yakaladı: panel
 * daima Payload'ın admin'i içinde çalışıyor ve o değişkenler orada her
 * zaman tanımlı. Yedek, olmayan bir duruma karşı yazılmış ölü koddu.
 *
 * ⚠️ SİTENİN KENDİ CSS'İ BURADA YOK. Panel Payload'ın kendi stil dünyasında
 * çalışıyor; `--color-*` jetonları burada tanımlı değil. Bantların rengi bu
 * yüzden panelin kendi değişkenlerinden alınıyor — birebir aynı olmayabilir
 * ama sorulan soru renk değil ÖLÇÜ.
 *
 * ⚠️ Görsel adresi form durumundan okunuyor. Yeni yüklenen bir logo henüz
 * kaydedilmemişse Payload yine de yükleme sonrası kimliği veriyor; adres
 * `/api/medya/file/...` üzerinden çözülüyor.
 */

const ARALIK = { enAz: 32, enCok: 72 } as const

function sayi(deger: unknown, varsayilan: number): number {
  const n = typeof deger === 'number' ? deger : Number(deger)
  return Number.isFinite(n) ? n : varsayilan
}

function Bant({
  baslik,
  zemin,
  metin,
  yukseklik,
  bosluk,
  hizalama,
  adres,
  ad,
}: {
  baslik: string
  zemin: string
  metin: string
  yukseklik: number
  bosluk: number
  hizalama: 'sol' | 'orta'
  adres: string | null
  ad: string
}) {
  return (
    <div>
      <p className="marka-panel__not" style={{ marginBottom: '.35rem' }}>
        {baslik} — {yukseklik} px
      </p>
      <div
        style={{
          background: zemin,
          color: metin,
          borderRadius: '.5rem',
          padding: '1rem',
          display: 'flex',
          justifyContent: hizalama === 'orta' ? 'center' : 'flex-start',
          alignItems: 'center',
          minHeight: `${yukseklik + bosluk * 2 + 32}px`,
        }}
      >
        {adres === null ? (
          /* ⚠️ Logo yoksa metin yedeği — sitedeki davranışın aynısı. */
          <span style={{ fontSize: `${Math.round(yukseklik * 0.45)}px`, fontWeight: 500 }}>
            {ad}
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={adres}
            alt=""
            style={{
              height: `${yukseklik}px`,
              padding: `${bosluk}px`,
              width: 'auto',
              maxWidth: '14rem',
              objectFit: 'contain',
            }}
          />
        )}
      </div>
    </div>
  )
}

export function LogoPaneli() {
  const [alanlar] = useAllFormFields()
  const [adresler, setAdresler] = useState<Record<string, string>>({})

  const veri = useMemo(() => {
    const oku = (ad: string) => alanlar[ad]?.value

    const gorselAdresi = (ad: string): string | null => {
      const deger = oku(ad)
      if (deger === null || deger === undefined || deger === '') return null
      /**
       * ⚠️ Alan bazen kimlik, bazen çözülmüş belge taşıyor (yükleme sonrası
       * Payload belgeyi geçiyor). İkisi de karşılanmalı; yoksa yeni yüklenen
       * logo önizlemede görünmez ve kullanıcı "yüklenmedi" sanır.
       */
      if (typeof deger === 'object' && deger !== null && 'url' in deger) {
        const url = (deger as { url?: unknown }).url
        return typeof url === 'string' ? url : null
      }
      /**
       * ⚠️ SAYFA AÇILIŞINDA ALAN YALNIZCA KİMLİK TAŞIYOR.
       *
       * Payload, yeni yüklenen dosyada çözülmüş belgeyi veriyor ama kayıtlı
       * bir ilişkide yalnızca kimliği. İlkini karşılayıp ikincisini
       * atlayan bir önizleme, logo YÜKLÜYKEN bile metin yedeğini gösterir
       * ve kullanıcıya "logo görünmüyor" dedirtir — tam da bu ekranın
       * çözmesi gereken sorunun kendisi.
       *
       * Kimlik durumunda adres ayrıca çözülüyor (`adresler` durumu).
       */
      if (typeof deger === 'number' || typeof deger === 'string') return `#${deger}`
      return null
    }

    return {
      ad: String(oku('siteAdi') ?? 'Aslıhan GYD'),
      logo: gorselAdresi('logo'),
      logoKoyu: gorselAdresi('logoKoyu') ?? gorselAdresi('logo'),
      baslikBoy: sayi(oku('baslikLogoYuksekligi'), 48),
      altbilgiBoy: sayi(oku('altbilgiLogoYuksekligi'), 56),
      bosluk: sayi(oku('logoBoslugu'), 0),
      hizalama: oku('logoHizalamasi') === 'orta' ? ('orta' as const) : ('sol' as const),
      altbilgideLogo: oku('altbilgideLogo') !== false,
    }
  }, [alanlar])

  /**
   * Kimlikleri adrese çevirir.
   *
   * ⚠️ Tek tek ve yalnızca bilinmeyenler için isteniyor; her tuşa basışta
   * medya ucunu dövmek panelin kendisini yavaşlatırdı.
   */
  useEffect(() => {
    const kimlikler = [veri.logo, veri.logoKoyu]
      .filter((d): d is string => typeof d === 'string' && d.startsWith('#'))
      .map((d) => d.slice(1))
      .filter((kimlik) => adresler[kimlik] === undefined)

    if (kimlikler.length === 0) return
    let iptal = false

    void Promise.all(
      kimlikler.map(async (kimlik) => {
        try {
          const yanit = await fetch(`/api/medya/${kimlik}`)
          if (!yanit.ok) return [kimlik, ''] as const
          const belge = (await yanit.json()) as { url?: unknown }
          return [kimlik, typeof belge.url === 'string' ? belge.url : ''] as const
        } catch {
          return [kimlik, ''] as const
        }
      }),
    ).then((cozulen) => {
      if (iptal) return
      setAdresler((once) => ({ ...once, ...Object.fromEntries(cozulen) }))
    })

    return () => {
      iptal = true
    }
  }, [veri.logo, veri.logoKoyu, adresler])

  /** `#12` biçimindeki kimliği çözülmüş adrese çevirir. */
  const coz = (deger: string | null): string | null => {
    if (deger === null) return null
    if (!deger.startsWith('#')) return deger
    const adres = adresler[deger.slice(1)]
    return adres === undefined || adres === '' ? null : adres
  }

  const bandDisi =
    veri.baslikBoy < ARALIK.enAz ||
    veri.baslikBoy > ARALIK.enCok ||
    veri.altbilgiBoy < ARALIK.enAz ||
    veri.altbilgiBoy > ARALIK.enCok

  return (
    <section className="marka-panel__bolum">
      <h3 className="marka-panel__baslik">Logo önizleme</h3>
      <p className="marka-panel__not">
        Ölçüler anında güncellenir. Kaydetmeden hiçbir şey yayına girmez.
      </p>

      {bandDisi ? (
        <p className="marka-panel__not">
          ⚠️ Yükseklik {ARALIK.enAz}–{ARALIK.enCok} px aralığının dışında. Kaydedilse bile site bu
          aralığa kırpar — önizleme girdiğiniz sayıyı gösteriyor, sitenin göstereceğini değil.
        </p>
      ) : null}

      <div style={{ display: 'grid', gap: '1rem' }}>
        <Bant
          baslik="Başlık (masaüstü)"
          zemin="var(--theme-elevation-0)"
          metin="var(--theme-elevation-1000)"
          yukseklik={veri.baslikBoy}
          bosluk={veri.bosluk}
          /* ⚠️ Başlıkta hiza daima SOL: sağında gezinme var, ortalamak menüyü iterdi. */
          hizalama="sol"
          adres={coz(veri.logo)}
          ad={veri.ad}
        />
        <Bant
          baslik={veri.altbilgideLogo ? 'Altbilgi' : 'Altbilgi (logo kapalı — site adı)'}
          zemin="var(--theme-elevation-900)"
          metin="var(--theme-elevation-0)"
          yukseklik={veri.altbilgiBoy}
          bosluk={veri.bosluk}
          hizalama={veri.hizalama}
          adres={veri.altbilgideLogo ? coz(veri.logoKoyu) : null}
          ad={veri.ad}
        />
      </div>

      <p className="marka-panel__not">
        ⚠️ Başlıkta logo mobilde otomatik olarak %20 küçülür — panelde girilen sayı masaüstü
        ölçüsüdür. Aynı sayıyı telefonda uygulamak menü düğmesini ekrandan iterdi.
      </p>
    </section>
  )
}

export default LogoPaneli
