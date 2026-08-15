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
import { alimMaliyetiHesapla } from '@/lib/hesaplayicilar/alimMaliyeti'
import type { VergiParametreKumesi } from '@/lib/vergi/parametreler'

/** Rayiç bedeli bilinen bir mahalle — sunucudan prop olarak iner. */
export interface RayicSecenegi {
  mahalleId: number
  ad: string
  yil: number
  metrekareRayicBedel: number
  kaynakEtiketi: string
}

export function AlimMaliyetiFormu({
  parametreler,
  /**
   * ⚠️ Boş gelebilir ve gelmesi BEKLENEN bir durum: rayiç bedeller
   * belediye tablolarından elle aktarılıyor. Liste boşsa alan hiç
   * basılmaz ve hesap eskisi gibi satış bedeli üzerinden çalışır.
   */
  rayicSecenekleri = [],
}: {
  parametreler: VergiParametreKumesi
  rayicSecenekleri?: readonly RayicSecenegi[]
}) {
  const [fiyat, setFiyat] = useState('')
  const [kredi, setKredi] = useState(false)
  const [komisyon, setKomisyon] = useState(true)
  const [mahalleId, setMahalleId] = useState('')
  const [m2, setM2] = useState('')

  const secilenRayic = rayicSecenekleri.find((secenek) => String(secenek.mahalleId) === mahalleId)

  /**
   * Taşınmazın toplam rayiç bedeli.
   *
   * ⚠️ İkisi de girilmeden hesaplanmaz. Eksik m² ile "mahalle rayici ×
   * varsayılan bir metrekare" gibi bir tahmin üretmek, uydurma rakam
   * olurdu (CLAUDE.md kural 2).
   */
  const rayicBedel = useMemo(() => {
    const metrekare = sayiyaCevir(m2)
    if (!secilenRayic || metrekare === null || metrekare <= 0) return null
    return secilenRayic.metrekareRayicBedel * metrekare
  }, [secilenRayic, m2])

  const sonuc = useMemo(
    () =>
      alimMaliyetiHesapla(
        {
          fiyat: sayiyaCevir(fiyat),
          krediKullanilacak: kredi,
          komisyonDahil: komisyon,
          rayicBedel,
        },
        parametreler,
      ),
    [fiyat, kredi, komisyon, rayicBedel, parametreler],
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

        {rayicSecenekleri.length > 0 ? (
          <>
            <SecimAlani
              etiket="Mahalle (isteğe bağlı)"
              deger={mahalleId}
              onDegisim={setMahalleId}
              secenekler={[
                { value: '', label: '— seçilmedi —' },
                ...rayicSecenekleri.map((secenek) => ({
                  value: String(secenek.mahalleId),
                  label: `${secenek.ad} · ${secenek.yil}`,
                })),
              ]}
              ipucu="Seçerseniz tapu harcı, rayiç bedel tabanı dikkate alınarak hesaplanır."
            />
            <SayiAlani
              etiket="Brüt m² (isteğe bağlı)"
              deger={m2}
              onDegisim={setM2}
              birim="m²"
              yerTutucu="110"
              ipucu="Mahalle ile birlikte girilirse taşınmazın rayiç bedeli hesaplanır."
            />
            {secilenRayic ? (
              <p className="text-metin-3 text-mikro leading-relaxed">
                {secilenRayic.ad} için {secilenRayic.yil} yılı rayiç bedeli:{' '}
                <strong className="font-medium">
                  {paraYaz(secilenRayic.metrekareRayicBedel)}/m²
                </strong>{' '}
                · Kaynak: {secilenRayic.kaynakEtiketi}. ⚠️ Rayiç bedel piyasa fiyatı değildir; emlak
                vergisine esas asgari değerdir.
              </p>
            ) : null}
          </>
        ) : null}
      </form>

      <div>
        {sonuc.durum === 'hesaplandi' ? (
          <>
            <KartIzgarasi sinifAdi="sm:grid-cols-3 lg:grid-cols-3">
              <HesapKarti etiket="İlan fiyatı" deger={paraYaz(sonuc.veri.fiyat)} />
              <HesapKarti
                etiket="Ek maliyetler"
                deger={paraYaz(sonuc.veri.ekMaliyetToplami)}
                altBilgi={`Fiyatın ${yuzdeYaz(sonuc.veri.ekMaliyetOrani)}'i`}
                ton="azalis"
              />
              <HesapKarti
                etiket="Gerçek maliyet"
                deger={paraYaz(sonuc.veri.gercekToplamMaliyet)}
                altBilgi="Cebinizden çıkacak toplam"
                ton="vurgu"
              />
            </KartIzgarasi>

            <dl className="border-kenar bg-yuzey rounded-kart mt-5 border-[0.5px] px-5 py-2">
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

            {/*
              ⚠️ Harcı rayiç bedelin belirlediği durum AÇIKÇA söylenir.
              Kullanıcı satış bedelini yazdığı hâlde harcın daha yüksek
              çıktığını görüp "hesap yanlış" demesin: sebebi rayiç bedelin
              satış bedelinin üzerinde olması ve bu yasal bir taban.
            */}
            {sonuc.veri.harciRayicBelirledi ? (
              <p className="text-metin-2 mt-4 text-mikro leading-relaxed">
                <strong className="text-metin font-medium">
                  Tapu harcı, satış bedeli üzerinden değil rayiç bedel üzerinden hesaplandı.
                </strong>{' '}
                Girdiğiniz satış bedeli, taşınmazın rayiç bedelinin (
                {paraYaz(sonuc.veri.harcMatrahi)}) altında. Harç rayiç bedelin altına düşemez; düşük
                beyanda aradaki fark cezasıyla istenir.
              </p>
            ) : null}

            <p className="text-metin-3 mt-4 text-mikro leading-relaxed">
              Taşınma, tadilat, abonelik açtırma ve mobilya gibi kalemler bu hesaba dahil değildir.
              Bunlar da bütçenizin gerçek parçasıdır.
            </p>
          </>
        ) : (
          <BosDurum
            baslik="Taşınmazın fiyatını girin"
            neden="İlan fiyatının üzerine gelen tapu harcı, döner sermaye, sigorta ve komisyon kalemlerini tek tek gösterelim."
          />
        )}
      </div>
    </div>
  )
}
