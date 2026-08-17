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

  const temizKendi = kendiHost.toLowerCase().replace(/^www\./, '')
  const temiz = host.replace(/^www\./, '')

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
