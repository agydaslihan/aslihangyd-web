import type { ReactNode } from 'react'

import { Sahne } from '@/components/hareket/Sahne'
import { sinif } from '@/lib/sinif'

/**
 * Sayfa bölümü — tutarlı dikey ritim ve kapsayıcı genişliği.
 *
 * ⚠️ RİTİM AURORA'DA BİR KEZ DAHA BÜYÜDÜ.
 *
 * 72px başlıkların yanında 112px'lik bölüm boşluğu sıkışık duruyor: ölçek
 * büyüyünce aralarındaki nefes de büyümek zorunda, yoksa sayfa "yakınlaşmış"
 * görünür. Mobilde ritim bilinçli olarak daha dar — 160px'lik boşluk
 * telefonda ekranın yarısını yer.
 */
export function Bolum({
  children,
  sinifAdi,
  zemin = 'kagit',
  id,
}: {
  children: ReactNode
  sinifAdi?: string
  /**
   * ⚠️ ZEMİN ADLARI AURORA'DA DEĞİŞTİ: `kakao` → `koyu`, `pudra` → `bej`,
   * `terracotta` → `altin`. Eski adlar artık var olmayan renkleri işaret
   * ediyordu; bir bant adının rengi söylemesi, yanlış rengi söylemesinden
   * iyidir.
   */
  zemin?: 'kagit' | 'yuzey' | 'koyu' | 'bej' | 'altin'
  id?: string
}) {
  const zeminler = {
    kagit: '',
    yuzey: 'bg-yuzey-2/60 border-y-[0.5px] border-kenar',
    /** Mürekkep bant — üzerine `koyu-bant-metin` (16,46:1). */
    koyu: 'bg-koyu-bant text-koyu-bant-metin',
    /**
     * ⚠️ SICAK BEJ BANT — Aurora'nın yumuşak nefesi.
     *
     * Metin rengi DEĞİŞMİYOR: bej üzerinde `--color-metin` 15,02:1
     * veriyor, yani koyu bant gibi beyaza dönmek gerekmiyor.
     */
    bej: 'bg-bant-zemin border-y-[0.5px] border-kenar',
    /**
     * ⚠️ DOLU ALTIN BANT — ÜZERİNE BEYAZ DEĞİL MÜREKKEP.
     *
     * Ölçüm: beyaz altın üzerinde 2,36:1 — ağır ihlal. Mürekkep 7,20:1.
     * Önceki palette bu bant terracotta'ydı ve üzerine beyaz yazılıyordu;
     * renk değişince metin de değişmek zorunda. Aynı sınıfı taşımaya devam
     * etseydi bant sessizce okunmaz hâle gelirdi.
     */
    altin: 'bg-dolu-vurgu text-vurgu-uzeri',
  } as const

  return (
    <section id={id} className={sinif('py-16 sm:py-24 lg:py-32', zeminler[zemin], sinifAdi)}>
      <div className="kapsayici">{children}</div>
    </section>
  )
}

/**
 * Bölüm başlığı.
 *
 * `ustBaslik` **eyebrow**: 12px, geniş harf aralığı (0,14em), büyük harf,
 * altın. Bölümün ne olduğunu başlığı okumadan söyler ve uzun sayfalarda
 * konum hissi verir.
 *
 * ⚠️ Eyebrow rengi `aksan-metin` (gold-700), `aksan` (gold-400) DEĞİL.
 * gold-400 açık zeminde 2,28:1 — bu bir metin ve orada okunmuyor.
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
            'font-baslik font-medium',
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
 * Altın ince ayraç.
 *
 * ⚠️ DEKORATİF — tek başına hiçbir bilgi taşımaz.
 *
 * Açık zeminde altın 2,28:1 verir ve WCAG 1.4.11'in 3:1 eşiğini geçmez.
 * Kabul edilebilir olmasının tek sebebi bu: çizgi bir şey söylemiyor,
 * yalnızca ayırıyor. Anlam taşıyan bir öğe gerekirse `--color-gold-guclu`
 * kullanılır (4,21:1) — gerekçe globals.css ve kontrast testinde yazılı.
 */
export function GoldAyrac({ sinifAdi }: { sinifAdi?: string }) {
  return <hr aria-hidden="true" className={sinif('border-gold-cizgi border-t', sinifAdi)} />
}

/**
 * Panelden gelen görünüm ayarlarını uygulayan sarmalayıcı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN SARMALAYICI, NEDEN `Bolum`A PROP DEĞİL.
 *
 * Ana sayfadaki on dört bölümün yalnızca dördü `Bolum` kullanıyor; kalanı
 * (Çorlu deneyimi, çağrı bandı, güven şeridi, slayt bandı…) kendi
 * `<section>`ını ve kendi zeminini taşıyor. Ayarları `Bolum`a prop olarak
 * eklemek, on bölümde hiçbir şey yapmayan bir panel üretirdi — panelde
 * görünen ama işlemeyen ayar, olmayan ayardan kötüdür.
 *
 * Sarmalayıcı hepsini eşit davranıyor: zemini DIŞARIDAN veriyor, dikey
 * boşluğu EKLİYOR (değiştirmiyor) ve hizalamayı bir öznitelikle bildiriyor.
 *
 * ⚠️ BOŞLUK EKLENİYOR, EZİLMİYOR. Bölümün kendi `py`sini sıfırlamak,
 * bileşenin iç ritmini bilmeyi gerektirirdi. "Dar" sıfır ek, "geniş" bir
 * kademe ek boşluk demek; sonuç öngörülebilir ve hiçbir bölümde iki kat
 * dolgu oluşmuyor.
 *
 * ⚠️ HİZALAMA YALNIZCA BAŞLIK BLOĞUNU ETKİLİYOR ve panelde de öyle
 * yazıyor. Kart ızgarasını ya da haritayı ortalamak düzeni bozardı; yarım
 * çalışan bir ayar vermektense sınırını söylüyoruz. Kural `globals.css`
 * içindeki `[data-bolum-hizalama='orta']` seçicisinde.
 */
export function BolumSarmali({
  zemin,
  bosluk,
  hizalama,
  children,
}: {
  zemin: 'varsayilan' | 'kagit' | 'bej' | 'koyu'
  bosluk: 'dar' | 'normal' | 'genis'
  hizalama: 'sol' | 'orta'
  children: ReactNode
}) {
  const zeminler = {
    varsayilan: '',
    kagit: 'bg-zemin',
    bej: 'bg-bant-zemin',
    koyu: 'bg-koyu-bant text-koyu-bant-metin',
  } as const

  const bosluklar = {
    dar: '',
    normal: 'py-0',
    genis: 'py-10 sm:py-16',
  } as const

  const varsayilanMi = zemin === 'varsayilan' && bosluk === 'normal' && hizalama === 'sol'

  /**
   * ⚠️ Hiçbir ayar değişmemişse fazladan bir `<div>` BASILMIYOR.
   *
   * On dört bölümün on dördünü sarmak, DOM'a on dört boş katman eklemek
   * demekti; `:has()` ve kardeş seçicileri olan bir tasarımda o katmanlar
   * sessizce kural bozar.
   */
  if (varsayilanMi) return <>{children}</>

  return (
    <div data-bolum-hizalama={hizalama} className={sinif(zeminler[zemin], bosluklar[bosluk])}>
      {children}
    </div>
  )
}
