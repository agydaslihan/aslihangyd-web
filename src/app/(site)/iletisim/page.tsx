import type { Metadata } from 'next'

import { TalepFormu } from '@/components/talep/TalepFormu'
import { Buton } from '@/components/ui/Buton'
import { PostaIkon, TelefonIkon, WhatsappIkon } from '@/components/ui/Ikon'
import { whatsappBaglantisi } from '@/lib/bicimlendirme'
import {
  iletisimEpostasi,
  iletisimTelefonu,
  kurumsalBilgileriGetir,
  whatsappNumarasi,
} from '@/lib/kurumsal'
import { TALEP_TIPLERI } from '@/lib/secenekler'
import { mutlakAdres, whatsappMesaji } from '@/lib/site'

import { turnstileSiteAnahtari } from '@/lib/guvenlik/turnstile'
import { talepGonder } from './eylemler'

export const metadata: Metadata = {
  title: 'İletişim',
  description:
    'Çorlu gayrimenkul danışmanlığı için bize ulaşın. Alım, satım, kiralama ve değerleme ' +
    'talepleriniz için WhatsApp, telefon veya form.',
  alternates: { canonical: mutlakAdres('/iletisim') },
}

const GECERLI_TIPLER: ReadonlySet<string> = new Set(TALEP_TIPLERI.map((secenek) => secenek.value))

export default async function IletisimSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const parametreler = await searchParams
  const kurumsal = await kurumsalBilgileriGetir()

  const metin = (anahtar: string) => {
    const deger = parametreler[anahtar]
    return typeof deger === 'string' && deger !== '' ? deger : undefined
  }

  const istenenTip = metin('tip')
  const varsayilanTip = istenenTip && GECERLI_TIPLER.has(istenenTip) ? istenenTip : 'genel'

  const telefon = iletisimTelefonu(kurumsal)
  const eposta = iletisimEpostasi(kurumsal)
  const whatsapp = whatsappBaglantisi(whatsappNumarasi(kurumsal), whatsappMesaji())

  return (
    <div className="kapsayici py-10 sm:py-14">
      <header className="mb-10 flex max-w-2xl flex-col gap-3">
        <h1 className="font-serif text-baslik-1-mobil font-medium sm:text-baslik-1">İletişim</h1>
        <p className="text-metin-2 leading-relaxed">
          Alım, satım, kiralama veya değerleme — hangisi olursa olsun önce sizi dinliyoruz. Formu
          doldurmak zorunda değilsiniz; WhatsApp genellikle en hızlı yol.
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
        <div className="border-kenar bg-yuzey rounded-kart border-[0.5px] p-5 sm:p-8">
          <TalepFormu
            eylem={talepGonder}
            turnstileSiteAnahtari={turnstileSiteAnahtari()}
            varsayilanTip={varsayilanTip}
            ilgiliIlan={metin('ilan')}
            ilgiliMahalle={metin('mahalle')}
            baslik={
              varsayilanTip === 'degerleme' ? 'Taşınmazınızın değerini öğrenin' : 'Bize yazın'
            }
            aciklama={
              varsayilanTip === 'degerleme'
                ? 'Mahalle, metrekare ve bina bilgilerinizi paylaşın; size gerçek bir değer aralığı ve nasıl hesapladığımızı anlatalım. Satmayı düşünmeseniz bile bilmek işinize yarar.'
                : 'Aradığınızı ne kadar ayrıntılı anlatırsanız o kadar isabetli seçenek sunabiliriz.'
            }
          />
        </div>

        <aside className="flex flex-col gap-4">
          <div className="border-kenar bg-yuzey rounded-kart border-[0.5px] p-5">
            <h2 className="font-sans text-govde font-medium">Doğrudan ulaşın</h2>

            <ul className="mt-4 flex flex-col gap-3">
              {whatsapp ? (
                <li>
                  <Buton href={whatsapp} dis tamGenislik>
                    <WhatsappIkon width={18} height={18} />
                    WhatsApp&apos;tan yazın
                  </Buton>
                </li>
              ) : null}
              {telefon ? (
                <li>
                  <Buton href={`tel:${telefon.replace(/\s/g, '')}`} gorunum="ikincil" tamGenislik>
                    <TelefonIkon width={18} height={18} />
                    {telefon}
                  </Buton>
                </li>
              ) : null}
              {eposta ? (
                <li>
                  <Buton href={`mailto:${eposta}`} gorunum="ikincil" tamGenislik>
                    <PostaIkon width={18} height={18} />
                    E-posta gönderin
                  </Buton>
                </li>
              ) : null}
            </ul>

            {!whatsapp && !telefon && !eposta ? (
              <p className="text-metin-3 mt-3 text-govde-kucuk leading-relaxed">
                İletişim bilgileri yönetim panelinden girildiğinde burada görünecek. O zamana kadar
                yandaki formu kullanabilirsiniz.
              </p>
            ) : null}

            {kurumsal?.calismaSaatleri ? (
              <p className="text-metin-3 mt-4 text-mikro">
                Çalışma saatleri: {kurumsal.calismaSaatleri}
              </p>
            ) : null}
          </div>

          {kurumsal?.adres ? (
            <div className="border-kenar bg-yuzey rounded-kart border-[0.5px] p-5">
              <h2 className="font-sans text-govde font-medium">Ofis</h2>
              <address className="text-metin-2 mt-2 text-govde-kucuk leading-relaxed not-italic">
                {kurumsal.adres}
              </address>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
