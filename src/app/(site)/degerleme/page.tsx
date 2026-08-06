import type { Metadata } from 'next'

import { DegerlemeSihirbazi } from '@/components/degerleme/DegerlemeSihirbazi'
import { BosDurum } from '@/components/ui/BosDurum'
import { Buton } from '@/components/ui/Buton'
import { whatsappBaglantisi } from '@/lib/bicimlendirme'
import { kurumsalBilgileriGetir, whatsappNumarasi } from '@/lib/kurumsal'
import { mutlakAdres } from '@/lib/site'
import { degerlemeKatsayilariniGetir } from '@/lib/veri/degerleme'
import { mahalleleriGetir } from '@/lib/veri/mahalleler'

export const metadata: Metadata = {
  title: 'Evim ne eder? — Çorlu anlık değerleme',
  description:
    'Çorlu’daki taşınmazınızın tahmini değer aralığını hemen öğrenin. ' +
    'İletişim bilgisi istemiyoruz; sonucu doğrudan görüyorsunuz.',
  alternates: { canonical: mutlakAdres('/degerleme') },
}

export default async function DegerlemeSayfasi() {
  const [mahalleler, katsayilar, kurumsal] = await Promise.all([
    mahalleleriGetir(),
    degerlemeKatsayilariniGetir(),
    kurumsalBilgileriGetir(),
  ])

  const whatsapp = whatsappBaglantisi(
    whatsappNumarasi(kurumsal),
    'Merhaba, taşınmazımın değerlemesi hakkında bilgi almak istiyorum.',
  )

  const veriliMahalleSayisi = mahalleler.filter(
    (mahalle) => typeof mahalle.ortalamaM2Satis === 'number',
  ).length

  return (
    <div className="kapsayici py-10 sm:py-14">
      <header className="mb-8 flex max-w-2xl flex-col gap-3">
        <h1 className="text-[2rem] leading-tight sm:text-[2.5rem]">Evim ne eder?</h1>
        <p className="text-murekkep-2 leading-relaxed">
          Satmayı düşünmeseniz bile bilmek işinize yarar. Birkaç bilgi girin, tahmini değer
          aralığını ve nasıl hesapladığımızı görün.{' '}
          <strong className="font-medium">Hiçbir iletişim bilgisi istemiyoruz</strong> — sonucu
          doğrudan göreceksiniz.
        </p>
      </header>

      {mahalleler.length === 0 ? (
        <BosDurum
          baslik="Değerleme aracı henüz hazır değil"
          neden="Mahalle verileri girildiğinde bu araç çalışmaya başlayacak. O zamana kadar taşınmazınızı bize doğrudan sorabilirsiniz."
          eylem={<Buton href="/iletisim?tip=degerleme">Bize sorun</Buton>}
        />
      ) : (
        <>
          {veriliMahalleSayisi === 0 ? (
            <div className="border-cizgi bg-uyari-acik rounded-yumusak mb-6 border p-4">
              <p className="text-sm leading-relaxed">
                <strong className="font-medium">Not:</strong> Henüz hiçbir mahalle için yeterli
                fiyat gözlemi biriktirmedik. Araç çalışıyor ama tahmin üretemeyecek — bu bilinçli:
                elimizde veri yokken rakam uydurmuyoruz.
              </p>
            </div>
          ) : null}

          <DegerlemeSihirbazi
            mahalleler={mahalleler.map((mahalle) => ({
              slug: mahalle.slug,
              ad: mahalle.ad,
              m2Fiyati: mahalle.ortalamaM2Satis ?? null,
              gozlemSayisi: mahalle.gozlemSayisi ?? null,
            }))}
            katsayilar={katsayilar}
            whatsapp={whatsapp}
          />
        </>
      )}
    </div>
  )
}
