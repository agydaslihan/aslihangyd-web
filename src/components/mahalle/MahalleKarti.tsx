import Image from 'next/image'
import Link from 'next/link'

import { KonumIkon } from '@/components/ui/Ikon'
import { Rozet } from '@/components/ui/Rozet'
import { carpanYaz, paraYaz } from '@/lib/bicimlendirme'
import type { Mahalleler } from '@/payload-types'

/**
 * Mahalle kartı.
 *
 * Rakam varsa gösterilir, yoksa kart yine de dolu ve davetkâr görünür —
 * çünkü mahalle sayfasının asıl değeri metin analizinde. "Veri bekleniyor"
 * yazısı karta konmuyor; kartın işi tıklatmak, dürüstlük beyanı ise
 * mahalle sayfasında rakamların yanında yapılıyor.
 */
export function MahalleKarti({ mahalle }: { mahalle: Mahalleler }) {
  const gorsel = typeof mahalle.kapakGorseli === 'object' ? mahalle.kapakGorseli : null
  const m2 = paraYaz(mahalle.ortalamaM2Satis)
  const carpan = carpanYaz(mahalle.kiraCarpani)

  return (
    <article className="group border-cizgi bg-yuzey rounded-yumusak hover:shadow-kart relative flex flex-col overflow-hidden border transition-shadow">
      <div className="bg-lacivert-acik relative aspect-16/10 overflow-hidden">
        {gorsel?.url ? (
          <Image
            src={gorsel.url}
            alt={gorsel.alt ?? `${mahalle.ad} Mahallesi`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="text-lacivert/40 flex h-full items-center justify-center">
            <KonumIkon width={32} height={32} />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4 sm:p-5">
        <h3 className="text-lg leading-tight">
          <Link href={`/mahalleler/${mahalle.slug}`} className="after:absolute after:inset-0">
            {mahalle.ad} Mahallesi
          </Link>
        </h3>

        {mahalle.ozet ? (
          <p className="text-murekkep-2 line-clamp-2 text-sm leading-relaxed">{mahalle.ozet}</p>
        ) : null}

        {m2 || carpan ? (
          <div className="mt-auto flex flex-wrap gap-2 pt-2">
            {m2 ? <Rozet>Ort. m²: {m2}</Rozet> : null}
            {carpan ? <Rozet ton="lacivert">Kira çarpanı {carpan}</Rozet> : null}
          </div>
        ) : null}
      </div>
    </article>
  )
}
