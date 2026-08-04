/**
 * İlan üzerinde türetilen yatırım göstergeleri.
 *
 * Tanımlar CLAUDE.md "Hesaplanan alanlar" bölümünden birebir alınmıştır:
 *   kiraCarpani    = fiyat / (tahminiKira × 12)
 *   brutGetiri (%) = (tahminiKira × 12) / fiyat × 100
 *   amortismanYili = kiraCarpani
 *
 * Tasarım kuralı: **veri yoksa sayı uydurulmaz, `null` döner.** Arayüz bu
 * `null`u boş durum olarak gösterir. Bir yatırım sitesinde "0 yıl amortisman"
 * yazmak, "veri bekleniyor" yazmaktan çok daha zararlıdır.
 */

export interface IlanGostergeGirdisi {
  fiyat?: number | null
  /** Aylık tahmini kira. Kiralık ilanlarda ilanın kendi fiyatı kullanılmaz. */
  tahminiKira?: number | null
}

export interface IlanGostergeleri {
  /** Kaç yıllık kira, satış fiyatına eşittir. Düşük olması yatırımcı lehinedir. */
  kiraCarpani: number | null
  /** Yıllık brüt kira getirisi, yüzde. */
  brutGetiri: number | null
  /** Amortisman süresi (yıl) — tanım gereği kira çarpanına eşittir. */
  amortismanYili: number | null
}

/** İki ondalık basamağa yuvarlar. Para/oran gösteriminde yeterli hassasiyet. */
function yuvarla(deger: number): number {
  return Math.round(deger * 100) / 100
}

function pozitifMi(deger: number | null | undefined): deger is number {
  return typeof deger === 'number' && Number.isFinite(deger) && deger > 0
}

export function gostergeleriHesapla(girdi: IlanGostergeGirdisi): IlanGostergeleri {
  const { fiyat, tahminiKira } = girdi

  if (!pozitifMi(fiyat) || !pozitifMi(tahminiKira)) {
    return { kiraCarpani: null, brutGetiri: null, amortismanYili: null }
  }

  const yillikKira = tahminiKira * 12
  const kiraCarpani = yuvarla(fiyat / yillikKira)

  return {
    kiraCarpani,
    brutGetiri: yuvarla((yillikKira / fiyat) * 100),
    // Tanım gereği aynı değer. Ayrı alan olarak tutulur çünkü kullanıcıya
    // farklı bir soruya cevap olarak sunulur ("kaç yılda kendini öder?").
    amortismanYili: kiraCarpani,
  }
}
