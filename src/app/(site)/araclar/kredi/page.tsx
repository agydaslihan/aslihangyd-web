import type { Metadata } from 'next'

import { HesaplayiciKabugu } from '@/components/hesaplayici/Kabuk'
import { KrediFormu } from '@/components/hesaplayici/KrediFormu'
import { mutlakAdres } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Konut Kredisi Hesaplayıcı — taksit ve ödeme planı',
  description:
    'Konut kredisi aylık taksitini, toplam geri ödemeyi ve ay ay ödeme planını hesaplayın. ' +
    'Faizin ne kadarını ne zaman ödediğinizi görün.',
  alternates: { canonical: mutlakAdres('/araclar/kredi') },
}

export default function KrediSayfasi() {
  return (
    <HesaplayiciKabugu
      baslik="Konut Kredisi Hesaplayıcı"
      aciklama="Aylık taksit önemlidir ama tek başına yanıltıcıdır. Asıl soru, kredinin size toplamda kaça mal olduğu ve ödemelerinizin ne kadarının faize gittiğidir."
      yontem={
        <>
          <p>
            Eşit taksitli (anüite) ödeme planı kullanılır:{' '}
            <span className="rakam">taksit = anapara × (i × (1+i)ⁿ) ÷ ((1+i)ⁿ − 1)</span>, burada i
            aylık faiz oranı, n vade (ay).
          </p>
          <p>
            Eşit taksitli kredide her ay aynı tutarı ödersiniz ama bu tutarın dağılımı değişir: ilk
            yıllarda ağırlıklı olarak faiz, son yıllarda ağırlıklı olarak anapara ödersiniz. Ödeme
            planı bunu ay ay gösterir.
          </p>
          <p>
            <strong>Faiz oranını sizden alıyoruz</strong>, sistemde tutmuyoruz. Konut kredisi faizi
            bankadan bankaya ve haftadan haftaya değişir; sabit bir oran göstermek sizi eskimiş bir
            rakamla hesap yapmaya iterdi.
          </p>
          <p>
            <strong>Bu hesapta olmayanlar:</strong> dosya masrafı, hayat sigortası, konut sigortası,
            ekspertiz ücreti ve bankaların uyguladığı diğer kesintiler. Gerçek aylık ödemeniz
            hesaplanan tutarın üzerinde olur.
          </p>
        </>
      }
    >
      <KrediFormu />
    </HesaplayiciKabugu>
  )
}
