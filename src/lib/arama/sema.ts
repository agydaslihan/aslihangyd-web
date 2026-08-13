import { z } from 'zod'

import { ILAN_KATEGORILERI, ILAN_TIPLERI, ODA_SAYILARI } from '@/lib/secenekler'

import { AZAMI_SORGU_UZUNLUGU } from './sabitler'

/**
 * AI doğal dil aramasının çıktı şeması.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ MODEL CEVAP ÜRETMEZ, FİLTRE ÜRETİR
 *
 * PROJE-PLANI.md §4: "Model *cevap* değil, *filtre* üretir — halüsinasyon
 * riski sıfırlanır." Bu şema o vaadin teknik karşılığıdır.
 *
 * Modelin üretebileceği tek şey aşağıdaki dar yapıdır. Fiyat, m², mahalle
 * açıklaması gibi hiçbir **içerik** modelden gelmez; sonuçların tamamı
 * veritabanından, mevcut ve test edilmiş filtre yolundan çıkar.
 *
 * Şemanın dışındaki her alan doğrulamada düşer. Model "mahalle: Kazımiye"
 * derse ve böyle bir mahalle yoksa, o alan boşalır — uydurulmuş bir
 * mahalleyle arama yapılmaz.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Aramanın üretebileceği azami fiyat — tuş hatası ve saçma değer koruması. */
export const AZAMI_FIYAT = 1_000_000_000

/** Ziyaretçinin yazabileceği azami sorgu uzunluğu. */
// ⚠️ Sabit `sabitler.ts` içinde yaşıyor: istemci onu zod'suz alabilsin
// diye. Buradan yeniden dışa aktarılıyor ki sunucu tarafı çağrılar
// değişmesin ve tek kaynak korunsun.
export { AZAMI_SORGU_UZUNLUGU } from './sabitler'

const tipDegerleri = ILAN_TIPLERI.map((t) => t.value) as [string, ...string[]]
const kategoriDegerleri = ILAN_KATEGORILERI.map((k) => k.value) as [string, ...string[]]
const odaDegerleri = ODA_SAYILARI.map((o) => o.value) as [string, ...string[]]

export const SIRALAMA_DEGERLERI = ['yeni', 'fiyat_artan', 'fiyat_azalan', 'carpan_artan'] as const

/**
 * Modelden istenen yapı.
 *
 * Her alan isteğe bağlı ve `nullable`: yapılandırılmış çıktı şemasında
 * "alan yok" ile "alan boş" arasındaki farkı modele bırakmıyoruz — ikisi de
 * "filtre uygulama" anlamına gelir.
 */
export const aramaFiltresiSemasi = z.object({
  tip: z.enum(tipDegerleri).nullable(),
  kategori: z.enum(kategoriDegerleri).nullable(),
  /** Mahalle **slug**'ı. İstem içinde geçerli slug listesi modele verilir. */
  mahalle: z.string().nullable(),
  odaSayisi: z.enum(odaDegerleri).nullable(),
  enAzFiyat: z.number().nullable(),
  enCokFiyat: z.number().nullable(),
  siralama: z.enum(SIRALAMA_DEGERLERI).nullable(),
  /**
   * Sorgunun filtreye çevrilemeyen kısımları.
   *
   * ⚠️ Bu alan gösteriş değil, dürüstlük mekanizması. "OSB'ye 10 dakika,
   * güney cephe, asansörlü" gibi ifadeler filtre alanlarımızda yok. Bunları
   * sessizce yok saymak, ziyaretçiye isteğinin tamamının uygulandığını
   * düşündürürdü. Burada toplanır ve arayüzde açıkça gösterilir.
   */
  anlasilmayan: z.array(z.string()),
})

export type AramaFiltresi = z.infer<typeof aramaFiltresiSemasi>

/** Ziyaretçi sorgusunun temel doğrulaması. */
export const sorguSemasi = z
  .string()
  .trim()
  .min(3, 'Aramanız çok kısa.')
  .max(AZAMI_SORGU_UZUNLUGU, `Aramanız en fazla ${AZAMI_SORGU_UZUNLUGU} karakter olabilir.`)

/**
 * Model çıktısını URL sorgu parametrelerine çevirir.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ MİMARİNİN KİLİT TAŞI
 *
 * AI'nin ürettiği şey bir **URL**'dir, bir veritabanı sorgusu değil.
 * Ziyaretçi `/portfoy?tip=satilik&odaSayisi=3+1` adresine gönderilir ve
 * oradan sonrası, aylardır çalışan ve test edilmiş normal filtre yoludur.
 *
 * Üç şeyi birden kazandırıyor:
 *  1. **Güvenlik:** Model sorgu üretmiyor; yeni bir saldırı yüzeyi yok.
 *  2. **Şeffaflık:** Anlaşılan filtre, mevcut filtre çubuğunda görünür.
 *  3. **Düzeltilebilirlik:** Ziyaretçi yanlış anlaşılan filtreyi elle
 *     değiştirebilir — kara kutu değil.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Geçerli mahalle listesi burada da doğrulanır: modelin uydurduğu bir slug
 * URL'ye yazılmaz.
 */
export function filtreyiParametrelereCevir(
  filtre: AramaFiltresi,
  gecerliMahalleSluglari: readonly string[],
): URLSearchParams {
  const parametreler = new URLSearchParams()

  const ekle = (anahtar: string, deger: string | null): void => {
    if (deger !== null && deger !== '') parametreler.set(anahtar, deger)
  }

  ekle('tip', filtre.tip)
  ekle('kategori', filtre.kategori)
  ekle('odaSayisi', filtre.odaSayisi)
  ekle('siralama', filtre.siralama)

  // ⚠️ Model uydurmuş olabilir; listede yoksa yazılmaz.
  if (filtre.mahalle && gecerliMahalleSluglari.includes(filtre.mahalle)) {
    parametreler.set('mahalle', filtre.mahalle)
  }

  const fiyatEkle = (anahtar: string, deger: number | null): void => {
    if (deger === null || !Number.isFinite(deger)) return
    if (deger <= 0 || deger > AZAMI_FIYAT) return
    parametreler.set(anahtar, String(Math.round(deger)))
  }

  fiyatEkle('enAzFiyat', filtre.enAzFiyat)
  fiyatEkle('enCokFiyat', filtre.enCokFiyat)

  // Alt sınır üst sınırdan büyükse ikisi de anlamsızdır; ikisini de
  // bırakmak "0 sonuç" üretirdi ve sebebi görünmezdi.
  const enAz = Number(parametreler.get('enAzFiyat'))
  const enCok = Number(parametreler.get('enCokFiyat'))
  if (parametreler.has('enAzFiyat') && parametreler.has('enCokFiyat') && enAz > enCok) {
    parametreler.delete('enAzFiyat')
    parametreler.delete('enCokFiyat')
  }

  return parametreler
}

/** Hiçbir alan dolmadıysa arama boşa çıkmıştır. */
export function filtreBosMu(parametreler: URLSearchParams): boolean {
  return [...parametreler.keys()].length === 0
}
