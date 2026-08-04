import type { Metadata } from 'next'

import { HesaplayiciKabugu } from '@/components/hesaplayici/Kabuk'
import { KiraGetirisiFormu } from '@/components/hesaplayici/KiraGetirisiFormu'
import { mutlakAdres } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Kira Getiri Hesaplayıcı — kira çarpanı ve amortisman',
  description:
    'Bir gayrimenkulün kira çarpanını, brüt ve net getirisini, kaç yılda kendini ödeyeceğini ' +
    'hesaplayın. Aidat, gider ve boşluk oranıyla birlikte.',
  alternates: { canonical: mutlakAdres('/araclar/kira-getirisi') },
}

export default function KiraGetirisiSayfasi() {
  return (
    <HesaplayiciKabugu
      baslik="Kira Getiri Hesaplayıcı"
      aciklama="Bir yatırımcı bir taşınmaza baktığında ilk üç soruyu sorar: kaç yılda kendini öder, yıllık yüzde kaç getirir, giderler düşünce geriye ne kalır. Bu araç üçünü de cevaplar."
      yontem={
        <>
          <p>
            <strong>Kira çarpanı</strong> = satış fiyatı ÷ (aylık kira × 12). Kaç yıllık kira
            gelirinin satış fiyatına eşit olduğunu gösterir. Düşük olması yatırımcı lehinedir.
          </p>
          <p>
            <strong>Brüt getiri</strong> = (aylık kira × 12) ÷ satış fiyatı × 100. Giderler hesaba
            katılmaz.
          </p>
          <p>
            <strong>Net getiri</strong> aynı hesabı aidat ve diğer giderler düşüldükten sonra yapar.
            Gider girmezseniz net getiri gösterilmez — sıfır gider varsaymak getiriyi olduğundan
            yüksek gösterirdi.
          </p>
          <p>
            <strong>Boşluk oranı</strong>, kiracı değişimlerinde boş geçen süreyi brüt kiradan
            düşer. Gerçek hayatta bir daire her ay dolu olmaz.
          </p>
          <p>Vergi bu hesaba dahil değildir; kira geliri vergisi için ayrı bir araç var.</p>
        </>
      }
    >
      <KiraGetirisiFormu />
    </HesaplayiciKabugu>
  )
}
