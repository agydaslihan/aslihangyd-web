import { NextResponse } from 'next/server'

import { gunlukBakimiCalistir } from '@/lib/bakim/gorevler'
import { payloadGetir } from '@/lib/veri/istemci'

/**
 * Günlük bakım ucu — cron tarafından çağrılır.
 *
 * Kimlik doğrulama: `BAKIM_ANAHTARI` ortam değişkeni ile paylaşılan sır.
 * Anahtar tanımlı değilse uç **kapalıdır** (404 döner) — açıkta, herkesin
 * çağırabildiği bir veri silme ucu bırakmaktansa hiç çalışmasın.
 *
 * Kullanım (sunucuda cron):
 *   0 4 * * *  curl -fsS -H "Authorization: Bearer $BAKIM_ANAHTARI" \
 *              https://aslihangyd.com/api/bakim
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

  const payload = await payloadGetir()
  const rapor = await gunlukBakimiCalistir(payload)

  const hataliVar = rapor.gorevler.some((gorev) => gorev.hata)

  return NextResponse.json(rapor, {
    status: hataliVar ? 500 : 200,
    headers: { 'Cache-Control': 'no-store' },
  })
}
