import Link from 'next/link'

import { CerezTercihleriBaglantisi } from '@/components/cerez/CerezBanneri'
import { PostaIkon, TelefonIkon, WhatsappIkon } from '@/components/ui/Ikon'
import { whatsappBaglantisi } from '@/lib/bicimlendirme'
import {
  iletisimEpostasi,
  iletisimTelefonu,
  kurumsalBilgileriGetir,
  whatsappNumarasi,
} from '@/lib/kurumsal'
import { GORUNUR_GEZINME, HUKUKI_SAYFALAR, SITE_UNVANI, whatsappMesaji } from '@/lib/site'

/**
 * Altbilgi.
 *
 * Yasal bilgi bloğu burada yaşar: Taşınmaz Ticareti Yetki Belgesi numarası
 * mevzuat gereği sitede görünür olmalıdır. Numara CMS'te boşsa uydurma
 * numara yazılmaz — bunun yerine eksikliği açıkça belirten bir not gösterilir
 * (yalnızca geliştirme ortamında; üretimde blok tamamen gizlenir ki
 * ziyaretçiye iç mesaj sızmasın).
 */
export async function Altbilgi() {
  const kurumsal = await kurumsalBilgileriGetir()
  const yil = new Date().getFullYear()

  const telefon = iletisimTelefonu(kurumsal)
  const eposta = iletisimEpostasi(kurumsal)
  const whatsapp = whatsappBaglantisi(whatsappNumarasi(kurumsal), whatsappMesaji())

  return (
    <footer className="border-cizgi bg-yuzey-2/50 mt-auto border-t">
      <div className="kapsayici py-12 lg:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Marka */}
          <div className="flex flex-col gap-3 lg:col-span-1">
            <span className="font-serif text-lg tracking-tight">
              Aslıhan <span className="text-pirinc-koyu">GYD</span>
            </span>
            <p className="text-murekkep-2 text-sm leading-relaxed">
              Çorlu ve çevresinde gayrimenkul danışmanlığı. Kararlarınızı hisle değil, rakamla
              verin.
            </p>
          </div>

          {/* Gezinme */}
          <nav aria-label="Altbilgi gezinme" className="flex flex-col gap-3">
            <h2 className="text-mikro font-semibold tracking-[0.08em] uppercase">Site</h2>
            <ul className="text-murekkep-2 flex flex-col gap-2 text-sm">
              {GORUNUR_GEZINME.map((oge) => (
                <li key={oge.adres}>
                  <Link
                    href={oge.adres}
                    className="hover:text-murekkep underline-offset-2 hover:underline"
                  >
                    {oge.ad}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Hukuki */}
          <nav aria-label="Hukuki bilgiler" className="flex flex-col gap-3">
            <h2 className="text-mikro font-semibold tracking-[0.08em] uppercase">Hukuki</h2>
            <ul className="text-murekkep-2 flex flex-col gap-2 text-sm">
              {HUKUKI_SAYFALAR.map((sayfa) => (
                <li key={sayfa.adres}>
                  <Link
                    href={sayfa.adres}
                    className="hover:text-murekkep underline-offset-2 hover:underline"
                  >
                    {sayfa.ad}
                  </Link>
                </li>
              ))}
              <li>
                <CerezTercihleriBaglantisi />
              </li>
            </ul>
          </nav>

          {/* İletişim */}
          <div className="flex flex-col gap-3">
            <h2 className="text-mikro font-semibold tracking-[0.08em] uppercase">İletişim</h2>
            <ul className="text-murekkep-2 flex flex-col gap-2.5 text-sm">
              {telefon ? (
                <li>
                  <a
                    href={`tel:${telefon.replace(/\s/g, '')}`}
                    className="hover:text-murekkep inline-flex items-center gap-2"
                  >
                    <TelefonIkon width={15} height={15} className="shrink-0" />
                    {telefon}
                  </a>
                </li>
              ) : null}
              {eposta ? (
                <li>
                  <a
                    href={`mailto:${eposta}`}
                    className="hover:text-murekkep inline-flex items-center gap-2"
                  >
                    <PostaIkon width={15} height={15} className="shrink-0" />
                    {eposta}
                  </a>
                </li>
              ) : null}
              {whatsapp ? (
                <li>
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-murekkep inline-flex items-center gap-2"
                  >
                    <WhatsappIkon width={15} height={15} className="shrink-0" />
                    WhatsApp
                  </a>
                </li>
              ) : null}
            </ul>

            {kurumsal?.adres ? (
              <address className="text-murekkep-3 text-mikro leading-relaxed not-italic">
                {kurumsal.adres}
              </address>
            ) : null}
          </div>
        </div>

        {/* Yasal künye */}
        <div className="border-cizgi text-murekkep-3 text-mikro mt-10 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {yil} {kurumsal?.ticaretUnvani || SITE_UNVANI}
          </p>

          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {kurumsal?.yetkiBelgesiNo ? (
              <li>
                Taşınmaz Ticareti Yetki Belgesi No:{' '}
                <span className="rakam">{kurumsal.yetkiBelgesiNo}</span>
              </li>
            ) : null}
            {kurumsal?.mersisNo ? (
              <li>
                MERSİS: <span className="rakam">{kurumsal.mersisNo}</span>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </footer>
  )
}
