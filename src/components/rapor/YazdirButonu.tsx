'use client'

import { Buton } from '@/components/ui/Buton'
import { IndirIkon } from '@/components/ui/Ikon'

/**
 * "PDF olarak kaydet" butonu.
 *
 * `window.print()` çağırır. Tarayıcının yazdırma penceresinde hedef olarak
 * "PDF olarak kaydet" seçilerek gerçek bir PDF dosyası üretilir — sunucuda
 * PDF kütüphanesi çalıştırmadan, Türkçe karakterler sistem fontlarıyla
 * kusursuz çıkarak. Gerekçe `RaporKabugu` başındaki notta.
 *
 * Butonun etiketi bilerek "PDF olarak kaydet": kullanıcının eline geçen şey
 * bir PDF dosyasıdır ve etiket bunu söylemelidir. "Yazdır" demek, PDF
 * isteyen kullanıcıyı yanlış yönlendirirdi.
 */
export function YazdirButonu() {
  return (
    <Buton onClick={() => window.print()} boyut="kucuk">
      <IndirIkon width={16} height={16} />
      PDF olarak kaydet
    </Buton>
  )
}
