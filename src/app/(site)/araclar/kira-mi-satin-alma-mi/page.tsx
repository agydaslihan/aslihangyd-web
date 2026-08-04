import type { Metadata } from 'next'

import { HesaplayiciKabugu } from '@/components/hesaplayici/Kabuk'
import { KiraMiSatinAlmaMiFormu } from '@/components/hesaplayici/KiraMiSatinAlmaMiFormu'
import { mutlakAdres } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Kiralasam mı, Satın Alsam mı? — net varlık karşılaştırması',
  description:
    'Aylık taksiti kirayla karşılaştırmak yanıltıcıdır. Bu araç iki senaryonun süre sonundaki ' +
    'net varlığını karşılaştırır ve satın almanın kârlı olması için gereken değer artışı eşiğini gösterir.',
  alternates: { canonical: mutlakAdres('/araclar/kira-mi-satin-alma-mi') },
}

export default function KiraMiSatinAlmaMiSayfasi() {
  return (
    <HesaplayiciKabugu
      baslik="Kiralasam mı, Satın Alsam mı?"
      aciklama="Bu sorunun en sık verilen cevabı yanlıştır: aylık taksit ile aylık kira yan yana konur. O karşılaştırma peşinatın alternatif getirisini de, kiracının biriktirdiği parayı da görmez. Burada karşılaştırılan şey aylık ödeme değil, süre sonundaki net varlık."
      yontem={
        <>
          <p>
            İki senaryo simetrik kurulur. <strong>Satın alan</strong> peşinatı ve alım masraflarını
            peşin öder, aylık taksit ve mülkiyet giderlerini üstlenir; varlığı konutun değeri eksi
            kalan borçtur. <strong>Kiracı</strong> aynı tutarı yatırımda tutar ve aylık kira öder;
            varlığı yatırım portföyünün değeridir.
          </p>
          <p>
            <strong>Her ay, az ödeyen taraf aradaki farkı yatırır.</strong> Bu adım karşılaştırmanın
            dürüst olmasını sağlayan şeydir — atlanırsa &quot;kiralamak daha ucuz&quot; derken
            kiracının o parayı harcadığı varsayılmış olur.
          </p>
          <p>
            <strong>Değer artışı, kira artışı ve alternatif getiri oranları size aittir</strong> ve
            bilerek önceden doldurulmadı. Bunlar veri değil, beklentidir; bizim &quot;makul&quot;
            bir rakam yazmamız kendi tahminimizi veri kılığında sunmak olurdu.
          </p>
          <p>
            Bunun yerine sonuç ekranında <strong>başabaş değer artışı</strong> hesaplanır: satın
            almanın kiralamayı geçmesi için konutun yılda en az yüzde kaç değerlenmesi gerektiği. Bu
            eşik sizin değer artışı tahmininizden bağımsızdır — kira, faiz ve alternatif getiri
            oranlarından türetilir.
          </p>
          <p>
            Konut değeri aylık bileşiklenir; kira ise yılda bir kez zamlanır (sözleşme 12 ay sabit
            kalır). İkisini de aylık artırmak kirayı olduğundan hızlı büyütürdü.
          </p>
          <p>
            <strong>Enflasyon beklentinizi girerseniz</strong> sonuç bugünkü paraya da çevrilir.
            Yüksek enflasyonda &quot;10 yıl sonra şu kadar öndesiniz&quot; cümlesi, o tutarın
            bugünkü karşılığı söylenmezse anlamsızdır.
          </p>
        </>
      }
    >
      <KiraMiSatinAlmaMiFormu />
    </HesaplayiciKabugu>
  )
}
