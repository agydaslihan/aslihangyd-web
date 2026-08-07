import { BilgiIkon } from '@/components/ui/Ikon'
import { sinif } from '@/lib/sinif'

/**
 * Yatırım tavsiyesi feragati.
 *
 * ⚠️ CLAUDE.md kural 5: her hesaplayıcı, yatırım skoru ve getiri
 * gösteriminde bu ibare ZORUNLUDUR. Bileşen olarak tutulmasının sebebi,
 * metnin tek yerden yönetilmesi ve kazara atlanmamasıdır.
 *
 * Reklam mevzuatı açısından da gereklidir: "garantili getiri" izlenimi
 * yaratan gösterimler Reklam Kurulu yaptırımı doğurur.
 */
export const YATIRIM_FERAGATI =
  'Bu bilgiler yatırım tavsiyesi niteliğinde değildir. ' +
  'Geçmiş veriler gelecekteki getiriyi garanti etmez.'

export function Feragat({
  metin = YATIRIM_FERAGATI,
  ek,
  sinifAdi,
}: {
  metin?: string
  /** Bağlama özel ek cümle (örn. değerleme raporu yerine geçmez). */
  ek?: string
  sinifAdi?: string
}) {
  return (
    <p className={sinif('text-metin-3 text-mikro olcu flex items-start gap-2', sinifAdi)}>
      <BilgiIkon width={14} height={14} className="mt-0.5 shrink-0" />
      <span>
        {metin}
        {ek ? ` ${ek}` : null}
      </span>
    </p>
  )
}

/**
 * Veri kaynağı ve tazelik bilgisi — güven sinyali.
 *
 * Gözlem sayısı (n) bilinmiyorsa gösterilmez: "n bilinmiyorsa rakam da
 * yayınlanmamalıdır" ilkesi gereği eksik n'i gizlemek yerine, çağıran
 * tarafın rakamı hiç göstermemesi beklenir.
 */
export function VeriNotu({
  kaynak,
  tarih,
  gozlemSayisi,
  sinifAdi,
}: {
  kaynak?: string | null
  tarih?: string | null
  gozlemSayisi?: number | null
  sinifAdi?: string
}) {
  const parcalar: string[] = []
  if (typeof gozlemSayisi === 'number' && gozlemSayisi > 0) parcalar.push(`n = ${gozlemSayisi}`)
  if (kaynak) parcalar.push(`Kaynak: ${kaynak}`)
  if (tarih) parcalar.push(`${tarih} itibarıyla`)

  if (parcalar.length === 0) return null

  return <p className={sinif('text-metin-3 text-mikro', sinifAdi)}>{parcalar.join(' · ')}</p>
}
