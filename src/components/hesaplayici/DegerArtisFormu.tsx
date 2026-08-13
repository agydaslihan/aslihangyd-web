'use client'

import { useId, useMemo, useState } from 'react'

import { SayiAlani, SonucSatiri, sayiyaCevir } from '@/components/hesaplayici/Alanlar'
import { ParametreEksikUyarisi } from '@/components/hesaplayici/Kabuk'
import { BosDurum } from '@/components/ui/BosDurum'
import { KartIzgarasi, HesapKarti } from '@/components/ui/HesapKarti'
import { DogrulanmisIkon } from '@/components/ui/Ikon'
import { paraYaz, sayiYaz, yuzdeYaz } from '@/lib/bicimlendirme'
import { degerArtisVergisiHesapla } from '@/lib/hesaplayicilar/degerArtisVergisi'
import type { VergiParametreKumesi } from '@/lib/vergi/parametreler'

export function DegerArtisFormu({ parametreler }: { parametreler: VergiParametreKumesi }) {
  const [alisFiyati, setAlisFiyati] = useState('')
  const [alisTarihi, setAlisTarihi] = useState('')
  const [satisFiyati, setSatisFiyati] = useState('')
  const [satisTarihi, setSatisTarihi] = useState('')
  const [alisUfe, setAlisUfe] = useState('')
  const [satisUfe, setSatisUfe] = useState('')
  const [giderler, setGiderler] = useState('')

  const alisId = useId()
  const satisId = useId()

  const sonuc = useMemo(
    () =>
      degerArtisVergisiHesapla(
        {
          alisFiyati: sayiyaCevir(alisFiyati),
          satisFiyati: sayiyaCevir(satisFiyati),
          alisTarihi: alisTarihi || null,
          satisTarihi: satisTarihi || null,
          alisUfe: sayiyaCevir(alisUfe),
          satisUfe: sayiyaCevir(satisUfe),
          giderler: sayiyaCevir(giderler),
        },
        parametreler,
      ),
    [alisFiyati, satisFiyati, alisTarihi, satisTarihi, alisUfe, satisUfe, giderler, parametreler],
  )

  if (sonuc.durum === 'parametre_eksik') {
    return <ParametreEksikUyarisi eksikler={sonuc.eksikler} />
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-12">
      <form className="flex flex-col gap-5" onSubmit={(olay) => olay.preventDefault()}>
        <SayiAlani
          etiket="Alış fiyatı"
          deger={alisFiyati}
          onDegisim={setAlisFiyati}
          birim="₺"
          ipucu="Tapuda gösterilen bedel"
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor={alisId} className="text-govde-kucuk font-medium">
            Alış tarihi
          </label>
          <input
            id={alisId}
            type="date"
            value={alisTarihi}
            onChange={(olay) => setAlisTarihi(olay.target.value)}
            className="border-kenar-giris bg-yuzey rounded-buton focus:border-vurgu min-h-11 w-full border-[0.5px] px-3.5 text-govde"
          />
        </div>

        <SayiAlani etiket="Satış fiyatı" deger={satisFiyati} onDegisim={setSatisFiyati} birim="₺" />

        <div className="flex flex-col gap-1.5">
          <label htmlFor={satisId} className="text-govde-kucuk font-medium">
            Satış tarihi
          </label>
          <input
            id={satisId}
            type="date"
            value={satisTarihi}
            onChange={(olay) => setSatisTarihi(olay.target.value)}
            className="border-kenar-giris bg-yuzey rounded-buton focus:border-vurgu min-h-11 w-full border-[0.5px] px-3.5 text-govde"
          />
        </div>

        <SayiAlani
          etiket="Satış giderleri"
          deger={giderler}
          onDegisim={setGiderler}
          birim="₺"
          ipucu="Tapu harcı, komisyon gibi belgelendirilmiş giderler"
        />

        <fieldset className="border-kenar flex flex-col gap-5 border-t-[0.5px] pt-5">
          <legend className="text-metin-3 text-mikro font-medium">
            Enflasyon endekslemesi (Yİ-ÜFE)
          </legend>

          <p className="text-metin-3 text-mikro leading-relaxed">
            Bu iki değeri girerseniz alış bedeliniz enflasyona göre güncellenir ve vergi matrahınız
            ciddi biçimde düşer. Değerleri TÜİK&apos;in yayınladığı Yİ-ÜFE tablosundan alabilirsiniz
            — biz burada tutmuyoruz, çünkü her ay değişen bir seriyi eskimiş halde göstermek yanlış
            vergi hesabı üretir.
          </p>

          <SayiAlani
            etiket="Alış ayının Yİ-ÜFE değeri"
            deger={alisUfe}
            onDegisim={setAlisUfe}
            bicimli={false}
          />
          <SayiAlani
            etiket="Satıştan önceki ayın Yİ-ÜFE değeri"
            deger={satisUfe}
            onDegisim={setSatisUfe}
            bicimli={false}
          />
        </fieldset>
      </form>

      <div>
        {sonuc.durum === 'hesaplandi' ? (
          sonuc.veri.muafMi ? (
            <div className="border-basari/30 bg-basari-zemin rounded-kart border-[0.5px] p-6">
              <div className="flex items-start gap-3">
                <DogrulanmisIkon width={24} height={24} className="text-basari mt-0.5 shrink-0" />
                <div>
                  <h2 className="text-baslik-3 leading-snug">Vergi ödemeniz gerekmiyor</h2>
                  <p className="text-metin-2 mt-2 text-govde-kucuk leading-relaxed">
                    Taşınmazı{' '}
                    <strong className="font-medium">{sayiYaz(sonuc.veri.eldeTutmaYili)} yıl</strong>{' '}
                    elinizde tuttuğunuz için değer artış kazancı vergisi doğmuyor. Muafiyet süresi{' '}
                    {sonuc.veri.muafiyetYili} yıl.
                  </p>
                  <p className="text-metin-2 mt-3 text-govde-kucuk">
                    Kazancınız:{' '}
                    <strong className="rakam font-medium">{paraYaz(sonuc.veri.netKazanc)}</strong>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {sonuc.veri.muafiyeteKalanGun !== null && sonuc.veri.muafiyeteKalanGun <= 365 ? (
                <div className="border-vurgu/40 bg-vurgu-zemin rounded-kart mb-5 border-[0.5px] p-4">
                  <p className="text-govde-kucuk leading-relaxed">
                    <strong className="font-medium">Dikkat:</strong> Satışı{' '}
                    <strong className="rakam">{sonuc.veri.muafiyeteKalanGun} gün</strong>{' '}
                    ertelerseniz {sonuc.veri.muafiyetYili} yıllık muafiyet süresi dolar ve bu
                    verginin tamamından kurtulursunuz.
                  </p>
                </div>
              ) : null}

              <KartIzgarasi sinifAdi="sm:grid-cols-3 lg:grid-cols-3">
                <HesapKarti
                  etiket="Ödenecek vergi"
                  deger={paraYaz(sonuc.veri.toplamVergi)}
                  ton="azalis"
                />
                <HesapKarti
                  etiket="Etkin vergi oranı"
                  deger={yuzdeYaz(sonuc.veri.etkinOran)}
                  altBilgi="Matraha oranla"
                />
                <HesapKarti
                  etiket="Net kazancınız"
                  deger={paraYaz(sonuc.veri.netKazanc)}
                  altBilgi="Vergi ve giderler sonrası"
                  ton="vurgu"
                />
              </KartIzgarasi>

              <dl className="border-kenar bg-yuzey rounded-kart mt-5 border-[0.5px] px-5 py-2">
                <SonucSatiri etiket="Satış fiyatı" deger={paraYaz(sonuc.veri.satisFiyati)} />
                <SonucSatiri
                  etiket={
                    sonuc.veri.endekslemeYapildi
                      ? 'Endekslenmiş alış bedeli'
                      : 'Alış bedeli (endekslenmemiş)'
                  }
                  deger={paraYaz(-sonuc.veri.endekslenmisAlisFiyati)}
                  aciklama={
                    sonuc.veri.endekslemeYapildi
                      ? `Yİ-ÜFE ile ${paraYaz(sonuc.veri.alisFiyati)} bedelden güncellendi`
                      : 'Yİ-ÜFE girerseniz bu bedel yükselir ve verginiz düşer'
                  }
                  ton="artis"
                />
                {sonuc.veri.giderler > 0 ? (
                  <SonucSatiri
                    etiket="Satış giderleri"
                    deger={paraYaz(-sonuc.veri.giderler)}
                    ton="artis"
                  />
                ) : null}
                <SonucSatiri etiket="Brüt kazanç" deger={paraYaz(sonuc.veri.brutKazanc)} />
                <SonucSatiri
                  etiket="İstisna"
                  deger={paraYaz(-sonuc.veri.uygulananIstisna)}
                  ton="artis"
                />
                <SonucSatiri etiket="Vergi matrahı" deger={paraYaz(sonuc.veri.matrah)} vurgulu />
              </dl>
            </>
          )
        ) : (
          <BosDurum
            baslik="Alış ve satış bilgilerini girin"
            neden="Elde tutma süresi muafiyet sınırını geçtiyse vergi doğmaz — bunu ilk olarak kontrol ediyoruz. Geçmediyse enflasyon endekslemesiyle gerçek matrahı hesaplıyoruz."
          />
        )}
      </div>
    </div>
  )
}
