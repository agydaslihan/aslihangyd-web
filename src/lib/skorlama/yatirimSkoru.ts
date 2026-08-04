/**
 * Mahalle Yatırım Skoru (0–100).
 *
 * Ağırlıklar CLAUDE.md'den birebir:
 *   fiyatTrendi(%25) + kiraCarpani(%20) + sanayiYakinligi(%15) +
 *   ulasim(%15) + sosyalDonati(%15) + arzBaskisi(%10)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ HUKUKİ VE İTİBARÎ SINIR
 *
 * "Bu mahalle 87/100" demek, gerekçesi yoksa hem güvenilmez hem hukuken
 * risklidir (PROJE-PLANI.md §1.5). Bu yüzden:
 *
 * 1. **Metodoloji yayınlanır** ve skorun yanında linki durur.
 * 2. **Skorun kırılımı her zaman gösterilir** — kara kutu puan yok.
 * 3. **Yeterli bileşen verisi yoksa SKOR ÜRETİLMEZ.** Üç bileşeni eksik
 *    bir "87 puan", 87 puan değildir. Eksik bileşeni sıfır saymak
 *    mahalleyi haksız yere cezalandırır; ortalama saymak veriyi uydurmaktır.
 * 4. Her gösterimde yatırım tavsiyesi feragati bulunur.
 * ─────────────────────────────────────────────────────────────────────────
 */

export const SKOR_AGIRLIKLARI = {
  fiyatTrendi: 25,
  kiraCarpani: 20,
  sanayiYakinligi: 15,
  ulasim: 15,
  sosyalDonati: 15,
  arzBaskisi: 10,
} as const

export type SkorBileseniAdi = keyof typeof SKOR_AGIRLIKLARI

export const BILESEN_ETIKETLERI: Record<SkorBileseniAdi, string> = {
  fiyatTrendi: 'Fiyat artış trendi',
  kiraCarpani: 'Kira çarpanı',
  sanayiYakinligi: 'Sanayi / istihdam yakınlığı',
  ulasim: 'Ulaşım erişilebilirliği',
  sosyalDonati: 'Sosyal donatı',
  arzBaskisi: 'Arz baskısı',
}

export const BILESEN_ACIKLAMALARI: Record<SkorBileseniAdi, string> = {
  fiyatTrendi: '24 aylık fiyat değişimi. Kendi gözlem verimizden hesaplanır.',
  kiraCarpani: 'Düşük kira çarpanı yatırımcı lehinedir; yüksek puan alır.',
  sanayiYakinligi: 'OSB ve sanayi bölgelerine mesafe. Kira talebinin motoru.',
  ulasim: 'Tren istasyonu, ana arter ve toplu taşımaya erişim.',
  sosyalDonati: 'Okul, sağlık, market ve park yoğunluğu.',
  arzBaskisi: 'Devam eden inşaat projeleri. Yüksek arz, fiyatı baskılar.',
}

/**
 * Skorun yayınlanabilmesi için gereken asgari ağırlık kapsamı.
 *
 * %70: en ağır iki bileşen (fiyat trendi + kira çarpanı = %45) tek başına
 * yetmez; en az bir konum bileşeni de gerekir. Bu eşik, "yarım veriyle tam
 * puan" görüntüsünü engeller.
 */
export const ASGARI_KAPSAM = 0.7

/**
 * Bileşen girdisi.
 *
 * Her bileşen 0–100 arası **ham puan** olarak verilir; ağırlıklandırmayı
 * motor yapar. `null` = veri yok, hesaba katılmaz.
 */
export interface SkorGirdisi {
  fiyatTrendi?: number | null
  kiraCarpani?: number | null
  sanayiYakinligi?: number | null
  ulasim?: number | null
  sosyalDonati?: number | null
  arzBaskisi?: number | null
}

export interface BilesenSonucu {
  ad: SkorBileseniAdi
  etiket: string
  aciklama: string
  /** 0–100 ham puan. `null` ise veri yok. */
  hamPuan: number | null
  agirlik: number
  /** Ağırlıklandırılmış katkı. Veri yoksa 0. */
  katki: number
}

export interface YatirimSkoru {
  toplam: number
  bilesenler: BilesenSonucu[]
  /** Veri bulunan bileşenlerin ağırlık toplamı (0–1). */
  kapsam: number
  /** Verisi olmayan bileşenlerin etiketleri. */
  eksikBilesenler: string[]
}

export type SkorCiktisi =
  | { durum: 'hesaplandi'; veri: YatirimSkoru }
  | { durum: 'yetersiz_veri'; kapsam: number; eksikBilesenler: string[] }

export function yatirimSkoruHesapla(girdi: SkorGirdisi): SkorCiktisi {
  const bilesenler: BilesenSonucu[] = []
  const eksikBilesenler: string[] = []
  let mevcutAgirlik = 0
  let agirlikliToplam = 0

  for (const ad of Object.keys(SKOR_AGIRLIKLARI) as SkorBileseniAdi[]) {
    const agirlik = SKOR_AGIRLIKLARI[ad]
    const ham = girdi[ad]
    const gecerli = typeof ham === 'number' && Number.isFinite(ham)

    // Ham puan 0–100 aralığına kırpılır: bir bileşenin 120 puan üretmesi
    // toplamı bozar ve hatayı gizler.
    const puan = gecerli ? Math.min(Math.max(ham, 0), 100) : null

    if (puan === null) {
      eksikBilesenler.push(BILESEN_ETIKETLERI[ad])
    } else {
      mevcutAgirlik += agirlik
      agirlikliToplam += puan * agirlik
    }

    bilesenler.push({
      ad,
      etiket: BILESEN_ETIKETLERI[ad],
      aciklama: BILESEN_ACIKLAMALARI[ad],
      hamPuan: puan,
      agirlik,
      katki: puan === null ? 0 : Math.round(((puan * agirlik) / 100) * 100) / 100,
    })
  }

  const toplamAgirlik = Object.values(SKOR_AGIRLIKLARI).reduce((t, a) => t + a, 0)
  const kapsam = mevcutAgirlik / toplamAgirlik

  if (kapsam < ASGARI_KAPSAM) {
    // ⚠️ Yetersiz veriyle skor üretmiyoruz. Eksik bileşeni sıfır saymak
    // mahalleyi haksız cezalandırır; ortalama saymak veriyi uydurmaktır.
    return { durum: 'yetersiz_veri', kapsam, eksikBilesenler }
  }

  // Mevcut bileşenler kendi içinde normalize edilir; böylece eksik bileşen
  // skoru orantısız düşürmez ama kapsam bilgisi kullanıcıya gösterilir.
  const toplam = Math.round(agirlikliToplam / mevcutAgirlik)

  return {
    durum: 'hesaplandi',
    veri: { toplam, bilesenler, kapsam, eksikBilesenler },
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Ham puan üreticileri
//
// Her biri gerçek bir ölçümü 0–100 aralığına taşır. Ölçüm yoksa `null`.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fiyat trendi puanı.
 *
 * 24 aylık nominal değişim tek başına anlamsızdır: yüksek enflasyonda her
 * mahalle "yükselmiş" görünür. Bu yüzden mahallenin değişimi, **Çorlu
 * ortalamasına göre** puanlanır — göreli performans ölçülür.
 */
export function fiyatTrendiPuani(
  mahalleDegisim: number | null | undefined,
  bolgeOrtalamaDegisim: number | null | undefined,
): number | null {
  if (typeof mahalleDegisim !== 'number' || !Number.isFinite(mahalleDegisim)) return null
  if (typeof bolgeOrtalamaDegisim !== 'number' || !Number.isFinite(bolgeOrtalamaDegisim)) {
    return null
  }

  // Bölge ortalamasıyla aynıysa 50; her 10 puanlık göreli fark ±25 puan.
  const gorelifark = mahalleDegisim - bolgeOrtalamaDegisim
  return kirp(50 + (gorelifark / 10) * 25)
}

/**
 * Kira çarpanı puanı.
 *
 * ⚠️ Ters yönlü: **düşük** çarpan yatırımcı lehinedir (yatırım kendini
 * daha kısa sürede öder), o yüzden yüksek puan alır.
 */
export function kiraCarpaniPuani(
  carpan: number | null | undefined,
  /** Puanın 100 olduğu çarpan (çok iyi). */
  enIyiCarpan = 12,
  /** Puanın 0 olduğu çarpan (çok kötü). */
  enKotuCarpan = 30,
): number | null {
  if (typeof carpan !== 'number' || !Number.isFinite(carpan) || carpan <= 0) return null
  if (enKotuCarpan <= enIyiCarpan) return null

  const oran = (enKotuCarpan - carpan) / (enKotuCarpan - enIyiCarpan)
  return kirp(oran * 100)
}

/**
 * Mesafe puanı — yakın olan yüksek puan alır.
 *
 * `idealMesafe` içinde 100, `azamiMesafe` dışında 0, arası doğrusal.
 * Sanayi ve ulaşım bileşenleri bunu kullanır.
 */
export function mesafePuani(
  metre: number | null | undefined,
  idealMesafe: number,
  azamiMesafe: number,
): number | null {
  if (typeof metre !== 'number' || !Number.isFinite(metre) || metre < 0) return null
  if (azamiMesafe <= idealMesafe) return null

  if (metre <= idealMesafe) return 100
  if (metre >= azamiMesafe) return 0

  return kirp(((azamiMesafe - metre) / (azamiMesafe - idealMesafe)) * 100)
}

/**
 * Sosyal donatı puanı — belirli yarıçaptaki POI sayısından.
 *
 * `doygunlukSayisi` ve üzeri 100 puan alır: 30 market, 10 markete göre
 * gerçek bir yaşam kalitesi farkı yaratmaz.
 */
export function donatiPuani(
  poiSayisi: number | null | undefined,
  doygunlukSayisi = 15,
): number | null {
  if (typeof poiSayisi !== 'number' || !Number.isFinite(poiSayisi) || poiSayisi < 0) {
    return null
  }
  if (doygunlukSayisi <= 0) return null

  return kirp((poiSayisi / doygunlukSayisi) * 100)
}

/**
 * Arz baskısı puanı.
 *
 * ⚠️ Ters yönlü: çok sayıda devam eden proje = yüksek gelecek arzı =
 * fiyat baskısı = **düşük** puan.
 */
export function arzBaskisiPuani(
  devamEdenKonutSayisi: number | null | undefined,
  mevcutKonutStoku: number | null | undefined,
): number | null {
  if (
    typeof devamEdenKonutSayisi !== 'number' ||
    !Number.isFinite(devamEdenKonutSayisi) ||
    devamEdenKonutSayisi < 0
  ) {
    return null
  }
  if (
    typeof mevcutKonutStoku !== 'number' ||
    !Number.isFinite(mevcutKonutStoku) ||
    mevcutKonutStoku <= 0
  ) {
    return null
  }

  // Stokun %20'si ve üzeri yeni arz = 0 puan; hiç yeni arz yok = 100 puan.
  const oran = devamEdenKonutSayisi / mevcutKonutStoku
  return kirp(100 - (oran / 0.2) * 100)
}

function kirp(deger: number): number {
  return Math.round(Math.min(Math.max(deger, 0), 100))
}
