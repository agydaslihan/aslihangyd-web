'use client'

import { useMemo, useState } from 'react'

import { SayiAlani, SonucSatiri, sayiyaCevir } from '@/components/hesaplayici/Alanlar'
import { BosDurum } from '@/components/ui/BosDurum'
import { Buton } from '@/components/ui/Buton'
import { KartIzgarasi, HesapKarti } from '@/components/ui/HesapKarti'
import { paraKisaYaz, paraYaz, yuzdeYaz } from '@/lib/bicimlendirme'
import { kiraMiSatinAlmaMiHesapla, type YilSatiri } from '@/lib/hesaplayicilar/kiraMiSatinAlmaMi'
import { raporAdresi } from '@/lib/rapor/parametreler'

/**
 * Kira mı satın alma mı formu.
 *
 * ⚠️ Üç varsayım alanına (değer artışı, kira artışı, alternatif getiri)
 * bilerek YER TUTUCU KONULMADI. Bir yer tutucu, kullanıcının çoğu zaman
 * doğrudan kabul ettiği bir öneridir; oraya rakam yazmak tahminimizi veri
 * kılığında sunmak olurdu (CLAUDE.md kural 2).
 *
 * Bunun yerine sonuç ekranı **başabaş değer artışı** eşiğini gösteriyor:
 * kullanıcı tahmin etmek zorunda kalmadan, kendi beklentisiyle
 * kıyaslayabileceği tek bir rakam görüyor.
 */
export function KiraMiSatinAlmaMiFormu() {
  const [fiyat, setFiyat] = useState('')
  const [pesinat, setPesinat] = useState('')
  const [alimMasraflari, setAlimMasraflari] = useState('')
  const [faiz, setFaiz] = useState('')
  const [vade, setVade] = useState('120')

  const [kira, setKira] = useState('')
  const [depozito, setDepozito] = useState('')

  const [sure, setSure] = useState('10')
  const [degerArtisi, setDegerArtisi] = useState('')
  const [kiraArtisi, setKiraArtisi] = useState('')
  const [alternatifGetiri, setAlternatifGetiri] = useState('')
  const [enflasyon, setEnflasyon] = useState('')

  const [aidat, setAidat] = useState('')
  const [mulkiyetGideri, setMulkiyetGideri] = useState('')
  const [satisMasrafi, setSatisMasrafi] = useState('')

  const sonuc = useMemo(
    () =>
      kiraMiSatinAlmaMiHesapla({
        konutFiyati: sayiyaCevir(fiyat),
        pesinat: sayiyaCevir(pesinat),
        alimMasraflari: sayiyaCevir(alimMasraflari),
        aylikFaizYuzdesi: sayiyaCevir(faiz),
        vadeAy: sayiyaCevir(vade),
        aylikKira: sayiyaCevir(kira),
        depozito: sayiyaCevir(depozito),
        sureYil: sayiyaCevir(sure),
        yillikDegerArtisiYuzdesi: sayiyaCevir(degerArtisi),
        yillikKiraArtisiYuzdesi: sayiyaCevir(kiraArtisi),
        yillikAlternatifGetiriYuzdesi: sayiyaCevir(alternatifGetiri),
        yillikEnflasyonYuzdesi: sayiyaCevir(enflasyon),
        aylikAidat: sayiyaCevir(aidat),
        yillikMulkiyetGideri: sayiyaCevir(mulkiyetGideri),
        satisMasrafiYuzdesi: sayiyaCevir(satisMasrafi),
      }),
    [
      fiyat,
      pesinat,
      alimMasraflari,
      faiz,
      vade,
      kira,
      depozito,
      sure,
      degerArtisi,
      kiraArtisi,
      alternatifGetiri,
      enflasyon,
      aidat,
      mulkiyetGideri,
      satisMasrafi,
    ],
  )

  return (
    <div className="grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-12">
      <form className="flex flex-col gap-6" onSubmit={(olay) => olay.preventDefault()}>
        <fieldset className="flex flex-col gap-5">
          <legend className="text-metin-3 text-mikro font-medium">Satın alma senaryosu</legend>
          <SayiAlani
            etiket="Taşınmazın fiyatı"
            deger={fiyat}
            onDegisim={setFiyat}
            birim="₺"
            yerTutucu="5.000.000"
          />
          <SayiAlani
            etiket="Peşinat"
            deger={pesinat}
            onDegisim={setPesinat}
            birim="₺"
            ipucu="Fiyatın tamamını girerseniz kredi hesaba katılmaz."
          />
          <SayiAlani
            etiket="Alım masrafları"
            deger={alimMasraflari}
            onDegisim={setAlimMasraflari}
            birim="₺"
            ipucu="Tapu harcı, komisyon, ekspertiz. Alım Maliyeti Hesaplayıcı ile bulabilirsiniz."
          />
          <SayiAlani
            etiket="Aylık kredi faizi"
            deger={faiz}
            onDegisim={setFaiz}
            birim="%"
            bicimli={false}
            ipucu="Bankanızın güncel konut kredisi oranı."
          />
          <SayiAlani
            etiket="Kredi vadesi"
            deger={vade}
            onDegisim={setVade}
            birim="ay"
            bicimli={false}
          />
        </fieldset>

        <fieldset className="border-kenar flex flex-col gap-5 border-t-[0.5px] pt-5">
          <legend className="text-metin-3 text-mikro font-medium">Kiralama senaryosu</legend>
          <SayiAlani
            etiket="Aynı evin aylık kirası"
            deger={kira}
            onDegisim={setKira}
            birim="₺"
            yerTutucu="20.000"
          />
          <SayiAlani etiket="Depozito" deger={depozito} onDegisim={setDepozito} birim="₺" />
        </fieldset>

        <fieldset className="border-kenar flex flex-col gap-5 border-t-[0.5px] pt-5">
          <legend className="text-metin-3 text-mikro font-medium">Varsayımlarınız</legend>

          <p className="text-metin-2 bg-yuzey-2/60 rounded-kart px-3.5 py-3 text-mikro leading-relaxed">
            Bu üç oran <strong>sizin beklentiniz</strong>; bizim tahminimiz değil ve bu yüzden
            önceden doldurulmadı. Emin değilseniz birkaç farklı değer deneyin — sonuç ekranındaki{' '}
            <strong>başabaş oranı</strong> zaten tahmin yapmanıza gerek bırakmaz.
          </p>

          <SayiAlani
            etiket="Karşılaştırma süresi"
            deger={sure}
            onDegisim={setSure}
            birim="yıl"
            bicimli={false}
            ipucu="Bu evde ne kadar kalmayı düşünüyorsunuz?"
          />
          <SayiAlani
            etiket="Yıllık değer artışı beklentiniz"
            deger={degerArtisi}
            onDegisim={setDegerArtisi}
            birim="%"
            bicimli={false}
          />
          <SayiAlani
            etiket="Yıllık kira artışı beklentiniz"
            deger={kiraArtisi}
            onDegisim={setKiraArtisi}
            birim="%"
            bicimli={false}
            ipucu="Konut kirası artışı mevzuatla sınırlanmış olabilir; güncel üst sınırı kontrol edin."
          />
          <SayiAlani
            etiket="Peşinatı yatırsanız yıllık getiri"
            deger={alternatifGetiri}
            onDegisim={setAlternatifGetiri}
            birim="%"
            bicimli={false}
            ipucu="Mevduat, fon, altın — peşinatı eve bağlamasaydınız ne kazanırdınız?"
          />
        </fieldset>

        <fieldset className="border-kenar flex flex-col gap-5 border-t-[0.5px] pt-5">
          <legend className="text-metin-3 text-mikro font-medium">
            İsteğe bağlı — sonucu gerçeğe yaklaştırır
          </legend>
          <SayiAlani
            etiket="Aylık aidat"
            deger={aidat}
            onDegisim={setAidat}
            birim="₺"
            ipucu="Her iki senaryoda da ödenir."
          />
          <SayiAlani
            etiket="Yıllık mülkiyet gideri"
            deger={mulkiyetGideri}
            onDegisim={setMulkiyetGideri}
            birim="₺"
            ipucu="Emlak vergisi, DASK, bakım. Yalnızca ev sahibinin gideri."
          />
          <SayiAlani
            etiket="Süre sonunda satış masrafı"
            deger={satisMasrafi}
            onDegisim={setSatisMasrafi}
            birim="%"
            bicimli={false}
            ipucu="Satmayı düşünüyorsanız komisyon ve masraf oranı."
          />
          <SayiAlani
            etiket="Yıllık enflasyon beklentiniz"
            deger={enflasyon}
            onDegisim={setEnflasyon}
            birim="%"
            bicimli={false}
            ipucu="Girerseniz sonuç bugünkü paraya da çevrilir."
          />
        </fieldset>
      </form>

      <div>
        {sonuc.durum === 'hesaplandi' ? (
          <Sonuclar
            veri={sonuc.veri}
            raporBaglantisi={raporAdresi('/rapor/kira-mi-satin-alma-mi', {
              fiyat: sayiyaCevir(fiyat),
              pesinat: sayiyaCevir(pesinat),
              masraf: sayiyaCevir(alimMasraflari),
              faiz: sayiyaCevir(faiz),
              vade: sayiyaCevir(vade),
              kira: sayiyaCevir(kira),
              depozito: sayiyaCevir(depozito),
              sure: sayiyaCevir(sure),
              degerArtisi: sayiyaCevir(degerArtisi),
              kiraArtisi: sayiyaCevir(kiraArtisi),
              getiri: sayiyaCevir(alternatifGetiri),
              enflasyon: sayiyaCevir(enflasyon),
              aidat: sayiyaCevir(aidat),
              mulkiyet: sayiyaCevir(mulkiyetGideri),
              satisMasrafi: sayiyaCevir(satisMasrafi),
            })}
          />
        ) : (
          <BosDurum
            baslik="Karşılaştırma için birkaç bilgi gerekiyor"
            neden="Bu araç aylık taksiti kirayla değil, iki senaryonun süre sonundaki net varlığını karşılaştırır. Eksik olanlar aşağıda."
            eylem={
              <ul className="text-metin-2 list-disc space-y-1 pl-5 text-left text-govde-kucuk">
                {sonuc.eksikler.map((eksik) => (
                  <li key={eksik.anahtar}>{eksik.etiket}</li>
                ))}
              </ul>
            }
          />
        )}
      </div>
    </div>
  )
}

function Sonuclar({
  veri,
  raporBaglantisi,
}: {
  veri: Extract<ReturnType<typeof kiraMiSatinAlmaMiHesapla>, { durum: 'hesaplandi' }>['veri']
  raporBaglantisi: string
}) {
  const satinAlmaOnde = veri.son.fark > 0

  return (
    <>
      <div className="border-kenar bg-yuzey rounded-kart border-[0.5px] p-5 sm:p-6">
        <p className="text-metin-3 text-mikro font-medium tracking-wide">
          {veri.son.yil} YIL SONUNDA
        </p>
        <p className="text-baslik-3 mt-1.5 font-medium sm:text-baslik-2-mobil">
          {satinAlmaOnde ? 'Satın almak' : 'Kiralamak'} önde:{' '}
          <span className={satinAlmaOnde ? 'text-basari' : 'text-hata'}>
            {paraYaz(Math.abs(veri.son.fark))}
          </span>
        </p>
        <p className="text-metin-2 mt-2 text-govde-kucuk leading-relaxed">
          Bu, iki senaryonun <strong>net varlık</strong> farkıdır — aylık ödeme farkı değil.
          Kiralama senaryosunda peşinat ve aylık tasarrufun yatırımda değerlendiği varsayılır.
        </p>
        {veri.bugunkuParaylaFark !== null ? (
          <p className="text-metin-2 border-kenar mt-3 border-t-[0.5px] pt-3 text-govde-kucuk">
            Bugünkü parayla:{' '}
            <strong className="rakam">{paraYaz(Math.abs(veri.bugunkuParaylaFark))}</strong>
          </p>
        ) : (
          <p className="text-metin-3 border-kenar mt-3 border-t-[0.5px] pt-3 text-mikro">
            Bu rakam <strong>{veri.son.yil} yıl sonrasının parasıyladır.</strong> Enflasyon
            beklentinizi girerseniz bugünkü karşılığını da gösterelim.
          </p>
        )}
      </div>

      <KartIzgarasi sinifAdi="mt-5 sm:grid-cols-3 lg:grid-cols-3">
        <HesapKarti
          etiket="Başabaş değer artışı"
          deger={yuzdeYaz(veri.basabasDegerArtisi)}
          altBilgi="Satın almanın kiralamayı geçmesi için gereken yıllık artış"
          bosAciklama="Bu varsayımlarla, makul hiçbir değer artışı satın almayı öne geçirmiyor."
          ton="vurgu"
        />
        <HesapKarti
          etiket="Başabaş yılı"
          deger={veri.basabasYili === null ? null : `${veri.basabasYili}. yıl`}
          altBilgi="Satın almanın öne geçtiği ilk yıl"
          bosAciklama={`${veri.son.yil} yıl içinde satın alma öne geçmiyor.`}
        />
        <HesapKarti
          etiket="Aylık taksit"
          deger={paraYaz(veri.aylikTaksit)}
          altBilgi="KKDF/BSMV ve sigorta hariç"
          bosAciklama="Peşin alım — kredi yok."
        />
      </KartIzgarasi>

      <div className="border-kenar bg-vurgu-zemin rounded-kart mt-5 border-[0.5px] p-5">
        <h3 className="font-sans text-govde font-medium">Bu tabloyu nasıl okumalı?</h3>
        <p className="text-metin-2 mt-2 text-govde-kucuk leading-relaxed">
          {veri.basabasDegerArtisi === null ? (
            <>
              Girdiğiniz alternatif getiri oranı o kadar yüksek ki, konut fiyatı ne kadar artarsa
              artsın kiralama senaryosu öne geçiyor. Alternatif getiri beklentinizi gözden geçirmek
              isteyebilirsiniz.
            </>
          ) : (
            <>
              Çorlu&apos;da konut fiyatları{' '}
              <strong>
                yılda %{veri.basabasDegerArtisi.toLocaleString('tr-TR')}&apos;den fazla
              </strong>{' '}
              artacaksa satın almak, daha az artacaksa kiralayıp peşinatı yatırmak sizi öne geçirir.
              Bu eşik, girdiğiniz kira ve faiz oranlarına göre hesaplandı; değer artışı tahmininize
              bağlı değildir.
            </>
          )}
        </p>
      </div>

      <dl className="border-kenar bg-yuzey rounded-kart mt-5 border-[0.5px] px-5 py-2">
        <SonucSatiri
          etiket="Başlangıçta cebinizden çıkan"
          deger={paraYaz(veri.baslangicNakitCikisi)}
          aciklama="Peşinat + alım masrafları"
        />
        <SonucSatiri etiket="Konutun süre sonundaki değeri" deger={paraYaz(veri.son.konutDegeri)} />
        {veri.son.kalanBorc > 0 ? (
          <SonucSatiri
            etiket="Kalan kredi borcu"
            deger={paraYaz(veri.son.kalanBorc)}
            ton="azalis"
          />
        ) : null}
        <SonucSatiri
          etiket="Satın alanın net varlığı"
          deger={paraYaz(veri.son.satinAlanNetVarlik)}
          vurgulu
        />
        <SonucSatiri
          etiket="Kiracının net varlığı"
          deger={paraYaz(veri.son.kiraciNetVarlik)}
          aciklama="Peşinat ve aylık tasarrufun yatırımdaki karşılığı"
          vurgulu
        />
      </dl>

      <details className="border-kenar mt-5 rounded-kart border-[0.5px]">
        <summary className="cursor-pointer list-none px-5 py-3.5 text-govde-kucuk font-medium marker:content-none">
          Yıl yıl karşılaştırma
        </summary>
        <div className="overflow-x-auto px-5 pb-4">
          <YilTablosu yillar={veri.yillar} />
        </div>
      </details>

      <div className="border-kenar mt-5 rounded-kart border-[0.5px] p-5">
        <h3 className="font-sans text-govde-kucuk font-medium">Bu hesaba dahil olmayanlar</h3>
        <ul className="text-metin-2 mt-2 list-disc space-y-1.5 pl-5 text-govde-kucuk leading-relaxed">
          {veri.uyarilar.map((uyari) => (
            <li key={uyari}>{uyari}</li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Buton href={raporBaglantisi} boyut="kucuk">
          Raporu aç (PDF olarak kaydedilebilir)
        </Buton>
        <Buton href="/araclar/alim-maliyeti" gorunum="ikincil" boyut="kucuk">
          Alım masraflarını hesapla
        </Buton>
        <Buton href="/degerleme" gorunum="ikincil" boyut="kucuk">
          Evinizin değerini öğrenin
        </Buton>
      </div>
    </>
  )
}

function YilTablosu({ yillar }: { yillar: YilSatiri[] }) {
  return (
    <table className="rakam w-full min-w-[34rem] text-right text-govde-kucuk">
      <thead>
        <tr className="text-metin-3 text-mikro border-kenar border-b-[0.5px]">
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
        {yillar.map((satir) => (
          <tr key={satir.yil} className="border-kenar/60 border-b-[0.5px] last:border-0">
            <th scope="row" className="py-2 text-left font-normal">
              {satir.yil}
            </th>
            <td className="py-2">{paraKisaYaz(satir.satinAlanNetVarlik)}</td>
            <td className="py-2">{paraKisaYaz(satir.kiraciNetVarlik)}</td>
            <td className={satir.fark >= 0 ? 'text-basari py-2' : 'text-hata py-2'}>
              {satir.fark >= 0 ? '+' : '−'}
              {paraKisaYaz(Math.abs(satir.fark))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
