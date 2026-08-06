import { z } from 'zod'

import { DENEYIM_SECENEKLERI, type Deneyim } from './secenekler'

/**
 * Danışman başvurusu doğrulaması.
 *
 * Aynı şema hem istemcide (anında geri bildirim) hem sunucuda (gerçek
 * kapı) kullanılır. Sunucu doğrulaması pazarlığa kapalıdır: istemci
 * doğrulaması bir kolaylıktır, güvenlik önlemi değildir.
 *
 * Hata mesajları Türkçe, insani ve çözüm önerili. Her alanda `error`
 * açıkça verildi; aksi halde alan hiç gönderilmediğinde Zod'un İngilizce
 * varsayılan metni kullanıcıya kadar sızıyor.
 */

/**
 * Türkiye cep telefonu.
 * Kabul edilen yazımlar: 05XX…, +905XX…, 905XX…, 5XX…; aralarında boşluk,
 * tire veya parantez olabilir.
 */
const TELEFON_DESENI = /^(?:\+?90|0)?[\s(]*5\d{2}[\s)]*[\s-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}$/

const DENEYIM_DEGERLERI = DENEYIM_SECENEKLERI.map((secenek) => secenek.value) as [
  Deneyim,
  ...Deneyim[],
]

export const danismanBasvuruSemasi = z.object({
  ad: z
    .string({ error: 'Size nasıl hitap edelim? Adınızı yazar mısınız?' })
    .trim()
    .min(2, 'Size nasıl hitap edelim? Adınızı yazar mısınız?')
    .max(120, 'Ad soyad en fazla 120 karakter olabilir.'),

  /**
   * ⚠️ Telefon ZORUNLU — talep formundan farkı bu.
   * Bir iş başvurusunda geri dönüş kanalı olmadan kayıt açmak, hem
   * başvurucu hem Aslıhan için işe yaramaz bir kayıt üretir.
   */
  telefon: z
    .string({ error: 'Size ulaşabilmemiz için telefon numaranızı yazar mısınız?' })
    .trim()
    .min(1, 'Size ulaşabilmemiz için telefon numaranızı yazar mısınız?')
    .refine(
      (deger) => TELEFON_DESENI.test(deger),
      'Telefon numarasını 05XX XXX XX XX biçiminde yazar mısınız?',
    ),

  email: z
    .string({ error: 'E-posta adresinizi yazar mısınız?' })
    .trim()
    .min(1, 'E-posta adresinizi yazar mısınız?')
    .refine(
      (deger) => z.email().safeParse(deger).success,
      'E-posta adresi geçerli görünmüyor. Örn: ad@ornek.com',
    ),

  deneyim: z.enum(DENEYIM_DEGERLERI, {
    error: 'Gayrimenkul deneyiminizi seçer misiniz?',
  }),

  mykBelgesi: z.boolean().default(false),

  mesaj: z
    .string({ error: 'Bu alan metin olmalı.' })
    .trim()
    .max(2000, 'Mesaj en fazla 2000 karakter olabilir.')
    .default(''),

  /**
   * ⚠️ KVKK onayı zorunlu ve AYRI. Pazarlama onayıyla tek kutuda
   * birleştirilmiş bir onay KVKK açısından geçersizdir.
   */
  kvkkOnay: z.literal(true, {
    error: 'Başvurunuzu alabilmemiz için aydınlatma metnini onaylamanız gerekiyor.',
  }),

  /** Bal küpü — insan doldurmaz, bot doldurur. */
  websitesi: z.string().trim().default(''),

  /** Cloudflare Turnstile jetonu. Turnstile kapalıysa boş gelir. */
  turnstileJetonu: z.string().default(''),
})

export type DanismanBasvurusu = z.infer<typeof danismanBasvuruSemasi>

export interface BasvuruDurumu {
  basarili: boolean
  hatalar?: Partial<Record<keyof DanismanBasvurusu, string>>
  genelHata?: string
}

/** Zod hatalarını alan → mesaj eşlemesine çevirir. İlk hata kazanır. */
export function hatalariCoz(hata: z.ZodError): Partial<Record<keyof DanismanBasvurusu, string>> {
  const sonuc: Partial<Record<keyof DanismanBasvurusu, string>> = {}

  for (const sorun of hata.issues) {
    const alan = sorun.path[0]
    if (typeof alan !== 'string') continue
    const anahtar = alan as keyof DanismanBasvurusu
    if (sonuc[anahtar] === undefined) sonuc[anahtar] = sorun.message
  }

  return sonuc
}
