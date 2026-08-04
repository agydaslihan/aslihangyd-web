'use client'

import { useMemo, useState } from 'react'

import { SayiAlani, SecimAlani, SonucSatiri, sayiyaCevir } from '@/components/hesaplayici/Alanlar'
import { BosDurum } from '@/components/ui/BosDurum'
import { Buton } from '@/components/ui/Buton'
import { RakamIzgarasi, RakamKarti } from '@/components/ui/RakamKarti'
import { carpanYaz, paraKisaYaz, paraYaz, yuzdeYaz } from '@/lib/bicimlendirme'
import type { GiderYontemi } from '@/lib/hesaplayicilar/kiraGeliriVergisi'
import { yatirimSimulasyonuYap, type SimulasyonYili } from '@/lib/hesaplayicilar/yatirimSimulatoru'
import { raporAdresi } from '@/lib/rapor/parametreler'
import type { VergiParametreKumesi } from '@/lib/vergi/parametreler'

const GIDER_YONTEMLERI = [
  { value: 'goturu', label: 'Götürü gider' },
  { value: 'gercek', label: 'Gerçek gider' },
] as const satisfies readonly { value: GiderYontemi; label: string }[]

/**
 * Yatırım simülatörü formu.
 *
 * ⚠️ Büyüme varsayımlarına bilerek yer tutucu konulmadı — bkz.
 * `KiraMiSatinAlmaMiFormu` içindeki aynı gerekçe.
 */
export function YatirimSimulatoruFormu({ parametreler }: { parametreler: VergiParametreKumesi }) {
  const [fiyat, setFiyat] = useState('')
  const [alimMasraflari, setAlimMasraflari] = useState('')
  const [pesinat, setPesinat] = useState('')
  const [faiz, setFaiz] = useState('')
  const [vade, setVade] = useState('120')

  const [kira, setKira] = useState('')
  const [bosluk, setBosluk] = useState('')
  const [isletmeGideri, setIsletmeGideri] = useState('')

  const [sure, setSure] = useState('10')
  const [kiraArtisi, setKiraArtisi] = useState('')
  const [degerArtisi, setDegerArtisi] = useState('')
  const [giderArtisi, setGiderArtisi] = useState('')
  const [enflasyon, setEnflasyon] = useState('')
  const [satisMasrafi, setSatisMasrafi] = useState('')
  const [giderYontemi, setGiderYontemi] = useState<GiderYontemi>('goturu')

  const sonuc = useMemo(
    () =>
      yatirimSimulasyonuYap(
        {
          konutFiyati: sayiyaCevir(fiyat),
          alimMasraflari: sayiyaCevir(alimMasraflari),
          pesinat: sayiyaCevir(pesinat),
          aylikFaizYuzdesi: sayiyaCevir(faiz),
          vadeAy: sayiyaCevir(vade),
          aylikKira: sayiyaCevir(kira),
          yillikBoslukAyi: sayiyaCevir(bosluk),
          yillikIsletmeGideri: sayiyaCevir(isletmeGideri),
          sureYil: sayiyaCevir(sure),
          yillikKiraArtisiYuzdesi: sayiyaCevir(kiraArtisi),
          yillikDegerArtisiYuzdesi: sayiyaCevir(degerArtisi),
          yillikGiderArtisiYuzdesi: sayiyaCevir(giderArtisi),
          yillikEnflasyonYuzdesi: sayiyaCevir(enflasyon),
          satisMasrafiYuzdesi: sayiyaCevir(satisMasrafi),
          giderYontemi,
        },
        parametreler,
      ),
    [
      fiyat,
      alimMasraflari,
      pesinat,
      faiz,
      vade,
      kira,
      bosluk,
      isletmeGideri,
      sure,
      kiraArtisi,
      degerArtisi,
      giderArtisi,
      enflasyon,
      satisMasrafi,
      giderYontemi,
      parametreler,
    ],
  )

  return (
    <div className="grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-12">
      <form className="flex flex-col gap-6" onSubmit={(olay) => olay.preventDefault()}>
        <fieldset className="flex flex-col gap-5">
          <legend className="text-murekkep-3 text-mikro font-medium">Yatırım</legend>
          <SayiAlani
            etiket="Taşınmazın alış fiyatı"
            deger={fiyat}
            onDegisim={setFiyat}
            birim="₺"
            yerTutucu="4.000.000"
          />
          <SayiAlani
            etiket="Alım masrafları"
            deger={alimMasraflari}
            onDegisim={setAlimMasraflari}
            birim="₺"
            ipucu="Tapu harcı, komisyon, ekspertiz. Alım Maliyeti Hesaplayıcı ile bulabilirsiniz."
          />
          <SayiAlani
            etiket="Peşinat"
            deger={pesinat}
            onDegisim={setPesinat}
            birim="₺"
            ipucu="Fiyatın tamamını girerseniz kredisiz senaryo hesaplanır."
          />
          <SayiAlani
            etiket="Aylık kredi faizi"
            deger={faiz}
            onDegisim={setFaiz}
            birim="%"
            bicimli={false}
          />
          <SayiAlani
            etiket="Kredi vadesi"
            deger={vade}
            onDegisim={setVade}
            birim="ay"
            bicimli={false}
          />
        </fieldset>

        <fieldset className="border-cizgi flex flex-col gap-5 border-t pt-5">
          <legend className="text-murekkep-3 text-mikro font-medium">İşletme</legend>
          <SayiAlani
            etiket="Başlangıç aylık kira"
            deger={kira}
            onDegisim={setKira}
            birim="₺"
            yerTutucu="18.000"
          />
          <SayiAlani
            etiket="Yılda boş kalma beklentisi"
            deger={bosluk}
            onDegisim={setBosluk}
            birim="ay"
            bicimli={false}
            ipucu="Kiracı değişimlerinde boş geçen süre."
          />
          <SayiAlani
            etiket="Yıllık işletme gideri"
            deger={isletmeGideri}
            onDegisim={setIsletmeGideri}
            birim="₺"
            ipucu="Aidat, emlak vergisi, DASK, bakım."
          />
          <SecimAlani
            etiket="Vergide gider yöntemi"
            deger={giderYontemi}
            onDegisim={setGiderYontemi}
            secenekler={GIDER_YONTEMLERI}
            ipucu="Gerçek gider seçilirse yukarıdaki işletme gideri matrahtan düşülür."
          />
        </fieldset>

        <fieldset className="border-cizgi flex flex-col gap-5 border-t pt-5">
          <legend className="text-murekkep-3 text-mikro font-medium">Varsayımlarınız</legend>

          <p className="text-murekkep-2 bg-yuzey-2/60 rounded-yumusak px-3.5 py-3 text-mikro leading-relaxed">
            Bu oranlar <strong>sizin beklentiniz</strong>; bizim tahminimiz değil ve bu yüzden
            önceden doldurulmadı. Birkaç farklı senaryo deneyin — bu aracın amacı tek bir rakam
            vermek değil, varsayımların sonucu nasıl değiştirdiğini göstermek.
          </p>

          <SayiAlani
            etiket="Projeksiyon süresi"
            deger={sure}
            onDegisim={setSure}
            birim="yıl"
            bicimli={false}
          />
          <SayiAlani
            etiket="Yıllık kira artışı"
            deger={kiraArtisi}
            onDegisim={setKiraArtisi}
            birim="%"
            bicimli={false}
            ipucu="Konut kirası artışı mevzuatla sınırlanmış olabilir; güncel üst sınırı kontrol edin."
          />
          <SayiAlani
            etiket="Yıllık değer artışı"
            deger={degerArtisi}
            onDegisim={setDegerArtisi}
            birim="%"
            bicimli={false}
          />
          <SayiAlani
            etiket="Yıllık gider artışı"
            deger={giderArtisi}
            onDegisim={setGiderArtisi}
            birim="%"
            bicimli={false}
            ipucu="Boş bırakırsanız giderler sabit varsayılır ve getiri iyimser çıkar."
          />
          <SayiAlani
            etiket="Yıllık enflasyon beklentiniz"
            deger={enflasyon}
            onDegisim={setEnflasyon}
            birim="%"
            bicimli={false}
            ipucu="Reel getiriyi görmek için gerekli. Vergi dilimi kaymasını da düzeltir."
          />
          <SayiAlani
            etiket="Süre sonunda satış masrafı"
            deger={satisMasrafi}
            onDegisim={setSatisMasrafi}
            birim="%"
            bicimli={false}
          />
        </fieldset>
      </form>

      <div>
        {sonuc.durum === 'hesaplandi' ? (
          <Sonuclar
            veri={sonuc.veri}
            raporBaglantisi={raporAdresi('/rapor/yatirim-simulatoru', {
              fiyat: sayiyaCevir(fiyat),
              masraf: sayiyaCevir(alimMasraflari),
              pesinat: sayiyaCevir(pesinat),
              faiz: sayiyaCevir(faiz),
              vade: sayiyaCevir(vade),
              kira: sayiyaCevir(kira),
              bosluk: sayiyaCevir(bosluk),
              gider: sayiyaCevir(isletmeGideri),
              sure: sayiyaCevir(sure),
              kiraArtisi: sayiyaCevir(kiraArtisi),
              degerArtisi: sayiyaCevir(degerArtisi),
              giderArtisi: sayiyaCevir(giderArtisi),
              enflasyon: sayiyaCevir(enflasyon),
              satisMasrafi: sayiyaCevir(satisMasrafi),
              giderYontemi,
            })}
          />
        ) : (
          <BosDurum
            baslik="Simülasyon için birkaç bilgi gerekiyor"
            aciklama="Bu araç tek yılın getirisini değil, yatırımın yıl yıl nasıl geliştiğini gösterir. Eksik olanlar aşağıda."
            eylem={
              <ul className="text-murekkep-2 list-disc space-y-1 pl-5 text-left text-sm">
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
  veri: Extract<ReturnType<typeof yatirimSimulasyonuYap>, { durum: 'hesaplandi' }>['veri']
  raporBaglantisi: string
}) {
  return (
    <>
      {veri.vergiHesaplandi ? null : (
        <div className="border-cizgi bg-uyari-acik rounded-yumusak mb-5 border p-4">
          <p className="text-sm leading-relaxed">
            <strong>Bu projeksiyon vergi öncesidir.</strong> Kira geliri vergisinin hesaplanması
            için gereken güncel istisna tutarı ve vergi dilimleri sisteme henüz girilmedi. Uydurma
            bir vergi rakamı üretmek yerine kalemi hiç göstermiyoruz — gerçek getiriniz
            aşağıdakinden düşük olacaktır.
          </p>
        </div>
      )}

      <RakamIzgarasi sinifAdi="sm:grid-cols-2 lg:grid-cols-4">
        <RakamKarti
          etiket="Yıllık getiri (İVO)"
          deger={yuzdeYaz(veri.ircOrani)}
          altBilgi="Nominal, iç verim oranı"
          bosAciklama="Bu varsayımlarla getiri oranı hesaplanamıyor."
          ton="vurgu"
        />
        <RakamKarti
          etiket="Reel yıllık getiri"
          deger={yuzdeYaz(veri.reelIrcOrani)}
          altBilgi="Enflasyondan arındırılmış"
          bosAciklama="Enflasyon beklentinizi girin."
          ton={veri.reelIrcOrani !== null && veri.reelIrcOrani < 0 ? 'azalis' : 'artis'}
        />
        <RakamKarti
          etiket="Nakit başabaş"
          deger={veri.nakitBasabasYili === null ? null : `${veri.nakitBasabasYili}. yıl`}
          altBilgi="Kiranın giderleri karşıladığı ilk yıl"
          bosAciklama={`${veri.son.yil} yıl boyunca cebinizden para çıkmaya devam ediyor.`}
        />
        <RakamKarti
          etiket="Getiri katı"
          deger={carpanYaz(veri.getiriKati)}
          altBilgi={`${paraKisaYaz(veri.baslangicYatirimi)} yatırım → ${paraKisaYaz(veri.sonNetVarlik)}`}
        />
      </RakamIzgarasi>

      <div className="border-cizgi bg-pirinc-acik rounded-yumusak mt-5 border p-5">
        <h3 className="font-sans text-base font-semibold">
          Neden İVO, neden &quot;brüt getiri&quot; değil?
        </h3>
        <p className="text-murekkep-2 mt-2 text-sm leading-relaxed">
          Brüt getiri tek yılın fotoğrafıdır ve kaldıraçlı bir yatırımı ölçemez. İç verim oranı
          (İVO), paranın <strong>ne zaman</strong> girip çıktığını hesaba katar: peşinatı bugün
          verirsiniz, kirayı yıllara yayarak alırsınız, satış gelirini en sonda. Bu üçünü tek bir
          orana indirger.
          {veri.reelIrcOrani !== null ? (
            <>
              {' '}
              Asıl bakılması gereken <strong>reel getiridir</strong> — enflasyonun altında kalan bir
              nominal getiri, rakamlar büyürken alım gücünüzün küçülmesi demektir.
            </>
          ) : null}
        </p>
      </div>

      <dl className="border-cizgi bg-yuzey rounded-yumusak mt-5 border px-5 py-2">
        <SonucSatiri
          etiket="Başlangıç yatırımı"
          deger={paraYaz(veri.baslangicYatirimi)}
          aciklama="Peşinat + alım masrafları"
        />
        <SonucSatiri
          etiket="Aylık kredi taksiti"
          deger={paraYaz(veri.aylikTaksit) ?? 'Kredi yok'}
          aciklama="KKDF/BSMV ve sigorta hariç"
        />
        <SonucSatiri
          etiket={`${veri.son.yil}. yıl konut değeri`}
          deger={paraYaz(veri.son.konutDegeri)}
        />
        <SonucSatiri
          etiket="Biriken net nakit akışı"
          deger={paraYaz(veri.son.kumulatifNakitAkisi)}
          ton={veri.son.kumulatifNakitAkisi >= 0 ? 'artis' : 'azalis'}
        />
        <SonucSatiri
          etiket="Satılırsa eline geçen"
          deger={paraYaz(veri.netSatisGeliri)}
          aciklama="Satış masrafı ve kalan borç düşülmüş"
        />
        <SonucSatiri etiket="Toplam net varlık" deger={paraYaz(veri.sonNetVarlik)} vurgulu />
        {veri.bugunkuParaylaNetVarlik !== null ? (
          <SonucSatiri
            etiket="Bugünkü parayla"
            deger={paraYaz(veri.bugunkuParaylaNetVarlik)}
            aciklama="Enflasyondan arındırılmış"
          />
        ) : null}
      </dl>

      <details className="border-cizgi rounded-yumusak mt-5 border" open>
        <summary className="cursor-pointer list-none px-5 py-3.5 text-sm font-medium marker:content-none">
          Yıl yıl nakit akışı
        </summary>
        <div className="overflow-x-auto px-5 pb-4">
          <NakitAkisiTablosu yillar={veri.yillar} vergiHesaplandi={veri.vergiHesaplandi} />
        </div>
      </details>

      <div className="border-cizgi rounded-yumusak mt-5 border p-5">
        <h3 className="font-sans text-sm font-semibold">Bu hesaba dahil olmayanlar</h3>
        <ul className="text-murekkep-2 mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
          {veri.uyarilar.map((uyari) => (
            <li key={uyari}>{uyari}</li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Buton href={raporBaglantisi} boyut="kucuk">
          Raporu aç (PDF olarak kaydedilebilir)
        </Buton>
        <Buton href="/araclar/kira-mi-satin-alma-mi" gorunum="ikincil" boyut="kucuk">
          Kiralamakla karşılaştır
        </Buton>
        <Buton href="/araclar/kira-geliri-vergisi" gorunum="ikincil" boyut="kucuk">
          Kira geliri vergisini ayrıntılı hesapla
        </Buton>
      </div>
    </>
  )
}

function NakitAkisiTablosu({
  yillar,
  vergiHesaplandi,
}: {
  yillar: SimulasyonYili[]
  vergiHesaplandi: boolean
}) {
  return (
    <table className="rakam w-full min-w-[42rem] text-right text-sm">
      <thead>
        <tr className="text-murekkep-3 text-mikro border-cizgi border-b">
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
          {vergiHesaplandi ? (
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
        {yillar.map((satir) => (
          <tr key={satir.yil} className="border-cizgi/60 border-b last:border-0">
            <th scope="row" className="py-2 text-left font-normal">
              {satir.yil}
            </th>
            <td className="py-2">{paraKisaYaz(satir.kiraGeliri)}</td>
            <td className="py-2">{paraKisaYaz(satir.isletmeGideri)}</td>
            <td className="py-2">{paraKisaYaz(satir.krediOdemesi)}</td>
            {vergiHesaplandi ? <td className="py-2">{paraKisaYaz(satir.vergi)}</td> : null}
            <td className={satir.netNakitAkisi >= 0 ? 'text-artis py-2' : 'text-azalis py-2'}>
              {satir.netNakitAkisi >= 0 ? '+' : '−'}
              {paraKisaYaz(Math.abs(satir.netNakitAkisi))}
            </td>
            <td className="py-2">{paraKisaYaz(satir.ozSermaye)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
