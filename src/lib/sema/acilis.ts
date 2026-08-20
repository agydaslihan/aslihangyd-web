import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import { semayiDenetle, semayiGunlukleYaz } from './denetim'

/**
 * Açılışta şema bütünlüğü denetimi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN AYRI DOSYA — EDGE DERLEMESİ.
 *
 * Bu kod önce `instrumentation.ts` içine yazıldı ve derleme kırıldı:
 *
 *     A Node.js module is loaded ('node:path') which is not supported in
 *     the Edge Runtime.  ./src/payload.config.ts:1:1
 *
 * Next `instrumentation.ts`'i Edge derlemesi için de derliyor ve
 * `@payload-config` doğrudan oradan içe aktarılınca Turbopack onu Edge
 * paketine çözmeye çalışıyor. Çalışma zamanı kontrolü
 * (`NEXT_RUNTIME !== 'nodejs'`) yetmiyor: hata derleme anında, dal hiç
 * çalışmadan veriliyor. Aynı dosyada `process.once` ile de bir kez
 * yaşandı.
 *
 * Payload içe aktarımı `server-only` işaretli bir ara modüle alınınca
 * çözülüyor — ölçüm tamponunun yazıcısı (`lib/olcum/yazici.ts`) zaten bu
 * desende ve sorunsuz derleniyordu.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ GECİKMELİ: kap ile veritabanı aynı anda ayağa kalkıyor; ilk saniyede
 * sorulan soru "bağlanamadım" der ve yanlış alarm üretir.
 *
 * ⚠️ HER HATA YUTULUYOR. Bir bütünlük kontrolünün siteyi düşürmesi,
 * korumaya çalıştığı şeyden büyük zarar olurdu.
 */
export const SEMA_GECIKME_MS = 15_000

export async function semayiAcilistaDenetle(): Promise<void> {
  await new Promise((coz) => {
    const zamanlayici = setTimeout(coz, SEMA_GECIKME_MS)
    // Denetim yüzünden süreç kapanmayı bekletmesin.
    zamanlayici.unref?.()
  })

  try {
    const payload = await getPayload({ config })
    semayiGunlukleYaz(await semayiDenetle(payload))
  } catch (hata) {
    console.warn(
      '[sema] Açılış denetimi çalıştırılamadı:',
      hata instanceof Error ? hata.message : hata,
    )
  }
}
