import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Bolum } from '@/components/ui/Bolum'
import { Feragat, VeriNotu } from '@/components/ui/Feragat'
import { Rozet } from '@/components/ui/Rozet'
import { sayiYaz } from '@/lib/bicimlendirme'
import { KATMAN_MINIMUM_GOZLEM } from '@/lib/endeks/tipler'
import { mutlakAdres } from '@/lib/site'
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
  const veri = await endeksVerisiniGetir()

  if (!veri.yayinIsaretli || !veri.kontrol.yayinlanabilir || !veri.seri) {
    notFound()
  }

  const sonAy = veri.seri.aylar.at(-1)

  return (
    <>
      <div className="kapsayici py-10 sm:py-14">
        <header className="mb-8 flex max-w-2xl flex-col gap-3">
          <h1 className="text-[2rem] leading-tight sm:text-[2.5rem]">
            Çorlu Konut İstenen Fiyat Endeksi
          </h1>
          <p className="text-murekkep-2 leading-relaxed">
            Çorlu&apos;da konut fiyatlarının aylık seyri. Tabakalı medyan ve sabit ağırlıklı sepet
            yöntemiyle hesaplanır.{' '}
            <Link
              href="/endeks-metodolojisi"
              className="text-lacivert underline underline-offset-2"
            >
              Metodolojinin tamamı
            </Link>
          </p>

          {/* ⚠️ Serinin adında "İstenen Fiyat" geçer ve bu gizlenmez.
              İlan fiyatları pazarlık payı içerir; gerçekleşen satış
              fiyatıyla karıştırmak endeksi sistematik olarak şişirir. */}
          <div className="border-cizgi bg-uyari-acik rounded-yumusak border p-4">
            <p className="text-sm leading-relaxed">
              <strong className="font-medium">Bu bir istenen fiyat endeksidir.</strong> Gözlemler
              ilan fiyatlarına dayanır ve ilan fiyatları pazarlık payı içerir. Gerçekleşen satış
              fiyatları ayrı bir seri olarak tutulur.
            </p>
          </div>
        </header>

        {sonAy ? (
          <div className="border-cizgi bg-yuzey rounded-yumusak border p-6">
            <p className="text-murekkep-3 text-mikro font-medium">
              {sonAy.ay} · Endeks değeri (baz: {veri.seri.bazAy} = 100)
            </p>
            <p className="rakam mt-2 text-[2.5rem] leading-none font-semibold">
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
        <div className="border-cizgi rounded-yumusak mt-8 overflow-x-auto border">
          <table className="w-full min-w-[32rem] border-collapse text-sm">
            <caption className="yalnizca-okuyucu">Aylık endeks serisi</caption>
            <thead>
              <tr className="border-cizgi bg-yuzey-2 border-b">
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
            <tbody className="divide-cizgi divide-y">
              {veri.seri.aylar.map((aylik) => (
                <tr key={aylik.ay}>
                  <td className="rakam px-4 py-2.5">{aylik.ay}</td>
                  <td className="rakam px-4 py-2.5 text-right font-medium">
                    {aylik.endeks?.toLocaleString('tr-TR') ?? '—'}
                  </td>
                  <td className="rakam text-murekkep-2 px-4 py-2.5 text-right">
                    {sayiYaz(aylik.toplamGozlem)}
                  </td>
                  <td className="rakam text-murekkep-2 px-4 py-2.5 text-right">
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
          <p className="text-murekkep-3 text-mikro leading-relaxed">
            Bir katmanda ayda {KATMAN_MINIMUM_GOZLEM} gözlemden az varsa o katmanın önceki ay değeri
            taşınır ve bu tabloda açıkça belirtilir. Uydurma değer üretilmez.
          </p>
          <Feragat ek="Endeks bir istatistiktir; değerleme raporu veya yatırım tavsiyesi değildir." />
        </div>
      </div>

      <Bolum zemin="yuzey">
        <div className="max-w-2xl">
          <h2 className="text-[1.5rem] leading-tight">Veriyi kullanmak isterseniz</h2>
          <p className="text-murekkep-2 mt-3 leading-relaxed">
            Bu endeksi atıf şartıyla serbestçe kullanabilirsiniz. Haber, rapor veya akademik
            çalışmada kaynak göstermeniz yeterli. Ham veriye veya ayrıntılı kırılıma ihtiyacınız
            varsa bize yazın.
          </p>
        </div>
      </Bolum>
    </>
  )
}
