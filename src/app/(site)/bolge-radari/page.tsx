import type { Metadata } from 'next'
import Link from 'next/link'

import { BosDurum } from '@/components/ui/BosDurum'
import { Buton } from '@/components/ui/Buton'
import { Feragat } from '@/components/ui/Feragat'
import { Rozet } from '@/components/ui/Rozet'
import { KATMAN_MINIMUM_GOZLEM } from '@/lib/endeks/tipler'
import { bolgeyiTara, SAPMA_ESIKLERI, type Sinyal, type SinyalTuru } from '@/lib/radar/motor'
import { mutlakAdres } from '@/lib/site'
import { mahalleleriGetir } from '@/lib/veri/mahalleler'

export const metadata: Metadata = {
  title: 'Bölge Radarı — Çorlu mahallelerinde fırsat ve risk sinyalleri',
  description:
    'Çorlu mahallelerini kira çarpanı, fiyat ivmesi, arz baskısı ve veri gücü açısından ' +
    'karşılaştıran sinyal taraması. Her sinyalin arkasındaki rakam gösterilir.',
  alternates: { canonical: mutlakAdres('/bolge-radari') },
}

const TUR_GORUNUMU: Record<
  SinyalTuru,
  { etiket: string; ton: 'artis' | 'azalis' | 'uyari'; sinif: string }
> = {
  firsat: { etiket: 'Fırsat', ton: 'artis', sinif: 'border-artis/40 bg-artis-acik' },
  risk: { etiket: 'Risk', ton: 'azalis', sinif: 'border-azalis/40 bg-azalis-acik' },
  uyari: { etiket: 'Dikkat', ton: 'uyari', sinif: 'border-cizgi bg-uyari-acik' },
}

export default async function BolgeRadariSayfasi() {
  const mahalleler = await mahalleleriGetir()

  const sonuc = bolgeyiTara(
    mahalleler.map((mahalle) => ({
      slug: mahalle.slug,
      ad: mahalle.ad,
      ortalamaM2Satis: mahalle.ortalamaM2Satis ?? null,
      ortalamaKira: mahalle.ortalamaKira ?? null,
      kiraCarpani: mahalle.kiraCarpani ?? null,
      degisim12Ay: mahalle.degisim12Ay ?? null,
      gozlemSayisi: mahalle.gozlemSayisi ?? null,
      yatirimSkoru: mahalle.yatirimSkoru?.toplam ?? null,
      arzBaskisiPuani: mahalle.yatirimSkoru?.arzBaskisi ?? null,
    })),
  )

  return (
    <div className="kapsayici py-10 sm:py-14">
      <header className="mb-8 flex max-w-2xl flex-col gap-3">
        <h1 className="text-[2rem] leading-tight sm:text-[2.5rem]">Bölge Radarı</h1>
        <p className="text-murekkep-2 leading-relaxed">
          Radar <strong className="font-medium">yeni bir puan üretmez.</strong> Mahalleleri
          birbirine göre tarar ve yalnızca veriyle desteklenen sinyalleri gösterir — her birinin
          arkasındaki rakamla birlikte. Ölçüt Çorlu&apos;nun kendisidir: karşılaştırmalar, verisi
          olan mahallelerin medyanına göre yapılır.
        </p>
      </header>

      {sonuc.durum !== 'tarandi' ? (
        <BosDurum
          baslik="Radar henüz tarama yapamıyor"
          aciklama={`Karşılaştırma yapabilmek için verisi olan en az ${sonuc.gereken} mahalle gerekiyor; şu an ${sonuc.taranan} mahalle var. Daha az mahallenin medyanı "Çorlu ortalaması" diye sunulabilecek bir şey değil — bu yüzden sinyal üretmiyoruz.`}
          eylem={
            <Buton href="/mahalleler" gorunum="ikincil">
              Mahalleleri gör
            </Buton>
          }
        />
      ) : (
        <>
          <div className="border-cizgi bg-yuzey rounded-yumusak mb-8 border p-5">
            <p className="text-sm leading-relaxed">
              <strong>{sonuc.veri.taranan} mahalle</strong> tarandı,{' '}
              <strong>{sonuc.veri.sinyaller.length} sinyal</strong> üretildi.
              {sonuc.veri.sinyalsizMahalleler.length > 0 ? (
                <>
                  {' '}
                  <span className="text-murekkep-2">
                    {sonuc.veri.sinyalsizMahalleler.join(', ')} için sinyal yok — bu bir eksiklik
                    değil, o mahallelerin Çorlu medyanına yakın durduğu anlamına geliyor.
                  </span>
                </>
              ) : null}
            </p>
          </div>

          {sonuc.veri.sinyaller.length === 0 ? (
            <BosDurum
              baslik="Şu an öne çıkan bir sinyal yok"
              aciklama="Taranan mahallelerin hiçbiri, sinyal üretmeye yetecek kadar Çorlu medyanından ayrışmıyor. Yeni gözlemler geldikçe bu tablo değişecek."
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {sonuc.veri.sinyaller.map((sinyal, sira) => (
                <SinyalKarti key={`${sinyal.mahalleSlug}-${sinyal.kod}-${sira}`} sinyal={sinyal} />
              ))}
            </ul>
          )}

          <section className="mt-10 max-w-2xl">
            <h2 className="font-sans text-[1.375rem] leading-tight">
              Sinyaller neye göre hesaplandı?
            </h2>

            <div className="border-cizgi rounded-yumusak mt-4 overflow-x-auto border">
              <table className="w-full min-w-[26rem] border-collapse text-sm">
                <caption className="yalnizca-okuyucu">
                  Karşılaştırmada kullanılan Çorlu medyanları
                </caption>
                <thead>
                  <tr className="border-cizgi bg-yuzey-2 border-b">
                    <th scope="col" className="px-4 py-3 text-left font-medium">
                      Ölçüt
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Çorlu medyanı
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Mahalle (n)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-cizgi divide-y">
                  {sonuc.veri.olcutler.map((olcut) => (
                    <tr key={olcut.ad}>
                      <td className="px-4 py-3">{olcut.ad}</td>
                      <td className="rakam px-4 py-3 text-right">
                        {olcut.medyan.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}
                      </td>
                      <td className="rakam text-murekkep-3 px-4 py-3 text-right">
                        {olcut.mahalleSayisi}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="mt-8 font-sans text-base font-semibold">Eşikler</h3>
            <ul className="text-murekkep-2 mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
              <li>
                Kira çarpanı medyanın{' '}
                <strong>%{Math.round((1 - SAPMA_ESIKLERI.carpanFirsati) * 100)}</strong> altındaysa
                fırsat, <strong>%{Math.round((SAPMA_ESIKLERI.carpanRiski - 1) * 100)}</strong>{' '}
                üstündeyse risk sinyali. Düşük çarpan yatırımcı lehinedir.
              </li>
              <li>
                12 aylık değişim medyandan <strong>{SAPMA_ESIKLERI.ivmePuani} puan</strong>{' '}
                ayrışırsa ivme veya gerileme sinyali.
              </li>
              <li>
                Yatırım skoru medyanın üstünde <em>ve</em> m² fiyatı medyanın{' '}
                <strong>%{Math.round((1 - SAPMA_ESIKLERI.fiyatlanmamisFiyat) * 100)}</strong>{' '}
                altındaysa &quot;henüz fiyatlanmamış&quot; sinyali.
              </li>
              <li>
                Gözlem sayısı <strong>{KATMAN_MINIMUM_GOZLEM}</strong>&apos;in altındaysa veri
                zayıflığı uyarısı. Bu eşik uydurulmadı — endeks metodolojimizde bir katmanın
                yayınlanabilmesi için aranan sayıyla aynı.
              </li>
            </ul>

            <p className="text-murekkep-2 mt-6 leading-relaxed">
              Eşikler olmadan radar her mahalle için sinyal üretir ve hiçbir şey söylemez. Bunlar
              Çorlu&apos;ya dair bir ölçüm değil, aracın ilan ettiği metodolojidir.
            </p>

            <div className="border-cizgi bg-pirinc-acik rounded-yumusak mt-6 border p-5">
              <h3 className="font-sans text-base font-semibold">Radarın söylemedikleri</h3>
              <ul className="text-murekkep-2 mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
                <li>
                  Sinyaller <strong>geçmiş ölçümlerden</strong> türer; hiçbiri geleceğe dair bir
                  tahmin değildir.
                </li>
                <li>
                  Fiyat verileri <strong>istenen fiyatlardır</strong>, gerçekleşen satış fiyatı
                  değil. Ayrımı{' '}
                  <Link href="/endeks-metodolojisi" className="text-lacivert underline">
                    endeks metodolojisinde
                  </Link>{' '}
                  ayrıntılı anlattık.
                </li>
                <li>
                  Radar mahalle seviyesinde çalışır; aynı mahallede iki sokak arasında ciddi fark
                  olabilir.
                </li>
                <li>
                  Bir mahallenin sinyal almaması kötü olduğu anlamına gelmez — medyana yakın olduğu
                  anlamına gelir.
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <Feragat />
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function SinyalKarti({ sinyal }: { sinyal: Sinyal }) {
  const gorunum = TUR_GORUNUMU[sinyal.tur]

  return (
    <li className={`rounded-yumusak border p-5 ${gorunum.sinif}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Rozet ton={gorunum.ton}>{gorunum.etiket}</Rozet>
        <Link
          href={`/mahalleler/${sinyal.mahalleSlug}`}
          className="hover:text-lacivert text-sm font-medium underline-offset-2 hover:underline"
        >
          {sinyal.mahalleAd}
        </Link>
      </div>

      <h3 className="mt-2.5 font-sans text-[0.9375rem] leading-snug font-semibold">
        {sinyal.baslik}
      </h3>
      <p className="text-murekkep-2 mt-1.5 text-sm leading-relaxed">{sinyal.gerekce}</p>
    </li>
  )
}
