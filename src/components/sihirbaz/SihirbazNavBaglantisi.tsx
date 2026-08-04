import Link from 'next/link'
import type { ServerProps } from 'payload'

import { SIHIRBAZ_YOLU } from './yol'

/**
 * Admin yan menüsündeki sihirbaz bağlantısı.
 *
 * Koleksiyon bağlantılarının altına eklenir (`afterNavLinks`). Sihirbaz bir
 * koleksiyon olmadığı için Payload'ın otomatik menüsünde görünmez; görünmeyen
 * bir araç, olmayan bir araçtır.
 *
 * ⚠️ Sunucu bileşeni. İstemci bileşeni olsaydı `useConfig` için
 * `@payloadcms/ui` paketini doğrudan bağımlılık yapmak gerekirdi — tek bir
 * menü bağlantısı uğruna admin arayüz kütüphanesini bağımlılık listesine
 * almak, taşınacak yükün karşılığını vermez. Admin kök yolu zaten sunucuda
 * `payload.config` üzerinden okunabiliyor.
 *
 * Bunun bedeli: bağlantı "etkin sayfa" vurgusu taşımıyor. Beş öğelik bir
 * menüde bu kayıp, bir paket bağımlılığından ucuz.
 */
export function SihirbazNavBaglantisi({ payload }: ServerProps) {
  const adres = `${payload?.config.routes.admin ?? '/admin'}${SIHIRBAZ_YOLU}`

  return (
    <Link href={adres} className="nav__link">
      <span className="nav__link-label">Portföy giriş sihirbazı</span>
    </Link>
  )
}
