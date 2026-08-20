import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { SayfaVitrini } from '@/components/duzen/SayfaVitrini'
import { Bolum, Eyebrow } from '@/components/ui/Bolum'
import { Feragat, VeriNotu } from '@/components/ui/Feragat'
import { Rozet } from '@/components/ui/Rozet'
import { sayiYaz } from '@/lib/bicimlendirme'
import { KATMAN_MINIMUM_GOZLEM } from '@/lib/endeks/tipler'
import { mutlakAdres } from '@/lib/site'
import { bolumKapisi } from '@/lib/veri/siteBolumleri'
import { endeksVerisiniGetir } from '@/lib/veri/endeks'

export const metadata: Metadata = {
  title: 'Çorlu Konut İstenen Fiyat Endeksi',
  description:
    'Çorlu konut piyasasının aylık istenen fiyat endeksi. Tabakalı medyan, sabit ağırlıklı ' +
    'sepet. Her değerin yanında gözlem sayısı gösterilir.',
  alternates: { canonical: mutlakAdres('/endeks') },
}

/**
 * ⚠️ YAYIN KAPISI
 *
 * Bu sayfa, ENDEKS-VERI-YONETIMI.md §5'teki koşulların HEPSİ sağlanana kadar
 * 404 döner. Kapı iki taraflıdır: Aslıhan'ın onayı VE verinin yeterliliği.
 * Onay kutusu tek başına yetmez.
 *
 * Bu kontrolü gevşetmeyin. "Bir ay erken açalım" cazibesi güçlüdür ve
 * zararı kalıcıdır: bir kez yanlış rakam yayınlanırsa geri almak zordur.
 */
export default async function EndeksSayfasi() {
  // ⚠️ Bölüm kapısı EN BAŞTA: kapalıysa hiçbir veri sorgusu çalışmasın
  // ve kapalı bölümün verisi RSC yüküne girmesin.
  await bolumKapisi('endeks')

  const veri = await endeksVerisiniGetir()

  if (!veri.yayinIsaretli || !veri.kontrol.yayinlanabilir || !veri.seri) {
    notFound()
  }

  const sonAy = veri.seri.aylar.at(-1)

  return (
    <>
      <SayfaVitrini>
        <Eyebrow>Aylık seri</Eyebrow>
        <h1 className="text-metin mt-4 font-baslik text-baslik-1-mobil font-medium sm:text-baslik-1">
          Çorlu Konut İstenen Fiyat Endeksi
        </h1>
        <p className="text-metin-2 mt-5 text-govde leading-relaxed">
          Çorlu&apos;da konut fiyatlarının aylık seyri. Tabakalı medyan ve sabit ağırlıklı sepet
          yöntemiyle hesaplanır.{' '}
          <Link href="/endeks-metodolojisi" className="text-vurgu underline underline-offset-2">
            Metodolojinin tamamı
          </Link>
        </p>
      </SayfaVitrini>

      <div className="kapsayici py-12 sm:py-16">
        {/*
          ⚠️ Serinin adında "İstenen Fiyat" geçer ve bu gizlenmez. İlan
          fiyatları pazarlık payı içerir; gerçekleşen satış fiyatıyla
          karıştırmak endeksi sistematik olarak şişirir.

          ⚠️ Uyarı BANDIN İÇİNE ALINMADI, ilk içerik olarak bırakıldı: bant
          dekoratif ve sakin; içine konan bir uyarı kutusu hem bandın
          ritmini bozar hem de uyarıyı süs gibi gösterirdi. Burada, endeks
          değerinin hemen üstünde duruyor — okunması gereken sıra bu.
        */}
        <div className="border-kenar bg-uyari-zemin rounded-kart mb-8 max-w-2xl border-[0.5px] p-4">
          <p className="text-govde-kucuk leading-relaxed">
            <strong className="text-metin font-medium">Bu bir istenen fiyat endeksidir.</strong>{' '}
            Gözlemler ilan fiyatlarına dayanır ve ilan fiyatları pazarlık payı içerir. Gerçekleşen
            satış fiyatları ayrı bir seri olarak tutulur.
          </p>
        </div>

        {sonAy ? (
          <div className="border-kenar bg-yuzey rounded-kart border-[0.5px] p-6">
            <p className="text-metin-3 text-mikro font-medium">
              {sonAy.ay} · Endeks değeri (baz: {veri.seri.bazAy} = 100)
            </p>
            <p className="rakam text-rakam-buyuk mt-2 font-medium">
              {sonAy.endeks?.toLocaleString('tr-TR') ?? '—'}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Rozet>n = {sayiYaz(sonAy.toplamGozlem)}</Rozet>
              {sonAy.tasinanKatmanSayisi > 0 ? (
                <Rozet ton="uyari">{sonAy.tasinanKatmanSayisi} katman önceki aydan taşındı</Rozet>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Aylık seri — her satırda gözlem sayısı ve taşıma bilgisi */}
        <div className="border-kenar rounded-kart mt-8 overflow-x-auto border-[0.5px]">
          <table className="w-full min-w-[32rem] border-collapse text-govde-kucuk">
            <caption className="yalnizca-okuyucu">Aylık endeks serisi</caption>
            <thead>
              <tr className="border-kenar bg-yuzey-2 border-b-[0.5px]">
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Ay
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Endeks
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Gözlem (n)
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Taşınan katman
                </th>
              </tr>
            </thead>
            <tbody className="divide-kenar divide-y">
              {veri.seri.aylar.map((aylik) => (
                <tr key={aylik.ay}>
                  <td className="rakam px-4 py-2.5">{aylik.ay}</td>
                  <td className="rakam px-4 py-2.5 text-right font-medium">
                    {aylik.endeks?.toLocaleString('tr-TR') ?? '—'}
                  </td>
                  <td className="rakam text-metin-2 px-4 py-2.5 text-right">
                    {sayiYaz(aylik.toplamGozlem)}
                  </td>
                  <td className="rakam text-metin-2 px-4 py-2.5 text-right">
                    {aylik.tasinanKatmanSayisi > 0 ? aylik.tasinanKatmanSayisi : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <VeriNotu
            gozlemSayisi={veri.toplamGozlem}
            kaynak="Kendi gözlem kayıtlarımız (elle toplanmış)"
          />
          <p className="text-metin-3 text-mikro leading-relaxed">
            Bir katmanda ayda {KATMAN_MINIMUM_GOZLEM} gözlemden az varsa o katmanın önceki ay değeri
            taşınır ve bu tabloda açıkça belirtilir. Uydurma değer üretilmez.
          </p>
          <Feragat ek="Endeks bir istatistiktir; değerleme raporu veya yatırım tavsiyesi değildir." />
        </div>
      </div>

      <Bolum zemin="yuzey">
        <div className="max-w-2xl">
          <h2 className="font-baslik text-baslik-2-mobil font-medium">
            Veriyi kullanmak isterseniz
          </h2>
          <p className="text-metin-2 mt-3 leading-relaxed">
            Bu endeksi atıf şartıyla serbestçe kullanabilirsiniz. Haber, rapor veya akademik
            çalışmada kaynak göstermeniz yeterli. Ham veriye veya ayrıntılı kırılıma ihtiyacınız
            varsa bize yazın.
          </p>
        </div>
      </Bolum>
    </>
  )
}
