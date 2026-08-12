import Link from 'next/link'
import type { ServerProps } from 'payload'

import { YAKINLIK_YOLU } from './yol'

/**
 * Admin yan menüsündeki skor önerileri bağlantısı.
 *
 * Diğer özel görünümlerle aynı gerekçe: bu ekran bir koleksiyon olmadığı
 * için Payload'ın otomatik menüsünde görünmez ve görünmeyen bir araç,
 * olmayan bir araçtır.
 */
export function YakinlikNavBaglantisi({ payload }: ServerProps) {
  const adres = `${payload?.config.routes.admin ?? '/admin'}${YAKINLIK_YOLU}`

  return (
    <Link href={adres} className="nav__link">
      <span className="nav__link-label">Yakınlıktan skor önerileri</span>
    </Link>
  )
}
