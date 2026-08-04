import { KATMAN_MINIMUM_GOZLEM } from '@/lib/endeks/tipler'

/**
 * Bölge Radarı — mahalleler arası fırsat ve risk taraması.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ RADAR YENİ BİR SKOR ÜRETMEZ.
 *
 * Elimizde zaten Yatırım Skoru var. İkinci bir puan icat etmek, ikisi
 * çeliştiğinde hangisine inanılacağı sorusunu doğurur ve her ikisini de
 * değersizleştirir.
 *
 * Radar bunun yerine **sinyal** üretir: veriye dayanan, rakamıyla birlikte
 * gösterilen tek cümlelik gözlemler. Her sinyal ya verilerle desteklenir ya
 * da hiç gösterilmez.
 *
 * İki kural sinyalleri dürüst tutuyor:
 *
 * 1. **Mutlak eşik yok.** "Kira çarpanı 15'in altı iyidir" demek, bizim
 *    uydurduğumuz bir ölçüt olurdu. Bunun yerine her sinyal, verisi olan
 *    mahallelerin MEDYANINA göre hesaplanır. Ölçüt Çorlu'nun kendisi.
 *
 * 2. **Veri zayıflığı gizlenmez, sinyal olarak gösterilir.** Rakiplerin
 *    hiç yapmadığı şey budur ve bu aracın en değerli tarafı olabilir:
 *    "bu mahalle hakkında söylediklerimiz zayıf zeminde" demek.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type SinyalTuru = 'firsat' | 'risk' | 'uyari'

export type SinyalKodu =
  | 'dusuk_carpan'
  | 'yuksek_carpan'
  | 'fiyat_ivmesi'
  | 'fiyat_gerilemesi'
  | 'fiyatlanmamis_skor'
  | 'arz_baskisi'
  | 'zayif_veri'

export interface RadarMahallesi {
  slug: string
  ad: string
  ortalamaM2Satis?: number | null
  ortalamaKira?: number | null
  kiraCarpani?: number | null
  degisim12Ay?: number | null
  gozlemSayisi?: number | null
  yatirimSkoru?: number | null
  arzBaskisiPuani?: number | null
}

export interface Sinyal {
  kod: SinyalKodu
  tur: SinyalTuru
  mahalleSlug: string
  mahalleAd: string
  baslik: string
  /** Sinyalin arkasındaki rakamlar. Her zaman gösterilir. */
  gerekce: string
  /** Sapmanın gücü, 0–100. Yalnızca sıralama içindir, bir puan değildir. */
  guc: number
}

/** Bir ölçütün medyanı ve kaç mahalleden hesaplandığı. */
export interface Medyan {
  medyan: number
  mahalleSayisi: number
}

/** Adlandırılmış medyan — arayüzde şeffaflık tablosu olarak gösterilir. */
export interface RadarOlcutu extends Medyan {
  ad: string
}

export interface RadarSonucu {
  sinyaller: Sinyal[]
  /** Sinyallerin karşılaştırıldığı medyanlar — şeffaflık için gösterilir. */
  olcutler: RadarOlcutu[]
  /** Radara giren mahalle sayısı. */
  taranan: number
  /** Hiç sinyal üretilemeyen mahallelerin adları. */
  sinyalsizMahalleler: string[]
}

export type RadarCiktisi =
  | { durum: 'tarandi'; veri: RadarSonucu }
  | { durum: 'yetersiz_veri'; taranan: number; gereken: number }

/**
 * Bir ölçütün medyanının anlamlı olması için gereken en az mahalle sayısı.
 *
 * Üç mahallenin medyanı, "Çorlu ortalaması" diye sunulabilecek bir şey
 * değildir. Dört, karşılaştırmanın anlam kazandığı en düşük sayı.
 */
export const ASGARI_MAHALLE = 4

/**
 * Sinyal üretmek için gereken medyandan sapma oranları.
 *
 * ⚠️ Bunlar Çorlu'ya dair bir ölçüm değil, aracın ilan ettiği metodolojidir
 * ve /bolge-radari sayfasında yayınlanır. Küçük sapmalar gürültüdür;
 * eşik olmadan radar her mahalle için sinyal üretir ve hiçbir şey söylemez.
 */
export const SAPMA_ESIKLERI = {
  /** Kira çarpanı medyandan bu oranda düşükse fırsat sinyali. */
  carpanFirsati: 0.85,
  /** Kira çarpanı medyandan bu oranda yüksekse risk sinyali. */
  carpanRiski: 1.15,
  /** 12 aylık değişim, medyandan bu kadar puan yüksekse ivme sinyali. */
  ivmePuani: 5,
  /** Yatırım skoru medyanın üstünde ama m² fiyatı bu oranda altındaysa. */
  fiyatlanmamisFiyat: 0.9,
  /** Arz baskısı puanı bunun altındaysa risk sinyali. */
  arzBaskisiPuani: 35,
} as const

export function bolgeyiTara(mahalleler: readonly RadarMahallesi[]): RadarCiktisi {
  if (mahalleler.length < ASGARI_MAHALLE) {
    return { durum: 'yetersiz_veri', taranan: mahalleler.length, gereken: ASGARI_MAHALLE }
  }

  const carpanMedyani = medyanBul(mahalleler.map((m) => m.kiraCarpani))
  const degisimMedyani = medyanBul(mahalleler.map((m) => m.degisim12Ay))
  const skorMedyani = medyanBul(mahalleler.map((m) => m.yatirimSkoru))
  const m2Medyani = medyanBul(mahalleler.map((m) => m.ortalamaM2Satis))

  const sinyaller: Sinyal[] = []

  for (const mahalle of mahalleler) {
    sinyaller.push(...carpanSinyalleri(mahalle, carpanMedyani))
    sinyaller.push(...degisimSinyalleri(mahalle, degisimMedyani))
    sinyaller.push(...fiyatlanmamisSkorSinyali(mahalle, skorMedyani, m2Medyani))
    sinyaller.push(...arzBaskisiSinyali(mahalle))
    sinyaller.push(...zayifVeriSinyali(mahalle))
  }

  // Güçlü sinyal önce; eşitlikte mahalle adına göre kararlı sıralama.
  sinyaller.sort((a, b) => b.guc - a.guc || a.mahalleAd.localeCompare(b.mahalleAd, 'tr'))

  const sinyalliSluglar = new Set(sinyaller.map((s) => s.mahalleSlug))

  const olcutler: RadarOlcutu[] = []
  if (carpanMedyani) olcutler.push({ ...carpanMedyani, ad: 'Kira çarpanı' })
  if (degisimMedyani) olcutler.push({ ...degisimMedyani, ad: '12 aylık değişim (%)' })
  if (skorMedyani) olcutler.push({ ...skorMedyani, ad: 'Yatırım skoru' })
  if (m2Medyani) olcutler.push({ ...m2Medyani, ad: 'm² satış fiyatı (₺)' })

  return {
    durum: 'tarandi',
    veri: {
      sinyaller,
      olcutler,
      taranan: mahalleler.length,
      sinyalsizMahalleler: mahalleler.filter((m) => !sinyalliSluglar.has(m.slug)).map((m) => m.ad),
    },
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Sinyal üreticileri
//
// Her biri ya rakamıyla birlikte bir sinyal döndürür ya da boş dizi.
// "Emin değilsek sinyal yok" kuralı burada uygulanıyor.
// ═══════════════════════════════════════════════════════════════════════════

function carpanSinyalleri(mahalle: RadarMahallesi, olcut: Medyan | null): Sinyal[] {
  if (olcut === null) return []
  const carpan = mahalle.kiraCarpani
  if (!sayiMi(carpan) || carpan <= 0) return []

  const oran = carpan / olcut.medyan

  // ⚠️ Ters yönlü: DÜŞÜK çarpan yatırımcı lehinedir.
  if (oran <= SAPMA_ESIKLERI.carpanFirsati) {
    return [
      {
        kod: 'dusuk_carpan',
        tur: 'firsat',
        mahalleSlug: mahalle.slug,
        mahalleAd: mahalle.ad,
        baslik: 'Kira çarpanı Çorlu medyanının altında',
        gerekce:
          `Kira çarpanı ${sayiYaz(carpan)}; ${olcut.mahalleSayisi} mahallenin medyanı ` +
          `${sayiYaz(olcut.medyan)}. Yatırım kendini yaklaşık ` +
          `${sayiYaz(olcut.medyan - carpan)} yıl daha kısa sürede amorti ediyor.`,
        guc: sapmaGucu(1 - oran),
      },
    ]
  }

  if (oran >= SAPMA_ESIKLERI.carpanRiski) {
    return [
      {
        kod: 'yuksek_carpan',
        tur: 'risk',
        mahalleSlug: mahalle.slug,
        mahalleAd: mahalle.ad,
        baslik: 'Kira çarpanı Çorlu medyanının üstünde',
        gerekce:
          `Kira çarpanı ${sayiYaz(carpan)}; ${olcut.mahalleSayisi} mahallenin medyanı ` +
          `${sayiYaz(olcut.medyan)}. Fiyat, kira getirisine göre pahalı kalıyor — ` +
          `beklenti değer artışına yaslanmış olabilir.`,
        guc: sapmaGucu(oran - 1),
      },
    ]
  }

  return []
}

function degisimSinyalleri(mahalle: RadarMahallesi, olcut: Medyan | null): Sinyal[] {
  if (olcut === null) return []
  const degisim = mahalle.degisim12Ay
  if (!sayiMi(degisim)) return []

  const fark = degisim - olcut.medyan

  if (fark >= SAPMA_ESIKLERI.ivmePuani) {
    return [
      {
        kod: 'fiyat_ivmesi',
        tur: 'firsat',
        mahalleSlug: mahalle.slug,
        mahalleAd: mahalle.ad,
        baslik: 'Fiyatlar Çorlu genelinden hızlı artıyor',
        gerekce:
          `12 aylık değişim %${sayiYaz(degisim)}; ${olcut.mahalleSayisi} mahallenin medyanı ` +
          `%${sayiYaz(olcut.medyan)}. Aradaki fark ${sayiYaz(fark)} puan. ` +
          `Bu, geçmiş bir ölçümdür; devam edeceğinin güvencesi değildir.`,
        guc: sapmaGucu(fark / 20),
      },
    ]
  }

  if (fark <= -SAPMA_ESIKLERI.ivmePuani) {
    return [
      {
        kod: 'fiyat_gerilemesi',
        tur: 'uyari',
        mahalleSlug: mahalle.slug,
        mahalleAd: mahalle.ad,
        baslik: 'Fiyat artışı Çorlu genelinin gerisinde',
        gerekce:
          `12 aylık değişim %${sayiYaz(degisim)}; ${olcut.mahalleSayisi} mahallenin medyanı ` +
          `%${sayiYaz(olcut.medyan)}. Bu ya bir zayıflık ya da henüz fark edilmemiş bir ` +
          `giriş noktasıdır — hangisi olduğunu tek başına bu rakam söylemez.`,
        guc: sapmaGucu(-fark / 20),
      },
    ]
  }

  return []
}

/**
 * En güçlü fırsat sinyali: skoru medyanın üstünde ama fiyatı medyanın
 * altında olan mahalle. "Henüz fiyatlanmamış" dediğimiz durum.
 */
function fiyatlanmamisSkorSinyali(
  mahalle: RadarMahallesi,
  skorOlcutu: Medyan | null,
  m2Olcutu: Medyan | null,
): Sinyal[] {
  if (skorOlcutu === null || m2Olcutu === null) return []

  const skor = mahalle.yatirimSkoru
  const m2 = mahalle.ortalamaM2Satis
  if (!sayiMi(skor) || !sayiMi(m2) || m2 <= 0) return []

  if (skor <= skorOlcutu.medyan) return []
  if (m2 / m2Olcutu.medyan > SAPMA_ESIKLERI.fiyatlanmamisFiyat) return []

  return [
    {
      kod: 'fiyatlanmamis_skor',
      tur: 'firsat',
      mahalleSlug: mahalle.slug,
      mahalleAd: mahalle.ad,
      baslik: 'Skoru yüksek, fiyatı henüz düşük',
      gerekce:
        `Yatırım skoru ${sayiYaz(skor)} (medyan ${sayiYaz(skorOlcutu.medyan)}) ama m² fiyatı ` +
        `${sayiYaz(m2)} ₺ (medyan ${sayiYaz(m2Olcutu.medyan)} ₺). Mahallenin nitelikleri ` +
        `fiyatına henüz yansımamış görünüyor.`,
      guc: sapmaGucu((skor - skorOlcutu.medyan) / 30 + (1 - m2 / m2Olcutu.medyan)),
    },
  ]
}

function arzBaskisiSinyali(mahalle: RadarMahallesi): Sinyal[] {
  const puan = mahalle.arzBaskisiPuani
  if (!sayiMi(puan)) return []
  if (puan >= SAPMA_ESIKLERI.arzBaskisiPuani) return []

  return [
    {
      kod: 'arz_baskisi',
      tur: 'risk',
      mahalleSlug: mahalle.slug,
      mahalleAd: mahalle.ad,
      baslik: 'Devam eden inşaat arzı yüksek',
      gerekce:
        `Arz baskısı puanı ${sayiYaz(puan)}/100 (düşük puan = yüksek arz). Mevcut stoka göre ` +
        `çok sayıda yeni konut geliyor; bu, kısa vadede hem satış hem kira fiyatını baskılar.`,
      guc: sapmaGucu((SAPMA_ESIKLERI.arzBaskisiPuani - puan) / 35),
    },
  ]
}

/**
 * Veri zayıflığı sinyali.
 *
 * ⚠️ Bu sinyal bilerek gizlenmiyor. Bir mahalle hakkındaki rakamlarımız
 * az sayıda gözleme dayanıyorsa, o rakamları göstermek kadar bunu söylemek
 * de sorumluluğumuz. Eşik, endeksin yayınlanmış katman kuralıyla aynı
 * (`KATMAN_MINIMUM_GOZLEM`); ayrı bir sayı uydurulmadı.
 */
function zayifVeriSinyali(mahalle: RadarMahallesi): Sinyal[] {
  const sayi = mahalle.gozlemSayisi

  if (!sayiMi(sayi)) {
    return [
      {
        kod: 'zayif_veri',
        tur: 'uyari',
        mahalleSlug: mahalle.slug,
        mahalleAd: mahalle.ad,
        baslik: 'Gözlem sayısı bildirilmemiş',
        gerekce:
          `Bu mahalle için kaç gözleme dayandığımız kayıtlı değil. Buradaki rakamlara, ` +
          `gözlem sayısı girilene kadar temkinli yaklaşın.`,
        guc: 60,
      },
    ]
  }

  if (sayi >= KATMAN_MINIMUM_GOZLEM) return []

  return [
    {
      kod: 'zayif_veri',
      tur: 'uyari',
      mahalleSlug: mahalle.slug,
      mahalleAd: mahalle.ad,
      baslik: 'Rakamlar az sayıda gözleme dayanıyor',
      gerekce:
        `${sayi} gözlem var; endeks metodolojimizde bir katmanın yayınlanabilmesi için ` +
        `aranan asgari sayı ${KATMAN_MINIMUM_GOZLEM}. Bu mahallenin rakamları tek bir ` +
        `sıra dışı ilandan etkilenmiş olabilir.`,
      guc: 55,
    },
  ]
}

// ═══════════════════════════════════════════════════════════════════════════

function sayiMi(deger: number | null | undefined): deger is number {
  return typeof deger === 'number' && Number.isFinite(deger)
}

/**
 * Medyan — ortalama DEĞİL.
 *
 * Tek bir sıra dışı mahalle ortalamayı sürükler, medyanı kıpırdatmaz.
 * Endeks motorunda da aynı gerekçeyle medyan kullanılıyor.
 */
export function medyanBul(degerler: readonly (number | null | undefined)[]): Medyan | null {
  const gecerli = degerler.filter(sayiMi).sort((a, b) => a - b)
  if (gecerli.length < ASGARI_MAHALLE) return null

  const orta = Math.floor(gecerli.length / 2)
  const medyan =
    gecerli.length % 2 === 0
      ? ((gecerli[orta - 1] as number) + (gecerli[orta] as number)) / 2
      : (gecerli[orta] as number)

  return { medyan, mahalleSayisi: gecerli.length }
}

/** Sapmayı 0–100 aralığına taşır. Sıralama içindir, bir puan değildir. */
function sapmaGucu(oransalSapma: number): number {
  return Math.round(Math.min(Math.max(oransalSapma, 0), 1) * 100)
}

function sayiYaz(deger: number): string {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(deger)
}
