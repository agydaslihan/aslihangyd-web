import dynamic from 'next/dynamic'

import { izinVarMi } from '@/lib/kvkk/onay'
import { cerezOnayiniOku } from '@/lib/kvkk/sunucu'

/**
 * Katman B kapısı — onay yoksa ölçüm ÇALIŞMAZ.
 *
 * ⚠️ `Analitik.tsx` ile aynı desen ve aynı gerekçe (CLAUDE.md kural 8):
 * karar SUNUCUDA veriliyor. Onay yoksa bileşen hiç render edilmiyor;
 * dolayısıyla hiçbir olay dinleyicisi takılmıyor, hiçbir istek atılmıyor,
 * `window.__gozlemOlay` hiç tanımlanmıyor ve `gozlemOlayi()` çağrıları
 * sessizce hiçbir şey yapmıyor.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ "TEK BAYT BİLE İNMİYOR" DEMİYORUZ — ÖLÇTÜK, DOĞRU DEĞİL.
 *
 * `next/dynamic` ayrı bir parça isteyecek şekilde yazıldı ama Turbopack
 * `OlayIzleyici`'yi çerez bandıyla AYNI parçaya koydu; o parça zaten her
 * ziyaretçide yükleniyor. Onaylı ve onaysız istekler karşılaştırıldı,
 * ikisinde de aynı parça HTML'de görünüyor.
 *
 * Ölçülen bedel: izleyici modülünün kendisi **1,7 kB ham / 0,85 kB gzip**.
 * KVKK açısından belirleyici olan bayt değil DAVRANIŞ: onay yokken kod
 * çalışmıyor, dinleyici takılmıyor, istek gitmiyor.
 *
 * ⚠️ Yorumu düzeltmek yerine "ayrı parça" iddiasını bırakmak, ileride
 * ölçmeden yazılmış bir garantiye dayanmaktan iyidir.
 * ─────────────────────────────────────────────────────────────────────────
 */
const OlayIzleyici = dynamic(() =>
  import('./OlayIzleyici').then((modul) => ({ default: modul.OlayIzleyici })),
)

export async function KatmanB() {
  const onay = await cerezOnayiniOku()
  if (!izinVarMi(onay, 'analitik')) return null

  return <OlayIzleyici />
}
