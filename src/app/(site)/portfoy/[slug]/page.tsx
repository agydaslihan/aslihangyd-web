import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { GunesHaritasi } from '@/components/gunes/GunesHaritasi'
import { KiraGetirisiFormu } from '@/components/hesaplayici/KiraGetirisiFormu'
import { IlanGalerisi } from '@/components/ilan/IlanGalerisi'
import { CevreBolumu } from '@/components/mahalle/CevreBolumu'
import { DroneVideo, videoGosterilebilirMi } from '@/components/medya/DroneVideo'
import { SanalTur } from '@/components/medya/SanalTur'
import { Bolum, BolumBasligi } from '@/components/ui/Bolum'
import { Buton } from '@/components/ui/Buton'
import { Feragat } from '@/components/ui/Feragat'
import { KonumIkon, TelefonIkon, WhatsappIkon } from '@/components/ui/Ikon'
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
import { googlePlacesEtkinMi } from '@/lib/google/ayarlar'
import { iletisimTelefonu, kurumsalBilgileriGetir, whatsappNumarasi } from '@/lib/kurumsal'
import {
  BINA_KULLANIM_DURUMLARI,
  etiketBul,
  ILAN_KATEGORILERI,
  ILAN_TIPLERI,
  ISINMA_TIPLERI,
  ODA_SAYILARI,
  TAPU_DURUMLARI,
} from '@/lib/secenekler'
import { sinif } from '@/lib/sinif'
import { konumuCoz } from '@/lib/veri/ilgiNoktalari'
import { mutlakAdres } from '@/lib/site'
import { tarihiYaz } from '@/lib/tarih'
import { ilanGetir } from '@/lib/veri/ilanlar'
import { mahalleCevresiGetir } from '@/lib/veri/yakinlik'
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

  // Taşınmazın kendi noktasına göre çevre; nokta girilmemişse mahalle
  // merkezine düşer. İkisi de yoksa bölüm hiç basılmaz.
  const [kurumsal, cevre, googlePlacesAcik] = await Promise.all([
    kurumsalBilgileriGetir(),
    mahalleCevresiGetir(
      ilan.konum ?? (typeof ilan.mahalle === 'object' ? ilan.mahalle?.merkez : null),
    ),
    // ⚠️ Karar sunucuda: bölüm anahtarı VE API anahtarı birlikte gerekli.
    googlePlacesEtkinMi(),
  ])

  const mahalle = typeof ilan.mahalle === 'object' ? ilan.mahalle : null
  const cevreNeyeGore = ilan.konum
    ? 'taşınmazın konumundan'
    : `${mahalle?.ad ?? 'mahalle'} merkezinden`
  const paraBirimi = ilan.paraBirimi ?? 'TRY'
  const whatsapp = whatsappBaglantisi(
    whatsappNumarasi(kurumsal),
    `Merhaba, "${ilan.baslik}" ilanı hakkında bilgi almak istiyorum. (${mutlakAdres(`/portfoy/${ilan.slug}`)})`,
  )

  const telefon = iletisimTelefonu(kurumsal)

  /**
   * Güneş haritası için koordinat.
   *
   * ⚠️ İlanın kendi konumu yoksa MAHALLE MERKEZİ kullanılıyor ve bu
   * kabul edilebilir: gün doğumu/batımı Çorlu ölçeğinde mahalleden
   * mahalleye saniyeler farkeder. Cephe analizi zaten koordinata değil
   * girilen cephe yönüne bağlı.
   */
  const gunesKonumu = konumuCoz(
    ilan.konum ?? (typeof ilan.mahalle === 'object' ? ilan.mahalle?.merkez : null),
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
              <Rozet ton="vurgu">{etiketBul(ILAN_TIPLERI, ilan.tip)}</Rozet>
              <Rozet>{etiketBul(ILAN_KATEGORILERI, ilan.kategori)}</Rozet>
              {ilan.durum === 'rezerve' ? (
                <Rozet ton="uyari">{ILAN_DURUM_ETIKETLERI.rezerve}</Rozet>
              ) : null}
            </div>

            <h1 className="mt-3 font-serif text-baslik-1-mobil font-medium sm:text-baslik-1">
              {ilan.baslik}
            </h1>

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

            {/* ⚠️ Yatırım göstergeleri SAĞ KARTA taşındı (şartname §8).
                Sol sütunda ekranın ortasında duruyorlardı ve kaydırınca
                kayboluyorlardı; yatırımcının en çok baktığı üç rakam
                yapışkan kartta kalmalı. */}

            {/* ── Nitelikler ── */}
            <NitelikTablosu ilan={ilan} />

            {/* ⭐ Güneş haritası — Türkiye'de "güney cephe" alım kararının
                merkezinde ve hiçbir emlak sitesi veriyle göstermiyor. */}
            {gunesKonumu !== null ? (
              <GunesHaritasi
                enlem={gunesKonumu.enlem}
                boylam={gunesKonumu.boylam}
                cepheler={ilan.cepheYonu ?? []}
              />
            ) : null}

            {/* ── Açıklama ── */}
            {ilan.aciklama ? (
              <section className="mt-10">
                <h2 className="mb-3 font-sans text-baslik-3 font-medium">Açıklama</h2>
                <ZenginMetin veri={ilan.aciklama} />
              </section>
            ) : null}

            {/*
              ── Drone videosu ──

              ⚠️ Galerinin ALTINDA. Galeri LCP öğesini taşıyor; oynatıcıyı
              yukarı almak 2,5 sn hedefini bozardı. Zaten tıkla-oynat:
              çerçeve ancak dokununca yükleniyor.

              Alan boşsa bölüm HİÇ gösterilmiyor — "video yok" yazan bir
              başlık, olmayan bir şeyi vaat etmektir.
            */}
            {videoGosterilebilirMi({
              kaynak: ilan.videoKaynagi,
              bunnyId: ilan.droneVideoId,
              youtube: ilan.droneVideoYoutube,
            }) ? (
              <section className="mt-10">
                <h2 className="mb-3 font-sans text-baslik-3 font-medium">Drone videosu</h2>
                <DroneVideo
                  kaynak={ilan.videoKaynagi}
                  bunnyId={ilan.droneVideoId}
                  youtube={ilan.droneVideoYoutube}
                  kapakUrl={
                    typeof ilan.droneVideoPosteri === 'object' &&
                    ilan.droneVideoPosteri !== null &&
                    typeof ilan.droneVideoPosteri.url === 'string'
                      ? ilan.droneVideoPosteri.url
                      : null
                  }
                  baslik={`${ilan.baslik} drone videosu`}
                />
              </section>
            ) : null}

            {/* ── 360° sanal tur ── */}
            {ilan.sanalTurUrl ? (
              <section className="mt-10">
                <h2 className="mb-3 font-sans text-baslik-3 font-medium">360° sanal tur</h2>
                <SanalTur adres={ilan.sanalTurUrl} baslik={`${ilan.baslik} 360° turu`} />
              </section>
            ) : null}

            {/* ── Çevre ve erişim ──
                Yatırımcının en çok sorduğu şey: "OSB'ye ne kadar?" Veri
                yoksa bölüm hiç basılmaz; ilan sayfasında boş durum kutusu
                gürültüdür, mahalle sayfasından farklı olarak. */}
            {cevre.length > 0 ? (
              <section className="mt-10">
                <h2 className="mb-3 font-sans text-baslik-3 font-medium">Çevre ve erişim</h2>
                <CevreBolumu
                  mesafeler={cevre}
                  neyeGore={cevreNeyeGore}
                  googlePlacesAcik={googlePlacesAcik}
                />
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

          {/* ── Yan panel — YATIRIM KARTI (şartname §8) ──
              ⚠️ Gold çerçeve + açık gri zemin. Gold'un üç yerinden biri;
              dekoratif, kartın kendisi zaten "Yatırım göstergeleri" diyor. */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="border-gold-cizgi bg-yuzey-2 shadow-kart rounded-kart border p-5 sm:p-6">
              <p className="text-metin-3 text-mikro font-medium">
                {satilik ? 'Satış fiyatı' : 'Aylık kira'}
              </p>
              <p className="rakam text-rakam mt-1 font-medium">
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

              {/* ── Yatırım göstergeleri ── */}
              {satilik ? (
                <div className="border-kenar mt-5 flex flex-col gap-2.5 border-t-[0.5px] pt-5">
                  <GostergeSatiri
                    etiket="Tahmini kira"
                    deger={paraYaz(ilan.tahminiKira, paraBirimi)}
                  />
                  <GostergeSatiri
                    etiket="Kira çarpanı"
                    deger={carpanYaz(ilan.kiraCarpani)}
                    vurgulu
                  />
                  <GostergeSatiri etiket="Brüt getiri" deger={yuzdeYaz(ilan.brutGetiri)} />
                  <GostergeSatiri etiket="Amortisman" deger={yilYaz(ilan.amortismanYili)} />

                  {!gostergeVar ? (
                    <p className="text-metin-3 text-mikro">
                      Tahmini kira girilmediği için hesaplanamadı — rakam uydurmuyoruz.
                    </p>
                  ) : null}

                  {/* ⚠️ FERAGAT GÖSTERGELERLE BİRLİKTE TAŞINIR (CLAUDE.md kural 5).
                      Göstergeler sol sütundan bu karta taşınırken feragat bir an
                      için geride kalmıştı; lint "kullanılmayan import" diye
                      yakaladı. Getiri rakamının göründüğü her yerde bu metin de
                      görünmek zorunda — yasal bir gereklilik, üslup tercihi değil. */}
                  {gostergeVar ? (
                    <Feragat
                      sinifAdi="mt-1"
                      ek="Göstergeler tahmini kira üzerinden hesaplanmıştır; gerçekleşen kira farklılık gösterebilir."
                    />
                  ) : null}
                </div>
              ) : null}

              {/* ── Gömülü kira getirisi hesaplayıcı ──
                  ⚠️ Ayrı bir hesap YAZILMADI: araç sayfasındaki formun ta
                  kendisi, ilanın rakamlarıyla önceden doldurulmuş olarak
                  gömülüyor. İkinci bir hesap yazmak, aynı formülün iki
                  yerde yaşaması ve zamanla ayrışması demekti. */}
              {satilik && typeof ilan.fiyat === 'number' ? (
                <details className="border-kenar mt-5 border-t-[0.5px] pt-5">
                  <summary className="text-aksan-metin cursor-pointer text-govde-kucuk font-medium">
                    Kendi kira tahmininizle hesaplayın
                  </summary>
                  <div className="mt-4">
                    <KiraGetirisiFormu
                      baslangicFiyat={String(ilan.fiyat)}
                      baslangicKira={
                        typeof ilan.tahminiKira === 'number' ? String(ilan.tahminiKira) : ''
                      }
                    />
                  </div>
                </details>
              ) : null}

              <div className="mt-5 flex flex-col gap-2">
                {whatsapp ? (
                  <Buton href={whatsapp} dis boyut="buyuk" tamGenislik>
                    <WhatsappIkon width={18} height={18} />
                    WhatsApp&apos;tan sorun
                  </Buton>
                ) : null}
                {telefon ? (
                  <Buton
                    href={`tel:${telefon.replace(/\s/g, '')}`}
                    data-gozlem="telefon_tikla"
                    dis
                    gorunum="ikincil"
                    boyut="buyuk"
                    tamGenislik
                  >
                    <TelefonIkon width={18} height={18} />
                    Ara
                  </Buton>
                ) : null}
                <Buton
                  href={`/iletisim?ilan=${encodeURIComponent(ilan.slug)}`}
                  gorunum="ikincil"
                  boyut="buyuk"
                  tamGenislik
                >
                  Randevu isteyin
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

      {/* ⚠️ Mobil çubuk sayfanın SONUNDA: yapışkan olduğu için DOM sırası
          görsel konumunu belirlemiyor, ama ekran okuyucu ve sekme sırası
          için içeriğin ardından gelmesi doğru. Alt boşluk da burada
          veriliyor ki çubuk son bölümün üstüne binmesin. */}
      <div aria-hidden="true" className="h-20 lg:hidden" />
      <MobilEylemCubugu whatsapp={whatsapp} telefon={telefon} />
    </>
  )
}

/**
 * Yatırım kartındaki tek satır.
 *
 * ⚠️ Değer yoksa "—" değil, açıklayıcı bir boşluk basılır. Tire, "sıfır" ile
 * "bilinmiyor" arasındaki farkı siler; bu sitede o fark önemli.
 */
function GostergeSatiri({
  etiket,
  deger,
  vurgulu = false,
}: {
  etiket: string
  deger: string | null
  vurgulu?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-metin-2 text-govde-kucuk">{etiket}</span>
      {deger === null ? (
        <span className="text-metin-3 text-mikro">girilmedi</span>
      ) : (
        <span
          className={sinif(
            'rakam font-medium',
            vurgulu ? 'text-metin text-baslik-3' : 'text-metin text-govde',
          )}
        >
          {deger}
        </span>
      )}
    </div>
  )
}

/**
 * Mobil yapışkan alt çubuk (şartname §8).
 *
 * ⚠️ Yalnızca mobilde: masaüstünde yatırım kartı zaten yapışkan ve
 * butonları görünür durumda; ikinci bir çubuk ekranı boşuna daraltırdı.
 *
 * ⚠️ `pb-[env(safe-area-inset-bottom)]` gerekli — iPhone'da alt çubuk
 * sistem gezinme çubuğunun altında kalıyordu ve dokunulamıyordu.
 */
function MobilEylemCubugu({
  whatsapp,
  telefon,
}: {
  whatsapp: string | null
  telefon: string | null
}) {
  if (whatsapp === null && telefon === null) return null

  return (
    <div
      data-yazdirma="gizle"
      className="border-kenar bg-zemin/95 fixed inset-x-0 bottom-0 z-30 border-t-[0.5px] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden"
    >
      <div className="kapsayici flex gap-2">
        {whatsapp ? (
          <Buton href={whatsapp} dis boyut="buyuk" tamGenislik>
            <WhatsappIkon width={18} height={18} />
            WhatsApp
          </Buton>
        ) : null}
        {telefon ? (
          <Buton
            href={`tel:${telefon.replace(/\s/g, '')}`}
            data-gozlem="telefon_tikla"
            dis
            gorunum="ikincil"
            boyut="buyuk"
            tamGenislik
          >
            <TelefonIkon width={18} height={18} />
            Ara
          </Buton>
        ) : null}
      </div>
    </div>
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
