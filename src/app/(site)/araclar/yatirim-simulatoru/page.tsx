import type { Metadata } from 'next'

import { HesaplayiciKabugu } from '@/components/hesaplayici/Kabuk'
import { YatirimSimulatoruFormu } from '@/components/hesaplayici/YatirimSimulatoruFormu'
import { mutlakAdres } from '@/lib/site'
import { bolumKapisi } from '@/lib/veri/siteBolumleri'
import { vergiParametreleriniGetir } from '@/lib/veri/vergiParametreleri'

export const metadata: Metadata = {
  title: 'Yatırım Simülatörü — kiralık konut yatırımının yıl yıl projeksiyonu',
  description:
    'Peşinat, kredi, kira artışı ve giderleri girin; yatırımın yıl yıl nakit akışını, öz ' +
    'sermaye birikimini ve enflasyondan arındırılmış reel getirisini görün.',
  alternates: { canonical: mutlakAdres('/araclar/yatirim-simulatoru') },
}

export default async function YatirimSimulatoruSayfasi() {
  // ⚠️ Bölüm kapısı EN BAŞTA: kapalıysa hiçbir veri sorgusu çalışmasın
  // ve kapalı bölümün verisi RSC yüküne girmesin.
  await bolumKapisi('simulator')

  const parametreler = await vergiParametreleriniGetir()

  return (
    <HesaplayiciKabugu
      baslik="Yatırım Simülatörü"
      aciklama="Kira getirisi hesaplayıcı tek yılın fotoğrafını çeker. Bu araç filmi oynatır: kredili bir yatırımda ilk yılların nakit akışı genellikle negatiftir ve getirinin büyük kısmı, borcun kirayla ödenmesinden gelir. Tek yıllık bir oran bunu göstermez."
      parametreTarihi={parametreler.gecerlilikTarihi}
      vergiIcerir
      yontem={
        <>
          <p>
            Her yıl için kira geliri (boş kalma süresi düşülmüş), işletme giderleri, kredi taksiti
            ve kira geliri vergisi hesaplanır; kalan tutar o yılın{' '}
            <strong>net nakit akışıdır.</strong> Ayrıca konutun değeri ile kalan borç arasındaki
            fark, yani <strong>öz sermaye</strong> takip edilir.
          </p>
          <p>
            Getiri ölçüsü olarak <strong>iç verim oranı (İVO)</strong> kullanılır. Kaldıraçlı ve ara
            nakit akışlı bir yatırımda anlamlı olan tek ölçü budur: paranın ne zaman girip çıktığını
            hesaba katar. &quot;Toplam getiri %180&quot; gibi bir rakam, bu getirinin 3 yılda mı 15
            yılda mı elde edildiğini gizler.
          </p>
          <p>
            <strong>Enflasyon beklentinizi girerseniz reel getiri de hesaplanır.</strong> Reel
            getiri Fisher denklemiyle bulunur — nominal getiriden enflasyonu çıkarmak yüksek
            enflasyonda ciddi biçimde yanıltır.
          </p>
          <p>
            <strong>Vergi dilimi kayması düzeltilir.</strong> Bugünün vergi dilimlerini 10 yıl
            sonrasının nominal kirasına uygulamak, vergiyi sistematik olarak olduğundan yüksek
            gösterir; çünkü dilimler ve istisna tutarı her yıl yeniden belirlenir. Enflasyon
            beklentiniz girildiğinde kira bugünkü paraya indirgenip vergi öyle hesaplanır.
          </p>
          <p>
            <strong>Büyüme varsayımları size aittir</strong> ve bilerek önceden doldurulmadı. Bunlar
            veri değil beklentidir. Bu aracın amacı size tek bir rakam vermek değil,
            varsayımlarınızın sonucu nasıl değiştirdiğini göstermektir; birkaç senaryo deneyin.
          </p>
          <p>
            Vergi parametreleri sisteme girilmemişse hesap durmaz, ama sonuç açıkça{' '}
            <strong>&quot;vergi öncesi&quot;</strong> olarak etiketlenir. Uydurma bir vergi rakamı
            üretmektense kalemi hiç göstermemeyi tercih ediyoruz.
          </p>
        </>
      }
    >
      <YatirimSimulatoruFormu parametreler={parametreler} />
    </HesaplayiciKabugu>
  )
}
