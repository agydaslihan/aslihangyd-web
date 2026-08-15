import type { Metadata } from 'next'

import { AlimMaliyetiFormu, type RayicSecenegi } from '@/components/hesaplayici/AlimMaliyetiFormu'
import { HesaplayiciKabugu } from '@/components/hesaplayici/Kabuk'
import { rayicKaynagiEtiketi } from '@/lib/rayic/tipler'
import { mutlakAdres } from '@/lib/site'
import { rayicliMahalleleriGetir } from '@/lib/veri/rayic'
import { vergiParametreleriniGetir } from '@/lib/veri/vergiParametreleri'

export const metadata: Metadata = {
  title: 'Alım Maliyeti Hesaplayıcı — ev almanın gerçek maliyeti',
  description:
    'Tapu harcı, döner sermaye, DASK, ekspertiz ve komisyon dahil, bir evin size gerçekte ' +
    'kaça mal olacağını hesaplayın.',
  alternates: { canonical: mutlakAdres('/araclar/alim-maliyeti') },
}

export default async function AlimMaliyetiSayfasi() {
  const [parametreler, rayicler] = await Promise.all([
    vergiParametreleriniGetir(),
    rayicliMahalleleriGetir(),
  ])

  /**
   * ⚠️ Yalnızca m² rayiç bedeli GİRİLMİŞ mahalleler listeye giriyor.
   * Rayiç bedeli olmayan bir mahalleyi seçilebilir yapmak, seçildiğinde
   * hiçbir şey değiştirmeyen bir alan olurdu.
   */
  const rayicSecenekleri: RayicSecenegi[] = rayicler
    .filter((kayit) => kayit.rayic.metrekareRayicBedel !== null)
    .map((kayit) => ({
      mahalleId: kayit.mahalleId,
      ad: kayit.ad,
      yil: kayit.rayic.yil,
      metrekareRayicBedel: kayit.rayic.metrekareRayicBedel as number,
      kaynakEtiketi: rayicKaynagiEtiketi(kayit.rayic.kaynak) ?? 'belirtilmedi',
    }))

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
            <strong>Tapu harcı rayiç bedelin altına düşemez.</strong> Mahalle ve brüt m² girerseniz
            taşınmazın rayiç bedeli hesaplanır ve harç, satış bedeliyle rayiç bedelin{' '}
            <em>büyüğü</em> üzerinden gösterilir. Rayiç bedel, belediyenin emlak vergisine esas
            aldığı <em>asgari</em> değerdir — piyasa fiyatı değildir ve çoğu yerde onun altındadır.
            Rakamın kaynağı ve yılı ekranda birlikte gösterilir.
          </p>
          <p>
            <strong>Bu hesapta olmayanlar:</strong> taşınma, tadilat, abonelik açtırma, mobilya.
            Bunlar da bütçenizin gerçek parçasıdır.
          </p>
        </>
      }
    >
      <AlimMaliyetiFormu parametreler={parametreler} rayicSecenekleri={rayicSecenekleri} />
    </HesaplayiciKabugu>
  )
}
