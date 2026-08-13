import { ayar } from '@/lib/ayarlar'
import Script from 'next/script'

import { izinVarMi } from '@/lib/kvkk/onay'
import { cerezOnayiniOku } from '@/lib/kvkk/sunucu'

/**
 * Analitik betiği — **yalnızca onay varsa** HTML'e eklenir.
 *
 * ⚠️ CLAUDE.md kural 8: "Banner göstermek yetmez; script enjeksiyonu onaya
 * bağlı olmalı."
 *
 * Bu bir Server Component'tir ve bilinçlidir. Onay yoksa `<Script>` hiç
 * render edilmez — betik etiketi sayfanın kaynağında bulunmaz, dolayısıyla
 * yüklenmesi engellenecek bir şey de kalmaz. İstemcide "yükle sonra kaldır"
 * yaklaşımı gerçek bir engel değildir; istek zaten gitmiş olur.
 */
export async function Analitik() {
  const onay = await cerezOnayiniOku()
  if (!izinVarMi(onay, 'analitik')) return null

  /**
   * ⚠️ Ön eksiz ve bu bilinçli — bu bir Server Component, çalışma zamanında
   * okuyor. `NEXT_PUBLIC_` önekliyken değerler derleme anında gömülüyordu
   * ve üretim imajı onlar tanımsızken derlendiği için analitik yayında
   * HİÇ yüklenmiyordu. Gerekçenin tamamı `lib/harita/sunucu.ts` içinde.
   */
  const url = ayar('UMAMI_URL')
  const siteId = ayar('UMAMI_SITE_ID')

  // Umami kurulmadıysa sessizce hiçbir şey yapma — site çalışmaya devam eder.
  if (!url || !siteId) return null

  return (
    <Script
      src={url}
      data-website-id={siteId}
      strategy="afterInteractive"
      // Umami çerezsiz modda çalışır; yine de analitik kategorisi altında
      // onaya bağlanıyor çünkü ziyaret ölçümü kişisel veri işleme sayılır.
      data-do-not-track="true"
    />
  )
}
