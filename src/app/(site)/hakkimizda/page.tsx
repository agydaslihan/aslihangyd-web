import type { Metadata } from 'next'

import { Bolum, Eyebrow } from '@/components/ui/Bolum'
import { SayfaVitrini } from '@/components/duzen/SayfaVitrini'
import { BosDurum } from '@/components/ui/BosDurum'
import { Buton } from '@/components/ui/Buton'
import { DogrulanmisIkon } from '@/components/ui/Ikon'
import { ZenginMetin } from '@/components/ui/ZenginMetin'
import Image from 'next/image'

import { hakkimizdaGetir } from '@/lib/veri/hakkimizda'
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
  const [kurumsal, sayfa, hakkimizda] = await Promise.all([
    kurumsalBilgileriGetir(),
    sayfaGetir('hakkimizda'),
    hakkimizdaGetir(),
  ])

  /**
   * ⚠️ İÇERİK İKİ KAYNAKTAN OKUNUYOR VE SIRA ÖNEMLİ.
   *
   * Asıl kaynak yeni "Hakkımızda Sayfası" globali. Ama bu sayfa daha önce
   * `Sayfalar` koleksiyonundaki `hakkimizda` kaydından besleniyordu; oraya
   * metin girilmişse globale geçişte sessizce kaybolurdu.
   *
   * Global boşsa eski kayda düşülüyor. Yedek, taşınma tamamlanınca
   * kaldırılabilir — ama içerik kaybettirmeden.
   */
  const icerik = hakkimizda.icerik ?? sayfa?.icerik ?? null

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
      <SayfaVitrini>
        <Eyebrow>Kurumsal</Eyebrow>
        <h1 className="text-metin mt-4 font-baslik text-baslik-1-mobil font-medium sm:text-baslik-1">
          Hakkımızda
        </h1>
        <p className="text-metin-2 mt-5 text-govde leading-relaxed">
          {hakkimizda.girisMetni ??
            'Çorlu’da gayrimenkul danışmanlığı yapıyoruz. İşimizin merkezinde ilan değil, karar var.'}
        </p>
      </SayfaVitrini>

      <div className="kapsayici py-12 sm:py-16">
        {/*
          ⚠️ Portre metnin YANINDA, üstünde değil: metnin ilk satırı
          sayfanın en çok okunan yeri ve bir fotoğraf onu aşağı iterdi.
          Mobilde alt alta düşüyor.
        */}
        <div className={hakkimizda.portre ? 'gap-8 lg:flex lg:items-start' : undefined}>
          <div className={hakkimizda.portre ? 'lg:flex-1' : undefined}>
            {icerik ? (
              <ZenginMetin veri={icerik} />
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

          {hakkimizda.portre ? (
            <figure className="mt-8 shrink-0 lg:mt-0 lg:w-72">
              <Image
                src={hakkimizda.portre.url}
                alt={hakkimizda.portre.alt || hakkimizda.portreAltMetni || 'Portre'}
                width={hakkimizda.portre.en ?? 640}
                height={hakkimizda.portre.boy ?? 800}
                sizes="(max-width: 1024px) 100vw, 18rem"
                className="rounded-buyuk w-full object-cover"
              />
              {hakkimizda.portreAltMetni ? (
                <figcaption className="text-metin-3 mt-2 text-govde-kucuk">
                  {hakkimizda.portreAltMetni}
                </figcaption>
              ) : null}
            </figure>
          ) : null}
        </div>

        {/* ⚠️ Ek görseller TEMBEL: sayfanın altında, ilk ekranda değiller. */}
        {hakkimizda.ekGorseller.length > 0 ? (
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hakkimizda.ekGorseller.map((oge) => (
              <figure key={oge.url} className="flex flex-col gap-2">
                <Image
                  src={oge.url}
                  alt={oge.alt || oge.aciklama || ''}
                  width={oge.en ?? 1200}
                  height={oge.boy ?? 750}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  loading="lazy"
                  className="rounded-buyuk w-full object-cover"
                />
                {oge.aciklama ? (
                  <figcaption className="text-metin-3 text-govde-kucuk">{oge.aciklama}</figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        ) : null}
      </div>

      <Bolum zemin="yuzey">
        <div className="flex max-w-3xl flex-col gap-4">
          <h2 className="flex items-center gap-2 font-baslik text-baslik-2-mobil font-medium">
            <DogrulanmisIkon width={22} height={22} className="text-basari shrink-0" />
            Yasal bilgiler
          </h2>

          <p className="text-metin-2 leading-relaxed">
            Taşınmaz ticareti Türkiye&apos;de yetki belgesine tabidir. Yayınladığımız her satılık
            ilan, mülk sahibinin e-Devlet üzerinden verdiği EİDS yetkisine dayanır ve ilan
            sayfasında taşınmaz numarasıyla birlikte gösterilir. Yetkisi olmayan bir taşınmazın
            ilanını yayınlamıyoruz — bu, sistemimizde kod seviyesinde engellenmiştir.
          </p>

          {/*
            ⚠️ YASAL BİLGİLER TABLOSU CAM DEĞİL, OPAK KALDI.

            Yetki belgesi numarası, MERSİS ve vergi bilgileri yasal
            zorunluluk (kural 1). Arkası görünen bir yüzeyde okunurluk
            zemindeki içeriğe bağlanır; bu tablo her koşulda net okunmalı.
            Yalnızca köşe yarıçapı Aurora ölçeğine geçti.
          */}
          {yasalSatirlar.length > 0 ? (
            <dl className="border-kenar bg-yuzey divide-kenar rounded-buyuk mt-2 divide-y border-[0.5px]">
              {yasalSatirlar.map((satir) => (
                <div
                  key={satir.etiket}
                  className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                >
                  <dt className="text-metin-2 text-govde-kucuk">{satir.etiket}</dt>
                  <dd className="rakam text-govde-kucuk font-medium">{satir.deger}</dd>
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
