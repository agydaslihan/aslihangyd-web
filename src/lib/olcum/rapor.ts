import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import { DERINLIK_BANTLARI, DERINLIK_ETIKETI, DERINLIK_TEMSILCISI, EKRAN_ETIKETI } from './bantlar'

import { BOSALTMA_ARALIGI_MS, gunAnahtari, tamponuOku } from './tampon'
import { olayTanimi, YUKSEK_NIYETLI_OLAYLAR } from './sozluk'
import { DEGERLEME_ALANLARI, fiyatBandiEtiketi, type Katman } from './tipler'
import { KOVALAR, VITAL_ADLARI, gecerliVitalMi, karneDagilimi, p75, type VitalAdi } from './vital'

/**
 * Panelin okuduğu rapor motoru.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ HAM OLAYDAN DEĞİL, ÖNCEDEN TOPLANMIŞ GÜN SATIRLARINDAN OKUYOR.
 *
 * Şartnamenin şartı: panel sorguları özet tablodan okuyacak. Burada okunan
 * her şey `gozlem-gunluk` koleksiyonundan geliyor — gün başına tek satır.
 * İki haftalık bir rapor 14 satır okuyor, yüz bin olay taramıyor.
 *
 * Tek istisna LEAD sayısı: o `Talepler` koleksiyonundan geliyor, çünkü lead
 * bir olay değil bir KAYIT — ve dönüşüm oranının payı olması gereken şey
 * gerçekten gelen taleptir, "form gönderildi" olayı değil. İkisi ayrışırsa
 * (ör. olay gitmedi ama talep geldi) doğru olan taleptir.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ HİÇBİR FONKSİYON TEK ZİYARETÇİ DÖNMÜYOR. Dönen her yapı bir sayaç ya
 * da bir oran. Huni bile toplulaştırılmış (şartname §4).
 */

/**
 * Yüzde göstermek için gereken asgari örneklem.
 *
 * ⚠️ ŞARTNAMENİN AÇIK ŞARTI: "40 ziyaretçi varken %50 artış iki kişi
 * olabilir." Bu eşiğin altında yüzde HİÇ hesaplanmıyor — gösterilip
 * "dikkat" notu düşülmüyor, çünkü ekranda duran bir yüzde okunur ve
 * hatırlanır; yanındaki not okunmaz.
 */
export const ASGARI_ORNEKLEM = 100

/**
 * Bir vital satırında sayı göstermek için gereken asgari ölçüm.
 *
 * ⚠️ 100 DEĞİL 30 — bilinçli olarak daha düşük. Yatırım skoru ve endeks
 * eşikleri yüksek çünkü onlar ziyaretçiye YAYINLANIYOR ve yatırım kararı
 * aldırıyor. Bu sayı yalnızca panelde, kendi ekibimize görünüyor ve
 * "sitem yavaş mı" sorusunu cevaplıyor; 30 ölçümlük bir p75 kaba ama
 * kullanılabilir bir sinyal. Eşik yine de var: üç ölçümden p75 hesaplamak
 * matematiksel olarak mümkün ama anlamsız.
 */
export const ASGARI_VITAL_ORNEK = 30

/**
 * Şehir listesinde k-anonimlik eşiği.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ŞEHİR, ÜLKEDEN FARKLI OLARAK TEK KİŞİYİ İŞARET EDEBİLİR.
 *
 * "Bu hafta Çerkezköy'den 1 ziyaretçi" cümlesi, küçük bir yerleşimde
 * "o kişi" demektir — özellikle Aslıhan o kişiyi tanıyorsa. Bu yüzden
 * eşiğin altında kalan şehirler tek tek gösterilmiyor, "diğer" kovasına
 * toplanıyor. Toplam sayı doğru kalıyor, ayrıntı kayboluyor.
 *
 * ⚠️ Eşik 5: literatürdeki en yaygın k değeri ve bu ölçekte anlamlı.
 * Düşürülmesi bir "ayar" değil, KVKK kararının gevşetilmesidir.
 */
export const ASGARI_SEHIR = 5

/**
 * Yol dizisi listesinde k-anonimlik eşiği.
 *
 * ⚠️ Tek kez görülmüş bir gezinme dizisi, tek bir ziyaretin izidir.
 * Toplulaştırma iddiası ancak dizi birden fazla kez görüldüğünde geçerli.
 * Eşik burada 2: dizi zaten üç adımla sınırlı ve rotalar şablon
 * (`/portfoy/[slug]` değil gerçek slug taşıyor — ama slug'lar da herkese
 * açık sayfa adresleri, kişi değil).
 */
export const ASGARI_YOL = 2

export interface Deger {
  sayi: number
  katman: Katman
}

export interface HaftaOzeti {
  buHafta: number
  gecenHafta: number
  /** Örneklem küçükse `null` — yüzde hesaplanmıyor. */
  degisimYuzde: number | null
  ornekLemKucuk: boolean
  katman: Katman
}

export interface HuniAsamasi {
  ad: string
  aciklama: string
  sayi: number
  katman: Katman
  /** Önceki aşamaya göre düşüş yüzdesi (`null` = ilk aşama). */
  dususYuzde: number | null
  /** En büyük düşüş bu aşamada mı? */
  enBuyukDusus: boolean
}

export interface SayfaSatiri {
  rota: string
  goruntuleme: number
  yuksekNiyet: number
  lead: number
  /** Lead başına kaç görüntüleme gerekti — küçük olan iyidir. */
  leadBasinaGoruntuleme: number | null
}

export interface AdSayi {
  ad: string
  adet: number
}

export interface KaynakSatiri {
  ad: string
  ziyaretci: number
  lead: number
}

export interface TeknikSatiri {
  rota: string
  ortalamaMs: number
  enYavasMs: number
  goruntuleme: number
  hata: number
}

/** Bir metriğin bir cihaz sınıfındaki alan ölçümü. */
export interface VitalSatiri {
  ad: VitalAdi
  cihaz: 'mobil' | 'masaustu'
  /** Yaklaşık 75. yüzdelik — histogramdan interpolasyonla. */
  p75: number | null
  /** p75 sınırsız kovaya düştü mü: değer "en az" olarak okunmalı. */
  p75Asgari: boolean
  iyiYuzde: number | null
  ortaYuzde: number | null
  zayifYuzde: number | null
  /** Kaç ölçüm — az örneklemde sayı gösterilmiyor. */
  ornek: number
}

export interface Rapor {
  /** Raporun kapsadığı gün sayısı. */
  gunSayisi: number
  ilkGun: string
  sonGun: string

  /** Katman B'nin kaç istekte çalıştığı — eksik veriyi gizlememek için. */
  onayOrani: number | null

  ziyaretci: HaftaOzeti
  yuksekNiyet: HaftaOzeti
  lead: HaftaOzeti
  donusumYuzde: number | null

  huni: HuniAsamasi[]
  sayfalar: SayfaSatiri[]
  degerlemeHunisi: HuniAsamasi[]
  filtreler: AdSayi[]
  fiyatBantlari: AdSayi[]
  mahalleler: AdSayi[]
  sonucsuzArama: number
  kaynaklar: KaynakSatiri[]
  utmKaynaklar: AdSayi[]
  teknik: TeknikSatiri[]
  cihazlar: AdSayi[]

  /* ── SmarterStats tarzı kitle raporları — hepsi toplulaştırılmış ── */

  /** Ziyaretçilerin siteye girdiği sayfalar (Katman A, yaklaşık). */
  girisSayfalari: AdSayi[]
  /** Siteyi terk ederken son görülen sayfalar (Katman B). */
  cikisSayfalari: AdSayi[]
  /** En sık görülen üç adımlık gezinme dizileri (Katman B, k≥2). */
  yollar: AdSayi[]
  /** Ülke dağılımı (Katman A). */
  ulkeler: AdSayi[]
  /** Şehir dağılımı (Katman A, k-anonim). */
  sehirler: AdSayi[]
  /** Tarayıcı ailesi dağılımı — sürümsüz (Katman A). */
  tarayicilar: AdSayi[]
  /** Ekran genişliği bandı dağılımı (Katman B). */
  ekranBantlari: AdSayi[]
  /** Saat yoğunluğu, 0–23 (Katman A). */
  saatler: { saat: number; adet: number }[]
  /** Haftanın günü yoğunluğu, Pazartesi–Pazar (Katman A). */
  gunler: AdSayi[]
  /** Oturum derinliği bantları (Katman B). */
  derinlikBantlari: AdSayi[]
  /**
   * Hemen çıkma oranı — tek sayfalık oturumların payı.
   *
   * ⚠️ Ayrı bir sayaç değil: `oturum_derinligi` olayının "1" bandının payı.
   * İki ayrı sayaç, birbirini tutmadıkları bir gün üretirdi.
   */
  hemenCikmaYuzde: number | null
  /** Ortalama oturum derinliği — bant temsilcilerinden YAKLAŞIK. */
  ortalamaDerinlik: number | null
  /** WhatsApp tıklamalarının geldiği sayfalar (Katman B). */
  whatsappKaynaklari: AdSayi[]
  /** Sonuç bulunamayan aramaların ölçütleri — portföy boşluğu (Katman B). */
  sonucsuzAramalar: AdSayi[]

  hataOrani: number | null
  /**
   * Gerçek ziyaretçilerden ölçülen Core Web Vitals.
   *
   * ─────────────────────────────────────────────────────────────────────
   * ⚠️ LABORATUVAR SAYISI GERÇEĞİ SÖYLEMİYORDU — BU BÖLÜM ONUN İÇİN VAR.
   *
   * CI'daki Lighthouse mobil LCP'yi 3,4 sn gösteriyordu ve hiçbir müdahale
   * onu kıpırdatmadı. Raporun ham metriklerinde sebep çıktı: sayfa gerçekte
   * 194 ms'de boyanıyor; 3,4 sn onun yavaş bir 4G telefona YANSITILMIŞ hâli
   * (`throttlingMethod: "simulate"`, istek başına 562 ms varsayım).
   *
   * Hedefin (LCP < 2,5 sn) hangi sayıyla ölçüleceği belirsizdi. Burada
   * ölçülen sayı gerçek ziyaretçilerin gerçek cihazlarından geliyor.
   * ─────────────────────────────────────────────────────────────────────
   */
  vitaller: VitalSatiri[]
  /** Hiç veri yok mu — panel boş durumu bunu kullanıyor. */
  bos: boolean
  /**
   * Ölçümün çalışıp çalışmadığını gösteren tanı bilgisi.
   *
   * ─────────────────────────────────────────────────────────────────────
   * ⚠️ BOŞ PANEL İKİ ŞEY ANLAMINA GELEBİLİR VE İKİSİ ÇOK FARKLI:
   *
   *   1. Henüz ziyaretçi yok  → normal, beklenecek
   *   2. Sayaçlar yazılmıyor  → arıza, müdahale gerek
   *
   * Panel bunu ayırt edemezse soru her seferinde insana gelir ve cevabı
   * ancak sunucuya bağlanan biri verebilir. Bu alanlar cevabı ekrana
   * taşıyor.
   * ─────────────────────────────────────────────────────────────────────
   */
  tani: {
    /** Veritabanına en son ne zaman yazıldı. */
    sonYazma: string | null
    /** Kaç günlük kayıt var. */
    gunKaydi: number
    /** Henüz yazılmamış, bellekte bekleyen istek sayısı. */
    bekleyenIstek: number
    /** Bekleyen olay sayısı (Katman B). */
    bekleyenOlay: number
    /** Yazma aralığı (saniye) — "ne kadar beklemeliyim" sorusunun cevabı. */
    yazmaAraligiSn: number
  }
}

/* ── Yardımcılar ─────────────────────────────────────────────────────── */

interface GunSatiri {
  vitaller: { ad: string; cihaz: string; kova: number; adet: number }[]
  gun: string
  toplamIstek: number
  onayliIstek: number
  sayfalar: {
    rota: string
    goruntuleme: number
    hata: number
    toplamMs: number
    enYavasMs: number
  }[]
  kaynaklar: { alan: string; adet: number }[]
  utmKaynaklar: { kaynak: string; adet: number }[]
  cihazlar: { sinif: string; adet: number }[]
  olaylar: { ad: string; ayrinti: string | null; niyet: string; adet: number }[]
  ulkeler: { kod: string; adet: number }[]
  girisSayfalari: { rota: string; adet: number }[]
  saatler: { saat: number; adet: number }[]
  tarayicilar: { aile: string; adet: number }[]
  sehirler: { ad: string; adet: number }[]
}

function gunEkle(gun: string, fark: number): string {
  const [y, a, g] = gun.split('-').map(Number)
  const tarih = new Date(Date.UTC(y ?? 1970, (a ?? 1) - 1, g ?? 1))
  tarih.setUTCDate(tarih.getUTCDate() + fark)
  return tarih.toISOString().slice(0, 10)
}

function sayi(deger: unknown): number {
  return typeof deger === 'number' && Number.isFinite(deger) ? deger : 0
}

function dizi<T>(deger: unknown): T[] {
  return Array.isArray(deger) ? (deger as T[]) : []
}

function satirlariCoz(ham: unknown[]): GunSatiri[] {
  return ham.map((kayit) => {
    const k = kayit as Record<string, unknown>
    return {
      gun: typeof k.gun === 'string' ? k.gun : '',
      toplamIstek: sayi(k.toplamIstek),
      onayliIstek: sayi(k.onayliIstek),
      sayfalar: dizi(k.sayfalar),
      kaynaklar: dizi(k.kaynaklar),
      utmKaynaklar: dizi(k.utmKaynaklar),
      cihazlar: dizi(k.cihazlar),
      olaylar: dizi(k.olaylar),
      vitaller: dizi(k.vitaller),
      ulkeler: dizi(k.ulkeler),
      girisSayfalari: dizi(k.girisSayfalari),
      saatler: dizi(k.saatler),
      tarayicilar: dizi(k.tarayicilar),
      sehirler: dizi(k.sehirler),
    }
  })
}

/**
 * Vital histogramlarını metrik × cihaz kırılımında toplar.
 *
 * ⚠️ ASGARİ ÖRNEKLEM UYGULANIYOR (`ASGARI_VITAL_ORNEK`). Üç ölçümden p75
 * hesaplamak matematiksel olarak mümkün ama anlamsız; panelde kesin bir sayı
 * gibi durur ve yanlış karar aldırır. Az örneklemde satır yine görünüyor —
 * gizlemek "veri yok" sanılmasına yol açardı — ama sayı yerine örneklem
 * sayısı gösteriliyor.
 */
function vitalleriTopla(satirlar: GunSatiri[]): VitalSatiri[] {
  const histogramlar = new Map<string, number[]>()

  for (const satir of satirlar) {
    for (const kayit of satir.vitaller) {
      if (!gecerliVitalMi(kayit.ad)) continue
      const cihaz = kayit.cihaz === 'mobil' ? 'mobil' : 'masaustu'
      const anahtar = `${kayit.ad}|${cihaz}`

      let kovalar = histogramlar.get(anahtar)
      if (kovalar === undefined) {
        kovalar = new Array<number>(KOVALAR[kayit.ad].length).fill(0)
        histogramlar.set(anahtar, kovalar)
      }

      // ⚠️ Sınır dışı kova ATILIYOR: kova sayısı değişirse (eşik güncellemesi)
      // eski satırlar diziyi taşırıp sessizce yanlış p75 üretebilirdi.
      const sira = kayit.kova
      if (!Number.isInteger(sira) || sira < 0 || sira >= kovalar.length) continue
      kovalar[sira] = (kovalar[sira] ?? 0) + sayi(kayit.adet)
    }
  }

  const sonuc: VitalSatiri[] = []
  for (const ad of VITAL_ADLARI) {
    for (const cihaz of ['mobil', 'masaustu'] as const) {
      const kovalar = histogramlar.get(`${ad}|${cihaz}`)
      if (kovalar === undefined) continue

      const dagilim = karneDagilimi(ad, kovalar)
      if (dagilim.toplam === 0) continue

      const yeterli = dagilim.toplam >= ASGARI_VITAL_ORNEK
      const yuzdelik = yeterli ? p75(ad, kovalar) : null

      sonuc.push({
        ad,
        cihaz,
        p75: yuzdelik?.deger ?? null,
        p75Asgari: yuzdelik?.asgari ?? false,
        iyiYuzde: yeterli ? (dagilim.iyi / dagilim.toplam) * 100 : null,
        ortaYuzde: yeterli ? (dagilim.orta / dagilim.toplam) * 100 : null,
        zayifYuzde: yeterli ? (dagilim.zayif / dagilim.toplam) * 100 : null,
        ornek: dagilim.toplam,
      })
    }
  }

  return sonuc
}

/** Olay sayacı: ad (ve istenirse ayrıntı) bazında toplam. */
function olayToplami(satirlar: GunSatiri[], ad: string, ayrinti?: string): number {
  let toplam = 0
  for (const satir of satirlar) {
    for (const olay of satir.olaylar) {
      if (olay.ad !== ad) continue
      if (ayrinti !== undefined && olay.ayrinti !== ayrinti) continue
      toplam += sayi(olay.adet)
    }
  }
  return toplam
}

function ayrintiDagilimi(satirlar: GunSatiri[], ad: string): Map<string, number> {
  const harita = new Map<string, number>()
  for (const satir of satirlar) {
    for (const olay of satir.olaylar) {
      if (olay.ad !== ad) continue
      const anahtar = olay.ayrinti ?? '(belirtilmemiş)'
      harita.set(anahtar, (harita.get(anahtar) ?? 0) + sayi(olay.adet))
    }
  }
  return harita
}

function yuksekNiyetToplami(satirlar: GunSatiri[]): number {
  let toplam = 0
  for (const satir of satirlar) {
    for (const olay of satir.olaylar) {
      if (YUKSEK_NIYETLI_OLAYLAR.includes(olay.ad)) toplam += sayi(olay.adet)
    }
  }
  return toplam
}

function sayfaToplami(satirlar: GunSatiri[]): Map<string, TeknikSatiri> {
  const harita = new Map<string, TeknikSatiri>()
  for (const satir of satirlar) {
    for (const sayfa of satir.sayfalar) {
      const once = harita.get(sayfa.rota)
      const goruntuleme = sayi(sayfa.goruntuleme)
      const toplamMs = sayi(sayfa.toplamMs)
      if (once === undefined) {
        harita.set(sayfa.rota, {
          rota: sayfa.rota,
          goruntuleme,
          hata: sayi(sayfa.hata),
          ortalamaMs: toplamMs,
          enYavasMs: sayi(sayfa.enYavasMs),
        })
      } else {
        once.goruntuleme += goruntuleme
        once.hata += sayi(sayfa.hata)
        once.ortalamaMs += toplamMs
        once.enYavasMs = Math.max(once.enYavasMs, sayi(sayfa.enYavasMs))
      }
    }
  }
  // `ortalamaMs` şu ana kadar toplam; burada ortalamaya çevriliyor.
  for (const satir of harita.values()) {
    satir.ortalamaMs = satir.goruntuleme > 0 ? Math.round(satir.ortalamaMs / satir.goruntuleme) : 0
  }
  return harita
}

function haftaOzeti(buHafta: number, gecenHafta: number, katman: Katman): HaftaOzeti {
  const kucuk = buHafta < ASGARI_ORNEKLEM || gecenHafta < ASGARI_ORNEKLEM
  return {
    buHafta,
    gecenHafta,
    degisimYuzde:
      kucuk || gecenHafta === 0 ? null : Math.round(((buHafta - gecenHafta) / gecenHafta) * 100),
    ornekLemKucuk: kucuk,
    katman,
  }
}

/**
 * Huni aşamalarını düşüş yüzdeleriyle işaretler.
 *
 * ⚠️ EN BÜYÜK DÜŞÜŞ İŞARETLENİYOR — panelin en değerli tek bilgisi bu.
 * "Şurayı düzeltirsen kazanırsın" diyen satır, en büyük düşüşün olduğu
 * satırdır; ona kırmızı vermek okuyanın gözünü doğru yere götürüyor.
 */
function hunileyi(asamalar: Omit<HuniAsamasi, 'dususYuzde' | 'enBuyukDusus'>[]): HuniAsamasi[] {
  const sonuc: HuniAsamasi[] = asamalar.map((asama, sira) => {
    const once = sira === 0 ? null : (asamalar[sira - 1]?.sayi ?? 0)
    const dusus =
      once === null || once === 0 ? null : Math.round(((once - asama.sayi) / once) * 100)
    return { ...asama, dususYuzde: dusus, enBuyukDusus: false }
  })

  let enBuyuk = -1
  let sira = -1
  sonuc.forEach((asama, i) => {
    if (asama.dususYuzde !== null && asama.dususYuzde > enBuyuk) {
      enBuyuk = asama.dususYuzde
      sira = i
    }
  })
  if (sira >= 0 && enBuyuk > 0) {
    const hedef = sonuc[sira]
    if (hedef !== undefined) hedef.enBuyukDusus = true
  }

  return sonuc
}

/**
 * Katman A dizilerini (gün satırlarındaki kovalar) tek haritada toplar.
 *
 * ⚠️ Rapor SORGULARI ÖZET TABLODAN OKUYOR, ham kayıttan değil. Gün satırı
 * zaten önceden hesaplanmış toplam; burada yapılan tek şey gün satırlarını
 * üst üste koymak. İstek başına veritabanı yazma kuralının raporlama
 * tarafındaki karşılığı bu.
 */
function kovaTopla<T extends Record<string, unknown>>(
  satirlar: GunSatiri[],
  sec: (satir: GunSatiri) => T[],
  anahtarAdi: keyof T,
): Map<string, number> {
  const harita = new Map<string, number>()
  for (const satir of satirlar) {
    for (const kova of sec(satir)) {
      const anahtar = String(kova[anahtarAdi] ?? '')
      if (anahtar === '') continue
      harita.set(anahtar, (harita.get(anahtar) ?? 0) + sayi(kova.adet))
    }
  }
  return harita
}

/**
 * k-anonimlik eşiği: eşiğin altındaki satırları "diğer"e toplar.
 *
 * ⚠️ SATIRLARI ATMIYOR, TOPLUYOR. Atsaydı listedeki sayıların toplamı
 * gerçek toplamı tutmaz ve panel sessizce eksik bir tablo gösterirdi.
 * Ayrıntı gizleniyor, sayı gizlenmiyor.
 */
export function kAnonim(
  harita: Map<string, number>,
  esik: number,
  digerEtiketi = 'Diğer',
): Map<string, number> {
  const sonuc = new Map<string, number>()
  let diger = 0
  for (const [anahtar, adet] of harita) {
    if (adet < esik) {
      diger += adet
      continue
    }
    sonuc.set(anahtar, adet)
  }
  if (diger > 0) sonuc.set(digerEtiketi, diger)
  return sonuc
}

function siralaVeKes(harita: Map<string, number>, adet = 10): AdSayi[] {
  return [...harita.entries()]
    .map(([ad, sayisi]) => ({ ad, adet: sayisi }))
    .sort((a, b) => b.adet - a.adet)
    .slice(0, adet)
}

/* ── Ana rapor ───────────────────────────────────────────────────────── */

export async function raporuGetir(gunSayisi = 7): Promise<Rapor> {
  const bugun = gunAnahtari()
  const ilkGun = gunEkle(bugun, -(gunSayisi - 1))
  const oncekiIlk = gunEkle(ilkGun, -gunSayisi)

  const payload = await getPayload({ config })

  const [gunler, talepler, oncekiTalepler] = await Promise.all([
    payload.find({
      collection: 'gozlem-gunluk',
      /**
       * ⚠️ Gün alanı METİN (YYYY-AA-GG) ve karşılaştırma da metin
       * karşılaştırması. Bu biçimde alfabetik sıra kronolojik sırayla aynı
       * olduğu için çalışıyor — biçim değişirse (ör. GG.AA.YYYY) sorgu
       * sessizce yanlış aralık döner.
       *
       * ─────────────────────────────────────────────────────────────────
       * ⚠️ OPERATÖR `greater_than_equal` — ARADA "or" YOK. VE BURADAKİ
       *    `as Where` KALKANI TAM DA BUNU GİZLEMİŞTİ.
       *
       * Dört sorgu da `greater_than_or_equal` yazıyordu. Payload böyle bir
       * operatör tanımıyor ve isteği reddediyor:
       *
       *     The following path cannot be queried: createdAt.greater_than_or_equal
       *
       * TypeScript bunu yakalayabilirdi — `Where` tipi geçerli operatörleri
       * biliyor. Ama her sorgunun sonuna yazılan `as Where` denetimi
       * kapatıyordu: derleyiciye "bu nesne zaten Where, bakma" demek,
       * yazım hatasını çalışma zamanına ertelemekti.
       *
       * Kalkan kaldırıldı. Aynı hata bir daha yazılırsa `pnpm typecheck`
       * kırılır. `as Where` yasağı `lib/olcum/rapor.test.ts` içinde de
       * denetleniyor.
       * ─────────────────────────────────────────────────────────────────
       */
      where: { gun: { greater_than_equal: oncekiIlk } },
      limit: gunSayisi * 2 + 2,
      sort: 'gun',
      overrideAccess: true,
    }),
    payload.count({
      collection: 'talepler',
      where: { createdAt: { greater_than_equal: `${ilkGun}T00:00:00.000Z` } },
      overrideAccess: true,
    }),
    payload.count({
      collection: 'talepler',
      where: {
        and: [
          { createdAt: { greater_than_equal: `${oncekiIlk}T00:00:00.000Z` } },
          { createdAt: { less_than: `${ilkGun}T00:00:00.000Z` } },
        ],
      },
      overrideAccess: true,
    }),
  ])

  const tum = satirlariCoz(gunler.docs)
  const buHaftaSatirlari = tum.filter((satir) => satir.gun >= ilkGun)
  const gecenHaftaSatirlari = tum.filter((satir) => satir.gun < ilkGun)

  const ziyaretci = buHaftaSatirlari.reduce((t, s) => t + s.toplamIstek, 0)
  const gecenZiyaretci = gecenHaftaSatirlari.reduce((t, s) => t + s.toplamIstek, 0)
  const onayli = buHaftaSatirlari.reduce((t, s) => t + s.onayliIstek, 0)

  const yuksek = yuksekNiyetToplami(buHaftaSatirlari)
  const gecenYuksek = yuksekNiyetToplami(gecenHaftaSatirlari)

  const sayfaHaritasi = sayfaToplami(buHaftaSatirlari)

  /* ── Lead'lerin sayfa ve kaynak kırılımı ── */
  const leadSayfa = new Map<string, number>()
  const leadKaynak = new Map<string, number>()
  const talepListesi = await payload.find({
    collection: 'talepler',
    where: { createdAt: { greater_than_equal: `${ilkGun}T00:00:00.000Z` } },
    limit: 500,
    depth: 0,
    overrideAccess: true,
  })
  for (const ham of talepListesi.docs) {
    const t = ham as unknown as Record<string, unknown>
    const sayfa = typeof t.gonderildigiSayfa === 'string' ? t.gonderildigiSayfa : null
    if (sayfa !== null) leadSayfa.set(sayfa, (leadSayfa.get(sayfa) ?? 0) + 1)
    const kaynak = typeof t.kaynak === 'string' ? t.kaynak : 'bilinmiyor'
    leadKaynak.set(kaynak, (leadKaynak.get(kaynak) ?? 0) + 1)
  }

  /* ── 3.2 Huni ── */
  const rotaToplami = (onEk: string): number => {
    let toplam = 0
    for (const [rota, satir] of sayfaHaritasi) {
      if (rota === onEk || rota.startsWith(`${onEk}/`)) toplam += satir.goruntuleme
    }
    return toplam
  }

  const huni = hunileyi([
    {
      ad: 'Giriş',
      aciklama: 'Sitede görüntülenen tüm sayfalar',
      sayi: ziyaretci,
      katman: 'A',
    },
    {
      ad: 'Portföy / mahalle',
      aciklama: 'Liste ve mahalle sayfaları',
      sayi: rotaToplami('/portfoy') + rotaToplami('/mahalleler'),
      katman: 'A',
    },
    {
      ad: 'İlan detayı',
      aciklama: 'Tek bir taşınmazın sayfası',
      sayi: [...sayfaHaritasi.entries()]
        .filter(([rota]) => rota.startsWith('/portfoy/'))
        .reduce((t, [, s]) => t + s.goruntuleme, 0),
      katman: 'A',
    },
    {
      ad: 'Yüksek niyetli eylem',
      aciklama: 'WhatsApp, telefon, değerleme sonucu, uzun okuma',
      sayi: yuksek,
      katman: 'B',
    },
    {
      ad: 'Gelen talep',
      aciklama: 'Panele düşen gerçek lead kaydı',
      sayi: talepler.totalDocs,
      katman: 'A',
    },
  ])

  /* ── 3.3 Sayfa bazında lead verimi ── */
  const sayfaSatirlari: SayfaSatiri[] = [...sayfaHaritasi.values()].map((satir) => {
    const lead = leadSayfa.get(satir.rota) ?? 0
    return {
      rota: satir.rota,
      goruntuleme: satir.goruntuleme,
      yuksekNiyet: 0,
      lead,
      leadBasinaGoruntuleme: lead > 0 ? Math.round(satir.goruntuleme / lead) : null,
    }
  })

  /**
   * ⚠️ SIRALAMA TIKLAMAYA GÖRE DEĞİL, LEAD VERİMİNE GÖRE.
   *
   * Şartnamenin altı çizili şartı: 500 görüntüleme 0 lead getiren sayfa,
   * 20 görüntüleme 3 lead getirenden daha az değerlidir. Lead getiren
   * sayfalar önce ve lead başına görüntülemesi AZ olan üstte; lead
   * getirmeyenler altta, görüntülemesi çok olan üstte (çünkü orada
   * kaybedilen fırsat büyük).
   */
  sayfaSatirlari.sort((a, b) => {
    if (a.leadBasinaGoruntuleme !== null && b.leadBasinaGoruntuleme !== null) {
      return a.leadBasinaGoruntuleme - b.leadBasinaGoruntuleme
    }
    if (a.leadBasinaGoruntuleme !== null) return -1
    if (b.leadBasinaGoruntuleme !== null) return 1
    return b.goruntuleme - a.goruntuleme
  })

  /* ── 3.4 Değerleme akışı ── */
  const degerlemeHunisi = hunileyi([
    ...DEGERLEME_ALANLARI.map((alan) => ({
      ad: alan.etiket,
      aciklama: 'Bu alana kadar dolduran ziyaretçi',
      sayi: olayToplami(buHaftaSatirlari, 'degerleme_alani', alan.anahtar),
      katman: 'B' as Katman,
    })),
    {
      ad: 'Sonuç görüldü',
      aciklama: 'Gerçek bir değer aralığı hesaplandı',
      sayi: olayToplami(buHaftaSatirlari, 'degerleme_tamamlandi'),
      katman: 'B' as Katman,
    },
  ])

  /* ── 3.5 Ziyaretçi ne arıyor ── */
  const filtreler = siralaVeKes(ayrintiDagilimi(buHaftaSatirlari, 'filtre_uygulandi'))
  const fiyatBantlari = [...ayrintiDagilimi(buHaftaSatirlari, 'fiyat_bandi').entries()]
    .map(([anahtar, adet]) => ({ ad: fiyatBandiEtiketi(anahtar), adet }))
    .sort((a, b) => b.adet - a.adet)

  const mahalleler = siralaVeKes(
    new Map(
      [...sayfaHaritasi.entries()]
        .filter(([rota]) => rota.startsWith('/mahalleler/'))
        .map(([rota, satir]) => [rota.replace('/mahalleler/', ''), satir.goruntuleme]),
    ),
  )

  /* ── 3.6 Nereden geliyorlar ── */
  const kaynakHaritasi = new Map<string, number>()
  for (const satir of buHaftaSatirlari) {
    for (const kaynak of satir.kaynaklar) {
      kaynakHaritasi.set(kaynak.alan, (kaynakHaritasi.get(kaynak.alan) ?? 0) + sayi(kaynak.adet))
    }
  }
  const kaynaklar: KaynakSatiri[] = [...kaynakHaritasi.entries()]
    .map(([ad, ziyaretciSayisi]) => ({
      ad,
      ziyaretci: ziyaretciSayisi,
      lead: leadKaynak.get(ad) ?? 0,
    }))
    .sort((a, b) => b.ziyaretci - a.ziyaretci)
    .slice(0, 10)

  const utmHaritasi = new Map<string, number>()
  for (const satir of buHaftaSatirlari) {
    for (const utm of satir.utmKaynaklar) {
      utmHaritasi.set(utm.kaynak, (utmHaritasi.get(utm.kaynak) ?? 0) + sayi(utm.adet))
    }
  }

  /* ── 3.7 Teknik sağlık ── */
  const teknik = [...sayfaHaritasi.values()]
    .filter((satir) => satir.goruntuleme >= 3)
    .sort((a, b) => b.ortalamaMs - a.ortalamaMs)
    .slice(0, 8)

  const cihazHaritasi = new Map<string, number>()
  for (const satir of buHaftaSatirlari) {
    for (const cihaz of satir.cihazlar) {
      cihazHaritasi.set(cihaz.sinif, (cihazHaritasi.get(cihaz.sinif) ?? 0) + sayi(cihaz.adet))
    }
  }

  const toplamHata = [...sayfaHaritasi.values()].reduce((t, s) => t + s.hata, 0)

  /* ── Kitle raporları ─────────────────────────────────────────────────── */

  const girisSayfalari = siralaVeKes(
    kovaTopla(buHaftaSatirlari, (satir) => satir.girisSayfalari, 'rota'),
  )
  const cikisSayfalari = siralaVeKes(ayrintiDagilimi(buHaftaSatirlari, 'cikis_sayfasi'))

  /**
   * ⚠️ Yol dizilerinde k-anonimlik eşiği. Tek kez görülmüş bir dizi, tek bir
   * ziyaretin izidir; toplulaştırma iddiası orada biter.
   */
  const yollar = siralaVeKes(
    kAnonim(ayrintiDagilimi(buHaftaSatirlari, 'sayfa_yolu'), ASGARI_YOL, 'Seyrek diziler'),
  ).map((satir) => ({
    /**
     * ⚠️ Kaydedilen ayırıcı boşluksuz `>` (olay ucu boşluğa izin vermiyor);
     * panelde okunabilir hâline çevriliyor.
     *
     * ⚠️ Süslü bir ok (`›`) kullanılmadı: font alt kümesinde yok ve
     * `alfabe.test.ts` haklı olarak kırılıyor. Alt küme yalnızca
     * kullandığımız karakterleri taşıyor; tek bir süs için büyütmek,
     * mobil sayfa ağırlığını ölçüm panelinin estetiğine feda etmek olurdu.
     */
    ad: satir.ad.replaceAll('>', ' > '),
    adet: satir.adet,
  }))

  const ulkeler = siralaVeKes(kovaTopla(buHaftaSatirlari, (satir) => satir.ulkeler, 'kod'))

  /**
   * ⚠️ Şehirde k-anonimlik ZORUNLU. Gerekçe `ASGARI_SEHIR` yanında yazılı:
   * küçük bir yerleşimden gelen tek ziyaret, "o kişi" demektir.
   */
  const sehirler = siralaVeKes(
    kAnonim(
      kovaTopla(buHaftaSatirlari, (satir) => satir.sehirler, 'ad'),
      ASGARI_SEHIR,
    ),
  )

  const tarayicilar = siralaVeKes(
    kovaTopla(buHaftaSatirlari, (satir) => satir.tarayicilar, 'aile'),
    6,
  )
  const ekranBantlari = siralaVeKes(ayrintiDagilimi(buHaftaSatirlari, 'ekran_bandi'), 6).map(
    (satir) => ({
      ad: EKRAN_ETIKETI[satir.ad as keyof typeof EKRAN_ETIKETI] ?? satir.ad,
      adet: satir.adet,
    }),
  )

  /**
   * Saat yoğunluğu — 24 kova, hiçbiri atlanmıyor.
   *
   * ⚠️ Boş saatler de basılıyor. Yalnızca dolu saatleri döndürmek grafiği
   * yalancı biçimde sıkıştırır: "gece 3'te trafik yok" bilgisi, o saatin
   * listede hiç görünmemesiyle değil sıfır görünmesiyle anlaşılır.
   */
  const saatHaritasi = kovaTopla(buHaftaSatirlari, (satir) => satir.saatler, 'saat')
  const saatler = Array.from({ length: 24 }, (_, saat) => ({
    saat,
    adet: saatHaritasi.get(String(saat)) ?? 0,
  }))

  /**
   * Haftanın günü — gün satırlarının kendi tarihinden.
   *
   * ⚠️ Ayrı bir sayaç tutulmuyor: gün anahtarı zaten tarihi taşıyor.
   * Fazladan bir alan, iki kaynağın çeliştiği bir gün üretirdi.
   */
  const GUN_ADLARI = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
  const gunHaritasi = new Map<string, number>()
  for (const satir of buHaftaSatirlari) {
    const [y, a, g] = satir.gun.split('-').map(Number)
    if (y === undefined || a === undefined || g === undefined) continue
    const ad = GUN_ADLARI[new Date(Date.UTC(y, a - 1, g)).getUTCDay()] ?? ''
    if (ad === '') continue
    gunHaritasi.set(ad, (gunHaritasi.get(ad) ?? 0) + satir.toplamIstek)
  }
  /** ⚠️ Hafta Pazartesi başlıyor: Türkiye'de takvim böyle okunuyor. */
  const gunYogunlugu = GUN_ADLARI.slice(1)
    .concat(GUN_ADLARI[0] ?? 'Pazar')
    .map((ad) => ({ ad, adet: gunHaritasi.get(ad) ?? 0 }))

  const derinlikHaritasi = ayrintiDagilimi(buHaftaSatirlari, 'oturum_derinligi')
  const derinlikToplami = [...derinlikHaritasi.values()].reduce((t, s) => t + s, 0)
  /**
   * ⚠️ KABLO DEĞERİ İLE EKRAN METNİ AYRI. Kaydedilen değer `7-ustu`
   * (olay ucunun karakter süzgecinden geçmek zorunda); panelde "7 ve üzeri"
   * yazıyor. İkisini birleştirmek, süzgeci gevşetmek demekti.
   */
  const derinlikBantlari = DERINLIK_BANTLARI.map((bant) => ({
    ad: DERINLIK_ETIKETI[bant],
    adet: derinlikHaritasi.get(bant) ?? 0,
  }))
  const hemenCikmaYuzde =
    derinlikToplami > 0
      ? Math.round(((derinlikHaritasi.get('1') ?? 0) / derinlikToplami) * 1000) / 10
      : null
  /**
   * ⚠️ ORTALAMA YAKLAŞIK VE PANELDE ÖYLE YAZIYOR. Ham sayfa sayısı hiç
   * saklanmadığı için gerçek ortalama hesaplanamaz; bant temsilcileri
   * kullanılıyor ve "7+" için ihtiyatlı bir 8 alınıyor.
   */
  const ortalamaDerinlik =
    derinlikToplami > 0
      ? Math.round(
          (DERINLIK_BANTLARI.reduce(
            (t, bant) => t + (derinlikHaritasi.get(bant) ?? 0) * DERINLIK_TEMSILCISI[bant],
            0,
          ) /
            derinlikToplami) *
            10,
        ) / 10
      : null

  const whatsappKaynaklari = siralaVeKes(ayrintiDagilimi(buHaftaSatirlari, 'whatsapp_tikla'))
  const sonucsuzAramalar = siralaVeKes(ayrintiDagilimi(buHaftaSatirlari, 'sonucsuz_arama'))

  return {
    gunSayisi,
    ilkGun,
    sonGun: bugun,
    onayOrani: ziyaretci > 0 ? Math.round((onayli / ziyaretci) * 100) : null,
    ziyaretci: haftaOzeti(ziyaretci, gecenZiyaretci, 'A'),
    yuksekNiyet: haftaOzeti(yuksek, gecenYuksek, 'B'),
    lead: haftaOzeti(talepler.totalDocs, oncekiTalepler.totalDocs, 'A'),
    donusumYuzde:
      ziyaretci >= ASGARI_ORNEKLEM
        ? Math.round((talepler.totalDocs / ziyaretci) * 1000) / 10
        : null,
    huni,
    sayfalar: sayfaSatirlari.slice(0, 12),
    degerlemeHunisi,
    filtreler,
    fiyatBantlari,
    mahalleler,
    sonucsuzArama: olayToplami(buHaftaSatirlari, 'sonucsuz_arama'),
    kaynaklar,
    utmKaynaklar: siralaVeKes(utmHaritasi),
    teknik,
    cihazlar: siralaVeKes(cihazHaritasi, 4),
    girisSayfalari,
    cikisSayfalari,
    yollar,
    ulkeler,
    sehirler,
    tarayicilar,
    ekranBantlari,
    saatler,
    gunler: gunYogunlugu,
    derinlikBantlari,
    hemenCikmaYuzde,
    ortalamaDerinlik,
    whatsappKaynaklari,
    sonucsuzAramalar,
    hataOrani: ziyaretci > 0 ? Math.round((toplamHata / ziyaretci) * 1000) / 10 : null,
    vitaller: vitalleriTopla(buHaftaSatirlari),
    bos: ziyaretci === 0 && tum.length === 0,
    tani: taniyiTopla(gunler.docs),
  }
}

/**
 * Tanı bilgisini toplar.
 *
 * ⚠️ Bellekteki tampon DA okunuyor — ve asıl değerli kısım bu. Veritabanı
 * boşken tamponda bekleyen bir sayı görmek, "ölçüm çalışıyor, henüz
 * yazılmadı" demenin tek doğrudan yolu. Yalnızca son yazma zamanına
 * bakılsaydı, hiç yazılmamış bir sistemle bozuk bir sistem aynı görünürdü.
 *
 * ⚠️ Bu okuma yalnızca AYNI SÜREÇTE anlamlı: panel de sayaçlar da aynı
 * Node sürecinde yaşıyor. Uygulama bir gün yatay ölçeklenirse bu sayı
 * yalnızca paneli çizen kopyayı gösterir — o gün geldiğinde burası da
 * Redis'e taşınmalı (bkz. `tampon.ts`).
 */
function taniyiTopla(satirlar: unknown[]): Rapor['tani'] {
  const tampon = tamponuOku()

  let sonYazma: string | null = null
  for (const ham of satirlar) {
    const guncelleme = (ham as { updatedAt?: unknown }).updatedAt
    if (typeof guncelleme !== 'string') continue
    if (sonYazma === null || guncelleme > sonYazma) sonYazma = guncelleme
  }

  return {
    sonYazma,
    gunKaydi: satirlar.length,
    bekleyenIstek: tampon?.toplamIstek ?? 0,
    bekleyenOlay: tampon === undefined ? 0 : [...tampon.olay.values()].reduce((t, s) => t + s, 0),
    yazmaAraligiSn: Math.round(BOSALTMA_ARALIGI_MS / 1000),
  }
}

/** Olay etiketi — panelde ham ad göstermemek için. */
export function olayEtiketi(ad: string): string {
  return olayTanimi(ad)?.etiket ?? ad
}
