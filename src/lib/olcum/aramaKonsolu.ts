import 'server-only'

/**
 * Google Search Console — arama kelimeleri.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ARAMA KELİMESİ BİZİM ÖLÇÜMÜMÜZ DEĞİL, GOOGLE'IN VERİSİ — VE BU AYRIM
 *    KVKK AÇISINDAN ÖNEMLİ.
 *
 * Ziyaretçinin Google'a ne yazdığını biz göremiyoruz: yönlendiren başlığı
 * yıllardır arama terimini taşımıyor. Bu bölümdeki veriler Google'ın kendi
 * arayüzünden, ZATEN TOPLULAŞTIRILMIŞ hâlde geliyor; Google eşiğin altında
 * kalan sorguları hiç vermiyor (kendi k-anonimlik uygulaması).
 *
 * Yani burada yeni bir kişisel veri işleme YOK: kendi mülkümüz hakkında,
 * kendi hesabımızdan, toplu bir rapor okuyoruz. Ziyaretçiden hiçbir şey
 * toplanmıyor, hiçbir çerez yazılmıyor, Katman B ile ilgisi yok.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ ANAHTAR YOKSA BÖLÜM SAYI UYDURMAZ. Yapılandırma eksikse rapor
 * `yapilandirilmadi` döner ve panel ne eksik olduğunu YAZAR. Boş bir tablo
 * ya da sıfırlarla dolu bir liste, "arama trafiği yok" gibi okunur —
 * oysa doğru cevap "bakamıyoruz".
 *
 * ⚠️ `NEXT_PUBLIC_` YASAĞI (CLAUDE.md 7b): bu değişkenler ön eksiz ve
 * yalnızca sunucuda okunuyor. Servis hesabı anahtarı istemciye inerse
 * Search Console hesabının tamamı ele geçer.
 *
 * Gerekli yapılandırma:
 *   ARAMA_KONSOLU_SITE          — örn. `sc-domain:aslihangyd.com`
 *   ARAMA_KONSOLU_SERVIS_HESABI — servis hesabı JSON anahtarı (tek satır)
 *
 * Kurulum: Search Console → Ayarlar → Kullanıcılar ve izinler → servis
 * hesabının e-postasını "Tam" olmayan, salt okunur yetkiyle ekleyin.
 */

import { createSign } from 'node:crypto'

export interface AramaSorgusu {
  sorgu: string
  tiklama: number
  gosterim: number
  /** Tıklama / gösterim — Google'ın kendi hesabı. */
  tiklamaOrani: number
  /** Ortalama sıra — küçük olan iyidir. */
  siraOrtalamasi: number
}

export type AramaKonsoluRaporu =
  | { durum: 'yapilandirilmadi'; eksik: string[] }
  | { durum: 'hata'; mesaj: string }
  | { durum: 'tamam'; sorgular: AramaSorgusu[]; toplamTiklama: number; toplamGosterim: number }

interface ServisHesabi {
  client_email: string
  private_key: string
}

/**
 * ⚠️ Yapılandırma ÇALIŞMA ZAMANINDA okunuyor, modül yüklenirken değil.
 *
 * Derleme anında okunsaydı CI'da tanımsız olan değişken imaja `undefined`
 * olarak gömülürdü — `NEXT_PUBLIC_` tuzağının ön eksiz hâli.
 */
function yapilandirma(): { site: string | null; hesap: ServisHesabi | null; eksik: string[] } {
  const eksik: string[] = []

  const site = process.env.ARAMA_KONSOLU_SITE?.trim() ?? ''
  if (site === '') eksik.push('ARAMA_KONSOLU_SITE')

  let hesap: ServisHesabi | null = null
  const ham = process.env.ARAMA_KONSOLU_SERVIS_HESABI?.trim() ?? ''
  if (ham === '') {
    eksik.push('ARAMA_KONSOLU_SERVIS_HESABI')
  } else {
    try {
      const cozulmus = JSON.parse(ham) as Partial<ServisHesabi>
      if (typeof cozulmus.client_email === 'string' && typeof cozulmus.private_key === 'string') {
        hesap = { client_email: cozulmus.client_email, private_key: cozulmus.private_key }
      } else {
        eksik.push('ARAMA_KONSOLU_SERVIS_HESABI (client_email/private_key yok)')
      }
    } catch {
      eksik.push('ARAMA_KONSOLU_SERVIS_HESABI (geçersiz JSON)')
    }
  }

  return { site: site === '' ? null : site, hesap, eksik }
}

function base64Url(veri: string | Buffer): string {
  return Buffer.from(veri)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Servis hesabı JWT'si — Google'ın OAuth2 "jwt-bearer" akışı.
 *
 * ⚠️ HAZIR KÜTÜPHANE EKLENMEDİ. `googleapis` paketi bu tek çağrı için
 * onlarca megabayt ve yüzlerce geçişli bağımlılık getiriyor; ihtiyacımız
 * olan şey imzalanmış bir JWT ve bir `fetch`. Node'un yerleşik `crypto`
 * modülü ikisini de karşılıyor (CLAUDE.md: "Başka kütüphane ekleme").
 */
function jwtUret(hesap: ServisHesabi, an = Math.floor(Date.now() / 1000)): string {
  const baslik = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const govde = base64Url(
    JSON.stringify({
      iss: hesap.client_email,
      // ⚠️ Salt okunur kapsam: bu anahtar hiçbir şeyi değiştiremez.
      scope: 'https://www.googleapis.com/auth/webmasters.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: an,
      exp: an + 3600,
    }),
  )
  const imza = createSign('RSA-SHA256')
  imza.update(`${baslik}.${govde}`)
  return `${baslik}.${govde}.${base64Url(imza.sign(hesap.private_key))}`
}

async function jetonAl(hesap: ServisHesabi): Promise<string> {
  const yanit = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwtUret(hesap),
    }),
  })
  if (!yanit.ok) throw new Error(`jeton alınamadı (${yanit.status})`)
  const govde = (await yanit.json()) as { access_token?: unknown }
  if (typeof govde.access_token !== 'string') throw new Error('jeton yanıtı beklenen biçimde değil')
  return govde.access_token
}

/** `YYYY-AA-GG` — Search Console tarihleri UTC bekliyor. */
function tarih(gunOnce: number): string {
  const t = new Date()
  t.setUTCDate(t.getUTCDate() - gunOnce)
  return t.toISOString().slice(0, 10)
}

/**
 * Arama kelimelerini getirir.
 *
 * ⚠️ HATA YUTULUYOR AMA GİZLENMİYOR. Google'a yapılan çağrı düşerse panel
 * "hata" durumunu ve mesajı gösteriyor. Sessizce boş liste dönmek, veri
 * olmadığıyla erişilemediğini aynı görüntüye sokardı.
 *
 * ⚠️ İki gün geriden başlıyor: Search Console verisi 2–3 gün gecikmeli
 * yayınlanıyor. Bugünü istemek her seferinde boş liste döndürürdü.
 */
export async function aramaKelimeleriniGetir(gunSayisi = 28): Promise<AramaKonsoluRaporu> {
  const { site, hesap, eksik } = yapilandirma()
  if (site === null || hesap === null) return { durum: 'yapilandirilmadi', eksik }

  try {
    const jeton = await jetonAl(hesap)
    const uc = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`

    const yanit = await fetch(uc, {
      method: 'POST',
      headers: { authorization: `Bearer ${jeton}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        startDate: tarih(gunSayisi + 2),
        endDate: tarih(2),
        dimensions: ['query'],
        rowLimit: 25,
      }),
    })
    if (!yanit.ok) return { durum: 'hata', mesaj: `Search Console ${yanit.status} döndü.` }

    const govde = (await yanit.json()) as {
      rows?: {
        keys?: string[]
        clicks?: number
        impressions?: number
        ctr?: number
        position?: number
      }[]
    }

    const sorgular: AramaSorgusu[] = (govde.rows ?? []).map((satir) => ({
      sorgu: satir.keys?.[0] ?? '(bilinmiyor)',
      tiklama: Math.round(satir.clicks ?? 0),
      gosterim: Math.round(satir.impressions ?? 0),
      tiklamaOrani: Math.round((satir.ctr ?? 0) * 1000) / 10,
      siraOrtalamasi: Math.round((satir.position ?? 0) * 10) / 10,
    }))

    return {
      durum: 'tamam',
      sorgular,
      toplamTiklama: sorgular.reduce((t, s) => t + s.tiklama, 0),
      toplamGosterim: sorgular.reduce((t, s) => t + s.gosterim, 0),
    }
  } catch (hata) {
    return { durum: 'hata', mesaj: hata instanceof Error ? hata.message : 'bilinmeyen hata' }
  }
}
