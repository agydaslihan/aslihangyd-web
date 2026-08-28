import Image from 'next/image'

import type { MarkaAyarlari } from '@/lib/marka/sunucu'
import { SITE_ADI } from '@/lib/site'

/**
 * Logo — yüklendiyse görsel, yüklenmediyse metin.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ LOGO YOKKEN SİTE KIRILMAZ.
 *
 * Bugüne kadar başlıktaki marka bir `<Link>` içine elle yazılmış
 * "Aslıhan GYD" metniydi. Marka paneli o metni değiştirebilir hâle
 * getiriyor ama METİN YEDEĞİ KALIYOR: logo yüklenmemişse, dosya silinmişse
 * ya da veritabanı okunamıyorsa marka yine görünür.
 *
 * Bir logoya bağlı çalışan başlık, o logo bir gün silindiğinde sitenin
 * kimliksiz kalması demekti.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ İKİ TEMA İÇİN İKİ GÖRSEL, CSS İLE DEĞİŞİYOR.
 *
 * Tema `data-tema` özniteliğiyle ve istemcide seçiliyor; sunucu hangisinin
 * geçerli olduğunu bilmiyor. Bu yüzden ikisi de basılıp biri CSS ile
 * gizleniyor. Koyu logo yoksa hiç ikinci görsel basılmıyor — ana logo iki
 * temada da kullanılıyor.
 */
export function MarkaLogosu({
  marka,
  sinif,
  metinSinifi,
  vurguSinifi,
  yukseklik = 36,
  daimaKoyuZemin = false,
  metneZorla = false,
  stil,
}: {
  marka: MarkaAyarlari
  sinif?: string
  /** Metin yedeğinin sınıfı. */
  metinSinifi?: string
  /** Metin yedeğinde ikinci kelimenin sınıfı. */
  vurguSinifi?: string
  yukseklik?: number
  /**
   * Zemin temadan bağımsız olarak daima koyu mu (altbilgi bandı gibi).
   *
   * ⚠️ Bu durumda tema-duyarlı iki görsel basmanın anlamı yok: bant açık
   * temada da koyu. Koyu logo varsa o kullanılır, yoksa ana logo.
   */
  daimaKoyuZemin?: boolean
  /**
   * Görsel yüklü olsa bile METİN yedeğini kullan.
   *
   * ⚠️ "Logo yok" ile "logo istenmiyor" ayrı durumlar. Panelden altbilgi
   * logosu kapatıldığında görseli gizlemek yetmez: yerine markanın adı
   * gelmeli, yoksa sütun kimliksiz kalır. Bu bayrak o kararı çağırana
   * bırakıyor; bileşen hangi kuralın işlediğini bilmek zorunda değil.
   */
  metneZorla?: boolean
  /**
   * Satır içi stil — panelden gelen ölçüler için.
   *
   * ⚠️ Tailwind sınıfları DERLEME ANINDA sabitleniyor; çalışma zamanında
   * gelen bir sayı sınıfa çevrilemez (`h-[48px]` üretilemiyor). Ölçü
   * paneldeyse tek yol satır içi stil.
   *
   * ⚠️ CLS bozulmuyor: `<Image>`in `width`/`height` öznitelikleri en/boy
   * oranından hesaplanmaya devam ediyor, yani yer görsel inmeden ayrılıyor.
   */
  stil?: React.CSSProperties
}) {
  const ad = marka.siteAdi ?? SITE_ADI

  if (metneZorla) {
    return <AdMetni ad={ad} metinSinifi={metinSinifi} vurguSinifi={vurguSinifi} />
  }

  if (daimaKoyuZemin) {
    const secilen = marka.logoKoyu ?? marka.logo
    if (!secilen) return <AdMetni ad={ad} metinSinifi={metinSinifi} vurguSinifi={vurguSinifi} />

    const en = secilen.en ?? 160
    const boy = secilen.boy ?? yukseklik
    return (
      <Image
        src={secilen.url}
        alt={secilen.alt || ad}
        width={Math.round(yukseklik * (boy > 0 ? en / boy : 4))}
        height={yukseklik}
        className={sinif}
        style={stil}
        unoptimized={secilen.url.endsWith('.svg')}
      />
    )
  }

  if (!marka.logo) {
    /**
     * Metin yedeği: adın ilk kelimesi düz, kalanı vurgulu.
     * ⚠️ Tek kelimelik adlarda ikinci parça boş kalır ve hiçbir şey
     * bozulmaz — `Aslıhan GYD` biçimine bağlı bir ayrıştırma değil.
     */
    return <AdMetni ad={ad} metinSinifi={metinSinifi} vurguSinifi={vurguSinifi} />
  }

  const en = marka.logo.en ?? 160
  const boy = marka.logo.boy ?? yukseklik
  const oran = boy > 0 ? en / boy : 4

  return (
    <>
      <Image
        src={marka.logo.url}
        alt={marka.logo.alt || ad}
        width={Math.round(yukseklik * oran)}
        height={yukseklik}
        className={`${sinif ?? ''} ${marka.logoKoyu ? 'block dark-gizle' : 'block'}`.trim()}
        style={stil}
        // ⚠️ Logo her sayfada ve ilk ekranda: geciktirilmemeli.
        priority
        unoptimized={marka.logo.url.endsWith('.svg')}
      />

      {marka.logoKoyu ? (
        <Image
          src={marka.logoKoyu.url}
          alt={marka.logoKoyu.alt || ad}
          width={Math.round(
            yukseklik * ((marka.logoKoyu.en ?? 160) / (marka.logoKoyu.boy ?? yukseklik)),
          )}
          height={yukseklik}
          className={`${sinif ?? ''} acik-gizle`.trim()}
          style={stil}
          priority
          unoptimized={marka.logoKoyu.url.endsWith('.svg')}
        />
      ) : null}
    </>
  )
}

/**
 * Metin yedeği: adın ilk kelimesi düz, kalanı vurgulu.
 *
 * ⚠️ Tek kelimelik adlarda ikinci parça boş kalır ve hiçbir şey bozulmaz —
 * `Aslıhan GYD` biçimine bağlı bir ayrıştırma değil.
 */
function AdMetni({
  ad,
  metinSinifi,
  vurguSinifi,
}: {
  ad: string
  metinSinifi?: string
  vurguSinifi?: string
}) {
  const parcalar = ad.trim().split(/\s+/)
  const ilk = parcalar[0] ?? ad
  const kalan = parcalar.slice(1).join(' ')

  return (
    <span className={metinSinifi}>
      {ilk}
      {kalan ? <span className={vurguSinifi}> {kalan}</span> : null}
    </span>
  )
}
