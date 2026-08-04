import type { ReactNode } from 'react'

import { sinif } from '@/lib/sinif'

/**
 * "Yakında" bölümü — henüz uygulanmamış modüllerin yerini tutar.
 *
 * Neden boş bir div yerine bu: mahalle sayfası CLAUDE.md'de tanımlı 10
 * bölümden oluşuyor ve bunların bir kısmı sonraki fazlarda geliyor (harita,
 * drone, yatırım skoru, fiyat trendi). Bu bölümleri sayfadan tamamen
 * çıkarmak iki şeyi kaybettirirdi:
 *
 * 1. Sayfanın bilgi mimarisi bugünden görünmez olurdu; hangi verinin nereye
 *    geleceği belirsizleşir.
 * 2. Ziyaretçi sitenin eksik değil, **gelişmekte** olduğunu göremez.
 *
 * Kural: burada asla sahte veri, örnek grafik veya "temsili" rakam
 * gösterilmez. Yalnızca ne geleceği dürüstçe yazılır.
 */
export function YakindaBolumu({
  baslik,
  aciklama,
  ikon,
  oran = 'aspect-16/9',
  sinifAdi,
}: {
  baslik: string
  aciklama: string
  ikon?: ReactNode
  /** Gelecek içeriğin kaplayacağı alan — düzen bugünden doğru kurulsun. */
  oran?: string
  sinifAdi?: string
}) {
  return (
    <div
      className={sinif(
        'border-cizgi bg-yuzey-2/50 rounded-yumusak flex flex-col items-center justify-center gap-3 border border-dashed px-6 py-10 text-center',
        oran,
        sinifAdi,
      )}
    >
      {ikon ? (
        <span className="text-murekkep-3" aria-hidden>
          {ikon}
        </span>
      ) : null}
      <div className="flex max-w-md flex-col gap-1.5">
        <p className="text-murekkep-2 text-sm font-medium">{baslik}</p>
        <p className="text-murekkep-3 text-mikro leading-relaxed">{aciklama}</p>
      </div>
    </div>
  )
}
