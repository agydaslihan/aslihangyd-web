import Link from 'next/link'
import type { ServerProps } from 'payload'

import { OLCUM_YOLU } from './yol'

/**
 * Admin yan menüsündeki gözlemlenebilirlik bağlantısı.
 *
 * ⚠️ Bir koleksiyon olmadığı için Payload'ın otomatik menüsünde görünmüyor
 * ve görünmeyen bir araç, olmayan bir araçtır. Diğer özel görünümlerle aynı
 * gerekçe.
 *
 * ⚠️ Yalnızca yöneticiye gösteriliyor: ekranın kendisi de yönetici kapısı
 * taşıyor ama danışmana erişemeyeceği bir bağlantı göstermek, panelin
 * güvenilirliğini düşürüyor.
 */
export function OlcumNavBaglantisi({ payload, user }: ServerProps) {
  if ((user as { rol?: string } | null)?.rol !== 'yonetici') return null

  const adres = `${payload?.config.routes.admin ?? '/admin'}${OLCUM_YOLU}`

  return (
    <Link href={adres} className="nav__link">
      <span className="nav__link-label">Gözlemlenebilirlik</span>
    </Link>
  )
}
