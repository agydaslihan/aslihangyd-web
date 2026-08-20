import type { ReactNode } from 'react'

import { Sahne } from '@/components/hareket/Sahne'
import { sinif } from '@/lib/sinif'

/**
 * Sayfa bölümü — tutarlı dikey ritim ve kapsayıcı genişliği.
 *
 * ⚠️ RİTİM YENİDEN TASARIMDA BÜYÜDÜ (FRONTEND-YENIDEN-TASARIM §2).
 *
 * Eski değerler 48/64/80px'di. Şartname masaüstünde 96–128px istiyor ve
 * gerekçesi görsel değil: "büyük şirket" hissinin en ucuz taşıyıcısı cömert
 * boşluktur. Sıkışık bölümler siteyi tek kişilik bir ofis gibi gösteriyordu.
 *
 * Mobilde ritim bilinçli olarak DAHA DAR: 112px'lik boşluk telefonda
 * ekranın üçte birini yiyor ve kaydırma mesafesini gereksiz uzatıyor.
 */
export function Bolum({
  children,
  sinifAdi,
  zemin = 'kagit',
  id,
}: {
  children: ReactNode
  sinifAdi?: string
  zemin?: 'kagit' | 'yuzey' | 'kakao' | 'pudra' | 'terracotta'
  id?: string
}) {
  const zeminler = {
    kagit: '',
    yuzey: 'bg-yuzey-2/60 border-y-[0.5px] border-kenar',
    kakao: 'bg-kakao-yuzey text-koyu-bant-metin',
    /**
     * ⚠️ PUDRA GÜLÜ ZEMİN — yeni paletin yumuşak bandı.
     *
     * Metin rengi DEĞİŞMİYOR: pudra üzerinde `--color-metin` 8,95:1
     * veriyor, yani koyu bant gibi beyaza dönmek gerekmiyor. Pudra bir
     * "koyu bölüm" değil, aynı sayfanın daha sıcak bir yerdeki nefesi.
     */
    pudra: 'bg-pudra-zemin border-y-[0.5px] border-kenar',
    /**
     * ⚠️ DOLU TERRACOTTA BANT — üzerine DAİMA TAM BEYAZ.
     *
     * Ölçüm: beyaz terracotta-600 üzerinde 4,99:1 ile AA'yı geçiyor, ama
     * pay çok dar. `text-white/80` (koyu kakao bantlarda kullandığımız
     * yumuşatma) burada 3,82'ye düşüyor ve AA'nın altında kalıyor;
     * `/90` bile 4,39. Yani bu bantta ikincil metin OPAKLIKLA
     * yumuşatılamaz — hiyerarşi punto ve boşlukla kurulur.
     *
     * ⚠️ Adaçayı eyebrow da BURADA KULLANILAMAZ: adacayi-100 terracotta
     * üzerinde 3,86. Bu bantta eyebrow gerekiyorsa kırık beyaz (4,78).
     */
    terracotta: 'bg-terracotta-yuzey text-white',
  } as const

  return (
    <section id={id} className={sinif('py-14 sm:py-20 lg:py-28', zeminler[zemin], sinifAdi)}>
      <div className="kapsayici">{children}</div>
    </section>
  )
}

/**
 * Bölüm başlığı.
 *
 * `ustBaslik` şartnamedeki **eyebrow**: 12px, geniş harf aralığı, büyük
 * harf, adaçayı. Bölümün ne olduğunu başlığı okumadan söyler ve uzun
 * sayfalarda konum hissi verir.
 *
 * ⚠️ Eyebrow rengi `aksan-metin`, `aksan` DEĞİL. Dolu zemin değeri
 * (adaçayı-600) krem üzerinde 4,01:1 ile AA'nın altında kalıyor ve bu bir
 * metin. Ayrımın gerekçesi globals.css içinde yazılı.
 */
export function BolumBasligi({
  ustBaslik,
  baslik,
  aciklama,
  yan,
  seviye = 2,
}: {
  ustBaslik?: string
  baslik: string
  aciklama?: ReactNode
  /** Sağda duran bağlantı/buton — mobilde başlığın altına iner. */
  yan?: ReactNode
  seviye?: 2 | 3
}) {
  const Baslik = seviye === 2 ? 'h2' : 'h3'

  /**
   * ⚠️ SAHNE GEÇİŞİ BURADA, HER SAYFAYA TEK TEK DEĞİL.
   *
   * Kaydırdıkça oturan giriş, sitenin her bölüm başlığında aynı olsun
   * isteniyor. Sayfa sayfa `<Sahne>` sarmak bunu 40'tan fazla yerde tekrar
   * etmek ve ilk unutulan yerde ritmi bozmak demekti.
   *
   * ⚠️ Geçiş yalnızca BAŞLIK bloğunda; bölüm gövdesi sarılmıyor. Uzun bir
   * tablo ya da kart ızgarası tek parça olarak belirseydi hareket "sayfa
   * geç yüklendi" gibi okunurdu. Başlık girer, içerik zaten yerindedir.
   */
  return (
    <Sahne className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex max-w-2xl flex-col gap-2.5">
        {ustBaslik ? <Eyebrow>{ustBaslik}</Eyebrow> : null}
        <Baslik
          className={sinif(
            'font-serif font-medium',
            seviye === 2 ? 'text-baslik-2-mobil sm:text-baslik-2' : 'text-baslik-3',
          )}
        >
          {baslik}
        </Baslik>
        {aciklama ? <p className="text-metin-2 text-govde olcu">{aciklama}</p> : null}
      </div>
      {yan ? <div className="shrink-0">{yan}</div> : null}
    </Sahne>
  )
}

/**
 * Eyebrow etiketi — bölüm başlığının üstündeki küçük bağlam etiketi.
 *
 * Ayrı dışa aktarılıyor çünkü her yerde `BolumBasligi` kullanılmıyor:
 * hero, güven şeridi ve kart başlıkları da aynı etikete ihtiyaç duyuyor ve
 * ölçüsü tek yerde tanımlı kalmalı.
 */
export function Eyebrow({ children, sinifAdi }: { children: ReactNode; sinifAdi?: string }) {
  return (
    <span className={sinif('text-aksan-metin text-eyebrow font-medium uppercase', sinifAdi)}>
      {children}
    </span>
  )
}

/**
 * Gold ince ayraç.
 *
 * ⚠️ DEKORATİF — tek başına hiçbir bilgi taşımaz.
 *
 * Açık zeminde gold 2,06:1 verir ve WCAG 1.4.11'in 3:1 eşiğini geçmez.
 * Kabul edilebilir olmasının tek sebebi bu: çizgi bir şey söylemiyor,
 * yalnızca ayırıyor. Anlam taşıyan bir öğe gerekirse `--color-gold-guclu`
 * kullanılır (5,17:1) — gerekçe globals.css ve kontrast testinde yazılı.
 *
 * Şartname gold'a üç yer ayırıyor: bölüm ayraçları, yatırım kartı
 * çerçevesi, kira çarpanı satırının üst çizgisi. Fazlası ucuzlatır.
 */
export function GoldAyrac({ sinifAdi }: { sinifAdi?: string }) {
  return <hr aria-hidden="true" className={sinif('border-gold-cizgi border-t', sinifAdi)} />
}
