import type { Metadata } from 'next'
import Link from 'next/link'

import { EslestirmeTesti } from '@/components/eslestirme/EslestirmeTesti'
import { SayfaVitrini } from '@/components/duzen/SayfaVitrini'
import { Eyebrow } from '@/components/ui/Bolum'
import { BosDurum } from '@/components/ui/BosDurum'
import { Buton } from '@/components/ui/Buton'
import { kurumsalBilgileriGetir, whatsappNumarasi } from '@/lib/kurumsal'
import { mutlakAdres } from '@/lib/site'
import { bolumKapisi } from '@/lib/veri/siteBolumleri'
import { hedefNoktalariniGetir, mahalleProfilleriniGetir } from '@/lib/veri/eslestirme'

export const metadata: Metadata = {
  title: 'Mahalle Eşleştirme Testi — Çorlu’da size uygun mahalle hangisi?',
  description:
    '7 soruda Çorlu’da önceliklerinize en uygun üç mahalleyi ve her birinin neden önerildiğini ' +
    'görün. İletişim bilgisi istemiyoruz.',
  alternates: { canonical: mutlakAdres('/mahalle-testi') },
}

export default async function MahalleTestiSayfasi() {
  // ⚠️ Bölüm kapısı EN BAŞTA: kapalıysa hiçbir veri sorgusu çalışmasın
  // ve kapalı bölümün verisi RSC yüküne girmesin.
  await bolumKapisi('mahalle_testi')

  const [mahalleler, hedefNoktalari, kurumsal] = await Promise.all([
    mahalleProfilleriniGetir(),
    hedefNoktalariniGetir(),
    kurumsalBilgileriGetir(),
  ])

  /**
   * ⚠️ BAŞLIK ORTADAN SOLA ALINDI.
   *
   * Vitrin bandının ritmi sitenin geri kalanıyla ortak; ortalanmış tek bir
   * blok bandın içinde yalnız kalıyor ve sayfa diğerlerinden farklı bir
   * hizada açılıyordu. `h1` etiketi değişmedi.
   */
  return (
    <>
      <SayfaVitrini>
        <Eyebrow>7 soruluk test</Eyebrow>
        <h1 className="text-metin mt-4 font-baslik text-baslik-1-mobil font-medium sm:text-baslik-1">
          Mahalle Eşleştirme Testi
        </h1>
        <p className="text-metin-2 mt-5 text-govde leading-relaxed">
          Çorlu&apos;da &quot;hangi mahalle iyi?&quot; sorusunun tek bir cevabı yok — cevap kimin
          sorduğuna göre değişir. 7 soruda önceliklerinizi anlayıp size en uygun üç mahalleyi ve{' '}
          <strong className="text-metin font-medium">her birinin neden önerildiğini</strong>{' '}
          gösterelim.
        </p>
        <p className="text-metin-3 mt-3 text-mikro">
          Yöntemin tamamı{' '}
          <Link href="/mahalle-eslestirme-metodolojisi" className="text-vurgu underline">
            metodoloji sayfasında
          </Link>{' '}
          yayınlanır.
        </p>
      </SayfaVitrini>

      <div className="kapsayici py-12 sm:py-16">
        {mahalleler.length === 0 ? (
          <div className="mx-auto max-w-2xl">
            <BosDurum
              baslik="Test henüz hazır değil"
              neden="Mahalle profilleri girildiğinde bu test çalışmaya başlayacak. O zamana kadar aradığınızı bize doğrudan anlatabilirsiniz."
              eylem={<Buton href="/iletisim">Bize anlatın</Buton>}
            />
          </div>
        ) : (
          <EslestirmeTesti
            mahalleler={mahalleler}
            hedefNoktalari={hedefNoktalari}
            whatsapp={whatsappNumarasi(kurumsal)}
          />
        )}
      </div>
    </>
  )
}
