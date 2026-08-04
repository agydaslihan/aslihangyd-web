'use client'

import { useMemo, useState } from 'react'

import { OnayAlani, SayiAlani, SonucSatiri, sayiyaCevir } from '@/components/hesaplayici/Alanlar'
import { ParametreEksikUyarisi } from '@/components/hesaplayici/Kabuk'
import { BosDurum } from '@/components/ui/BosDurum'
import { RakamIzgarasi, RakamKarti } from '@/components/ui/RakamKarti'
import { paraYaz, yuzdeYaz } from '@/lib/bicimlendirme'
import { alimMaliyetiHesapla } from '@/lib/hesaplayicilar/alimMaliyeti'
import type { VergiParametreKumesi } from '@/lib/vergi/parametreler'

export function AlimMaliyetiFormu({ parametreler }: { parametreler: VergiParametreKumesi }) {
  const [fiyat, setFiyat] = useState('')
  const [kredi, setKredi] = useState(false)
  const [komisyon, setKomisyon] = useState(true)

  const sonuc = useMemo(
    () =>
      alimMaliyetiHesapla(
        { fiyat: sayiyaCevir(fiyat), krediKullanilacak: kredi, komisyonDahil: komisyon },
        parametreler,
      ),
    [fiyat, kredi, komisyon, parametreler],
  )

  if (sonuc.durum === 'parametre_eksik') {
    return <ParametreEksikUyarisi eksikler={sonuc.eksikler} />
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-12">
      <form className="flex flex-col gap-5" onSubmit={(olay) => olay.preventDefault()}>
        <SayiAlani
          etiket="Taşınmazın fiyatı"
          deger={fiyat}
          onDegisim={setFiyat}
          birim="₺"
          yerTutucu="5.000.000"
        />
        <OnayAlani etiket="Konut kredisi kullanacağım" secili={kredi} onDegisim={setKredi} />
        <OnayAlani etiket="Emlak komisyonu ödeyeceğim" secili={komisyon} onDegisim={setKomisyon} />
      </form>

      <div>
        {sonuc.durum === 'hesaplandi' ? (
          <>
            <RakamIzgarasi sinifAdi="sm:grid-cols-3 lg:grid-cols-3">
              <RakamKarti etiket="İlan fiyatı" deger={paraYaz(sonuc.veri.fiyat)} />
              <RakamKarti
                etiket="Ek maliyetler"
                deger={paraYaz(sonuc.veri.ekMaliyetToplami)}
                altBilgi={`Fiyatın ${yuzdeYaz(sonuc.veri.ekMaliyetOrani)}'i`}
                ton="azalis"
              />
              <RakamKarti
                etiket="Gerçek maliyet"
                deger={paraYaz(sonuc.veri.gercekToplamMaliyet)}
                altBilgi="Cebinizden çıkacak toplam"
                ton="vurgu"
              />
            </RakamIzgarasi>

            <dl className="border-cizgi bg-yuzey rounded-yumusak mt-5 border px-5 py-2">
              <SonucSatiri etiket="Satış bedeli" deger={paraYaz(sonuc.veri.fiyat)} />
              {sonuc.veri.kalemler.map((kalem) => (
                <SonucSatiri
                  key={kalem.anahtar}
                  etiket={kalem.etiket}
                  aciklama={kalem.aciklama}
                  deger={paraYaz(kalem.tutar)}
                />
              ))}
              <SonucSatiri
                etiket="Toplam"
                deger={paraYaz(sonuc.veri.gercekToplamMaliyet)}
                vurgulu
              />
            </dl>

            <p className="text-murekkep-3 mt-4 text-mikro leading-relaxed">
              Taşınma, tadilat, abonelik açtırma ve mobilya gibi kalemler bu hesaba dahil değildir.
              Bunlar da bütçenizin gerçek parçasıdır.
            </p>
          </>
        ) : (
          <BosDurum
            baslik="Taşınmazın fiyatını girin"
            aciklama="İlan fiyatının üzerine gelen tapu harcı, döner sermaye, sigorta ve komisyon kalemlerini tek tek gösterelim."
          />
        )}
      </div>
    </div>
  )
}
