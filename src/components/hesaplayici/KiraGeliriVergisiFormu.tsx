'use client'

import { useMemo, useState } from 'react'

import {
  OnayAlani,
  SayiAlani,
  SecimAlani,
  SonucSatiri,
  sayiyaCevir,
} from '@/components/hesaplayici/Alanlar'
import { ParametreEksikUyarisi } from '@/components/hesaplayici/Kabuk'
import { BosDurum } from '@/components/ui/BosDurum'
import { KartIzgarasi, HesapKarti } from '@/components/ui/HesapKarti'
import { paraYaz, yuzdeYaz } from '@/lib/bicimlendirme'
import { kiraGeliriVergisiHesapla, type GiderYontemi } from '@/lib/hesaplayicilar/kiraGeliriVergisi'
import type { VergiParametreKumesi } from '@/lib/vergi/parametreler'

const GIDER_YONTEMLERI = [
  { value: 'goturu' as const, label: 'Götürü gider' },
  { value: 'gercek' as const, label: 'Gerçek gider' },
]

export function KiraGeliriVergisiFormu({ parametreler }: { parametreler: VergiParametreKumesi }) {
  const [aylikKira, setAylikKira] = useState('')
  const [yontem, setYontem] = useState<GiderYontemi>('goturu')
  const [gercekGider, setGercekGider] = useState('')
  const [istisna, setIstisna] = useState(true)

  const yillik = useMemo(() => {
    const aylik = sayiyaCevir(aylikKira)
    return aylik === null ? null : aylik * 12
  }, [aylikKira])

  const sonuc = useMemo(
    () =>
      kiraGeliriVergisiHesapla(
        {
          yillikKiraGeliri: yillik,
          giderYontemi: yontem,
          gercekGider: sayiyaCevir(gercekGider),
          istisnadanYararlanir: istisna,
        },
        parametreler,
      ),
    [yillik, yontem, gercekGider, istisna, parametreler],
  )

  if (sonuc.durum === 'parametre_eksik') {
    return <ParametreEksikUyarisi eksikler={sonuc.eksikler} />
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-12">
      <form className="flex flex-col gap-5" onSubmit={(olay) => olay.preventDefault()}>
        <SayiAlani
          etiket="Aylık kira geliri"
          deger={aylikKira}
          onDegisim={setAylikKira}
          birim="₺"
          yerTutucu="20.000"
          ipucu={yillik ? `Yıllık: ${paraYaz(yillik)}` : 'Yıllık tutarı otomatik hesaplarız'}
        />

        <SecimAlani
          etiket="Gider yöntemi"
          deger={yontem}
          onDegisim={setYontem}
          secenekler={GIDER_YONTEMLERI}
          ipucu="Götürü yöntemde belge gerekmez; gerçek yöntemde giderleri belgelemeniz gerekir."
        />

        {yontem === 'gercek' ? (
          <SayiAlani
            etiket="Belgelendirilen yıllık gider"
            deger={gercekGider}
            onDegisim={setGercekGider}
            birim="₺"
            ipucu="Emlak vergisi, sigorta, amortisman, faiz, bakım-onarım"
          />
        ) : null}

        <OnayAlani
          etiket="Konut kira geliri istisnasından yararlanabiliyorum"
          secili={istisna}
          onDegisim={setIstisna}
        />
      </form>

      <div>
        {sonuc.durum === 'hesaplandi' ? (
          <>
            <KartIzgarasi sinifAdi="sm:grid-cols-3 lg:grid-cols-3">
              <HesapKarti
                etiket="Ödenecek vergi"
                deger={paraYaz(sonuc.veri.toplamVergi)}
                altBilgi="Yıllık"
                ton="azalis"
              />
              <HesapKarti
                etiket="Etkin vergi oranı"
                deger={yuzdeYaz(sonuc.veri.etkinOran)}
                altBilgi="Matraha oranla"
              />
              <HesapKarti
                etiket="Elinizde kalan"
                deger={paraYaz(sonuc.veri.netKalan)}
                altBilgi="Vergi sonrası yıllık"
                ton="vurgu"
              />
            </KartIzgarasi>

            <dl className="border-kenar bg-yuzey rounded-kart mt-5 border-[0.5px] px-5 py-2">
              <SonucSatiri
                etiket="Yıllık kira geliri"
                deger={paraYaz(sonuc.veri.yillikKiraGeliri)}
              />
              <SonucSatiri
                etiket="İstisna"
                deger={paraYaz(-sonuc.veri.uygulananIstisna)}
                aciklama="Konut kira gelirinde vergiden muaf kısım"
                ton="artis"
              />
              <SonucSatiri
                etiket={
                  sonuc.veri.giderYontemi === 'goturu' ? 'Götürü gider' : 'Belgelendirilen gider'
                }
                deger={paraYaz(-sonuc.veri.dusulenGider)}
                ton="artis"
              />
              <SonucSatiri etiket="Vergi matrahı" deger={paraYaz(sonuc.veri.matrah)} vurgulu />
            </dl>

            {sonuc.veri.dilimler.length > 0 ? (
              <div className="mt-6">
                <h3 className="font-sans text-govde-kucuk font-medium">Dilim dilim vergi</h3>
                <p className="text-metin-2 mt-1 text-mikro leading-relaxed">
                  Gelir vergisi artan oranlıdır: matrahın tamamına en yüksek oran uygulanmaz, her
                  dilim kendi oranıyla vergilendirilir.
                </p>
                <dl className="border-kenar bg-yuzey rounded-kart mt-3 border-[0.5px] px-5 py-2">
                  {sonuc.veri.dilimler.map((dilim) => (
                    <SonucSatiri
                      key={`${dilim.altSinir}-${dilim.oran}`}
                      etiket={`${paraYaz(dilim.matrahKismi)} × %${(dilim.oran * 100).toLocaleString('tr-TR')}`}
                      aciklama={
                        dilim.ustSinir === null
                          ? `${paraYaz(dilim.altSinir)} ve üzeri`
                          : `${paraYaz(dilim.altSinir)} – ${paraYaz(dilim.ustSinir)}`
                      }
                      deger={paraYaz(dilim.vergi)}
                    />
                  ))}
                  <SonucSatiri
                    etiket="Toplam vergi"
                    deger={paraYaz(sonuc.veri.toplamVergi)}
                    vurgulu
                  />
                </dl>
              </div>
            ) : null}

            <p className="text-metin-3 mt-4 text-mikro leading-relaxed">
              Başka gelir unsurlarınız (maaş, ticari kazanç) varsa gerçek verginiz bu rakamın
              üzerinde çıkar; tarife toplam gelirinize uygulanır.
            </p>
          </>
        ) : (
          <BosDurum
            baslik="Aylık kira gelirinizi girin"
            neden="İstisna, gider ve vergi dilimlerini adım adım göstererek yıllık vergi yükünüzü hesaplayalım."
          />
        )}
      </div>
    </div>
  )
}
