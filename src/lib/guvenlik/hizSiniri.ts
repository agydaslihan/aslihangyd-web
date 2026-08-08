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
 * Ters vekilin yazdığı, güvenilen istemci IP başlıkları.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ SIRALAMA VE LİSTE GÜVENLİK KARARIDIR.
 *
 * Site Cloudflare arkasında yayında. Uzak adres HER
 * istekte bir Cloudflare IP'si görünür; düzeltilmezse hız sınırlayıcı
 * bütün ziyaretçileri tek kişi sanar ve siteyi HERKESE kapatır.
 *
 * Caddy `trusted_proxies` + `client_ip_headers CF-Connecting-IP` ile
 * gerçek adresi hesaplar ve bu iki başlığın ÜZERİNE YAZAR
 * (`header_up`, bkz. docker/Caddyfile). Üzerine yazma kritik: doğrudan
 * origin'e bağlanıp sahte bir CF-Connecting-IP gönderen birinin değeri
 * uygulamaya ulaşmaz.
 *
 * ⚠️ `x-forwarded-for` BİLİNÇLİ OLARAK LİSTEDE YOK.
 *
 * Caddy o başlığa gelen değeri korur ve sonuna kendi gördüğü adresi
 * ekler. Yani `X-Forwarded-For: 1.2.3.4` gönderen biri için başlık
 * `1.2.3.4, <gerçek>` olur ve ilk sıradaki değeri okumak, saldırganın
 * seçtiği anahtarı kullanmak demektir — hız sınırı tek istekle atlatılır.
 * Eski sürüm tam olarak bunu yapıyordu.
 * ─────────────────────────────────────────────────────────────────────────
 */
const GUVENILEN_IP_BASLIKLARI = ['cf-connecting-ip', 'x-real-ip'] as const

/**
 * İstek başlıklarından istemci IP'sini okur.
 *
 * ⚠️ IP adresi kişisel veridir. SAKLANMIYOR: yalnızca bellekteki sayacın
 * anahtarı olarak kullanılıyor ve pencere dolunca siliniyor.
 * Veritabanına, günlüğe ya da e-postaya yazılmıyor.
 *
 * Adres belirlenemezse `null` döner — "bilinmeyen" diye ortak bir kovaya
 * yazmaz. Gerekçe `istemciAnahtari` üzerinde.
 */
export function istemciIpsi(basliklar: Headers): string | null {
  for (const baslik of GUVENILEN_IP_BASLIKLARI) {
    const deger = basliklar.get(baslik)?.trim()
    if (deger !== undefined && deger !== '') return deger
  }
  return null
}

/**
 * Hız sınırı anahtarı. IP belirlenemezse `null`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ IP BİLİNMİYORSA HIZ SINIRI UYGULANMAZ — bilinçli bir takas.
 *
 * Önceki sürüm bu durumda `bilinmeyen` sabitine düşüyordu. Sonuç:
 * ziyaretçilerin tamamı tek kovada toplanır ve beşinci form gönderiminden
 * sonra form HERKESE kapanır. Yani vekil yapılandırmasındaki bir hata,
 * doğrudan bir hizmet kesintisine dönüşür.
 *
 * Açık kapı bırakmak burada daha az kötü: form gönderiminde bal küpü ve
 * (yapılandırıldığında) Turnstile katmanları duruyor, ikisi de IP'ye
 * bağlı değil. Kapalı kapı ise gerçek kullanıcıları dışarıda bırakır.
 *
 * Bu durum üretimde HİÇ olmamalı; olursa `hizSiniriDurumu` ile görünür
 * kılınır (docs/ISLETME-REHBERI.md §5.5 doğrulama adımı).
 * ─────────────────────────────────────────────────────────────────────────
 */
export function istemciAnahtari(basliklar: Headers, onEk: string): string | null {
  const ip = istemciIpsi(basliklar)
  return ip === null ? null : `${onEk}:${ip}`
}
