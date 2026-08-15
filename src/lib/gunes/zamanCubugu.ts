import {
  cepheAzimutu,
  cepheEtiketi,
  dogrudanMi,
  ORNEK_ARALIGI,
  saatYaz,
  type CepheYonu,
} from './cephe'
import { gunKonumlari, gunesGunu } from './hesap'

/**
 * Güneş zaman çubuğu — saat saat, hangi saatte bu cephe güneş alıyor?
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN GÜN TOPLAMI YETMİYOR.
 *
 * "Güney cephe kışın ~5 saat güneş alıyor" doğru ama eksik bir cümle:
 * o beş saatin SABAH mı ÖĞLE mi olduğu, oturma odasının ne zaman
 * ısınacağını belirliyor. Doğu cephe ile batı cephe gün toplamında
 * neredeyse eşit — yaşarken hiç değiller.
 *
 * Zaman çubuğu bu farkı gösteriyor: aynı toplam, farklı dağılım.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ HESAP COĞRAFİDİR. Komşu bina, ağaç ve balkon gölgeleri hesaba
 * katılmaz — kısıt metni (`GUNES_KISIT_METNI`) çubukla birlikte görünüyor.
 */

/** Bir saatin durumu. */
export type SaatDurumu =
  /** Saatin tamamı doğrudan güneş. */
  | 'dogrudan'
  /** Saatin bir kısmı — güneş bu saat içinde cepheye teğet geçiyor. */
  | 'sinirda'
  /** Güneş ufkun üstünde ama bu cepheyi görmüyor. */
  | 'golge'
  /** Güneş ufkun altında. */
  | 'gece'

export interface SaatHucresi {
  /** Yerel saat (UTC+3), 0–23. */
  saat: number
  durum: SaatDurumu
  /** Bu saatin kaç dakikası doğrudan güneş (0–60). */
  dogrudanDakika: number
  /**
   * Saatin EN YÜKSEK anındaki güneş azimutu (derece, kuzeyden saat yönünde).
   *
   * ⚠️ Ortadaki örnek DEĞİL, en yüksek örnek — gerekçe `yukseklik`te.
   */
  azimut: number
  /**
   * Saatin EN YÜKSEK anındaki güneş yüksekliği (derece).
   *
   * ⚠️ ÖNCE SAATİN ORTASI KULLANILIYORDU VE BU YANLIŞ OKUNUYORDU.
   *
   * Yaz sabahı 05:00 saatinde güneş 05:36'da doğuyor; saatin ortası
   * (05:30) hâlâ ufkun ALTINDA. Hücre doğru biçimde "gölgede" işaretli
   * oluyordu ama ipucu metni "yükseklik -2°, bu cephe: gölgede" diyordu —
   * ziyaretçiye çelişkili görünen, ölçüm olarak da yanıltıcı bir cümle.
   *
   * En yüksek örnek, "bu saatte güneş ne yapıyor?" sorusunun en dürüst
   * tek sayılık cevabı: gündüz saatlerinde ortadan bir iki derece farklı,
   * gün doğumu/batımı saatlerinde ise doğru tarafta.
   */
  yukseklik: number
}

export interface CepheCizelgesi {
  yon: CepheYonu
  etiket: string
  hucreler: SaatHucresi[]
  /** Gün boyunca doğrudan güneş (dakika) — çubuğun toplamı. */
  toplamDakika: number
}

/* ══════════════════════════════════════════════════════════════════════════
   Mevsim seçimi
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * ⚠️ `ifade` alanı ayrı duruyor çünkü Türkçe ek istiyor: özet cümlesi
 * "Bu cephe 21 Haziran ~9 saat…" değil "21 Haziran'da ~9 saat…" olmalı.
 * Etiketi düğmede kullanıp cümlede küçük harfe çevirmek "21 haziran"
 * üretiyordu — özel ad küçülmez ve ek de düşerdi.
 */
export const MEVSIMLER = [
  { anahtar: 'bugun', etiket: 'Bugün', ifade: 'bugün', aciklama: null },
  { anahtar: 'yaz', etiket: '21 Haziran', ifade: "21 Haziran'da", aciklama: 'en uzun gün' },
  { anahtar: 'kis', etiket: '21 Aralık', ifade: "21 Aralık'ta", aciklama: 'en kısa gün' },
  { anahtar: 'ilkbahar', etiket: '21 Mart', ifade: "21 Mart'ta", aciklama: 'ekinoks' },
] as const

export type MevsimAnahtari = (typeof MEVSIMLER)[number]['anahtar']

/**
 * Mevsim anahtarını tarihe çevirir.
 *
 * ⚠️ Gündönümü tarihleri SABİT 21'ine alınıyor, gerçek astronomik ana
 * göre değil. Gerçek gündönümü yıla göre 20–22 Haziran arasında geziniyor
 * ve aradaki fark gündüz süresinde saniyeler mertebesinde. Sabit tarih
 * kullanmak hem ekranda yazan etiketle birebir uyuşuyor hem de yıldan
 * yıla değişmeyen bir karşılaştırma çapası veriyor.
 */
export function mevsimTarihi(anahtar: MevsimAnahtari, bugun: Date): Date {
  const yil = bugun.getUTCFullYear()
  switch (anahtar) {
    case 'yaz':
      return new Date(Date.UTC(yil, 5, 21))
    case 'kis':
      return new Date(Date.UTC(yil, 11, 21))
    case 'ilkbahar':
      return new Date(Date.UTC(yil, 2, 21))
    default:
      return new Date(Date.UTC(bugun.getUTCFullYear(), bugun.getUTCMonth(), bugun.getUTCDate()))
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   Zaman ekseni
   ══════════════════════════════════════════════════════════════════════════ */

export interface ZamanPenceresi {
  /** İlk saat (dahil). */
  ilk: number
  /** Son saat (dahil). */
  son: number
}

/**
 * Çubuğun saat ekseni.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ EKSEN BÜTÜN MEVSİMLER İÇİN AYNI — VE BU BİLİNÇLİ BİR TERCİH.
 *
 * İlk tasarımda çubuk her mevsimde kendi gün doğumundan gün batımına
 * uzanıyordu. Sorun şu: çubuk her zaman tam genişlikte çizildiği için
 * kışın 9 saat, yazın 15 saat AYNI uzunlukta görünüyordu — yani mevsim
 * seçicisinin göstermesi gereken tek şey, tam da görünmez oluyordu.
 *
 * Eksen artık dört mevsimin BİRLEŞİMİNDEN türetiliyor: en erken doğuş ile
 * en geç batışı kapsayan tam saatler. Gündüz bloğu yazın uzuyor, kışın
 * kısalıyor; gece saatleri çubukta açıkça duruyor.
 *
 * ⚠️ Pencere koda GÖMÜLMÜYOR, konumdan hesaplanıyor. Çorlu için 05–20
 * çıkıyor ama sabit yazsaydık başka bir enlem sessizce kırpılırdı.
 * ─────────────────────────────────────────────────────────────────────────
 */
export function zamanPenceresi(enlem: number, boylam: number, bugun: Date): ZamanPenceresi {
  let enErken = 24
  let enGec = 0

  for (const mevsim of MEVSIMLER) {
    const gun = gunesGunu(enlem, boylam, mevsimTarihi(mevsim.anahtar, bugun))
    const dogus = saatiCoz(gun.gunDogumu)
    const batis = saatiCoz(gun.gunBatimi)
    if (dogus !== null) enErken = Math.min(enErken, Math.floor(dogus))
    if (batis !== null) enGec = Math.max(enGec, Math.ceil(batis) - 1)
  }

  // Kutup gündüzü/gecesi gibi doğuş-batış üretmeyen durumlarda tüm gün.
  if (enErken > enGec) return { ilk: 0, son: 23 }
  return { ilk: enErken, son: enGec }
}

/** "HH:MM" → ondalık saat. Null girdi null döner. */
function saatiCoz(deger: string | null): number | null {
  if (deger === null) return null
  const [s, d] = deger.split(':').map(Number)
  if (s === undefined || d === undefined) return null
  return s + d / 60
}

/* ══════════════════════════════════════════════════════════════════════════
   Saatlik çizelge
   ══════════════════════════════════════════════════════════════════════════ */

/** Bir saatte kaç örnek alınıyor — 5 dakikada bir, yani 12. */
const SAATTEKI_ORNEK = 60 / ORNEK_ARALIGI

/**
 * Bir cephe için saat saat çizelge.
 *
 * ⚠️ "SINIRDA" NEYİ ANLATIYOR.
 *
 * Bir saatin bazı dakikalarında güneş cepheye vuruyor, bazılarında
 * vurmuyorsa o saat sınırdadır. Pratikte bu üç şeyden biri demek:
 * güneş o saat içinde cepheye teğet geçiyor (duvarın görüş açısını terk
 * ediyor), gün o saat içinde doğuyor/batıyor, ya da güneş 5°'lik asgari
 * yükseklik eşiğini o saat içinde geçiyor.
 *
 * Üçünü ayırmak yerine tek bir "sınırda" durumu kullanmak bilinçli:
 * ziyaretçi için üçü de aynı şeyi ifade ediyor — o saatin bir kısmı
 * güneşli. Ayrıntı (kaç dakika) hücrede zaten duruyor.
 */
export function saatlikCizelge(
  enlem: number,
  boylam: number,
  tarih: Date,
  yon: CepheYonu,
  pencere: ZamanPenceresi,
): SaatHucresi[] {
  const azimut = cepheAzimutu(yon)

  // Pencere içindeki her saat için 12 örnek, tek çağrıda.
  const dakikalar: number[] = []
  for (let saat = pencere.ilk; saat <= pencere.son; saat += 1) {
    for (let i = 0; i < SAATTEKI_ORNEK; i += 1) dakikalar.push(saat * 60 + i * ORNEK_ARALIGI)
  }

  const noktalar = gunKonumlari(enlem, boylam, tarih, dakikalar)
  const hucreler: SaatHucresi[] = []

  for (let sira = 0; sira <= pencere.son - pencere.ilk; sira += 1) {
    const dilim = noktalar.slice(sira * SAATTEKI_ORNEK, (sira + 1) * SAATTEKI_ORNEK)
    const gunesli = dilim.filter((nokta) => dogrudanMi(nokta, azimut)).length
    const ufkunUstunde = dilim.some((nokta) => nokta.yukseklik > 0)

    // Saatin en yüksek anı — ipucu metninde gösterilen değer.
    const tepe = dilim.reduce(
      (en, nokta) => (nokta.yukseklik > en.yukseklik ? nokta : en),
      dilim[0]!,
    )

    hucreler.push({
      saat: pencere.ilk + sira,
      durum: durumCoz(gunesli, ufkunUstunde),
      dogrudanDakika: gunesli * ORNEK_ARALIGI,
      azimut: tepe.azimut,
      yukseklik: tepe.yukseklik,
    })
  }

  return hucreler
}

function durumCoz(gunesliOrnek: number, ufkunUstunde: boolean): SaatDurumu {
  if (gunesliOrnek >= SAATTEKI_ORNEK) return 'dogrudan'
  if (gunesliOrnek > 0) return 'sinirda'
  return ufkunUstunde ? 'golge' : 'gece'
}

/** Bir taşınmazın bütün cepheleri için çizelge — köşe daireler ayrı satır. */
export function cepheCizelgeleri(
  enlem: number,
  boylam: number,
  tarih: Date,
  yonler: readonly CepheYonu[],
  pencere: ZamanPenceresi,
): CepheCizelgesi[] {
  return yonler.map((yon) => {
    const hucreler = saatlikCizelge(enlem, boylam, tarih, yon, pencere)
    return {
      yon,
      etiket: cepheEtiketi(yon),
      hucreler,
      toplamDakika: hucreler.reduce((toplam, h) => toplam + h.dogrudanDakika, 0),
    }
  })
}

/* ══════════════════════════════════════════════════════════════════════════
   Metinler
   ══════════════════════════════════════════════════════════════════════════ */

const DURUM_METNI: Record<SaatDurumu, string> = {
  dogrudan: 'doğrudan güneş alıyor',
  sinirda: 'kısmen güneş alıyor',
  golge: 'gölgede',
  gece: 'güneş ufkun altında',
}

export function durumEtiketi(durum: SaatDurumu): string {
  return DURUM_METNI[durum]
}

/**
 * Bir hücrenin okunur açıklaması.
 *
 * Örnek: "14:00 — güneş azimutu 235°, yükseklik 42°, bu cephe: gölgede"
 *
 * ⚠️ Aynı metin hem fare/dokunma ipucunda hem de çubuğun ekran okuyucu
 * karşılığında kullanılıyor. İkisini ayrı yazmak, birinin güncellenip
 * diğerinin geride kalmasına açık kapı bırakırdı.
 */
export function hucreAciklamasi(hucre: SaatHucresi): string {
  const saat = `${String(hucre.saat).padStart(2, '0')}:00`

  if (hucre.durum === 'gece') {
    return `${saat} — güneş ufkun altında`
  }

  const yon = `güneş azimutu ${Math.round(hucre.azimut)}°`
  const yukseklik = `yükseklik ${Math.round(hucre.yukseklik)}°`
  const durum = DURUM_METNI[hucre.durum]

  // Kısmi saatlerde kaç dakika olduğunu söylemek, "kısmen"i somutlaştırıyor.
  const ek = hucre.durum === 'sinirda' ? ` (${hucre.dogrudanDakika} dk)` : ''

  return `${saat} — ${yon}, ${yukseklik}, bu cephe: ${durum}${ek}`
}

/**
 * Bir anın ortak başlığı — "14:00 — güneş azimutu 235°, yükseklik 42°".
 *
 * ⚠️ Azimut ve yükseklik CEPHEDEN BAĞIMSIZ. Köşe dairede iki çubuk var ama
 * gökyüzü tek; bu satır bir kez yazılıp altına cephe cephe durum
 * listeleniyor. Her cepheye ayrı azimut yazmak, aynı sayıyı iki kez
 * tekrarlamaktan başka bir şey olmazdı.
 */
export function anBasligi(hucre: SaatHucresi): string {
  const saat = `${String(hucre.saat).padStart(2, '0')}:00`
  if (hucre.durum === 'gece') return `${saat} — güneş ufkun altında`
  return `${saat} — güneş azimutu ${Math.round(hucre.azimut)}°, yükseklik ${Math.round(hucre.yukseklik)}°`
}

/**
 * Doğrudan güneş alınan saat aralıkları — "07:00–09:00" gibi.
 *
 * ⚠️ Çubuğun EKRAN OKUYUCU KARŞILIĞI. Renkli bloklar bir şey söylemiyor;
 * WCAG 1.4.1 gereği bilgi renk dışında da bulunmalı ve bu liste o
 * karşılığın kendisi. Kaldırılırsa çubuk ekran okuyucu için boş bir
 * kutuya dönüşür.
 *
 * `sinirda` saatler de dahil: o saatin bir kısmı güneşli ve bunu
 * dışarıda bırakmak, çubukta görünen bir şeyi metinde gizlemek olurdu.
 */
export function gunesliAraliklar(hucreler: readonly SaatHucresi[]): string[] {
  const araliklar: string[] = []
  let basla: number | null = null

  const kapat = (bitisSaati: number): void => {
    if (basla === null) return
    araliklar.push(`${String(basla).padStart(2, '0')}:00–${String(bitisSaati).padStart(2, '0')}:00`)
    basla = null
  }

  for (const hucre of hucreler) {
    if (hucre.dogrudanDakika > 0) {
      if (basla === null) basla = hucre.saat
    } else {
      kapat(hucre.saat)
    }
  }
  const sonuncu = hucreler[hucreler.length - 1]
  if (sonuncu !== undefined) kapat(sonuncu.saat + 1)

  return araliklar
}

/**
 * Çubuğun altındaki özet cümlesi.
 *
 * Örnek: "Bu cephe bugün ~6 saat doğrudan güneş alıyor. Yazın ~9 saat,
 * kışın ~3 saat."
 *
 * ⚠️ Seçili gün "bugün" değilse ilk cümle de ona göre kuruluyor; sabit
 * "bugün" yazmak, ziyaretçi 21 Aralık'ı seçtiğinde yalan söylerdi.
 */
export function cizelgeOzeti(
  gunIfadesi: string,
  secilenDakika: number,
  yazDakika: number,
  kisDakika: number,
): string {
  const bas =
    secilenDakika <= 0
      ? `Bu cephe ${gunIfadesi} doğrudan güneş almıyor.`
      : `Bu cephe ${gunIfadesi} ${saatYaz(secilenDakika)} doğrudan güneş alıyor.`

  return `${bas} Yazın ${saatYaz(yazDakika)}, kışın ${saatYaz(kisDakika)}.`
}

/** Mevsim anahtarının cümle içindeki hâli — "bugün", "21 Haziran'da". */
export function mevsimIfadesi(anahtar: MevsimAnahtari): string {
  return MEVSIMLER.find((m) => m.anahtar === anahtar)?.ifade ?? 'bugün'
}
