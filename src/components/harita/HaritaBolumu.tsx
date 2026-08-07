'use client'

import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'

import type { HaritaAlani, HaritaNoktasi } from '@/components/harita/Harita'
import { BosDurum } from '@/components/ui/BosDurum'
import { Buton } from '@/components/ui/Buton'
import { KonumIkon } from '@/components/ui/Ikon'
import { poiRengi } from '@/lib/harita'
import { sinif } from '@/lib/sinif'

/**
 * Harita + katman filtreleri + metin listesi.
 *
 * ⚠️ maplibre-gl yalnızca burada, `ssr: false` ile yükleniyor. Kütüphane
 * ~200 kB gzip; ana pakete girmesi tüm sayfaların LCP'sini bozardı.
 *
 * Erişilebilirlik kararı: haritanın gösterdiği her nokta **aynı sayfada
 * metin listesi olarak da** var. Harita bir görselleştirmedir; bilginin
 * kendisi listede. Ekran okuyucu kullanan biri hiçbir şey kaybetmez.
 */

const Harita = dynamic(() => import('./Harita').then((modul) => modul.Harita), {
  ssr: false,
  loading: () => <div className="iskelet h-[28rem] w-full" />,
})

export interface KatmanTanimi {
  anahtar: string
  etiket: string
}

export function HaritaBolumu({
  noktalar,
  alanlar = [],
  katmanlar,
  haritaHazir,
  merkez,
  yakinlik,
}: {
  noktalar: HaritaNoktasi[]
  alanlar?: HaritaAlani[]
  katmanlar: KatmanTanimi[]
  /** MapTiler anahtarı tanımlı mı. */
  haritaHazir: boolean
  merkez?: [number, number]
  yakinlik?: number
}) {
  const [acikKatmanlar, setAcikKatmanlar] = useState<Set<string>>(
    () => new Set(katmanlar.map((katman) => katman.anahtar)),
  )

  const gorunenNoktalar = useMemo(
    () => noktalar.filter((nokta) => acikKatmanlar.has(nokta.tip)),
    [noktalar, acikKatmanlar],
  )

  function katmanDegistir(anahtar: string) {
    setAcikKatmanlar((onceki) => {
      const yeni = new Set(onceki)
      if (yeni.has(anahtar)) yeni.delete(anahtar)
      else yeni.add(anahtar)
      return yeni
    })
  }

  if (noktalar.length === 0 && alanlar.length === 0) {
    return (
      <BosDurum
        baslik="Harita verisi henüz girilmedi"
        neden="Okul, sağlık, market, park, sanayi ve ulaşım noktaları ile mahalle sınırları yönetim panelinden girildiğinde harita burada çalışmaya başlayacak."
        ikon={<KonumIkon width={32} height={32} />}
        eylem={
          <Buton href="/mahalleler" gorunum="ikincil">
            Mahalleleri inceleyin
          </Buton>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {katmanlar.length > 0 ? (
        <fieldset className="flex flex-wrap gap-2">
          <legend className="yalnizca-okuyucu">Harita katmanları</legend>
          {katmanlar.map((katman) => {
            const acik = acikKatmanlar.has(katman.anahtar)
            const sayi = noktalar.filter((nokta) => nokta.tip === katman.anahtar).length

            return (
              <button
                key={katman.anahtar}
                type="button"
                onClick={() => katmanDegistir(katman.anahtar)}
                aria-pressed={acik}
                className={sinif(
                  'inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 text-sm transition-colors',
                  acik
                    ? 'border-lacivert bg-lacivert-acik text-lacivert font-medium'
                    : 'border-cizgi text-murekkep-3 hover:border-cizgi-guclu',
                )}
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: acik ? poiRengi(katman.anahtar) : 'currentColor' }}
                  aria-hidden
                />
                {katman.etiket}
                <span className="rakam text-mikro opacity-70">{sayi}</span>
              </button>
            )
          })}
        </fieldset>
      ) : null}

      {haritaHazir ? (
        <Harita noktalar={gorunenNoktalar} alanlar={alanlar} merkez={merkez} yakinlik={yakinlik} />
      ) : (
        <div className="border-cizgi bg-yuzey-2/60 rounded-yumusak flex h-[28rem] flex-col items-center justify-center gap-3 border border-dashed px-6 text-center">
          <KonumIkon width={32} height={32} className="text-murekkep-3" />
          <div className="max-w-md">
            <p className="font-medium">Etkileşimli harita hazırlanıyor</p>
            <p className="text-murekkep-2 mt-1.5 text-sm leading-relaxed">
              Harita servisi yapılandırması tamamlandığında burada gezilebilir bir Çorlu haritası
              olacak. Aşağıdaki liste aynı noktaları şimdiden gösteriyor.
            </p>
          </div>
        </div>
      )}

      {/* Haritanın metin karşılığı — erişilebilirlik ve harita yokken içerik. */}
      <div>
        <h2 className="font-sans text-base font-semibold">
          Haritadaki noktalar{' '}
          <span className="text-murekkep-3 rakam font-normal">({gorunenNoktalar.length})</span>
        </h2>

        {gorunenNoktalar.length > 0 ? (
          <ul className="border-cizgi divide-cizgi rounded-yumusak mt-3 max-h-96 divide-y overflow-y-auto border">
            {gorunenNoktalar.map((nokta) => (
              <li key={`${nokta.tip}-${nokta.id}`} className="flex items-start gap-3 px-4 py-2.5">
                <span
                  className="mt-1.5 size-2.5 shrink-0 rounded-full"
                  style={{ background: poiRengi(nokta.tip) }}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {nokta.adres ? (
                      <a href={nokta.adres} className="underline-offset-2 hover:underline">
                        {nokta.ad}
                      </a>
                    ) : (
                      nokta.ad
                    )}
                  </p>
                  {nokta.altBilgi ? (
                    <p className="text-murekkep-3 text-mikro">{nokta.altBilgi}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-murekkep-3 mt-3 text-sm">
            Seçili katmanlarda gösterilecek nokta yok. Yukarıdan bir katman açın.
          </p>
        )}
      </div>
    </div>
  )
}
