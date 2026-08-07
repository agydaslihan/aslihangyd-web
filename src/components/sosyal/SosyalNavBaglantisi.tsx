import Link from 'next/link'
import type { ServerProps } from 'payload'

import { SOSYAL_YOLU } from './yol'

/**
 * Admin yan menüsündeki sosyal medya materyali bağlantısı.
 *
 * Sihirbaz bağlantısıyla aynı gerekçe: bu ekran bir koleksiyon olmadığı
 * için Payload'ın otomatik menüsünde görünmez ve görünmeyen bir araç,
 * olmayan bir araçtır.
 */
export function SosyalNavBaglantisi({ payload }: ServerProps) {
  const adres = `${payload?.config.routes.admin ?? '/admin'}${SOSYAL_YOLU}`

  return (
    <Link href={adres} className="nav__link">
      <span className="nav__link-label">Sosyal medya materyali</span>
    </Link>
  )
}
