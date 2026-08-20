'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

import { azHareketIsteniyor, lcpSonrasi, masaustuMu } from '@/lib/hareket/kapi'

/**
 * İmleç ışığının kapısı — ışığın KENDİSİ burada yok.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN AYRI BİR SARMALAYICI: ÖLÇÜM.
 *
 * İlk kurulumda ışık doğrudan düzenden `next/dynamic` ile çağrılıyordu ve
 * parçası (21 kB gzip) İLK YÜKE GİRİYORDU — ölçüldü ve görüldü. Sebep:
 * düzen bir sunucu bileşeni, orada `ssr: false` kullanılamıyor; sunucuda
 * render edilen dinamik bir bileşenin parçası hidrasyon için baştan
 * isteniyor.
 *
 * Çözüm parçayı KOŞULA bağlamak: sarmalayıcı önce kapıya soruyor
 * (dokunmatik mi, az hareket mi, LCP boyandı mı) ve ancak cevap olumluysa
 * bileşeni render ediyor. `dynamic` çağrısı o ana kadar hiçbir şey
 * indirmiyor.
 *
 * ⚠️ Sarmalayıcının kendisi birkaç yüz bayt: durum, kapı çağrısı ve bir
 * koşul. Asıl ağırlık koşulun arkasında.
 * ─────────────────────────────────────────────────────────────────────────
 */
const ImlecIsigi = dynamic(
  () => import('@/components/hareket/ImlecIsigi').then((modul) => modul.ImlecIsigi),
  { ssr: false },
)

export function ImlecKatmani(): React.ReactElement | null {
  const [etkin, setEtkin] = useState(false)

  useEffect(() => {
    if (azHareketIsteniyor() || !masaustuMu()) return
    // ⚠️ Hero boyanmadan önce imleç katmanı indirmek, LCP ile aynı bant
    // genişliği için yarışmak demek.
    return lcpSonrasi(() => setEtkin(true))
  }, [])

  if (!etkin) return null
  return <ImlecIsigi />
}
