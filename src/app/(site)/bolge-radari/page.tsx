import type { Metadata } from 'next'
import Link from 'next/link'

import { SayfaVitrini } from '@/components/duzen/SayfaVitrini'
import { Eyebrow } from '@/components/ui/Bolum'
import { BosDurum } from '@/components/ui/BosDurum'
import { Buton } from '@/components/ui/Buton'
import { Feragat } from '@/components/ui/Feragat'
import { Rozet } from '@/components/ui/Rozet'
import { KATMAN_MINIMUM_GOZLEM } from '@/lib/endeks/tipler'
import { bolgeyiTara, SAPMA_ESIKLERI, type Sinyal, type SinyalTuru } from '@/lib/radar/motor'
import { mutlakAdres } from '@/lib/site'
import { bolumKapisi } from '@/lib/veri/siteBolumleri'
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
  { etiket: string; ton: 'basari' | 'hata' | 'uyari'; sinif: string }
> = {
  firsat: { etiket: 'Fırsat', ton: 'basari', sinif: 'border-basari/40 bg-basari-zemin' },
  risk: { etiket: 'Risk', ton: 'hata', sinif: 'border-hata/40 bg-hata-zemin' },
  uyari: { etiket: 'Dikkat', ton: 'uyari', sinif: 'border-kenar bg-uyari-zemin' },
}

export default async function BolgeRadariSayfasi() {
  // ⚠️ Bölüm kapısı EN BAŞTA: kapalıysa hiçbir veri sorgusu çalışmasın
  // ve kapalı bölümün verisi RSC yüküne girmesin.
  await bolumKapisi('bolge_radari')

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
    <>
      <SayfaVitrini>
        <Eyebrow>Sinyaller</Eyebrow>
        <h1 className="text-metin mt-4 font-baslik text-baslik-1-mobil font-medium sm:text-baslik-1">
          Bölge Radarı
        </h1>
        <p className="text-metin-2 mt-5 text-govde leading-relaxed">
          Radar <strong className="text-metin font-medium">yeni bir puan üretmez.</strong>{' '}
          Mahalleleri birbirine göre tarar ve yalnızca veriyle desteklenen sinyalleri gösterir — her
          birinin arkasındaki rakamla birlikte. Ölçüt Çorlu&apos;nun kendisidir: karşılaştırmalar,
          verisi olan mahallelerin medyanına göre yapılır.
        </p>
      </SayfaVitrini>

      <div className="kapsayici py-12 sm:py-16">
        {sonuc.durum !== 'tarandi' ? (
          <BosDurum
            baslik="Radar henüz tarama yapamıyor"
            neden={`Karşılaştırma yapabilmek için verisi olan en az ${sonuc.gereken} mahalle gerekiyor; şu an ${sonuc.taranan} mahalle var. Daha az mahallenin medyanı "Çorlu ortalaması" diye sunulabilecek bir şey değil — bu yüzden sinyal üretmiyoruz.`}
            eylem={
              <Buton href="/mahalleler" gorunum="ikincil">
                Mahalleleri gör
              </Buton>
            }
          />
        ) : (
          <>
            <div className="border-kenar bg-yuzey rounded-kart mb-8 border-[0.5px] p-5">
              <p className="text-govde-kucuk leading-relaxed">
                <strong>{sonuc.veri.taranan} mahalle</strong> tarandı,{' '}
                <strong>{sonuc.veri.sinyaller.length} sinyal</strong> üretildi.
                {sonuc.veri.sinyalsizMahalleler.length > 0 ? (
                  <>
                    {' '}
                    <span className="text-metin-2">
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
                neden="Taranan mahallelerin hiçbiri, sinyal üretmeye yetecek kadar Çorlu medyanından ayrışmıyor. Yeni gözlemler geldikçe bu tablo değişecek."
              />
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {sonuc.veri.sinyaller.map((sinyal, sira) => (
                  <SinyalKarti
                    key={`${sinyal.mahalleSlug}-${sinyal.kod}-${sira}`}
                    sinyal={sinyal}
                  />
                ))}
              </ul>
            )}

            <section className="mt-10 max-w-2xl">
              <h2 className="text-baslik-3 font-medium">Sinyaller neye göre hesaplandı?</h2>

              <div className="border-kenar rounded-kart mt-4 overflow-x-auto border-[0.5px]">
                <table className="w-full min-w-[26rem] border-collapse text-govde-kucuk">
                  <caption className="yalnizca-okuyucu">
                    Karşılaştırmada kullanılan Çorlu medyanları
                  </caption>
                  <thead>
                    <tr className="border-kenar bg-yuzey-2 border-b-[0.5px]">
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
                  <tbody className="divide-kenar divide-y">
                    {sonuc.veri.olcutler.map((olcut) => (
                      <tr key={olcut.ad}>
                        <td className="px-4 py-3">{olcut.ad}</td>
                        <td className="rakam px-4 py-3 text-right">
                          {olcut.medyan.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}
                        </td>
                        <td className="rakam text-metin-3 px-4 py-3 text-right">
                          {olcut.mahalleSayisi}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="mt-8 font-baslik text-govde font-medium">Eşikler</h3>
              <ul className="text-metin-2 mt-2 list-disc space-y-1.5 pl-5 text-govde-kucuk leading-relaxed">
                <li>
                  Kira çarpanı medyanın{' '}
                  <strong>%{Math.round((1 - SAPMA_ESIKLERI.carpanFirsati) * 100)}</strong>{' '}
                  altındaysa fırsat,{' '}
                  <strong>%{Math.round((SAPMA_ESIKLERI.carpanRiski - 1) * 100)}</strong> üstündeyse
                  risk sinyali. Düşük çarpan yatırımcı lehinedir.
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

              <p className="text-metin-2 mt-6 leading-relaxed">
                Eşikler olmadan radar her mahalle için sinyal üretir ve hiçbir şey söylemez. Bunlar
                Çorlu&apos;ya dair bir ölçüm değil, aracın ilan ettiği metodolojidir.
              </p>

              <div className="border-kenar bg-vurgu-zemin rounded-kart mt-6 border-[0.5px] p-5">
                <h3 className="font-baslik text-govde font-medium">Radarın söylemedikleri</h3>
                <ul className="text-metin-2 mt-2 list-disc space-y-1.5 pl-5 text-govde-kucuk leading-relaxed">
                  <li>
                    Sinyaller <strong>geçmiş ölçümlerden</strong> türer; hiçbiri geleceğe dair bir
                    tahmin değildir.
                  </li>
                  <li>
                    Fiyat verileri <strong>istenen fiyatlardır</strong>, gerçekleşen satış fiyatı
                    değil. Ayrımı{' '}
                    <Link href="/endeks-metodolojisi" className="text-vurgu underline">
                      endeks metodolojisinde
                    </Link>{' '}
                    ayrıntılı anlattık.
                  </li>
                  <li>
                    Radar mahalle seviyesinde çalışır; aynı mahallede iki sokak arasında ciddi fark
                    olabilir.
                  </li>
                  <li>
                    Bir mahallenin sinyal almaması kötü olduğu anlamına gelmez — medyana yakın
                    olduğu anlamına gelir.
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
    </>
  )
}

function SinyalKarti({ sinyal }: { sinyal: Sinyal }) {
  const gorunum = TUR_GORUNUMU[sinyal.tur]

  return (
    /*
      ⚠️ Sinyal kartının kenarlık rengi SİNYAL TÜRÜNDEN geliyor (güçlü,
      zayıf, nötr) — altın hover buraya KONMADI: iki renk aynı kenarlıkta
      yarışır ve sinyalin kendi rengi okunmaz olurdu.
    */
    <li className={`rounded-kart border-[0.5px] p-5 ${gorunum.sinif}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Rozet ton={gorunum.ton}>{gorunum.etiket}</Rozet>
        <Link
          href={`/mahalleler/${sinyal.mahalleSlug}`}
          className="hover:text-vurgu text-govde-kucuk font-medium underline-offset-2 hover:underline"
        >
          {sinyal.mahalleAd}
        </Link>
      </div>

      <h3 className="mt-2.5 font-baslik text-govde leading-snug font-medium">{sinyal.baslik}</h3>
      <p className="text-metin-2 mt-1.5 text-govde-kucuk leading-relaxed">{sinyal.gerekce}</p>
    </li>
  )
}
