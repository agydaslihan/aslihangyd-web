/**
 * Kimliksizleştirme — ölçümün KVKK sınırını çizen dosya.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU DOSYA BİR GÜVENLİK SINIRIDIR, BİR YARDIMCI DEĞİL.
 *
 * Gözleme giren her ham değer buradan geçer. Amaç tek: kaydedilen hiçbir
 * alanın tek bir ziyaretçiyi işaret edememesi.
 *
 *   · IP adresi hiç okunmuyor — bu dosyada IP alan bir fonksiyon YOK
 *   · Oturum kimliği üretilmiyor — rastgele değer, karma, sayaç yok
 *   · Yönlendiren TAM URL değil, yalnızca ALAN ADI olarak saklanıyor
 *   · Sorgu dizesi atılıyor; yalnızca UTM etiketleri ayrıca alınıyor
 *   · Serbest metin (arama kutusu) hiç kaydedilmiyor
 *
 * ⚠️ Yönlendiren tam URL'i neden saklanmıyor: bir forum ya da özel bir
 * mesajlaşma bağlantısındaki URL, tek bir kişinin nereden geldiğini
 * gösterebilir. Alan adı ("instagram.com") aynı kararı aldırır, kimseyi
 * işaret etmez.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Panelde ve sayaçlarda kullanılan "doğrudan geldi" etiketi. */
export const DOGRUDAN = 'dogrudan'

/**
 * Alan adını karşılaştırılabilir hâle getirir.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ PORT ATILIYOR — VE BU BİR HATA DÜZELTMESİ, SÜS DEĞİL.
 *
 * `URL.hostname` portu taşımıyor (`127.0.0.1`), `nextUrl.host` taşıyor
 * (`127.0.0.1:3210`). İkisi doğrudan karşılaştırıldığında standart
 * olmayan bir portta çalışan her kurulumda SİTE İÇİ gezinme, dış
 * yönlendiren sanılıyordu.
 *
 * Ölçümle yakalandı: yerelde `/mahalleler`e site içinden yapılan beş
 * geçişin beşi de "giriş sayfası" olarak sayıldı. Üretimde port
 * varsayılan olduğu için görünmüyordu — yani hata yalnızca geliştirme ve
 * hazırlık ortamlarında, tam da sayıları doğrulamaya çalıştığımız yerde
 * ortaya çıkıyordu.
 * ─────────────────────────────────────────────────────────────────────────
 */
function alanAdiniSadelestir(host: string): string {
  return (
    host
      .toLowerCase()
      .split(':')[0]
      ?.replace(/^www\./, '') ?? ''
  )
}

/**
 * Yönlendiren adresten yalnızca alan adını çıkarır.
 *
 * Kendi alan adımızdan gelen iç gezinmeler `null` döner: onlar bir
 * "kaynak" değil, sitenin kendi içindeki hareket.
 */
export function yonlendirenAlanAdi(referer: string | null | undefined, kendiHost: string): string {
  if (typeof referer !== 'string' || referer.trim() === '') return DOGRUDAN

  let host: string
  try {
    host = new URL(referer).hostname.toLowerCase()
  } catch {
    return DOGRUDAN
  }

  if (host === '') return DOGRUDAN

  const temizKendi = alanAdiniSadelestir(kendiHost)
  const temiz = alanAdiniSadelestir(host)

  // İç gezinme kaynak değildir.
  if (temiz === temizKendi) return DOGRUDAN

  return temiz
}

/**
 * Rotayı sayaç anahtarına çevirir.
 *
 * ⚠️ Sorgu dizesi ATILIR. Filtreli bir adres (`?tip=satilik&mahalle=…`)
 * tek başına ayırt edici olabilir; filtre kullanımı ayrıca ve
 * toplulaştırılmış olarak ölçülüyor (Katman B, `filtre_uygulandi`).
 *
 * ⚠️ Sondaki eğik çizgi tekilleştiriliyor: `/portfoy` ve `/portfoy/` aynı
 * sayfadır ve ayrı satır olarak görünmeleri paneli okunmaz yapardı.
 */
export function rotaAnahtari(yol: string): string {
  const sorgusuz = yol.split('?')[0] ?? yol
  const temiz = sorgusuz.replace(/\/+$/, '')
  return temiz === '' ? '/' : temiz
}

/**
 * Sayılmayacak yollar.
 *
 * ⚠️ Panel, API ve varlık istekleri ziyaret değildir. Sayılsalardı
 * "en çok görüntülenen sayfa" listesinin başına `/admin` otururdu ve
 * huninin girişi Aslıhan'ın kendi tıklamalarıyla şişerdi.
 */
const SAYILMAZ = [
  '/admin',
  '/api',
  '/_next',
  '/favicon',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest',
  '/icon',
  '/apple-icon',
  '/opengraph-image',
]

export function sayilirMi(yol: string): boolean {
  const rota = rotaAnahtari(yol)
  if (
    SAYILMAZ.some((on) => rota === on || rota.startsWith(`${on}/`) || rota.startsWith(on + '.'))
  ) {
    return false
  }
  // Uzantılı istekler (varlıklar) sayfa değildir.
  return !/\.[a-z0-9]{2,5}$/i.test(rota)
}

/** UTM etiketleri — kampanya ölçümü için, kişisel veri değil. */
export interface UtmEtiketleri {
  kaynak: string | null
  ortam: string | null
  kampanya: string | null
}

/**
 * ⚠️ Yalnızca üç alan okunuyor ve her biri KISALTILIYOR.
 *
 * `utm_content` ve `utm_term` bilinçli olarak alınmıyor: pratikte serbest
 * metin taşıyorlar ve kampanya ölçümüne katkıları, taşıdıkları riski
 * karşılamıyor. Uzunluk sınırı, etikete kimlik gömme ihtimalini kesiyor.
 */
export function utmOku(sorgu: URLSearchParams): UtmEtiketleri {
  const al = (ad: string): string | null => {
    const ham = sorgu.get(ad)
    if (typeof ham !== 'string') return null
    const temiz = ham.trim().slice(0, 40).toLowerCase()
    return temiz === '' ? null : temiz
  }

  return { kaynak: al('utm_source'), ortam: al('utm_medium'), kampanya: al('utm_campaign') }
}

/**
 * Ülke kodu — Cloudflare'in `CF-IPCountry` başlığından.
 *
 * ⚠️ IP'nin kendisi okunmuyor; Cloudflare zaten ülkeye çevirmiş hâlde
 * gönderiyor. Ülke, tek başına hiç kimseyi işaret etmez.
 */
export function ulkeKodu(baslik: string | null | undefined): string {
  if (typeof baslik !== 'string') return 'XX'
  const temiz = baslik.trim().toUpperCase()
  return /^[A-Z]{2}$/.test(temiz) ? temiz : 'XX'
}

/**
 * Tarayıcı ailesi — `User-Agent` başlığından, KABA sınıflarla.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ SÜRÜM NUMARASI ALINMIYOR VE BU BİR KVKK KARARI.
 *
 * "Chrome 141.0.7390.54 / macOS 15.2" gibi bir dize, ekran çözünürlüğü ve
 * saatle birleştiğinde tek bir cihazı işaret edebilir — tarayıcı parmak
 * izinin ta kendisi. Burada yalnızca ALTI kova var; hiçbiri kimseyi
 * ayırt etmez.
 *
 * ⚠️ Sıra önemli: Edge kendini Chrome, Chrome kendini Safari sanıyor.
 * Genelden özele değil, ÖZELDEN GENELE bakılıyor.
 *
 * ⚠️ Ham `User-Agent` HİÇBİR YERE YAZILMIYOR — ne veritabanına ne günlüğe.
 * Bu fonksiyon onu bir kovaya çevirip atıyor.
 */
export type TarayiciAilesi = 'chrome' | 'safari' | 'firefox' | 'edge' | 'samsung' | 'diger'

export function tarayiciAilesi(userAgent: string | null | undefined): TarayiciAilesi {
  if (typeof userAgent !== 'string') return 'diger'
  const ua = userAgent.toLowerCase()

  if (ua.includes('edg/') || ua.includes('edga/') || ua.includes('edgios/')) return 'edge'
  if (ua.includes('samsungbrowser')) return 'samsung'
  if (ua.includes('firefox') || ua.includes('fxios')) return 'firefox'
  if (ua.includes('chrome') || ua.includes('crios') || ua.includes('chromium')) return 'chrome'
  if (ua.includes('safari')) return 'safari'
  return 'diger'
}

/**
 * Şehir — Cloudflare'in `CF-IPCity` başlığından.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ŞEHİR, ÜLKEDEN DAHA RİSKLİ BİR ALAN. Kayıt burada bitmiyor.
 *
 * Ülke tek başına hiç kimseyi işaret etmez; şehir edebilir. Küçük bir
 * ilçeden gelen tek bir ziyaret, gün ve sayfa ile birleştiğinde "o gün o
 * sayfaya bakan kişi" demektir. Bu yüzden iki koruma var:
 *
 *   1. BURADA: değer normalleştiriliyor, kırpılıyor, serbest metin
 *      olamayacak biçime sokuluyor (uydurma bir başlık gönderilemesin).
 *   2. RAPORDA: `k-anonimlik` eşiği — eşiğin altında kalan şehirler
 *      "diğer" kovasına toplanıyor ve tek tek gösterilmiyor
 *      (`lib/olcum/rapor.ts`, `ASGARI_SEHIR`).
 *
 * İkincisi olmadan birincisi yetmez; ikisi ayrı yerde olduğu için ikisi
 * de yorumla değil kodla bağlı.
 *
 * ⚠️ IP yine okunmuyor: Cloudflare şehri çözmüş hâlde gönderiyor.
 */
export const SEHIR_BILINMIYOR = 'bilinmiyor'

export function sehirAdi(baslik: string | null | undefined): string {
  if (typeof baslik !== 'string') return SEHIR_BILINMIYOR
  const temiz = baslik
    .trim()
    .slice(0, 40)
    // Harf, boşluk ve tire dışında ne gelirse gelsin atılıyor: başlık
    // dışarıdan geliyor ve serbest metin olarak saklanmamalı.
    .replace(/[^\p{L}\s-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
  return temiz === '' ? SEHIR_BILINMIYOR : temiz
}

/**
 * Saat kovası — Europe/Istanbul, 0–23.
 *
 * ⚠️ YEREL SAAT. UTC'ye göre sayılan bir yoğunluk grafiği, akşam
 * yoğunluğunu üç saat kaydırıp "gece 9'da kimse yok" dedirtirdi.
 */
export function saatKovasi(an: Date = new Date()): number {
  const saat = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Istanbul',
    hour: '2-digit',
    hour12: false,
  }).format(an)
  const sayi = Number(saat)
  return Number.isInteger(sayi) && sayi >= 0 && sayi <= 23 ? sayi : 0
}

/**
 * Bu istek bir GİRİŞ mi — yani ziyaretçi siteye buradan mı girdi?
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ OTURUM KİMLİĞİ OLMADAN "GİRİŞ SAYFASI" NASIL ÖLÇÜLÜR?
 *
 * Olağan yol bir oturum çerezi yazıp ilk isteği işaretlemektir — ve tam da
 * onu yapmıyoruz. Kullanılan işaret, isteğin KENDİ İÇİNDE zaten bulunan
 * bir bilgi: yönlendiren BİZDEN Mİ GELİYOR?
 *
 *   · Yönlendiren yoksa (doğrudan adres, yer imi, uygulama içi tarayıcı)
 *   · ya da yönlendiren BAŞKA bir siteyse
 *
 * → ziyaretçi siteye o sayfadan girmiştir.
 *
 * ⚠️ `yonlendirenAlanAdi` BU SORUYU CEVAPLAYAMAZ: o, site içi gezinmeyi de
 * doğrudan girişi de `dogrudan` kovasına koyuyor (kaynak listesi için
 * doğru davranış — iç gezinme bir "kaynak" değil). Giriş ölçümü ayrı bir
 * soru sorduğu için ayrı bir fonksiyona ihtiyaç duyuyor.
 *
 * ⚠️ Bu bir YAKLAŞIKLIK ve panelde de öyle yazıyor. Yönlendiren başlığını
 * göndermeyen tarayıcı ayarları ve gizlilik eklentileri, site içi bir
 * geçişi giriş gibi gösterebilir. Hata, sayıyı olduğundan BÜYÜK gösterme
 * yönünde; bunu gizlemek yerine söylüyoruz.
 */
export function girisMi(referer: string | null | undefined, kendiHost: string): boolean {
  if (typeof referer !== 'string' || referer.trim() === '') return true

  let host: string
  try {
    host = new URL(referer).hostname.toLowerCase()
  } catch {
    return true
  }

  if (host === '') return true
  return alanAdiniSadelestir(host) !== alanAdiniSadelestir(kendiHost)
}
