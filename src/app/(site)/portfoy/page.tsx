import type { Metadata } from 'next'
import { Suspense } from 'react'

import { AkilliArama } from '@/components/ilan/AkilliArama'
import { IlanFiltreleri } from '@/components/ilan/IlanFiltreleri'
import { aiAramaAcikMi } from '@/lib/arama/motor'
import { bolumDurumlariniGetir } from '@/lib/veri/siteBolumleri'
import { IlanKarti } from '@/components/ilan/IlanKarti'
import { SiraOgesi, YataySira } from '@/components/ilan/YataySira'
import { BosDurum } from '@/components/ui/BosDurum'
import { Buton } from '@/components/ui/Buton'
import { KilitliKart } from '@/components/ui/KilitliKart'
import { Sayfalama } from '@/components/ui/Sayfalama'
import { sayiYaz } from '@/lib/bicimlendirme'
import type { IlanKategorisi, IlanTipi } from '@/lib/secenekler'
import { mutlakAdres } from '@/lib/site'
import { ilanlariGetir, type IlanFiltresi } from '@/lib/veri/ilanlar'
import { mahalleleriGetir } from '@/lib/veri/mahalleler'
import { temaSiralariniGetir, type TemaSirasi } from '@/lib/veri/portfoy'

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

  /**
   * Tema sıraları yalnızca FİLTRESİZ görünümde gösterilir.
   *
   * Filtre uygulandığı anda ziyaretçi aramaya geçmiştir: "yeni eklenenler"
   * sırası orada sonucun önünü kapatan bir gürültüdür. Süzülmüş görünüm
   * ızgara + sayfalama olarak kalıyor — arama motorunun tüm portföyü
   * gezebilmesi de buna bağlı.
   */
  const filtresizMi = Object.keys(filtre).every(
    (anahtar) => filtre[anahtar as keyof IlanFiltresi] === undefined,
  )

  const [sonuc, mahalleler, siralar, bolumler] = await Promise.all([
    ilanlariGetir(filtre, sayfa),
    mahalleleriGetir(),
    filtresizMi ? temaSiralariniGetir() : Promise.resolve([]),
    bolumDurumlariniGetir(),
  ])

  /**
   * AI arama İKİ koşula birden bağlı.
   *
   * ⚠️ `ai_arama` bölümü varsayılan KAPALI ve bu bir KVKK kararı, teknik
   * değil: ziyaretçinin yazdığı metin Anthropic'in (ABD) sunucularına
   * gidiyor ve bu aktarımın aydınlatma metnine eklenmesi gerekiyor.
   * Anahtar tanımlı olsa bile bölüm açılmadan kutu basılmaz.
   * Ayrıntı: docs/AI-ARAMA-KVKK-NOTU.md
   */
  const aiAramaGoster = bolumler.ai_arama && aiAramaAcikMi()

  return (
    <div className="kapsayici py-10 sm:py-14">
      <header className="mb-8 flex flex-col gap-3">
        <h1 className="text-baslik-1">Portföy</h1>
        <p className="text-metin-2 olcu">
          Çorlu ve çevresindeki taşınmazlarımız. Her ilanda kira çarpanı ve amortisman süresini
          hesaplayıp gösteriyoruz; kira verisi olmayan ilanlarda bu alanları boş bırakıyoruz.
        </p>
      </header>

      {siralar.length > 0 ? (
        <div className="mb-12 flex flex-col gap-10">
          {siralar.map((sira) => (
            <TemaBolumu key={sira.anahtar} sira={sira} />
          ))}
        </div>
      ) : null}

      {/* ⚠️ İki koşul: bölüm açık VE anahtar tanımlı. Bölüm varsayılan
          kapalı (KVKK — aydınlatma metni bekliyor). Filtreler her
          hâlükârda çalışır; AI arama onların yerine değil yanına konuyor. */}
      {aiAramaGoster ? <AkilliArama /> : null}

      <Suspense fallback={<div className="iskelet h-24" />}>
        <IlanFiltreleri mahalleler={mahalleler} />
      </Suspense>

      <p className="text-metin-3 text-govde-kucuk mt-6 mb-4" aria-live="polite">
        {sonuc.toplam > 0 ? `${sayiYaz(sonuc.toplam)} taşınmaz listeleniyor` : 'Sonuç bulunamadı'}
      </p>

      {sonuc.ilanlar.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {sonuc.ilanlar.map((ilan, sira) => (
              <IlanKarti key={ilan.id} ilan={ilan} oncelikli={filtresizMi ? false : sira < 3} />
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

/**
 * Tek bir tema sırası.
 *
 * ⚠️ BAŞLIK ÖLÇÜT SÖYLER, EMOJİ TAŞIMAZ. Alt satır "neye göre bu sırada?"
 * sorusunu cevaplar. Belirsiz bir başlık ("Dikkat çeken ilanlar") merak
 * değil güvensizlik uyandırır.
 *
 * ⚠️ Boş sıra sessizce gizlenmez; sebebi yazılır. Sitenin aylarca kısmi
 * veriyle çalışacağı düşünülürse, "neden boş" sorusunun cevabı burada
 * ilanların kendisi kadar önemli.
 */
function TemaBolumu({ sira }: { sira: TemaSirasi }) {
  const dolu = sira.ogeler.length > 0

  return (
    <section aria-labelledby={`sira-${sira.anahtar}`}>
      <div className="mb-4 flex flex-col gap-1">
        <h2 id={`sira-${sira.anahtar}`} className="text-baslik-2">
          {sira.baslik}
        </h2>
        <p className="text-metin-3 text-govde-kucuk olcu">{sira.altBaslik}</p>
      </div>

      {dolu ? (
        <YataySira etiket={sira.baslik}>
          {sira.ogeler.map((oge) => (
            <SiraOgesi key={oge.anahtar}>
              {oge.tip === 'kilitli' ? (
                <KilitliKart
                  mahalleAdi={oge.kayit.mahalleAdi}
                  odaSayisi={oge.kayit.odaSayisi}
                  m2Araligi={oge.kayit.m2Araligi}
                  fiyatBandi={oge.kayit.fiyatBandi}
                  kiraCarpani={oge.kayit.kiraCarpani}
                />
              ) : (
                <IlanKarti ilan={oge.ilan} />
              )}
            </SiraOgesi>
          ))}
        </YataySira>
      ) : (
        <BosDurum
          baslik="Bu sırada şu an taşınmaz yok"
          neden={sira.bosSebebi ?? 'Ölçüte uyan taşınmaz bulunmuyor.'}
          sade
        />
      )}
    </section>
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
