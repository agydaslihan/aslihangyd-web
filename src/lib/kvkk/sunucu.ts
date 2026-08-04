import 'server-only'

import { cookies } from 'next/headers'

import { CEREZ_ONAY_ADI, onayCoz, type CerezOnayi } from './onay'

/**
 * Çerez onayını sunucuda okur.
 *
 * `server-only` işareti bilinçli: bu modül istemci paketine sızarsa
 * `next/headers` derleme hatası verir. Onay kararının sunucuda alınması,
 * analitik betiğinin HTML'e hiç eklenmemesini sağlayan mekanizmadır.
 */
export async function cerezOnayiniOku(): Promise<CerezOnayi | null> {
  const cerezler = await cookies()
  return onayCoz(cerezler.get(CEREZ_ONAY_ADI)?.value)
}
