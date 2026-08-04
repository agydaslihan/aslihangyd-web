import { z } from 'zod'

import { TALEP_TIPLERI, type TalepTipi } from '@/lib/secenekler'

/**
 * Talep (lead) formu doğrulaması.
 *
 * Aynı şema hem istemcide (anında geri bildirim) hem sunucuda (gerçek
 * kapı) kullanılır. Sunucu doğrulaması pazarlığa kapalıdır: istemci
 * doğrulaması bir kolaylıktır, güvenlik önlemi değildir.
 *
 * Hata mesajları Türkçe, insani ve **çözüm önerili** yazıldı. Her alanda
 * `error` açıkça verildi; aksi halde alan hiç gönderilmediğinde Zod'un
 * İngilizce varsayılan metni ("Invalid input: expected string…")
 * kullanıcıya kadar sızar.
 */

/**
 * Türkiye cep telefonu.
 * Kabul edilen yazımlar: 05XX…, +905XX…, 905XX…, 5XX…, aralarında boşluk,
 * tire veya parantez olabilir. İnsanlar numarayı tek biçimde yazmaz;
 * biçim dayatmak yerine ayrıştırmak dönüşümü artırır.
 */
const TELEFON_DESENI = /^(?:\+?90|0)?[\s(]*5\d{2}[\s)]*[\s-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}$/

const TALEP_TIP_DEGERLERI = TALEP_TIPLERI.map((secenek) => secenek.value) as [
  TalepTipi,
  ...TalepTipi[],
]

/** Boş bırakılabilen metin alanı — gönderilmezse boş dizeye düşer. */
const istegeBagliMetin = z.string({ error: 'Bu alan metin olmalı.' }).trim().default('')

export const talepSemasi = z
  .object({
    adSoyad: z
      .string({ error: 'Size nasıl hitap edelim? Adınızı yazar mısınız?' })
      .trim()
      .min(2, 'Size nasıl hitap edelim? Adınızı yazar mısınız?')
      .max(120, 'Ad soyad en fazla 120 karakter olabilir.'),

    telefon: istegeBagliMetin.refine(
      (deger) => deger === '' || TELEFON_DESENI.test(deger),
      'Telefon numarasını 05XX XXX XX XX biçiminde yazar mısınız?',
    ),

    eposta: istegeBagliMetin.refine(
      (deger) => deger === '' || z.email().safeParse(deger).success,
      'E-posta adresi geçerli görünmüyor. Örn: ad@ornek.com',
    ),

    tip: z.enum(TALEP_TIP_DEGERLERI, {
      error: 'Ne hakkında yazdığınızı seçer misiniz?',
    }),

    mesaj: istegeBagliMetin.refine(
      (deger) => deger.length <= 2000,
      'Mesaj en fazla 2000 karakter olabilir.',
    ),

    ilgiliIlan: istegeBagliMetin,
    ilgiliMahalle: istegeBagliMetin,

    kvkkOnay: z
      .boolean({ error: 'Talebinizi alabilmemiz için aydınlatma metnini onaylamanız gerekiyor.' })
      .refine(
        (deger) => deger === true,
        'Talebinizi alabilmemiz için aydınlatma metnini onaylamanız gerekiyor.',
      ),

    pazarlamaOnayi: z.boolean({ error: 'Bu alan onay kutusu olmalı.' }).default(false),

    /**
     * Bal küpü alanı (honeypot).
     *
     * Görünmez bir alan; insan kullanıcı dolduramaz, otomatik bot doldurur.
     * Dolu gelirse istek sessizce başarılı görünür ama kaydedilmez —
     * bot, engellendiğini anlamaz ve yeniden denemez.
     */
    websitesi: istegeBagliMetin,
  })
  .refine((veri) => veri.telefon !== '' || veri.eposta !== '', {
    message: 'Size ulaşabilmemiz için telefon veya e-posta adresinizden birini yazın.',
    path: ['telefon'],
  })

export type TalepVerisi = z.infer<typeof talepSemasi>

export interface FormDurumu {
  basarili: boolean
  /** Alan adı → ilk hata mesajı. */
  hatalar?: Record<string, string>
  /** Genel hata (sunucu/veritabanı). */
  genelHata?: string
}

/** Zod hatalarını alan bazlı sözlüğe indirger. */
export function hatalariCoz(hata: z.ZodError): Record<string, string> {
  const sonuc: Record<string, string> = {}

  for (const sorun of hata.issues) {
    const alan = sorun.path[0]
    const anahtar = typeof alan === 'string' ? alan : '_'
    // İlk hata kazanır: kullanıcıya alan başına tek, net mesaj gösterilir.
    if (!(anahtar in sonuc)) sonuc[anahtar] = sorun.message
  }

  return sonuc
}
