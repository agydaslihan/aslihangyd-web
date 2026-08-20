import Link from 'next/link'

import { ANASAYFA_YOLU } from './yol'

/**
 * Panel menüsündeki bağlantı.
 *
 * ⚠️ Özel görünümler koleksiyon olmadığı için menüde kendiliğinden
 * görünmüyor; görünmeyen bir araç, olmayan bir araçtır.
 */
export function AnaSayfaNavBaglantisi() {
  return (
    <Link href={`/admin${ANASAYFA_YOLU}`} className="nav__link">
      Ana sayfa bölümleri
    </Link>
  )
}
