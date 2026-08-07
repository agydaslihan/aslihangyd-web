import type { Metadata } from 'next'
import Link from 'next/link'

import { EslestirmeTesti } from '@/components/eslestirme/EslestirmeTesti'
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

  return (
    <div className="kapsayici py-10 sm:py-14">
      <header className="mx-auto mb-8 flex max-w-2xl flex-col gap-3 text-center">
        <h1 className="text-[2rem] leading-tight sm:text-[2.5rem]">Mahalle Eşleştirme Testi</h1>
        <p className="text-metin-2 leading-relaxed">
          Çorlu&apos;da &quot;hangi mahalle iyi?&quot; sorusunun tek bir cevabı yok — cevap kimin
          sorduğuna göre değişir. 7 soruda önceliklerinizi anlayıp size en uygun üç mahalleyi ve{' '}
          <strong className="font-medium">her birinin neden önerildiğini</strong> gösterelim.
        </p>
        <p className="text-metin-3 text-mikro">
          Yöntemin tamamı{' '}
          <Link href="/mahalle-eslestirme-metodolojisi" className="text-vurgu underline">
            metodoloji sayfasında
          </Link>{' '}
          yayınlanır.
        </p>
      </header>

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
  )
}
