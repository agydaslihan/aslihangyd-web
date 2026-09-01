import Link from 'next/link'
import type { ServerProps } from 'payload'

import { yoneticiMi } from '@/lib/erisim'

import { OLCEK_YOLU } from './yol'

/** Admin yan menüsündeki ölçek düzeltme bağlantısı — yalnızca yönetici. */
export function OlcekNavBaglantisi({ payload, user }: ServerProps) {
  if (!yoneticiMi(user)) return null

  const adres = `${payload?.config.routes.admin ?? '/admin'}${OLCEK_YOLU}`

  return (
    <Link href={adres} className="nav__link">
      <span className="nav__link-label">Ölçek düzeltme (binlik ayırıcı)</span>
    </Link>
  )
}
