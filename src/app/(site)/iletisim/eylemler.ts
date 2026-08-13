'use server'

import { headers } from 'next/headers'

import { hizSinirindaMi, istemciAnahtari, istemciIpsi } from '@/lib/guvenlik/hizSiniri'
import { turnstileDogrula } from '@/lib/guvenlik/turnstile'
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
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ HIZ SINIRI VE TURNSTILE 13 AĞUSTOS 2026'DA EKLENDİ.
 *
 * O güne kadar bu form yalnızca bal küpü ve Zod ile korunuyordu. Turnstile
 * `/danisman-ol` formuna bağlanmıştı ve o bölüm KAPALIYDI (404) — yani
 * üretimde çalışan tek public form tam da korumasız olandı.
 *
 * Üstelik site genelindeki bütün "iletişime geç" yolları buraya akıyor:
 * gizli portföy erişim talebi, boş durum CTA'ları, ilan sayfasındaki
 * "randevu isteyin". Tek form olması, korumasının da tek yerde ve eksiksiz
 * olmasını zorunlu kılıyor.
 * ─────────────────────────────────────────────────────────────────────────
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
    turnstileJetonu: form.get('cf-turnstile-response') ?? '',
  })

  if (!sonuc.success) {
    return { basarili: false, hatalar: hatalariCoz(sonuc.error) }
  }

  const veri = sonuc.data

  // Bal küpü: sessizce başarılı görün, kaydetme.
  if (veri.websitesi !== '') {
    return { basarili: true }
  }

  const sinirBasliklari = await headers()

  /**
   * ⚠️ IP belirlenemiyorsa hız sınırı UYGULANMAZ.
   *
   * Ortak bir "bilinmeyen" kovasına yazmak, ters vekil yapılandırmasındaki
   * bir hatayı doğrudan hizmet kesintisine çevirirdi: tüm ziyaretçiler aynı
   * kovaya düşer ve form beşinci gönderimden sonra HERKESE kapanır.
   * `/danisman-ol` ile aynı gerekçe ve aynı yardımcı.
   */
  const sinirAnahtari = istemciAnahtari(sinirBasliklari, 'talep')

  if (sinirAnahtari === null) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '[guvenlik] İstemci IP başlığı yok — talep formunda hız sınırı ' +
          'uygulanamadı. Caddy trusted_proxies / header_up yapılandırmasını ' +
          'kontrol edin (docs/ISLETME-REHBERI.md §5.5).',
      )
    }
  } else {
    const sinir = hizSinirindaMi(sinirAnahtari)
    if (!sinir.gecebilir) {
      const dakika = Math.ceil(sinir.yenidenDeneSaniye / 60)
      return {
        basarili: false,
        genelHata:
          `Kısa sürede çok fazla mesaj gönderildi. ${dakika} dakika sonra tekrar ` +
          'deneyebilirsiniz.',
      }
    }
  }

  /**
   * ⚠️ Turnstile yapılandırılmamışsa doğrulama ATLANIR, form çalışır.
   *
   * Anahtar yokken formu kapatmak, Aslıhan hesabı açana kadar kimsenin
   * ulaşamaması demekti. Kapı `turnstile.ts` içinde: anahtar VARSA
   * doğrulama zorunlu ve başarısızlık gönderimi reddediyor.
   */
  const turnstile = await turnstileDogrula(
    veri.turnstileJetonu,
    istemciIpsi(sinirBasliklari) ?? undefined,
  )
  if (!turnstile.gecerli) {
    return { basarili: false, genelHata: turnstile.hata ?? undefined }
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
