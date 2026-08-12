import Link from 'next/link'
import type { ServerProps } from 'payload'

import { GOZLEM_ICE_AKTARMA_YOLU } from './yol'

/**
 * Admin yan menüsündeki gözlem içe aktarma bağlantısı.
 *
 * Diğer özel görünümlerle aynı gerekçe: bu ekran bir koleksiyon olmadığı
 * için Payload'ın otomatik menüsünde görünmez ve görünmeyen bir araç,
 * olmayan bir araçtır.
 */
export function GozlemNavBaglantisi({ payload }: ServerProps) {
  const adres = `${payload?.config.routes.admin ?? '/admin'}${GOZLEM_ICE_AKTARMA_YOLU}`

  return (
    <Link href={adres} className="nav__link">
      <span className="nav__link-label">Gözlem içe aktar (CSV)</span>
    </Link>
  )
}
