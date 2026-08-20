import { Resolver } from 'node:dns/promises'

import { ayar } from '@/lib/ayarlar'

import type { AlanSorgusu } from './degerlendirme'

/**
 * Alan adı sorguları — RDAP ve dış DNS.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ WHOIS DEĞİL RDAP KULLANILIYOR.
 *
 * RDAP, WHOIS'in resmî halefi (ICANN 2019'dan beri zorunlu tutuyor):
 * HTTPS üzerinden JSON dönüyor, durum listesi ve tarihler yapısal.
 * Klasik WHOIS ise 43. porta düz metin konuşuyor ve her kayıt kuruluşunun
 * çıktısı farklı biçimde — ayrıştırıcısı kaçınılmaz olarak kırılgan olurdu
 * ve bu kontrolün amacı sessizce yanılmamak.
 *
 * ⚠️ Yeni bağımlılık YOK: `fetch` ve Node'un kendi `dns` modülü yetiyor.
 *
 * ⚠️ `import 'server-only'` BİLİNÇLİ OLARAK YOK.
 *
 * Bu dosya `node:dns/promises` içe aktarıyor; istemci paketine girmesi
 * zaten derleme anında patlar — işaret fazladan bir güvence vermiyor.
 * Buna karşılık `payload run` ile koşan teşhis betiğini (`scripts/
 * alan-denetim.mjs`) engelliyordu: "This module cannot be imported from a
 * Client Component module". Sorunu elle sorgulayamadığın bir sağlık
 * kontrolü, teşhis anında en çok ihtiyaç duyulan şeyi kaybettirir.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ NAZİK DAVRANILIYOR — şartnamenin açık şartı.
 *
 *  · Sorgu GÜNDE BİR kez, bakım göreviyle. Panel bu dosyayı hiç çağırmıyor;
 *    şeritte görünen sonuç veritabanındaki son kayıt.
 *  · Tek istek, yeniden deneme YOK. Kayıt otoritesi bir gün cevap vermezse
 *    ertesi gün tekrar sorulur; ısrar etmek kotayı yakar.
 *  · `User-Agent` başlığı projeyi tanıtıyor — kim sorduğu belli olsun.
 *  · Zaman aşımı kısa: takılan bir sorgu bakım görevini bekletmemeli.
 */

/** Tek istek için zaman aşımı. */
const ZAMAN_ASIMI_MS = 10_000

/**
 * Dış çözümleyiciler.
 *
 * ⚠️ KENDİ DNS'İMİZ BİLİNÇLİ OLARAK KULLANILMIYOR — arızanın kör noktası
 * tam olarak buydu. Sunucunun kendi çözümleyicisi önbellekten cevap
 * verebilir ve alan adı DNS'ten düşmüş olsa bile "çözülüyor" der.
 * Ziyaretçinin gördüğü şey bu iki genel çözümleyicinin gördüğüdür.
 */
export const DIS_COZUMLEYICILER: readonly { ad: string; adres: string }[] = [
  { ad: 'Cloudflare (1.1.1.1)', adres: '1.1.1.1' },
  { ad: 'Google (8.8.8.8)', adres: '8.8.8.8' },
]

/**
 * Alan adı genel internette sorgulanabilir mi?
 *
 * ⚠️ GEREKLİ: geliştirme ve hazırlık ortamlarında `SITE_ADRESI` genellikle
 * `localhost` ya da bir IP. O adres için RDAP kaydı da DNS kaydı da yok;
 * kontrol her gün "site erişilemez" der ve yanlış alarm üretirdi. Yanlış
 * alarm veren bir uyarı kısa sürede görmezden gelinir — bu kontrolün var
 * olma sebebini yok ederdi.
 */
export function genelAlanAdiMi(host: string): boolean {
  if (host === '' || host === 'localhost') return false
  // IP adresi (v4 ya da köşeli parantezli v6) — kayıt kuruluşu yok.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':')) return false
  // Noktasız ad ya da yerel uzantı.
  if (!host.includes('.')) return false
  return !/\.(local|localhost|test|invalid|example|internal)$/.test(host)
}

/** Site adresinden alan adını çıkarır. */
export function alanAdiniCoz(): string | null {
  const adres = ayar('SITE_ADRESI')
  if (adres === '') return null
  try {
    const host = new URL(adres).hostname.toLowerCase().replace(/^www\./, '')
    return genelAlanAdiMi(host) ? host : null
  } catch {
    return null
  }
}

interface RdapSonucu {
  durumlar: string[] | null
  bitisTarihi: string | null
  hata: string | null
}

/**
 * RDAP sorgusu.
 *
 * `rdap.org` bootstrap servisi doğru kayıt otoritesine yönlendiriyor;
 * TLD başına ayrı adres tutmak gerekmiyor ve `.com.tr` gibi uzantılara
 * geçilirse kod değişmiyor.
 */
async function rdapSorgula(alan: string): Promise<RdapSonucu> {
  const kontrol = AbortSignal.timeout(ZAMAN_ASIMI_MS)

  try {
    const yanit = await fetch(`https://rdap.org/domain/${encodeURIComponent(alan)}`, {
      headers: {
        accept: 'application/rdap+json',
        /**
         * ⚠️ Kim sorduğu belli olsun — paylaşılan bir kaynağı anonim
         * yoklamak nazik değil.
         *
         * ⚠️ SADECE ASCII. İlk hâli Türkçe yazılmıştı ve `fetch` her
         * çağrıda şu hatayla düşüyordu:
         *
         *   Cannot convert argument to a ByteString because the character
         *   at index 22 has a value of 305 which is greater than 255
         *
         * HTTP başlık değerleri latin-1; "ı" karakteri geçmiyor. Yani RDAP
         * sorgusu ÜRETİMDE DE hiç çalışmayacaktı ve kontrol sessizce
         * "durum okunamadı" derdi. Aynı tuzağa ölçüm başlığında da
         * düşülmüştü.
         */
        'user-agent': 'aslihangyd.com domain health check (1 request/day)',
      },
      signal: kontrol,
      // Bakım görevi zaten günde bir çalışıyor; ayrıca önbelleklemek
      // sonucu bayatlatırdı.
      cache: 'no-store',
    })

    if (!yanit.ok) {
      return { durumlar: null, bitisTarihi: null, hata: `RDAP ${yanit.status}` }
    }

    const veri = (await yanit.json()) as {
      status?: unknown
      events?: { eventAction?: unknown; eventDate?: unknown }[]
    }

    const durumlar = Array.isArray(veri.status)
      ? veri.status.filter((deger): deger is string => typeof deger === 'string')
      : []

    const bitis = (Array.isArray(veri.events) ? veri.events : []).find(
      (olay) => olay.eventAction === 'expiration',
    )

    return {
      durumlar,
      bitisTarihi: typeof bitis?.eventDate === 'string' ? bitis.eventDate : null,
      hata: null,
    }
  } catch (hata) {
    return {
      durumlar: null,
      bitisTarihi: null,
      hata: hata instanceof Error ? hata.message : 'RDAP sorgusu başarısız',
    }
  }
}

/**
 * Kontrol alan adı — ağ arızasıyla bizim alan adımızın arızasını ayırmak için.
 *
 * ⚠️ BU OLMADAN KONTROL YANLIŞ ALARM ÜRETİRDİ.
 *
 * Sunucudan dışarı DNS engelliyse ya da 1.1.1.1'e ulaşılamıyorsa, bizim
 * alan adımız da "çözülmüyor" görünür. O durumda her gün "site erişilemez"
 * uyarısı düşerdi — ve yanlış alarm veren bir uyarı kısa sürede görmezden
 * gelinir; bu kontrolün var olma sebebini yok ederdi.
 *
 * Aynı çözümleyiciye bilinen bir alan adı da soruluyor:
 *
 *   kontrol çözülüyor, bizimki çözülmüyor  → sorun BİZDE
 *   ikisi de çözülmüyor                    → sorun AĞDA, karar "bilinmiyor"
 */
const KONTROL_ALANI = 'cloudflare.com'

async function tekCozumleyici(
  adres: string,
  alan: string,
): Promise<{ bulundu: boolean; ulasildi: boolean }> {
  const cozucu = new Resolver({ timeout: ZAMAN_ASIMI_MS, tries: 1 })
  cozucu.setServers([adres])

  const dene = async (ad: string): Promise<boolean> => {
    try {
      return (await cozucu.resolve4(ad)).length > 0
    } catch {
      try {
        // ⚠️ AAAA de deneniyor: yalnızca IPv6 kaydı olan bir alan adı,
        // sadece A sorulduğunda "çözülmüyor" görünürdü.
        return (await cozucu.resolve6(ad)).length > 0
      } catch {
        return false
      }
    }
  }

  const bulundu = await dene(alan)
  if (bulundu) return { bulundu: true, ulasildi: true }

  // Bizimki çözülmedi: çözümleyicinin kendisine ulaşılabiliyor mu?
  const kontrol = await dene(KONTROL_ALANI)
  return { bulundu: false, ulasildi: kontrol }
}

/**
 * Dış çözümleyicilerden sorgular.
 *
 * Dönüş `null` ise hiçbir çözümleyiciye ULAŞILAMADI — alan adı hakkında
 * bir şey söylemiyor ve değerlendirme "bilinmiyor" diyor.
 */
async function cozumlemeyiDene(alan: string): Promise<Record<string, boolean> | null> {
  const sonuclar = await Promise.all(
    DIS_COZUMLEYICILER.map(async ({ ad, adres }) => ({
      ad,
      ...(await tekCozumleyici(adres, alan)),
    })),
  )

  const ulasilanlar = sonuclar.filter((sonuc) => sonuc.ulasildi)
  if (ulasilanlar.length === 0) return null

  // ⚠️ Yalnızca ULAŞILABİLEN çözümleyiciler karara giriyor. Ulaşılamayan
  // birini "çözemedi" saymak, ağ arızasını alan adı arızası gibi
  // göstermek olurdu.
  return Object.fromEntries(ulasilanlar.map((sonuc) => [sonuc.ad, sonuc.bulundu]))
}

export interface AlanSorguSonucu extends AlanSorgusu {
  alan: string
  sorguZamani: string
}

/** Günde bir kez, bakım göreviyle çağrılır. */
export async function alaniSorgula(): Promise<AlanSorguSonucu | null> {
  const alan = alanAdiniCoz()
  if (alan === null) return null

  const [rdap, cozumleme] = await Promise.all([rdapSorgula(alan), cozumlemeyiDene(alan)])

  return {
    alan,
    sorguZamani: new Date().toISOString(),
    durumlar: rdap.durumlar,
    bitisTarihi: rdap.bitisTarihi,
    cozumleme,
    hata: rdap.hata,
  }
}
