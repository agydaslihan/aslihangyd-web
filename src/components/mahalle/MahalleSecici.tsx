'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

import { sinif } from '@/lib/sinif'

/**
 * Karşılaştırma için mahalle seçici.
 *
 * Seçim URL'de tutulur (`?m=muhittin,seyhsinan`) — karşılaştırma
 * paylaşılabilir ve geri tuşu beklendiği gibi çalışır.
 *
 * Azami sayıya ulaşıldığında seçili olmayan düğmeler devre dışı bırakılır
 * ve sebebi yazılır; sessizce tıklanamaz olmak kullanıcıyı şaşırtır.
 */
export function MahalleSecici({
  mahalleler,
  secili,
  azami,
}: {
  mahalleler: { slug: string; ad: string }[]
  secili: string[]
  azami: number
}) {
  const sorgu = useSearchParams()
  const router = useRouter()
  const [gecisSuruyor, gecisBaslat] = useTransition()

  const doluMu = secili.length >= azami

  function degistir(slug: string) {
    const yeniSecim = secili.includes(slug)
      ? secili.filter((mevcut) => mevcut !== slug)
      : [...secili, slug].slice(0, azami)

    const yeni = new URLSearchParams(sorgu.toString())
    if (yeniSecim.length > 0) yeni.set('m', yeniSecim.join(','))
    else yeni.delete('m')

    const metin = yeni.toString()
    gecisBaslat(() =>
      router.push(metin ? `/mahalleler/karsilastir?${metin}` : '/mahalleler/karsilastir', {
        scroll: false,
      }),
    )
  }

  return (
    <div className={sinif('transition-opacity', gecisSuruyor && 'opacity-60')}>
      <fieldset>
        <legend className="text-sm font-medium">
          Mahalle seçin{' '}
          <span className="text-murekkep-3 font-normal">
            ({secili.length}/{azami})
          </span>
        </legend>

        <div className="mt-3 flex flex-wrap gap-2">
          {mahalleler.map((mahalle) => {
            const isaretli = secili.includes(mahalle.slug)
            const kapali = doluMu && !isaretli

            return (
              <button
                key={mahalle.slug}
                type="button"
                onClick={() => degistir(mahalle.slug)}
                disabled={kapali}
                aria-pressed={isaretli}
                className={sinif(
                  'inline-flex min-h-11 items-center rounded-full border px-4 text-sm transition-colors',
                  isaretli
                    ? 'border-lacivert bg-lacivert font-medium text-white'
                    : 'border-cizgi hover:border-lacivert hover:text-lacivert',
                  kapali && 'cursor-not-allowed opacity-40 hover:border-cizgi hover:text-murekkep',
                )}
              >
                {mahalle.ad}
              </button>
            )
          })}
        </div>

        {doluMu ? (
          <p className="text-murekkep-3 mt-2 text-mikro">
            En fazla {azami} mahalle karşılaştırılabilir. Başka bir mahalle eklemek için
            seçtiklerinizden birini çıkarın.
          </p>
        ) : null}
      </fieldset>
    </div>
  )
}
