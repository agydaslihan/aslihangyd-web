import type { Metadata } from 'next'
import Link from 'next/link'

import { SayfaVitrini } from '@/components/duzen/SayfaVitrini'
import { MahalleSecici } from '@/components/mahalle/MahalleSecici'
import { BosDurum } from '@/components/ui/BosDurum'
import { Buton } from '@/components/ui/Buton'
import { Feragat, VeriNotu } from '@/components/ui/Feragat'
import { carpanYaz, degisimYaz, paraYaz, sayiYaz } from '@/lib/bicimlendirme'
import { mutlakAdres } from '@/lib/site'
import { tarihiYaz } from '@/lib/tarih'
import { mahalleleriGetir } from '@/lib/veri/mahalleler'
import type { Mahalleler } from '@/payload-types'

export const metadata: Metadata = {
  title: 'Mahalle karşılaştırma — Çorlu',
  description:
    'Çorlu mahallelerini m² fiyatı, kira çarpanı ve 12 aylık değişim üzerinden yan yana ' +
    'karşılaştırın. Her rakamın yanında gözlem sayısı gösterilir.',
  alternates: { canonical: mutlakAdres('/mahalleler/karsilastir') },
}

/** En fazla üç mahalle: dördüncü sütun mobilde okunmaz hale geliyor. */
const AZAMI_SECIM = 3

export default async function KarsilastirmaSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const parametreler = await searchParams
  const hepsi = await mahalleleriGetir()

  const secilenSluglar = seciliSluglariCoz(parametreler.m)
  const secilenler = secilenSluglar
    .map((slug) => hepsi.find((mahalle) => mahalle.slug === slug))
    .filter((mahalle): mahalle is Mahalleler => mahalle !== undefined)
    .slice(0, AZAMI_SECIM)

  /**
   * ⚠️ SAYFA YOLU BANDIN İÇİNDE, EYEBROW YERİNE.
   *
   * İkisi de aynı işi yapıyor: "buradasın" demek. Yan yana kullanmak aynı
   * bilgiyi iki farklı biçimde tekrar etmek olurdu; alt sayfada kırıntı
   * daha çok şey söylüyor çünkü üst sayfaya dönüş yolunu da taşıyor.
   */
  return (
    <>
      <SayfaVitrini>
        <nav aria-label="Sayfa yolu" className="text-metin-3 mb-5 text-govde-kucuk">
          <Link href="/mahalleler" className="hover:text-metin underline-offset-2 hover:underline">
            Mahalleler
          </Link>
          <span aria-hidden> / </span>
          <span aria-current="page">Karşılaştır</span>
        </nav>

        <h1 className="text-metin font-serif text-baslik-1-mobil font-medium sm:text-baslik-1">
          Mahalle karşılaştırma
        </h1>
        <p className="text-metin-2 mt-5 text-govde leading-relaxed">
          En fazla {AZAMI_SECIM} mahalleyi yan yana koyun. Her rakamın yanında kaç gözleme
          dayandığını (n) gösteriyoruz — az gözleme dayanan bir ortalama, ortalama değildir.
        </p>
      </SayfaVitrini>

      <div className="kapsayici py-12 sm:py-16">
        {hepsi.length === 0 ? (
          <BosDurum
            baslik="Karşılaştırılacak mahalle yok"
            neden="Mahalle sayfaları yayına alındığında burada karşılaştırma yapabileceksiniz."
            eylem={
              <Buton href="/mahalleler" gorunum="ikincil">
                Mahalleler
              </Buton>
            }
          />
        ) : (
          <>
            <MahalleSecici
              mahalleler={hepsi.map((mahalle) => ({ slug: mahalle.slug, ad: mahalle.ad }))}
              secili={secilenler.map((mahalle) => mahalle.slug)}
              azami={AZAMI_SECIM}
            />

            {secilenler.length > 0 ? (
              <>
                <KarsilastirmaTablosu mahalleler={secilenler} />
                <Feragat
                  sinifAdi="mt-5 max-w-2xl"
                  ek="Rakamlar istenen fiyat gözlemlerine dayanır; gerçekleşen satış fiyatlarından farklı olabilir."
                />
              </>
            ) : (
              <div className="mt-8">
                <BosDurum
                  baslik="Karşılaştırmak için mahalle seçin"
                  neden="Yukarıdaki listeden en az bir mahalle seçtiğinizde rakamlar yan yana görünecek."
                  sade
                />
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

function KarsilastirmaTablosu({ mahalleler }: { mahalleler: Mahalleler[] }) {
  const satirlar = [
    {
      etiket: 'Ortalama m² satış fiyatı',
      al: (m: Mahalleler) => paraYaz(m.ortalamaM2Satis),
      /** Düşük iyi mi, yüksek iyi mi — vurgulama yönünü belirler. */
      yon: null,
    },
    { etiket: 'Ortalama aylık kira', al: (m: Mahalleler) => paraYaz(m.ortalamaKira), yon: null },
    {
      etiket: 'Kira çarpanı',
      al: (m: Mahalleler) => carpanYaz(m.kiraCarpani),
      sayi: (m: Mahalleler) => m.kiraCarpani,
      // Düşük kira çarpanı yatırımcı lehinedir.
      yon: 'dusukIyi' as const,
    },
    {
      etiket: '12 aylık değişim',
      al: (m: Mahalleler) => degisimYaz(m.degisim12Ay),
      sayi: (m: Mahalleler) => m.degisim12Ay,
      yon: 'yuksekIyi' as const,
    },
    { etiket: 'Nüfus', al: (m: Mahalleler) => sayiYaz(m.nufus), yon: null },
    {
      etiket: 'Gözlem sayısı (n)',
      al: (m: Mahalleler) => sayiYaz(m.gozlemSayisi),
      yon: null,
    },
  ]

  return (
    <div className="border-kenar rounded-kart mt-8 overflow-x-auto border-[0.5px]">
      <table className="w-full min-w-[36rem] border-collapse text-govde-kucuk">
        <caption className="yalnizca-okuyucu">Seçilen mahallelerin karşılaştırması</caption>
        <thead>
          <tr className="border-kenar bg-yuzey-2 border-b-[0.5px]">
            <th scope="col" className="text-metin-3 px-4 py-3 text-left font-medium">
              Gösterge
            </th>
            {mahalleler.map((mahalle) => (
              <th key={mahalle.id} scope="col" className="px-4 py-3 text-left font-medium">
                <Link
                  href={`/mahalleler/${mahalle.slug}`}
                  className="hover:text-vurgu underline-offset-2 hover:underline"
                >
                  {mahalle.ad}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-kenar divide-y">
          {satirlar.map((satir) => {
            const enIyiId = satir.yon ? enIyiyiBul(mahalleler, satir) : null

            return (
              <tr key={satir.etiket}>
                <th scope="row" className="text-metin-2 px-4 py-3 text-left font-normal">
                  {satir.etiket}
                </th>
                {mahalleler.map((mahalle) => {
                  const deger = satir.al(mahalle)
                  return (
                    <td
                      key={mahalle.id}
                      className={`rakam px-4 py-3 ${
                        enIyiId === mahalle.id ? 'text-basari font-medium' : 'font-medium'
                      }`}
                    >
                      {deger ?? <span className="text-metin-3 font-normal">Veri yok</span>}
                    </td>
                  )
                })}
              </tr>
            )
          })}

          <tr>
            <th scope="row" className="text-metin-2 px-4 py-3 text-left font-normal">
              Veri kaynağı
            </th>
            {mahalleler.map((mahalle) => (
              <td key={mahalle.id} className="px-4 py-3">
                <VeriNotu kaynak={mahalle.veriKaynagi} tarih={tarihiYaz(mahalle.verilerinTarihi)} />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

/**
 * Bir satırdaki en iyi değere sahip mahalleyi bulur.
 *
 * ⚠️ Yalnızca **iki veya daha fazla** mahallede veri varsa vurgulama yapılır.
 * Tek mahallede veri varken onu "en iyi" diye işaretlemek, karşılaştırma
 * yapılmış izlenimi verir — oysa karşılaştırılacak bir şey yoktur.
 */
function enIyiyiBul(
  mahalleler: Mahalleler[],
  satir: { sayi?: (m: Mahalleler) => number | null | undefined; yon: unknown },
): number | null {
  if (!satir.sayi) return null

  const degerler = mahalleler
    .map((mahalle) => ({ id: mahalle.id, deger: satir.sayi!(mahalle) }))
    .filter((kayit): kayit is { id: number; deger: number } => typeof kayit.deger === 'number')

  if (degerler.length < 2) return null

  const dusukIyi = satir.yon === 'dusukIyi'
  return degerler.reduce((enIyi, kayit) =>
    dusukIyi
      ? kayit.deger < enIyi.deger
        ? kayit
        : enIyi
      : kayit.deger > enIyi.deger
        ? kayit
        : enIyi,
  ).id
}

function seciliSluglariCoz(deger: string | string[] | undefined): string[] {
  if (typeof deger === 'string') return deger.split(',').filter(Boolean)
  if (Array.isArray(deger)) return deger.filter(Boolean)
  return []
}
