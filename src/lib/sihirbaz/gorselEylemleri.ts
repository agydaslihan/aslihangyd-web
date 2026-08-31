'use server'

import { headers } from 'next/headers'

import config from '@payload-config'
import { getPayload } from 'payload'

/**
 * Sihirbazın görsel yükleme eylemi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ YÜKLEME PAYLOAD'IN KENDİ MEDYA KOLEKSİYONUNA GİDİYOR.
 *
 * Ayrı bir dosya deposu açmak; boyutlandırma, AVIF/WebP üretimi, bulanık
 * önizleme ve bütçe rozeti hesabının ikinci bir kopyasını doğururdu.
 * `medya` koleksiyonu bunların hepsini zaten yapıyor.
 *
 * ⚠️ ALT METİN ZORUNLU VE BURADA DA ZORUNLU KALIYOR. Koleksiyon `alt`
 * alanını `required` yapmış; erişilebilirlik sonradan eklenen bir şey
 * değil. Sihirbaz alanı boş bırakmıyor: bağlamdan bir taslak metin
 * öneriyor ve kullanıcı onu ekranda görüp düzeltebiliyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

export interface YuklemeSonucu {
  basarili: boolean
  id?: number
  url?: string
  ad?: string
  genelHata?: string
}

/** Kabul edilen türler — koleksiyonun kendi süzgeciyle aynı sınıf. */
const KABUL = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif']

/** Tek dosya için üst sınır. */
const AZAMI_BAYT = 20 * 1024 * 1024

export async function sihirbazGorseliYukle(form: FormData): Promise<YuklemeSonucu> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!user) {
    return { basarili: false, genelHata: 'Oturumunuz sona ermiş. Sayfayı yenileyip tekrar girin.' }
  }

  const dosya = form.get('dosya')
  const alt = String(form.get('alt') ?? '').trim()

  if (!(dosya instanceof File) || dosya.size === 0) {
    return { basarili: false, genelHata: 'Dosya alınamadı.' }
  }

  if (!KABUL.includes(dosya.type)) {
    return {
      basarili: false,
      genelHata: `Bu dosya türü yüklenemiyor (${dosya.type || 'bilinmiyor'}). JPEG, PNG, WebP, AVIF ya da HEIC gönderin.`,
    }
  }

  if (dosya.size > AZAMI_BAYT) {
    return {
      basarili: false,
      genelHata: `Dosya çok büyük (${Math.round(dosya.size / 1_000_000)} MB). En fazla 20 MB.`,
    }
  }

  if (alt === '') {
    return {
      basarili: false,
      genelHata: 'Alternatif metin boş olamaz — görselde ne olduğunu bir cümleyle yazın.',
    }
  }

  try {
    const kayit = await payload.create({
      collection: 'medya',
      data: { alt },
      file: {
        data: Buffer.from(await dosya.arrayBuffer()),
        mimetype: dosya.type,
        name: dosya.name,
        size: dosya.size,
      },
      user,
      // ⚠️ Erişim kuralları ve kancalar devrede kalsın diye `false`.
      overrideAccess: false,
    })

    return {
      basarili: true,
      id: Number(kayit.id),
      url: typeof kayit.url === 'string' ? kayit.url : undefined,
      ad: dosya.name,
    }
  } catch (hata) {
    return {
      basarili: false,
      genelHata:
        hata instanceof Error && hata.message.trim() !== ''
          ? hata.message
          : 'Görsel yüklenemedi. Tekrar deneyin.',
    }
  }
}
