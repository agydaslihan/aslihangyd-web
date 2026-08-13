/**
 * Cloudflare Turnstile doğrulaması.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ YAPILANDIRILMIŞSA KAPI KAPALI ÇALIŞIR.
 *
 * `TURNSTILE_GIZLI_ANAHTAR` tanımlıysa doğrulama ZORUNLUDUR: jeton yoksa,
 * geçersizse ya da Cloudflare'e ulaşılamıyorsa gönderim reddedilir.
 * "Servise ulaşamadım, geçir" davranışı, korumayı kapatmanın en kolay
 * yolunu (Cloudflare'i engellemek) saldırgana hediye ederdi.
 *
 * Anahtar tanımlı DEĞİLSE doğrulama atlanır ve widget hiç render edilmez.
 * Aslıhan hesabı açana kadar formun çalışmaması, kimsenin başvuramaması
 * demek olurdu. Bu durum docs/SENDEN-BEKLENENLER.md içinde açıkça yazılı.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ Gizli anahtar yalnızca sunucuda okunur (CLAUDE.md kural 7). Site
 * anahtarı `NEXT_PUBLIC_` önekiyle istemciye gider — o zaten herkese açık.
 */

import { ayar } from '@/lib/ayarlar'

const DOGRULAMA_ADRESI = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/** Cloudflare'in yanıt vermemesi durumunda beklenecek en uzun süre. */
const ZAMAN_ASIMI_MS = 6000

export interface TurnstileSonucu {
  gecerli: boolean
  /** Kullanıcıya gösterilecek Türkçe mesaj; geçerliyse `null`. */
  hata: string | null
}

/**
 * Turnstile site anahtarı — widget'a verilecek, herkese açık değer.
 *
 * ⚠️ ÖN EKSİZ VE BU BİLİNÇLİ.
 *
 * Anahtar ziyaretçiye görünür ama `NEXT_PUBLIC_` öneki **gerektirmez.**
 * Önek, değeri derleme anında pakete gömer; üretim imajımız bu değişkenler
 * tanımlı değilken derlendiği için anahtar yayında boş dizeydi ve
 * `turnstileEtkinMi()` daima `false` dönüyordu — yani danışman başvuru
 * formu üretimde bot korumasız çalışıyordu.
 *
 * ⚠️ Bu fonksiyon SUNUCUDA çağrılır; değeri istemci bileşenine prop olarak
 * iner (bkz. `app/(site)/danisman-ol/page.tsx` → `BasvuruFormu`).
 * Gerekçenin tamamı `lib/harita/sunucu.ts` içinde.
 */
export function turnstileSiteAnahtari(): string {
  return ayar('TURNSTILE_SITE_ANAHTARI')
}

function gizliAnahtar(): string {
  return process.env.TURNSTILE_GIZLI_ANAHTAR ?? ''
}

/** Turnstile bu ortamda etkin mi? Etkin değilse widget da render edilmez. */
export function turnstileEtkinMi(): boolean {
  return gizliAnahtar().trim() !== '' && turnstileSiteAnahtari().trim() !== ''
}

/**
 * Cloudflare yanıtının ihtiyacımız olan kısmı.
 * `error-codes` günlüğe yazılmaz — içinde site anahtarı geçebiliyor.
 */
interface CloudflareYaniti {
  success?: boolean
}

export async function turnstileDogrula(
  jeton: string | null | undefined,
  istemciIp?: string | null,
): Promise<TurnstileSonucu> {
  if (!turnstileEtkinMi()) {
    // Yapılandırılmamış: kapı yok. Bal küpü ve hız sınırı devrede kalır.
    return { gecerli: true, hata: null }
  }

  if (typeof jeton !== 'string' || jeton.trim() === '') {
    return {
      gecerli: false,
      hata: 'Güvenlik doğrulaması tamamlanmadı. Sayfayı yenileyip tekrar deneyin.',
    }
  }

  const govde = new URLSearchParams({ secret: gizliAnahtar(), response: jeton })
  if (istemciIp) govde.set('remoteip', istemciIp)

  try {
    const yanit = await fetch(DOGRULAMA_ADRESI, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: govde,
      signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
      cache: 'no-store',
    })

    if (!yanit.ok) {
      return { gecerli: false, hata: DOGRULAMA_HATASI }
    }

    const veri = (await yanit.json()) as CloudflareYaniti
    return veri.success === true
      ? { gecerli: true, hata: null }
      : {
          gecerli: false,
          hata: 'Güvenlik doğrulaması geçilemedi. Sayfayı yenileyip tekrar deneyin.',
        }
  } catch {
    // ⚠️ Kapalı kapı. Ayrıntı sızdırılmaz.
    return { gecerli: false, hata: DOGRULAMA_HATASI }
  }
}

const DOGRULAMA_HATASI =
  'Güvenlik doğrulaması şu an yapılamıyor. Birkaç dakika sonra tekrar deneyin ya da ' +
  "bize WhatsApp'tan yazın."
