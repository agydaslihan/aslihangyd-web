import Link from 'next/link'
import type { ServerProps } from 'payload'

import { yoneticiMi } from '@/lib/erisim'

import { MAHALLE_RAKAM_YOLU } from './yol'

/**
 * Admin yan menüsündeki mahalle rakamları bağlantısı.
 *
 * ⚠️ Yalnızca yöneticiye gösterilir — ekran da yalnızca yöneticiye açık.
 */
export function RakamNavBaglantisi({ payload, user }: ServerProps) {
  if (!yoneticiMi(user)) return null

  const adres = `${payload?.config.routes.admin ?? '/admin'}${MAHALLE_RAKAM_YOLU}`

  return (
    <Link href={adres} className="nav__link">
      <span className="nav__link-label">Mahalle rakamları içe aktar (CSV)</span>
    </Link>
  )
}
