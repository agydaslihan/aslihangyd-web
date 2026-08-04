import type { ReactNode } from 'react'

import { sinif } from '@/lib/sinif'

/**
 * Rakam kartı — bu sitenin en önemli bileşeni.
 *
 * Tasarım hedefi: yatırımcı sayfayı 3 saniye tarayınca kira çarpanını
 * görebilmeli. Bu yüzden değer büyük ve hizalı (tabular-nums), etiket küçük
 * ve sakin. Hiyerarşi tersine dönerse kart bir "bilgi kutusu"na dönüşür ve
 * taranabilirliğini kaybeder.
 *
 * ⚠️ Boş durum bu bileşenin birinci sınıf davranışıdır, kenar durumu değil.
 * Site uzun süre kısmi veriyle çalışacak; `deger` yoksa kart kırık
 * görünmez, "veri bekleniyor" der ve nedenini açıklar.
 */

type Ton = 'notr' | 'artis' | 'azalis' | 'vurgu'

const DEGER_TONLARI: Record<Ton, string> = {
  notr: 'text-murekkep',
  artis: 'text-artis',
  azalis: 'text-azalis',
  vurgu: 'text-pirinc-koyu',
}

export interface RakamKartiOzellikleri {
  etiket: string
  /** Biçimlendirilmiş değer. `null` ise boş durum gösterilir. */
  deger: string | null
  /** Değerin altındaki bağlam: gözlem sayısı (n), tarih, kaynak. */
  altBilgi?: ReactNode
  /** Veri yokken gösterilecek açıklama. */
  bosAciklama?: string
  ton?: Ton
  /** Kartı çerçevesiz gösterir — kart içinde kart olmasın diye. */
  sade?: boolean
  sinifAdi?: string
}

export function RakamKarti({
  etiket,
  deger,
  altBilgi,
  bosAciklama = 'Veri girildiğinde burada görünecek.',
  ton = 'notr',
  sade = false,
  sinifAdi,
}: RakamKartiOzellikleri) {
  const veriVar = deger !== null

  return (
    <div
      className={sinif(
        'flex flex-col gap-1',
        !sade && 'border-cizgi bg-yuzey rounded-yumusak border p-4 sm:p-5',
        sinifAdi,
      )}
    >
      <dt className="text-murekkep-3 text-mikro leading-tight font-medium tracking-wide">
        {etiket}
      </dt>

      {veriVar ? (
        <>
          <dd
            className={sinif(
              'rakam text-[1.75rem] leading-none font-semibold sm:text-[2rem]',
              DEGER_TONLARI[ton],
            )}
          >
            {deger}
          </dd>
          {altBilgi ? (
            <dd className="text-murekkep-3 text-mikro mt-0.5 leading-snug">{altBilgi}</dd>
          ) : null}
        </>
      ) : (
        <dd className="mt-1 flex flex-col gap-1">
          {/* Boş durum, değerle aynı dikey alanı kaplar: veri gelince
              düzen zıplamaz (CLS hedefi < 0.1). */}
          <span className="text-murekkep-3 text-[1.25rem] leading-none font-medium" aria-hidden>
            —
          </span>
          <span className="text-murekkep-3 text-mikro leading-snug">{bosAciklama}</span>
        </dd>
      )}
    </div>
  )
}

/** Rakam kartlarını ızgaraya dizer. Mobilde 2, geniş ekranda 4 sütun. */
export function RakamIzgarasi({ children, sinifAdi }: { children: ReactNode; sinifAdi?: string }) {
  return (
    <dl className={sinif('grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4', sinifAdi)}>
      {children}
    </dl>
  )
}
