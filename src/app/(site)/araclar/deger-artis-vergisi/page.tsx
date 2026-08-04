import type { Metadata } from 'next'

import { DegerArtisFormu } from '@/components/hesaplayici/DegerArtisFormu'
import { HesaplayiciKabugu } from '@/components/hesaplayici/Kabuk'
import { mutlakAdres } from '@/lib/site'
import { vergiParametreleriniGetir } from '@/lib/veri/vergiParametreleri'

export const metadata: Metadata = {
  title: 'Değer Artış Kazancı Vergisi Hesaplayıcı',
  description:
    'Gayrimenkulü satarken değer artış kazancı vergisi ödeyecek misiniz? Muafiyet süresi ve ' +
    'enflasyon endekslemesiyle hesaplayın.',
  alternates: { canonical: mutlakAdres('/araclar/deger-artis-vergisi') },
}

export default async function DegerArtisSayfasi() {
  const parametreler = await vergiParametreleriniGetir()

  return (
    <HesaplayiciKabugu
      baslik="Değer Artış Kazancı Vergisi"
      aciklama="Bu hesaplayıcının en değerli çıktısı bir rakam değil, bir tarih olabilir: taşınmazı muafiyet süresi dolana kadar elde tutmak, verginin tamamından kurtarır. Çoğu kişi bunu satıştan sonra öğrenir."
      parametreTarihi={parametreler.gecerlilikTarihi}
      vergiIcerir
      yontem={
        <>
          <p>
            <strong>Önce muafiyet kontrol edilir.</strong> Taşınmaz, muafiyet süresinden uzun elde
            tutulduktan sonra satılırsa değer artış kazancı vergisi doğmaz. Süre takvim üzerinden
            hesaplanır — 365&apos;e bölmek artık yıllarda birkaç günlük hata üretir ve bu, sınırdaki
            bir satışta önemlidir.
          </p>
          <p>
            <strong>Enflasyon endekslemesi.</strong> Alış bedeli, Yİ-ÜFE ile güncellenebilir.
            Endeksleme yapılmazsa vergi, enflasyondan kaynaklanan nominal artış üzerinden hesaplanır
            ve gerçek kazancınızın çok üzerinde çıkar.
          </p>
          <p>
            <strong>Yİ-ÜFE değerlerini sizden istiyoruz</strong>, sistemde tutmuyoruz. Aylık
            yayınlanan resmî bir seridir; eskimiş bir seri yanlış vergi üretir. Değerleri
            TÜİK&apos;in yayınladığı tablodan alabilirsiniz.
          </p>
          <p>
            Endekslenmiş bedel ve belgelendirilmiş satış giderleri düşüldükten sonra kalan kazançtan
            istisna tutarı indirilir; kalan matraha artan oranlı tarife uygulanır.
          </p>
          <p>
            <strong>Kapsam dışı:</strong> Endekslemenin uygulanabilmesi için aranan artış oranı
            eşiği, miras/bağış yoluyla edinme ve ticari kazanç sayılan durumlar burada
            değerlendirilmez.
          </p>
        </>
      }
    >
      <DegerArtisFormu parametreler={parametreler} />
    </HesaplayiciKabugu>
  )
}
