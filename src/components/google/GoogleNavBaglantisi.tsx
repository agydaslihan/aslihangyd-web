import Link from 'next/link'
import type { ServerProps } from 'payload'

import { yoneticiMi } from '@/lib/erisim'

import { GOOGLE_YOLU } from './yol'

/**
 * Admin yan menüsündeki Google Places bağlantısı.
 *
 * ⚠️ Yalnızca yöneticiye gösterilir — ekran para harcayan bir işi
 * yönetiyor.
 *
 * ⚠️ Katman KAPALIYKEN de görünür. Ekran o durumda ne yapılması
 * gerektiğini anlatıyor; bağlantıyı gizlemek "bu özellik yok" izlenimi
 * verir ve açma yolunu görünmez kılardı.
 */
export function GoogleNavBaglantisi({ payload, user }: ServerProps) {
  if (!yoneticiMi(user)) return null

  const adres = `${payload?.config.routes.admin ?? '/admin'}${GOOGLE_YOLU}`

  return (
    <Link href={adres} className="nav__link">
      <span className="nav__link-label">Google Places eşleştirme</span>
    </Link>
  )
}
