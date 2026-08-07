/**
 * Hız sınırı (rate limiting).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ SÜREÇ İÇİ SAYAÇ — Redis DEĞİL. Sınırı bilerek yazıyorum:
 *
 * · Sunucu yeniden başlarsa sayaçlar sıfırlanır.
 * · Birden fazla uygulama örneği çalışırsa her biri kendi sayacını tutar.
 *
 * Bu proje tek bir uygulama kabında (3,2 GB RAM / 2 vCPU) çalışıyor ve
 * korunan şey bir form gönderimi; kaçırılan birkaç istek felaket değil.
 * Redis istemcisi eklemek bağımlılık, bellek ve bir hata yüzeyi daha
 * demekti. Yatay ölçeklendiğimiz gün Redis'e taşınmalı — o zaman bu yorum
 * değişikliğin gerekçesi olur.
 *
 * Kapı bal küpünün YERİNE değil YANINA konuyor: bal küpü aptal botları,
 * hız sınırı ısrarlı olanı durdurur.
 * ─────────────────────────────────────────────────────────────────────────
 */

export interface HizSiniriAyari {
  /** Pencere içinde izin verilen istek sayısı. */
  adet: number
  /** Pencere uzunluğu (ms). */
  pencereMs: number
}

export interface HizSiniriSonucu {
  gecebilir: boolean
  /** Pencerede kalan hak. */
  kalan: number
  /** Sınır aşıldıysa kaç saniye sonra tekrar denenebilir. */
  yenidenDeneSaniye: number
}

interface Kayit {
  sayac: number
  /** Pencerenin bitiş zamanı (ms, epoch). */
  bitis: number
}

/**
 * Form gönderimleri için varsayılan.
 *
 * 5 dakikada 5 gönderim: gerçek bir başvurucu formu bir kez, hata yaparsa
 * iki-üç kez gönderir. Bu eşik onu hiç rahatsız etmez, betikle deneyeni
 * ise hemen durdurur.
 */
export const FORM_SINIRI: HizSiniriAyari = { adet: 5, pencereMs: 5 * 60_000 }

const kayitlar = new Map<string, Kayit>()

/**
 * Süresi dolmuş kayıtları temizler.
 *
 * Zamanlayıcı yerine her çağrıda tembel temizlik: `setInterval` sunucusuz
 * ortamlarda çalışmaz ve testlerde sızıntı yapar. Harita, korunan uç
 * sayısıyla sınırlı kaldığı için taramanın maliyeti ihmal edilebilir.
 */
function suresiDolanlariSil(simdi: number): void {
  for (const [anahtar, kayit] of kayitlar) {
    if (kayit.bitis <= simdi) kayitlar.delete(anahtar)
  }
}

/**
 * Bir anahtarın hakkını tüketir.
 *
 * `simdi` dışarıdan alınabiliyor ki test gerçek zamana bağlı olmasın.
 */
export function hizSinirindaMi(
  anahtar: string,
  ayar: HizSiniriAyari = FORM_SINIRI,
  simdi: number = Date.now(),
): HizSiniriSonucu {
  suresiDolanlariSil(simdi)

  const mevcut = kayitlar.get(anahtar)

  if (mevcut === undefined || mevcut.bitis <= simdi) {
    kayitlar.set(anahtar, { sayac: 1, bitis: simdi + ayar.pencereMs })
    return { gecebilir: true, kalan: ayar.adet - 1, yenidenDeneSaniye: 0 }
  }

  if (mevcut.sayac >= ayar.adet) {
    return {
      gecebilir: false,
      kalan: 0,
      yenidenDeneSaniye: Math.max(1, Math.ceil((mevcut.bitis - simdi) / 1000)),
    }
  }

  mevcut.sayac += 1
  return { gecebilir: true, kalan: ayar.adet - mevcut.sayac, yenidenDeneSaniye: 0 }
}

/** Testler ve geliştirme için — üretim akışında çağrılmaz. */
export function hizSinirlariniSifirla(): void {
  kayitlar.clear()
}

/**
 * İstek başlıklarından kaba bir istemci kimliği üretir.
 *
 * ⚠️ IP adresi kişisel veridir. Burada SAKLANMIYOR: yalnızca bellekteki
 * sayacın anahtarı olarak kullanılıyor ve pencere dolunca siliniyor.
 * Veritabanına, günlüğe ya da e-postaya yazılmıyor.
 *
 * `x-forwarded-for` istemci tarafından uydurulabilir; ters vekil (Caddy)
 * başlığı kendi gördüğü adresle yeniden yazdığı için üretimde güvenilir.
 * Vekil olmayan bir ortamda hız sınırı atlatılabilir — bu, savunmanın
 * tek katmanı olmamasının bir başka sebebi.
 */
export function istemciAnahtari(basliklar: Headers, onEk: string): string {
  const iletilen = basliklar.get('x-forwarded-for')?.split(',')[0]?.trim()
  const gercek = basliklar.get('x-real-ip')?.trim()
  return `${onEk}:${iletilen || gercek || 'bilinmeyen'}`
}
