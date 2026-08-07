import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { IlanGalerisi } from '@/components/ilan/IlanGalerisi'
import { Bolum, BolumBasligi } from '@/components/ui/Bolum'
import { Buton } from '@/components/ui/Buton'
import { Feragat } from '@/components/ui/Feragat'
import { KonumIkon, WhatsappIkon } from '@/components/ui/Ikon'
import { KartIzgarasi, HesapKarti } from '@/components/ui/HesapKarti'
import { DogrulanmisIlanRozeti, Rozet } from '@/components/ui/Rozet'
import { ZenginMetin } from '@/components/ui/ZenginMetin'
import {
  carpanYaz,
  m2Yaz,
  paraYaz,
  sayiYaz,
  whatsappBaglantisi,
  yilYaz,
  yuzdeYaz,
} from '@/lib/bicimlendirme'
import { ILAN_DURUM_ETIKETLERI } from '@/lib/eids'
import { kurumsalBilgileriGetir, whatsappNumarasi } from '@/lib/kurumsal'
import {
  BINA_KULLANIM_DURUMLARI,
  etiketBul,
  ILAN_KATEGORILERI,
  ILAN_TIPLERI,
  ISINMA_TIPLERI,
  ODA_SAYILARI,
  TAPU_DURUMLARI,
} from '@/lib/secenekler'
import { mutlakAdres } from '@/lib/site'
import { tarihiYaz } from '@/lib/tarih'
import { ilanGetir } from '@/lib/veri/ilanlar'
import type { Ilanlar } from '@/payload-types'

type SayfaOzellikleri = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: SayfaOzellikleri): Promise<Metadata> {
  const { slug } = await params
  const ilan = await ilanGetir(slug)

  if (!ilan) return { title: 'İlan bulunamadı' }

  const mahalle = typeof ilan.mahalle === 'object' ? ilan.mahalle?.ad : null
  const aciklama =
    ilan.seoAciklama ??
    ilan.ozet ??
    `${mahalle ? `${mahalle} Mahallesi'nde ` : ''}${ilan.baslik}. Kira çarpanı, brüt getiri ve amortisman bilgileriyle.`

  return {
    title: ilan.seoBaslik ?? ilan.baslik,
    description: aciklama,
    alternates: { canonical: mutlakAdres(`/portfoy/${ilan.slug}`) },
    openGraph: {
      title: ilan.seoBaslik ?? ilan.baslik,
      description: aciklama,
      url: mutlakAdres(`/portfoy/${ilan.slug}`),
      type: 'article',
    },
  }
}

export default async function IlanDetayi({ params }: SayfaOzellikleri) {
  const { slug } = await params
  const ilan = await ilanGetir(slug)

  if (!ilan) notFound()

  const kurumsal = await kurumsalBilgileriGetir()
  const mahalle = typeof ilan.mahalle === 'object' ? ilan.mahalle : null
  const paraBirimi = ilan.paraBirimi ?? 'TRY'
  const whatsapp = whatsappBaglantisi(
    whatsappNumarasi(kurumsal),
    `Merhaba, "${ilan.baslik}" ilanı hakkında bilgi almak istiyorum. (${mutlakAdres(`/portfoy/${ilan.slug}`)})`,
  )

  const satilik = ilan.tip === 'satilik'
  const gostergeVar = satilik && (ilan.kiraCarpani !== null || ilan.brutGetiri !== null)

  return (
    <>
      <YapilandirilmisVeri ilan={ilan} />

      <div className="kapsayici py-6 sm:py-8">
        <KirintiYolu ilan={ilan} mahalleAdi={mahalle?.ad ?? null} />
      </div>

      <div className="kapsayici pb-12 sm:pb-16">
        <IlanGalerisi ilan={ilan} />

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
          <div className="min-w-0">
            {/* ── Başlık bloğu ── */}
            <div className="flex flex-wrap items-center gap-2">
              <Rozet ton="lacivert">{etiketBul(ILAN_TIPLERI, ilan.tip)}</Rozet>
              <Rozet>{etiketBul(ILAN_KATEGORILERI, ilan.kategori)}</Rozet>
              {ilan.durum === 'rezerve' ? (
                <Rozet ton="uyari">{ILAN_DURUM_ETIKETLERI.rezerve}</Rozet>
              ) : null}
            </div>

            <h1 className="mt-3 text-[1.875rem] leading-tight sm:text-[2.375rem]">{ilan.baslik}</h1>

            {mahalle ? (
              <p className="text-metin-2 mt-3 flex items-center gap-2">
                <KonumIkon width={16} height={16} className="shrink-0" />
                <Link
                  href={`/mahalleler/${mahalle.slug}`}
                  className="underline-offset-2 hover:underline"
                >
                  {mahalle.ad} Mahallesi
                </Link>
                <span className="text-metin-3">
                  · {ilan.ilce}, {ilan.il}
                </span>
              </p>
            ) : null}

            {/* ── Yatırım göstergeleri ── */}
            {satilik ? (
              <section aria-labelledby="gostergeler" className="mt-10">
                <h2 id="gostergeler" className="mb-4 font-sans text-baslik-3 font-medium">
                  Yatırım göstergeleri
                </h2>

                <KartIzgarasi sinifAdi="lg:grid-cols-3">
                  <HesapKarti
                    etiket="Kira çarpanı"
                    deger={carpanYaz(ilan.kiraCarpani)}
                    altBilgi="Satış fiyatı ÷ yıllık kira"
                    bosAciklama="Tahmini kira bilgisi girilmediği için hesaplanamadı."
                    ton="vurgu"
                  />
                  <HesapKarti
                    etiket="Brüt kira getirisi"
                    deger={yuzdeYaz(ilan.brutGetiri)}
                    altBilgi="Yıllık, giderler hariç"
                    bosAciklama="Tahmini kira bilgisi girilmediği için hesaplanamadı."
                  />
                  <HesapKarti
                    etiket="Amortisman süresi"
                    deger={yilYaz(ilan.amortismanYili)}
                    altBilgi="Kira geliriyle kendini ödeme"
                    bosAciklama="Tahmini kira bilgisi girilmediği için hesaplanamadı."
                  />
                </KartIzgarasi>

                {gostergeVar ? (
                  <Feragat
                    sinifAdi="mt-4"
                    ek="Göstergeler tahmini kira üzerinden hesaplanmıştır; gerçekleşen kira farklılık gösterebilir."
                  />
                ) : null}
              </section>
            ) : null}

            {/* ── Nitelikler ── */}
            <NitelikTablosu ilan={ilan} />

            {/* ── Açıklama ── */}
            {ilan.aciklama ? (
              <section className="mt-10">
                <h2 className="mb-3 font-sans text-baslik-3 font-medium">Açıklama</h2>
                <ZenginMetin veri={ilan.aciklama} />
              </section>
            ) : null}

            {/* ── Öne çıkan özellikler ── */}
            {ilan.ozellikler && ilan.ozellikler.length > 0 ? (
              <section className="mt-10">
                <h2 className="mb-3 font-sans text-baslik-3 font-medium">Öne çıkan özellikler</h2>
                <ul className="flex flex-wrap gap-2">
                  {ilan.ozellikler.map((ozellik) => (
                    <li key={ozellik.id ?? ozellik.metin}>
                      <Rozet>{ozellik.metin}</Rozet>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          {/* ── Yan panel ── */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="border-kenar bg-yuzey shadow-kart rounded-kart border-[0.5px] p-5 sm:p-6">
              <p className="text-metin-3 text-mikro font-medium">
                {satilik ? 'Satış fiyatı' : 'Aylık kira'}
              </p>
              <p className="rakam mt-1 text-[2rem] leading-none font-medium">
                {paraYaz(ilan.fiyat, paraBirimi) ?? (
                  <span className="text-metin-2 text-baslik-3 font-normal">Görüşmeye açık</span>
                )}
              </p>

              {ilan.aidat ? (
                <p className="text-metin-3 mt-2 text-govde-kucuk">
                  Aidat: {paraYaz(ilan.aidat, paraBirimi)} / ay
                </p>
              ) : null}

              {ilan.pazarlikPayi ? (
                <p className="text-metin-3 mt-1 text-govde-kucuk">Pazarlık payı var</p>
              ) : null}

              <div className="mt-5 flex flex-col gap-2">
                {whatsapp ? (
                  <Buton href={whatsapp} dis boyut="buyuk" tamGenislik>
                    <WhatsappIkon width={18} height={18} />
                    WhatsApp&apos;tan sorun
                  </Buton>
                ) : null}
                <Buton
                  href={`/iletisim?ilan=${encodeURIComponent(ilan.slug)}`}
                  gorunum="ikincil"
                  boyut="buyuk"
                  tamGenislik
                >
                  Bilgi isteyin
                </Buton>
              </div>

              {/* Güven bloğu — EİDS doğrulaması */}
              <div className="border-kenar mt-5 border-t-[0.5px] pt-5">
                <DogrulanmisIlanRozeti tasinmazNo={ilan.tasinmazNo} />
                {ilan.eidsYetkiBitis ? (
                  <p className="text-metin-3 mt-3 text-mikro leading-relaxed">
                    Mülk sahibinin verdiği ilan yetkisi{' '}
                    <strong className="font-medium">{tarihiYaz(ilan.eidsYetkiBitis)}</strong>{' '}
                    tarihine kadar geçerlidir.
                  </p>
                ) : null}
                <p className="text-metin-3 mt-2 text-mikro">
                  Son güncelleme: {tarihiYaz(ilan.updatedAt)}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {mahalle ? (
        <Bolum zemin="yuzey">
          <BolumBasligi
            ustBaslik="Mahalle"
            baslik={`${mahalle.ad} Mahallesi hakkında`}
            aciklama="Bu taşınmazın bulunduğu mahallenin rakamlarını, ulaşımını ve yatırım hikâyesini inceleyin."
            yan={
              <Buton href={`/mahalleler/${mahalle.slug}`} gorunum="ikincil">
                Mahalle sayfası
              </Buton>
            }
          />
        </Bolum>
      ) : null}
    </>
  )
}

function KirintiYolu({ ilan, mahalleAdi }: { ilan: Ilanlar; mahalleAdi: string | null }) {
  return (
    <nav aria-label="Sayfa yolu" className="text-metin-3 text-govde-kucuk">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link href="/" className="hover:text-metin underline-offset-2 hover:underline">
            Ana sayfa
          </Link>
        </li>
        <li aria-hidden>/</li>
        <li>
          <Link href="/portfoy" className="hover:text-metin underline-offset-2 hover:underline">
            Portföy
          </Link>
        </li>
        {mahalleAdi ? (
          <>
            <li aria-hidden>/</li>
            <li>{mahalleAdi}</li>
          </>
        ) : null}
        <li aria-hidden>/</li>
        <li className="text-metin-2 truncate" aria-current="page">
          {ilan.baslik}
        </li>
      </ol>
    </nav>
  )
}

function NitelikTablosu({ ilan }: { ilan: Ilanlar }) {
  const satirlar: { etiket: string; deger: string | null }[] = [
    { etiket: 'Brüt alan', deger: m2Yaz(ilan.brutM2) },
    { etiket: 'Net alan', deger: m2Yaz(ilan.netM2) },
    { etiket: 'Oda sayısı', deger: etiketBul(ODA_SAYILARI, ilan.odaSayisi) },
    { etiket: 'Banyo sayısı', deger: sayiYaz(ilan.banyoSayisi) },
    { etiket: 'Bulunduğu kat', deger: ilan.bulunduguKat ?? null },
    { etiket: 'Toplam kat', deger: sayiYaz(ilan.toplamKat) },
    { etiket: 'Bina yaşı', deger: ilan.binaYasi !== null ? sayiYaz(ilan.binaYasi) : null },
    { etiket: 'Isıtma', deger: etiketBul(ISINMA_TIPLERI, ilan.isinma) },
    { etiket: 'Kullanım durumu', deger: etiketBul(BINA_KULLANIM_DURUMLARI, ilan.kullanimDurumu) },
    { etiket: 'Tapu durumu', deger: etiketBul(TAPU_DURUMLARI, ilan.tapuDurumu) },
    { etiket: 'Eşyalı', deger: ilan.esyali ? 'Evet' : null },
    { etiket: 'Krediye uygun', deger: ilan.krediyeUygun ? 'Evet' : null },
    { etiket: 'Asansör', deger: ilan.asansor ? 'Var' : null },
  ]

  // Yalnızca dolu satırlar gösterilir: "Belirtilmemiş" dolu bir tablo,
  // bilgi vermeyen ama bilgi veriyormuş gibi duran bir tablodur.
  const dolu = satirlar.filter((satir) => satir.deger !== null)
  if (dolu.length === 0) return null

  return (
    <section className="mt-10">
      <h2 className="mb-3 font-sans text-baslik-3 font-medium">Taşınmaz bilgileri</h2>
      <dl className="border-kenar grid grid-cols-1 gap-px overflow-hidden rounded-kart border-[0.5px] bg-kenar sm:grid-cols-2">
        {dolu.map((satir) => (
          <div
            key={satir.etiket}
            className="bg-yuzey flex items-baseline justify-between gap-4 px-4 py-3"
          >
            <dt className="text-metin-2 text-govde-kucuk">{satir.etiket}</dt>
            <dd className="rakam text-govde-kucuk font-medium">{satir.deger}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/**
 * schema.org yapılandırılmış verisi.
 *
 * Yalnızca gerçekten bilinen alanlar yazılır. Google, doğrulanamayan veya
 * sayfada görünmeyen yapılandırılmış veriyi manuel işlem sebebi sayar.
 */
function YapilandirilmisVeri({ ilan }: { ilan: Ilanlar }) {
  const mahalle = typeof ilan.mahalle === 'object' ? ilan.mahalle : null

  const veri: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: ilan.baslik,
    url: mutlakAdres(`/portfoy/${ilan.slug}`),
    datePosted: ilan.createdAt,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'TR',
      addressRegion: ilan.il,
      addressLocality: ilan.ilce,
      ...(mahalle ? { streetAddress: `${mahalle.ad} Mahallesi` } : {}),
    },
  }

  if (ilan.ozet) veri.description = ilan.ozet
  if (typeof ilan.fiyat === 'number') {
    veri.offers = {
      '@type': 'Offer',
      price: ilan.fiyat,
      priceCurrency: ilan.paraBirimi ?? 'TRY',
      availability:
        ilan.durum === 'rezerve'
          ? 'https://schema.org/LimitedAvailability'
          : 'https://schema.org/InStock',
    }
  }
  if (typeof ilan.brutM2 === 'number') {
    veri.floorSize = { '@type': 'QuantitativeValue', value: ilan.brutM2, unitCode: 'MTK' }
  }

  return (
    <script
      type="application/ld+json"
      // JSON.stringify çıktısı güvenlidir; içerik CMS'ten gelir ve
      // `</script>` dizisi JSON kaçışıyla zararsızlaşır.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(veri).replace(/</g, '\\u003c') }}
    />
  )
}
