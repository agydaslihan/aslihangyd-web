import type { ReactNode } from 'react'

import { TrendIkon } from '@/components/ui/Ikon'
import { GUVEN_ESIGI } from '@/lib/mahalle/guven'
import { sinif } from '@/lib/sinif'

/**
 * İstatistik kartı — bu sitenin en önemli bileşeni.
 *
 * Tasarım hedefi: yatırımcı sayfayı 3 saniye tarayınca kira çarpanını
 * görebilmeli. Bu yüzden değer büyük ve hizalı, etiket küçük ve sakin.
 * Hiyerarşi tersine dönerse kart bir "bilgi kutusu"na dönüşür ve
 * taranabilirliğini kaybeder.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ `gozlemSayisi` ZORUNLU BİR ALANDIR — isteğe bağlı değil.
 *
 * Bir rakamın kaç gözleme dayandığı, rakamın kendisi kadar bilgidir.
 * "Ortalama m² 42.000 TL" ile "Ortalama m² 42.000 TL (n = 3)" aynı şey
 * değildir ve ikincisini gösteren tek site biz olacağız. Gözlem sayısı
 * rakamı zayıflatmaz, güçlendirir: neyi bilmediğini söyleyen kaynak,
 * söylediklerinde daha inandırıcıdır.
 *
 * Tip düzeyinde zorunlu tutulmasının sebebi, "bu kartta n'i geçelim"
 * kararının kazara değil bilinçli alınmasıdır. Gerçekten bilinmiyorsa
 * `null` geçilir ve kart bunu açıkça yazar.
 * ─────────────────────────────────────────────────────────────────────────
 */

type Ton = 'notr' | 'artis' | 'azalis'

const DEGER_TONLARI: Record<Ton, string> = {
  notr: 'text-metin',
  artis: 'text-basari',
  azalis: 'text-hata',
}

export interface IstatistikKartiOzellikleri {
  etiket: string
  /** Biçimlendirilmiş değer. `null` ise boş durum gösterilir. */
  deger: string | null
  /**
   * Kaç gözleme dayanıyor. Bilinmiyorsa `null` — gizlenmez, yazılır.
   * Sıfır da geçerli bir cevaptır ve "veri yok" demektir.
   */
  gozlemSayisi: number | null
  /** Gözlem sayısının yanında duracak ek bağlam (tarih, kaynak). */
  altBilgi?: ReactNode
  /** Veri yokken gösterilecek açıklama. */
  bosAciklama?: string
  ton?: Ton
  /** Kartı çerçevesiz gösterir — kart içinde kart olmasın diye. */
  sade?: boolean
  /** Sayfanın öne çıkan tek rakamı için 32px. */
  vurgulu?: boolean
  sinifAdi?: string
}

/**
 * Gözlem satırı — her istatistikte görünür, istisnasız.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ EŞİĞİN ALTINDAKİ RAKAM GİZLENMİYOR, İŞARETLENİYOR.
 *
 * Aslıhan'ın gönderdiği tabloda beş mahalle metodolojimizin 8 gözlem
 * eşiğinin altında (bir tanesi 2 gözlemle 63.064 ₺/m² diyor). O rakamları
 * saklamak, mahalle sayfasını boş bırakmak olurdu; olduğu gibi göstermek
 * ise 2 gözlemi 24 gözlemle aynı görünürlükte sunmak.
 *
 * Üçüncü yol: göster ve neye dayandığını yaz. "n = 2 · tahmini" cümlesi,
 * rakamı zayıflatmıyor — okuyanın ona ne kadar güveneceğini söylüyor.
 *
 * ⚠️ Eşik `lib/mahalle/guven.ts`ten, oradan da endeksin
 * `KATMAN_MINIMUM_GOZLEM`inden geliyor. Buraya sayı yazılmıyor: aynı
 * projede iki farklı "yeterli veri" tanımı olamaz.
 * ─────────────────────────────────────────────────────────────────────────
 */
function GozlemSatiri({ sayi, altBilgi }: { sayi: number | null; altBilgi?: ReactNode }) {
  const parca =
    sayi === null ? (
      'Gözlem sayısı bilinmiyor'
    ) : (
      <>
        n = <span className="rakam">{sayi}</span>
      </>
    )

  const tahmini = sayi === null || sayi < GUVEN_ESIGI

  return (
    <dd className="text-metin-3 text-mikro flex flex-wrap items-center gap-x-1.5 leading-snug">
      <span>{parca}</span>
      {tahmini ? (
        <>
          <span aria-hidden>·</span>
          <span
            className="text-uyari"
            title={`Bu rakam ${GUVEN_ESIGI} gözlemlik eşiğin altında bir veriye dayanıyor.`}
          >
            tahmini
          </span>
        </>
      ) : null}
      {altBilgi ? (
        <>
          <span aria-hidden>·</span>
          <span>{altBilgi}</span>
        </>
      ) : null}
    </dd>
  )
}

export function IstatistikKarti({
  etiket,
  deger,
  gozlemSayisi,
  altBilgi,
  bosAciklama = 'Veri girildiğinde burada görünecek.',
  ton = 'notr',
  sade = false,
  vurgulu = false,
  sinifAdi,
}: IstatistikKartiOzellikleri) {
  return (
    <div
      className={sinif(
        'flex flex-col gap-1',
        !sade && 'bg-yuzey rounded-kart border-[0.5px] border-kenar p-4 sm:p-5',
        sinifAdi,
      )}
    >
      <dt className="text-metin-3 text-mikro leading-tight">{etiket}</dt>

      {deger === null ? (
        <dd className="mt-1 flex flex-col gap-1">
          {/* Boş durum, değerle aynı dikey alanı kaplar: veri gelince
              düzen zıplamaz (CLS hedefi < 0,1). */}
          <span className="text-metin-pasif text-baslik-2 leading-none" aria-hidden>
            —
          </span>
          <span className="text-metin-3 text-mikro leading-snug">{bosAciklama}</span>
        </dd>
      ) : (
        <>
          <dd
            className={sinif(
              'rakam font-medium',
              vurgulu ? 'text-rakam-buyuk' : 'text-rakam',
              DEGER_TONLARI[ton],
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              {/* WCAG 1.4.1: yön bilgisini renkten değil ikondan da al. */}
              {ton === 'artis' ? (
                <TrendIkon yon="yukari" width={18} height={18} className="shrink-0" />
              ) : null}
              {ton === 'azalis' ? (
                <TrendIkon yon="asagi" width={18} height={18} className="shrink-0" />
              ) : null}
              {deger}
            </span>
          </dd>
          <GozlemSatiri sayi={gozlemSayisi} altBilgi={altBilgi} />
        </>
      )}
    </div>
  )
}

/** İstatistik kartlarını ızgaraya dizer. Mobilde 2, geniş ekranda 4 sütun. */
export function IstatistikIzgarasi({
  children,
  sinifAdi,
}: {
  children: ReactNode
  sinifAdi?: string
}) {
  return (
    <dl className={sinif('grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4', sinifAdi)}>
      {children}
    </dl>
  )
}
