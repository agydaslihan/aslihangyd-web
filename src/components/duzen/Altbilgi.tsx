import Link from 'next/link'
import type { ReactNode } from 'react'

import { CerezTercihleriBaglantisi } from '@/components/cerez/CerezBanneri'
import { MarkaLogosu } from '@/components/marka/MarkaLogosu'
import { DisBaglantiIkon, PostaIkon, TelefonIkon, WhatsappIkon } from '@/components/ui/Ikon'
import { whatsappBaglantisi } from '@/lib/bicimlendirme'
import { markaAyarlari } from '@/lib/marka/sunucu'
import {
  iletisimEpostasi,
  iletisimTelefonu,
  kurumsalBilgileriGetir,
  whatsappNumarasi,
} from '@/lib/kurumsal'
import {
  ALTBILGI_FERAGATI,
  GORUNUR_GEZINME,
  HUKUKI_SAYFALAR,
  SITE_UNVANI,
  whatsappMesaji,
} from '@/lib/site'
import { altbilgiBaglantilariniGetir, type AltbilgiBaglantisi } from '@/lib/veri/altbilgi'
import { BOLUMLER } from '@/lib/siteBolumleri'
import { acikBolumTanimlari } from '@/lib/veri/siteBolumleri'

/**
 * Altbilgi — dört sütun, içeriği CMS'ten.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ İKİ ŞEY HER SAYFADA, KOŞULSUZ GÖRÜNÜR:
 *
 * 1. Taşınmaz Ticareti Yetki Belgesi numarası — mevzuat gereği.
 * 2. Yatırım tavsiyesi feragati — CLAUDE.md kural 5 ve reklam mevzuatı.
 *
 * Yetki belgesi numarası CMS'te boşsa numara UYDURULMAZ; bunun yerine
 * eksikliği söyleyen görünür bir uyarı basılır. Satırı gizlemek,
 * uyumsuzluğu Aslıhan'dan da saklamak olurdu — ve her sayfada duran bir
 * uyarı, eksiğin kapanmasının en hızlı yolu.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Kapalı site bölümleri buradan kendiliğinden düşer: bağlantı listesi
 * `acikBolumTanimlari()` üzerinden geliyor.
 */
export async function Altbilgi() {
  const [kurumsal, baglantilar, acikBolumler, marka] = await Promise.all([
    kurumsalBilgileriGetir(),
    altbilgiBaglantilariniGetir(),
    acikBolumTanimlari(),
    markaAyarlari(),
  ])

  /**
   * Altbilgi gezinmesi = sabit sayfalar + AÇIK bölümler.
   *
   * Kapalı bölümün adresi listeden düşürülüyor; açık olup sabit listede
   * bulunmayanlar (örn. "Danışman ol") ekleniyor. Böylece bir bölümü
   * kapatmak/açmak burada ayrıca hatırlanacak bir iş olmuyor.
   */
  const acikAdresler = new Set(acikBolumler.map((bolum) => bolum.adres))
  const kontrolluAdresler = new Set(BOLUMLER.flatMap((bolum) => [bolum.adres, ...bolum.rotalar]))

  const sayfalar = [
    ...GORUNUR_GEZINME.filter(
      (oge) => !kontrolluAdresler.has(oge.adres) || acikAdresler.has(oge.adres),
    ),
    ...acikBolumler
      .filter(
        (bolum) => bolum.gezinmede && !GORUNUR_GEZINME.some((oge) => oge.adres === bolum.adres),
      )
      .map((bolum) => ({ ad: bolum.ad, adres: bolum.adres })),
  ]

  /**
   * ⚠️ SAYFALAR İKİ SÜTUNA AYRILIYOR (şartname §9).
   *
   * Önce hepsi "Kurumsal" sütununa dökülüyordu: on iki bağlantı tek bir
   * listede alt alta ve okunmuyordu. Şartname dört sütun istiyor ve
   * gerekçesi doğru — ziyaretçi "portföye nasıl bakarım" ile "bu firma
   * kim" sorularını ayrı ayrı soruyor.
   *
   * Ayrım ADRESE göre yapılıyor, elle listelenmiyor: yeni bir bölüm
   * açıldığında (örn. Ticari) kendi grubuna düşsün, kimse hatırlamak
   * zorunda kalmasın.
   */
  const PORTFOY_ADRESLERI = new Set([
    '/portfoy',
    '/gizli-portfoy',
    '/ticari',
    '/harita',
    '/mahalleler',
    '/mahalle-testi',
    '/bolge-radari',
    '/endeks',
  ])

  const portfoySayfalari = sayfalar.filter((sayfa) => PORTFOY_ADRESLERI.has(sayfa.adres))
  const kurumsalSayfalari = sayfalar.filter((sayfa) => !PORTFOY_ADRESLERI.has(sayfa.adres))

  const yil = new Date().getFullYear()
  const telefon = iletisimTelefonu(kurumsal)
  const eposta = iletisimEpostasi(kurumsal)
  const whatsapp = whatsappBaglantisi(whatsappNumarasi(kurumsal), whatsappMesaji())

  return (
    <footer className="bg-kakao-900 mt-auto">
      {/* ⚠️ Gold ince çizgi — DEKORATİF. Altbilgiyi sayfadan ayırıyor,
          bilgi taşımıyor. Kontrastı (koyu kakao üzerinde 5,92:1) zaten
          eşiğin üstünde ama rolü yine de dekoratif. */}
      <div aria-hidden="true" className="bg-gold-cizgi h-px w-full" />

      <div className="kapsayici py-14 lg:py-20">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {/* ── Kurumsal ── */}
          <Sutun baslik="Kurumsal">
            <div className="mb-3 flex flex-col gap-2">
              {/* ⚠️ Aksan GOLD DEĞİL. Gold üzerinde okunur görünse bile
                  "gold asla metin rengi değildir" kuralı mutlak: istisna
                  açıldığı anda bir sonraki kullanım açık zeminde olur ve
                  2,06:1'e düşer. Disiplin testi yakaladı.

                  ⚠️ Altbilgi bandı iki temada da koyu: `daimaKoyuZemin` ile
                  koyu logo yeğleniyor, yoksa ana logo, o da yoksa metin.
                  Logo yüklenmemiş bir sitede altbilgi kimliksiz kalmıyor. */}
              <MarkaLogosu
                marka={marka}
                daimaKoyuZemin
                yukseklik={34}
                sinif="w-auto"
                metinSinifi="font-serif text-baslik-3 text-notr-50"
                vurguSinifi="text-notr-300"
              />
              <p className="text-notr-300 text-govde-kucuk">
                Çorlu ve çevresinde gayrimenkul danışmanlığı. Kararlarınızı hisle değil, rakamla
                verin.
              </p>
            </div>

            <BaglantiListesi baglantilar={baglantilar.kurumsal} />

            {/* Site sayfaları — kapalı bölümler kendiliğinden düşer. */}
            <ul className="text-notr-300 text-govde-kucuk flex flex-col">
              {kurumsalSayfalari.map((sayfa) => (
                <li key={sayfa.adres}>
                  <Link
                    href={sayfa.adres}
                    className="hover:text-notr-50 inline-flex min-h-9 items-center underline-offset-2 transition-colors hover:underline"
                  >
                    {sayfa.ad}
                  </Link>
                </li>
              ))}
            </ul>
          </Sutun>

          {/* ── Portföy ── */}
          <Sutun baslik="Portföy">
            <ul className="text-notr-300 text-govde-kucuk flex flex-col">
              {portfoySayfalari.map((sayfa) => (
                <li key={sayfa.adres}>
                  <Link
                    href={sayfa.adres}
                    className="hover:text-notr-50 inline-flex min-h-9 items-center underline-offset-2 transition-colors hover:underline"
                  >
                    {sayfa.ad}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/araclar"
                  className="hover:text-notr-50 inline-flex min-h-9 items-center underline-offset-2 transition-colors hover:underline"
                >
                  Yatırımcı araçları
                </Link>
              </li>
            </ul>
          </Sutun>

          {/* ── Faydalı bağlantılar ── */}
          <Sutun baslik="Faydalı bağlantılar">
            <BaglantiListesi baglantilar={baglantilar.faydali} />
          </Sutun>

          {/* ── Hukuksal metinler ── */}
          <Sutun baslik="Hukuksal metinler">
            <ul className="text-notr-300 text-govde-kucuk flex flex-col">
              {HUKUKI_SAYFALAR.map((sayfa) => (
                <li key={sayfa.adres}>
                  <Link
                    href={sayfa.adres}
                    className="hover:text-notr-50 inline-flex min-h-9 items-center underline-offset-2 transition-colors hover:underline"
                  >
                    {sayfa.ad}
                  </Link>
                </li>
              ))}
              <li className="flex min-h-9 items-center">
                <CerezTercihleriBaglantisi />
              </li>
            </ul>
            <BaglantiListesi baglantilar={baglantilar.hukuksal} />
          </Sutun>

          {/* ── İletişim ── */}
          <Sutun baslik="İletişim">
            <ul className="text-notr-300 text-govde-kucuk flex flex-col">
              {telefon ? (
                <li>
                  <a
                    href={`tel:${telefon.replace(/\s/g, '')}`}
                    className="hover:text-notr-50 inline-flex min-h-9 items-center gap-2 transition-colors"
                  >
                    <TelefonIkon width={15} height={15} className="shrink-0" />
                    {telefon}
                  </a>
                </li>
              ) : null}
              {eposta ? (
                <li>
                  <a
                    href={`mailto:${eposta}`}
                    className="hover:text-notr-50 inline-flex min-h-9 items-center gap-2 transition-colors"
                  >
                    <PostaIkon width={15} height={15} className="shrink-0" />
                    {eposta}
                  </a>
                </li>
              ) : null}
              {whatsapp ? (
                <li>
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-notr-50 inline-flex min-h-9 items-center gap-2 transition-colors"
                  >
                    <WhatsappIkon width={15} height={15} className="shrink-0" />
                    WhatsApp
                  </a>
                </li>
              ) : null}
            </ul>

            <BaglantiListesi baglantilar={baglantilar.iletisim} />

            {kurumsal?.adres ? (
              <address className="text-notr-400 text-mikro not-italic">{kurumsal.adres}</address>
            ) : null}
          </Sutun>
        </div>

        {/* ── Yasal künye — koşulsuz ── */}
        <div className="border-kakao-700 mt-12 flex flex-col gap-3 border-t-[0.5px] pt-6">
          <ul className="text-notr-400 text-mikro flex flex-wrap gap-x-4 gap-y-1">
            <li>
              Taşınmaz Ticareti Yetki Belgesi No:{' '}
              {kurumsal?.yetkiBelgesiNo ? (
                <span className="rakam text-notr-50">{kurumsal.yetkiBelgesiNo}</span>
              ) : (
                /*
                  ⚠️ Numara uydurulmaz. Eksikliği görünür kılmak, gizlemekten iyi.

                  ⚠️ Renk `uyari-metin` DEĞİL: o jeton açık zemin için ve
                  bu bant iki temada da koyu — orada 2,01:1 veriyordu.
                  Gerekçe globals.css'te `--color-uyari-koyu-bant`.
                */
                <span className="text-uyari-koyu-bant">
                  girilmedi — yönetim panelinden eklenmeli
                </span>
              )}
            </li>
            {kurumsal?.mersisNo ? (
              <li>
                MERSİS: <span className="rakam text-notr-50">{kurumsal.mersisNo}</span>
              </li>
            ) : null}
          </ul>

          <p className="text-notr-400 text-mikro max-w-4xl">{ALTBILGI_FERAGATI}</p>

          <p className="text-notr-400 text-mikro">
            © {yil} {kurumsal?.ticaretUnvani || SITE_UNVANI}
          </p>
        </div>
      </div>
    </footer>
  )
}

function Sutun({ baslik, children }: { baslik: string; children: ReactNode }) {
  return (
    <nav aria-label={baslik} className="flex flex-col gap-3">
      <h2 className="text-notr-50 text-eyebrow font-medium uppercase">{baslik}</h2>
      {children}
    </nav>
  )
}

/**
 * CMS'ten gelen bağlantılar.
 *
 * ⚠️ Dış bağlantılarda `target="_blank"` ve `rel="noopener noreferrer"`
 * otomatik eklenir; yanına dış bağlantı ikonu konur. İkon dekoratif değil:
 * yeni sekmede açılacağını önceden söylemek erişilebilirlik gereği.
 */
function BaglantiListesi({ baglantilar }: { baglantilar: readonly AltbilgiBaglantisi[] }) {
  if (baglantilar.length === 0) return null

  return (
    <ul className="text-notr-300 text-govde-kucuk flex flex-col">
      {baglantilar.map((baglanti) => (
        <li key={baglanti.id}>
          {baglanti.dahiliMi ? (
            <Link
              href={baglanti.url}
              className="hover:text-notr-50 inline-flex min-h-9 items-center underline-offset-2 transition-colors hover:underline"
            >
              {baglanti.baslik}
            </Link>
          ) : (
            <a
              href={baglanti.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-notr-50 inline-flex min-h-9 items-center gap-1.5 underline-offset-2 transition-colors hover:underline"
            >
              {baglanti.baslik}
              <DisBaglantiIkon width={12} height={12} className="shrink-0" />
              <span className="yalnizca-okuyucu">(yeni sekmede açılır)</span>
            </a>
          )}
        </li>
      ))}
    </ul>
  )
}
