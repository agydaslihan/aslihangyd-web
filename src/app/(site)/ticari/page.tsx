import type { Metadata } from 'next'
import Link from 'next/link'

import { IlanKarti } from '@/components/ilan/IlanKarti'
import { Bolum, BolumBasligi } from '@/components/ui/Bolum'
import { BosDurum } from '@/components/ui/BosDurum'
import { Buton } from '@/components/ui/Buton'
import { AlanIkon, GrafikIkon, KonumIkon, OkIkon, WhatsappIkon } from '@/components/ui/Ikon'
import { whatsappBaglantisi } from '@/lib/bicimlendirme'
import { kurumsalBilgileriGetir, whatsappNumarasi } from '@/lib/kurumsal'
import { TICARI_KATEGORILER } from '@/lib/secenekler'
import { mutlakAdres } from '@/lib/site'
import { ilanlariGetir } from '@/lib/veri/ilanlar'

export const metadata: Metadata = {
  title: 'Ticari gayrimenkul — Çorlu ve Çerkezköy fabrika, depo, arsa',
  description:
    'Çorlu ve Çerkezköy OSB çevresinde fabrika, depo, iş yeri ve sanayi arsası. ' +
    'Ticari gayrimenkulde konum, ulaşım ve altyapı analiziyle danışmanlık.',
  alternates: { canonical: mutlakAdres('/ticari') },
}

export default async function TicariSayfasi() {
  const [sonuclar, kurumsal] = await Promise.all([
    Promise.all(TICARI_KATEGORILER.map((kategori) => ilanlariGetir({ kategori }, 1, 6))),
    kurumsalBilgileriGetir(),
  ])

  const ilanlar = sonuclar
    .flatMap((sonuc) => sonuc.ilanlar)
    // Aynı ilan birden fazla sorgudan gelemez ama savunmacı davranıyoruz.
    .filter((ilan, sira, hepsi) => hepsi.findIndex((digeri) => digeri.id === ilan.id) === sira)
    .slice(0, 6)

  const whatsapp = whatsappBaglantisi(
    whatsappNumarasi(kurumsal),
    'Merhaba, ticari gayrimenkul hakkında bilgi almak istiyorum.',
  )

  return (
    <>
      <section className="border-cizgi border-b">
        <div className="kapsayici py-14 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-pirinc-koyu text-mikro font-semibold tracking-[0.1em] uppercase">
              Ticari gayrimenkul
            </p>

            <h1 className="mt-4 text-[2.25rem] leading-[1.1] sm:text-[3rem]">
              Fabrika, depo, sanayi arsası
            </h1>

            <p className="text-murekkep-2 mt-6 max-w-2xl text-lg leading-relaxed">
              Ticari gayrimenkulde karar, konut kararından farklı çalışır. Metrekare fiyatı tek
              başına hiçbir şey söylemez; tavan yüksekliği, vinç kapasitesi, trafo gücü, tır manevra
              alanı ve yola çıkış mesafesi söyler. Bu tarafta ayrı bir dille çalışıyoruz.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Buton href="/portfoy?kategori=depo" boyut="buyuk">
                Ticari portföyü görün
                <OkIkon width={18} height={18} />
              </Buton>
              {whatsapp ? (
                <Buton href={whatsapp} dis gorunum="ikincil" boyut="buyuk">
                  <WhatsappIkon width={18} height={18} />
                  İhtiyacınızı anlatın
                </Buton>
              ) : (
                <Buton href="/iletisim?tip=ticari" gorunum="ikincil" boyut="buyuk">
                  İhtiyacınızı anlatın
                </Buton>
              )}
            </div>
          </div>
        </div>
      </section>

      <Bolum>
        <BolumBasligi
          ustBaslik="Neden Çorlu"
          baslik="Sanayinin İstanbul'a en yakın nefes alanı"
          aciklama="Çorlu ve Çerkezköy organize sanayi bölgeleri, İstanbul'un üretim yükünü uzun süredir paylaşıyor. Bu bölgede taşınmaz kararı verirken bakılması gereken başlıklar:"
        />

        <div className="grid gap-6 sm:grid-cols-3 lg:gap-8">
          {[
            {
              Ikon: KonumIkon,
              baslik: 'Ulaşım ve lojistik',
              metin:
                'TEM ve D-100 bağlantısı, tır giriş-çıkış kolaylığı, limana ve havalimanına mesafe. Lojistik maliyeti kira farkını hızla kapatır.',
            },
            {
              Ikon: AlanIkon,
              baslik: 'Yapısal uygunluk',
              metin:
                'Kapalı alan, tavan yüksekliği, kolon aralığı, vinç kapasitesi, trafo gücü, yangın altyapısı. Uygun olmayan yapıyı dönüştürmek çoğu zaman yeniden yapmaktan pahalıdır.',
            },
            {
              Ikon: GrafikIkon,
              baslik: 'İmar ve ruhsat',
              metin:
                'Parselin imar durumu, yapı ruhsatı, iskân ve faaliyet konusuna uygunluk. Bunlar sonradan çözülen değil, önceden kontrol edilen konulardır.',
            },
          ].map(({ Ikon, baslik, metin }) => (
            <div key={baslik} className="flex flex-col gap-3">
              <span className="bg-lacivert-acik text-lacivert rounded-yumusak flex size-11 items-center justify-center">
                <Ikon width={20} height={20} />
              </span>
              <h3 className="font-sans text-base font-semibold">{baslik}</h3>
              <p className="text-murekkep-2 text-[0.9375rem] leading-relaxed">{metin}</p>
            </div>
          ))}
        </div>

        <p className="text-murekkep-3 mt-8 max-w-2xl text-sm leading-relaxed">
          Bu sayfadaki bölgesel değerlendirmeler genel niteliktedir. Belirli bir parselin imar
          durumu, ruhsat geçmişi ve altyapı kapasitesi yalnızca resmî kayıtlardan doğrulanabilir;
          bir işlem öncesinde bunları birlikte kontrol ediyoruz.
        </p>
      </Bolum>

      <Bolum zemin="yuzey">
        <BolumBasligi
          ustBaslik="Portföy"
          baslik="Ticari taşınmazlarımız"
          yan={
            <Buton href="/portfoy?kategori=depo" gorunum="ikincil">
              Tümünü gör
              <OkIkon width={16} height={16} />
            </Buton>
          }
        />

        {ilanlar.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {ilanlar.map((ilan) => (
              <IlanKarti key={ilan.id} ilan={ilan} />
            ))}
          </div>
        ) : (
          <BosDurum
            baslik="Ticari portföyümüz görüşmeye açık"
            aciklama="Ticari taşınmazların önemli bir kısmını yayınlamıyoruz — malik tarafı çoğu zaman ilanın açık olmasını istemiyor. Aradığınız özellikleri anlatın, portföyümüzden ve ağımızdan uygun olanları size özel derleyelim."
            ikon={<AlanIkon width={32} height={32} />}
            eylem={<Buton href="/iletisim?tip=ticari">İhtiyacınızı anlatın</Buton>}
          />
        )}
      </Bolum>

      <Bolum zemin="lacivert">
        <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-[1.75rem] leading-tight text-white sm:text-[2.25rem]">
              Ticari taşınmazınızı mı değerlendirmek istiyorsunuz?
            </h2>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-white/75">
              Fabrika, depo veya sanayi arsanız için gerçek piyasa karşılığını ve doğru alıcı
              profilini konuşalım. Ticari tarafta alıcı sayısı azdır ama doğru alıcıyı bulmak
              işlemin tamamını belirler.
            </p>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/iletisim?tip=ticari"
              className="text-lacivert-koyu rounded-yumusak inline-flex min-h-13 items-center justify-center bg-white px-6 font-medium transition-opacity hover:opacity-90"
            >
              Görüşme talep edin
            </Link>
            {whatsapp ? (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-yumusak inline-flex min-h-13 items-center justify-center border border-white/30 px-6 font-medium text-white transition-colors hover:bg-white/10"
              >
                WhatsApp
              </a>
            ) : null}
          </div>
        </div>
      </Bolum>
    </>
  )
}
