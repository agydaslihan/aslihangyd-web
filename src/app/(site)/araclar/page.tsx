import type { Metadata } from 'next'
import Link from 'next/link'

import { Rozet } from '@/components/ui/Rozet'
import { Feragat } from '@/components/ui/Feragat'
import { OkIkon } from '@/components/ui/Ikon'
import { ARACLAR } from '@/lib/araclar'
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
      <header className="mb-8 flex max-w-2xl flex-col gap-3">
        <h1 className="text-[2rem] leading-tight sm:text-[2.5rem]">Yatırımcı araçları</h1>
        <p className="text-murekkep-2 leading-relaxed">
          Bir gayrimenkul kararının arkasında birkaç rakam vardır: kaç yılda kendini öder, gerçekte
          kaça mal olur, elinize net ne kalır. Bu araçlar o rakamları hesaplar ve nasıl
          hesapladığını açıkça gösterir.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:gap-5">
        {gorunenAraclar.map((arac) => {
          const hazir = parametreVar(arac.vergiParametresiGerekli)

          return (
            <article
              key={arac.adres}
              className="group border-cizgi bg-yuzey rounded-yumusak hover:shadow-kart relative flex flex-col gap-2 border p-5 transition-shadow sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg leading-snug">
                  <Link href={arac.adres} className="after:absolute after:inset-0">
                    {arac.ad}
                  </Link>
                </h2>
                <OkIkon
                  width={18}
                  height={18}
                  className="text-murekkep-3 group-hover:text-lacivert mt-1 shrink-0 transition-colors"
                />
              </div>

              <p className="text-murekkep-2 text-sm leading-relaxed">{arac.aciklama}</p>

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
          <p className="text-murekkep-3 text-mikro">
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
