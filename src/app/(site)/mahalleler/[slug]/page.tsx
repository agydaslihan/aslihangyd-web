import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { IlanKarti } from '@/components/ilan/IlanKarti'
import { DroneVideo } from '@/components/medya/DroneVideo'
import { SanalTur } from '@/components/medya/SanalTur'
import { MahalleSkoru } from '@/components/skor/MahalleSkoru'
import { YakindaBolumu } from '@/components/mahalle/YakindaBolumu'
import { Bolum, BolumBasligi } from '@/components/ui/Bolum'
import { BosDurum } from '@/components/ui/BosDurum'
import { Buton } from '@/components/ui/Buton'
import { Feragat, VeriNotu } from '@/components/ui/Feragat'
import { GrafikIkon, KonumIkon, OkIkon, WhatsappIkon } from '@/components/ui/Ikon'
import { IstatistikIzgarasi, IstatistikKarti } from '@/components/ui/IstatistikKarti'
import { Rozet } from '@/components/ui/Rozet'
import { ZenginMetin } from '@/components/ui/ZenginMetin'
import { carpanYaz, degisimYaz, paraYaz, sayiYaz, whatsappBaglantisi } from '@/lib/bicimlendirme'
import { kurumsalBilgileriGetir, whatsappNumarasi } from '@/lib/kurumsal'
import { mutlakAdres } from '@/lib/site'
import { tarihiYaz } from '@/lib/tarih'
import { mahalledekiIlanlariGetir } from '@/lib/veri/ilanlar'
import { karsilastirilabilirMahalleler, mahalleGetir } from '@/lib/veri/mahalleler'
import type { Mahalleler } from '@/payload-types'

type SayfaOzellikleri = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: SayfaOzellikleri): Promise<Metadata> {
  const { slug } = await params
  const mahalle = await mahalleGetir(slug)

  if (!mahalle) return { title: 'Mahalle bulunamadı' }

  const aciklama =
    mahalle.seoAciklama ??
    mahalle.ozet ??
    `${mahalle.ad} Mahallesi'nde konut fiyatları, kira çarpanı ve yatırım analizi.`

  return {
    title: mahalle.seoBaslik ?? `${mahalle.ad} Mahallesi — Çorlu yatırım rehberi`,
    description: aciklama,
    alternates: { canonical: mutlakAdres(`/mahalleler/${mahalle.slug}`) },
    openGraph: {
      title: mahalle.seoBaslik ?? `${mahalle.ad} Mahallesi`,
      description: aciklama,
      url: mutlakAdres(`/mahalleler/${mahalle.slug}`),
      type: 'article',
    },
  }
}

export default async function MahalleDetayi({ params }: SayfaOzellikleri) {
  const { slug } = await params
  const mahalle = await mahalleGetir(slug)

  if (!mahalle) notFound()

  const [ilanlar, digerMahalleler, kurumsal] = await Promise.all([
    mahalledekiIlanlariGetir(mahalle.id, 3),
    karsilastirilabilirMahalleler(mahalle.slug, 3),
    kurumsalBilgileriGetir(),
  ])

  const whatsapp = whatsappBaglantisi(
    whatsappNumarasi(kurumsal),
    `Merhaba, ${mahalle.ad} Mahallesi hakkında bilgi almak istiyorum.`,
  )

  return (
    <>
      <YapilandirilmisVeri mahalle={mahalle} />

      {/* 1 ── Hero (drone video Faz 3'te; şimdilik kapak görseli) */}
      <MahalleKahramani mahalle={mahalle} />

      <div className="kapsayici py-10 sm:py-14">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-16">
          <div className="min-w-0 space-y-14">
            {/* 2 ── Yatırım skoru */}
            <section aria-labelledby="skor">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="skor" className="font-sans text-baslik-3 font-medium">
                  Yatırım skoru
                </h2>
                <Link
                  href="/yatirim-skoru-metodolojisi"
                  className="text-vurgu text-govde-kucuk underline underline-offset-2"
                >
                  Nasıl hesaplanıyor?
                </Link>
              </div>

              <MahalleSkoru
                bilesenler={{
                  fiyatTrendi: mahalle.yatirimSkoru?.fiyatTrendi ?? null,
                  kiraCarpani: mahalle.yatirimSkoru?.kiraCarpaniPuani ?? null,
                  sanayiYakinligi: mahalle.yatirimSkoru?.sanayiYakinligi ?? null,
                  ulasim: mahalle.yatirimSkoru?.ulasim ?? null,
                  sosyalDonati: mahalle.yatirimSkoru?.sosyalDonati ?? null,
                  arzBaskisi: mahalle.yatirimSkoru?.arzBaskisi ?? null,
                }}
                hesaplanmaTarihi={tarihiYaz(mahalle.yatirimSkoru?.hesaplanmaTarihi)}
              />
            </section>

            {/* 3 ── Temel rakamlar */}
            <section aria-labelledby="rakamlar">
              <h2 id="rakamlar" className="mb-4 font-sans text-baslik-3 font-medium">
                Temel rakamlar
              </h2>

              {/*
                ⚠️ Bunlar GÖZLENMİŞ rakamlar, hesaplanmış değil — bu yüzden
                `IstatistikKarti` ve gözlem sayısı her kartta görünüyor.
                "Ortalama m² 42.000 TL" ile "Ortalama m² 42.000 TL (n = 3)"
                aynı şey değildir ve ikincisini gösteren tek site biz olacağız.
              */}
              <IstatistikIzgarasi>
                <IstatistikKarti
                  etiket="Ortalama m² satış"
                  deger={paraYaz(mahalle.ortalamaM2Satis)}
                  gozlemSayisi={mahalle.gozlemSayisi ?? null}
                  bosAciklama="Yeterli gözlem birikince yayınlanacak."
                />
                <IstatistikKarti
                  etiket="Ortalama aylık kira"
                  deger={paraYaz(mahalle.ortalamaKira)}
                  gozlemSayisi={mahalle.gozlemSayisi ?? null}
                  bosAciklama="Yeterli gözlem birikince yayınlanacak."
                />
                <IstatistikKarti
                  etiket="Kira çarpanı"
                  deger={carpanYaz(mahalle.kiraCarpani)}
                  gozlemSayisi={mahalle.gozlemSayisi ?? null}
                  altBilgi="Kaç yıllık kira, satış fiyatına eşit"
                  bosAciklama="Satış ve kira verisi birlikte gerekiyor."
                />
                <IstatistikKarti
                  etiket="12 aylık değişim"
                  deger={degisimYaz(mahalle.degisim12Ay)}
                  gozlemSayisi={mahalle.gozlemSayisi ?? null}
                  bosAciklama="En az 12 ay veri gerekiyor."
                  ton={
                    typeof mahalle.degisim12Ay === 'number'
                      ? mahalle.degisim12Ay >= 0
                        ? 'artis'
                        : 'azalis'
                      : 'notr'
                  }
                />
              </IstatistikIzgarasi>

              <div className="mt-4 flex flex-col gap-2">
                <VeriNotu kaynak={mahalle.veriKaynagi} tarih={tarihiYaz(mahalle.verilerinTarihi)} />
                <Feragat ek="Rakamlar istenen fiyat gözlemlerine dayanır; gerçekleşen satış fiyatlarından farklı olabilir." />
              </div>
            </section>

            {/* 4 ── Fiyat trendi */}
            <section aria-labelledby="trend">
              <h2 id="trend" className="mb-4 font-sans text-baslik-3 font-medium">
                Fiyat trendi
              </h2>
              <YakindaBolumu
                oran="aspect-2/1 sm:aspect-3/1"
                ikon={<GrafikIkon width={30} height={30} />}
                baslik="Fiyat trend grafiği için veri biriktiriyoruz"
                aciklama="Grafik, en az 6 aylık kendi gözlem verimiz oluştuğunda açılacak. Uydurma bir seri çizmek yerine beklemeyi tercih ediyoruz."
              />
            </section>

            {/* 5 ── Harita */}
            <section aria-labelledby="harita">
              <h2 id="harita" className="mb-4 font-sans text-baslik-3 font-medium">
                Konum ve çevre
              </h2>
              <YakindaBolumu
                oran="aspect-16/9"
                ikon={<KonumIkon width={30} height={30} />}
                baslik="Etkileşimli harita hazırlanıyor"
                aciklama="Okul, sağlık, market, park, sanayi ve ulaşım katmanlarıyla birlikte mahalle sınırı burada gösterilecek."
              />
            </section>

            {/* 6 ── 360° tur */}
            <section aria-labelledby="tur">
              <h2 id="tur" className="mb-4 font-sans text-baslik-3 font-medium">
                360° sokak turu
              </h2>
              {mahalle.sanalTurUrl ? (
                <SanalTur adres={mahalle.sanalTurUrl} baslik={`${mahalle.ad} 360° turu`} />
              ) : (
                <YakindaBolumu
                  oran="aspect-16/9"
                  baslik="360° tur çekimi planlanıyor"
                  aciklama="Mahallenin ana caddelerinde 360° çekim yapıldığında burada gezilebilir olacak."
                />
              )}
            </section>

            {/* 7 ── Neden bu mahalle? */}
            <section aria-labelledby="neden">
              <h2 id="neden" className="mb-4 font-sans text-[1.5rem] leading-tight">
                Neden {mahalle.ad} Mahallesi?
              </h2>

              {mahalle.icerik ? (
                <ZenginMetin veri={mahalle.icerik} />
              ) : (
                <BosDurum
                  baslik="Mahalle analizi yazılıyor"
                  neden="Bu mahallenin değer sürücülerini, ulaşım bağlantılarını ve kimler için uygun olduğunu anlatan ayrıntılı analiz hazırlanıyor. Yüzeysel bir metin yayınlamak yerine, gerçekten işinize yarayacak olanı yazmayı tercih ediyoruz."
                  sade
                  eylem={
                    whatsapp ? (
                      <Buton href={whatsapp} dis gorunum="ikincil">
                        <WhatsappIkon width={16} height={16} />
                        Bu mahalleyi bize sorun
                      </Buton>
                    ) : undefined
                  }
                />
              )}

              {mahalle.sikSorulanlar && mahalle.sikSorulanlar.length > 0 ? (
                <div className="mt-10">
                  <h3 className="mb-4 font-sans text-baslik-3 font-medium">Sık sorulan sorular</h3>
                  <div className="border-kenar divide-kenar divide-y rounded-kart border-[0.5px]">
                    {mahalle.sikSorulanlar.map((kayit) => (
                      <details key={kayit.id ?? kayit.soru} className="group px-4 py-3">
                        <summary className="cursor-pointer list-none text-[0.9375rem] font-medium marker:content-none">
                          <span className="flex items-center justify-between gap-3">
                            {kayit.soru}
                            <span className="text-metin-3 transition-transform group-open:rotate-45">
                              +
                            </span>
                          </span>
                        </summary>
                        <p className="text-metin-2 mt-2 text-govde-kucuk leading-relaxed">
                          {kayit.cevap}
                        </p>
                      </details>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          </div>

          {/* Yan panel */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="border-kenar bg-yuzey rounded-kart border-[0.5px] p-5">
              <h2 className="font-sans text-govde font-medium">
                {mahalle.ad} Mahallesi&apos;nde ev sahibi misiniz?
              </h2>
              <p className="text-metin-2 mt-2 text-govde-kucuk leading-relaxed">
                Taşınmazınızın bugünkü değerini ve kiraya verilirse ne getireceğini hesaplayalım.
                Satmayı düşünmeseniz bile bilmek işinize yarar.
              </p>

              <div className="mt-4 flex flex-col gap-2">
                <Buton href={`/iletisim?tip=degerleme&mahalle=${mahalle.slug}`} tamGenislik>
                  Değerleme isteyin
                </Buton>
                {whatsapp ? (
                  <Buton href={whatsapp} dis gorunum="ikincil" tamGenislik>
                    <WhatsappIkon width={16} height={16} />
                    WhatsApp
                  </Buton>
                ) : null}
              </div>
            </div>

            {mahalle.nufus ? (
              <dl className="border-kenar bg-yuzey rounded-kart mt-4 border-[0.5px] p-5">
                <dt className="text-metin-3 text-mikro font-medium">Nüfus</dt>
                <dd className="rakam mt-1 text-baslik-3 font-medium">{sayiYaz(mahalle.nufus)}</dd>
              </dl>
            ) : null}
          </aside>
        </div>
      </div>

      {/* 8 ── Bu mahalledeki portföy */}
      <Bolum zemin="yuzey">
        <BolumBasligi
          ustBaslik="Portföy"
          baslik={`${mahalle.ad} Mahallesi'ndeki taşınmazlarımız`}
          yan={
            <Buton href={`/portfoy?mahalle=${mahalle.slug}`} gorunum="ikincil">
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
            baslik="Bu mahallede şu an yayında ilanımız yok"
            neden="Portföyümüz sürekli değişiyor. Bu mahallede aradığınız bir taşınmaz varsa bize anlatın; uygun bir seçenek geldiğinde ilk siz haberdar olun."
            eylem={
              <Buton href={`/iletisim?mahalle=${mahalle.slug}`} gorunum="ikincil">
                Aradığınızı anlatın
              </Buton>
            }
          />
        )}
      </Bolum>

      {/* 9 ── Karşılaştırma */}
      {digerMahalleler.length > 0 ? (
        <Bolum>
          <BolumBasligi
            ustBaslik="Karşılaştırma"
            baslik="Diğer mahallelerle yan yana"
            aciklama="Yalnızca rakamı olan mahalleler karşılaştırmaya dahil edilir."
          />
          <KarsilastirmaTablosu mahalle={mahalle} digerleri={digerMahalleler} />
          <Feragat sinifAdi="mt-4" />
        </Bolum>
      ) : null}
    </>
  )
}

function MahalleKahramani({ mahalle }: { mahalle: Mahalleler }) {
  const poster =
    typeof mahalle.droneVideoPosteri === 'object' && mahalle.droneVideoPosteri !== null
      ? mahalle.droneVideoPosteri
      : typeof mahalle.kapakGorseli === 'object'
        ? mahalle.kapakGorseli
        : null

  return (
    <section className="border-kenar relative border-b-[0.5px]">
      <div className="bg-vurgu-zemin relative aspect-16/9 max-h-[28rem] w-full overflow-hidden sm:aspect-21/9">
        {poster?.url ? (
          <>
            <Image
              src={poster.url}
              alt={poster.alt ?? `${mahalle.ad} Mahallesi`}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
            {/* Metin okunabilirliği için gradyan — dekoratif değil, kontrast aracı. */}
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent"
              aria-hidden
            />
          </>
        ) : (
          <div className="text-vurgu/30 flex h-full items-center justify-center">
            <KonumIkon width={48} height={48} />
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0">
          <div className="kapsayici pb-6 sm:pb-8">
            <nav aria-label="Sayfa yolu" className="mb-3 text-govde-kucuk">
              <ol
                className={`flex flex-wrap items-center gap-1.5 ${poster?.url ? 'text-white/70' : 'text-metin-3'}`}
              >
                <li>
                  <Link href="/" className="underline-offset-2 hover:underline">
                    Ana sayfa
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li>
                  <Link href="/mahalleler" className="underline-offset-2 hover:underline">
                    Mahalleler
                  </Link>
                </li>
              </ol>
            </nav>

            <h1
              className={`text-[2rem] leading-tight sm:text-[2.75rem] ${poster?.url ? 'text-white' : ''}`}
            >
              {mahalle.ad} Mahallesi
            </h1>

            {mahalle.ozet ? (
              <p
                className={`mt-2 max-w-2xl leading-relaxed ${poster?.url ? 'text-white/85' : 'text-metin-2'}`}
              >
                {mahalle.ozet}
              </p>
            ) : null}

            {mahalle.oneCikanOzellikler && mahalle.oneCikanOzellikler.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {mahalle.oneCikanOzellikler.map((ozellik) => (
                  <li key={ozellik.id ?? ozellik.metin}>
                    <Rozet ton={poster?.url ? 'notr' : 'lacivert'}>{ozellik.metin}</Rozet>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>

      {/*
        ⚠️ Oynatıcı hero'nun ALTINDA, içinde değil.

        Hero LCP öğesini taşıyor; oraya bir video çerçevesi koymak 2,5 sn
        hedefini doğrudan bozardı. Oynatıcı zaten tıkla-oynat: kapak
        görünür, çerçeve ancak dokununca yüklenir.
      */}
      {mahalle.droneVideoId ? (
        <div className="kapsayici py-4">
          <DroneVideo videoId={mahalle.droneVideoId} baslik={`${mahalle.ad} drone videosu`} />
        </div>
      ) : (
        <p className="kapsayici text-metin-3 py-3 text-mikro">
          Bu mahallenin drone videosu henüz çekilmedi. Çekim yapıldığında bu alanda yayınlanacak.
        </p>
      )}
    </section>
  )
}

function KarsilastirmaTablosu({
  mahalle,
  digerleri,
}: {
  mahalle: Mahalleler
  digerleri: Mahalleler[]
}) {
  const hepsi = [mahalle, ...digerleri]

  const satirlar = [
    { etiket: 'Ortalama m² satış', al: (m: Mahalleler) => paraYaz(m.ortalamaM2Satis) },
    { etiket: 'Ortalama kira', al: (m: Mahalleler) => paraYaz(m.ortalamaKira) },
    { etiket: 'Kira çarpanı', al: (m: Mahalleler) => carpanYaz(m.kiraCarpani) },
    { etiket: '12 aylık değişim', al: (m: Mahalleler) => degisimYaz(m.degisim12Ay) },
    { etiket: 'Gözlem sayısı (n)', al: (m: Mahalleler) => sayiYaz(m.gozlemSayisi) },
  ]

  return (
    // Dar ekranda tablo yatay kayar; sayfa gövdesi kaymaz.
    <div className="border-kenar rounded-kart overflow-x-auto border-[0.5px]">
      <table className="w-full min-w-[36rem] border-collapse text-govde-kucuk">
        <caption className="yalnizca-okuyucu">
          {mahalle.ad} Mahallesi&apos;nin diğer mahallelerle karşılaştırması
        </caption>
        <thead>
          <tr className="border-kenar bg-yuzey-2 border-b-[0.5px]">
            <th scope="col" className="text-metin-3 px-4 py-3 text-left font-medium">
              Gösterge
            </th>
            {hepsi.map((kayit) => (
              <th key={kayit.id} scope="col" className="px-4 py-3 text-left font-medium">
                {kayit.id === mahalle.id ? (
                  kayit.ad
                ) : (
                  <Link
                    href={`/mahalleler/${kayit.slug}`}
                    className="hover:text-vurgu underline-offset-2 hover:underline"
                  >
                    {kayit.ad}
                  </Link>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-kenar divide-y">
          {satirlar.map((satir) => (
            <tr key={satir.etiket}>
              <th scope="row" className="text-metin-2 px-4 py-3 text-left font-normal">
                {satir.etiket}
              </th>
              {hepsi.map((kayit) => {
                const deger = satir.al(kayit)
                return (
                  <td key={kayit.id} className="rakam px-4 py-3 font-medium">
                    {deger ?? <span className="text-metin-3 font-normal">—</span>}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function YapilandirilmisVeri({ mahalle }: { mahalle: Mahalleler }) {
  const grafik: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'Place',
      name: `${mahalle.ad} Mahallesi`,
      url: mutlakAdres(`/mahalleler/${mahalle.slug}`),
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'TR',
        addressRegion: 'Tekirdağ',
        addressLocality: 'Çorlu',
      },
      ...(mahalle.ozet ? { description: mahalle.ozet } : {}),
    },
  ]

  if (mahalle.sikSorulanlar && mahalle.sikSorulanlar.length > 0) {
    grafik.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: mahalle.sikSorulanlar.map((kayit) => ({
        '@type': 'Question',
        name: kayit.soru,
        acceptedAnswer: { '@type': 'Answer', text: kayit.cevap },
      })),
    })
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(grafik).replace(/</g, '\\u003c') }}
    />
  )
}
