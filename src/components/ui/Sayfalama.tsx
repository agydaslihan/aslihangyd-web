import Link from 'next/link'

import { sinif } from '@/lib/sinif'

/**
 * Sayfalama.
 *
 * Bağlantı tabanlı (JavaScript'siz çalışır) ve arama motorunun tüm ilanları
 * gezebilmesi için gerçek `<a>` etiketleri kullanır. Sonsuz kaydırma bu
 * sitede bilinçli olarak tercih edilmedi: indekslenmeyen içerik SEO
 * motorunu köreltir.
 */
export function Sayfalama({
  mevcutSayfa,
  toplamSayfa,
  adresUret,
}: {
  mevcutSayfa: number
  toplamSayfa: number
  adresUret: (sayfa: number) => string
}) {
  if (toplamSayfa <= 1) return null

  const sayfalar = gorunecekSayfalar(mevcutSayfa, toplamSayfa)

  return (
    <nav aria-label="Sayfalama" className="mt-10 flex items-center justify-center gap-1.5">
      {mevcutSayfa > 1 ? (
        <Link
          href={adresUret(mevcutSayfa - 1)}
          rel="prev"
          className="border-cizgi hover:border-lacivert hover:text-lacivert rounded-yumusak inline-flex min-h-11 items-center border px-4 text-sm"
        >
          Önceki
        </Link>
      ) : null}

      <ul className="flex items-center gap-1.5">
        {sayfalar.map((sayfa, sira) =>
          sayfa === null ? (
            <li key={`bosluk-${sira}`} className="text-murekkep-3 px-1" aria-hidden>
              …
            </li>
          ) : (
            <li key={sayfa}>
              <Link
                href={adresUret(sayfa)}
                aria-current={sayfa === mevcutSayfa ? 'page' : undefined}
                aria-label={`Sayfa ${sayfa}`}
                className={sinif(
                  'rakam rounded-yumusak inline-flex size-11 items-center justify-center border text-sm',
                  sayfa === mevcutSayfa
                    ? 'border-lacivert bg-lacivert font-medium text-white'
                    : 'border-cizgi hover:border-lacivert hover:text-lacivert',
                )}
              >
                {sayfa}
              </Link>
            </li>
          ),
        )}
      </ul>

      {mevcutSayfa < toplamSayfa ? (
        <Link
          href={adresUret(mevcutSayfa + 1)}
          rel="next"
          className="border-cizgi hover:border-lacivert hover:text-lacivert rounded-yumusak inline-flex min-h-11 items-center border px-4 text-sm"
        >
          Sonraki
        </Link>
      ) : null}
    </nav>
  )
}

/**
 * Gösterilecek sayfa numaraları; `null` bir "…" boşluğudur.
 * Mobilde taşmaması için en fazla 7 kutu üretir.
 */
function gorunecekSayfalar(mevcut: number, toplam: number): (number | null)[] {
  if (toplam <= 7) return Array.from({ length: toplam }, (_, sira) => sira + 1)

  const sayfalar: (number | null)[] = [1]

  const bas = Math.max(2, mevcut - 1)
  const son = Math.min(toplam - 1, mevcut + 1)

  if (bas > 2) sayfalar.push(null)
  for (let sayfa = bas; sayfa <= son; sayfa += 1) sayfalar.push(sayfa)
  if (son < toplam - 1) sayfalar.push(null)

  sayfalar.push(toplam)
  return sayfalar
}
