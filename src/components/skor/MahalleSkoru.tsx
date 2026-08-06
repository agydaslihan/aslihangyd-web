import Link from 'next/link'

import { SkorKirilimi, SkorRadari } from '@/components/skor/SkorRadari'
import { Feragat } from '@/components/ui/Feragat'
import { GrafikIkon } from '@/components/ui/Ikon'
import { Rozet } from '@/components/ui/Rozet'
import { YakindaBolumu } from '@/components/mahalle/YakindaBolumu'
import { ASGARI_KAPSAM, yatirimSkoruHesapla, type SkorGirdisi } from '@/lib/skorlama/yatirimSkoru'

/**
 * Mahalle yatırım skoru bloğu.
 *
 * ⚠️ Skorun gösterildiği her yerde ZORUNLU üç şey:
 *   1. Kırılım (kara kutu puan yok)
 *   2. Metodoloji linki
 *   3. Yatırım tavsiyesi feragati
 *
 * Yeterli veri yoksa skor hiç gösterilmez — bunun yerine hangi bileşenlerin
 * eksik olduğu dürüstçe yazılır.
 */
export function MahalleSkoru({
  bilesenler,
  hesaplanmaTarihi,
}: {
  bilesenler: SkorGirdisi
  hesaplanmaTarihi: string | null
}) {
  const sonuc = yatirimSkoruHesapla(bilesenler)

  if (sonuc.durum === 'yetersiz_veri') {
    return (
      <YakindaBolumu
        oran="aspect-auto"
        ikon={<GrafikIkon width={30} height={30} />}
        baslik="Yatırım skoru için yeterli veri yok"
        aciklama={
          `Skorun yayınlanabilmesi için altı bileşenin en az %${ASGARI_KAPSAM * 100}` +
          `'lik ağırlığı gerekiyor; şu an %${Math.round(sonuc.kapsam * 100)}. ` +
          `Eksik olanlar: ${sonuc.eksikBilesenler.join(', ')}. ` +
          'Yarım veriyle puan vermek, puanı değersizleştirir.'
        }
      />
    )
  }

  const { veri } = sonuc
  const eksikVar = veri.eksikBilesenler.length > 0

  return (
    <div className="border-kenar bg-yuzey rounded-kart border-[0.5px] p-5 sm:p-6">
      <div className="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-8">
        {/* Skor + radar */}
        <div className="flex flex-col items-center gap-3">
          <div className="text-center">
            <p className="rakam text-[3rem] leading-none font-medium">
              {veri.toplam}
              <span className="text-metin-3 text-baslik-2 font-normal">/100</span>
            </p>
            {hesaplanmaTarihi ? (
              <p className="text-metin-3 mt-1 text-mikro">{hesaplanmaTarihi} itibarıyla</p>
            ) : null}
          </div>

          <SkorRadari bilesenler={veri.bilesenler} />

          {eksikVar ? (
            <Rozet ton="uyari">{veri.eksikBilesenler.length} bileşende veri yok</Rozet>
          ) : null}
        </div>

        {/* Kırılım — kara kutu puan yayınlamıyoruz */}
        <div>
          <SkorKirilimi bilesenler={veri.bilesenler} />
        </div>
      </div>

      <div className="border-kenar mt-6 flex flex-col gap-2 border-t-[0.5px] pt-4">
        {eksikVar ? (
          <p className="text-metin-3 text-mikro leading-relaxed">
            <strong className="font-medium">Not:</strong> {veri.eksikBilesenler.join(', ')} için
            veri bulunmadığından skor, mevcut %{Math.round(veri.kapsam * 100)} ağırlık üzerinden
            hesaplandı. Eksik bileşenler sıfır sayılmadı — bu, mahalleyi haksız yere cezalandırırdı.
          </p>
        ) : null}

        <p className="text-metin-3 text-mikro">
          Ağırlıklar ve hesaplama yöntemi{' '}
          <Link
            href="/yatirim-skoru-metodolojisi"
            className="text-vurgu underline underline-offset-2"
          >
            metodoloji sayfasında
          </Link>{' '}
          açıkça yayınlanmıştır.
        </p>

        <Feragat />
      </div>
    </div>
  )
}
