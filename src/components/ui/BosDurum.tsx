import type { ReactNode } from 'react'

import { VeriBekleniyorIkon } from '@/components/ui/Ikon'
import { sinif } from '@/lib/sinif'

/**
 * Boş durum.
 *
 * ⚠️ Bu projede boş durum BİRİNCİ SINIF BİLEŞENDİR, sonradan eklenen şey
 * değil. Site aylarca kısmi veriyle çalışacak; ziyaretçilerin göreceği
 * ekranların önemli bir bölümü tam olarak bu bileşen olacak.
 *
 * Kötü bir boş durum ("Sonuç bulunamadı." + beyaz ekran) ziyaretçiye
 * sitenin bozuk olduğunu düşündürür. İyi bir boş durum dört şey söyler:
 *
 *   1. Ne yok            → başlık
 *   2. NEDEN yok         → `neden` — eşik, kural, süreç
 *   3. NE ZAMAN dolacak  → `neZaman` — belirsizse "belirsiz" demek de cevaptır
 *   4. Şimdi ne yapılır  → `eylem`
 *
 * Örnek: "Bu mahalle için endeks henüz hazır değil. Güvenilir bir seri
 * için katman başına en az 8 gözlem topluyoruz. Şu an 5 gözlem var."
 */
export function BosDurum({
  baslik,
  neden,
  neZaman,
  eylem,
  ikon,
  sade = false,
  sinifAdi,
}: {
  baslik: string
  /** Neden boş — eşik, kural ya da süreç. Uydurma tarih verilmez. */
  neden: string
  /** Ne zaman dolacağı. Bilinmiyorsa bu alan atlanır, uydurulmaz. */
  neZaman?: string
  /** Ziyaretçiyi çıkmazdan çıkaran bağlantı/buton. */
  eylem?: ReactNode
  ikon?: ReactNode
  /** Çerçevesiz — zaten bir kartın içindeyse. */
  sade?: boolean
  sinifAdi?: string
}) {
  return (
    <div
      className={sinif(
        'flex flex-col items-center gap-3 px-6 py-12 text-center',
        !sade && 'bg-yuzey-2/60 rounded-kart border-[0.5px] border-dashed border-kenar-guclu',
        sinifAdi,
      )}
    >
      <span className="text-metin-3" aria-hidden>
        {ikon ?? <VeriBekleniyorIkon width={32} height={32} />}
      </span>

      <div className="flex max-w-md flex-col gap-1.5">
        <p className="text-govde font-medium">{baslik}</p>
        <p className="text-metin-2 text-govde-kucuk leading-normal">{neden}</p>
        {neZaman ? <p className="text-metin-3 text-yardimci leading-normal">{neZaman}</p> : null}
      </div>

      {eylem ? <div className="mt-2">{eylem}</div> : null}
    </div>
  )
}
