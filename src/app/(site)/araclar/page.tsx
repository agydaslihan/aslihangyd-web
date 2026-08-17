import type { Metadata } from 'next'
import Link from 'next/link'

import { Rozet } from '@/components/ui/Rozet'
import { Feragat } from '@/components/ui/Feragat'
import {
  ArtisIkon,
  BankaIkon,
  CizgiGrafikIkon,
  FisIkon,
  KarsilastirIkon,
  OkIkon,
  ParaRaporuIkon,
  YuzdeIkon,
} from '@/components/ui/Ikon'
import { ARACLAR, type AracIkonu as AracIkonAnahtari } from '@/lib/araclar'
import { BOLUMLER } from '@/lib/siteBolumleri'
import { bolumDurumlariniGetir } from '@/lib/veri/siteBolumleri'
import { mutlakAdres } from '@/lib/site'
import { tarihiYaz } from '@/lib/tarih'
import { vergiParametreleriniGetir } from '@/lib/veri/vergiParametreleri'

export const metadata: Metadata = {
  title: 'Yatırımcı araçları — kira getirisi, kredi, vergi hesaplayıcıları',
  description:
    'Kira çarpanı, konut kredisi taksiti, alım maliyeti, kira geliri vergisi ve değer artış ' +
    'kazancı hesaplayıcıları. Oranlar güncel tutulur, yöntem açıkça yazılır.',
  alternates: { canonical: mutlakAdres('/araclar') },
}

export default async function AraclarSayfasi() {
  const [parametreler, bolumDurumlari] = await Promise.all([
    vergiParametreleriniGetir(),
    bolumDurumlariniGetir(),
  ])

  /**
   * Kapalı bir bölüme ait araç listeden düşer.
   *
   * ⚠️ Bunu atlamak, kapalı bölümün rotası 404 dönerken buradan ona giden
   * bir bağlantı bırakmak olurdu — "kapattım ama site hâlâ gösteriyor"
   * durumunun tam olarak kendisi.
   */
  const kapaliAdresler = new Set(
    BOLUMLER.filter((bolum) => !bolumDurumlari[bolum.anahtar]).flatMap((bolum) => bolum.rotalar),
  )
  const gorunenAraclar = ARACLAR.filter((arac) => !kapaliAdresler.has(arac.adres))

  const parametreVar = (aracVergiGerektirir: boolean) =>
    !aracVergiGerektirir || Object.keys(parametreler.sayilar).length > 0

  return (
    <div className="kapsayici py-10 sm:py-14">
      {/*
        ⚠️ BAŞLIK ALTINDAKİ UZUN PARAGRAF KALDIRILDI.

        Kartların her biri zaten ne yaptığını yazıyor; üstteki paragraf
        aynı şeyi üçüncü kez söylüyordu ve kullanıcıyı araçlara ulaşmadan
        önce bir metin duvarıyla karşılıyordu.

        ⚠️ `h1` KALDI. Sayfanın SEO'su ve ekran okuyucu gezinmesi ona bağlı;
        görsel sadelik için metin kısaldı, etiket durdu.
      */}
      <header className="mb-8">
        <h1 className="font-serif text-baslik-1-mobil font-medium sm:text-baslik-1">
          Yatırımcı araçları
        </h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:gap-5">
        {gorunenAraclar.map((arac) => {
          const hazir = parametreVar(arac.vergiParametresiGerekli)

          return (
            <article
              key={arac.adres}
              className="group border-kenar bg-yuzey rounded-kart hover:shadow-kart relative flex flex-col gap-2 border-[0.5px] p-5 transition-shadow sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {/*
                    ⚠️ İkon DEKORATİF: `aria-hidden` ve anlam başlıkta.
                    Marka rengi (`vurgu`) kullanılıyor; yumuşak zeminli
                    daire ikonu kart yüzeyinden ayırıyor.
                  */}
                  <span className="bg-vurgu-zemin text-vurgu mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full">
                    <AracIkonu tur={arac.ikon} width={18} height={18} />
                  </span>
                  <h2 className="text-baslik-3 leading-snug">
                    <Link href={arac.adres} className="after:absolute after:inset-0">
                      {arac.ad}
                    </Link>
                  </h2>
                </div>
                <OkIkon
                  width={18}
                  height={18}
                  className="text-metin-3 group-hover:text-vurgu mt-1 shrink-0 transition-colors"
                />
              </div>

              <p className="text-metin-2 text-govde-kucuk leading-relaxed">{arac.aciklama}</p>

              {!hazir ? (
                <div className="mt-2">
                  <Rozet ton="uyari">Güncel oranlar bekleniyor</Rozet>
                </div>
              ) : null}
            </article>
          )
        })}
      </div>

      <div className="mt-10 max-w-2xl">
        {parametreler.gecerlilikTarihi ? (
          <p className="text-metin-3 text-mikro">
            Vergi ve harç oranları <strong>{tarihiYaz(parametreler.gecerlilikTarihi)}</strong>{' '}
            itibarıyla güncellenmiştir.
          </p>
        ) : null}
        <Feragat
          sinifAdi="mt-2"
          ek="Vergi hesapları basitleştirilmiştir; kişisel durumunuza göre değişir."
        />
      </div>
    </div>
  )
}

/**
 * Anahtar → ikon eşlemesi.
 *
 * ⚠️ Eşleme BURADA, `lib/araclar.ts` içinde değil. O dosya gezinme
 * menüsünde de okunuyor; JSX taşısaydı istemci paketine bileşen sürükler
 * ve `lib/` katmanının sunucu-istemci sınırını bulanıklaştırırdı.
 */
function AracIkonu({
  tur,
  ...ozellikler
}: { tur: AracIkonAnahtari } & React.SVGProps<SVGSVGElement>) {
  switch (tur) {
    case 'yuzde':
      return <YuzdeIkon {...ozellikler} />
    case 'banka':
      return <BankaIkon {...ozellikler} />
    case 'grafik':
      return <CizgiGrafikIkon {...ozellikler} />
    case 'karsilastir':
      return <KarsilastirIkon {...ozellikler} />
    case 'fis':
      return <FisIkon {...ozellikler} />
    case 'paraRaporu':
      return <ParaRaporuIkon {...ozellikler} />
    case 'artis':
      return <ArtisIkon {...ozellikler} />
  }
}
