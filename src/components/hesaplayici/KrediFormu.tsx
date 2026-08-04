'use client'

import { useMemo, useState } from 'react'

import { SayiAlani, SonucSatiri, sayiyaCevir } from '@/components/hesaplayici/Alanlar'
import { BosDurum } from '@/components/ui/BosDurum'
import { RakamIzgarasi, RakamKarti } from '@/components/ui/RakamKarti'
import { paraYaz, sayiYaz } from '@/lib/bicimlendirme'
import { krediHesapla } from '@/lib/hesaplayicilar/kredi'

export function KrediFormu() {
  const [tutar, setTutar] = useState('')
  const [faiz, setFaiz] = useState('')
  const [vade, setVade] = useState('120')
  const [planAcik, setPlanAcik] = useState(false)

  const sonuc = useMemo(
    () =>
      krediHesapla({
        tutar: sayiyaCevir(tutar),
        aylikFaizYuzdesi: sayiyaCevir(faiz),
        vadeAy: sayiyaCevir(vade),
      }),
    [tutar, faiz, vade],
  )

  return (
    <div className="grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-12">
      <form className="flex flex-col gap-5" onSubmit={(olay) => olay.preventDefault()}>
        <SayiAlani
          etiket="Kredi tutarı"
          deger={tutar}
          onDegisim={setTutar}
          birim="₺"
          yerTutucu="1.000.000"
        />
        <SayiAlani
          etiket="Aylık faiz oranı"
          deger={faiz}
          onDegisim={setFaiz}
          birim="%"
          bicimli={false}
          yerTutucu="2,89"
          ipucu="Bankanızın verdiği aylık oranı yazın. Yıllık oran verildiyse 12'ye bölmeyin — bankadan aylık oranı isteyin."
        />
        <SayiAlani
          etiket="Vade"
          deger={vade}
          onDegisim={setVade}
          birim="ay"
          bicimli={false}
          ipucu="En fazla 360 ay (30 yıl)"
        />
      </form>

      <div>
        {sonuc.durum === 'hesaplandi' ? (
          <>
            <RakamIzgarasi sinifAdi="sm:grid-cols-3 lg:grid-cols-3">
              <RakamKarti
                etiket="Aylık taksit"
                deger={paraYaz(sonuc.veri.aylikTaksit)}
                ton="vurgu"
              />
              <RakamKarti etiket="Toplam geri ödeme" deger={paraYaz(sonuc.veri.toplamGeriOdeme)} />
              <RakamKarti
                etiket="Toplam faiz"
                deger={paraYaz(sonuc.veri.toplamFaiz)}
                altBilgi={`1 ₺ borç için ${sayiYaz(sonuc.veri.maliyetKatsayisi * 100)} kuruş ödeme`}
                ton="azalis"
              />
            </RakamIzgarasi>

            <div className="border-cizgi bg-uyari-acik rounded-yumusak mt-5 border p-4">
              <p className="text-sm leading-relaxed">
                <strong className="font-medium">Bu hesapta yok:</strong> dosya masrafı, hayat
                sigortası, konut sigortası ve bankaların uyguladığı diğer kesintiler. Gerçek aylık
                ödemeniz bu rakamın üzerinde olur — bankadan yazılı ödeme planı isteyin.
              </p>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => setPlanAcik((onceki) => !onceki)}
                aria-expanded={planAcik}
                className="text-lacivert min-h-11 text-sm font-medium underline underline-offset-2"
              >
                {planAcik
                  ? 'Ödeme planını gizle'
                  : `Ödeme planını göster (${sonuc.veri.odemePlani.length} taksit)`}
              </button>

              {planAcik ? (
                <div className="border-cizgi rounded-yumusak mt-3 max-h-96 overflow-auto border">
                  <table className="w-full min-w-[32rem] border-collapse text-sm">
                    <caption className="yalnizca-okuyucu">Aylık ödeme planı</caption>
                    <thead className="bg-yuzey-2 sticky top-0">
                      <tr className="border-cizgi border-b">
                        <th scope="col" className="px-3 py-2 text-left font-medium">
                          Ay
                        </th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">
                          Taksit
                        </th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">
                          Anapara
                        </th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">
                          Faiz
                        </th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">
                          Kalan
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-cizgi divide-y">
                      {sonuc.veri.odemePlani.map((satir) => (
                        <tr key={satir.ay}>
                          <td className="rakam px-3 py-1.5">{satir.ay}</td>
                          <td className="rakam px-3 py-1.5 text-right">{paraYaz(satir.taksit)}</td>
                          <td className="rakam px-3 py-1.5 text-right">{paraYaz(satir.anapara)}</td>
                          <td className="rakam text-murekkep-2 px-3 py-1.5 text-right">
                            {paraYaz(satir.faiz)}
                          </td>
                          <td className="rakam text-murekkep-2 px-3 py-1.5 text-right">
                            {paraYaz(satir.kalanAnapara)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>

            <dl className="border-cizgi bg-yuzey rounded-yumusak mt-6 border px-5 py-2">
              <SonucSatiri
                etiket="İlk taksitte faize giden"
                deger={paraYaz(sonuc.veri.odemePlani[0]?.faiz ?? 0)}
                aciklama="Eşit taksitli kredide ilk yıllar ağırlıklı olarak faiz öder"
              />
              <SonucSatiri
                etiket="Son taksitte faize giden"
                deger={paraYaz(sonuc.veri.odemePlani.at(-1)?.faiz ?? 0)}
              />
            </dl>
          </>
        ) : (
          <BosDurum
            baslik="Kredi bilgilerini girin"
            aciklama="Tutar, aylık faiz oranı ve vadeyi girdiğinizde aylık taksit, toplam geri ödeme ve tam ödeme planı hesaplanır."
          />
        )}
      </div>
    </div>
  )
}
