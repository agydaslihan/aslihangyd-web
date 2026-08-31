import { z } from 'zod'

import { EIDS_DURUMLARI, type EidsDurum } from '@/lib/eids'
import { CEPHE_YONLERI } from '@/lib/gunes/cephe'
import {
  BINA_KULLANIM_DURUMLARI,
  ILAN_KATEGORILERI,
  ILAN_TIPLERI,
  ISINMA_TIPLERI,
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
const ISINMA_DEGERLERI = ISINMA_TIPLERI.map((s) => s.value) as Degerler<typeof ISINMA_TIPLERI>
const KULLANIM_DEGERLERI = BINA_KULLANIM_DURUMLARI.map((s) => s.value) as Degerler<
  typeof BINA_KULLANIM_DURUMLARI
>
const CEPHE_DEGERLERI = CEPHE_YONLERI.map((s) => s.value) as Degerler<typeof CEPHE_YONLERI>

/**
 * İşaret kutusu — form `'on'` gönderiyor, JSON `true`.
 *
 * ⚠️ Boş dize `false` sayılıyor: işaretlenmemiş bir kutu formda hiç
 * gönderilmiyor ve `undefined` geliyor.
 */
/**
 * Sihirbazın ekranda seçili gösterdiği ve kaydettiği varsayılanlar.
 *
 * ⚠️ BUNLAR UYDURMA DEĞİL, KOLEKSİYONUN KENDİ VARSAYILANLARI.
 * `Ilanlar.tip` ve `Ilanlar.kategori` `required` ve `defaultValue` taşıyor;
 * sihirbaz aynı değerleri ekranda SEÇİLİ gösteriyor, yani kullanıcı ne
 * kaydedileceğini görüyor. İkisinin aynı kaldığı `sema.test.ts` içinde
 * koleksiyon kaynağına karşı denetleniyor.
 */
export const VARSAYILAN_TIP = 'satilik' as const
export const VARSAYILAN_KATEGORI = 'konut' as const

const isaretKutusu = z
  .union([z.boolean(), z.literal('on'), z.literal('')])
  .optional()
  .transform((deger) => deger === true || deger === 'on')

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

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  ⚠️ TÜM ALANLAR İSTEĞE BAĞLI — EİDS DIŞINDA. VE BU BİR GEVŞEME DEĞİL.
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Sihirbaz sahada, telefondan, taşınmazın içinde kullanılacak. Aslıhan
 * daireyi gezerken oda sayısını biliyor, ada/parseli bilmiyor; fotoğrafı
 * çekebiliyor, fiyatı henüz konuşmamış. Zorunlu alan koymak, o anda
 * girilebilecek bilgiyi de girilemez yapardı: yarım bırakılamayan bir form,
 * hiç başlanmayan bir formdur.
 *
 * ⚠️ AMA YAYINA ALMAK BAŞKA ŞEY. EİDS koşulları sağlanmadan hiçbir kayıt
 * yayınlanamaz; kapı `eidsYayinEngeli` kancasında ve sihirbaz ona
 * dokunmuyor. Son adımdaki kontrol listesi o kapının AYNASI — ikinci bir
 * kapı değil.
 *
 * ⚠️ BAŞLIK DA İSTEĞE BAĞLI. Payload'da `baslik` zorunlu; boş bırakılırsa
 * eylem tarihli bir taslak adı üretiyor ("Taslak — 31 Ağustos 2026 14:05")
 * ve bunu kullanıcıya söylüyor. Uydurma bir başlık değil, açıkça geçici
 * bir ad.
 */
/**
 * 1 · Kategori — kademeli seçim.
 *
 * ⚠️ AYRI ADIM OLMASININ SEBEBİ SIRA DEĞİL, SONUÇ. İşlem türü ve kategori
 * sonraki adımların NE SORACAĞINI belirliyor: kiralıkta "tahmini kira"
 * sorulmuyor, arsada oda sayısı anlamsız. İkisini formun ortasına
 * gömmek, kullanıcıyı doldurduğu alanların bir kısmının silineceği bir
 * seçime sonradan götürürdü.
 */
export const kategoriSemasi = z.object({
  tip: z.enum(ILAN_TIP_DEGERLERI).optional(),
  kategori: z.enum(KATEGORI_DEGERLERI).optional(),
})

export const temelSemasi = z.object({
  baslik: istegeBagliMetin.refine(
    (deger) => deger.length <= 160,
    'Başlık en fazla 160 karakter olabilir.',
  ),

  // Payload ilişki alanı sayı bekliyor; dize olarak taşınıp eylemde çözülüyor.
  mahalle: istegeBagliMetin,
})

/**
 * Tapu ve EİDS — tek adım.
 *
 * ⚠️ İKİSİ AYNI BELGEDEN OKUNUYOR. Ada, parsel ve taşınmaz numarası tapu
 * belgesinde yan yana duruyor; yetkilendirme de o taşınmaza veriliyor.
 * Ayrı adımlara bölmek, aynı kâğıdı iki kez çıkarmak demekti.
 */
export const tapuSemasi = z.object({
  il: istegeBagliMetin.default(VARSAYILAN_IL),
  ilce: istegeBagliMetin.default(VARSAYILAN_ILCE),
  adres: istegeBagliMetin,
  ada: istegeBagliMetin,
  parsel: istegeBagliMetin,
  tapuDurumu: z.enum(TAPU_DEGERLERI).optional(),

  eidsDurum: z.enum(EIDS_DEGERLERI).optional(),
  tasinmazNo: istegeBagliMetin,
  eidsYetkiBaslangic: istegeBagliTarih,
  eidsYetkiBitis: istegeBagliTarih,

  /** Sahada GPS'ten alınan koordinat — `[boylam, enlem]`. */
  boylam: istegeBagliSayi('Boylam', -180),
  enlem: istegeBagliSayi('Enlem', -90),
})

/** Nitelikler — taşınmazın kendisi. */
export const nitelikSemasi = z.object({
  brutM2: istegeBagliSayi('Brüt m²'),
  netM2: istegeBagliSayi('Net m²'),
  odaSayisi: z.enum(ODA_DEGERLERI).optional(),
  banyoSayisi: istegeBagliSayi('Banyo sayısı'),
  bulunduguKat: istegeBagliMetin,
  toplamKat: istegeBagliSayi('Toplam kat'),
  binaYasi: istegeBagliSayi('Bina yaşı'),
  isinma: z.enum(ISINMA_DEGERLERI).optional(),
  kullanimDurumu: z.enum(KULLANIM_DEGERLERI).optional(),
  /**
   * ⚠️ Cephe yönü ÇOKLU ve boş bırakılabilir. "Muhtemelen güney" demek,
   * alım kararı doğrudan buna dayandığı için uydurma veri yasağının en
   * pahalı ihlali olurdu (kural 2).
   */
  cepheYonu: z.array(z.enum(CEPHE_DEGERLERI)).optional(),
  esyali: isaretKutusu,
  krediyeUygun: isaretKutusu,
  asansor: isaretKutusu,
})

/** Görseller — sıralı medya kimlikleri. İlk sıradaki kapak. */
export const gorselSemasi = z.object({
  gorseller: z.array(z.number()).optional(),
  katPlani: istegeBagliSayi('Kat planı'),
})

/** Açıklama — düz metin; Payload tarafında zengin metne çevriliyor. */
export const aciklamaSemasi = z.object({
  ozet: istegeBagliMetin.refine(
    (deger) => deger.length <= 400,
    'Kısa özet en fazla 400 karakter olabilir.',
  ),
  aciklama: istegeBagliMetin,
})

/** Video ve 360° tur. */
export const medyaSemasi = z.object({
  videoKaynagi: z.enum(['yok', 'youtube', 'bunny']).optional(),
  droneVideoYoutube: istegeBagliMetin,
  droneVideoId: istegeBagliMetin,
  sanalTurUrl: istegeBagliMetin.refine(
    (deger) => deger === '' || /^https:\/\//.test(deger),
    'Tur adresi https:// ile başlamalı.',
  ),
})

/** Fiyat — satış/kira, aidat, pazarlık payı. */
export const fiyatSemasi = z.object({
  fiyat: istegeBagliSayi('Fiyat'),
  paraBirimi: z.enum(['TRY', 'USD', 'EUR']).default('TRY'),
  tahminiKira: istegeBagliSayi('Tahmini kira'),
  aidat: istegeBagliSayi('Aidat'),
  pazarlikPayi: isaretKutusu,
})

/**
 * Yayın adımı — GÖRÜNÜRLÜK, YAYIN DEĞİL.
 *
 * ⚠️ `durum` ALANI BU ŞEMADA YOK VE OLMAYACAK. Sihirbaz daima taslak
 * üretiyor; istemciden gelen hiçbir değer o alana yazılmıyor. Yayına alma,
 * EİDS kapısının bulunduğu Payload admin'de bilinçli bir eylem olarak
 * kalıyor (CLAUDE.md kural 1).
 */
export const yayinSemasi = z.object({
  gizliPortfoy: isaretKutusu,
  oneCikan: isaretKutusu,
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
export const sihirbazSemasi = kategoriSemasi
  .and(temelSemasi)
  .and(tapuSemasi)
  .and(nitelikSemasi)
  .and(fiyatSemasi)
  .and(gorselSemasi)
  .and(aciklamaSemasi)
  .and(medyaSemasi)
  .and(yayinSemasi)

export type SihirbazGirdisi = z.input<typeof sihirbazSemasi>
export type SihirbazVerisi = z.output<typeof sihirbazSemasi>

/**
 * Adımlar — arayüz, ilerleme çubuğu ve doğrulama AYNI listeden besleniyor.
 *
 * ⚠️ SEKİZ ADIM, HER BİRİ KENDİ EKRANI. Sahada telefondan kullanılacak bir
 * formda tek uzun sayfa, hangi alanın dolduğunu göremeyen bir kaydırma
 * şeridi demek.
 *
 * ⚠️ ADIMLAR ARASI GEZİNME SERBEST. Sıralı zorlamak, "ada/parseli sonra
 * bakarım" diyen kullanıcıyı formun ortasında bırakırdı.
 *
 * `zorunlu` alanları tamamlanma yüzdesinin paydası: bir adımın "dolu"
 * sayılması için hangi alanların girilmesi gerektiğini söylüyor. Bu bir
 * doğrulama kuralı DEĞİL — hiçbiri kaydı engellemiyor.
 */
export const ADIMLAR = [
  {
    anahtar: 'kategori',
    baslik: 'Kategori',
    aciklama: 'İşlem türü ve kategori — sonraki adımların ne soracağını belirler.',
    sema: kategoriSemasi,
    alanlar: ['tip', 'kategori'],
  },
  {
    anahtar: 'temel',
    baslik: 'Temel',
    aciklama: 'Mahalle ve başlık.',
    sema: temelSemasi,
    alanlar: ['mahalle', 'baslik'],
  },
  {
    anahtar: 'tapu',
    baslik: 'Tapu ve EİDS',
    aciklama: 'Ada, parsel, taşınmaz numarası ve yetki tarihleri.',
    sema: tapuSemasi,
    alanlar: ['ada', 'parsel', 'tasinmazNo', 'eidsDurum', 'eidsYetkiBaslangic', 'eidsYetkiBitis'],
  },
  {
    anahtar: 'nitelikler',
    baslik: 'Nitelikler',
    aciklama: 'm², oda, kat, yaş, ısınma, cephe.',
    sema: nitelikSemasi,
    alanlar: ['brutM2', 'odaSayisi', 'bulunduguKat', 'binaYasi', 'isinma', 'cepheYonu'],
  },
  {
    anahtar: 'fiyat',
    baslik: 'Fiyat',
    aciklama: 'Satış/kira bedeli, aidat, tahmini kira.',
    sema: fiyatSemasi,
    alanlar: ['fiyat', 'tahminiKira', 'aidat'],
  },
  {
    anahtar: 'gorseller',
    baslik: 'Fotoğraflar',
    aciklama: 'Toplu yükleme, sıralama, kapak seçimi.',
    sema: gorselSemasi,
    alanlar: ['gorseller'],
  },
  {
    anahtar: 'aciklama',
    baslik: 'Açıklama',
    aciklama: 'Kısa özet ve ilan metni.',
    sema: aciklamaSemasi,
    alanlar: ['ozet', 'aciklama'],
  },
  {
    anahtar: 'medya',
    baslik: 'Video ve tur',
    aciklama: 'YouTube/Bunny videosu, 360° tur adresi.',
    sema: medyaSemasi,
    alanlar: ['videoKaynagi', 'sanalTurUrl'],
  },
  {
    anahtar: 'onizleme',
    baslik: 'Ön izleme',
    aciklama: 'İlan sayfasında nasıl görüneceği.',
    sema: yayinSemasi,
    alanlar: [],
  },
  {
    anahtar: 'yayin',
    baslik: 'Yayın',
    aciklama: 'Kontrol listesi ve görünürlük.',
    sema: yayinSemasi,
    alanlar: [],
  },
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
