import 'server-only'

/**
 * Overpass istemcisi — tek istek, sınıflandırılmış sonuç.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ YENİDEN DENEME BURADA DEĞİL, İSTEMCİDE
 *
 * Bu fonksiyon **bir kez** dener ve sonucu sınıflandırır. Döngü, bekleme ve
 * "tekrar deneniyor (2/4)" göstergesi panelde.
 *
 * Gerekçe: yeniden deneme sunucu eyleminin İÇİNDE olsaydı kullanıcı bir
 * dakika boyunca donmuş bir butona bakardı — ne olduğunu bilmeden. Sunucu
 * eylemi ara durum yayınlayamaz; istemci yayınlayabilir. Bekleme sayıları
 * ikisinin de okuduğu `yenidenDeneme.ts`'te.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEZAKET — OVERPASS ÜCRETSİZ VE PAYLAŞIMLI
 *
 * Üç koruma birlikte çalışıyor ve üçü de gerekli:
 *  · `User-Agent` projeyi ve iletişim adresini tanıtıyor (kullanım
 *    politikasının açık isteği)
 *  · AYNI sunucuya iki istek arasında en az `NAZIK_ARALIK_MS` var ve
 *    parçalar aynalara dağıtılıyor — hiçbir sunucuya yağmur yağmıyor
 *  · 400 ve 403 yeniden DENENMEZ: ilki bizim hatamız, ikincisi "yeter
 *    artık" demektir. İkisinde de ısrar etmek kaynağı kötüye kullanmaktır.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { SITE_ADRESI } from '@/lib/site'

/**
 * Yedek sunucu listesi.
 *
 * ⚠️ Sıra önemli: ilki birincil. Her yeniden deneme sıradakine geçiyor,
 * böylece 504 veren sunucuda ısrar edilmiyor.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ HER AÇIK ÖRNEK KÜRESEL VERİ SUNMUYOR — 15 Ağustos 2026'da yakalandı.
 *
 * Listeye önce `overpass.osm.ch` de konmuştu. Ölçüm sırasında dört grubun
 * ondan **HTTP 200 + 272 bayt** ile döndüğü görüldü. İçi boştu: `elements`
 * boş dizi, `remark` yok, hata yok. O örnek yalnızca İsviçre bölgesini
 * sunuyor ve Türkiye kimlikleri için sessizce boş cevap veriyor.
 *
 * Fark edilmeseydi 12 mahalle "başarıyla" içe aktarılmış sayılıp sınırsız
 * kalacaktı — hiçbir hata mesajı olmadan. Bu, projenin sürekli savaştığı
 * arıza sınıfının ta kendisi: **sunucu arızası ile "kayıt yok" ekranda aynı
 * görünür.**
 *
 * Buradaki üç sunucunun küresel veri sunduğu ölçümle doğrulandı (Çorlu
 * ilişkileri için gerçek geometri döndürdüler). Listeye yeni bir adres
 * eklemeden önce AYNI DOĞRULAMA yapılmalı; ayrıca `sinirGrubunuGetir`
 * içindeki "boş cevap geçerli değildir" kapısı bu hatayı bir daha
 * sessizce geçirmez.
 * ─────────────────────────────────────────────────────────────────────────
 */
export const VARSAYILAN_SUNUCULAR: readonly string[] = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

/**
 * Yapılandırılmış sunucu listesi.
 *
 * `OVERPASS_ADRESI` virgülle ayrılmış birden çok adres kabul eder.
 * ⚠️ Tek adres yazan mevcut kurulumlar aynen çalışmaya devam eder —
 * yeni bir değişken eklemek yerine mevcut olanı genişletmek, sunucudaki
 * `.env`i düzenlemeyi unutan birini sessizce yedeksiz bırakmaz.
 */
export function overpassSunuculari(): string[] {
  const ham = process.env.OVERPASS_ADRESI?.trim()
  if (!ham) return [...VARSAYILAN_SUNUCULAR]

  const liste = ham
    .split(',')
    .map((adres) => adres.trim())
    .filter((adres) => adres !== '')

  return liste.length > 0 ? liste : [...VARSAYILAN_SUNUCULAR]
}

/**
 * AYNI SUNUCUYA iki istek arasındaki asgari boşluk.
 *
 * ⚠️ Süreç geneli değil, sunucu başına. Ölçüm sırasında görüldü: altı grup
 * arka arkaya aynı sunucuya gidince overpass-api.de **429 (çok fazla
 * istek)** döndürdü. Farklı sunuculara giden istekler birbirini beklemek
 * zorunda değil; aynı sunucuya gidenler zorunda.
 */
export const NAZIK_ARALIK_MS = 2_000

/**
 * Yeniden denemeye DEĞER HTTP kodları.
 *
 * 5xx sunucu tarafı, 408 zaman aşımı. Hepsi geçici olabilir.
 * ⚠️ 429 BURADA DEĞİL — ayrı `kota` durumu olarak ele alınıyor (aşağıda).
 * ⚠️ 400 (bozuk sorgu) ve 403 (engellendi) bilinçli olarak dışarıda.
 */
const GECICI_KODLAR = new Set([408, 500, 502, 503, 504])

/** Sunucunun bize kota sınırı uyguladığını bildiren kod. */
const KOTA_KODU = 429

export type OverpassSonucu =
  | { durum: 'tamam'; veri: unknown; sunucu: string }
  /** Geçici sorun — beklenip tekrar denenebilir. */
  | { durum: 'yeniden_denenebilir'; mesaj: string; sunucu: string }
  /**
   * ⚠️ KOTA SINIRI — DİĞER HATALARDAN AYRI TUTULUYOR.
   *
   * 429 "sunucu bozuk" demek değil, "bizi geçici olarak kısıtladım" demek.
   * Diğer hatalarda hızlı tekrar denemek makul; burada zararlı — ısrar
   * kısıtlama süresini uzatır. Bu yüzden ayrı bir durum: çağıran taraf
   * daha uzun bekliyor ve kullanıcıya bunun bir arıza değil kota olduğunu
   * söylüyor.
   *
   * `sunucuBeklemesiMs`: `Retry-After` başlığı varsa oradan. Sunucu ne
   * kadar beklememizi istediğini söylediyse tahmin yürütmenin anlamı yok.
   */
  | { durum: 'kota'; mesaj: string; sunucu: string; sunucuBeklemesiMs: number | null }
  /** Kalıcı sorun — tekrar denemek işe yaramaz ve kaynağı yorar. */
  | { durum: 'hata'; mesaj: string; sunucu: string }

/**
 * `Retry-After` başlığını milisaniyeye çevirir.
 *
 * İki biçim geçerli: saniye sayısı ("120") ya da HTTP tarihi
 * ("Wed, 21 Oct 2026 07:28:00 GMT"). İkisi de destekleniyor çünkü hangisini
 * göndereceği sunucuya kalmış.
 *
 * ⚠️ Saçma değerlere karşı üst sınır var: bozuk bir başlık yüzünden panel
 * yarım saat donmasın.
 */
export function retryAfterMs(ham: string | null): number | null {
  if (ham === null) return null
  const kirpilmis = ham.trim()
  if (kirpilmis === '') return null

  const saniye = Number(kirpilmis)
  if (Number.isFinite(saniye) && saniye >= 0)
    return Math.min(saniye * 1_000, AZAMI_KOTA_BEKLEMESI_MS)

  const tarih = Date.parse(kirpilmis)
  if (Number.isNaN(tarih)) return null

  const fark = tarih - Date.now()
  if (fark <= 0) return 0
  return Math.min(fark, AZAMI_KOTA_BEKLEMESI_MS)
}

/** `Retry-After` ne derse desin bundan uzun beklenmez. */
export const AZAMI_KOTA_BEKLEMESI_MS = 5 * 60_000

const sonIstek = new Map<string, number>()

/**
 * Herhangi bir sunucuya yapılan SON isteğin anı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ SINIR VE POI AYNI KOTAYI PAYLAŞIYOR
 *
 * İki içe aktarma ekranı ayrı görünüyor ama Overpass açısından aynı
 * istemciyiz. Sınır içe aktarma 12 istek gönderdikten hemen sonra POI'ye
 * başlamak, doğrudan 429'a koşmak demek.
 *
 * Bu damga panelde "az önce çalıştı, biraz bekleyin" uyarısını besliyor.
 * ⚠️ Buton ENGELLENMİYOR: acele eden birinin işini durdurmak bizim işimiz
 * değil, ne olacağını söylemek işimiz.
 * ─────────────────────────────────────────────────────────────────────────
 */
let sonIstekAni = 0

/** Soğuma penceresi — bu süre içinde ikinci bir toplu içe aktarma riskli. */
export const SOGUMA_MS = 5 * 60_000

/** Son Overpass isteğinden bu yana geçen süre; hiç istek yoksa `null`. */
export function sonIstektenBuYanaMs(): number | null {
  if (sonIstekAni === 0) return null
  return Date.now() - sonIstekAni
}

/** Aynı sunucuya son istekten bu yana yeterince beklenmediyse farkı uyur. */
async function nazikBekle(sunucu: string): Promise<void> {
  const gecen = Date.now() - (sonIstek.get(sunucu) ?? 0)
  if (gecen < NAZIK_ARALIK_MS) {
    await new Promise((coz) => setTimeout(coz, NAZIK_ARALIK_MS - gecen))
  }
  const simdi = Date.now()
  sonIstek.set(sunucu, simdi)
  sonIstekAni = simdi
}

/** Kullanım politikasının istediği tanıtıcı başlık. */
function tanitici(): string {
  return `aslihangyd.com mahalle/POI ice aktarma (${SITE_ADRESI})`
}

/**
 * Overpass'a TEK istek gönderir ve sonucu sınıflandırır.
 *
 * @param denemeSirasi 1'den başlar; hangi sunucunun kullanılacağını belirler
 */
export async function overpassDene(
  sorgu: string,
  {
    denemeSirasi = 1,
    dagitim = 0,
    zamanAsimiMs = 180_000,
  }: { denemeSirasi?: number; dagitim?: number; zamanAsimiMs?: number } = {},
): Promise<OverpassSonucu> {
  const liste = overpassSunuculari()

  /**
   * ⚠️ SUNUCU SEÇİMİ İKİ ŞEYE BAKIYOR — ÖLÇÜMLE ÖĞRENİLDİ.
   *
   * `denemeSirasi`: 504 veren sunucuda ısrar etmemek için her yeniden
   * deneme sıradakine gider.
   *
   * `dagitim`: parça sırası. Bu OLMADAN bütün parçalar birinci sunucuya
   * arka arkaya gidiyordu ve altı grubun üçü ilk denemede 429/504 aldı.
   * Parçaları aynalara dağıtmak, tek bir sunucuya yüklenmeyi önlüyor —
   * hem daha nazik hem daha çabuk sonuçlanıyor.
   */
  const sunucu = liste[(dagitim + denemeSirasi - 1) % liste.length] as string

  const kontrol = new AbortController()
  const zamanlayici = setTimeout(() => kontrol.abort(), zamanAsimiMs)

  try {
    await nazikBekle(sunucu)

    const cevap = await fetch(sunucu, {
      method: 'POST',
      body: new URLSearchParams({ data: sorgu }),
      headers: { 'User-Agent': tanitici() },
      signal: kontrol.signal,
    })

    if (cevap.status === KOTA_KODU) {
      const sunucuBeklemesiMs = retryAfterMs(cevap.headers.get('retry-after'))
      return {
        durum: 'kota',
        mesaj: `${sunucu} kota sınırı uyguluyor (429).`,
        sunucu,
        sunucuBeklemesiMs,
      }
    }

    if (!cevap.ok) {
      const mesaj = `${sunucu} ${cevap.status} döndü.`
      return GECICI_KODLAR.has(cevap.status)
        ? { durum: 'yeniden_denenebilir', mesaj, sunucu }
        : { durum: 'hata', mesaj, sunucu }
    }

    /**
     * ⚠️ HTTP 200 HER ZAMAN BAŞARI DEĞİL.
     *
     * Overpass yüklendiğinde 200 ile HTML bir hata sayfası ya da geçerli
     * JSON içinde `remark` alanı döndürebiliyor. İkisi de "sorgu
     * tamamlanamadı" demek. Bu kontrol olmadan sunucu arızası ile "bölgede
     * kayıt yok" ekranda AYNI görünür.
     */
    const metin = await cevap.text()

    let veri: unknown
    try {
      veri = JSON.parse(metin)
    } catch {
      return {
        durum: 'yeniden_denenebilir',
        mesaj: `${sunucu} JSON yerine hata sayfası döndürdü (sunucu yoğun).`,
        sunucu,
      }
    }

    const not = (veri as { remark?: unknown })?.remark
    if (typeof not === 'string' && not.trim() !== '') {
      return { durum: 'yeniden_denenebilir', mesaj: `${sunucu}: ${not.trim()}`, sunucu }
    }

    return { durum: 'tamam', veri, sunucu }
  } catch (hata) {
    // Zaman aşımı ve ağ hatası: ikisi de geçici olabilir.
    const mesaj =
      hata instanceof Error && hata.name === 'AbortError'
        ? `${sunucu} zamanında yanıt vermedi.`
        : `${sunucu} adresine ulaşılamadı: ${hata instanceof Error ? hata.message : 'bilinmeyen hata'}`
    return { durum: 'yeniden_denenebilir', mesaj, sunucu }
  } finally {
    clearTimeout(zamanlayici)
  }
}
