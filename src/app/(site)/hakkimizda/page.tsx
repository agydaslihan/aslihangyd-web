import type { Metadata } from 'next'

import { Bolum } from '@/components/ui/Bolum'
import { BosDurum } from '@/components/ui/BosDurum'
import { Buton } from '@/components/ui/Buton'
import { DogrulanmisIkon } from '@/components/ui/Ikon'
import { ZenginMetin } from '@/components/ui/ZenginMetin'
import { kurumsalBilgileriGetir } from '@/lib/kurumsal'
import { mutlakAdres, SITE_UNVANI } from '@/lib/site'
import { sayfaGetir } from '@/lib/veri/sayfalar'

export const metadata: Metadata = {
  title: 'Hakkımızda',
  description:
    'Çorlu odaklı gayrimenkul danışmanlığı. Yetki belgesi bilgilerimiz, çalışma ilkelerimiz ' +
    've veriye dayalı yaklaşımımız.',
  alternates: { canonical: mutlakAdres('/hakkimizda') },
}

export default async function HakkimizdaSayfasi() {
  const [kurumsal, sayfa] = await Promise.all([kurumsalBilgileriGetir(), sayfaGetir('hakkimizda')])

  const yasalSatirlar = [
    { etiket: 'Ticaret unvanı', deger: kurumsal?.ticaretUnvani },
    { etiket: 'Taşınmaz Ticareti Yetki Belgesi No', deger: kurumsal?.yetkiBelgesiNo },
    { etiket: 'Sorumlu Emlak Danışmanı belge no', deger: kurumsal?.sorumluDanismanBelgeNo },
    { etiket: 'MERSİS numarası', deger: kurumsal?.mersisNo },
    { etiket: 'Vergi dairesi', deger: kurumsal?.vergiDairesi },
    { etiket: 'Vergi numarası', deger: kurumsal?.vergiNo },
  ].filter((satir) => typeof satir.deger === 'string' && satir.deger.trim() !== '')

  return (
    <>
      <div className="kapsayici py-10 sm:py-14">
        <header className="mb-8 flex max-w-2xl flex-col gap-3">
          <h1 className="text-[2rem] leading-tight sm:text-[2.5rem]">Hakkımızda</h1>
          <p className="text-murekkep-2 leading-relaxed">
            Çorlu&apos;da gayrimenkul danışmanlığı yapıyoruz. İşimizin merkezinde ilan değil, karar
            var.
          </p>
        </header>

        {sayfa?.icerik ? (
          <ZenginMetin veri={sayfa.icerik} />
        ) : (
          <BosDurum
            baslik="Tanıtım metni hazırlanıyor"
            neden="Bu sayfada kimiz, nasıl çalışıyoruz ve neye göre tavsiye veriyoruz sorularının cevabı yer alacak."
            sade
            eylem={
              <Buton href="/iletisim" gorunum="ikincil">
                Bize ulaşın
              </Buton>
            }
          />
        )}
      </div>

      <Bolum zemin="yuzey">
        <div className="flex max-w-3xl flex-col gap-4">
          <h2 className="flex items-center gap-2 text-[1.5rem] leading-tight">
            <DogrulanmisIkon width={22} height={22} className="text-artis shrink-0" />
            Yasal bilgiler
          </h2>

          <p className="text-murekkep-2 leading-relaxed">
            Taşınmaz ticareti Türkiye&apos;de yetki belgesine tabidir. Yayınladığımız her satılık
            ilan, mülk sahibinin e-Devlet üzerinden verdiği EİDS yetkisine dayanır ve ilan
            sayfasında taşınmaz numarasıyla birlikte gösterilir. Yetkisi olmayan bir taşınmazın
            ilanını yayınlamıyoruz — bu, sistemimizde kod seviyesinde engellenmiştir.
          </p>

          {yasalSatirlar.length > 0 ? (
            <dl className="border-cizgi bg-yuzey divide-cizgi rounded-yumusak mt-2 divide-y border">
              {yasalSatirlar.map((satir) => (
                <div
                  key={satir.etiket}
                  className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                >
                  <dt className="text-murekkep-2 text-sm">{satir.etiket}</dt>
                  <dd className="rakam text-sm font-medium">{satir.deger}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <BosDurum
              baslik="Yetki belgesi bilgileri henüz girilmedi"
              neden="Taşınmaz Ticareti Yetki Belgesi numarası ve işletme bilgileri yönetim panelinden girildiğinde bu alanda yayınlanacak. Uydurma bir numara göstermiyoruz."
              sade
            />
          )}
        </div>
      </Bolum>

      <YapilandirilmisVeri unvan={kurumsal?.ticaretUnvani ?? SITE_UNVANI} />
    </>
  )
}

function YapilandirilmisVeri({ unvan }: { unvan: string }) {
  const veri = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: unvan,
    url: mutlakAdres('/'),
    areaServed: { '@type': 'City', name: 'Çorlu' },
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'TR',
      addressRegion: 'Tekirdağ',
      addressLocality: 'Çorlu',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(veri).replace(/</g, '\\u003c') }}
    />
  )
}
