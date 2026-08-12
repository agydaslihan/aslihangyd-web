import Link from 'next/link'
import type { ServerProps } from 'payload'

import { yoneticiMi } from '@/lib/erisim'

import { OSM_YOLU } from './yol'

/**
 * Admin yan menüsündeki OSM içe aktarma bağlantısı.
 *
 * ⚠️ Yalnızca yöneticiye gösterilir — ekran da yalnızca yöneticiye açık.
 * Danışmana tıklayınca "yetkiniz yok" diyen bir bağlantı göstermek,
 * kullanılamayan bir menü öğesi biriktirmektir.
 */
export function OsmNavBaglantisi({ payload, user }: ServerProps) {
  if (!yoneticiMi(user)) return null

  const adres = `${payload?.config.routes.admin ?? '/admin'}${OSM_YOLU}`

  return (
    <Link href={adres} className="nav__link">
      <span className="nav__link-label">POI içe aktar (OpenStreetMap)</span>
    </Link>
  )
}
