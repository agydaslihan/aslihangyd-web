'use client'

import { useLinkStatus } from 'next/link'

/**
 * Bağlantı beklerken görünen ince altın çizgi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ŞARTNAME §5: "Zarif yükleme animasyonu — LCP'yi GECİKTİRMESİN, sadece
 * sayfa geçişlerinde, ilk yüklemede değil."
 *
 * `useLinkStatus` tam olarak bunu veriyor: yalnızca bir bağlantıya
 * basıldıktan sonra, bir sonraki sayfa hazırlanırken `pending` oluyor. İlk
 * yüklemede hiç çalışmıyor — çünkü ortada tıklanmış bir bağlantı yok.
 *
 * ⚠️ SAYFA ÜSTÜNDE GLOBAL BİR ÇUBUK DEĞİL, BASILAN BAĞLANTININ KENDİSİ.
 * Global çubuk "bir şey yükleniyor" der; buradaki çizgi "senin bastığın
 * şey yükleniyor" der. Geri bildirim, eylemin olduğu yerde en güçlü.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ Bu bileşen `<Link>` ÇOCUĞU olmak zorunda: `useLinkStatus` bağlamı
 * oradan okuyor. Başka bir yerde çağrılırsa daima "beklemiyor" döner.
 *
 * ⚠️ `aria-hidden`: çizgi dekoratif. Yükleniyor bilgisini ekran okuyucuya
 * sayfanın kendi `loading.tsx` iskeleti veriyor.
 */
export function BaglantiIsigi() {
  const { pending } = useLinkStatus()
  if (!pending) return null

  return <span aria-hidden="true" className="gezinme-isigi" />
}
