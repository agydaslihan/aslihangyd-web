/**
 * Güneş konumu hesabı — NOAA Solar Position Algorithm.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ DIŞ API YOK VE OLMAYACAK.
 *
 * Güneşin konumu koordinat ve tarihten hesaplanabilir; bunun için bir
 * servise para ödemek, ziyaretçinin konumunu üçüncü tarafa göndermek
 * (KVKK) ve siteyi o servisin çalışmasına bağlamak gerekmez. Hesap saf,
 * çevrimdışı ve milisaniyeler içinde.
 *
 * Kaynak: NOAA Global Monitoring Laboratory, Solar Calculation Details.
 * Aynı formüller NOAA'nın kendi hesaplayıcısında kullanılıyor.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ SAAT DİLİMİ SABİT UTC+3 — YAZ SAATİ YOK.
 *
 * Türkiye 2016'da yaz saati uygulamasını kaldırdı ve kalıcı olarak UTC+3'e
 * geçti. `Intl` ile dinamik çözmek yerine sabit ofset kullanmak burada
 * DAHA doğru: sunucu hangi saat diliminde olursa olsun sonuç aynı, ve
 * `Europe/Istanbul` verisi bir gün değişse bile hesap sessizce kaymaz.
 *
 * ⚠️ Bu sabit değişirse (Türkiye yaz saatine dönerse) burası tek değişecek
 * yer — ve o gün fark edilmesi için testlerde açıkça sınanıyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ HESAP COĞRAFİDİR.
 *
 * Komşu bina gölgesi, ağaç, balkon çıkması, tepe/vadi ufku hesaba
 * KATILMAZ. Bu kısıt ekranda ziyaretçiye açıkça yazılıyor
 * (`GUNES_KISIT_METNI`); bir yatırım sitesinde "günde 6 saat güneş alır"
 * demek, arkasındaki varsayımı söylemeden yapılamaz.
 */

/** Türkiye'nin sabit saat dilimi ofseti (saat). */
export const TURKIYE_UTC_OFSETI = 3

/** Ekranda güneş verisinin yanında görünmek zorunda olan kısıt metni. */
export const GUNES_KISIT_METNI =
  'Hesaplama coğrafi konuma dayanır; çevre yapıların, ağaçların ve balkon ' +
  'çıkmalarının gölgeleme etkisi dahil değildir.'

const DERECE = Math.PI / 180

function derece(radyan: number): number {
  return radyan / DERECE
}
function radyan(derece: number): number {
  return derece * DERECE
}

/**
 * Verilen tarihin Julian günü (UTC gün ortası referanslı).
 *
 * Tarih yalnızca YIL-AY-GÜN olarak kullanılıyor; saat bilgisi güneş
 * açılarını gün içinde ayrıca hesaplarken devreye giriyor.
 */
export function julianGun(yil: number, ay: number, gun: number): number {
  let y = yil
  let a = ay
  if (a <= 2) {
    y -= 1
    a += 12
  }
  const A = Math.floor(y / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (a + 1)) + gun + B - 1524.5
}

/** J2000'den bu yana geçen Julian yüzyıl. */
function julianYuzyil(jd: number): number {
  return (jd - 2451545) / 36525
}

/* ── Güneşin gökyüzündeki konumu ────────────────────────────────────────── */

function ortalamaBoylam(t: number): number {
  return (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360
}

function ortalamaAnomali(t: number): number {
  return 357.52911 + t * (35999.05029 - 0.0001537 * t)
}

function eksantriklik(t: number): number {
  return 0.016708634 - t * (0.000042037 + 0.0000001267 * t)
}

function merkezDenklemi(t: number): number {
  const m = radyan(ortalamaAnomali(t))
  return (
    Math.sin(m) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * m) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * m) * 0.000289
  )
}

function gercekBoylam(t: number): number {
  return ortalamaBoylam(t) + merkezDenklemi(t)
}

function gorunurBoylam(t: number): number {
  return gercekBoylam(t) - 0.00569 - 0.00478 * Math.sin(radyan(125.04 - 1934.136 * t))
}

function ortalamaEgiklik(t: number): number {
  const saniye = 21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))
  return 23 + (26 + saniye / 60) / 60
}

function duzeltilmisEgiklik(t: number): number {
  return ortalamaEgiklik(t) + 0.00256 * Math.cos(radyan(125.04 - 1934.136 * t))
}

/** Güneşin deklinasyonu (derece). */
export function deklinasyon(t: number): number {
  return derece(
    Math.asin(Math.sin(radyan(duzeltilmisEgiklik(t))) * Math.sin(radyan(gorunurBoylam(t)))),
  )
}

/** Zaman denklemi (dakika) — gerçek güneş saati ile ortalama saat farkı. */
export function zamanDenklemi(t: number): number {
  const e = radyan(duzeltilmisEgiklik(t))
  const l0 = radyan(ortalamaBoylam(t))
  const m = radyan(ortalamaAnomali(t))
  const ecc = eksantriklik(t)

  const y = Math.tan(e / 2) ** 2

  const denklem =
    y * Math.sin(2 * l0) -
    2 * ecc * Math.sin(m) +
    4 * ecc * y * Math.sin(m) * Math.cos(2 * l0) -
    0.5 * y * y * Math.sin(4 * l0) -
    1.25 * ecc * ecc * Math.sin(2 * m)

  return 4 * derece(denklem)
}

/**
 * Gün doğumu / batımı için saat açısı (derece).
 *
 * ⚠️ `-0.833°` bilinçli: güneşin merkezi değil ÜST KENARI ufka değdiğinde
 * doğmuş sayılır (yarıçap ~0.266°) ve atmosferik kırılma güneşi ~0.567°
 * yukarıda gösterir. NOAA'nın kullandığı standart değer.
 *
 * Kutup gündüzü/gecesi durumunda `Math.acos` tanım kümesi dışına çıkar;
 * `null` dönüyor ve çağıran bunu "o gün doğmuyor/batmıyor" diye
 * yorumluyor. Çorlu için gerçekleşmez ama fonksiyon sessizce `NaN`
 * üretmemeli.
 */
export function saatAcisi(enlem: number, dekl: number): number | null {
  const zenit = radyan(90.833)
  const oran =
    Math.cos(zenit) / (Math.cos(radyan(enlem)) * Math.cos(radyan(dekl))) -
    Math.tan(radyan(enlem)) * Math.tan(radyan(dekl))

  if (oran > 1 || oran < -1) return null
  return derece(Math.acos(oran))
}

export interface GunesGunu {
  /** Gün doğumu — yerel saat, "06:14" biçiminde. `null` ise o gün doğmuyor. */
  gunDogumu: string | null
  gunBatimi: string | null
  /** Gündüz süresi (dakika). `null` ise hesaplanamıyor. */
  gunduzDakika: number | null
  /** Öğle vakti güneşin ufuktan yüksekliği (derece). */
  ogleYuksekligi: number
  /** Güneşin gün içindeki yörüngesi — grafik ve cephe analizi için. */
  yorunge: YorungeNoktasi[]
}

export interface YorungeNoktasi {
  dakika: number
  /** Ufuktan yükseklik (derece). Negatif = güneş batmış. */
  yukseklik: number
  /**
   * Azimut (derece) — KUZEYDEN saat yönünde. 0 = kuzey, 90 = doğu,
   * 180 = güney, 270 = batı.
   *
   * ⚠️ Cephe analizi buna dayanıyor; sıfır noktası kuzey değil güney
   * alınsaydı tüm cephe hesabı 180° kayardı ve "güney cephe" diye
   * kuzeyi gösterirdik.
   */
  azimut: number
}

/** Dakikayı "HH:MM" biçimine çevirir. */
function saatYaz(dakika: number): string {
  const toplam = Math.round(dakika)
  const saat = Math.floor(toplam / 60) % 24
  const dk = ((toplam % 60) + 60) % 60
  return `${String(saat).padStart(2, '0')}:${String(dk).padStart(2, '0')}`
}

/**
 * Belirli bir gün ve konum için güneş verileri.
 *
 * @param enlem  Kuzey pozitif.
 * @param boylam Doğu pozitif.
 */
export function gunesGunu(enlem: number, boylam: number, tarih: Date): GunesGunu {
  const jd = julianGun(tarih.getUTCFullYear(), tarih.getUTCMonth() + 1, tarih.getUTCDate())
  const t = julianYuzyil(jd)

  const dekl = deklinasyon(t)
  const zd = zamanDenklemi(t)

  /**
   * Güneş öğlesi (yerel saat, dakika).
   *
   * ⚠️ Boylam düzeltmesi şart: Çorlu 27,8° doğuda ama saat dilimi 45°
   * (UTC+3) üzerinden işliyor. Aradaki fark ~69 dakika ve ihmal edilirse
   * gün doğumu bir saatten fazla kayardı.
   */
  const ogle = 720 - 4 * boylam - zd + TURKIYE_UTC_OFSETI * 60

  const acisi = saatAcisi(enlem, dekl)
  const gunDogumuDk = acisi === null ? null : ogle - acisi * 4
  const gunBatimiDk = acisi === null ? null : ogle + acisi * 4

  return {
    gunDogumu: gunDogumuDk === null ? null : saatYaz(gunDogumuDk),
    gunBatimi: gunBatimiDk === null ? null : saatYaz(gunBatimiDk),
    gunduzDakika: acisi === null ? null : Math.round(acisi * 8),
    ogleYuksekligi: Math.round((90 - Math.abs(enlem - dekl)) * 10) / 10,
    yorunge: yorungeUret(enlem, boylam, dekl, zd),
  }
}

/**
 * Tek bir an için güneşin konumu — yörünge eğrisinin ve zaman çubuğunun
 * ortak çekirdeği.
 *
 * ⚠️ AYRI FONKSİYON OLMASI BİLİNÇLİ. Önce yalnızca 20 dakikalık örnekleme
 * vardı ve hesap döngünün içine gömülüydü. Zaman çubuğu saat başına
 * 12 örnek istiyor; aynı matematiği ikinci kez yazmak, iki yerin sessizce
 * ayrışmasına açık kapı bırakırdı — azimutun öğleden sonra düzeltmesi gibi
 * ince bir adım tek yerde kalmalı.
 *
 * @param dakika Gün başından itibaren YEREL dakika (UTC+3).
 */
function konumHesapla(
  enlem: number,
  boylam: number,
  dekl: number,
  zd: number,
  dakika: number,
): YorungeNoktasi {
  // Gerçek güneş zamanı (dakika), boylam ve zaman denklemi düzeltmeli.
  const gercekZaman = dakika + zd + 4 * boylam - TURKIYE_UTC_OFSETI * 60
  const saatAcisiDerece = gercekZaman / 4 - 180

  const zenitCos =
    Math.sin(radyan(enlem)) * Math.sin(radyan(dekl)) +
    Math.cos(radyan(enlem)) * Math.cos(radyan(dekl)) * Math.cos(radyan(saatAcisiDerece))

  const zenit = Math.acos(Math.max(-1, Math.min(1, zenitCos)))
  const yukseklik = 90 - derece(zenit)

  /**
   * Azimut — kuzeyden saat yönünde.
   *
   * ⚠️ `acos` yalnızca 0–180 aralığı veriyor; öğleden sonrayı ayırt
   * etmek için saat açısının işaretine bakmak şart. Bu adım atlanırsa
   * batı cephesi doğu sanılır — hesap "çalışır" ama tam ters sonuç verir.
   */
  const paydaSin = Math.sin(zenit) * Math.cos(radyan(enlem))
  let azimut = 180
  if (Math.abs(paydaSin) > 1e-9) {
    const oran = (Math.sin(radyan(dekl)) - Math.sin(radyan(enlem)) * Math.cos(zenit)) / paydaSin
    azimut = derece(Math.acos(Math.max(-1, Math.min(1, oran))))
    // Saat açısı pozitifse güneş batı yarısında.
    if (saatAcisiDerece > 0) azimut = 360 - azimut
  }

  return {
    dakika,
    yukseklik: Math.round(yukseklik * 10) / 10,
    azimut: Math.round(azimut * 10) / 10,
  }
}

/**
 * Gün içindeki yükseklik eğrisi — her 20 dakikada bir örnek.
 *
 * ⚠️ Örnek aralığı 20 dakika: 5 dakikalık çözünürlük SVG'de gözle ayırt
 * edilemiyor ama nokta sayısını dörde katlıyor. Eğri 72 noktayla
 * yeterince yumuşak.
 */
function yorungeUret(enlem: number, boylam: number, dekl: number, zd: number): YorungeNoktasi[] {
  const noktalar: YorungeNoktasi[] = []
  for (let dakika = 0; dakika < 1440; dakika += 20) {
    noktalar.push(konumHesapla(enlem, boylam, dekl, zd, dakika))
  }
  return noktalar
}

/**
 * Bir gün ve konum için, günün İSTENEN DAKİKALARINDA güneş konumu.
 *
 * Zaman çubuğu saat başına 12 örnek alıyor; her örnek için `gunesGunu`
 * çağırmak deklinasyon ve zaman denklemini 288 kez yeniden hesaplardı.
 * Bu ikisi gün boyunca sabit, bir kez hesaplanıp paylaşılıyor.
 */
export function gunKonumlari(
  enlem: number,
  boylam: number,
  tarih: Date,
  dakikalar: readonly number[],
): YorungeNoktasi[] {
  const jd = julianGun(tarih.getUTCFullYear(), tarih.getUTCMonth() + 1, tarih.getUTCDate())
  const t = julianYuzyil(jd)
  const dekl = deklinasyon(t)
  const zd = zamanDenklemi(t)

  return dakikalar.map((dakika) => konumHesapla(enlem, boylam, dekl, zd, dakika))
}
