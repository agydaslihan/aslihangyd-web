import { NextResponse } from 'next/server'

import { bakimCalistir, gecerliGorevMi, GOREV_KAYDI } from '@/lib/bakim/gorevler'
import { payloadGetir } from '@/lib/veri/istemci'

/**
 * Bakım ucu — cron tarafından çağrılır.
 *
 * Kimlik doğrulama: `BAKIM_ANAHTARI` ortam değişkeni ile paylaşılan sır.
 * Anahtar tanımlı değilse uç **kapalıdır** (404 döner) — açıkta, herkesin
 * çağırabildiği bir veri silme ucu bırakmaktansa hiç çalışmasın.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Görev seçimi
 *
 *   /api/bakim                    → tüm görevler (elle tam bakım)
 *   /api/bakim?gorev=eids-kaldir  → yalnızca o görev
 *
 * ⚠️ Cron her görevi AYRI satırda çağırır. Sebep arıza yalıtımı: üçü tek
 * çağrıda koşsaydı ve KVKK silme görevi bozulsaydı, uç her gece 500 döner,
 * işletmeci de büyük olasılıkla cron satırını susturur — ve yasal riski
 * olan EİDS kontrolü onunla birlikte susardı. Ayrıntı: docs/ISLETME-REHBERI.md §6.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Yanıt kodları:
 *   200 → tüm görevler başarılı
 *   207 → bazı görevler başarısız (çok görevli çağrıda)
 *   500 → çağrılan tek görev başarısız
 *   400 → geçersiz `gorev` parametresi
 *   401 → anahtar yanlış
 *   404 → anahtar sunucuda tanımsız
 */
export const dynamic = 'force-dynamic'

export async function GET(istek: Request) {
  const anahtar = process.env.BAKIM_ANAHTARI

  if (!anahtar) {
    // Yapılandırılmamış uç, var olmayan uç gibi davranır.
    return new NextResponse(null, { status: 404 })
  }

  const gelen = istek.headers.get('authorization')
  if (gelen !== `Bearer ${anahtar}`) {
    return NextResponse.json({ hata: 'Yetkisiz' }, { status: 401 })
  }

  const istenen = new URL(istek.url).searchParams.getAll('gorev')

  const gecersiz = istenen.filter((deger) => !gecerliGorevMi(deger))
  if (gecersiz.length > 0) {
    return NextResponse.json(
      {
        hata: `Bilinmeyen görev: ${gecersiz.join(', ')}`,
        gecerliGorevler: GOREV_KAYDI.map((gorev) => gorev.anahtar),
      },
      { status: 400 },
    )
  }

  const payload = await payloadGetir()
  const rapor = await bakimCalistir(
    payload,
    istenen.length > 0 ? istenen.filter(gecerliGorevMi) : undefined,
  )

  const hataliSayisi = rapor.gorevler.filter((gorev) => gorev.hata).length

  /**
   * Tek görev çağrıldıysa 500, çoklu çağrıda kısmi başarı için 207.
   *
   * Ayrım cron için önemli: `curl -f` her ikisinde de sıfırdan farklı
   * çıkış kodu verir, ama günlükteki kod hangi durumla karşılaşıldığını
   * söyler. "Hepsi çöktü" ile "biri çöktü" aynı müdahaleyi gerektirmiyor.
   */
  const durum = hataliSayisi === 0 ? 200 : rapor.gorevler.length === 1 ? 500 : 207

  return NextResponse.json(rapor, {
    status: durum,
    headers: { 'Cache-Control': 'no-store' },
  })
}
