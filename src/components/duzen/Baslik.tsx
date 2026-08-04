'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { KapatIkon, MenuIkon, WhatsappIkon } from '@/components/ui/Ikon'
import { whatsappBaglantisi } from '@/lib/bicimlendirme'
import { sinif } from '@/lib/sinif'
import { GORUNUR_GEZINME, SITE_ADI, UST_MENU, whatsappMesaji } from '@/lib/site'

/**
 * Site başlığı.
 *
 * İstemci bileşeni olmasının tek sebebi mobil menü ve aktif bağlantı
 * vurgusu. Menü açıkken gövde kaydırması kilitlenir; klavye ile Escape
 * kapatır ve odak yönetimi tarayıcıya bırakılır (menü basit bir liste,
 * odak tuzağı gerektirmiyor).
 */
export function Baslik({ whatsapp }: { whatsapp: string | null }) {
  const [acik, setAcik] = useState(false)
  const yol = usePathname()

  // Sayfa değişince menü kapansın.
  //
  // Bu, efekt yerine render sırasında yapılıyor: efektle yazmak fazladan bir
  // render turu doğurur ve menü bir kare boyunca açık görünür. React'in
  // "değişen bir değere göre state ayarlama" önerdiği kalıp budur.
  const [oncekiYol, setOncekiYol] = useState(yol)
  if (yol !== oncekiYol) {
    setOncekiYol(yol)
    setAcik(false)
  }

  useEffect(() => {
    if (!acik) return

    const kapat = (olay: KeyboardEvent) => {
      if (olay.key === 'Escape') setAcik(false)
    }
    document.addEventListener('keydown', kapat)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', kapat)
      document.body.style.overflow = ''
    }
  }, [acik])

  const whatsappAdresi = whatsappBaglantisi(whatsapp, whatsappMesaji())

  return (
    <header
      data-yazdirma="gizle"
      className="border-cizgi bg-kagit/85 sticky top-0 z-40 border-b backdrop-blur-md"
    >
      <div className="kapsayici flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="font-serif text-lg tracking-tight whitespace-nowrap"
          aria-label={`${SITE_ADI} ana sayfa`}
        >
          Aslıhan <span className="text-pirinc-koyu">GYD</span>
        </Link>

        {/* Masaüstü gezinme */}
        <nav aria-label="Ana gezinme" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {UST_MENU.map((oge) => (
              <li key={oge.adres}>
                <Link
                  href={oge.adres}
                  aria-current={yolAktifMi(yol, oge.adres) ? 'page' : undefined}
                  className={sinif(
                    'rounded-yumusak px-3 py-2 text-sm transition-colors',
                    yolAktifMi(yol, oge.adres)
                      ? 'text-lacivert bg-lacivert-acik font-medium'
                      : 'text-murekkep-2 hover:text-murekkep hover:bg-yuzey-2',
                  )}
                >
                  {oge.ad}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          {whatsappAdresi ? (
            <a
              href={whatsappAdresi}
              target="_blank"
              rel="noopener noreferrer"
              className="border-cizgi-guclu rounded-yumusak hover:border-lacivert hover:text-lacivert hidden min-h-11 items-center gap-2 border px-4 text-sm font-medium transition-colors sm:inline-flex"
            >
              <WhatsappIkon width={16} height={16} />
              WhatsApp
            </a>
          ) : null}

          <button
            type="button"
            onClick={() => setAcik((onceki) => !onceki)}
            aria-expanded={acik}
            aria-controls="mobil-gezinme"
            className="hover:bg-yuzey-2 rounded-yumusak -mr-2 inline-flex size-11 items-center justify-center lg:hidden"
          >
            {acik ? <KapatIkon /> : <MenuIkon />}
            <span className="yalnizca-okuyucu">{acik ? 'Menüyü kapat' : 'Menüyü aç'}</span>
          </button>
        </div>
      </div>

      {/* Mobil gezinme */}
      {acik ? (
        <div
          id="mobil-gezinme"
          className="border-cizgi bg-kagit fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto border-t lg:hidden"
        >
          <nav aria-label="Mobil gezinme" className="kapsayici py-4">
            {/* Mobilde tam ekran menü var; üst menüdeki gibi kısaltmaya
                gerek yok — tüm sayfalar listelenir. */}
            <ul className="flex flex-col">
              {GORUNUR_GEZINME.map((oge) => (
                <li key={oge.adres} className="border-cizgi border-b last:border-0">
                  <Link
                    href={oge.adres}
                    aria-current={yolAktifMi(yol, oge.adres) ? 'page' : undefined}
                    className={sinif(
                      'flex min-h-14 items-center text-base',
                      yolAktifMi(yol, oge.adres) ? 'text-lacivert font-medium' : 'text-murekkep',
                    )}
                  >
                    {oge.ad}
                  </Link>
                </li>
              ))}
            </ul>

            {whatsappAdresi ? (
              <a
                href={whatsappAdresi}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-lacivert rounded-yumusak mt-6 flex min-h-13 w-full items-center justify-center gap-2 font-medium text-white"
              >
                <WhatsappIkon width={18} height={18} />
                WhatsApp&apos;tan yazın
              </a>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  )
}

/** Alt sayfalarda da üst menü öğesi aktif görünsün (/portfoy/xyz → Portföy). */
function yolAktifMi(mevcutYol: string | null, adres: string): boolean {
  if (!mevcutYol) return false
  if (adres === '/') return mevcutYol === '/'
  return mevcutYol === adres || mevcutYol.startsWith(`${adres}/`)
}

/** Klavye kullanıcıları için "içeriğe atla" bağlantısı. */
export function IcerigeAtla() {
  return (
    <a
      href="#icerik"
      className="bg-lacivert rounded-yumusak sr-only z-50 px-4 py-2 text-white focus:not-sr-only focus:absolute focus:top-3 focus:left-3"
    >
      İçeriğe atla
    </a>
  )
}
