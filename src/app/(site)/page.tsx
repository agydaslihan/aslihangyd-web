import type { ReactNode } from 'react'

import Image from 'next/image'
import Link from 'next/link'

import { HeroBolumu } from '@/components/hero/HeroBolumu'
import { SinematikHero } from '@/components/hero/SinematikHero'
import { CorluDeneyimi } from '@/components/anasayfa/CorluDeneyimi'
import { YatayAnlati } from '@/components/anlati/YatayAnlati'
import { ANLATI_BOLUMLERI } from '@/lib/anasayfa/anlati'
import { GuvenKartlari } from '@/components/duzen/GuvenKartlari'
import { Sahne } from '@/components/hareket/Sahne'
import { AramaWidgeti, type MahalleSecenegi } from '@/components/ilan/AramaWidgeti'
import { IlanKarti } from '@/components/ilan/IlanKarti'
import { MahalleKarti } from '@/components/mahalle/MahalleKarti'
import { EndeksSeridi } from '@/components/endeks/EndeksSeridi'
import { haritaStilAdresi } from '@/lib/harita/sunucu'
import { mahalleyiHaritaVerisineCevir } from '@/lib/harita/mahalleVerisi'
import { GuvenSeridi } from '@/components/duzen/GuvenSeridi'
import { Feragat } from '@/components/ui/Feragat'
import { Bolum, BolumBasligi, BolumSarmali, Eyebrow } from '@/components/ui/Bolum'
import { BosDurum } from '@/components/ui/BosDurum'
import { Buton } from '@/components/ui/Buton'
import { DogrulanmisIkon, GrafikIkon, KonumIkon, OkIkon } from '@/components/ui/Ikon'
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
import { hakkimizdaGetir, type HakkimizdaGorseli } from '@/lib/veri/hakkimizda'
import { anaSayfaDuzeniniGetir, heroAcilisiniGetir } from '@/lib/veri/anaSayfaDuzeni'

export default async function AnaSayfa() {
  const [
    ilanlar,
    mahalleler,
    kurumsal,
    sayimIcinIlanlar,
    bolumler,
    hero,
    hakkimizda,
    duzen,
    heroAcilisi,
  ] = await Promise.all([
    oneCikanIlanlariGetir(3),
    mahalleleriGetir(),
    kurumsalBilgileriGetir(),
    /**
     * ⚠️ Sayfa boyutu 200: hem toplam sayaç hem de mahalle başına dağılım
     * bu tek sorgudan çıkıyor (`portfoySayilari`). Ayrı bir gruplama
     * sorgusu, ana sayfaya her istekte ikinci bir veritabanı turu eklerdi.
     */
    ilanlariGetir({}, 1, 200),
    bolumDurumlariniGetir(),
    heroAyarlari(),
    /**
     * ⚠️ Portre HAKKIMIZDA GLOBALİNDEN. Aslıhan fotoğrafını oraya
     * yüklüyordu ve ana sayfa onu hiç okumuyordu: panelde dolu, sayfada
     * "Fotoğraf hazırlanıyor" yazan boş bir çerçeve duruyordu.
     */
    hakkimizdaGetir(),
    /**
     * ⚠️ Bölüm sırası PANELDEN. Okuma başarısız olursa varsayılan kod
     * sırasına düşüyor — ana sayfa düzen kaydına bağımlı değil.
     */
    anaSayfaDuzeniniGetir(),
    heroAcilisiniGetir(),
  ])

  /**
   * ⚠️ Hero ayarları BURADA okunuyor, `HeroBolumu` içinde ikinci kez değil.
   *
   * Sayfanın hangi hero'yu çizeceğini bilmesi gerekiyor (slider mı, metin
   * mi) ve `HeroBolumu` da aynı veriyi okuyor. İki ayrı okuma iki ayrı
   * veritabanı turu demek olurdu; Payload aynı istek içinde önbelleklemiyor.
   */
  /**
   * ⚠️ Hero'nun tam ekran zemini panelden geliyor: ilk slaydın görseli.
   * Slayt yoksa `null` ve vitrin sıcak gradyanla çiziliyor.
   */
  const ilkSlayt = hero.slaytlar.find((slayt) => slayt.gorselUrl !== '')
  const heroGorseli =
    ilkSlayt !== undefined ? { url: ilkSlayt.gorselUrl, alt: ilkSlayt.gorselAlt } : null

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
   * Harita bölümünün verisi.
   *
   * ⚠️ Mahalle başına portföy sayısı BURADA sayılıyor, haritada değil:
   * istemciye ilan listesi göndermek yerine tek bir sayı gönderiyoruz.
   * Gizli portföy bu sayıya girmiyor — sayısı zaten kendi bandında.
   */
  const haritaStili = haritaStilAdresi()
  const haritaMahalleleri = mahalleler.map(mahalleyiHaritaVerisineCevir)

  /**
   * ⚠️ Sayım İLAN KAYITLARINDAN, ayrı bir sorgu ile değil: sayfa zaten
   * portföy toplamını okuyor. Mahalle başına sayı için ikinci bir tur
   * atmak, ana sayfaya her istekte fazladan bir sorgu eklerdi.
   */
  const portfoySayilari: Record<string, number> = {}
  for (const ilan of sayimIcinIlanlar.ilanlar) {
    const slug = typeof ilan.mahalle === 'object' && ilan.mahalle ? ilan.mahalle.slug : null
    if (slug === null) continue
    portfoySayilari[slug] = (portfoySayilari[slug] ?? 0) + 1
  }

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
      deger: sayimIcinIlanlar.toplam > 0 ? String(sayimIcinIlanlar.toplam) : null,
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

  /**
   * ─────────────────────────────────────────────────────────────────────
   * ⚠️ BÖLÜM SIRASI PANELDEN — JSX'TEN DEĞİL.
   *
   * Bu harita "hangi anahtar neyi çiziyor" sorusunu cevaplıyor; "hangi
   * sırada" sorusunun cevabı `Ana Sayfa Düzeni` globalinde ve sürükle-
   * bırakla değiştiriliyor. İkisini ayırmanın sebebi basit: sıra editoryal
   * bir tercih ve her değiştiğinde bir geliştiricinin JSX taşımasını
   * beklemek, o tercihi pratikte dondurmak demekti.
   *
   * ⚠️ HARİTA İLE `ANASAYFA_BOLUMLERI` LİSTESİ EŞİT OLMAK ZORUNDA.
   * Panelde seçilebilen ama hiçbir şey çizmeyen bir satır, en kötü panel
   * deneyimi; çizilen ama sıralanamayan bir bölüm ise sessiz bir kapsam
   * boşluğu. Eşitlik `lib/anasayfa/duzen.test.ts` ile denetleniyor.
   *
   * ⚠️ VİTRİN BU HARİTADA YOK: sayfanın LCP öğesi ve daima ilk sırada.
   * Gerekçe `lib/anasayfa/duzen.ts` başında.
   * ─────────────────────────────────────────────────────────────────────
   */
  const bolumCizimleri: Record<string, ReactNode> = {
    guven_kartlari: (
      <>
        <GuvenKartlari />
      </>
    ),
    arama: (
      <>
        <AramaBolumu
          whatsapp={whatsapp}
          mahalleler={mahalleler.map((m) => ({ slug: m.slug, ad: m.ad }))}
          ticariAcik={bolumler.ticari}
        />
      </>
    ),
    guven_seridi: (
      <>
        <GuvenSeridi ogeler={guvenOgeleri} />
      </>
    ),
    aslihan: (
      <>
        {/*
            ⚠️ 6.3 — KURUCU HİKÂYESİ YUKARI TAŞINDI.

            Önceki düzende Aslıhan sayfanın sonundaydı; şartname onu üçüncü
            bölüme koyuyor ve gerekçesi doğru: ziyaretçi portföye bakmadan önce
            kiminle konuştuğunu bilmeli. Güven, rakamlardan önce gelir.
          */}
        <AslihanBolumu
          kurumsal={kurumsal}
          portre={hakkimizda.portre}
          portreAltMetni={hakkimizda.portreAltMetni}
        />
      </>
    ),
    corlu_deneyimi: (
      <>
        {/*
            ⚠️ 6.4 — İMZA BÖLÜM. Harita GÖRÜNÜR OLANA KADAR İNMİYOR
            (MapLibre 443 kB gzip); gerekçe `CorluDeneyimi` içinde.
          */}
        <CorluDeneyimi
          mahalleler={haritaMahalleleri}
          portfoySayilari={portfoySayilari}
          stilAdresi={haritaStili}
        />
      </>
    ),
    one_cikan_portfoy: (
      <>
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
                /**
                 * ⚠️ ARTIK ÖNCELİKLİ DEĞİL — ÖLÇÜMLE.
                 *
                 * Eskiden ilk kart `oncelikli` alıyordu çünkü hero'nun hemen
                 * altındaydı. Yeni düzende önce vitrin, sonra güven kartları,
                 * sonra slider bandı geliyor: kart ızgarası ilk ekranın çok
                 * altında.
                 *
                 * Üretilen HTML'de iki `<link rel="preload" as="image">`
                 * görüldü ve ikisi AYNI dosyayı işaret ediyordu (vitrin sahnesi
                 * de ilk öne çıkan ilanı gösteriyor). İkinci ön yükleme,
                 * görünmeyen bir görsel için gerçek LCP adayının bant
                 * genişliğini yiyordu.
                 */
                <Sahne key={ilan.id} gecikme={sira * 60} className="h-full">
                  <IlanKarti ilan={ilan} sinifAdi="h-full" />
                </Sahne>
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
      </>
    ),
    gizli_portfoy: <>{bolumler.gizli_portfoy ? <GizliPortfoyTeaser sayi={gizliSayi} /> : null}</>,
    anlati: (
      <>
        {/*
            ⚠️ 6.6 — YATAY ANLATI. Sıkıcı ikon kutuları yerine dört bölümlük bir
            akış; masaüstünde yatay, mobilde dikey `scroll-snap`. GSAP burada hak
            ediyor: kaydırmaya bağlı (`scrub`) zaman çizelgesi CSS ile yazılamaz.
          */}
        <YatayAnlati bolumler={ANLATI_BOLUMLERI} />
      </>
    ),
    endeks: (
      <>
        {/*
            ⚠️ 6.7 — CANLI PİYASA. Şerit kendi kapısını taşıyor: endeks eşikleri
            (6 ay + 500 gözlem) sağlanmadan rakam göstermiyor. Panelde durumu
            "Ana sayfa bölümleri" ekranında yazıyor.
          */}
        <EndeksSeridi />
      </>
    ),
    slayt: (
      <>
        {/*
            ⚠️ Slider bandı hero'nun ALTINDA, çünkü hero zaten ilk slaydı tam
            ekran kullanıyor. İkinci bir slayt varsa Aslıhan'ın kalan kareleri
            burada dönüyor; tek slayt varsa bant hiç çizilmiyor — aynı fotoğrafı
            iki kez göstermenin anlamı yok.
          */}
        {/*
            ⚠️ BANT YALNIZCA "METİN ÖNCE" KİPİNDE.

            Bandın varlık sebebi, vitrinin yalnızca İLK slaydı zemin olarak
            kullanması: kalan kareler burada dönüyor. "Slayt önce" kipinde
            slider zaten sayfanın hero'su ve TÜM slaytları gösteriyor;
            bandı da çizmek aynı fotoğrafları ikinci kez basmak olurdu.
            "Yalnızca metin" kipinde slider tümden kapalı.
          */}
        {heroAcilisi === 'metin_once' && hero.slaytlar.length > 1 ? (
          <div id="hero-slaytlari" className="py-16 sm:py-20">
            {/*
                ⚠️ İLK SLAYT BANTTAN ÇIKARILIYOR — ÖLÇÜMLE BULUNDU.

                Üretilen HTML'de aynı fotoğraf iki kez görüldü: biri hero'nun tam
                ekran zemini (`priority`), biri bandın ilk slaydı (`lazy`).
                Ziyaretçi için tekrar, ağ için ikinci bir istek.
              */}
            <HeroBolumu
              ayarlar={{ ...hero, slaytlar: hero.slaytlar.slice(1) }}
              sayfaHerosu={false}
            />
          </div>
        ) : null}
      </>
    ),
    mahalleler: (
      <>
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
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
                {/* ⚠️ Kademe 60 ms ve ÜST SINIR 5 KART (300 ms). Sabit çarpan
                    altıncı kartı 360 ms geciktirirdi; kullanıcı o noktada zaten
                    kaydırıyor ve geç gelen kart "takıldı" gibi okunur. */}
                {mahalleler.slice(0, 6).map((mahalle, sira) => (
                  <Sahne key={mahalle.id} gecikme={Math.min(sira, 5) * 60} className="h-full">
                    <MahalleKarti mahalle={mahalle} />
                  </Sahne>
                ))}
              </div>

              {/* ⚠️ KURAL 5 — kartlar yatırım skoru rozeti taşıyor; skor
                    gösterilen her yerde feragat zorunlu. Gerekçenin tamamı
                    `/mahalleler` sayfasında yazılı. */}
              <Feragat sinifAdi="mt-6" />
            </>
          ) : (
            <BosDurum
              baslik="Mahalle sayfaları hazırlanıyor"
              neden="Pilot mahallelerin analiz metinleri ve rakamları üzerinde çalışıyoruz. Hazır olduğunda burada göreceksiniz."
              ikon={<KonumIkon width={32} height={32} />}
            />
          )}
        </Bolum>
      </>
    ),
    araclar: (
      <>
        <YatirimciAraclari />
      </>
    ),
    uc_yol: (
      <>
        <UcYolAyrimi />
      </>
    ),
    cagri: (
      <>
        <CagriBandi whatsapp={whatsapp} />
      </>
    ),
  }

  return (
    <>
      {/*
        ─────────────────────────────────────────────────────────────────
        ⚠️ 6.1 — SİNEMATİK VİTRİN. ÖNCEKİ İKİ SÜTUNLU HERO GİTTİ.

        Aurora'nın açılışı tam ekran ve ortalanmış. Önceki düzen metni sola,
        3B ilan sahnesini sağa koyuyordu; o kurulum "fotoğrafımız yok"
        sorununa verilmiş bir cevaptı. Şartname artık medya sırasını kendisi
        veriyor: video → görsel → sıcak gradyan.

        ⚠️ ZEMİN PANELDEN GELİYOR. Hero slaytlarının ilki tam ekran arka
        plan oluyor; yani Aslıhan'ın yüklediği fotoğraf çöpe gitmiyor,
        sayfanın en görünür yerine çıkıyor. Slayt yoksa gradyan devreye
        giriyor ve bu bir boş durum değil, tasarlanmış ikinci basamak.
        ─────────────────────────────────────────────────────────────────
      */}
      {/*
        ─────────────────────────────────────────────────────────────────
        ⚠️ HERO AÇILIŞI PANELDEN — ÜÇ KİP, ÜÇÜ DE GERÇEK SAYFA BÖLÜMÜ.

        Hiçbiri açılır katman (interstitial) değil: Google mobilde araya
        giren katmanları cezalandırıyor, katmanın kendisi LCP öğesi olur
        ve odak tuzağı gerektirir — hiçbiri gerekmeyen bir sorun için.

        ⚠️ HANGİ KİP AKTİFSE `<h1>` ORADA. Sayfada iki `<h1>` olamaz;
        `sayfaHerosu` bayrağı `<h1>`/`<h2>` ile `priority`yi BİRLİKTE
        taşıyor, ikisi asla ayrışmasın diye.
        ─────────────────────────────────────────────────────────────────
      */}
      {heroAcilisi === 'slayt_once' ? <HeroBolumu ayarlar={hero} sayfaHerosu /> : null}

      <SinematikHero
        sayfaHerosu={heroAcilisi !== 'slayt_once'}
        sonrakiBolumId={
          heroAcilisi === 'metin_once' && hero.slaytlar.length > 1 ? 'hero-slaytlari' : undefined
        }
        ustBaslik="Çorlu · Tekirdağ"
        baslik="Gayrimenkulün gerçek değerini"
        vurgu="birlikte"
        baslikDevam="bulalım."
        aciklama="Çorlu'da veri odaklı, güvenilir ve profesyonel gayrimenkul danışmanlığı. Bir taşınmazın ne kadar ettiğini, kaç yılda kendini ödediğini ve hangi mahallenin hangi değer sürücüsünden beslendiğini gösteriyoruz."
        birincilEylem={{ ad: 'Portföyü incele', adres: '/portfoy' }}
        ikincilEylem={{ ad: 'Ücretsiz değerleme', adres: '/degerleme' }}
        arkaplan={heroGorseli}
      />

      {duzen.map((bolum) => (
        <BolumSarmali
          key={bolum.anahtar}
          zemin={bolum.zemin}
          bosluk={bolum.bosluk}
          hizalama={bolum.hizalama}
        >
          {bolumCizimleri[bolum.anahtar] ?? null}
        </BolumSarmali>
      ))}
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
/**
 * Arama bölümü — hero'nun ALTINDA, kendi zemininde duruyor.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ SLAYDIN ÜSTÜNE BİNDİRİLMEDİ VE BU BİLİNÇLİ.
 *
 * Kart eskiden metin hero'suna biniyordu (-3rem). Yeni vitrinde o yeri
 * güven kartları aldı; arama kartı onların altına indi. Fotoğraf üstüne
 * bindirmek ise hiç denenmedi çünkü iki sorun
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
            <h3 className="text-baslik-3 font-baslik font-medium">{baslik}</h3>
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
    <Bolum zemin="koyu">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-koyu-bant-vurgu text-eyebrow font-medium uppercase">Gizli portföy</p>

          <h2 className="text-notr-50 mt-2.5 font-baslik text-baslik-2-mobil font-medium sm:text-baslik-2">
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

function CagriBandi({ whatsapp }: { whatsapp: string | null }) {
  return (
    <Bolum zemin="altin">
      <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          {/*
            ⚠️ METİN RENGİ SINIFI YOK — bant kendi metin rengini veriyor
            (`Bolum zemin="altin"` → `text-vurgu-uzeri`, yani mürekkep).
            Buraya `text-white` yazmak altın üzerinde 2,36:1 üretirdi;
            eski terracotta bantta doğru olan cevap renk değişince yanlışa
            döndü.
          */}
          <h2 className="text-baslik-2">Evinizin bugün ne ettiğini merak ediyor musunuz?</h2>
          <p className="text-govde-kucuk mt-3">
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
              sinifAdi="!border-[color:var(--color-vurgu-uzeri)]/45 hover:!bg-[color:var(--color-vurgu-uzeri)]/10"
            >
              WhatsApp
            </Buton>
          ) : null}
        </div>
      </div>
    </Bolum>
  )
}

/**
 * Aslıhan bölümü (şartname §5.9).
 *
 * ⚠️ PORTRE VARSA FOTOĞRAF, YOKSA TİPOGRAFİK BLOK — BOŞ ÇERÇEVE ASLA.
 *
 * Burada bir süre "Fotoğraf hazırlanıyor" yazan gri bir kutu durdu ve iki
 * ayrı şeyi birden yanlış yaptı:
 *
 *   1. Panelde portre YÜKLÜYKEN bile boş kutuyu gösteriyordu — bölüm
 *      `Hakkımızda` globalindeki `portre` alanını hiç okumuyordu.
 *   2. Portre gerçekten yokken bile şartnameye aykırıydı: "portre yoksa
 *      tipografik blok, boş çerçeve gösterme".
 *
 * Boş çerçeve, "burada bir şey olmalıydı" der ve sayfayı eksik gösterir.
 * Tipografik blok ise tasarlanmış görünür: aynı yeri doldurur, aynı
 * en-boy oranını korur (CLS 0) ve eksikliği kusur gibi sunmaz.
 *
 * ⚠️ Stok fotoğraf hâlâ yasak (CLAUDE.md kural 2 ile aynı ruh): olmayan
 * bir yüzü olmuş gibi göstermek, "kurumsal güven" anlatısının tersi.
 *
 * ⚠️ Yetki belgesi numarası burada da görünür ve UYDURULMAZ; boşsa
 * eksikliği söyleyen uyarı basılır (altbilgideki kuralın aynısı).
 */
function AslihanBolumu({
  kurumsal,
  portre,
  portreAltMetni,
}: {
  kurumsal: Awaited<ReturnType<typeof kurumsalBilgileriGetir>>
  portre: HakkimizdaGorseli | null
  portreAltMetni: string | null
}) {
  const unvan = kurumsal?.ticaretUnvani ?? null

  return (
    <Bolum>
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
        {portre ? (
          <div className="border-kenar rounded-kart relative aspect-[4/3] overflow-hidden border-[0.5px]">
            <Image
              src={portre.url}
              alt={portreAltMetni ?? 'Aslıhan'}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        ) : (
          /*
            ⚠️ TİPOGRAFİK BLOK — boş durum değil, tasarlanmış ikinci basamak.

            Aynı `aspect-[4/3]` kutuyu dolduruyor: portre geldiğinde düzen
            zıplamıyor. İçerik uydurma değil — ad, unvan ve yaptığı iş;
            hepsi zaten sayfanın söylediği şeyler, burada yalnızca büyük
            puntoyla söyleniyor.
          */
          <div
            aria-hidden="true"
            className="bg-vurgu-zemin border-aksan-kenar rounded-kart flex aspect-[4/3] flex-col justify-center gap-4 border-[0.5px] px-8 sm:px-10"
          >
            <p className="text-vurgu text-eyebrow font-medium uppercase">
              Çorlu · Gayrimenkul danışmanlığı
            </p>
            <p className="text-metin font-baslik text-baslik-1-mobil leading-[1.05] font-medium sm:text-baslik-1">
              Aslıhan
            </p>
            <span className="border-aksan-kenar w-16 border-t-[0.5px]" />
            <p className="text-metin-2 text-govde-kucuk">
              {unvan ?? 'Taşınmaz Ticareti Yetki Belgesi sahibi işletme'}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <Eyebrow>Kim danışmanlık veriyor</Eyebrow>
          <h2 className="font-baslik text-baslik-2-mobil font-medium sm:text-baslik-2">
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
