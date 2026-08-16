import Link from 'next/link'

import { HeroBolumu } from '@/components/hero/HeroBolumu'
import { AramaWidgeti, type MahalleSecenegi } from '@/components/ilan/AramaWidgeti'
import { IlanKarti } from '@/components/ilan/IlanKarti'
import { MahalleKarti } from '@/components/mahalle/MahalleKarti'
import { EndeksSeridi } from '@/components/endeks/EndeksSeridi'
import { GuvenSeridi } from '@/components/duzen/GuvenSeridi'
import { Bolum, BolumBasligi } from '@/components/ui/Bolum'
import { BosDurum } from '@/components/ui/BosDurum'
import { Buton } from '@/components/ui/Buton'
import {
  DogrulanmisIkon,
  GrafikIkon,
  KonumIkon,
  OkIkon,
  VeriBekleniyorIkon,
} from '@/components/ui/Ikon'
import { ARACLAR } from '@/lib/araclar'
import { whatsappBaglantisi } from '@/lib/bicimlendirme'
import { kurumsalBilgileriGetir, whatsappNumarasi } from '@/lib/kurumsal'
import { whatsappMesaji } from '@/lib/site'
import { ilanlariGetir, oneCikanIlanlariGetir } from '@/lib/veri/ilanlar'
import { sinif } from '@/lib/sinif'
import { gizliPortfoySayisi } from '@/lib/veri/gizliPortfoy'
import { mahalleleriGetir } from '@/lib/veri/mahalleler'
import { bolumDurumlariniGetir } from '@/lib/veri/siteBolumleri'
import { heroAyarlari } from '@/lib/hero/sunucu'

export default async function AnaSayfa() {
  const [ilanlar, mahalleler, kurumsal, portfoy, bolumler, hero] = await Promise.all([
    oneCikanIlanlariGetir(3),
    mahalleleriGetir(),
    kurumsalBilgileriGetir(),
    // Yalnızca sayaç için; ilk sayfa yeterli, `toplam` tüm kümeyi verir.
    ilanlariGetir({}, 1, 1),
    bolumDurumlariniGetir(),
    heroAyarlari(),
  ])

  /**
   * ⚠️ Hero ayarları BURADA okunuyor, `HeroBolumu` içinde ikinci kez değil.
   *
   * Sayfanın hangi hero'yu çizeceğini bilmesi gerekiyor (slider mı, metin
   * mi) ve `HeroBolumu` da aynı veriyi okuyor. İki ayrı okuma iki ayrı
   * veritabanı turu demek olurdu; Payload aynı istek içinde önbelleklemiyor.
   */
  const heroSlaytVar = hero.slaytlar.length > 0

  /**
   * Gizli portföy sayacı yalnızca bölüm AÇIKSA sorgulanıyor.
   *
   * ⚠️ Kapalıyken de sorgulamak, kapalı bir bölümün verisini her ana sayfa
   * isteğinde okumak demekti — hem gereksiz hem de kapalı bölümün sayısının
   * RSC yüküne sızma riski.
   */
  const gizliSayi = bolumler.gizli_portfoy ? await gizliPortfoySayisi() : 0

  const whatsapp = whatsappBaglantisi(whatsappNumarasi(kurumsal), whatsappMesaji())

  /**
   * Güven şeridi — şartname §5.2.
   *
   * ⚠️ HİÇBİR RAKAM UYDURULMADI (CLAUDE.md kural 2).
   *
   * Portföy ve mahalle sayısı veritabanından sayılıyor. "Ortalama işlem
   * süresi" ise ölçülebilir bir veri değil — Aslıhan'ın geçmiş işlem
   * kayıtlarına bağlı ve elimizde yok; `null` geçiliyor ve hücre kendi boş
   * durumunu gösteriyor. Sıfır yazmak yanlış bilgi, hücreyi gizlemek ise
   * dört sütunluk düzeni bozardı.
   */
  const guvenOgeleri = [
    {
      etiket: 'Aktif portföy',
      deger: portfoy.toplam > 0 ? String(portfoy.toplam) : null,
      aciklama: 'Yayındaki taşınmaz',
    },
    {
      etiket: 'Mahalle',
      deger: mahalleler.length > 0 ? String(mahalleler.length) : null,
      aciklama: 'Veri tuttuğumuz mahalle',
    },
    {
      etiket: 'Ortalama işlem süresi',
      deger: null,
      aciklama: 'Geçmiş işlem kayıtları girilince',
    },
    {
      etiket: 'Yetki belgesi',
      deger: kurumsal?.yetkiBelgesiNo ?? null,
      aciklama: 'Taşınmaz Ticareti Yetki Belgesi No',
    },
  ]

  return (
    <>
      {/*
        ⚠️ SLAYT VARSA SLIDER, YOKSA METİN HERO'SU — İKİSİ BİRDEN DEĞİL.

        `HeroBolumu` slayt yoksa `null` dönüyor; o zaman aşağıdaki
        `Kahraman` çiziliyor. Slider bir ek, bir varlık şartı değil:
        Aslıhan hiç görsel yüklemese de ana sayfa bugünkü hâliyle çalışır.

        ⚠️ Slider varken arama kartı yine görünüyor ama hero'nun ALTINDA,
        kendi bölümünde. Kartı slaydın üstüne bindirmek metinle çakışırdı
        ve karartma ayarını kullanıcının kontrolünden çıkarırdı.
      */}
      <HeroBolumu ayarlar={hero} />

      {heroSlaytVar ? (
        <AramaBolumu
          whatsapp={whatsapp}
          mahalleler={mahalleler.map((m) => ({ slug: m.slug, ad: m.ad }))}
          ticariAcik={bolumler.ticari}
        />
      ) : (
        <Kahraman
          whatsapp={whatsapp}
          mahalleler={mahalleler.map((m) => ({ slug: m.slug, ad: m.ad }))}
          ticariAcik={bolumler.ticari}
        />
      )}

      <GuvenSeridi ogeler={guvenOgeleri} />

      <UcYolAyrimi />

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

      {bolumler.gizli_portfoy ? <GizliPortfoyTeaser sayi={gizliSayi} /> : null}

      <EndeksSeridi />

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

      <YatirimciAraclari />

      <AslihanBolumu kurumsal={kurumsal} />

      <CagriBandi whatsapp={whatsapp} />
    </>
  )
}

/**
 * Hero — sayfanın merkezi (şartname §5.1).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ŞARTNAME "TAM GENİŞLİK GÖRSEL (ÇORLU HAVADAN) + KAKAO OVERLAY %45"
 * İSTİYOR. GÖRSEL KONULMADI.
 *
 * Elimizde Çorlu'nun havadan çekilmiş, kullanım hakkı bize ait bir görseli
 * yok. Stok fotoğraf koymak şartnamenin kendi yasakladığı şey (§2:
 * "stok fotoğraf estetiği"), üstelik hero LCP ögesi — yanlış bir görsel
 * hem hedefi hem tonu bozar.
 *
 * ⚠️ 15 Ağustos 2026 — HERO PUDRA GÜLÜ ZEMİNE TAŞINDI.
 *
 * Bohem palet hero'yu "pudra gülü / krem zeminde koyu kakao metin" diye
 * tanımlıyor. Eskiden zemin koyuydu ve metin beyazdı; şimdi tersi.
 *
 * ⚠️ GÖRSEL GELDİĞİNDE METİN KATMANI OLDUĞU GİBİ KALMAZ. Bu, önceki
 * kurulumdan farkı: kakao overlay'in üzerine AÇIK metin gerekecek. Yani
 * görsel geldiğinde bu bileşende iki şey değişir — zemin ve metin
 * jetonları. Bunu bugünden yazmak, o gün "sadece background-image
 * değiştir" diyen eski yorumun yanıltmasını engelliyor.
 *
 * Ölçümler (pudra gülü zemininde): başlık `metin` 8,95:1 · gövde
 * `metin-2` 6,65:1 · doğrulama satırı `metin-3` 4,88:1 · eyebrow
 * `aksan-metin` 4,55:1. Dördü de kontrast testinde.
 * docs/SENDEN-BEKLENENLER.md içinde madde olarak yazılı.
 *
 * ⚠️ Arama kartı hero'nun ALTINA taşıyor (-3rem). Şartname bunu istiyor ve
 * gerekçesi işlevsel: kart hero ile bir sonraki bölümü birbirine dikiyor
 * ve sayfanın "ilk iş burada yapılır" mesajını veriyor.
 * ─────────────────────────────────────────────────────────────────────────
 */
function Kahraman({
  whatsapp,
  mahalleler,
  ticariAcik,
}: {
  whatsapp: string | null
  mahalleler: MahalleSecenegi[]
  ticariAcik: boolean
}) {
  return (
    <section className="relative">
      <div className="bg-pudra-zemin">
        <div className="kapsayici pt-16 pb-24 sm:pt-20 sm:pb-28 lg:pt-28 lg:pb-32">
          <div className="max-w-3xl">
            {/* ⚠️ Eyebrow ADAÇAYI, gold değil. Gold pudra üzerinde 1,51:1 —
                okunmaz; zaten "gold asla metin rengi değildir" kuralı
                mutlak. `aksan-metin` burada 4,55:1 ile AA'yı geçiyor ve
                rampanın 600 basamağı geçmiyor (3,20) — ayrı jetonun
                gerekçesi tam olarak bu zemin. Kontrast testinde. */}
            <p className="text-aksan-metin text-eyebrow font-medium uppercase">Çorlu · Tekirdağ</p>

            <h1 className="text-metin mt-4 font-serif text-baslik-1-mobil font-medium sm:text-baslik-1">
              Gayrimenkul kararı hisle değil, rakamla verilir.
            </h1>

            <p className="text-metin-2 mt-6 max-w-2xl text-baslik-3 leading-relaxed">
              Çorlu&apos;da bir taşınmazın ne kadar ettiğini, kaç yılda kendini ödediğini ve hangi
              mahallenin hangi değer sürücüsünden beslendiğini gösteriyoruz. İlan listelemiyoruz —
              karar veriyoruz.
            </p>

            <p className="text-metin-3 mt-6 flex items-center gap-2 text-govde-kucuk">
              <DogrulanmisIkon width={16} height={16} className="shrink-0" />
              Tüm ilanlarımız EİDS doğrulamalıdır ve taşınmaz numarasıyla birlikte yayınlanır.
            </p>
          </div>
        </div>
      </div>

      {/* Yüzen arama kartı */}
      <div className="kapsayici relative -mt-12 sm:-mt-14">
        <div className="max-w-4xl">
          <AramaWidgeti mahalleler={mahalleler} ticariAcik={ticariAcik} />

          <p className="text-metin-3 mt-3 text-govde-kucuk">
            veya{' '}
            <Link href="/harita" className="text-aksan-metin underline underline-offset-2">
              haritada keşfedin
            </Link>{' '}
            {whatsapp ? (
              <>
                ·{' '}
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-aksan-metin underline underline-offset-2"
                >
                  WhatsApp&apos;tan sorun
                </a>
              </>
            ) : null}
          </p>
        </div>
      </div>
    </section>
  )
}

/**
 * Arama bölümü — slider varken hero'nun ALTINDA duruyor.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ SLAYDIN ÜSTÜNE BİNDİRİLMEDİ VE BU BİLİNÇLİ.
 *
 * Metin hero'sunda kart hero'ya biniyor (-3rem) çünkü altındaki zemin
 * sakin ve kartın okunurluğu garanti. Fotoğraf üstünde aynı şey iki sorun
 * doğururdu: kart slaydın başlığıyla çakışır ve okunurluğu kullanıcının
 * seçtiği karartma oranına bağlı hâle gelir — yani bizim kontrolümüzden
 * çıkar.
 *
 * Kart hero'nun altında, kendi zemininde duruyor: her karartma ayarında
 * aynı kontrastla okunuyor.
 * ─────────────────────────────────────────────────────────────────────────
 */
function AramaBolumu({
  whatsapp,
  mahalleler,
  ticariAcik,
}: {
  whatsapp: string | null
  mahalleler: MahalleSecenegi[]
  ticariAcik: boolean
}) {
  return (
    <section className="bg-yuzey-2">
      <div className="kapsayici py-8 sm:py-10">
        <div className="max-w-4xl">
          <AramaWidgeti mahalleler={mahalleler} ticariAcik={ticariAcik} />

          <p className="text-metin-3 mt-3 text-govde-kucuk">
            veya{' '}
            <Link href="/harita" className="text-aksan-metin underline underline-offset-2">
              haritada keşfedin
            </Link>{' '}
            {whatsapp ? (
              <>
                ·{' '}
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-aksan-metin underline underline-offset-2"
                >
                  WhatsApp&apos;tan sorun
                </a>
              </>
            ) : null}
          </p>
        </div>
      </div>
    </section>
  )
}

/**
 * Üç yol ayrımı (şartname §5.3).
 *
 * Ziyaretçiler üç farklı niyetle geliyor ve üçünün ilk adımı farklı.
 * Tek bir "portföyü incele" butonu, ev arayanla yatırımcıyı aynı yere
 * gönderiyordu.
 *
 * ⚠️ Değerleme kartı adaçayı vurgusuyla baskın — ama DOLU zemin değil,
 * çerçeve. Dolu adaçayı yalnızca iki eylemde kullanılıyor (header CTA'sı
 * ve erişim talebi); üçüncü bir dolu zemin kuralı anlamsızlaştırırdı.
 */
const UC_YOL = [
  {
    Ikon: GrafikIkon,
    baslik: 'Yatırım yapmak istiyorum',
    metin: 'Kira çarpanı, brüt getiri ve amortisman süresine göre filtreleyin.',
    adres: '/portfoy?siralama=carpan_artan',
    eylem: 'Yatırımlık portföy',
    vurgulu: false,
  },
  {
    Ikon: KonumIkon,
    baslik: 'Ev arıyorum',
    metin: 'Önceliklerinizi söyleyin, size en uygun mahalleyi birlikte bulalım.',
    adres: '/mahalle-testi',
    eylem: 'Mahalle testi',
    vurgulu: false,
  },
  {
    Ikon: DogrulanmisIkon,
    baslik: 'Değerleme istiyorum',
    metin:
      'Mahalle verisine dayalı değer aralığı — sonucu görmek için iletişim bilgisi istemiyoruz.',
    adres: '/degerleme',
    eylem: 'Değerleme isteyin',
    vurgulu: true,
  },
]

function UcYolAyrimi() {
  return (
    <Bolum>
      <BolumBasligi
        ustBaslik="Nereden başlayacaksınız"
        baslik="Üç farklı niyet, üç farklı ilk adım"
      />

      <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
        {UC_YOL.map(({ Ikon, baslik, metin, adres, eylem, vurgulu }) => (
          <Link
            key={adres}
            href={adres}
            className={sinif(
              'rounded-kart bg-yuzey group flex flex-col gap-3 p-6 transition-shadow hover:shadow-kart',
              vurgulu ? 'border-aksan border' : 'border-kenar border-[0.5px]',
            )}
          >
            <Ikon
              width={26}
              height={26}
              className={vurgulu ? 'text-aksan-metin' : 'text-metin-3'}
            />
            <h3 className="text-baslik-3 font-serif font-medium">{baslik}</h3>
            <p className="text-metin-2 text-govde-kucuk flex-1">{metin}</p>
            <span className="text-aksan-metin inline-flex items-center gap-1.5 text-govde-kucuk font-medium">
              {eylem}
              <OkIkon width={15} height={15} />
            </span>
          </Link>
        ))}
      </div>
    </Bolum>
  )
}

/**
 * Gizli portföy teaser'ı (şartname §5.5).
 *
 * ⚠️ Sayı UYDURULMUYOR: veritabanından geliyor. Kayıt yoksa bölüm hiç
 * basılmıyor — "0 taşınmaz" yazan bir teaser, olmayan bir değeri
 * satmaya çalışmak olurdu.
 */
function GizliPortfoyTeaser({ sayi }: { sayi: number }) {
  /**
   * ⚠️ KAYIT YOKKEN DE GÖRÜNÜR — boş durum birinci sınıf bileşen.
   *
   * Önce `sayi <= 0` iken `null` dönüyordu ve bölüm ana sayfadan tamamen
   * kayboluyordu. Yanlıştı: site aylarca kısmi veriyle çalışacak ve
   * "gizli portföy diye bir şeyimiz var" bilgisi kayıt sayısından bağımsız
   * olarak ziyaretçiye söylenmesi gereken bir şey. Bölümün kaybolması,
   * ayrıştırıcı bir hizmetin hiç var olmadığı izlenimi veriyordu.
   *
   * ⚠️ SAYI YOKSA SAYI GÖSTERİLMEZ. "0 taşınmaz" yazmak, olmayan bir
   * değeri satmaya çalışmaktır; başlık sayısız kuruluyor.
   */
  const doluMu = sayi > 0

  return (
    <Bolum zemin="kakao">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-adacayi-300 text-eyebrow font-medium uppercase">Gizli portföy</p>

          <h2 className="text-notr-50 mt-2.5 font-serif text-baslik-2-mobil font-medium sm:text-baslik-2">
            {doluMu ? (
              <>
                Yayınlanmayan <span className="rakam">{sayi}</span> taşınmaz
              </>
            ) : (
              'Yayınlanmayan portföyümüz'
            )}
          </h2>

          <p className="text-notr-300 mt-3 text-govde">
            {doluMu
              ? 'Bazı mülk sahipleri ilanının herkese açık yayınlanmasını istemiyor. Bu taşınmazlar portföyümüzde var ama listede görünmüyor — erişim talebiyle paylaşıyoruz.'
              : 'Bazı taşınmazlar ilan sitelerinde yayınlanmaz. Şu an hazırlık aşamasında; aradığınızı anlatın, portföyümüze girdiğinde ilk siz haberdar olun.'}
          </p>
        </div>

        {/* ⚠️ TEK CTA YUVASI — iki ayrı buton değil.
            Dolu adaçayı yalnızca iki eylemde kullanılıyor ve bu onlardan
            biri (gizli portföy erişimi). Veri durumuna göre değişen şey
            eylemin KENDİSİ değil ETİKETİ; iki ayrı `<Buton>` yazmak
            disiplin testinin saydığı çağrı sayısını şişiriyordu ve
            kuralın nadirliğini yanlış yerden aşındırıyordu. */}
        <Buton href={doluMu ? '/gizli-portfoy' : '/iletisim'} gorunum="aksan" boyut="buyuk">
          {doluMu ? 'Erişim talep et' : 'Aradığınızı anlatın'}
          <OkIkon width={18} height={18} />
        </Buton>
      </div>
    </Bolum>
  )
}

/** Yatırımcı araçları (şartname §5.8) — liste tek kaynaktan. */
function YatirimciAraclari() {
  return (
    <Bolum zemin="yuzey">
      <BolumBasligi
        ustBaslik="Araçlar"
        baslik="Rakamı kendiniz görün"
        aciklama="Hepsi ücretsiz ve sonucu görmek için iletişim bilgisi istemiyoruz."
        yan={
          <Buton href="/araclar" gorunum="ikincil">
            Tüm araçlar
            <OkIkon width={16} height={16} />
          </Buton>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {ARACLAR.slice(0, 4).map((arac) => (
          <Link
            key={arac.adres}
            href={arac.adres}
            className="border-kenar rounded-kart bg-yuzey flex flex-col gap-2 border-[0.5px] p-5 transition-shadow hover:shadow-kart"
          >
            <GrafikIkon width={22} height={22} className="text-metin-3" />
            <h3 className="text-govde font-medium">{arac.kisaAd}</h3>
            <p className="text-metin-3 text-mikro">{arac.aciklama.split('. ')[0]}</p>
          </Link>
        ))}
      </div>
    </Bolum>
  )
}

/**
 * Aslıhan bölümü (şartname §5.9).
 *
 * ⚠️ FOTOĞRAF YOK — konulmadı. Aslıhan'ın kendi fotoğrafı gelmeden bu
 * alana stok görsel koymak, "kurumsal güven" anlatısının tam tersini
 * yapardı. Yerine tasarlanmış bir boş durum duruyor.
 *
 * ⚠️ Yetki belgesi numarası burada da görünür ve UYDURULMAZ; boşsa
 * eksikliği söyleyen uyarı basılır (altbilgideki kuralın aynısı).
 */
function AslihanBolumu({
  kurumsal,
}: {
  kurumsal: Awaited<ReturnType<typeof kurumsalBilgileriGetir>>
}) {
  return (
    <Bolum>
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="bg-yuzey-2 border-kenar rounded-kart text-metin-3 flex aspect-[4/3] flex-col items-center justify-center gap-2 border-[0.5px] px-6 text-center">
          <VeriBekleniyorIkon width={30} height={30} />
          <p className="text-govde-kucuk">Fotoğraf hazırlanıyor</p>
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-aksan-metin text-eyebrow font-medium uppercase">
            Kim danışmanlık veriyor
          </p>
          <h2 className="font-serif text-baslik-2-mobil font-medium sm:text-baslik-2">
            Aslıhan — Çorlu&apos;da gayrimenkul danışmanı
          </h2>
          <p className="text-metin-2 text-govde">
            Çorlu ve çevresinde alım, satım ve yatırım danışmanlığı. Rakamı olmayan bir iddiada
            bulunmuyoruz: her taşınmazın kira çarpanını, getirisini ve mahalle bağlamını
            hesaplayarak sunuyoruz.
          </p>

          <p className="text-metin-3 text-govde-kucuk">
            Taşınmaz Ticareti Yetki Belgesi No:{' '}
            {kurumsal?.yetkiBelgesiNo ? (
              <span className="rakam text-metin-2">{kurumsal.yetkiBelgesiNo}</span>
            ) : (
              <span className="text-uyari-metin">girilmedi — yönetim panelinden eklenmeli</span>
            )}
          </p>

          <div className="mt-1 flex flex-wrap gap-3">
            <Buton href="/hakkimizda" gorunum="ikincil">
              Hakkımızda
            </Buton>
            <Buton href="/iletisim" gorunum="ikincil">
              İletişim
            </Buton>
          </div>
        </div>
      </div>
    </Bolum>
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
            <span className="bg-vurgu-zemin text-vurgu rounded-buton flex size-11 items-center justify-center">
              <Ikon width={20} height={20} />
            </span>
            <h3 className="font-sans text-govde font-medium">{baslik}</h3>
            <p className="text-metin-2 text-govde leading-relaxed">{metin}</p>
          </div>
        ))}
      </div>
    </Bolum>
  )
}

/**
 * ⚠️ BANT DOLU TERRACOTTA — paletin ana vurgusu, sayfanın asıl eylemi.
 *
 * Gizli portföy bandı koyu kakao kaldı: orada anlatılan şey "saklı olan",
 * ve koyu zemin bunu taşıyor. İkisini de terracotta yapmak, vurguyu
 * sıradanlaştırırdı.
 *
 * ⚠️ Metin TAM BEYAZ, `text-white/80` DEĞİL. Terracotta üzerinde %80
 * beyaz 3,82:1 veriyor ve AA'nın altında kalıyor; koyu kakao bantta aynı
 * yumuşatma 9,08 verdiği için sorun çıkmıyordu. Hiyerarşi burada punto ve
 * boşlukla kuruluyor.
 */
function CagriBandi({ whatsapp }: { whatsapp: string | null }) {
  return (
    <Bolum zemin="terracotta">
      <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-baslik-2 text-white">
            Evinizin bugün ne ettiğini merak ediyor musunuz?
          </h2>
          <p className="text-govde-kucuk mt-3 text-white">
            Satmayı düşünmeseniz bile bilmek işinize yarar. Mahalle, metrekare ve bina bilgilerinizi
            paylaşın; size gerçek bir değer aralığı ve nasıl hesapladığımızı anlatalım.
          </p>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row">
          {/*
            ⚠️ Bakır aksanın iki kullanımından BİRİ. Diğeri gizli portföyde
            "Erişim talep et". Üçüncü bir yerde kullanılırsa ikisi birden
            sıradanlaşır; kural `src/lib/tasarim/disiplin.test.ts` içinde
            denetleniyor.
          */}
          <Buton href="/degerleme" gorunum="aksan" boyut="buyuk">
            Değerleme isteyin
          </Buton>
          {whatsapp ? (
            <Buton
              href={whatsapp}
              dis
              gorunum="ikincil"
              boyut="buyuk"
              sinifAdi="!border-white/40 !text-white hover:!bg-white/10"
            >
              WhatsApp
            </Buton>
          ) : null}
        </div>
      </div>
    </Bolum>
  )
}
