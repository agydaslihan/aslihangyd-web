import Link from 'next/link'
import type { ServerProps } from 'payload'

import { yoneticiMi } from '@/lib/erisim'

import { RAYIC_YOLU } from './yol'

/**
 * Admin yan menüsündeki rayiç bedel içe aktarma bağlantısı.
 *
 * ⚠️ Yalnızca yöneticiye gösterilir — ekran da yalnızca yöneticiye açık.
 */
export function RayicNavBaglantisi({ payload, user }: ServerProps) {
  if (!yoneticiMi(user)) return null

  const adres = `${payload?.config.routes.admin ?? '/admin'}${RAYIC_YOLU}`

  return (
    <Link href={adres} className="nav__link">
      <span className="nav__link-label">Rayiç bedel içe aktar (CSV)</span>
    </Link>
  )
}
