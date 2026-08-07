import type { Metadata } from 'next'

import { RaporBolumu, RaporKabugu, RaporSatiri } from '@/components/rapor/RaporKabugu'
import { BosDurum } from '@/components/ui/BosDurum'
import { Buton } from '@/components/ui/Buton'
import { paraKisaYaz, paraYaz, yuzdeYaz } from '@/lib/bicimlendirme'
import { kiraMiSatinAlmaMiHesapla } from '@/lib/hesaplayicilar/kiraMiSatinAlmaMi'
import { sayiParametresi, type SorguParametreleri } from '@/lib/rapor/parametreler'
import { mutlakAdres } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Kiralasam mı, Satın Alsam mı? — rapor',
  description: 'Kiralama ve satın alma senaryolarının net varlık karşılaştırma raporu.',
  alternates: { canonical: mutlakAdres('/rapor/kira-mi-satin-alma-mi') },
  // Rapor sayfaları kişiye özel girdilerle üretilir; arama sonuçlarında
  // yer almaları ne kullanıcıya ne bize fayda sağlar.
  robots: { index: false, follow: false },
}

const ARAC_ADRESI = '/araclar/kira-mi-satin-alma-mi'

export default async function KiraMiSatinAlmaMiRaporu({
  searchParams,
}: {
  searchParams: Promise<SorguParametreleri>
}) {
  const parametreler = await searchParams

  const girdi = {
    konutFiyati: sayiParametresi(parametreler, 'fiyat'),
    pesinat: sayiParametresi(parametreler, 'pesinat'),
    alimMasraflari: sayiParametresi(parametreler, 'masraf'),
    aylikFaizYuzdesi: sayiParametresi(parametreler, 'faiz'),
    vadeAy: sayiParametresi(parametreler, 'vade'),
    aylikKira: sayiParametresi(parametreler, 'kira'),
    depozito: sayiParametresi(parametreler, 'depozito'),
    sureYil: sayiParametresi(parametreler, 'sure'),
    yillikDegerArtisiYuzdesi: sayiParametresi(parametreler, 'degerArtisi'),
    yillikKiraArtisiYuzdesi: sayiParametresi(parametreler, 'kiraArtisi'),
    yillikAlternatifGetiriYuzdesi: sayiParametresi(parametreler, 'getiri'),
    yillikEnflasyonYuzdesi: sayiParametresi(parametreler, 'enflasyon'),
    aylikAidat: sayiParametresi(parametreler, 'aidat'),
    yillikMulkiyetGideri: sayiParametresi(parametreler, 'mulkiyet'),
    satisMasrafiYuzdesi: sayiParametresi(parametreler, 'satisMasrafi'),
  }

  const sonuc = kiraMiSatinAlmaMiHesapla(girdi)

  if (sonuc.durum !== 'hesaplandi') {
    return (
      <div className="kapsayici py-10 sm:py-14">
        <div className="mx-auto max-w-2xl">
          <BosDurum
            baslik="Rapor üretilemedi"
            neden="Bu rapor için gereken bilgiler bağlantıda eksik. Hesaplayıcıya dönüp bilgileri girdikten sonra rapor bağlantısı yeniden oluşacak."
            eylem={<Buton href={ARAC_ADRESI}>Hesaplayıcıya dön</Buton>}
          />
        </div>
      </div>
    )
  }

  const veri = sonuc.veri
  const satinAlmaOnde = veri.son.fark > 0

  return (
    <RaporKabugu
      baslik="Kiralasam mı, Satın Alsam mı?"
      altBaslik={`${veri.son.yil} yıllık net varlık karşılaştırması. Bu rapor aylık ödemeleri değil, iki senaryonun süre sonundaki servetini kıyaslar.`}
      geriAdres={ARAC_ADRESI}
      geriEtiket="Hesaplayıcıya dön"
      girdiOzeti={[
        { etiket: 'Taşınmaz fiyatı', deger: paraYaz(girdi.konutFiyati) ?? '—' },
        { etiket: 'Peşinat', deger: paraYaz(girdi.pesinat) ?? '—' },
        { etiket: 'Aylık kira', deger: paraYaz(girdi.aylikKira) ?? '—' },
        { etiket: 'Karşılaştırma süresi', deger: `${veri.son.yil} yıl` },
        {
          etiket: 'Değer artışı beklentisi',
          deger: yuzdeYaz(girdi.yillikDegerArtisiYuzdesi) ?? '—',
        },
        { etiket: 'Kira artışı beklentisi', deger: yuzdeYaz(girdi.yillikKiraArtisiYuzdesi) ?? '—' },
        {
          etiket: 'Alternatif getiri',
          deger: yuzdeYaz(girdi.yillikAlternatifGetiriYuzdesi) ?? '—',
        },
        { etiket: 'Alım masrafları', deger: paraYaz(girdi.alimMasraflari) ?? 'Girilmedi' },
      ]}
    >
      <RaporBolumu baslik="Sonuç">
        <div className="border-cizgi bg-yuzey rounded-yumusak border p-5">
          <p className="text-[1.25rem] leading-snug font-semibold">
            {veri.son.yil} yıl sonunda {satinAlmaOnde ? 'satın almak' : 'kiralamak'} önde:{' '}
            <span className="rakam">{paraYaz(Math.abs(veri.son.fark))}</span>
          </p>
          {veri.bugunkuParaylaFark !== null ? (
            <p className="text-murekkep-2 mt-2 text-sm">
              Bugünkü parayla:{' '}
              <strong className="rakam">{paraYaz(Math.abs(veri.bugunkuParaylaFark))}</strong>
            </p>
          ) : (
            <p className="text-murekkep-3 text-mikro mt-2">
              Bu rakam {veri.son.yil} yıl sonrasının parasıyladır; enflasyon beklentisi girilmediği
              için bugünkü karşılığı hesaplanmadı.
            </p>
          )}
        </div>
      </RaporBolumu>

      <RaporBolumu
        baslik="Başabaş değer artışı"
        aciklama="Bu eşik, değer artışı tahmininizden bağımsızdır; kira, faiz ve alternatif getiri oranlarından türer."
      >
        {veri.basabasDegerArtisi === null ? (
          <p className="text-murekkep-2 text-sm leading-relaxed">
            Girdiğiniz alternatif getiri oranıyla, makul hiçbir değer artışı satın almayı öne
            geçirmiyor.
          </p>
        ) : (
          <p className="text-sm leading-relaxed">
            Satın almanın kiralamayı geçmesi için konutun{' '}
            <strong className="rakam">yılda en az {yuzdeYaz(veri.basabasDegerArtisi)}</strong>{' '}
            değerlenmesi gerekiyor. Beklentiniz bunun üstündeyse satın almak, altındaysa kiralayıp
            peşinatı yatırmak sizi öne geçirir.
          </p>
        )}
      </RaporBolumu>

      <RaporBolumu baslik="Süre sonu tablosu">
        <dl>
          <RaporSatiri
            etiket="Başlangıçta cebinizden çıkan"
            deger={paraYaz(veri.baslangicNakitCikisi)}
            aciklama="Peşinat + alım masrafları"
          />
          <RaporSatiri
            etiket="Aylık kredi taksiti"
            deger={paraYaz(veri.aylikTaksit) ?? 'Kredi yok'}
            aciklama="KKDF/BSMV ve sigorta hariç"
          />
          <RaporSatiri etiket="Konutun süre sonu değeri" deger={paraYaz(veri.son.konutDegeri)} />
          {veri.son.kalanBorc > 0 ? (
            <RaporSatiri etiket="Kalan kredi borcu" deger={paraYaz(veri.son.kalanBorc)} />
          ) : null}
          <RaporSatiri
            etiket="Satın alanın net varlığı"
            deger={paraYaz(veri.son.satinAlanNetVarlik)}
            vurgulu
          />
          <RaporSatiri
            etiket="Kiracının net varlığı"
            deger={paraYaz(veri.son.kiraciNetVarlik)}
            aciklama="Peşinat ve aylık tasarrufun yatırımdaki karşılığı"
            vurgulu
          />
          <RaporSatiri
            etiket="Başabaş yılı"
            deger={veri.basabasYili === null ? 'Öne geçmiyor' : `${veri.basabasYili}. yıl`}
          />
        </dl>
      </RaporBolumu>

      <RaporBolumu baslik="Yıl yıl karşılaştırma">
        <div className="overflow-x-auto">
          <table className="rakam w-full min-w-[28rem] text-right text-sm">
            <thead>
              <tr className="text-murekkep-3 text-mikro border-cizgi border-b">
                <th scope="col" className="py-2 text-left font-medium">
                  Yıl
                </th>
                <th scope="col" className="py-2 font-medium">
                  Satın alan
                </th>
                <th scope="col" className="py-2 font-medium">
                  Kiracı
                </th>
                <th scope="col" className="py-2 font-medium">
                  Fark
                </th>
              </tr>
            </thead>
            <tbody>
              {veri.yillar.map((satir) => (
                <tr key={satir.yil} className="border-cizgi/60 border-b last:border-0">
                  <th scope="row" className="py-1.5 text-left font-normal">
                    {satir.yil}
                  </th>
                  <td className="py-1.5">{paraKisaYaz(satir.satinAlanNetVarlik)}</td>
                  <td className="py-1.5">{paraKisaYaz(satir.kiraciNetVarlik)}</td>
                  <td className="py-1.5">
                    {satir.fark >= 0 ? '+' : '−'}
                    {paraKisaYaz(Math.abs(satir.fark))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </RaporBolumu>

      <RaporBolumu
        baslik="Bu hesaba dahil olmayanlar"
        aciklama="Eksikleri saklamak raporu güvenilir yapmaz; okuyanın kendi fark etmesi tüm rapora olan güveni zedeler."
      >
        <ul className="text-murekkep-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
          {veri.uyarilar.map((uyari) => (
            <li key={uyari}>{uyari}</li>
          ))}
        </ul>
      </RaporBolumu>
    </RaporKabugu>
  )
}
