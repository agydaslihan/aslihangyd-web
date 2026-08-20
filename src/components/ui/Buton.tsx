import Link from 'next/link'
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'

import { sinif } from '@/lib/sinif'

/**
 * Buton ve buton görünümlü bağlantı.
 *
 * Erişilebilirlik kararı: bir yere GİDİYORSA `<a>`, bir şey YAPIYORSA
 * `<button>` olur. Görsel olarak aynı görünmeleri bu ayrımı ortadan
 * kaldırmaz — ekran okuyucu ve klavye davranışları farklıdır.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Hiyerarşi — neden dolu buton bu kadar az
 *
 * Sayfada her şey öne çıkarsa hiçbir şey öne çıkmaz. Bu yüzden VARSAYILAN
 * görünüm `ikincil`dir (çerçeveli): bir butonun dolu olması bilinçli bir
 * karar olmalı, varsayılanın yan etkisi değil.
 *
 * ⚠️ `aksan` görünümü pazarlığa kapalı bir kuralın taşıyıcısıdır: dolu
 * altın zemin YALNIZCA "Değerleme isteyin" ve "Erişim talep et"
 * eylemlerinde kullanılır. Kural `src/lib/tasarim/disiplin.test.ts`
 * içinde denetlenir; yeni bir çağrı yeri eklemek testi kırar.
 * ─────────────────────────────────────────────────────────────────────────
 */

type Gorunum = 'ikincil' | 'hayalet' | 'koyu' | 'whatsapp' | 'aksan' | 'acikBant'
type Boyut = 'kucuk' | 'orta' | 'buyuk'

const GORUNUMLER: Record<Gorunum, string> = {
  ikincil:
    'bg-transparent text-metin border-[0.5px] border-kenar-guclu ' +
    'hover:border-vurgu hover:text-vurgu',
  hayalet: 'bg-transparent text-metin-3 border-[0.5px] border-transparent hover:text-vurgu',
  /**
   * Form gönderimi ve akış içi birincil eylem.
   *
   * Altını ikinci bir eyleme açmak yerine mürekkep kullanılıyor: altın
   * nadir kalıyor, gönderim butonu yine de tıklanabilir görünüyor. Mürekkep
   * buton sayfadan 16,46:1 ayrışıyor — hiçbir kapıya takılmıyor.
   */
  koyu: 'bg-koyu-bant text-koyu-bant-metin border-[0.5px] border-transparent hover:opacity-90',
  /**
   * ⚠️ KOYU FOTOĞRAF ÜZERİNDE ALTIN DOĞRU CEVAP DEĞİL.
   *
   * Hero slaydının zemini karartılmış bir fotoğraf. Orada altın buton hem
   * "aksan" nadirliğini harcar hem de fotoğrafın renkleriyle yarışır —
   * karartma oranı kullanıcıya bağlı olduğu için buton-zemin kontrastı
   * öngörülemez hâle gelirdi.
   *
   * Beyaz buton zemini karartma oranından bağımsız olarak fotoğraftan
   * ayrışıyor; üzerindeki mürekkep metin 17,04:1.
   */
  acikBant: 'bg-white text-koyu-bant border-[0.5px] border-transparent hover:opacity-90',
  // WhatsApp'ın kurumsal yeşili bilinçli olarak kullanılmıyor: sayfadaki
  // tek parlak renk olurdu ve sakin paleti bozardı. Tanınırlık ikondan gelir.
  whatsapp: 'bg-koyu-bant text-koyu-bant-metin border-[0.5px] border-transparent hover:opacity-90',
  /**
   * ⚠️ DOLU ALTIN BUTONUN KENARLIĞI ERİŞİLEBİLİRLİK GEREĞİ, SÜS DEĞİL.
   *
   * Altın zemin sayfadan yalnızca 2,28:1 ayrışıyor; WCAG 1.4.11 bileşen
   * sınırı için 3:1 istiyor. Yani kenarlıksız altın buton, ışık yansıyan
   * bir ekranda nerede bittiği görünmeyen bir leke oluyor. gold-600
   * kenarlık 4,21:1 veriyor.
   *
   * ⚠️ Metin `text-white` DEĞİL, mürekkep: beyaz altın üzerinde 2,36:1,
   * mürekkep 7,20:1. Jetondan okunuyor ki koyu temada da doğru kalsın.
   */
  aksan:
    'bg-aksan text-[color:var(--color-aksan-uzeri)] border-[0.5px] ' +
    'border-aksan-kenar hover:bg-aksan-koyu',
}

const BOYUTLAR: Record<Boyut, string> = {
  // Dokunma hedefi en az 44px: mobil trafiği ~%75.
  kucuk: 'min-h-11 px-3.5 text-govde-kucuk gap-1.5',
  orta: 'min-h-11 px-5 text-govde-kucuk gap-2',
  buyuk: 'min-h-13 px-6 text-govde gap-2.5',
}

const TEMEL =
  'inline-flex items-center justify-center rounded-buton font-medium ' +
  'transition-[color,background-color,border-color,opacity] duration-[150ms] ' +
  'ease-[cubic-bezier(0.2,0,0,1)] whitespace-nowrap'

const PASIF = 'bg-yuzey-2 text-metin-pasif border-[0.5px] border-transparent cursor-not-allowed'

interface OrtakOzellikler {
  gorunum?: Gorunum
  boyut?: Boyut
  /** Butonu satır genişliğine yayar — mobilde tercih edilir. */
  tamGenislik?: boolean
  children: ReactNode
  sinifAdi?: string
  /**
   * Butonu pasif gösterir.
   *
   * ⚠️ `pasifSebebi` zorunludur. Sebebi yazılmayan pasif buton, ziyaretçiyi
   * "neden çalışmıyor?" sorusuyla baş başa bırakır — bu projede en sık
   * karşılaşılacak durum EİDS yetkisi eksik bir ilanın yayına alınamaması
   * ve sebebini söylememek orada özellikle kötü olurdu.
   */
  pasif?: boolean
  pasifSebebi?: string
}

type ButonOzellikleri = OrtakOzellikler &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children' | 'disabled'> & {
    href?: undefined
  }

type BaglantiOzellikleri = OrtakOzellikler &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children' | 'href'> & {
    href: string
    /** Dış bağlantı: yeni sekmede açılır ve güvenlik öznitelikleri eklenir. */
    dis?: boolean
  }

export function Buton(ozellikler: ButonOzellikleri | BaglantiOzellikleri) {
  const {
    gorunum = 'ikincil',
    boyut = 'orta',
    tamGenislik = false,
    pasif = false,
    pasifSebebi,
    children,
    sinifAdi,
    ...kalan
  } = ozellikler

  const siniflar = sinif(
    TEMEL,
    pasif ? PASIF : GORUNUMLER[gorunum],
    BOYUTLAR[boyut],
    tamGenislik && 'w-full',
    sinifAdi,
  )

  if (pasif) {
    /**
     * `disabled` yerine `aria-disabled`.
     *
     * `disabled` butonu sekme sırasından çıkarır; klavye ya da ekran
     * okuyucu kullanan biri butona hiç ulaşamadığı için SEBEBİ de duymaz.
     * `aria-disabled` odaklanılabilir bırakır, tıklamayı ise `type="button"`
     * ve tıklama işleyicisinin düşürülmesi engeller.
     */
    const {
      href: _href,
      dis: _dis,
      onClick: _onClick,
      type: _type,
      ...kalanPasif
    } = kalan as BaglantiOzellikleri

    return (
      <span className={sinif('inline-flex flex-col gap-1.5', tamGenislik && 'w-full')}>
        <button
          type="button"
          aria-disabled="true"
          className={siniflar}
          {...(kalanPasif as ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          {children}
          {pasifSebebi ? <span className="yalnizca-okuyucu"> — {pasifSebebi}</span> : null}
        </button>
        {pasifSebebi ? (
          <span className="text-metin-3 text-mikro leading-snug">{pasifSebebi}</span>
        ) : null}
      </span>
    )
  }

  if ('href' in kalan && typeof kalan.href === 'string') {
    const { href, dis, ...baglantiOzellikleri } = kalan as BaglantiOzellikleri

    if (dis) {
      return (
        <a
          href={href}
          className={siniflar}
          target="_blank"
          rel="noopener noreferrer"
          {...baglantiOzellikleri}
        >
          {children}
        </a>
      )
    }

    return (
      <Link href={href} className={siniflar} {...baglantiOzellikleri}>
        {children}
      </Link>
    )
  }

  const { type = 'button', ...butonOzellikleri } = kalan as ButonOzellikleri
  return (
    <button type={type} className={siniflar} {...butonOzellikleri}>
      {children}
    </button>
  )
}
