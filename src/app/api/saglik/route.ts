import { NextResponse } from 'next/server'

import { payloadGetir } from '@/lib/veri/istemci'

/**
 * Sağlık kontrolü — deploy sonrası doğrulama ve Uptime Kuma için.
 *
 * Yalnızca "süreç ayakta mı" demiyor; veritabanına gerçek bir sorgu atıyor.
 * Uygulama ayakta ama veritabanı erişilemez durumdayken "sağlıklı" demek,
 * hatalı bir sürümü canlıda bırakmanın en kolay yoludur.
 *
 * Yanıtta sürüm veya yapılandırma bilgisi YOKTUR — bu uç herkese açık.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const payload = await payloadGetir()
    await payload.count({ collection: 'mahalleler' })

    return NextResponse.json({ durum: 'saglikli' }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json(
      { durum: 'saglikli_degil' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
