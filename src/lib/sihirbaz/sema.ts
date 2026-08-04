import { z } from 'zod'

import { EIDS_DURUMLARI, type EidsDurum } from '@/lib/eids'
import {
  ILAN_KATEGORILERI,
  ILAN_TIPLERI,
  ODA_SAYILARI,
  TAPU_DURUMLARI,
  VARSAYILAN_IL,
  VARSAYILAN_ILCE,
} from '@/lib/secenekler'

/**
 * Portföy giriş sihirbazı — doğrulama şeması.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ SİHİRBAZ, PAYLOAD ADMIN'İN YERİNE GEÇMEZ — YANINDA DURUR.
 *
 * Bu ayrım tasarımın temeli. Sihirbaz yalnızca **hızlı ilk giriş** yapar ve
 * kaydı daima `taslak` olarak oluşturur. Yayına alma, medya yükleme,
 * zengin metin düzenleme ve sonraki tüm düzenlemeler Payload admin'de
 * kalır.
 *
 * Neden böyle:
 *  - EİDS kapısı (`eidsYayinEngeli` kancası) tek yerde kalır. Sihirbaza
 *    yayınlama yetkisi vermek, o kapının ikinci bir kopyasını doğurur ve
 *    iki kopyanın er ya da geç ayrışması demektir (CLAUDE.md kural 1).
 *  - Sihirbazın yazdığı her şey Payload Local API üzerinden gider, yani
 *    `beforeChange` kancaları aynen çalışır. Sihirbaz bir kestirme değil,
 *    aynı kapıdan geçen daha rahat bir yoldur.
 *
 * Bu şema Payload'ın alan doğrulamasının YERİNE geçmez, ondan ÖNCE gelir:
 * kullanıcıya adım adım ve Türkçe geri bildirim vermek için. Gerçek kapı
 * yine koleksiyonun kendisi.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Seçenek listelerinden Zod enum değerleri.
 *
 * ⚠️ `as [string, ...string[]]` yerine gerçek birlik tipi korunuyor. Aksi
 * halde şemanın çıktısı gevşek `string` olur ve `eidsDurum` gibi alanlar
 * `EidsDurum` bekleyen motorlara geçirilemez — tip güvenliği tam da bu
 * sınırda kaybedilirdi.
 */
type Degerler<T extends readonly { readonly value: string }[]> = [
  T[number]['value'],
  ...T[number]['value'][],
]

const ILAN_TIP_DEGERLERI = ILAN_TIPLERI.map((secenek) => secenek.value) as Degerler<
  typeof ILAN_TIPLERI
>
const KATEGORI_DEGERLERI = ILAN_KATEGORILERI.map((secenek) => secenek.value) as Degerler<
  typeof ILAN_KATEGORILERI
>
const ODA_DEGERLERI = ODA_SAYILARI.map((secenek) => secenek.value) as Degerler<typeof ODA_SAYILARI>
const TAPU_DEGERLERI = TAPU_DURUMLARI.map((secenek) => secenek.value) as Degerler<
  typeof TAPU_DURUMLARI
>
const EIDS_DEGERLERI = [...EIDS_DURUMLARI] as [EidsDurum, ...EidsDurum[]]

/** Boş bırakılabilen metin — gönderilmezse boş dizeye düşer. */
const istegeBagliMetin = z.string({ error: 'Bu alan metin olmalı.' }).trim().default('')

/**
 * İsteğe bağlı sayı.
 *
 * ⚠️ Boş dize `undefined`'a çevrilir, **sıfıra değil.** "Girilmedi" ile
 * "sıfır" farklı şeylerdir; karıştırılırsa yatırım göstergeleri sessizce
 * yanlış hesaplanır (CLAUDE.md kural 2).
 */
function istegeBagliSayi(etiket: string, enAz = 0) {
  return z
    .union([z.number(), z.string()])
    .optional()
    .transform((deger) => {
      if (deger === undefined || deger === '') return undefined
      const sayi = typeof deger === 'number' ? deger : Number(deger)
      return Number.isFinite(sayi) ? sayi : Number.NaN
    })
    .refine((deger) => deger === undefined || !Number.isNaN(deger), `${etiket} sayı olmalı.`)
    .refine((deger) => deger === undefined || deger >= enAz, `${etiket} ${enAz}'dan küçük olamaz.`)
}

/** İsteğe bağlı tarih — `YYYY-AA-GG`. */
const istegeBagliTarih = istegeBagliMetin.refine(
  (deger) => deger === '' || /^\d{4}-\d{2}-\d{2}$/.test(deger),
  'Tarihi GG.AA.YYYY biçiminde seçin.',
)

// ═══════════════════════════════════════════════════════════════════════════
// Adım şemaları
//
// Her adım ayrı doğrulanabilir olmalı: kullanıcı 2. adımdayken 4. adımın
// eksiklerini yüzüne çarpmak, sihirbazın tüm anlamını yok eder.
// ═══════════════════════════════════════════════════════════════════════════

export const temelSemasi = z.object({
  baslik: z
    .string({ error: 'İlan başlığı gerekli.' })
    .trim()
    .min(10, 'Başlık en az 10 karakter olmalı — arama sonuçlarında bu görünecek.')
    .max(160, 'Başlık en fazla 160 karakter olabilir.'),

  tip: z.enum(ILAN_TIP_DEGERLERI, { error: 'İlan tipini seçin.' }),
  kategori: z.enum(KATEGORI_DEGERLERI, { error: 'Kategoriyi seçin.' }),

  ozet: istegeBagliMetin.refine(
    (deger) => deger.length <= 400,
    'Kısa özet en fazla 400 karakter olabilir.',
  ),
})

export const konumSemasi = z.object({
  il: z.string({ error: 'İl gerekli.' }).trim().min(2, 'İl gerekli.').default(VARSAYILAN_IL),
  ilce: z
    .string({ error: 'İlçe gerekli.' })
    .trim()
    .min(2, 'İlçe gerekli.')
    .default(VARSAYILAN_ILCE),

  // Payload ilişki alanı sayı veya UUID olabilir; dize olarak taşınıp
  // eylemde çözülüyor.
  mahalle: z.string({ error: 'Mahalle seçin.' }).trim().min(1, 'Mahalle seçin.'),

  adres: istegeBagliMetin,
  ada: istegeBagliMetin,
  parsel: istegeBagliMetin,
  tapuDurumu: z.enum(TAPU_DEGERLERI).optional(),
})

export const rakamlarSemasi = z.object({
  fiyat: istegeBagliSayi('Fiyat'),
  paraBirimi: z.enum(['TRY', 'USD', 'EUR']).default('TRY'),
  tahminiKira: istegeBagliSayi('Tahmini kira'),
  aidat: istegeBagliSayi('Aidat'),
  brutM2: istegeBagliSayi('Brüt m²'),
  netM2: istegeBagliSayi('Net m²'),
  odaSayisi: z.enum(ODA_DEGERLERI).optional(),
  bulunduguKat: istegeBagliMetin,
  toplamKat: istegeBagliSayi('Toplam kat'),
  binaYasi: istegeBagliSayi('Bina yaşı'),
})

export const eidsSemasi = z.object({
  eidsDurum: z.enum(EIDS_DEGERLERI).optional(),
  tasinmazNo: istegeBagliMetin,
  eidsYetkiBaslangic: istegeBagliTarih,
  eidsYetkiBitis: istegeBagliTarih,
})

/**
 * Tam şema — sunucu eyleminin kapısı.
 *
 * ⚠️ EİDS alanları burada ZORUNLU DEĞİL. Sihirbaz taslak üretir; taslak
 * için EİDS aranmaz. Eksik EİDS bilgisi kullanıcıya adım adım gösterilir
 * ama kaydı engellemez — aksi halde "yetkiyi henüz almadım, önce taşınmazı
 * sisteme gireyim" gibi tamamen meşru bir akış imkânsız olurdu.
 *
 * Yayına alma anında EİDS koşulları `eidsYayinEngeli` kancasıyla
 * pazarlıksız uygulanır; sihirbazın burada gevşek olması o kapıyı
 * gevşetmez.
 */
export const sihirbazSemasi = temelSemasi
  .and(konumSemasi)
  .and(rakamlarSemasi)
  .and(eidsSemasi)
  .and(
    z.object({
      gizliPortfoy: z
        .union([z.boolean(), z.literal('on'), z.literal('')])
        .optional()
        .transform((deger) => deger === true || deger === 'on'),
    }),
  )

export type SihirbazGirdisi = z.input<typeof sihirbazSemasi>
export type SihirbazVerisi = z.output<typeof sihirbazSemasi>

/** Adım anahtarları — arayüz ve doğrulama aynı listeden beslenir. */
export const ADIMLAR = [
  { anahtar: 'temel', baslik: 'Temel bilgiler', sema: temelSemasi },
  { anahtar: 'konum', baslik: 'Konum ve tapu', sema: konumSemasi },
  { anahtar: 'rakamlar', baslik: 'Rakamlar', sema: rakamlarSemasi },
  { anahtar: 'eids', baslik: 'EİDS yetkisi', sema: eidsSemasi },
  { anahtar: 'ozet', baslik: 'Özet ve kayıt', sema: null },
] as const

export type AdimAnahtari = (typeof ADIMLAR)[number]['anahtar']

/**
 * Bir adımın alan hatalarını döndürür. Hata yoksa boş nesne.
 *
 * Zod'un `flatten()` çıktısı doğrudan kullanılmıyor: arayüzün alan başına
 * tek bir mesaja ihtiyacı var, dizi değil.
 */
export function adimHatalari(sema: z.ZodType, veri: unknown): Record<string, string> {
  const sonuc = sema.safeParse(veri)
  if (sonuc.success) return {}

  const hatalar: Record<string, string> = {}
  for (const sorun of sonuc.error.issues) {
    const alan = String(sorun.path[0] ?? '')
    if (alan !== '' && hatalar[alan] === undefined) {
      hatalar[alan] = sorun.message
    }
  }
  return hatalar
}
