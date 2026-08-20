import type { Metadata } from 'next'
import { SayfaBasligi } from '@/components/icerik/SayfaIcerik'
import { sayfaIcerigi } from '@/lib/veri/sayfaIcerikleri'
import { Suspense } from 'react'

import { AkilliArama } from '@/components/ilan/AkilliArama'
import { SayfaVitrini, VitrinOzeti } from '@/components/duzen/SayfaVitrini'
import { Eyebrow } from '@/components/ui/Bolum'
import { Sahne } from '@/components/hareket/Sahne'
import { FiltrePaneli } from '@/components/ilan/FiltrePaneli'
import { Siralama } from '@/components/ilan/Siralama'
import { aiAramaAcikMi } from '@/lib/arama/motor'
import { bolumDurumlariniGetir } from '@/lib/veri/siteBolumleri'
import { IlanKarti } from '@/components/ilan/IlanKarti'
import { SiraOgesi, YataySira } from '@/components/ilan/YataySira'
import { OlayBildir } from '@/components/olcum/OlayBildir'
import { BosDurum } from '@/components/ui/BosDurum'
import { Buton } from '@/components/ui/Buton'
import { KilitliKart } from '@/components/ui/KilitliKart'
import { sayiYaz } from '@/lib/bicimlendirme'
import type { IlanKategorisi, IlanTipi } from '@/lib/secenekler'
import { mutlakAdres } from '@/lib/site'
import {
  AZAMI_GOSTER,
  ilanlariGetir,
  SAYFA_BASINA_ILAN,
  type IlanFiltresi,
} from '@/lib/veri/ilanlar'
import { mahalleleriGetir } from '@/lib/veri/mahalleler'
import { temaSiralariniGetir, type TemaSirasi } from '@/lib/veri/portfoy'

export const metadata: Metadata = {
  title: 'Portföy — Çorlu satılık ve kiralık taşınmazlar',
  description:
    'Çorlu ve çevresindeki satılık ve kiralık taşınmaz portföyümüz. Her ilanda kira çarpanı, ' +
    'brüt getiri ve EİDS doğrulama bilgisi yer alır.',
  alternates: { canonical: mutlakAdres('/portfoy') },
}

type AramaParametreleri = Record<string, string | string[] | undefined>

export default async function PortfoySayfasi({
  searchParams,
}: {
  searchParams: Promise<AramaParametreleri>
}) {
  const icerik = await sayfaIcerigi('portfoy')

  const parametreler = await searchParams
  const filtre = parametreleriCoz(parametreler)

  /**
   * ⚠️ SAYFALAMA DEĞİL "DAHA FAZLA GÖSTER" (şartname §7).
   *
   * `goster` kaç ilanın basılacağını söylüyor ve URL'de tutuluyor. Bu
   * bilinçli: istemci state'iyle yapsaydık liste SSR'dan çıkar, arama
   * motoru yalnızca ilk 24'ü görürdü — oysa bu sayfa SEO motoru.
   * Bağlantı paylaşıldığında da aynı sayıda sonuç açılıyor.
   *
   * Üst sınır kaza koruması: `?goster=999999` ile tüm portföyü tek
   * istekte çekmeyi engelliyor.
   */
  const istenen = sayiCoz(parametreler.goster) ?? SAYFA_BASINA_ILAN
  const goster = Math.min(Math.max(istenen, SAYFA_BASINA_ILAN), AZAMI_GOSTER)

  /**
   * Tema sıraları yalnızca FİLTRESİZ görünümde gösterilir.
   *
   * Filtre uygulandığı anda ziyaretçi aramaya geçmiştir: "yeni eklenenler"
   * sırası orada sonucun önünü kapatan bir gürültüdür. Süzülmüş görünüm
   * ızgara + sayfalama olarak kalıyor — arama motorunun tüm portföyü
   * gezebilmesi de buna bağlı.
   */
  const filtresizMi = Object.keys(filtre).every(
    (anahtar) => filtre[anahtar as keyof IlanFiltresi] === undefined,
  )

  const [sonuc, mahalleler, siralar, bolumler] = await Promise.all([
    ilanlariGetir(filtre, 1, goster),
    mahalleleriGetir(),
    filtresizMi ? temaSiralariniGetir() : Promise.resolve([]),
    bolumDurumlariniGetir(),
  ])

  /**
   * AI arama İKİ koşula birden bağlı.
   *
   * ⚠️ `ai_arama` bölümü varsayılan KAPALI ve bu bir KVKK kararı, teknik
   * değil: ziyaretçinin yazdığı metin Anthropic'in (ABD) sunucularına
   * gidiyor ve bu aktarımın aydınlatma metnine eklenmesi gerekiyor.
   * Anahtar tanımlı olsa bile bölüm açılmadan kutu basılmaz.
   * Ayrıntı: docs/AI-ARAMA-KVKK-NOTU.md
   */
  const aiAramaGoster = bolumler.ai_arama && aiAramaAcikMi()

  /**
   * ⚠️ RAKAM SAYILIYOR, YAZILMIYOR (kural 2).
   *
   * Filtre uygulanmışken bandın toplamı yanıltıcı olurdu: ziyaretçi
   * portföyün tamamını 3 sanır. Bu yüzden filtresizken toplam portföy,
   * filtreliyken hiç rakam gösterilmiyor — sonuç sayısı zaten listenin
   * üstünde ve `aria-live` ile duyuruluyor.
   */
  const ozet = filtresizMi
    ? ([
        { etiket: 'Yayındaki taşınmaz', deger: sonuc.toplam > 0 ? sayiYaz(sonuc.toplam) : null },
        { etiket: 'Mahalle', deger: mahalleler.length > 0 ? String(mahalleler.length) : null },
      ] as const)
    : null

  return (
    <>
      {/*
        ⚠️ BAŞLIK SOLA ALINDI — `h1` ETİKETİ DURUYOR.

        Önceden ortalanmıştı ve sayfa doğrudan tema sıralarıyla başlıyordu.
        Vitrin bandı geldikten sonra ortalama, bandın sağındaki özetle
        çakışıyor. Etiket DEĞİŞMEDİ: bu sayfanın arama motoru sıralaması ve
        ekran okuyucu gezinmesi `h1`e bağlı. "Küçük görünsün" ile "başlık
        olmasın" ayrı şeyler; ikincisi sessiz bir SEO kaybı olurdu.
      */}
      <SayfaVitrini yan={ozet !== null ? <VitrinOzeti ogeler={ozet} /> : undefined}>
        <Eyebrow>Portföy</Eyebrow>
        <SayfaBasligi
          icerik={icerik}
          varsayilanBaslik="Portföy"
          h1Sinifi="text-metin mt-4 font-serif text-baslik-1-mobil font-medium sm:text-baslik-1"
          aciklamaSinifi="text-metin-2 mt-5 text-govde leading-relaxed"
          varsayilanAciklama={
            <p className="text-metin-2 mt-5 text-govde leading-relaxed">
              Çorlu ve çevresindeki taşınmazlarımız. Her ilanda kira çarpanı ve amortisman süresini
              hesaplayıp gösteriyoruz; kira verisi olmayan ilanlarda bu alanları boş bırakıyoruz.
            </p>
          }
        />
      </SayfaVitrini>

      <div className="kapsayici py-12 sm:py-16">
        {siralar.length > 0 ? (
          <div className="mb-12 flex flex-col gap-10">
            {siralar.map((sira) => (
              <TemaBolumu key={sira.anahtar} sira={sira} />
            ))}
          </div>
        ) : null}

        {/* ⚠️ İki koşul: bölüm açık VE anahtar tanımlı. Bölüm varsayılan
          kapalı (KVKK — aydınlatma metni bekliyor). Filtreler her
          hâlükârda çalışır; AI arama onların yerine değil yanına konuyor. */}
        {aiAramaGoster ? <AkilliArama /> : null}

        {/* ⚠️ İki sütun: solda yapışkan filtre paneli (280px), sağda sonuç.
          Şartname §7 — dönüşümün olduğu yer burası. */}
        <div className="grid gap-8 lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:gap-10">
          <Suspense fallback={<div className="iskelet h-96" />}>
            <FiltrePaneli
              mahalleler={mahalleler.map((m) => ({ slug: m.slug, ad: m.ad }))}
              sonucSayisi={sonuc.toplam}
            />
          </Suspense>

          <div>
            <div className="border-kenar mb-5 flex flex-wrap items-center justify-between gap-3 border-b-[0.5px] pb-4">
              <p className="text-metin-2 text-govde-kucuk" aria-live="polite">
                {sonuc.toplam > 0
                  ? `${sayiYaz(sonuc.toplam)} taşınmaz listeleniyor`
                  : 'Sonuç bulunamadı'}
              </p>

              <Suspense fallback={null}>
                <Siralama />
              </Suspense>
            </div>

            {sonuc.ilanlar.length > 0 ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 lg:gap-5">
                  {/* ⚠️ Kademe yalnızca İLK ALTI KARTTA. Sonrakiler zaten
                    görüş alanına girdiklerinde tek tek sahneye giriyor;
                    hepsine artan gecikme vermek listenin sonunu saniyelerce
                    geciktirirdi. */}
                  {sonuc.ilanlar.map((ilan, sira) => (
                    <Sahne key={ilan.id} gecikme={Math.min(sira, 5) * 60} className="h-full">
                      <IlanKarti
                        ilan={ilan}
                        oncelikli={filtresizMi ? false : sira < 3}
                        sinifAdi="h-full"
                      />
                    </Sahne>
                  ))}
                </div>

                <DahaFazla toplam={sonuc.toplam} goster={goster} parametreler={parametreler} />
              </>
            ) : (
              <>
                {/*
                ⭐ Sonuçsuz arama, portföy BOŞLUĞUNU gösteriyor: ziyaretçinin
                aradığı şey var ama bizde yok. Panelde en değerli sinyallerden
                biri — hangi filtrelerin boş döndüğü, hangi ilanı almak
                gerektiğini söylüyor.
              */}
                <OlayBildir ad="sonucsuz_arama" />
                <BosDurum
                  baslik="Bu kriterlere uyan taşınmaz yok"
                  neden="Filtreleri gevşetmeyi deneyin. Aradığınızı bulamadıysanız bize anlatın — portföyümüze girdiğinde ilk siz haberdar olun."
                  eylem={
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Buton href="/portfoy" gorunum="ikincil">
                        Filtreleri temizle
                      </Buton>
                      <Buton href="/iletisim">Aradığınızı anlatın</Buton>
                    </div>
                  }
                />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

/**
 * Tek bir tema sırası.
 *
 * ⚠️ BAŞLIK ÖLÇÜT SÖYLER, EMOJİ TAŞIMAZ. Alt satır "neye göre bu sırada?"
 * sorusunu cevaplar. Belirsiz bir başlık ("Dikkat çeken ilanlar") merak
 * değil güvensizlik uyandırır.
 *
 * ⚠️ Boş sıra sessizce gizlenmez; sebebi yazılır. Sitenin aylarca kısmi
 * veriyle çalışacağı düşünülürse, "neden boş" sorusunun cevabı burada
 * ilanların kendisi kadar önemli.
 */
function TemaBolumu({ sira }: { sira: TemaSirasi }) {
  const dolu = sira.ogeler.length > 0

  return (
    <section aria-labelledby={`sira-${sira.anahtar}`}>
      <div className="mb-4 flex flex-col gap-1">
        <h2 id={`sira-${sira.anahtar}`} className="text-baslik-2">
          {sira.baslik}
        </h2>
        <p className="text-metin-3 text-govde-kucuk olcu">{sira.altBaslik}</p>
      </div>

      {dolu ? (
        <YataySira etiket={sira.baslik}>
          {sira.ogeler.map((oge) => (
            <SiraOgesi key={oge.anahtar}>
              {oge.tip === 'kilitli' ? (
                <KilitliKart
                  mahalleAdi={oge.kayit.mahalleAdi}
                  odaSayisi={oge.kayit.odaSayisi}
                  m2Araligi={oge.kayit.m2Araligi}
                  fiyatBandi={oge.kayit.fiyatBandi}
                  kiraCarpani={oge.kayit.kiraCarpani}
                />
              ) : (
                <IlanKarti ilan={oge.ilan} />
              )}
            </SiraOgesi>
          ))}
        </YataySira>
      ) : (
        <BosDurum
          baslik="Bu sırada şu an taşınmaz yok"
          neden={sira.bosSebebi ?? 'Ölçüte uyan taşınmaz bulunmuyor.'}
          sade
        />
      )}
    </section>
  )
}

/**
 * "Daha fazla göster" — sayfalama yerine (şartname §7).
 *
 * ⚠️ BUTON DEĞİL BAĞLANTI. Sunucu tarafında render edilen bir liste için
 * doğru öge bu: JavaScript olmadan da çalışıyor, arama motoru izleyebiliyor
 * ve orta tuşla yeni sekmede açılabiliyor. Bir `<button>` üçünü de kaybederdi.
 */
function DahaFazla({
  toplam,
  goster,
  parametreler,
}: {
  toplam: number
  goster: number
  parametreler: AramaParametreleri
}) {
  if (goster >= toplam) return null

  const sonraki = Math.min(goster + SAYFA_BASINA_ILAN, AZAMI_GOSTER)
  const sorgu = new URLSearchParams()
  for (const [anahtar, deger] of Object.entries(parametreler)) {
    if (typeof deger === 'string' && deger !== '' && anahtar !== 'goster') {
      sorgu.set(anahtar, deger)
    }
  }
  sorgu.set('goster', String(sonraki))

  const kalan = toplam - goster

  return (
    <div className="mt-8 flex flex-col items-center gap-2">
      <Buton href={`/portfoy?${sorgu.toString()}`} gorunum="ikincil" boyut="buyuk">
        Daha fazla göster
      </Buton>
      <p className="text-metin-3 text-mikro">
        <span className="rakam">{sayiYaz(goster)}</span> /{' '}
        <span className="rakam">{sayiYaz(toplam)}</span> gösteriliyor
        {goster >= AZAMI_GOSTER ? null : ` · ${sayiYaz(kalan)} taşınmaz daha var`}
      </p>
    </div>
  )
}

/** Sorgu parametrelerini güvenle filtreye çevirir. Tanınmayan değer yok sayılır. */
function parametreleriCoz(parametreler: AramaParametreleri): IlanFiltresi {
  const metin = (anahtar: string): string | undefined => {
    const deger = parametreler[anahtar]
    return typeof deger === 'string' && deger !== '' ? deger : undefined
  }

  const tip = metin('tip')
  const kategori = metin('kategori')
  const siralama = metin('siralama')

  return {
    tip: tip === 'satilik' || tip === 'kiralik' ? (tip as IlanTipi) : undefined,
    kategori: KATEGORILER.includes(kategori ?? '') ? (kategori as IlanKategorisi) : undefined,
    mahalle: metin('mahalle'),
    odaSayisi: metin('oda'),
    enAzFiyat: sayiCoz(parametreler.enAz),
    enCokFiyat: sayiCoz(parametreler.enCok),
    enAzM2: sayiCoz(parametreler.m2EnAz),
    enCokM2: sayiCoz(parametreler.m2EnCok),
    /**
     * ⚠️ Yatırım filtreleri ONDALIK kabul ediyor.
     *
     * `sayiCoz` `parseInt` kullanıyor ve "%7,5 brüt getiri" gibi bir değeri
     * sessizce 7'ye yuvarlardı — kullanıcı yazdığından farklı bir sonuç
     * görür ve sebebini anlamaz. Bu üçü için ayrı bir çözücü var.
     */
    carpanEnCok: ondalikCoz(parametreler.carpan),
    getiriEnAz: ondalikCoz(parametreler.getiri),
    sanayiKm: ondalikCoz(parametreler.sanayi),
    siralama: SIRALAMALAR.includes(siralama ?? '')
      ? (siralama as IlanFiltresi['siralama'])
      : undefined,
  }
}

const KATEGORILER = ['konut', 'isyeri', 'arsa', 'depo', 'fabrika']
const SIRALAMALAR = ['yeni', 'fiyat_artan', 'fiyat_azalan', 'carpan_artan']

/** Ondalık kabul eden çözücü — yatırım filtreleri için. */
function ondalikCoz(deger: string | string[] | undefined): number | undefined {
  if (typeof deger !== 'string' || deger.trim() === '') return undefined
  const sayi = Number.parseFloat(deger.replace(',', '.'))
  return Number.isFinite(sayi) && sayi > 0 ? sayi : undefined
}

function sayiCoz(deger: string | string[] | undefined): number | undefined {
  if (typeof deger !== 'string') return undefined
  const sayi = Number.parseInt(deger, 10)
  return Number.isFinite(sayi) && sayi > 0 ? sayi : undefined
}
