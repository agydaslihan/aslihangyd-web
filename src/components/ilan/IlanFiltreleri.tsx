'use client'

import { useRouter, useSearchParams } from 'next/navigation'

import { gozlemOlayi } from '@/lib/olcum/istemci'
import { useId, useState, useTransition } from 'react'

import { Buton } from '@/components/ui/Buton'
import { ILAN_KATEGORILERI, ILAN_TIPLERI, ODA_SAYILARI } from '@/lib/secenekler'
import { sinif } from '@/lib/sinif'
import type { Mahalleler } from '@/payload-types'

/**
 * Portföy filtreleri.
 *
 * Durum URL'de tutulur — filtrelenmiş bir liste paylaşılabilir, geri tuşu
 * beklendiği gibi çalışır ve sunucu tarafında render edilebilir.
 *
 * JavaScript kapalıyken de çalışır: bileşen gerçek bir `<form method="get">`
 * ve gönderme butonu içerir. JavaScript varsa `useTransition` ile geçiş
 * yumuşatılır ve sayfa yenilenme hissi kaybolur.
 */
export function IlanFiltreleri({ mahalleler }: { mahalleler: Mahalleler[] }) {
  const sorgu = useSearchParams()
  const router = useRouter()
  const [gecisSuruyor, gecisBaslat] = useTransition()
  const [acik, setAcik] = useState(false)
  const bolgeId = useId()

  const mevcut = (anahtar: string) => sorgu.get(anahtar) ?? ''

  const filtreSayisi = ['tip', 'kategori', 'mahalle', 'oda', 'siralama'].filter((anahtar) =>
    sorgu.get(anahtar),
  ).length

  function degistir(anahtar: string, deger: string) {
    /**
     * ⚠️ ÖLÇÜLEN ŞEY ÖLÇÜTÜN ADI, DEĞERİ DEĞİL.
     *
     * "Fiyat filtresi kullanıldı" bilgisi Aslıhan'a hangi filtrenin işe
     * yaradığını söylüyor. Girilen DEĞERİ göndermek ise gereksiz: fiyat
     * aralıkları ayrıca ve bant olarak ölçülüyor, tam değer tek bir
     * ziyaretçiyi işaret edebilir.
     */
    if (deger) gozlemOlayi('filtre_uygulandi', anahtar)

    const yeni = new URLSearchParams(sorgu.toString())
    if (deger) yeni.set(anahtar, deger)
    else yeni.delete(anahtar)
    // Filtre değişince ilk sayfaya dön; 7. sayfada 2 sonuç göstermek kırık hissi verir.
    yeni.delete('sayfa')

    const metin = yeni.toString()
    gecisBaslat(() => router.push(metin ? `/portfoy?${metin}` : '/portfoy', { scroll: false }))
  }

  return (
    <form
      method="get"
      action="/portfoy"
      className={sinif(
        'border-kenar bg-yuzey rounded-kart border-[0.5px] p-4 transition-opacity sm:p-5',
        gecisSuruyor && 'opacity-60',
      )}
    >
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <button
          type="button"
          onClick={() => setAcik((onceki) => !onceki)}
          aria-expanded={acik}
          aria-controls={bolgeId}
          className="inline-flex min-h-11 items-center gap-2 text-govde-kucuk font-medium"
        >
          Filtreler
          {filtreSayisi > 0 ? (
            <span className="bg-koyu-bant rakam inline-flex size-5 items-center justify-center rounded-full text-mikro text-koyu-bant-metin">
              {filtreSayisi}
            </span>
          ) : null}
        </button>

        {filtreSayisi > 0 ? (
          <Buton href="/portfoy" gorunum="hayalet" boyut="kucuk">
            Temizle
          </Buton>
        ) : null}
      </div>

      <div
        id={bolgeId}
        className={sinif(
          'grid gap-3 sm:grid-cols-2 lg:grid-cols-5',
          acik ? 'mt-4 grid' : 'hidden lg:grid',
        )}
      >
        <Secim
          ad="tip"
          etiket="İlan tipi"
          deger={mevcut('tip')}
          onDegisim={degistir}
          secenekler={ILAN_TIPLERI}
          hepsiEtiketi="Tümü"
        />
        <Secim
          ad="kategori"
          etiket="Kategori"
          deger={mevcut('kategori')}
          onDegisim={degistir}
          secenekler={ILAN_KATEGORILERI}
          hepsiEtiketi="Tümü"
        />
        <Secim
          ad="mahalle"
          etiket="Mahalle"
          deger={mevcut('mahalle')}
          onDegisim={degistir}
          secenekler={mahalleler.map((m) => ({ value: m.slug, label: m.ad }))}
          hepsiEtiketi="Tüm mahalleler"
        />
        <Secim
          ad="oda"
          etiket="Oda sayısı"
          deger={mevcut('oda')}
          onDegisim={degistir}
          secenekler={ODA_SAYILARI}
          hepsiEtiketi="Farketmez"
        />
        <Secim
          ad="siralama"
          etiket="Sıralama"
          deger={mevcut('siralama')}
          onDegisim={degistir}
          secenekler={[
            { value: 'yeni', label: 'Önce en yeni' },
            { value: 'fiyat_artan', label: 'Fiyat: düşükten yükseğe' },
            { value: 'fiyat_azalan', label: 'Fiyat: yüksekten düşüğe' },
            { value: 'carpan_artan', label: 'Kira çarpanı: en iyi' },
          ]}
          hepsiEtiketi="Önce en yeni"
        />

        {/* JavaScript kapalıysa tek çalışan yol budur. */}
        <noscript>
          <button
            type="submit"
            className="bg-koyu-bant rounded-buton min-h-11 px-5 text-govde-kucuk font-medium text-koyu-bant-metin"
          >
            Filtrele
          </button>
        </noscript>
      </div>
    </form>
  )
}

function Secim({
  ad,
  etiket,
  deger,
  secenekler,
  hepsiEtiketi,
  onDegisim,
}: {
  ad: string
  etiket: string
  deger: string
  secenekler: readonly { readonly value: string; readonly label: string }[]
  hepsiEtiketi: string
  onDegisim: (ad: string, deger: string) => void
}) {
  const id = useId()

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-metin-3 text-mikro font-medium">
        {etiket}
      </label>
      <select
        id={id}
        name={ad}
        value={deger}
        onChange={(olay) => onDegisim(ad, olay.target.value)}
        className="border-kenar-giris bg-yuzey rounded-buton focus:border-vurgu min-h-11 w-full border-[0.5px] px-3 text-govde-kucuk"
      >
        <option value="">{hepsiEtiketi}</option>
        {secenekler.map((secenek) => (
          <option key={secenek.value} value={secenek.value}>
            {secenek.label}
          </option>
        ))}
      </select>
    </div>
  )
}
