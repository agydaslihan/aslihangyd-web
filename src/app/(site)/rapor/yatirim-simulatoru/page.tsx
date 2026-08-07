import type { Metadata } from 'next'

import { RaporBolumu, RaporKabugu, RaporSatiri } from '@/components/rapor/RaporKabugu'
import { BosDurum } from '@/components/ui/BosDurum'
import { Buton } from '@/components/ui/Buton'
import { carpanYaz, paraKisaYaz, paraYaz, yuzdeYaz } from '@/lib/bicimlendirme'
import type { GiderYontemi } from '@/lib/hesaplayicilar/kiraGeliriVergisi'
import { yatirimSimulasyonuYap } from '@/lib/hesaplayicilar/yatirimSimulatoru'
import {
  sayiParametresi,
  secimParametresi,
  type SorguParametreleri,
} from '@/lib/rapor/parametreler'
import { mutlakAdres } from '@/lib/site'
import { bolumKapisi } from '@/lib/veri/siteBolumleri'
import { vergiParametreleriniGetir } from '@/lib/veri/vergiParametreleri'

export const metadata: Metadata = {
  title: 'Yatırım Simülatörü — rapor',
  description: 'Kiralık konut yatırımının yıl yıl nakit akışı ve getiri raporu.',
  alternates: { canonical: mutlakAdres('/rapor/yatirim-simulatoru') },
  robots: { index: false, follow: false },
}

const ARAC_ADRESI = '/araclar/yatirim-simulatoru'
const GIDER_YONTEMLERI = ['goturu', 'gercek'] as const satisfies readonly GiderYontemi[]

export default async function YatirimSimulatoruRaporu({
  searchParams,
}: {
  searchParams: Promise<SorguParametreleri>
}) {
  // ⚠️ Bölüm kapısı EN BAŞTA: kapalıysa hiçbir veri sorgusu çalışmasın
  // ve kapalı bölümün verisi RSC yüküne girmesin.
  await bolumKapisi('raporlar')

  const [parametreler, vergiParametreleri] = await Promise.all([
    searchParams,
    vergiParametreleriniGetir(),
  ])

  const girdi = {
    konutFiyati: sayiParametresi(parametreler, 'fiyat'),
    alimMasraflari: sayiParametresi(parametreler, 'masraf'),
    pesinat: sayiParametresi(parametreler, 'pesinat'),
    aylikFaizYuzdesi: sayiParametresi(parametreler, 'faiz'),
    vadeAy: sayiParametresi(parametreler, 'vade'),
    aylikKira: sayiParametresi(parametreler, 'kira'),
    yillikBoslukAyi: sayiParametresi(parametreler, 'bosluk'),
    yillikIsletmeGideri: sayiParametresi(parametreler, 'gider'),
    sureYil: sayiParametresi(parametreler, 'sure'),
    yillikKiraArtisiYuzdesi: sayiParametresi(parametreler, 'kiraArtisi'),
    yillikDegerArtisiYuzdesi: sayiParametresi(parametreler, 'degerArtisi'),
    yillikGiderArtisiYuzdesi: sayiParametresi(parametreler, 'giderArtisi'),
    yillikEnflasyonYuzdesi: sayiParametresi(parametreler, 'enflasyon'),
    satisMasrafiYuzdesi: sayiParametresi(parametreler, 'satisMasrafi'),
    giderYontemi: secimParametresi(parametreler, 'giderYontemi', GIDER_YONTEMLERI) ?? undefined,
  }

  const sonuc = yatirimSimulasyonuYap(girdi, vergiParametreleri)

  if (sonuc.durum !== 'hesaplandi') {
    return (
      <div className="kapsayici py-10 sm:py-14">
        <div className="mx-auto max-w-2xl">
          <BosDurum
            baslik="Rapor üretilemedi"
            neden="Bu rapor için gereken bilgiler bağlantıda eksik. Simülatöre dönüp bilgileri girdikten sonra rapor bağlantısı yeniden oluşacak."
            eylem={<Buton href={ARAC_ADRESI}>Simülatöre dön</Buton>}
          />
        </div>
      </div>
    )
  }

  const veri = sonuc.veri

  return (
    <RaporKabugu
      baslik="Yatırım Simülatörü raporu"
      altBaslik={`Kiralık konut yatırımının ${veri.son.yil} yıllık nakit akışı, öz sermaye birikimi ve getiri projeksiyonu.`}
      geriAdres={ARAC_ADRESI}
      geriEtiket="Simülatöre dön"
      vergiIcerir
      parametreTarihi={vergiParametreleri.gecerlilikTarihi}
      girdiOzeti={[
        { etiket: 'Alış fiyatı', deger: paraYaz(girdi.konutFiyati) ?? '—' },
        { etiket: 'Peşinat', deger: paraYaz(girdi.pesinat) ?? '—' },
        { etiket: 'Başlangıç aylık kira', deger: paraYaz(girdi.aylikKira) ?? '—' },
        { etiket: 'Projeksiyon süresi', deger: `${veri.son.yil} yıl` },
        { etiket: 'Kira artışı beklentisi', deger: yuzdeYaz(girdi.yillikKiraArtisiYuzdesi) ?? '—' },
        {
          etiket: 'Değer artışı beklentisi',
          deger: yuzdeYaz(girdi.yillikDegerArtisiYuzdesi) ?? '—',
        },
        {
          etiket: 'Yıllık işletme gideri',
          deger: paraYaz(girdi.yillikIsletmeGideri) ?? 'Girilmedi',
        },
        {
          etiket: 'Boş kalma beklentisi',
          deger: girdi.yillikBoslukAyi === null ? 'Girilmedi' : `Yılda ${girdi.yillikBoslukAyi} ay`,
        },
      ]}
    >
      {veri.vergiHesaplandi ? null : (
        <div className="border-kenar bg-uyari-zemin rounded-kart mt-6 border-[0.5px] p-4">
          <p className="text-govde-kucuk leading-relaxed">
            <strong>Bu rapor vergi öncesidir.</strong> Kira geliri vergisinin hesaplanması için
            gereken güncel istisna tutarı ve vergi dilimleri sisteme henüz girilmedi. Uydurma bir
            vergi rakamı üretmek yerine kalemi hiç göstermiyoruz; gerçek getiriniz aşağıdakinden
            düşük olacaktır.
          </p>
        </div>
      )}

      <RaporBolumu
        baslik="Getiri"
        aciklama="Kaldıraçlı ve ara nakit akışlı bir yatırımda anlamlı olan ölçü iç verim oranıdır (İVO): paranın ne zaman girip çıktığını hesaba katar."
      >
        <dl>
          <RaporSatiri
            etiket="Yıllık getiri (İVO, nominal)"
            deger={yuzdeYaz(veri.ircOrani)}
            vurgulu
          />
          <RaporSatiri
            etiket="Reel yıllık getiri"
            deger={yuzdeYaz(veri.reelIrcOrani)}
            aciklama={
              veri.reelIrcOrani === null
                ? 'Enflasyon beklentisi girilmediği için hesaplanamadı'
                : 'Enflasyondan arındırılmış (Fisher denklemi)'
            }
          />
          <RaporSatiri
            etiket="Getiri katı"
            deger={carpanYaz(veri.getiriKati)}
            aciklama={`${paraKisaYaz(veri.baslangicYatirimi)} yatırım → ${paraKisaYaz(veri.sonNetVarlik)}`}
          />
          <RaporSatiri
            etiket="Nakit başabaş yılı"
            deger={
              veri.nakitBasabasYili === null
                ? 'Süre boyunca dönmüyor'
                : `${veri.nakitBasabasYili}. yıl`
            }
            aciklama="Kiranın giderleri ve taksiti karşıladığı ilk yıl"
          />
        </dl>
      </RaporBolumu>

      <RaporBolumu baslik="Süre sonu">
        <dl>
          <RaporSatiri
            etiket="Başlangıç yatırımı"
            deger={paraYaz(veri.baslangicYatirimi)}
            aciklama="Peşinat + alım masrafları"
          />
          <RaporSatiri
            etiket="Aylık kredi taksiti"
            deger={paraYaz(veri.aylikTaksit) ?? 'Kredi yok'}
          />
          <RaporSatiri etiket="Konutun süre sonu değeri" deger={paraYaz(veri.son.konutDegeri)} />
          <RaporSatiri
            etiket="Biriken net nakit akışı"
            deger={paraYaz(veri.son.kumulatifNakitAkisi)}
          />
          <RaporSatiri
            etiket="Satılırsa eline geçen"
            deger={paraYaz(veri.netSatisGeliri)}
            aciklama="Satış masrafı ve kalan borç düşülmüş"
          />
          <RaporSatiri etiket="Toplam net varlık" deger={paraYaz(veri.sonNetVarlik)} vurgulu />
          {veri.bugunkuParaylaNetVarlik !== null ? (
            <RaporSatiri
              etiket="Bugünkü parayla"
              deger={paraYaz(veri.bugunkuParaylaNetVarlik)}
              aciklama="Enflasyondan arındırılmış"
            />
          ) : null}
        </dl>
      </RaporBolumu>

      <RaporBolumu baslik="Yıl yıl nakit akışı">
        <div className="overflow-x-auto">
          <table className="rakam w-full min-w-[34rem] text-right text-govde-kucuk">
            <thead>
              <tr className="text-metin-3 text-mikro border-kenar border-b-[0.5px]">
                <th scope="col" className="py-2 text-left font-medium">
                  Yıl
                </th>
                <th scope="col" className="py-2 font-medium">
                  Kira
                </th>
                <th scope="col" className="py-2 font-medium">
                  Gider
                </th>
                <th scope="col" className="py-2 font-medium">
                  Kredi
                </th>
                {veri.vergiHesaplandi ? (
                  <th scope="col" className="py-2 font-medium">
                    Vergi
                  </th>
                ) : null}
                <th scope="col" className="py-2 font-medium">
                  Net akış
                </th>
                <th scope="col" className="py-2 font-medium">
                  Öz sermaye
                </th>
              </tr>
            </thead>
            <tbody>
              {veri.yillar.map((satir) => (
                <tr key={satir.yil} className="border-kenar/60 border-b-[0.5px] last:border-0">
                  <th scope="row" className="py-1.5 text-left font-normal">
                    {satir.yil}
                  </th>
                  <td className="py-1.5">{paraKisaYaz(satir.kiraGeliri)}</td>
                  <td className="py-1.5">{paraKisaYaz(satir.isletmeGideri)}</td>
                  <td className="py-1.5">{paraKisaYaz(satir.krediOdemesi)}</td>
                  {veri.vergiHesaplandi ? (
                    <td className="py-1.5">{paraKisaYaz(satir.vergi)}</td>
                  ) : null}
                  <td className="py-1.5">
                    {satir.netNakitAkisi >= 0 ? '+' : '−'}
                    {paraKisaYaz(Math.abs(satir.netNakitAkisi))}
                  </td>
                  <td className="py-1.5">{paraKisaYaz(satir.ozSermaye)}</td>
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
        <ul className="text-metin-2 list-disc space-y-1.5 pl-5 text-govde-kucuk leading-relaxed">
          {veri.uyarilar.map((uyari) => (
            <li key={uyari}>{uyari}</li>
          ))}
        </ul>
      </RaporBolumu>
    </RaporKabugu>
  )
}
