import type { Metadata } from 'next'

import { MahalleKarti } from '@/components/mahalle/MahalleKarti'
import { BosDurum } from '@/components/ui/BosDurum'
import { Buton } from '@/components/ui/Buton'
import { KonumIkon } from '@/components/ui/Ikon'
import { mutlakAdres } from '@/lib/site'
import { mahalleleriGetir } from '@/lib/veri/mahalleler'

export const metadata: Metadata = {
  title: 'Çorlu mahalleleri — yatırım rehberi',
  description:
    'Çorlu mahallelerinin ortalama m² fiyatları, kira çarpanları ve yatırım hikâyeleri. ' +
    'Hangi mahalle hangi değer sürücüsünden besleniyor?',
  alternates: { canonical: mutlakAdres('/mahalleler') },
}

export default async function MahallelerSayfasi() {
  const mahalleler = await mahalleleriGetir()

  return (
    <div className="kapsayici py-10 sm:py-14">
      <header className="mb-8 flex max-w-2xl flex-col gap-3">
        <h1 className="text-[2rem] leading-tight sm:text-[2.5rem]">Çorlu mahalleleri</h1>
        <p className="text-metin-2 leading-relaxed">
          Bir taşınmazın değerini binadan çok mahallesi belirler. Her mahallenin hangi değer
          sürücüsünden beslendiğini — sanayi, ulaşım, eğitim, sağlık — veriyle anlatıyoruz.
        </p>
      </header>

      {mahalleler.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {mahalleler.map((mahalle) => (
            <MahalleKarti key={mahalle.id} mahalle={mahalle} />
          ))}
        </div>
      ) : (
        <BosDurum
          baslik="Mahalle sayfaları hazırlanıyor"
          neden="Pilot mahallelerin analiz metinleri üzerinde çalışıyoruz. Bir mahalle sayfasını yayına almadan önce, o mahalleyi gerçekten anlatan özgün bir metnin hazır olmasını bekliyoruz — yarım içerik yayınlamıyoruz."
          ikon={<KonumIkon width={32} height={32} />}
          eylem={
            <Buton href="/iletisim" gorunum="ikincil">
              Merak ettiğiniz mahalleyi sorun
            </Buton>
          }
        />
      )}
    </div>
  )
}
