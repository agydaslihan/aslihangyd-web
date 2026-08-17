import 'server-only'

import config from '@payload-config'
import { getPayload, type Where } from 'payload'

import { gunAnahtari } from './tampon'
import { olayTanimi, YUKSEK_NIYETLI_OLAYLAR } from './sozluk'
import { DEGERLEME_ALANLARI, fiyatBandiEtiketi, type Katman } from './tipler'

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
  hataOrani: number | null
  /** Hiç veri yok mu — panel boş durumu bunu kullanıyor. */
  bos: boolean
}

/* ── Yardımcılar ─────────────────────────────────────────────────────── */

interface GunSatiri {
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
    }
  })
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
       */
      where: { gun: { greater_than_or_equal: oncekiIlk } } as Where,
      limit: gunSayisi * 2 + 2,
      sort: 'gun',
      overrideAccess: true,
    }),
    payload.count({
      collection: 'talepler',
      where: { createdAt: { greater_than_or_equal: `${ilkGun}T00:00:00.000Z` } } as Where,
      overrideAccess: true,
    }),
    payload.count({
      collection: 'talepler',
      where: {
        and: [
          { createdAt: { greater_than_or_equal: `${oncekiIlk}T00:00:00.000Z` } },
          { createdAt: { less_than: `${ilkGun}T00:00:00.000Z` } },
        ],
      } as Where,
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
    where: { createdAt: { greater_than_or_equal: `${ilkGun}T00:00:00.000Z` } } as Where,
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
    hataOrani: ziyaretci > 0 ? Math.round((toplamHata / ziyaretci) * 1000) / 10 : null,
    bos: tum.length === 0,
  }
}

/** Olay etiketi — panelde ham ad göstermemek için. */
export function olayEtiketi(ad: string): string {
  return olayTanimi(ad)?.etiket ?? ad
}
