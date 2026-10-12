/**
 * Bot raporunun SAF çekirdeği — veritabanı, ağ ve dosya erişimi YOK.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN `botRaporu.ts`TEN AYRI.
 *
 * O dosya `@payload-config` ve `app/sitemap` içe aktarıyor: birim testinden
 * çağrıldığında Payload yapılandırmasının ve site rotalarının tamamı
 * yükleniyor. Oysa burada test edilmesi gereken şey aritmetik:
 *
 *   · "ilk tarama en KÜÇÜK, son tarama en BÜYÜK zaman" kuralı,
 *   · sıfırın "yok" demesi (ilk taramayı sıfıra çeken bir birleştirme
 *     panelde 1 Ocak 1970 yazdırır),
 *   · robots.txt'te engelli yolların SEO boşluğu listesinden düşmesi.
 *
 * Üçü de sessizce bozulabilen kurallar; testleri hızlı ve bağımlılıksız
 * olmalı. `tipler.ts` ile `rapor.ts` arasındaki ayrımın aynısı.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { BOT_ACIKLAMASI, BOT_ETIKETI, BOT_SINIFLARI, type BotSinifi } from './bot'
import { rotaAnahtari } from './kimliksizlestirme'

/** Bot verisinin saklama süresi — bakım görevi bu sınırı uyguluyor. */
export const BOT_PENCERESI_GUN = 180

export interface AdSayi {
  ad: string
  adet: number
}

export interface BotTurSatiri {
  tur: BotSinifi
  etiket: string
  aciklama: string
  adet: number
  /**
   * `diger` sınıfında botların ad kırılımı.
   *
   * ⚠️ Adsız bir "diğer" toplamı, yeni bir botun trafiğini fark etmemizi
   * engellerdi — tanınmayan arama motorunun alan adıyla kalması kararının
   * aynısı.
   */
  adlar: AdSayi[]
}

export interface TaramaSatiri {
  rota: string
  adet: number
  /** İlk tarama — ISO 8601, veri yoksa `null`. */
  ilk: string | null
  son: string | null
}

export interface SeoDurumu {
  /** Site haritasındaki sayfa sayısı. */
  sayfaSayisi: number
  /** Haritadaki en yeni `lastModified` — "son güncelleme" göstergesi. */
  sonGuncelleme: string | null
  /** Harita üretilemediyse sebebi. */
  hata: string | null
  /** robots.txt'te taramaya kapatılan yollar. */
  engellenenYollar: string[]
  /** robots.txt tüm siteyi kapatıyor mu (üretim dışı ortam işareti)? */
  herSeyKapali: boolean
  /** robots.txt'in bildirdiği site haritası adresi. */
  haritaAdresi: string | null
}

export interface BotRaporu {
  gunSayisi: number
  ilkGun: string
  sonGun: string

  toplamIstek: number
  turler: BotTurSatiri[]
  sayfalar: TaramaSatiri[]

  /**
   * Gözlenebilen yanıt kodları.
   *
   * ⚠️ Alan adları `dort04` ve `besxx`: TypeScript tanımlayıcısı rakamla
   * başlayamıyor ve `'404'` biçiminde bir anahtar her kullanımda köşeli
   * parantez isterdi.
   */
  dort04: number
  besxx: number
  /** Toplamdan türetilen 200 sayısı — yaklaşıklığı ekranda yazılı. */
  turetilen200: number

  /** ⭐ Site haritasında olup bu pencerede HİÇ taranmamış sayfalar. */
  taranmamisSayfalar: string[]
  /** Taranan ama haritada olmayan rotalar — eski adres ya da kırık bağlantı. */
  haritadaOlmayanlar: string[]
  /** Haritadaki sayfaların kaçı tarandı. */
  kapsamYuzde: number | null

  seo: SeoDurumu

  /**
   * Bu pencerede insan/bot ayrımı YAPILMAMIŞ gün sayısı.
   *
   * ⚠️ 11 Ekim 2026'dan önceki satırlarda insan sayaçları bot trafiğini de
   * içeriyordu ve `User-Agent` hiçbir yere kaydedilmediği için geriye dönük
   * ayrıştırmak imkânsız. Panel bu sayıyı yazıyor; gizlemek,
   * karşılaştırmayı sessizce yanlış yapmak olurdu.
   */
  ayrimsizGun: number

  bos: boolean
}

export interface GunSatiri {
  gun: string
  botToplamIstek: number
  botAyrimi: boolean
  botIstekleri: { tur?: unknown; ad?: unknown; adet?: unknown }[]
  botSayfalari: { rota?: unknown; adet?: unknown; ilkMs?: unknown; sonMs?: unknown }[]
  botDurumlari: { kod?: unknown; adet?: unknown }[]
}

function sayi(deger: unknown): number {
  return typeof deger === 'number' && Number.isFinite(deger) ? deger : 0
}

function dizi<T>(deger: unknown): T[] {
  return Array.isArray(deger) ? (deger as T[]) : []
}

function metin(deger: unknown): string {
  return typeof deger === 'string' ? deger : ''
}

/**
 * Gün anahtarına gün ekler/çıkarır.
 *
 * ⚠️ UTC ÜZERİNDEN. Gün anahtarının kendisi Europe/Istanbul'a göre
 * üretiliyor (`gunAnahtari`), ama bir anahtardan geriye saymak takvim
 * aritmetiği: yerel saate göre `Date` kurmak, yaz saati geçişinde bir günü
 * iki kez ya da hiç saymaya yol açardı.
 */
export function gunEkle(gun: string, fark: number): string {
  const [yil, ay, gunSayisi] = gun.split('-').map(Number)
  const tarih = new Date(Date.UTC(yil ?? 2026, (ay ?? 1) - 1, gunSayisi ?? 1))
  tarih.setUTCDate(tarih.getUTCDate() + fark)
  return tarih.toISOString().slice(0, 10)
}

export function satirlariCoz(ham: unknown[]): GunSatiri[] {
  return ham.map((satir) => {
    const s = satir as Record<string, unknown>
    return {
      gun: metin(s.gun),
      botToplamIstek: sayi(s.botToplamIstek),
      botAyrimi: s.botAyrimi === true,
      botIstekleri: dizi(s.botIstekleri),
      botSayfalari: dizi(s.botSayfalari),
      botDurumlari: dizi(s.botDurumlari),
    }
  })
}

/**
 * Bot sayaçlarını toplar.
 *
 * ⚠️ SAF FONKSİYON — veritabanı yok. Toplamanın kendisi testlenebilir
 * olmalı: "ilk tarama en küçüğü, son tarama en büyüğü" kuralı sessizce
 * tersine dönerse panel 1970 yazar ve kimse fark etmez.
 */
export function botlariTopla(satirlar: GunSatiri[]): {
  toplamIstek: number
  turler: BotTurSatiri[]
  sayfalar: TaramaSatiri[]
  dort04: number
  besxx: number
  ayrimsizGun: number
} {
  const turToplami = new Map<BotSinifi, number>()
  const adToplami = new Map<BotSinifi, Map<string, number>>()
  const sayfaToplami = new Map<string, { adet: number; ilkMs: number; sonMs: number }>()
  const durumToplami = new Map<string, number>()
  let toplamIstek = 0
  let ayrimsizGun = 0

  for (const satir of satirlar) {
    toplamIstek += satir.botToplamIstek
    if (!satir.botAyrimi) ayrimsizGun += 1

    for (const giris of satir.botIstekleri) {
      const ham = metin(giris.tur)
      const tur = (BOT_SINIFLARI as readonly string[]).includes(ham) ? (ham as BotSinifi) : 'diger'
      const adet = sayi(giris.adet)
      turToplami.set(tur, (turToplami.get(tur) ?? 0) + adet)

      const ad = metin(giris.ad) === '' ? BOT_ETIKETI[tur] : metin(giris.ad)
      const kova = adToplami.get(tur) ?? new Map<string, number>()
      kova.set(ad, (kova.get(ad) ?? 0) + adet)
      adToplami.set(tur, kova)
    }

    for (const giris of satir.botSayfalari) {
      const rota = metin(giris.rota)
      if (rota === '') continue
      const adet = sayi(giris.adet)
      const ilkMs = sayi(giris.ilkMs)
      const sonMs = sayi(giris.sonMs)
      const once = sayfaToplami.get(rota)
      if (once === undefined) {
        sayfaToplami.set(rota, { adet, ilkMs, sonMs })
        continue
      }
      once.adet += adet
      // ⚠️ Sıfır "yok" demek: ilk taramayı sıfıra çekmek 1970 yazdırırdı.
      once.ilkMs = ilkMs > 0 ? (once.ilkMs > 0 ? Math.min(once.ilkMs, ilkMs) : ilkMs) : once.ilkMs
      once.sonMs = Math.max(once.sonMs, sonMs)
    }

    for (const giris of satir.botDurumlari) {
      const kod = metin(giris.kod)
      if (kod === '') continue
      durumToplami.set(kod, (durumToplami.get(kod) ?? 0) + sayi(giris.adet))
    }
  }

  const turler: BotTurSatiri[] = [...turToplami.entries()]
    .map(([tur, adet]) => ({
      tur,
      etiket: BOT_ETIKETI[tur],
      aciklama: BOT_ACIKLAMASI[tur],
      adet,
      /**
       * ⚠️ Ad kırılımı YALNIZCA `diger` sınıfında anlamlı: tanınan
       * sınıflarda ad sabittir ve satırı tekrarlamak olurdu.
       */
      adlar:
        tur === 'diger'
          ? [...(adToplami.get(tur) ?? new Map())]
              .map(([ad, sayisi]) => ({ ad, adet: sayisi as number }))
              .sort((a, b) => b.adet - a.adet)
              .slice(0, 15)
          : [],
    }))
    .sort((a, b) => b.adet - a.adet)

  const sayfalar: TaramaSatiri[] = [...sayfaToplami.entries()]
    .map(([rota, ozet]) => ({
      rota,
      adet: ozet.adet,
      ilk: ozet.ilkMs > 0 ? new Date(ozet.ilkMs).toISOString() : null,
      son: ozet.sonMs > 0 ? new Date(ozet.sonMs).toISOString() : null,
    }))
    .sort((a, b) => b.adet - a.adet)

  return {
    toplamIstek,
    turler,
    sayfalar,
    dort04: durumToplami.get('404') ?? 0,
    besxx: durumToplami.get('5xx') ?? 0,
    ayrimsizGun,
  }
}

/**
 * Tarama kapsamını hesaplar — ⭐ raporun en değerli satırı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ "HİÇ TARANMAMIŞ SAYFA" BİR EKSİK SAYAÇ DEĞİL, BİR SEO BOŞLUĞU.
 *
 * Taranmayan sayfa arama sonucunda YOKTUR. Mahalle sayfaları bu sitenin
 * SEO motorunun kalbi; biri haritada durup hiç taranmıyorsa sebebi
 * genellikle bir bağlantı eksikliğidir (hiçbir sayfadan ona gidilmiyor) ve
 * bu, içerik yazmakla çözülmez.
 *
 * ⚠️ ROBOTS.TXT'TE ENGELLİ YOLLAR LİSTEDEN DÜŞÜYOR. Taramaya kapattığımız
 * bir adresi "taranmamış" diye raporlamak, kendi kararımızı arıza olarak
 * göstermek olurdu — ve her bakışta göz ardı edilen bir uyarı, uyarı
 * olmaktan çıkar.
 *
 * ⚠️ TERS YÖN DE RAPORLANIYOR: taranan ama haritada olmayan rota. Bu ya
 * eski bir adres (yönlendirme gerekir) ya da bir yere koyduğumuz kırık
 * bağlantı. İki liste birlikte bakılıyor.
 * ─────────────────────────────────────────────────────────────────────────
 */
export function kapsamiHesapla(
  haritaRotalari: readonly string[],
  taranmisRotalar: readonly string[],
  engellenenYollar: readonly string[],
): { taranmamisSayfalar: string[]; haritadaOlmayanlar: string[]; kapsamYuzde: number | null } {
  const engelli = (rota: string) =>
    engellenenYollar.some((yol) => {
      const temiz = yol.replace(/[?*]+$/, '')
      return temiz !== '' && (rota === temiz || rota.startsWith(`${temiz}/`))
    })

  const harita = [...new Set(haritaRotalari.map(rotaAnahtari))].filter((rota) => !engelli(rota))
  const taranmis = new Set(taranmisRotalar.map(rotaAnahtari))

  const taranmamisSayfalar = harita.filter((rota) => !taranmis.has(rota)).sort()
  const haritaKumesi = new Set(harita)
  const haritadaOlmayanlar = [...taranmis]
    .filter((rota) => !haritaKumesi.has(rota) && !engelli(rota))
    .sort()

  return {
    taranmamisSayfalar,
    haritadaOlmayanlar,
    kapsamYuzde:
      harita.length === 0
        ? null
        : Math.round(((harita.length - taranmamisSayfalar.length) / harita.length) * 100),
  }
}

/** robots.txt kurallarından engellenen yolları çıkarır. */
export function robotsDurumunuCoz(cikti: {
  rules: unknown
  sitemap?: string | string[]
  host?: string
}): Pick<SeoDurumu, 'engellenenYollar' | 'herSeyKapali' | 'haritaAdresi'> {
  const kurallar = Array.isArray(cikti.rules) ? cikti.rules : [cikti.rules]
  const yollar: string[] = []

  for (const kural of kurallar) {
    const d = (kural as { disallow?: string | string[] } | null)?.disallow
    if (typeof d === 'string') yollar.push(d)
    else if (Array.isArray(d)) yollar.push(...d.filter((y): y is string => typeof y === 'string'))
  }

  const temiz = [...new Set(yollar)].filter((yol) => yol !== '')
  const harita = Array.isArray(cikti.sitemap) ? cikti.sitemap[0] : cikti.sitemap

  return {
    engellenenYollar: temiz,
    /**
     * ⚠️ `disallow: '/'` ÜRETİM DIŞI ORTAM İŞARETİ ve panelde ayrıca
     * görünmesi şart: o hâlde site HİÇ taranmıyor ve "neden kimse bizi
     * taramıyor" sorusunun cevabı burada.
     */
    herSeyKapali: temiz.includes('/'),
    haritaAdresi: typeof harita === 'string' ? harita : null,
  }
}
