import type { Metadata } from 'next'

import { AlimMaliyetiFormu } from '@/components/hesaplayici/AlimMaliyetiFormu'
import { HesaplayiciKabugu } from '@/components/hesaplayici/Kabuk'
import { mutlakAdres } from '@/lib/site'
import { vergiParametreleriniGetir } from '@/lib/veri/vergiParametreleri'

export const metadata: Metadata = {
  title: 'Alım Maliyeti Hesaplayıcı — ev almanın gerçek maliyeti',
  description:
    'Tapu harcı, döner sermaye, DASK, ekspertiz ve komisyon dahil, bir evin size gerçekte ' +
    'kaça mal olacağını hesaplayın.',
  alternates: { canonical: mutlakAdres('/araclar/alim-maliyeti') },
}

export default async function AlimMaliyetiSayfasi() {
  const parametreler = await vergiParametreleriniGetir()

  return (
    <HesaplayiciKabugu
      baslik="Alım Maliyeti Hesaplayıcı"
      aciklama="Alıcıların en sık yanıldığı yer burasıdır. İlan fiyatına odaklanılır, üzerine gelen harç ve masraflar hesaba katılmaz — ve tapuda beklenmedik bir rakamla karşılaşılır."
      parametreTarihi={parametreler.gecerlilikTarihi}
      vergiIcerir
      yontem={
        <>
          <p>
            Satış bedelinin üzerine, alıcının ödediği kalemler eklenir: tapu harcı (satış bedelinin
            bir yüzdesi), tapu döner sermaye ücreti (sabit), zorunlu deprem sigortası, kredi
            kullanılacaksa ekspertiz ücreti ve varsa emlak komisyonu (KDV dahil).
          </p>
          <p>
            <strong>Oranlar sistemde tutulmaz, yönetim panelinden girilir.</strong> Her yıl değişen
            bir oranı koda gömmek, bir gün mutlaka unutulup sessizce yanlış rakam üretilmesi
            demektir. Oran girilmemişse hesaplayıcı çalışmaz ve eksik olanı söyler.
          </p>
          <p>
            <strong>DASK tutarı tahminidir</strong> — gerçek prim risk bölgesi, yapı tipi ve
            metrekareye göre değişir.
          </p>
          <p>
            <strong>Bu hesapta olmayanlar:</strong> taşınma, tadilat, abonelik açtırma, mobilya.
            Bunlar da bütçenizin gerçek parçasıdır.
          </p>
        </>
      }
    >
      <AlimMaliyetiFormu parametreler={parametreler} />
    </HesaplayiciKabugu>
  )
}
