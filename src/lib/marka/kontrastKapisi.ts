import { hexCoz, kontrastOrani, oraniYuvarla } from '@/lib/tasarim/kontrast'

import { CIFTLER, YUVALAR, type Palet } from './yuvalar'

/**
 * Kontrast kapısı — renk kaydetmenin önündeki tek koşul.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU KAPI GEVŞETİLEMEZ.
 *
 * Erişilebilirlik pazarlık konusu değil. Kapı iki yerde birden duruyor ve
 * ikisi de gerekli:
 *  · Panelde — kaydet butonu pasif, sebebi çift çift yazılı
 *  · Sunucuda — `beforeValidate` kancası, aynı motorla
 *
 * Yalnızca panelde olsaydı Local API, seed betiği ya da elle SQL ile
 * geçersiz palet yazılabilirdi ve site kimseye haber vermeden AA'nın
 * altına düşerdi. Yalnızca sunucuda olsaydı Aslıhan neyi yanlış yaptığını
 * ancak kaydete bastıktan sonra öğrenirdi.
 * ─────────────────────────────────────────────────────────────────────────
 */

export interface CiftSonucu {
  etiket: string
  on: string
  arka: string
  oran: number
  esik: number
  gecti: boolean
  /** AAA seviyesini de geçiyor mu — panelde rozet olarak gösterilir. */
  aaa: boolean
  gerekce: string
}

export interface KapiSonucu {
  ciftler: CiftSonucu[]
  gecti: boolean
  /** Yalnızca kalan sorunlar — hata mesajı bunlardan üretilir. */
  kalanlar: CiftSonucu[]
}

/** WCAG AAA eşiği (normal metin). */
export const AAA_METIN = 7

/**
 * Bir paletin tüm çiftlerini ölçer.
 *
 * ⚠️ Eksik ya da bozuk renk "geçti" sayılmaz. Boş bir yuva sessizce
 * atlanırsa palet yarım kaydedilir ve site tanımsız değişkenle çalışır.
 */
export function paletiDegerlendir(palet: Palet): KapiSonucu {
  const ciftler: CiftSonucu[] = CIFTLER.map((cift) => {
    const onRenk = palet[cift.on]
    const arkaRenk = palet[cift.arka]

    if (!gecerliHex(onRenk) || !gecerliHex(arkaRenk)) {
      return {
        etiket: cift.etiket,
        on: cift.on,
        arka: cift.arka,
        oran: 0,
        esik: cift.esik,
        gecti: false,
        aaa: false,
        gerekce: 'Renk girilmemiş ya da geçersiz.',
      }
    }

    const oran = oraniYuvarla(kontrastOrani(onRenk, arkaRenk))

    return {
      etiket: cift.etiket,
      on: cift.on,
      arka: cift.arka,
      oran,
      esik: cift.esik,
      gecti: oran >= cift.esik,
      aaa: oran >= AAA_METIN,
      gerekce: cift.gerekce,
    }
  })

  const kalanlar = ciftler.filter((cift) => !cift.gecti)
  return { ciftler, gecti: kalanlar.length === 0, kalanlar }
}

/** `#rrggbb` biçiminde mi? */
export function gecerliHex(deger: unknown): deger is string {
  return typeof deger === 'string' && /^#[0-9a-f]{6}$/i.test(deger.trim())
}

/** Kapının ürettiği insan okur hata metni. */
export function kapiMesaji(sonuc: KapiSonucu, tema: 'açık' | 'koyu'): string {
  if (sonuc.gecti) return ''

  const satirlar = sonuc.kalanlar.map(
    (cift) =>
      `${cift.etiket}: ${cift.oran.toFixed(2)}:1 — en az ${cift.esik}:1 gerekiyor (${cift.gerekce})`,
  )

  return (
    `${tema} temada ${sonuc.kalanlar.length} renk çifti WCAG AA eşiğinin altında. ` +
    `Erişilebilirlik pazarlık konusu değil; bu palet kaydedilemez.\n${satirlar.join('\n')}`
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   "Yakın bir alternatif öner"
   ══════════════════════════════════════════════════════════════════════════ */

/** sRGB → doğrusal ışık. */
function dogrusal(deger: number): number {
  const o = deger / 255
  return o <= 0.04045 ? o / 12.92 : ((o + 0.055) / 1.055) ** 2.4
}

function sRgb(deger: number): number {
  const o = deger <= 0.0031308 ? deger * 12.92 : 1.055 * deger ** (1 / 2.4) - 0.055
  return Math.round(Math.min(1, Math.max(0, o)) * 255)
}

function hexYaz(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((k) => k.toString(16).padStart(2, '0')).join('')}`
}

/**
 * Rengi hedefe doğru OKLab'da taşır.
 *
 * ⚠️ Basit RGB karışımı DEĞİL. sRGB'de siyaha doğru karıştırmak tonu
 * kaydırır ve terracotta yolda kahverengiye döner. OKLab algısal olarak
 * eşit adımlıdır; ton korunur, yalnızca açıklık değişir.
 *
 * Aynı gerekçeyle bu projede palet rampaları da OKLab'da türetilmişti.
 */
function okLabKaristir(renk: string, hedef: string, t: number): string {
  const a = hexCoz(renk)
  const b = hexCoz(hedef)

  const lab = (c: { r: number; g: number; b: number }): [number, number, number] => {
    const r = dogrusal(c.r)
    const g = dogrusal(c.g)
    const bl = dogrusal(c.b)

    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * bl)
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * bl)
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * bl)

    return [
      0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ]
  }

  const [l1, a1, b1] = lab(a)
  const [l2, a2, b2] = lab(b)

  const L = l1 + (l2 - l1) * t
  const A = a1 + (a2 - a1) * t
  const B = b1 + (b2 - b1) * t

  const l_ = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m_ = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s_ = (L - 0.0894841775 * A - 1.291485548 * B) ** 3

  return hexYaz(
    sRgb(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
    sRgb(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
    sRgb(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
  )
}

/**
 * Eşiği geçen EN YAKIN rengi arar.
 *
 * ⚠️ Rengi değiştirmenin iki yönü var ve yön arka plana bağlı: açık zeminde
 * koyulaştırmak, koyu zeminde açıklaştırmak gerekir. Yön yanlış seçilirse
 * arama hiç yakınsamaz ve kullanıcı "öneri bulunamadı" görür.
 *
 * ⚠️ Öneri MARJLA aranıyor (`esik + PAY`), tam eşikte değil. Tam eşikte
 * duran bir değer, bir sonraki küçük düzenlemede sessizce altına düşer —
 * bu projede pudra zemini için aynı karar bilinçle verilmişti.
 *
 * @returns Önerilen hex, ya da hiçbir adım geçmiyorsa `null`
 */
export function alternatifOner(renk: string, arka: string, esik: number): string | null {
  if (!gecerliHex(renk) || !gecerliHex(arka)) return null

  /** Eşiğin hemen üstünde durmamak için küçük pay. */
  const PAY = 0.15

  // Arka plan açıksa metni koyulaştır, koyuysa açıklaştır.
  const arkaParlak = kontrastOrani(arka, '#000000') > kontrastOrani(arka, '#ffffff')
  const hedef = arkaParlak ? '#000000' : '#ffffff'

  const ADIM = 0.02
  for (let t = ADIM; t <= 1.0001; t += ADIM) {
    const aday = okLabKaristir(renk, hedef, t)
    if (kontrastOrani(aday, arka) >= esik + PAY) return aday
  }

  return null
}

/**
 * Bir yuva için, o yuvanın geçmediği TÜM çiftleri birden karşılayan öneri.
 *
 * ⚠️ Tek çifte bakmak yetmez: vurgu rengi hem ana zeminde hem krem zeminde
 * kullanılıyor. Yalnızca birine göre önerilen renk, diğerinde kapıyı
 * geçmez ve kullanıcı öneriyi uygulayıp yine kırmızı görürdü.
 */
export function yuvaIcinOner(anahtar: string, palet: Palet): string | null {
  const mevcut = palet[anahtar]
  if (!gecerliHex(mevcut)) return null

  const ilgili = CIFTLER.filter((cift) => cift.on === anahtar)
  if (ilgili.length === 0) return null

  const PAY = 0.15
  const ADIM = 0.02

  // Yön, yuvanın kullanıldığı zeminlerin ortalamasına göre belirleniyor.
  const zeminler = ilgili.map((cift) => palet[cift.arka]).filter(gecerliHex)
  if (zeminler.length === 0) return null

  const acikZeminSayisi = zeminler.filter(
    (z) => kontrastOrani(z, '#000000') > kontrastOrani(z, '#ffffff'),
  ).length
  const hedef = acikZeminSayisi >= zeminler.length / 2 ? '#000000' : '#ffffff'

  for (let t = ADIM; t <= 1.0001; t += ADIM) {
    const aday = okLabKaristir(mevcut, hedef, t)
    const hepsiGecti = ilgili.every((cift) => {
      const arka = palet[cift.arka]
      return gecerliHex(arka) && kontrastOrani(aday, arka) >= cift.esik + PAY
    })
    if (hepsiGecti) return aday
  }

  return null
}

/** Panelde gösterilecek yuva listesi — dekoratif uyarısıyla birlikte. */
export function dekoratifMi(anahtar: string): boolean {
  return YUVALAR.find((yuva) => yuva.anahtar === anahtar)?.rol === 'dekoratif'
}
