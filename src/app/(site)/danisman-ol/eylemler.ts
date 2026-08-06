'use server'

import { headers } from 'next/headers'

import { danismanBasvuruSemasi, hatalariCoz, type BasvuruDurumu } from '@/lib/danisman/sema'
import { hizSinirindaMi, istemciAnahtari, istemciIpsi } from '@/lib/guvenlik/hizSiniri'
import { turnstileDogrula } from '@/lib/guvenlik/turnstile'
import { bolumAcikMi } from '@/lib/veri/siteBolumleri'
import { payloadGetir } from '@/lib/veri/istemci'

/**
 * Danışman başvurusunu işler.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Savunma katmanları, ucuzdan pahalıya sıralı:
 *
 *   1. Bölüm kapısı  — sayfa kapalıysa eylem de kapalı. Sayfayı kapatıp
 *                      eylemi açık bırakmak, 404 dönen bir sayfanın
 *                      formunun hâlâ kayıt açması demekti.
 *   2. Şema          — biçim ve zorunluluk.
 *   3. Bal küpü      — aptal botlar. Kullanıcıya başarı döner, bot
 *                      engellendiğini anlamaz.
 *   4. Hız sınırı    — ısrarlı olan. Sadece bal küpü geçildiyse sayılır.
 *   5. Turnstile     — ağ isteği; en pahalısı, en sona.
 *   6. KVKK kancası  — koleksiyonda, bu eylem atlansa da geçerli.
 * ─────────────────────────────────────────────────────────────────────────
 */
export async function danismanBasvuruGonder(
  _oncekiDurum: BasvuruDurumu,
  form: FormData,
): Promise<BasvuruDurumu> {
  if (!(await bolumAcikMi('danisman_ol'))) {
    return {
      basarili: false,
      genelHata: 'Danışman başvuruları şu an kapalı.',
    }
  }

  const sonuc = danismanBasvuruSemasi.safeParse({
    ad: form.get('ad') ?? '',
    telefon: form.get('telefon') ?? '',
    email: form.get('email') ?? '',
    deneyim: form.get('deneyim') ?? '',
    // Onay kutuları gönderilmezse FormData'da hiç bulunmaz.
    mykBelgesi: form.get('mykBelgesi') === 'on',
    mesaj: form.get('mesaj') ?? '',
    kvkkOnay: form.get('kvkkOnay') === 'on',
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

  const basliklar = await headers()

  /**
   * ⚠️ IP belirlenemiyorsa hız sınırı UYGULANMAZ.
   *
   * Ortak bir "bilinmeyen" kovasına yazmak, ters vekil yapılandırmasındaki
   * bir hatayı doğrudan hizmet kesintisine çevirirdi: tüm ziyaretçiler aynı
   * kovaya düşer ve form beşinci gönderimden sonra herkese kapanır.
   * Gerekçenin tamamı `src/lib/guvenlik/hizSiniri.ts` içinde.
   *
   * Bu durum üretimde hiç olmamalı; olduğunda sunucu günlüğüne yazılıyor.
   */
  const sinirAnahtari = istemciAnahtari(basliklar, 'danisman')

  if (sinirAnahtari === null) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '[guvenlik] İstemci IP başlığı yok — hız sınırı uygulanamadı. ' +
          'Caddy trusted_proxies / header_up yapılandırmasını kontrol edin ' +
          '(docs/ISLETME-REHBERI.md §5.5).',
      )
    }
  } else {
    const sinir = hizSinirindaMi(sinirAnahtari)
    if (!sinir.gecebilir) {
      const dakika = Math.ceil(sinir.yenidenDeneSaniye / 60)
      return {
        basarili: false,
        genelHata:
          `Kısa sürede çok fazla başvuru gönderildi. ${dakika} dakika sonra tekrar ` +
          'deneyebilirsiniz.',
      }
    }
  }

  const turnstile = await turnstileDogrula(
    veri.turnstileJetonu,
    istemciIpsi(basliklar) ?? undefined,
  )
  if (!turnstile.gecerli) {
    return { basarili: false, genelHata: turnstile.hata ?? undefined }
  }

  try {
    const payload = await payloadGetir()

    await payload.create({
      collection: 'danisman-basvurulari',
      data: {
        ad: veri.ad,
        telefon: veri.telefon,
        email: veri.email,
        deneyim: veri.deneyim,
        mykBelgesi: veri.mykBelgesi,
        mesaj: veri.mesaj || undefined,
        kvkkOnay: veri.kvkkOnay,
      },
      // Ziyaretçi adına çalışır; koleksiyonun `create` erişimi açık,
      // `read` erişimi kapalı.
      overrideAccess: false,
      user: null,
    })

    return { basarili: true }
  } catch {
    // Kullanıcıya teknik ayrıntı gösterilmez; alternatif kanal önerilir.
    return {
      basarili: false,
      genelHata:
        'Başvurunuz kaydedilemedi. Bağlantı sorunu olabilir — birkaç dakika sonra tekrar ' +
        "deneyebilir veya bize WhatsApp'tan yazabilirsiniz.",
    }
  }
}
