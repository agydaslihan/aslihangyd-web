/**
 * Ölçümün İSTEMCİYE İNEN küçük parçası.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ OLAY SÖZLÜĞÜ BU DOSYADA DEĞİL — `sozluk.ts` içinde. Ayrım ölçülerek
 * yapıldı, estetik değil.
 *
 * Sözlük başlangıçta buradaydı ve `FiltrePaneli` yalnızca `fiyatBandi()`
 * için bu dosyayı içe aktarıyordu. Sonuç: on beş olayın Türkçe
 * AÇIKLAMALARI, onay vermemiş ziyaretçinin portföy sayfası paketine de
 * giriyordu. Ölçüm kodunun, ölçülmeyi kabul etmeyen ziyaretçiye bayt
 * maliyeti çıkarması kabul edilemez.
 *
 * Buraya yalnızca istemcide GERÇEKTEN gereken şeyler girer: tipler, cihaz
 * sınıfı, fiyat bantları, değerleme alanları.
 *
 * ⚠️ Bu dosyada ağ, veritabanı ya da `process.env` erişimi YOK.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Niyet ağırlığı — tıklama sayısı değil, lead'e yakınlık.
 *
 * ⚠️ Sıralamanın tamamı buna dayanıyor. "En çok tıklanan" listesi yanıltıcı:
 * kaydırma çubuğuna dokunmakla WhatsApp'a basmak aynı listede yan yana
 * durmamalı.
 */
export type Niyet = 'yuksek' | 'orta' | 'dusuk'

export const NIYET_SIRASI: readonly Niyet[] = ['yuksek', 'orta', 'dusuk']

export const NIYET_ETIKETI: Record<Niyet, string> = {
  yuksek: 'Yüksek niyet',
  orta: 'Orta niyet',
  dusuk: 'Düşük niyet',
}

/** Ölçümün hangi katmandan geldiği — panelde her metriğin yanında görünür. */
export type Katman = 'A' | 'B'

export const KATMAN_ETIKETI: Record<Katman, string> = {
  A: 'Katman A — onaysız, sunucu tarafı, toplulaştırılmış',
  B: 'Katman B — yalnızca analitik onayı verenler',
}
/**
 * Değerleme akışının aşamaları.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ŞARTNAMEDEN SAPMA — SEBEBİ ARAYÜZÜN KENDİSİ.
 *
 * Şartname "değerleme SİHİRBAZI, adım adım tamamlama oranı" diyor. Ama
 * `DegerlemeSihirbazi` çok adımlı bir sihirbaz DEĞİL: tek sayfada beş alanı
 * olan ve her tuşta sonucu canlı hesaplayan bir form (bal küpü kuralı 6b:
 * sonuç kilitli değil). Ekranda "adım" diye bir şey yok.
 *
 * Sorulan soru yine cevaplanıyor — "nerede kopuyor?" — ama ölçü birimi ADIM
 * değil ALAN: hangi alana kadar doldurulup bırakıldığı. Var olmayan adımları
 * ölçmek, paneli gerçekle ilgisiz bir grafikle doldurmak olurdu.
 *
 * ⚠️ Sıra, formdaki alan sırasıyla AYNI olmak zorunda; `gozlem.test.ts`
 * ikisini karşılaştırıyor. Ayrışırsa huni yanlış yerde düşüş gösterir ve
 * yanlış düzeltme yapılır.
 * ─────────────────────────────────────────────────────────────────────────
 */
export const DEGERLEME_ALANLARI: readonly { anahtar: string; etiket: string }[] = [
  { anahtar: 'mahalle', etiket: 'Mahalle' },
  { anahtar: 'm2', etiket: 'Brüt m²' },
  { anahtar: 'kat', etiket: 'Kat' },
  { anahtar: 'binaYasi', etiket: 'Bina yaşı' },
  { anahtar: 'durum', etiket: 'Bina durumu' },
]

/* ────────────────────────────────────────────────────────────────────────
 * Bantlama — tam değer değil, aralık.
 *
 * ⚠️ KVKK gerekçesi: tam bütçe değeri, mahalle ve tarih birleştiğinde tek
 * bir ziyaretçiyi işaret edebilir. Bant, aynı kararı aldırırken bunu
 * imkânsız kılıyor: "3–5 milyon arası arayanlar arttı" bilgisi Aslıhan için
 * yeterli, "4.237.500 arandı" ise gereksiz ve riskli.
 * ──────────────────────────────────────────────────────────────────────── */

export interface FiyatBandi {
  /**
   * Olayla gönderilen sabit anahtar.
   *
   * ⚠️ ETİKET GÖNDERİLMİYOR, ANAHTAR GÖNDERİLİYOR. Etiketler "₺" ve tire
   * içeriyor; ayrıntı alanı bunları temizlediği için "3–5 mn ₺" yolda
   * "35mn" hâline gelir ve panelde anlamsız bir satır olarak görünürdü.
   * Anahtar sade, etiket panelde bu listeden okunuyor.
   */
  anahtar: string
  alt: number
  ust: number | null
  etiket: string
}

export const FIYAT_BANTLARI: readonly FiyatBandi[] = [
  { anahtar: 'b0-1', alt: 0, ust: 1_000_000, etiket: '0–1 mn ₺' },
  { anahtar: 'b1-2', alt: 1_000_000, ust: 2_000_000, etiket: '1–2 mn ₺' },
  { anahtar: 'b2-3', alt: 2_000_000, ust: 3_000_000, etiket: '2–3 mn ₺' },
  { anahtar: 'b3-5', alt: 3_000_000, ust: 5_000_000, etiket: '3–5 mn ₺' },
  { anahtar: 'b5-10', alt: 5_000_000, ust: 10_000_000, etiket: '5–10 mn ₺' },
  { anahtar: 'b10ust', alt: 10_000_000, ust: null, etiket: '10 mn ₺ üzeri' },
]

export function fiyatBandi(deger: number): FiyatBandi | null {
  if (!Number.isFinite(deger) || deger < 0) return null
  return (
    FIYAT_BANTLARI.find(({ alt, ust }) => deger >= alt && (ust === null || deger < ust)) ?? null
  )
}

/** Anahtardan panelde görünecek etiketi bulur. */
export function fiyatBandiEtiketi(anahtar: string): string {
  return FIYAT_BANTLARI.find((bant) => bant.anahtar === anahtar)?.etiket ?? anahtar
}

/** Cihaz sınıfı — User-Agent SAKLANMADAN, yalnızca iki kovaya ayrılır. */
export type CihazSinifi = 'mobil' | 'masaustu'

/**
 * ⚠️ Kaba ve bilinçli olarak kaba.
 *
 * Amaç cihaz modelini bilmek değil, "trafiğin ~%75'i mobil" varsayımının
 * hâlâ doğru olup olmadığını görmek. Ayrıntılı bir ayrıştırıcı, User-Agent'ı
 * saklamadan bile parmak izine yaklaşan bir sınıflandırma üretirdi.
 */
export function cihazSinifi(userAgent: string | null | undefined): CihazSinifi {
  if (typeof userAgent !== 'string') return 'masaustu'
  return /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(userAgent) ? 'mobil' : 'masaustu'
}
