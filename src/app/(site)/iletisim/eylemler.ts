'use server'

import { headers } from 'next/headers'

import { payloadGetir } from '@/lib/veri/istemci'
import { hatalariCoz, talepSemasi, type FormDurumu } from '@/lib/talep/sema'

/**
 * Talep formunu işler.
 *
 * Güvenlik ve KVKK notları:
 * - Doğrulama burada yapılır; istemci doğrulaması yalnızca kolaylıktır.
 * - `kvkkOnay` hem burada hem Payload kancasında kontrol edilir. İki kat
 *   olması gereksiz değil: bu eylem atlanıp REST API'ye doğrudan istek
 *   atılabilir, kanca o yolu da kapatır.
 * - Bal küpü alanı doluysa kayıt yapılmaz ama kullanıcıya başarı döner;
 *   bot engellendiğini anlamaz.
 * - Hata mesajlarında veritabanı ayrıntısı sızdırılmaz.
 */
export async function talepGonder(_oncekiDurum: FormDurumu, form: FormData): Promise<FormDurumu> {
  const sonuc = talepSemasi.safeParse({
    adSoyad: form.get('adSoyad') ?? '',
    telefon: form.get('telefon') ?? '',
    eposta: form.get('eposta') ?? '',
    tip: form.get('tip') ?? 'genel',
    mesaj: form.get('mesaj') ?? '',
    ilgiliIlan: form.get('ilgiliIlan') ?? '',
    ilgiliMahalle: form.get('ilgiliMahalle') ?? '',
    // Onay kutuları gönderilmezse FormData'da hiç bulunmaz.
    kvkkOnay: form.get('kvkkOnay') === 'on',
    pazarlamaOnayi: form.get('pazarlamaOnayi') === 'on',
    websitesi: form.get('websitesi') ?? '',
  })

  if (!sonuc.success) {
    return { basarili: false, hatalar: hatalariCoz(sonuc.error) }
  }

  const veri = sonuc.data

  // Bal küpü: sessizce başarılı görün, kaydetme.
  if (veri.websitesi !== '') {
    return { basarili: true }
  }

  try {
    const payload = await payloadGetir()

    const [ilanId, mahalleId] = await Promise.all([
      veri.ilgiliIlan ? kayitIdBul(payload, 'ilanlar', veri.ilgiliIlan) : null,
      veri.ilgiliMahalle ? kayitIdBul(payload, 'mahalleler', veri.ilgiliMahalle) : null,
    ])

    const basliklar = await headers()

    await payload.create({
      collection: 'talepler',
      data: {
        adSoyad: veri.adSoyad,
        tip: veri.tip,
        durum: 'yeni',
        telefon: veri.telefon || undefined,
        eposta: veri.eposta || undefined,
        mesaj: veri.mesaj || undefined,
        ilgiliIlan: ilanId ?? undefined,
        ilgiliMahalle: mahalleId ?? undefined,
        kvkkOnay: veri.kvkkOnay,
        pazarlamaOnayi: veri.pazarlamaOnayi,
        gonderildigiSayfa: basliklar.get('referer') ?? undefined,
        kaynak: 'organik',
      },
      // Bu eylem giriş yapmamış ziyaretçi adına çalışır; koleksiyonun
      // `create` erişimi zaten herkese açık.
      overrideAccess: false,
      user: null,
    })

    return { basarili: true }
  } catch {
    // Kullanıcıya teknik ayrıntı gösterilmez; alternatif kanal önerilir.
    return {
      basarili: false,
      genelHata:
        'Talebiniz kaydedilemedi. Bağlantı sorunu olabilir — birkaç dakika sonra tekrar ' +
        "deneyebilir veya bize WhatsApp'tan yazabilirsiniz.",
    }
  }
}

/** Slug'dan kayıt kimliği bulur. Bulunamazsa `null` — form yine de kaydedilir. */
async function kayitIdBul(
  payload: Awaited<ReturnType<typeof payloadGetir>>,
  koleksiyon: 'ilanlar' | 'mahalleler',
  slug: string,
): Promise<number | null> {
  const sonuc = await payload.find({
    collection: koleksiyon,
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  })

  const kayit = sonuc.docs[0]
  return typeof kayit?.id === 'number' ? kayit.id : null
}
