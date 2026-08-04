import type { Metadata } from 'next'

import { HesaplayiciKabugu } from '@/components/hesaplayici/Kabuk'
import { KiraGeliriVergisiFormu } from '@/components/hesaplayici/KiraGeliriVergisiFormu'
import { mutlakAdres } from '@/lib/site'
import { vergiParametreleriniGetir } from '@/lib/veri/vergiParametreleri'

export const metadata: Metadata = {
  title: 'Kira Geliri Vergi Hesaplayıcı — istisna, gider, dilimler',
  description:
    'Konut kira gelirinizden ne kadar vergi ödeyeceğinizi hesaplayın. İstisna tutarı, götürü ' +
    've gerçek gider yöntemi ile artan oranlı tarife adım adım gösterilir.',
  alternates: { canonical: mutlakAdres('/araclar/kira-geliri-vergisi') },
}

export default async function KiraGeliriVergisiSayfasi() {
  const parametreler = await vergiParametreleriniGetir()

  return (
    <HesaplayiciKabugu
      baslik="Kira Geliri Vergi Hesaplayıcı"
      aciklama="Kira getirisi hesaplarken vergiyi unutmak, getiriyi olduğundan yüksek görmek demektir. Bu araç istisnayı, gideri ve vergi dilimlerini adım adım göstererek elinize net ne kaldığını hesaplar."
      parametreTarihi={parametreler.gecerlilikTarihi}
      vergiIcerir
      yontem={
        <>
          <p>
            Yıllık kira gelirinden önce <strong>istisna tutarı</strong> düşülür (konut kira gelirine
            tanınan muafiyet). Kalan hasılattan <strong>gider</strong> düşülür: götürü yöntemde
            sabit bir yüzde, gerçek yöntemde belgelendirdiğiniz tutar. Kalan matraha{' '}
            <strong>artan oranlı tarife</strong> uygulanır.
          </p>
          <p>
            <strong>Artan oranlı ne demek?</strong> Matrahın tamamına en yüksek oran uygulanmaz. Her
            dilim kendi oranıyla vergilendirilir. Bu, en yaygın yanlış anlamalardan biridir ve sonuç
            ekranında dilim dilim gösteriliyor.
          </p>
          <p>
            <strong>Basitleştirmeler:</strong> İstisnadan yararlanma şartları (ticari kazanç
            varlığı, beyan zorunluluğu, birden fazla konut) burada değerlendirilmez. Başka gelir
            unsurlarınız varsa tarife toplam gelirinize uygulanır ve gerçek verginiz daha yüksek
            çıkar.
          </p>
        </>
      }
    >
      <KiraGeliriVergisiFormu parametreler={parametreler} />
    </HesaplayiciKabugu>
  )
}
