import Link from 'next/link'

import { AramaWidgeti, type MahalleSecenegi } from '@/components/ilan/AramaWidgeti'
import { IlanKarti } from '@/components/ilan/IlanKarti'
import { MahalleKarti } from '@/components/mahalle/MahalleKarti'
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

export default async function AnaSayfa() {
  const [ilanlar, mahalleler, kurumsal, portfoy, bolumler] = await Promise.all([
    oneCikanIlanlariGetir(3),
    mahalleleriGetir(),
    kurumsalBilgileriGetir(),
    // Yalnızca sayaç için; ilk sayfa yeterli, `toplam` tüm kümeyi verir.
    ilanlariGetir({}, 1, 1),
    bolumDurumlariniGetir(),
  ])

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
      <Kahraman
        whatsapp={whatsapp}
        mahalleler={mahalleler.map((m) => ({ slug: m.slug, ad: m.ad }))}
        ticariAcik={bolumler.ticari}
      />

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
 * ⚠️ ŞARTNAME "TAM GENİŞLİK GÖRSEL (ÇORLU HAVADAN) + LACİVERT OVERLAY"
 * İSTİYOR. GÖRSEL KONULMADI.
 *
 * Elimizde Çorlu'nun havadan çekilmiş, kullanım hakkı bize ait bir görseli
 * yok. Stok fotoğraf koymak şartnamenin kendi yasakladığı şey (§2:
 * "stok fotoğraf estetiği"), üstelik hero LCP ögesi — yanlış bir görsel
 * hem hedefi hem tonu bozar.
 *
 * Bu yüzden lacivert zemin doğrudan kullanılıyor: overlay'in üzerine
 * konacağı renk zaten oydu, dolayısıyla tipografi ve kontrast bugünden
 * doğru. Görsel geldiğinde tek yapılacak zemini `background-image` ile
 * değiştirmek; metin katmanı olduğu gibi kalır.
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
      <div className="bg-lacivert-900">
        <div className="kapsayici pt-16 pb-24 sm:pt-20 sm:pb-28 lg:pt-28 lg:pb-32">
          <div className="max-w-3xl">
            {/* ⚠️ Eyebrow ADAÇAYI, gold değil. Gold lacivert üzerinde
                6,69:1 ile okunur olurdu ama "gold asla metin rengi değildir"
                kuralı mutlak — bir kez esnetilirse sonraki kullanım açık
                zeminde olur ve 2,06:1'e düşer. adacayi-300 burada 10,36:1.
                Çift kontrast testinde ölçülüyor. */}
            <p className="text-adacayi-300 text-eyebrow font-medium uppercase">Çorlu · Tekirdağ</p>

            <h1 className="text-notr-50 mt-4 font-serif text-baslik-1-mobil font-medium sm:text-baslik-1 lg:text-[3.25rem] lg:leading-[1.08]">
              Gayrimenkul kararı hisle değil, rakamla verilir.
            </h1>

            <p className="text-notr-300 mt-6 max-w-2xl text-baslik-3 leading-relaxed">
              Çorlu&apos;da bir taşınmazın ne kadar ettiğini, kaç yılda kendini ödediğini ve hangi
              mahallenin hangi değer sürücüsünden beslendiğini gösteriyoruz. İlan listelemiyoruz —
              karar veriyoruz.
            </p>

            <p className="text-notr-300 mt-6 flex items-center gap-2 text-govde-kucuk">
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
    baslik: 'Evimi değerlendirmek istiyorum',
    metin:
      'Mahalle verisine dayalı değer aralığı — sonucu görmek için iletişim bilgisi istemiyoruz.',
    adres: '/degerleme',
    eylem: 'Evimi değerlendir',
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
  if (sayi <= 0) return null

  return (
    <Bolum zemin="lacivert">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-adacayi-300 text-eyebrow font-medium uppercase">Gizli portföy</p>
          <h2 className="text-notr-50 mt-2.5 font-serif text-baslik-2-mobil font-medium sm:text-baslik-2">
            Yayınlanmayan <span className="rakam">{sayi}</span> taşınmaz
          </h2>
          <p className="text-notr-300 mt-3 text-govde">
            Bazı mülk sahipleri ilanının herkese açık yayınlanmasını istemiyor. Bu taşınmazlar
            portföyümüzde var ama listede görünmüyor — erişim talebiyle paylaşıyoruz.
          </p>
        </div>

        <Buton href="/gizli-portfoy" gorunum="aksan" boyut="buyuk">
          Erişim talep et
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
            <p className="text-metin-2 text-[0.9375rem] leading-relaxed">{metin}</p>
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
          <h2 className="text-baslik-2 text-white">
            Evinizin bugün ne ettiğini merak ediyor musunuz?
          </h2>
          <p className="text-govde-kucuk mt-3 text-white/80">
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
            Evimi değerlendir
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
