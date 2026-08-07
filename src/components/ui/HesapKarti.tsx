import type { ReactNode } from 'react'

import { sinif } from '@/lib/sinif'

/**
 * Hesap kartı — HESAPLANMIŞ bir rakamı gösterir.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ `IstatistikKarti` İLE FARKI: GÖZLEM SAYISI.
 *
 * · `HesapKarti` — girdiden TÜRETİLEN rakam: kredi taksiti, tapu harcı,
 *   bir ilanın kira çarpanı. Bunlar bir ölçüm değil, bir hesap; "kaç
 *   gözleme dayanıyor?" sorusunun karşılığı yok. Zorunlu bir `n` alanı
 *   burada anlamsız bir gürültü olurdu.
 *
 * · `IstatistikKarti` — GÖZLENMİŞ rakam: mahallenin ortalama m² fiyatı,
 *   kira medyanı. Bunların kaç gözleme dayandığı rakamın kendisi kadar
 *   bilgidir ve tip düzeyinde zorunludur.
 *
 * İkisini tek bileşende birleştirmek, ya hesaplara sahte bir `n`
 * uydurmak ya da istatistiklerde `n`i isteğe bağlı bırakmak demekti.
 * İkincisi zamanla "unutulan alan" olurdu.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Tasarım hedefi: yatırımcı sayfayı 3 saniye tarayınca aradığı rakamı
 * görebilmeli. Değer büyük ve hizalı, etiket küçük ve sakin. Hiyerarşi
 * tersine dönerse kart bir "bilgi kutusu"na dönüşür ve taranabilirliğini
 * kaybeder.
 *
 * ⚠️ Boş durum bu bileşenin birinci sınıf davranışıdır, kenar durumu değil.
 * Site uzun süre kısmi veriyle çalışacak; `deger` yoksa kart kırık
 * görünmez, "veri bekleniyor" der ve nedenini açıklar.
 */

type Ton = 'notr' | 'artis' | 'azalis' | 'vurgu'

const DEGER_TONLARI: Record<Ton, string> = {
  notr: 'text-metin',
  artis: 'text-basari',
  azalis: 'text-hata',
  vurgu: 'text-vurgu',
}

export interface HesapKartiOzellikleri {
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

export function HesapKarti({
  etiket,
  deger,
  altBilgi,
  bosAciklama = 'Veri girildiğinde burada görünecek.',
  ton = 'notr',
  sade = false,
  sinifAdi,
}: HesapKartiOzellikleri) {
  const veriVar = deger !== null

  return (
    <div
      className={sinif(
        'flex flex-col gap-1',
        !sade && 'bg-yuzey rounded-kart border-[0.5px] border-kenar p-4 sm:p-5',
        sinifAdi,
      )}
    >
      <dt className="text-metin-3 text-mikro leading-tight">{etiket}</dt>

      {veriVar ? (
        <>
          <dd className={sinif('rakam text-rakam font-medium', DEGER_TONLARI[ton])}>{deger}</dd>
          {altBilgi ? (
            <dd className="text-metin-3 text-mikro mt-0.5 leading-snug">{altBilgi}</dd>
          ) : null}
        </>
      ) : (
        <dd className="mt-1 flex flex-col gap-1">
          {/* Boş durum, değerle aynı dikey alanı kaplar: veri gelince
              düzen zıplamaz (CLS hedefi < 0.1). */}
          <span className="text-metin-pasif text-baslik-2 leading-none" aria-hidden>
            —
          </span>
          <span className="text-metin-3 text-mikro leading-snug">{bosAciklama}</span>
        </dd>
      )}
    </div>
  )
}

/** Kartları ızgaraya dizer. Mobilde 2, geniş ekranda 4 sütun. */
export function KartIzgarasi({ children, sinifAdi }: { children: ReactNode; sinifAdi?: string }) {
  return (
    <dl className={sinif('grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4', sinifAdi)}>
      {children}
    </dl>
  )
}
