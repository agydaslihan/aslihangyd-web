'use server'

import { headers } from 'next/headers'

import config from '@payload-config'
import { getPayload } from 'payload'

/**
 * Görsel yükleme eylemleri — SİHİRBAZIN VE İLAN DÜZENLEME EKRANININ ORTAK YOLU.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ TEK YÜKLEME YOLU. Bu dosya eskiden `lib/sihirbaz/gorselEylemleri.ts`
 * idi ve yalnızca sihirbaz çağırıyordu. Mevcut bir ilana fotoğraf eklemek
 * için ikinci bir yükleme yolu yazmak, tür süzgecini, boyut sınırını, alt
 * metin politikasını ve bütçe uyarısını ikiye bölerdi — ve ikisi er geç
 * ayrışırdı. Taşındı, kopyalanmadı.
 *
 * ⚠️ YÜKLEME PAYLOAD'IN KENDİ MEDYA KOLEKSİYONUNA GİDİYOR.
 *
 * Ayrı bir dosya deposu açmak; boyutlandırma, AVIF/WebP üretimi, bulanık
 * önizleme ve bütçe rozeti hesabının ikinci bir kopyasını doğururdu.
 * `medya` koleksiyonu bunların hepsini zaten yapıyor.
 *
 * ⚠️ GOOGLE DRIVE BİLİNÇLİ OLARAK YOK (11 Ekim 2026 kararı). Drive'ın bant
 * genişliği kotası var ve trafik artınca görseller düşer; `next/image` dış
 * bağlantıyı boyutlandıramaz, WebP/AVIF üretemez, tembel yükleyemez; görsel
 * bütçesi sistemi (`lib/medya/gorselButcesi.ts`) devre dışı kalır; doğrudan
 * bağlantı biçimi de belgelenmemiş. Disk sıkışırsa çözüm S3 uyumlu bir
 * depodur (Cloudflare R2) — Payload'ın kendi depolama eklentisiyle, bu
 * eylemi hiç değiştirmeden.
 *
 * ⚠️ ALT METİN ZORUNLU DEĞİL AMA BOŞ DA KALMIYOR. Koleksiyonun kancası
 * boş alt metni dosya adından türetiyor ve `altOtomatik` işaretini koyuyor;
 * panel kaç görselin gerçek metne ihtiyacı olduğunu sayıyor. Türetme
 * sihirbazda DEĞİL koleksiyonda: panelden yüklenen görsellerle buradan
 * yüklenenler aynı kurala tabi.
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

export async function gorselYukle(form: FormData): Promise<YuklemeSonucu> {
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

/**
 * Alt metni medya kaydına yazar.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU BİR HATA DÜZELTMESİ, YENİ BİR ÖZELLİK DEĞİL.
 *
 * Sihirbazın görsel adımında her satırda bir alt metin kutusu vardı ve
 * yazılan metin HİÇBİR YERE GİTMİYORDU: kaydetme yolu yalnızca görsel
 * kimliklerini gönderiyor (`veriyeCevir.ts` → `gorseller: ids`), alt metin
 * ise bileşenin yerel durumunda kalıp kayboluyordu. Yani kullanıcı
 * erişilebilirlik borcunu kapattığını sanıyor, borç duruyordu.
 *
 * ⚠️ ALT METİN İLANA DEĞİL MEDYAYA AİT. Aynı görsel iki ilanda kullanılırsa
 * alt metni de ikisinde aynıdır — çünkü görselde ne olduğu, onu nerede
 * gösterdiğimize bağlı değil. Bu yüzden ilan formuyla birlikte değil,
 * yazıldığı anda `medya` kaydına yazılıyor.
 *
 * ⚠️ `altOtomatik` işaretini BURADA KALDIRMIYORUZ: koleksiyonun kancası
 * dolu metin gördüğünde zaten `false` yapıyor. İki yerde yapmak, bir gün
 * ayrışacak iki kural demekti.
 * ─────────────────────────────────────────────────────────────────────────
 */
export async function gorselAltMetniniKaydet(
  id: number,
  alt: string,
): Promise<{ basarili: boolean; genelHata?: string }> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!user) {
    return { basarili: false, genelHata: 'Oturumunuz sona ermiş. Sayfayı yenileyip tekrar girin.' }
  }

  if (!Number.isInteger(id) || id <= 0) {
    return { basarili: false, genelHata: 'Görsel kimliği geçersiz.' }
  }

  try {
    await payload.update({
      collection: 'medya',
      id,
      // Boş metin gönderildiğinde kanca yine dosya adından türetiyor.
      data: { alt: alt.trim() },
      user,
      overrideAccess: false,
    })
    return { basarili: true }
  } catch (hata) {
    return {
      basarili: false,
      genelHata:
        hata instanceof Error && hata.message.trim() !== ''
          ? hata.message
          : 'Alt metin kaydedilemedi.',
    }
  }
}
