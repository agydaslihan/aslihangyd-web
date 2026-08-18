import Image from 'next/image'
import Link from 'next/link'

import { Buton } from '@/components/ui/Buton'
import { HERO_ORANI, overlayOpakligi, type HeroSlayti } from '@/lib/hero/tipler'

/**
 * Tek hero slaydı — sunucu bileşeni, hiç JS taşımıyor.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ İLK SLAYT LCP ÖĞESİ. Üç şey birden gerekiyor ve üçü de burada:
 *
 *  · `priority` — Next.js `<link rel="preload">` basıyor, görsel keşif
 *    sırasını beklemiyor
 *  · `sizes="100vw"` — mobilde 750 piksellik varyant iniyor, masaüstü
 *    varyantı değil
 *  · SABİT ORAN — yer görsel inmeden ayrılıyor, CLS sıfır kalıyor
 *
 * Sonraki slaytlar `loading="lazy"`: ziyaretçi çoğu zaman ikinci slaydı
 * hiç görmüyor ve onu ilk boyamada indirmek LCP'yi doğrudan geciktirirdi.
 * ─────────────────────────────────────────────────────────────────────────
 */
export function HeroSlaydi({ slayt, oncelikli }: { slayt: HeroSlayti; oncelikli: boolean }) {
  const ortali = slayt.metinHizasi === 'orta'

  /**
   * ⚠️ Slaytta gösterilecek metin var mı.
   *
   * Başlık, alt başlık ve butonun üçü de isteğe bağlı. Üçü de boşsa slayt
   * yalnızca bir fotoğraf: ne metin katmanı ne karartma çiziliyor.
   */
  const metinVar =
    slayt.baslik !== null ||
    (slayt.altBaslik !== null && slayt.altBaslik !== '') ||
    (Boolean(slayt.butonMetni) && Boolean(slayt.butonLink))

  return (
    <div className="relative h-full w-full">
      <Image
        src={slayt.gorselUrl}
        alt={slayt.gorselAlt}
        fill
        // ⚠️ Hero her zaman tam genişlik; `sizes` bunu söylemezse tarayıcı
        // en büyük varyantı iner ve mobil bütçesi anlamını kaybeder.
        sizes="100vw"
        className="object-cover"
        priority={oncelikli}
        loading={oncelikli ? undefined : 'lazy'}
        // Oran sabit; yükseklik kapsayıcıdan geliyor.
        style={{ objectPosition: 'center' }}
      />

      {/*
        ⚠️ Karartma perdesi metnin okunabilirliğinin tek taşıyıcısı değil:
        metin ayrıca gölgeli ve koyu bant jetonunu kullanıyor. Perde sıfıra
        çekilse bile başlık tamamen kaybolmuyor.

        ⚠️ METİN YOKSA PERDE DE ÇİZİLMİYOR. Karartma metnin okunabilmesi
        için var; okunacak metin olmayan bir slaytta fotoğrafı karartmak
        yalnızca fotoğrafı bozar. Şartnamenin şartı da bu.
      */}
      {metinVar ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpakligi(slayt.overlayKoyulugu) }}
        />
      ) : null}

      {/*
        ⚠️ Metin katmanı da yalnızca metin varken çiziliyor.
        
        Boş bir `<h1>` basmak ekran okuyucuda "başlık, boş" diye okunur ve
        sayfanın başlık hiyerarşisine boş bir düğüm ekler. Fotoğrafın kendi
        alt metni o durumda tek ve yeterli bilgi taşıyıcısı — panelde
        zorunlu tutulmasının sebebi bu.
      */}
      {metinVar ? (
        <div className="absolute inset-0 flex items-center">
          <div className="kapsayici w-full">
            <div className={ortali ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
              {slayt.baslik !== null ? (
                <h1 className="text-koyu-bant-metin font-serif text-baslik-1-mobil font-medium drop-shadow-sm sm:text-baslik-1">
                  {slayt.baslik}
                </h1>
              ) : null}

              {slayt.altBaslik ? (
                <p className="text-koyu-bant-metin mt-5 max-w-2xl text-baslik-3 leading-relaxed opacity-90 drop-shadow-sm">
                  {slayt.altBaslik}
                </p>
              ) : null}

              {slayt.butonMetni && slayt.butonLink ? (
                <div className={`mt-7 ${ortali ? 'flex justify-center' : ''}`}>
                  <Buton href={slayt.butonLink} gorunum="acikBant">
                    {slayt.butonMetni}
                  </Buton>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** Slaydın kapsayıcısı — oran ve azami yükseklik burada. */
export function HeroCercevesi({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="bg-kakao-yuzey relative w-full overflow-hidden"
      style={{
        // ⚠️ `aspect-ratio` + `max-height`: oran CLS'i sıfırlıyor, azami
        // yükseklik ise geniş ekranlarda hero'nun bütün ekranı yutmasını
        // engelliyor. İkisi birlikte olmalı.
        aspectRatio: `${HERO_ORANI.en} / ${HERO_ORANI.boy}`,
        maxHeight: '78dvh',
      }}
    >
      {children}
    </div>
  )
}

/** Bağlantılı slayt sarmalayıcısı — tek slaytta buton yoksa tıklanabilir alan. */
export function HeroBaglantisi({
  adres,
  children,
}: {
  adres: string | null
  children: React.ReactNode
}) {
  if (adres === null) return <>{children}</>
  return (
    <Link href={adres} className="block h-full w-full">
      {children}
    </Link>
  )
}
