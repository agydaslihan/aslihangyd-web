import { headers } from 'next/headers'
import { unstable_rethrow } from 'next/navigation'

import { botKimligi } from '@/lib/olcum/bot'
import { botDurumSay, type BotDurumKodu } from '@/lib/olcum/tampon'

/**
 * Bot isteğinin yanıt kodunu sayan görünmez bileşen.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN SAYFADA, VEKİLDE DEĞİL.
 *
 * Vekil katmanı (`proxy.ts`) yanıtı GÖRMÜYOR: `NextResponse.next()` isteği
 * aşağıya geçiriyor, durum kodu orada üretiliyor. Next'in ara katmanı
 * yanıtın durumunu okuyamaz — dolayısıyla "Googlebot kaç 404 aldı" sorusu
 * vekilde cevaplanamıyor.
 *
 * Cevap 404 sayfasının kendisinde: o sayfa çiziliyorsa durum 404'tür.
 *
 * ⚠️ 404 SORUSU BOŞ BİR MERAK DEĞİL. Arama motorunun 404 aldığı her adres,
 * ya bir yere koyduğumuz kırık bağlantı ya da site haritasında duran ölü
 * bir giriş. Tarama bütçesi oraya harcanıyor ve Search Console'da kalıcı
 * hata olarak birikiyor.
 *
 * ⚠️ `headers()` BU SAYFAYI DİNAMİK YAPIYOR ve bu kabul edilen maliyet:
 * 404 sayfası seyrek isteniyor ve veri çekmiyor. Statik kalması karşılığı
 * ölçümün tamamen kör olmasıydı.
 *
 * ⚠️ İNSAN 404'LERİ BURADA SAYILMIYOR. Onlar `sayfalar.hata` sütununda,
 * rota bazında duruyor (`instrumentation.onRequestError`). İki sayacı
 * birleştirmek, bot trafiğini insan hata oranına geri karıştırmak olurdu.
 *
 * ⚠️ `unstable_rethrow` ZORUNLU VE SEBEBİ İNCE.
 *
 * `headers()` derleme anında, statik üretim sırasında çağrıldığında Next
 * bilerek bir hata fırlatıyor: rotanın dinamik olduğunu böyle anlıyor.
 * Düz bir `catch {}` o hatayı YUTAR ve Next'in sinyalini keser — rota
 * statik üretilmeye çalışılır, derleme ya kırılır ya da 404 sayfası
 * ölçümsüz donar. `unstable_rethrow`, Next'in kendi iç hatalarını
 * (dinamik kullanım, `notFound`, `redirect`) geri fırlatıyor; yalnızca
 * gerçek ölçüm hataları yutuluyor.
 * ─────────────────────────────────────────────────────────────────────────
 */
export default async function BotDurumu({ kod }: { kod: BotDurumKodu }) {
  try {
    const basliklar = await headers()
    if (botKimligi(basliklar.get('user-agent')) !== null) botDurumSay(kod)
  } catch (hata) {
    // Next'in iç sinyalleri geçsin; ölçüm hatası sayfayı düşürmesin.
    unstable_rethrow(hata)
  }

  return null
}
