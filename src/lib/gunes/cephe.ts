import { gunKonumlari, type YorungeNoktasi } from './hesap'

/**
 * Cephe yönüne göre doğrudan güneş alma süresi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ TÜRKİYE'DE "GÜNEY CEPHE" ALIM KARARININ MERKEZİNDE.
 *
 * Hiçbir emlak sitesi bunu veriyle göstermiyor; "güney cephe" bir ilan
 * cümlesi olarak geçiyor ve ne kadar güneş demek olduğu söylenmiyor.
 * Burada saat cinsinden karşılığı hesaplanıyor.
 *
 * ⚠️ CEPHE YÖNÜ GİRİLMEMİŞSE TAHMİN EDİLMEZ.
 *
 * Bir dairenin cephesi koordinattan çıkarılamaz. Bilinmiyorsa bu modül
 * hiç çağrılmaz ve arayüz boş durum gösterir — "muhtemelen güney" demek,
 * bu projede uydurma veri yasağının en pahalı ihlali olurdu: alım kararı
 * doğrudan bu bilgiye dayanıyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

export const CEPHE_YONLERI = [
  { value: 'kuzey', label: 'Kuzey', azimut: 0 },
  { value: 'kuzeydogu', label: 'Kuzeydoğu', azimut: 45 },
  { value: 'dogu', label: 'Doğu', azimut: 90 },
  { value: 'guneydogu', label: 'Güneydoğu', azimut: 135 },
  { value: 'guney', label: 'Güney', azimut: 180 },
  { value: 'guneybati', label: 'Güneybatı', azimut: 225 },
  { value: 'bati', label: 'Batı', azimut: 270 },
  { value: 'kuzeybati', label: 'Kuzeybatı', azimut: 315 },
] as const

export type CepheYonu = (typeof CEPHE_YONLERI)[number]['value']

const AZIMUTLAR = new Map<string, number>(CEPHE_YONLERI.map((y) => [y.value, y.azimut]))
const ETIKETLER = new Map<string, string>(CEPHE_YONLERI.map((y) => [y.value, y.label]))

export function cepheEtiketi(yon: string): string {
  return ETIKETLER.get(yon) ?? yon
}

/**
 * Bir cephenin güneş gördüğü kabul edilen açı yarıçapı (derece).
 *
 * ⚠️ ±90° bilinçli: bir duvar, güneş normalinin iki yanında 90'ar derecelik
 * yarım düzlemi görür. Daha dar bir aralık (örn. ±60°) "doğrudan güneş"
 * tanımını keyfî biçimde daraltır; daha genişi ise duvarın arkasını da
 * sayardı.
 *
 * ⚠️ Sınıra tam oturan an (tam 90°) güneş duvara TEĞET geçiyor demek ve
 * doğrudan ışık sayılmıyor; karşılaştırma bu yüzden katı (`<`).
 */
export const CEPHE_YARIM_ACISI = 90

/**
 * Güneşin ufuktan en az bu kadar yüksek olması gerekiyor (derece).
 *
 * ⚠️ 0° yerine 5°: güneş ufka çok yakınken ışık hem çok zayıf hem de
 * gerçek dünyada neredeyse her zaman komşu yapılar tarafından kesiliyor.
 * 0° kullanmak, kimsenin hissetmediği dakikaları "güneşli" saymak olurdu
 * ve rakamı iyimser yönde şişirirdi.
 */
export const ASGARI_YUKSEKLIK = 5

export function aciFarki(a: number, b: number): number {
  const fark = Math.abs(a - b) % 360
  return fark > 180 ? 360 - fark : fark
}

/**
 * Bu anda bu cephe doğrudan güneş alıyor mu?
 *
 * ⚠️ TEK KAYNAK. Hem gün toplamı (`cepheGunu`) hem saatlik zaman çubuğu
 * bu kuralı kullanıyor. İki yerde ayrı yazılsaydı biri ±90°, diğeri ≤90°
 * olur ve iki ekran aynı daire için farklı cevap verirdi.
 */
export function dogrudanMi(nokta: YorungeNoktasi, cepheAzimutu: number): boolean {
  if (nokta.yukseklik < ASGARI_YUKSEKLIK) return false
  return aciFarki(nokta.azimut, cepheAzimutu) < CEPHE_YARIM_ACISI
}

/** Cephe yönünün azimutu. Bilinmeyen yön sessizce sıfırlanmaz, hata verir. */
export function cepheAzimutu(yon: CepheYonu): number {
  const azimut = AZIMUTLAR.get(yon)
  if (azimut === undefined) throw new Error(`Bilinmeyen cephe yönü: ${yon}`)
  return azimut
}

/**
 * Cephe hesabının örnekleme aralığı (dakika).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ TEK ARALIK, İKİ EKRAN.
 *
 * Gün toplamı önce yörünge eğrisinin 20 dakikalık örneklemesini
 * kullanıyordu. Saatlik zaman çubuğu ise bir saatin kaç dakikasının
 * güneşli olduğunu bilmek zorunda ve 20 dakika orada çok kaba: bir saat
 * ya 0, ya 20, ya 40, ya 60 dakika güneş alabilirdi.
 *
 * İki ayrı aralık kullanmak daha kötü olurdu — aynı sayfada "yazın ~9
 * saat" ile çubuğun topladığı saat birbirini tutmazdı. İkisi de 5
 * dakikada bir örnekliyor.
 * ─────────────────────────────────────────────────────────────────────────
 */
export const ORNEK_ARALIGI = 5

/** Gün boyunca örneklenecek dakikalar — 288 nokta. */
const ORNEK_DAKIKALARI: readonly number[] = Array.from(
  { length: (24 * 60) / ORNEK_ARALIGI },
  (_, i) => i * ORNEK_ARALIGI,
)

export interface CepheGunu {
  /** Doğrudan güneş alınan süre (dakika). */
  dakika: number
}

/**
 * Tek bir cephe ve tek bir gün için doğrudan güneş süresi.
 *
 * ⚠️ Sonuç 5 dakikalık çözünürlüğe yuvarlanıyor. Bunu "yaklaşık" diye
 * sunmak şart ve arayüzde `~` işaretiyle yazılıyor.
 */
export function cepheGunu(enlem: number, boylam: number, tarih: Date, yon: CepheYonu): CepheGunu {
  const azimut = cepheAzimutu(yon)
  const noktalar = gunKonumlari(enlem, boylam, tarih, ORNEK_DAKIKALARI)
  const sayi = noktalar.filter((nokta) => dogrudanMi(nokta, azimut)).length

  return { dakika: sayi * ORNEK_ARALIGI }
}

export interface CepheOzeti {
  yon: CepheYonu
  etiket: string
  /** 21 Haziran — yılın en uzun günü. */
  yazDakika: number
  /** 21 Aralık — yılın en kısa günü. */
  kisDakika: number
}

/**
 * Bir taşınmazın cepheleri için yaz/kış karşılaştırması.
 *
 * ⚠️ Köşe daireler iki cephe alır; bu yüzden girdi bir DİZİ ve her cephe
 * ayrı ayrı raporlanıyor. Toplamak yanlış olurdu: aynı saatte iki cephe
 * birden güneş alabiliyor ve toplam, günün uzunluğunu aşabilirdi.
 */
export function cepheOzetleri(
  enlem: number,
  boylam: number,
  yonler: readonly CepheYonu[],
  yil: number,
): CepheOzeti[] {
  const yazGunu = new Date(Date.UTC(yil, 5, 21))
  const kisGunu = new Date(Date.UTC(yil, 11, 21))

  return yonler.map((yon) => ({
    yon,
    etiket: cepheEtiketi(yon),
    yazDakika: cepheGunu(enlem, boylam, yazGunu, yon).dakika,
    kisDakika: cepheGunu(enlem, boylam, kisGunu, yon).dakika,
  }))
}

/** Dakikayı "~6,5 saat" gibi okunur metne çevirir. */
export function saatYaz(dakika: number): string {
  if (dakika <= 0) return 'doğrudan güneş almıyor'
  const saat = dakika / 60
  const yuvarlak = Math.round(saat * 2) / 2
  return `~${yuvarlak.toString().replace('.', ',')} saat`
}
