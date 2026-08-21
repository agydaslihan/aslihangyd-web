import Image from 'next/image'
import Link from 'next/link'

import { KonumIkon } from '@/components/ui/Ikon'
import { siluetUret, SILUET_KUTUSU } from '@/lib/mahalle/siluet'
import { Rozet } from '@/components/ui/Rozet'
import { carpanYaz, paraYaz } from '@/lib/bicimlendirme'
import type { Mahalleler } from '@/payload-types'
import { bulanikOzellikleri } from '@/lib/medya/bulanik'

/**
 * Mahalle kartı.
 *
 * Rakam varsa gösterilir, yoksa kart yine de dolu ve davetkâr görünür —
 * çünkü mahalle sayfasının asıl değeri metin analizinde. "Veri bekleniyor"
 * yazısı karta konmuyor; kartın işi tıklatmak, dürüstlük beyanı ise
 * mahalle sayfasında rakamların yanında yapılıyor.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ `baslikSeviyesi` GÖRÜNÜM DEĞİL, BELGE YAPISI AYARI.
 *
 * Başlık seviyesi karta gömülü kalamaz çünkü doğru seviye karta değil
 * kartın BULUNDUĞU SAYFAYA bağlı:
 *   · Anasayfa   → h1 · h2 (bölüm başlığı) · h3 (kart)  ✓
 *   · /mahalleler → h1 · h3 (kart)                       ✗ seviye atlıyor
 *
 * İkincisi WCAG 2.4.6 ihlali: ekran okuyucu kullanıcısı başlık listesinde
 * gezerken atlanan seviyeyi "bir şeyi kaçırdım mı?" diye okur. Lighthouse
 * bunu `/mahalleler` sayfasında yakaladı (Accessibility 98).
 *
 * Görsel boyut `text-baslik-3` ile sabit kalıyor — seviye değişince kart
 * büyümesin. Anlam ile görünüm burada bilerek ayrı.
 * ─────────────────────────────────────────────────────────────────────────
 */
export function MahalleKarti({
  mahalle,
  baslikSeviyesi = 3,
  oncelikli = false,
}: {
  mahalle: Mahalleler
  baslikSeviyesi?: 2 | 3
  /**
   * İlk boyamada görünen kartlar için `true`.
   *
   * ─────────────────────────────────────────────────────────────────────
   * ⚠️ NEDEN VAR: `/mahalleler` SAYFASININ LCP ÖĞESİ TEMBEL BİR GÖRSELDİ.
   *
   * CI Lighthouse ölçümünde LCP öğesi ilk kartın kapak görseli çıktı —
   * `loading="lazy"` ile. Yani sayfanın en büyük öğesi, tarayıcıya
   * "acelesi yok" diye işaretlenmişti. Mobilde kart görüş alanının içinde
   * (üst kenar 533 px, yükseklik 231 px).
   *
   * Tembel yükleme doğru varsayılan: 26 mahalle kartının 23'ü ekranın
   * altında. Ama ilk birkaçı değil.
   * ─────────────────────────────────────────────────────────────────────
   */
  oncelikli?: boolean
}) {
  const Baslik = baslikSeviyesi === 2 ? 'h2' : 'h3'
  const gorsel = typeof mahalle.kapakGorseli === 'object' ? mahalle.kapakGorseli : null
  const m2 = paraYaz(mahalle.ortalamaM2Satis)
  const carpan = carpanYaz(mahalle.kiraCarpani)
  const kirsal = mahalle.yerlesimTuru === 'kirsal'

  /**
   * ⚠️ Silüet SUNUCUDA üretiliyor (bu bir sunucu bileşeni).
   *
   * Poligonlar yüzlerce noktalı; istemciye ham koordinat göndermek her
   * kart için kilobaytlar demekti. Burada sadeleştirilip tek bir `path`
   * dizesine dönüyor — kart başına birkaç yüz bayt.
   */
  const siluet = gorsel?.url ? null : siluetUret(mahalle.sinir)

  /**
   * Yatırım skoru — kartın üstünde yüzen rozet.
   *
   * ─────────────────────────────────────────────────────────────────────
   * ⚠️ SKOR YOKSA ROZET HİÇ ÇİZİLMİYOR.
   *
   * `toplam`, yeterli bileşen verisi yoksa kancada bilinçli olarak boş
   * bırakılıyor (`Mahalleler.ts`). "—" ya da "0" yazan bir rozet, skorun
   * var olduğunu ama okunamadığını ima ederdi; ikisi de yanlış. Skoru olan
   * mahallenin rozeti var, olmayanın yok — fark görünür kalıyor.
   *
   * ⚠️ Bu sitenin ayırt edici rakamı bu. Kartta göstermek, ziyaretçinin
   * mahalleleri açmadan karşılaştırabilmesi demek.
   * ─────────────────────────────────────────────────────────────────────
   */
  const skor =
    typeof mahalle.yatirimSkoru?.toplam === 'number' && Number.isFinite(mahalle.yatirimSkoru.toplam)
      ? Math.round(mahalle.yatirimSkoru.toplam)
      : null

  return (
    <article
      data-yukselen
      /**
       * ⚠️ Altın kenarlık hover'da beliriyor — ilan kartıyla aynı kural ve
       * aynı gerekçe: duran hâlde sınır nötr, altın yalnızca sıcaklık
       * ekliyor ve hiçbir bilgi taşımıyor (açık zeminde 2,28:1).
       */
      className="group border-kenar bg-yuzey rounded-kart hover:shadow-kalkik hover:border-gold-cizgi relative flex h-full flex-col overflow-hidden border-[0.5px] transition-[box-shadow,transform,border-color] duration-[200ms] ease-[var(--cikis)]"
    >
      <div className="zoom-kabi bg-vurgu-zemin relative aspect-16/10 overflow-hidden">
        {gorsel?.url ? (
          <Image
            src={gorsel.url}
            alt={gorsel.alt ?? `${mahalle.ad} Mahallesi`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={oncelikli}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            {...bulanikOzellikleri(gorsel)}
          />
        ) : siluet ? (
          /*
            ⚠️ SİLÜET, MAHALLENİN GERÇEK SINIRI — genel bir ikon değil.

            26 kartın 26'sında aynı konum ikonu duruyordu. Oysa her
            mahallenin gerçek bir şekli var ve o şekil onu ayırt edilebilir
            kılıyor — dış görsel gerektirmeden, elimizdeki veriden.

            ⚠️ `aria-hidden`: silüet dekoratif. Mahallenin adı hemen altında
            yazılı ve şekil tek başına hiçbir bilgi taşımıyor. Ekran okuyucu
            kullanıcısına "poligon" duyurmanın karşılığı yok.
          */
          <svg
            viewBox={`0 0 ${SILUET_KUTUSU} ${SILUET_KUTUSU}`}
            className="h-full w-full p-5"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d={siluet.yol}
              className="fill-bant-zemin stroke-vurgu"
              strokeWidth={1.5}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        ) : (
          /* ⚠️ Sınırı olmayan mahallede eski ikon YEDEK olarak kalıyor —
             OSM kapsaması eksiksiz değil, kart boş kalamaz. */
          <div className="text-vurgu/40 flex h-full items-center justify-center">
            <KonumIkon width={32} height={32} />
          </div>
        )}

        {/* ⚠️ Rozet `after:absolute inset-0` ile kartı kaplayan bağlantının
            ÜSTÜNDE duruyor ama tıklanabilir değil (`pointer-events-none`):
            ikinci bir tıklama hedefi, kartın tamamı zaten tek bir bağlantı
            olduğu için kafa karıştırırdı. */}
        {skor !== null ? (
          <div className="pointer-events-none absolute top-3 right-3 z-10">
            {/* ⚠️ `cam` sınıfı: rozet fotoğrafın üstünde duruyor ve mobilde
                otomatik olarak düz renge düşüyor. Elle yazılmış
                `backdrop-blur-[2px]` mobil kapısını atlıyordu. */}
            <div className="cam shadow-kart flex items-baseline gap-1 rounded-rozet px-3 py-1.5">
              {/* ⚠️ Etiketsiz bir "72 /100" ekran okuyucuda anlamsız.
                  Görsel olarak yer kaplamadan bağlamı veriyor. */}
              <span className="sr-only">Yatırım skoru: </span>
              <span className="text-metin font-baslik text-govde font-medium">{skor}</span>
              <span className="text-metin-3 text-mikro">/100</span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4 sm:p-5">
        <Baslik className="text-baslik-3 leading-tight">
          {/* ⚠️ Örtüde `content` ve `z-index` AÇIK — gerekçe IlanKarti'nda
              yazılı: ikisi de eksikken kart görünürde çalışıyor ama tıklama
              gitmiyor. Aynı desen kullanan her kart aynı düzeltmeyi aldı. */}
          <Link
            href={`/mahalleler/${mahalle.slug}`}
            className="after:absolute after:inset-0 after:z-10 after:rounded-kart after:content-['']"
          >
            {mahalle.ad} Mahallesi
          </Link>
        </Baslik>

        {mahalle.ozet ? (
          <p className="text-metin-2 line-clamp-2 text-govde-kucuk leading-relaxed">
            {mahalle.ozet}
          </p>
        ) : null}

        {m2 || carpan || kirsal ? (
          <div className="mt-auto flex flex-wrap gap-2 pt-2">
            {/*
              ⚠️ Yalnızca KIRSAL rozetleniyor, merkez değil.
              Her karta rozet koymak ayrımı görünmez kılar: yirmi yedi
              mahallenin hepsinde bir rozet varsa rozet bilgi taşımaz.
            */}
            {kirsal ? <Rozet>Kırsal mahalle (eski köy)</Rozet> : null}
            {m2 ? <Rozet>Ort. m²: {m2}</Rozet> : null}
            {carpan ? <Rozet ton="vurgu">Kira çarpanı {carpan}</Rozet> : null}
          </div>
        ) : null}
      </div>
    </article>
  )
}
