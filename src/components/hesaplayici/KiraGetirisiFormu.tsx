'use client'

import { useMemo, useState } from 'react'

import { SayiAlani, SonucSatiri, sayiyaCevir } from '@/components/hesaplayici/Alanlar'
import { BosDurum } from '@/components/ui/BosDurum'
import { RakamIzgarasi, RakamKarti } from '@/components/ui/RakamKarti'
import { carpanYaz, paraYaz, yilYaz, yuzdeYaz } from '@/lib/bicimlendirme'
import { kiraGetirisiHesapla } from '@/lib/hesaplayicilar/kiraGetirisi'

/**
 * Kira getiri hesaplayıcı formu.
 *
 * Sonuç anında güncellenir — "Hesapla" butonu yok. Kullanıcı rakamı
 * değiştirip etkisini görürken bir düğmeye basmak zorunda kalmamalı;
 * bu, aracın keşfedilmesini ve denenmesini artırır.
 */
export function KiraGetirisiFormu({
  baslangicFiyat = '',
  baslangicKira = '',
}: {
  baslangicFiyat?: string
  baslangicKira?: string
}) {
  const [fiyat, setFiyat] = useState(baslangicFiyat)
  const [kira, setKira] = useState(baslangicKira)
  const [aidat, setAidat] = useState('')
  const [giderler, setGiderler] = useState('')
  const [bosluk, setBosluk] = useState('')

  const sonuc = useMemo(
    () =>
      kiraGetirisiHesapla({
        fiyat: sayiyaCevir(fiyat),
        aylikKira: sayiyaCevir(kira),
        aylikAidat: sayiyaCevir(aidat),
        yillikGiderler: sayiyaCevir(giderler),
        boslukOrani: (() => {
          const ay = sayiyaCevir(bosluk)
          return ay === null ? null : Math.min(ay, 12) / 12
        })(),
      }),
    [fiyat, kira, aidat, giderler, bosluk],
  )

  return (
    <div className="grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-12">
      <form className="flex flex-col gap-5" onSubmit={(olay) => olay.preventDefault()}>
        <SayiAlani
          etiket="Taşınmazın fiyatı"
          deger={fiyat}
          onDegisim={setFiyat}
          birim="₺"
          yerTutucu="4.800.000"
        />
        <SayiAlani
          etiket="Aylık kira geliri"
          deger={kira}
          onDegisim={setKira}
          birim="₺"
          yerTutucu="20.000"
        />

        <fieldset className="border-cizgi flex flex-col gap-5 border-t pt-5">
          <legend className="text-murekkep-3 text-mikro font-medium">
            İsteğe bağlı — net getiri için
          </legend>

          <SayiAlani
            etiket="Aylık aidat"
            deger={aidat}
            onDegisim={setAidat}
            birim="₺"
            yerTutucu="1.500"
          />
          <SayiAlani
            etiket="Yıllık diğer giderler"
            deger={giderler}
            onDegisim={setGiderler}
            birim="₺"
            ipucu="Emlak vergisi, sigorta, bakım, yönetim gideri"
          />
          <SayiAlani
            etiket="Yılda boş kalma beklentisi"
            deger={bosluk}
            onDegisim={setBosluk}
            birim="ay"
            bicimli={false}
            ipucu="Kiracı değişimlerinde boş geçen süre. Boş bırakırsan hesaba katılmaz."
          />
        </fieldset>
      </form>

      <div>
        {sonuc.durum === 'hesaplandi' ? (
          <>
            <RakamIzgarasi sinifAdi="sm:grid-cols-3 lg:grid-cols-3">
              <RakamKarti
                etiket="Kira çarpanı"
                deger={carpanYaz(sonuc.veri.kiraCarpani)}
                altBilgi="Düşük olması yatırımcı lehinedir"
                ton="vurgu"
              />
              <RakamKarti
                etiket="Brüt getiri"
                deger={yuzdeYaz(sonuc.veri.brutGetiri)}
                altBilgi="Yıllık, giderler hariç"
              />
              <RakamKarti
                etiket="Amortisman"
                deger={yilYaz(sonuc.veri.amortismanYili)}
                altBilgi="Kirayla kendini ödeme"
              />
            </RakamIzgarasi>

            <dl className="border-cizgi bg-yuzey rounded-yumusak mt-5 border px-5 py-2">
              <SonucSatiri
                etiket="Yıllık brüt kira geliri"
                deger={paraYaz(sonuc.veri.yillikBrutKira)}
              />

              {sonuc.veri.net ? (
                <>
                  <SonucSatiri
                    etiket="Yıllık toplam gider"
                    deger={paraYaz(sonuc.veri.net.yillikToplamGider)}
                    ton="azalis"
                  />
                  <SonucSatiri
                    etiket="Yıllık net kira geliri"
                    deger={paraYaz(sonuc.veri.net.yillikNetKira)}
                    vurgulu
                  />
                  <SonucSatiri
                    etiket="Net getiri"
                    deger={yuzdeYaz(sonuc.veri.net.netGetiri)}
                    aciklama="Giderler düşüldükten sonra"
                  />
                  <SonucSatiri
                    etiket="Net amortisman süresi"
                    deger={
                      Number.isFinite(sonuc.veri.net.netAmortismanYili)
                        ? yilYaz(sonuc.veri.net.netAmortismanYili)
                        : 'Hesaplanamıyor'
                    }
                    aciklama={
                      Number.isFinite(sonuc.veri.net.netAmortismanYili)
                        ? undefined
                        : 'Giderler kira gelirini aşıyor'
                    }
                  />
                </>
              ) : (
                <SonucSatiri
                  etiket="Net getiri"
                  deger="—"
                  aciklama="Aidat veya gider girerseniz net getiri de hesaplanır"
                />
              )}
            </dl>
          </>
        ) : (
          <BosDurum
            baslik="Fiyat ve kira girin"
            neden="Taşınmazın satış fiyatını ve aylık kira gelirini girdiğinizde kira çarpanı, brüt getiri ve amortisman süresi anında hesaplanır."
          />
        )}
      </div>
    </div>
  )
}
