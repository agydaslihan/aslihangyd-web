import type { Metadata } from 'next'
import { SayfaBasligi } from '@/components/icerik/SayfaIcerik'
import { sayfaIcerigi } from '@/lib/veri/sayfaIcerikleri'

import { MahalleKarti } from '@/components/mahalle/MahalleKarti'
import { BosDurum } from '@/components/ui/BosDurum'
import { Buton } from '@/components/ui/Buton'
import { KonumIkon } from '@/components/ui/Ikon'
import { mutlakAdres } from '@/lib/site'
import { IZGARA_MIN_YUKSEKLIK } from '@/lib/duzen/iskelet'
import { mahalleleriGetir } from '@/lib/veri/mahalleler'

export const metadata: Metadata = {
  title: 'Çorlu mahalleleri — yatırım rehberi',
  description:
    'Çorlu mahallelerinin ortalama m² fiyatları, kira çarpanları ve yatırım hikâyeleri. ' +
    'Hangi mahalle hangi değer sürücüsünden besleniyor?',
  alternates: { canonical: mutlakAdres('/mahalleler') },
}

export default async function MahallelerSayfasi() {
  const icerik = await sayfaIcerigi('mahalleler')

  const mahalleler = await mahalleleriGetir()

  return (
    <div className="kapsayici py-10 sm:py-14">
      {/*
        ⚠️ BAŞLIK KÜÇÜLDÜ VE ORTALANDI — `h1` ETİKETİ DURUYOR.

        Görsel sadelik için punto `baslik-1`den `baslik-2`ye indi ve blok
        ortalandı. Etiket DEĞİŞMEDİ: bu sayfanın arama motoru sıralaması ve
        ekran okuyucu gezinmesi `h1`e bağlı. "Küçük görünsün" ile "başlık
        olmasın" ayrı şeyler; ikincisi sessiz bir SEO kaybı olurdu.
      */}
      <header className="mx-auto mb-8 flex max-w-2xl flex-col gap-2 text-center">
        <SayfaBasligi
          icerik={icerik}
          varsayilanBaslik="Çorlu mahalleleri"
          h1Sinifi="font-serif text-baslik-2 font-medium"
          aciklamaSinifi="text-metin-2 text-govde-kucuk leading-relaxed"
          varsayilanAciklama={
            <p className="text-metin-2 text-govde-kucuk leading-relaxed">
              Bir taşınmazın değerini binadan çok mahallesi belirler. Her mahallenin hangi değer
              sürücüsünden beslendiğini — sanayi, ulaşım, eğitim, sağlık — veriyle anlatıyoruz.
            </p>
          }
        />
      </header>

      {mahalleler.length > 0 ? (
        <div
          className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5 ${IZGARA_MIN_YUKSEKLIK}`}
        >
          {/*
            ⚠️ Bu sayfada araya bölüm başlığı girmiyor: h1 doğrudan kartlara
            bağlanıyor. Kart varsayılanı h3 olduğu için seviye atlanıyordu.
          */}
          {mahalleler.map((mahalle) => (
            <MahalleKarti key={mahalle.id} mahalle={mahalle} baslikSeviyesi={2} />
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
