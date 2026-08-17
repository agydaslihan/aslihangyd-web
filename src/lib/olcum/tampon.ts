/**
 * Gözlem tamponu — istek başına veritabanı yazmayı engelleyen katman.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ŞARTNAMENİN SERT KURALI: SAYFA GÖRÜNTÜLEME BAŞINA `INSERT` YOK.
 *
 * Her istekte veritabanına yazmak, 2 vCPU / 3,2 GB'lık sunucuda ölçmek
 * istediğimiz şeyi bozardı: sayfa yavaşladığı için yanıt süresi metriği
 * kendi ölçümünün yan etkisini gösterirdi.
 *
 * Sayaçlar bellekte toplanıyor, periyodik olarak tek seferde yazılıyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ NEDEN REDIS DEĞİL — ölçülerek karar verildi, tercih değil.
 *
 * Şartname "Redis'te toplulaştır" diyor ve `compose.prod.yml` içinde bir
 * Redis servisi var. Ama o servis bu iş için elverişli DEĞİL:
 *
 *     --save ''            → disk kaydı yok, yeniden başlatmada her şey gider
 *     --appendonly no      → günlük yok
 *     --maxmemory 96mb
 *     --maxmemory-policy allkeys-lru  → bellek dolunca ANAHTAR SİLİNİR
 *
 * Yani "gece veritabanına yaz" deseni bu yapılandırmayla günün sayaçlarını
 * sessizce kaybedebilirdi — en kötü arıza türü: panel dolu görünür, sayılar
 * eksiktir. Ayrıca uygulamada Redis istemcisi yok; eklemek yığın değişikliği
 * demek (CLAUDE.md: "Yığını değiştirmeden önce sor").
 *
 * Bunun yerine tampon süreç içinde tutuluyor ve **beş dakikada bir**
 * yazılıyor. Kayıp penceresi geceye kadar değil, beş dakika: kalıcılığı
 * olmayan bir Redis'ten daha güvenli, sıfır yeni bağımlılık.
 *
 * ⚠️ Sınırı da yazalım: uygulama tek kapsayıcı olarak çalışıyor
 * (`compose.prod.yml` → tek `uygulama` servisi). Yatay ölçeklenirse her
 * kopya kendi tamponunu tutar ve toplamlar bölünür. O gün gelirse çözüm
 * Redis'i KALICI yapılandırmakla başlar; `bosalt()` arayüzü aynen kalır.
 */

import 'server-only'

import type { CihazSinifi, Niyet } from './tipler'

/**
 * ⚠️ ANAHTAR SAYISI SINIRLI VE BU BİR GÜVENLİK ÖNLEMİ.
 *
 * Yönlendiren alan adı ve rota, dışarıdan gelen değerler. Sınırsız bir
 * `Map`, uydurma `Referer` başlıklarıyla doldurulup sunucunun belleğini
 * tüketebilirdi. Sınırı aşan her şey tek bir "diğer" kovasına düşüyor:
 * sayım doğru kalıyor, ayrıntı kayboluyor.
 */
export const AZAMI_ANAHTAR = 400
export const DIGER = 'diger'

/** Tampon bu aralıkla boşaltılıyor. */
/**
 * Tampon bu aralıkla boşaltılıyor.
 *
 * ⚠️ BİR DAKİKA, BEŞ DEĞİL — ölçülerek indirildi.
 *
 * Kapanış boşaltmasının GÜVENİLİR OLMADIĞI ölçümle görüldü: `SIGTERM`
 * geldiğinde Next kendi kapatma kancasını da çalıştırıyor ve süreç, bizim
 * asenkron yazmamız bitmeden sonlanıyor. Günlükte "kapanış boşaltması"
 * satırı görünüyor ama veritabanı değişmiyordu.
 *
 * Dolayısıyla tek gerçek güvence bu aralık. Beş dakikada temiz olmayan bir
 * yeniden başlatma beş dakikalık sayacı götürürdü; bir dakika, bu ölçekte
 * ihmal edilebilir bir yazma yüküyle kaybı beşte bire indiriyor.
 */
export const BOSALTMA_ARALIGI_MS = 60_000

function artir(kova: Map<string, number>, anahtar: string, adet = 1): void {
  if (!kova.has(anahtar) && kova.size >= AZAMI_ANAHTAR) {
    kova.set(DIGER, (kova.get(DIGER) ?? 0) + adet)
    return
  }
  kova.set(anahtar, (kova.get(anahtar) ?? 0) + adet)
}

export interface SureOzeti {
  toplamMs: number
  adet: number
  enYavasMs: number
}

export interface TamponIcerigi {
  /** Gün anahtarı (YYYY-AA-GG, Europe/Istanbul). */
  gun: string
  sayfaGoruntuleme: Map<string, number>
  yonlendiren: Map<string, number>
  cihaz: Map<CihazSinifi, number>
  ulke: Map<string, number>
  utmKaynak: Map<string, number>
  /** Rota başına yanıt süresi toplamı. */
  sure: Map<string, SureOzeti>
  /** Rota başına 5xx/4xx sayısı. */
  hata: Map<string, number>
  /** Katman B: olay adı → adet. */
  olay: Map<string, number>
  /** Katman B: niyet sınıfı → adet. */
  niyet: Map<Niyet, number>
  /** Katman B olayı gönderen istek sayısı — onay oranının payı. */
  onayliIstek: number
  /** Katman A'da görülen toplam istek — onay oranının paydası. */
  toplamIstek: number
}

function bosIcerik(gun: string): TamponIcerigi {
  return {
    gun,
    sayfaGoruntuleme: new Map(),
    yonlendiren: new Map(),
    cihaz: new Map(),
    ulke: new Map(),
    utmKaynak: new Map(),
    sure: new Map(),
    hata: new Map(),
    olay: new Map(),
    niyet: new Map(),
    onayliIstek: 0,
    toplamIstek: 0,
  }
}

/**
 * Gün anahtarı — Europe/Istanbul.
 *
 * ⚠️ UTC KULLANILMIYOR. Aslıhan'ın "dün" dediği gün yerel gündür; UTC'ye
 * göre bölünen bir rapor, akşam 21:00'deki bir lead'i ertesi güne yazardı
 * ve haftalık karşılaştırma sessizce kayardı.
 */
export function gunAnahtari(an: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(an)
}

/**
 * ⚠️ Modül düzeyinde durum — ve `globalThis` üzerinden.
 *
 * Geliştirmede Next modülleri sıcak yeniden yüklüyor; sade bir modül
 * değişkeni her yeniden yüklemede sıfırlanır ve tampon sessizce boşalırdı.
 */
const KUTU = globalThis as typeof globalThis & { __gozlemTamponu?: TamponIcerigi }

function tampon(): TamponIcerigi {
  const gun = gunAnahtari()
  if (KUTU.__gozlemTamponu === undefined || KUTU.__gozlemTamponu.gun !== gun) {
    // Gün döndüyse eldeki içerik boşaltılmadan kaybolmasın diye burada
    // DEĞİŞTİRİLMİYOR; `bosalt()` çağrısı gün sınırını da taşıyor.
    KUTU.__gozlemTamponu = KUTU.__gozlemTamponu ?? bosIcerik(gun)
  }
  return KUTU.__gozlemTamponu
}

export interface SayfaKaydi {
  rota: string
  yonlendiren: string
  cihaz: CihazSinifi
  ulke: string
  utmKaynak: string | null
  sureMs: number
  hataMi: boolean
}

/** Katman A — her ziyaretçi, çerezsiz, IP'siz. */
export function sayfaSay(kayit: SayfaKaydi): void {
  const t = tampon()

  t.toplamIstek += 1
  artir(t.sayfaGoruntuleme, kayit.rota)
  artir(t.yonlendiren, kayit.yonlendiren)
  artir(t.ulke, kayit.ulke)
  t.cihaz.set(kayit.cihaz, (t.cihaz.get(kayit.cihaz) ?? 0) + 1)
  if (kayit.utmKaynak !== null) artir(t.utmKaynak, kayit.utmKaynak)
  if (kayit.hataMi) artir(t.hata, kayit.rota)

  const once = t.sure.get(kayit.rota)
  if (once === undefined) {
    if (t.sure.size < AZAMI_ANAHTAR) {
      t.sure.set(kayit.rota, { toplamMs: kayit.sureMs, adet: 1, enYavasMs: kayit.sureMs })
    }
  } else {
    once.toplamMs += kayit.sureMs
    once.adet += 1
    once.enYavasMs = Math.max(once.enYavasMs, kayit.sureMs)
  }
}

/**
 * Olay kovasının anahtarı.
 *
 * ⚠️ Ayrıntı alanı `|` içeremez: anahtar bu karakterle ayrılıyor ve yazıcı
 * aynı yerden bölüyor. Ayrıştırma tek yerde tanımlı olsun diye ayırıcı da,
 * kurma da, bölme de burada.
 */
export const OLAY_AYIRICI = '|'

export function olayAnahtari(ad: string, ayrinti: string | null, niyet: Niyet): string {
  const temiz = (ayrinti ?? '').replaceAll(OLAY_AYIRICI, '/')
  return [ad, temiz, niyet].join(OLAY_AYIRICI)
}

export function olayAnahtariniCoz(anahtar: string): {
  ad: string
  ayrinti: string | null
  niyet: string
} {
  const [ad = '', ayrinti = '', niyet = ''] = anahtar.split(OLAY_AYIRICI)
  return { ad, ayrinti: ayrinti === '' ? null : ayrinti, niyet }
}

/** Katman B — yalnızca analitik onayı verilmiş isteklerden gelir. */
export function olaySay(ad: string, ayrinti: string | null, niyet: Niyet, adet = 1): void {
  const t = tampon()
  artir(t.olay, olayAnahtari(ad, ayrinti, niyet), adet)
  t.niyet.set(niyet, (t.niyet.get(niyet) ?? 0) + adet)
}

/**
 * Hata sayacı — `instrumentation.ts` içindeki `onRequestError`'dan gelir.
 *
 * ⚠️ Proxy katmanında sayılamıyor: orada yanıt henüz üretilmemiş oluyor ve
 * durum kodu bilinmiyor. Ayrı bir kancadan gelmesinin sebebi bu.
 */
export function hataSay(rota: string): void {
  artir(tampon().hata, rota)
}

/** Onay oranının payı — Katman B'nin çalıştığı istek sayısı. */
export function onayliIstekSay(): void {
  tampon().onayliIstek += 1
}

/**
 * Tamponu boşaltır ve içeriğini döner.
 *
 * ⚠️ Önce yeni tampon kuruluyor, sonra eski içerik dönülüyor. Ters sırada
 * yapılsaydı yazma sürerken gelen istekler boşaltılmış içeriğe eklenir ve
 * kaybolurdu.
 */
export function bosalt(): TamponIcerigi | null {
  const eski = KUTU.__gozlemTamponu
  if (eski === undefined) return null
  if (eski.toplamIstek === 0 && eski.olay.size === 0) return null

  KUTU.__gozlemTamponu = bosIcerik(gunAnahtari())
  return eski
}

/** Yalnızca test için: tamponu sıfırlar. */
export function tamponuSifirla(): void {
  KUTU.__gozlemTamponu = undefined
}

/** Yalnızca test için: mevcut içeriği okur (boşaltmadan). */
export function tamponuOku(): TamponIcerigi | undefined {
  return KUTU.__gozlemTamponu
}
