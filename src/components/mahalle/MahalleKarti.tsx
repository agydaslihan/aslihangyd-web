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
}: {
  mahalle: Mahalleler
  baslikSeviyesi?: 2 | 3
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

  return (
    <article className="group border-kenar bg-yuzey rounded-kart hover:shadow-kart relative flex flex-col overflow-hidden border-[0.5px] transition-shadow">
      <div className="bg-vurgu-zemin relative aspect-16/10 overflow-hidden">
        {gorsel?.url ? (
          <Image
            src={gorsel.url}
            alt={gorsel.alt ?? `${mahalle.ad} Mahallesi`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
              className="fill-pudra-zemin stroke-vurgu"
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
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4 sm:p-5">
        <Baslik className="text-baslik-3 leading-tight">
          <Link href={`/mahalleler/${mahalle.slug}`} className="after:absolute after:inset-0">
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
