import Link from 'next/link'

import { IlanKarti } from '@/components/ilan/IlanKarti'
import { MahalleKarti } from '@/components/mahalle/MahalleKarti'
import { Bolum, BolumBasligi } from '@/components/ui/Bolum'
import { BosDurum } from '@/components/ui/BosDurum'
import { Buton } from '@/components/ui/Buton'
import { DogrulanmisIkon, GrafikIkon, KonumIkon, OkIkon } from '@/components/ui/Ikon'
import { whatsappBaglantisi } from '@/lib/bicimlendirme'
import { kurumsalBilgileriGetir, whatsappNumarasi } from '@/lib/kurumsal'
import { whatsappMesaji } from '@/lib/site'
import { oneCikanIlanlariGetir } from '@/lib/veri/ilanlar'
import { mahalleleriGetir } from '@/lib/veri/mahalleler'

export default async function AnaSayfa() {
  const [ilanlar, mahalleler, kurumsal] = await Promise.all([
    oneCikanIlanlariGetir(3),
    mahalleleriGetir(),
    kurumsalBilgileriGetir(),
  ])

  const whatsapp = whatsappBaglantisi(whatsappNumarasi(kurumsal), whatsappMesaji())

  return (
    <>
      <Kahraman whatsapp={whatsapp} />

      <YaklasimBolumu />

      <Bolum zemin="yuzey">
        <BolumBasligi
          ustBaslik="Portföy"
          baslik="Öne çıkan taşınmazlar"
          aciklama="Her ilan, mülk sahibinin e-Devlet üzerinden verdiği EİDS yetkisiyle yayınlanır."
          yan={
            <Buton href="/portfoy" gorunum="ikincil">
              Tüm portföy
              <OkIkon width={16} height={16} />
            </Buton>
          }
        />

        {ilanlar.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {ilanlar.map((ilan, sira) => (
              <IlanKarti key={ilan.id} ilan={ilan} oncelikli={sira === 0} />
            ))}
          </div>
        ) : (
          <BosDurum
            baslik="Portföy hazırlanıyor"
            neden="Şu anda yayında ilan bulunmuyor. Aradığınız taşınmazı bize anlatın; portföyümüze girdiğinde ilk siz haberdar olun."
            eylem={
              <Buton href="/iletisim" gorunum="ikincil">
                Aradığınızı anlatın
              </Buton>
            }
          />
        )}
      </Bolum>

      <Bolum>
        <BolumBasligi
          ustBaslik="Mahalleler"
          baslik="Çorlu'yu mahalle mahalle tanıyın"
          aciklama="Her mahallenin kendi hikâyesi ve kendi rakamları var. Hangi mahallenin hangi değer sürücüsünden beslendiğini anlatıyoruz."
          yan={
            <Buton href="/mahalleler" gorunum="ikincil">
              Tüm mahalleler
              <OkIkon width={16} height={16} />
            </Buton>
          }
        />

        {mahalleler.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {mahalleler.slice(0, 6).map((mahalle) => (
              <MahalleKarti key={mahalle.id} mahalle={mahalle} />
            ))}
          </div>
        ) : (
          <BosDurum
            baslik="Mahalle sayfaları hazırlanıyor"
            neden="Pilot mahallelerin analiz metinleri ve rakamları üzerinde çalışıyoruz. Hazır olduğunda burada göreceksiniz."
            ikon={<KonumIkon width={32} height={32} />}
          />
        )}
      </Bolum>

      <CagriBandi whatsapp={whatsapp} />
    </>
  )
}

function Kahraman({ whatsapp }: { whatsapp: string | null }) {
  return (
    <section className="border-cizgi border-b">
      <div className="kapsayici py-16 sm:py-20 lg:py-28">
        <div className="max-w-3xl">
          <p className="text-pirinc-koyu text-mikro font-semibold tracking-[0.1em] uppercase">
            Çorlu · Tekirdağ
          </p>

          <h1 className="mt-4 text-[2.25rem] leading-[1.1] sm:text-[3rem] lg:text-[3.5rem]">
            Gayrimenkul kararı hisle değil, <span className="text-pirinc-koyu">rakamla</span>{' '}
            verilir.
          </h1>

          <p className="text-murekkep-2 mt-6 max-w-2xl text-lg leading-relaxed">
            Çorlu&apos;da bir taşınmazın ne kadar ettiğini, kaç yılda kendini ödediğini ve hangi
            mahallenin hangi değer sürücüsünden beslendiğini gösteriyoruz. İlan listelemiyoruz —
            karar veriyoruz.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Buton href="/portfoy" boyut="buyuk">
              Portföyü inceleyin
              <OkIkon width={18} height={18} />
            </Buton>
            {whatsapp ? (
              <Buton href={whatsapp} dis gorunum="ikincil" boyut="buyuk">
                WhatsApp&apos;tan sorun
              </Buton>
            ) : (
              <Buton href="/iletisim" gorunum="ikincil" boyut="buyuk">
                Bize ulaşın
              </Buton>
            )}
          </div>

          <p className="text-murekkep-3 mt-6 flex items-center gap-2 text-sm">
            <DogrulanmisIkon width={16} height={16} className="text-artis shrink-0" />
            Tüm ilanlarımız EİDS doğrulamalıdır ve taşınmaz numarasıyla birlikte yayınlanır.
          </p>
        </div>
      </div>
    </section>
  )
}

const YAKLASIMLAR = [
  {
    Ikon: GrafikIkon,
    baslik: 'Önce rakam, sonra fotoğraf',
    metin:
      'Her taşınmazda kira çarpanı, brüt getiri ve amortisman süresi hesaplanır. Kira verisi yoksa rakam uydurmayız — alanı boş bırakırız.',
  },
  {
    Ikon: KonumIkon,
    baslik: 'Mahalleyi biliriz',
    metin:
      'Çorlu OSB, hızlı tren, havalimanı, şehir hastanesi. Her mahallenin hangi sürücüden beslendiğini anlatır, mesafeleri veriyle gösteririz.',
  },
  {
    Ikon: DogrulanmisIkon,
    baslik: 'Doğrulanmış ilan',
    metin:
      'Yayınladığımız her ilan, mülk sahibinin e-Devlet üzerinden verdiği yetkiye dayanır. Taşınmaz numarası ilan sayfasında görünür.',
  },
]

function YaklasimBolumu() {
  return (
    <Bolum>
      <BolumBasligi
        ustBaslik="Yaklaşımımız"
        baslik="Rakiplerimizden farkımız ne?"
        aciklama="Çorlu'da ilan listeleyen çok kişi var. Biz ilanı değil, kararı satıyoruz."
      />

      <div className="grid gap-6 sm:grid-cols-3 lg:gap-8">
        {YAKLASIMLAR.map(({ Ikon, baslik, metin }) => (
          <div key={baslik} className="flex flex-col gap-3">
            <span className="bg-lacivert-acik text-lacivert rounded-yumusak flex size-11 items-center justify-center">
              <Ikon width={20} height={20} />
            </span>
            <h3 className="font-sans text-base font-semibold">{baslik}</h3>
            <p className="text-murekkep-2 text-[0.9375rem] leading-relaxed">{metin}</p>
          </div>
        ))}
      </div>
    </Bolum>
  )
}

function CagriBandi({ whatsapp }: { whatsapp: string | null }) {
  return (
    <Bolum zemin="lacivert">
      <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-[1.75rem] leading-tight text-white sm:text-[2.25rem]">
            Evinizin bugün ne ettiğini merak ediyor musunuz?
          </h2>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-white/75">
            Satmayı düşünmeseniz bile bilmek işinize yarar. Mahalle, metrekare ve bina bilgilerinizi
            paylaşın; size gerçek bir değer aralığı ve nasıl hesapladığımızı anlatalım.
          </p>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row">
          <Link
            href="/iletisim?tip=degerleme"
            className="text-lacivert-koyu rounded-yumusak inline-flex min-h-13 items-center justify-center bg-white px-6 font-medium transition-opacity hover:opacity-90"
          >
            Değerleme isteyin
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
  )
}
