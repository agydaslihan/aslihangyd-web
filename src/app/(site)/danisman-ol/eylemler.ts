'use server'

import { headers } from 'next/headers'

import { danismanBasvuruSemasi, hatalariCoz, type BasvuruDurumu } from '@/lib/danisman/sema'
import { hizSinirindaMi, istemciAnahtari } from '@/lib/guvenlik/hizSiniri'
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

  const sinir = hizSinirindaMi(istemciAnahtari(basliklar, 'danisman'))
  if (!sinir.gecebilir) {
    const dakika = Math.ceil(sinir.yenidenDeneSaniye / 60)
    return {
      basarili: false,
      genelHata:
        `Kısa sürede çok fazla başvuru gönderildi. ${dakika} dakika sonra tekrar ` +
        'deneyebilirsiniz.',
    }
  }

  const istemciIp = basliklar.get('x-forwarded-for')?.split(',')[0]?.trim()
  const turnstile = await turnstileDogrula(veri.turnstileJetonu, istemciIp)
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
