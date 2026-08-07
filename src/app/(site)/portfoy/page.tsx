import type { Metadata } from 'next'
import { Suspense } from 'react'

import { IlanFiltreleri } from '@/components/ilan/IlanFiltreleri'
import { IlanKarti } from '@/components/ilan/IlanKarti'
import { BosDurum } from '@/components/ui/BosDurum'
import { Buton } from '@/components/ui/Buton'
import { Sayfalama } from '@/components/ui/Sayfalama'
import { sayiYaz } from '@/lib/bicimlendirme'
import type { IlanKategorisi, IlanTipi } from '@/lib/secenekler'
import { mutlakAdres } from '@/lib/site'
import { ilanlariGetir, type IlanFiltresi } from '@/lib/veri/ilanlar'
import { mahalleleriGetir } from '@/lib/veri/mahalleler'

export const metadata: Metadata = {
  title: 'Portföy — Çorlu satılık ve kiralık taşınmazlar',
  description:
    'Çorlu ve çevresindeki satılık ve kiralık taşınmaz portföyümüz. Her ilanda kira çarpanı, ' +
    'brüt getiri ve EİDS doğrulama bilgisi yer alır.',
  alternates: { canonical: mutlakAdres('/portfoy') },
}

type AramaParametreleri = Record<string, string | string[] | undefined>

export default async function PortfoySayfasi({
  searchParams,
}: {
  searchParams: Promise<AramaParametreleri>
}) {
  const parametreler = await searchParams
  const filtre = parametreleriCoz(parametreler)
  const sayfa = sayiCoz(parametreler.sayfa) ?? 1

  const [sonuc, mahalleler] = await Promise.all([ilanlariGetir(filtre, sayfa), mahalleleriGetir()])

  return (
    <div className="kapsayici py-10 sm:py-14">
      <header className="mb-8 flex flex-col gap-3">
        <h1 className="text-[2rem] leading-tight sm:text-[2.5rem]">Portföy</h1>
        <p className="text-murekkep-2 max-w-2xl leading-relaxed">
          Çorlu ve çevresindeki taşınmazlarımız. Her ilanda kira çarpanı ve amortisman süresini
          hesaplayıp gösteriyoruz; kira verisi olmayan ilanlarda bu alanları boş bırakıyoruz.
        </p>
      </header>

      <Suspense fallback={<div className="iskelet h-24" />}>
        <IlanFiltreleri mahalleler={mahalleler} />
      </Suspense>

      <p className="text-murekkep-3 mt-6 mb-4 text-sm" aria-live="polite">
        {sonuc.toplam > 0 ? `${sayiYaz(sonuc.toplam)} taşınmaz listeleniyor` : 'Sonuç bulunamadı'}
      </p>

      {sonuc.ilanlar.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {sonuc.ilanlar.map((ilan, sira) => (
              <IlanKarti key={ilan.id} ilan={ilan} oncelikli={sira < 3} />
            ))}
          </div>

          <Sayfalam sonuc={sonuc} parametreler={parametreler} />
        </>
      ) : (
        <BosDurum
          baslik="Bu kriterlere uyan taşınmaz yok"
          neden="Filtreleri gevşetmeyi deneyin. Aradığınızı bulamadıysanız bize anlatın — portföyümüze girdiğinde ilk siz haberdar olun."
          eylem={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Buton href="/portfoy" gorunum="ikincil">
                Filtreleri temizle
              </Buton>
              <Buton href="/iletisim">Aradığınızı anlatın</Buton>
            </div>
          }
        />
      )}
    </div>
  )
}

function Sayfalam({
  sonuc,
  parametreler,
}: {
  sonuc: { sayfa: number; toplamSayfa: number }
  parametreler: AramaParametreleri
}) {
  if (sonuc.toplamSayfa <= 1) return null

  return (
    <Sayfalama
      mevcutSayfa={sonuc.sayfa}
      toplamSayfa={sonuc.toplamSayfa}
      adresUret={(hedef) => {
        const sorgu = new URLSearchParams()
        for (const [anahtar, deger] of Object.entries(parametreler)) {
          if (typeof deger === 'string' && anahtar !== 'sayfa') sorgu.set(anahtar, deger)
        }
        if (hedef > 1) sorgu.set('sayfa', String(hedef))
        const metin = sorgu.toString()
        return metin ? `/portfoy?${metin}` : '/portfoy'
      }}
    />
  )
}

/** Sorgu parametrelerini güvenle filtreye çevirir. Tanınmayan değer yok sayılır. */
function parametreleriCoz(parametreler: AramaParametreleri): IlanFiltresi {
  const metin = (anahtar: string): string | undefined => {
    const deger = parametreler[anahtar]
    return typeof deger === 'string' && deger !== '' ? deger : undefined
  }

  const tip = metin('tip')
  const kategori = metin('kategori')
  const siralama = metin('siralama')

  return {
    tip: tip === 'satilik' || tip === 'kiralik' ? (tip as IlanTipi) : undefined,
    kategori: KATEGORILER.includes(kategori ?? '') ? (kategori as IlanKategorisi) : undefined,
    mahalle: metin('mahalle'),
    odaSayisi: metin('oda'),
    enAzFiyat: sayiCoz(parametreler.enAz),
    enCokFiyat: sayiCoz(parametreler.enCok),
    siralama: SIRALAMALAR.includes(siralama ?? '')
      ? (siralama as IlanFiltresi['siralama'])
      : undefined,
  }
}

const KATEGORILER = ['konut', 'isyeri', 'arsa', 'depo', 'fabrika']
const SIRALAMALAR = ['yeni', 'fiyat_artan', 'fiyat_azalan', 'carpan_artan']

function sayiCoz(deger: string | string[] | undefined): number | undefined {
  if (typeof deger !== 'string') return undefined
  const sayi = Number.parseInt(deger, 10)
  return Number.isFinite(sayi) && sayi > 0 ? sayi : undefined
}
