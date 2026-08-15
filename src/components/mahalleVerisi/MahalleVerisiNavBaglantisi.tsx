import Link from 'next/link'
import type { ServerProps } from 'payload'

import { yoneticiMi } from '@/lib/erisim'

import { MAHALLE_VERISI_YOLU } from './yol'

/**
 * Admin yan menüsündeki mahalle verisi bağlantısı.
 *
 * ⚠️ Yalnızca yöneticiye gösterilir — ekran da yalnızca yöneticiye açık.
 * Danışmana tıklayınca "yetkiniz yok" diyen bir bağlantı göstermek,
 * kullanılamayan bir menü öğesi biriktirmektir.
 */
export function MahalleVerisiNavBaglantisi({ payload, user }: ServerProps) {
  if (!yoneticiMi(user)) return null

  const adres = `${payload?.config.routes.admin ?? '/admin'}${MAHALLE_VERISI_YOLU}`

  return (
    <Link href={adres} className="nav__link">
      <span className="nav__link-label">Mahalle verisi kurulumu</span>
    </Link>
  )
}
