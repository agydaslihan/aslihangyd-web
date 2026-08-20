import type { Metadata } from 'next'

import { SayfaVitrini } from '@/components/duzen/SayfaVitrini'
import { Bolum, Eyebrow } from '@/components/ui/Bolum'
import { BosDurum } from '@/components/ui/BosDurum'
import { Buton } from '@/components/ui/Buton'
import { KilitliKart } from '@/components/ui/KilitliKart'
import { OkIkon } from '@/components/ui/Ikon'
import { sayiYaz } from '@/lib/bicimlendirme'
import { etiketBul, ODA_SAYILARI } from '@/lib/secenekler'
import { mutlakAdres } from '@/lib/site'
import { bolumKapisi } from '@/lib/veri/siteBolumleri'
import { gizliPortfoySayisi, gizliPortfoyuGetir } from '@/lib/veri/gizliPortfoy'

export const metadata: Metadata = {
  title: 'Yayınlanmayan portföy — Çorlu off-market taşınmazlar',
  description:
    'Hiçbir ilan sitesinde olmayan taşınmazlar. Mahalle, kategori ve fiyat bandı açık; ' +
    'adres ve fotoğraflar erişim talebiyle paylaşılır.',
  alternates: { canonical: mutlakAdres('/gizli-portfoy') },
  // Off-market portföy arama sonuçlarında öne çıkmamalı; sayfanın kendisi
  // indekslenir ama kayıtlar zaten maskeli.
  robots: { index: true, follow: true },
}

export default async function GizliPortfoySayfasi() {
  // ⚠️ Bölüm kapısı EN BAŞTA: kapalıysa hiçbir veri sorgusu çalışmasın
  // ve kapalı bölümün verisi RSC yüküne girmesin.
  await bolumKapisi('gizli_portfoy')

  const [kayitlar, sayi] = await Promise.all([gizliPortfoyuGetir(), gizliPortfoySayisi()])

  return (
    <>
      <SayfaVitrini>
        <Eyebrow>Off-market</Eyebrow>

        <h1 className="text-metin mt-4 font-serif text-baslik-1-mobil font-medium sm:text-baslik-1">
          Yayınlanmayan portföy
        </h1>

        {/* ⚠️ Sayı SAYILIYOR; sıfırsa cümle hiç kurulmuyor (kural 2). */}
        {sayi > 0 ? (
          <p className="text-metin-2 mt-5 text-govde leading-relaxed">
            Şu anda <strong className="rakam text-metin font-medium">{sayiYaz(sayi)}</strong>{' '}
            taşınmaz — hiçbir ilan sitesinde yok.
          </p>
        ) : null}

        <p className="text-metin-2 mt-4 text-govde leading-relaxed">
          Bazı mülk sahipleri taşınmazlarının ilan sitelerinde görünmesini istemez: kiracısı
          bilmesin, komşusu duymasın, iş ortakları öğrenmesin. Bu taşınmazları yayınlamıyoruz — ama
          var olduklarını söylüyoruz.
        </p>

        <p className="text-metin-3 mt-3 text-govde-kucuk leading-relaxed">
          Aşağıda mahalle, kategori, büyüklük aralığı ve fiyat bandını görüyorsunuz. Tam adres,
          fotoğraflar ve kat planı yalnızca erişim talebi onaylandıktan sonra paylaşılır. Onay adımı
          elle yapılır ve bu bilinçlidir.
        </p>
      </SayfaVitrini>

      <Bolum>
        {kayitlar.length > 0 ? (
          <>
            {/*
              ⚠️ Kartlar portföy sayfasındakiyle AYNI bileşen. Gizli
              portföye özel bir kart çizmek, "bunlar farklı bir şey"
              izlenimi verirdi; oysa aynı portföyün paylaşılmamış kısmı.
              Fotoğrafın yerinde çapraz doku var — bulanık görsel değil,
              çünkü bulanık görsel yine de indirilir.
            */}
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
              {kayitlar.map((kayit) => (
                <li key={kayit.id}>
                  <KilitliKart
                    mahalleAdi={kayit.mahalleAdi}
                    odaSayisi={
                      kayit.odaSayisi ? (etiketBul(ODA_SAYILARI, kayit.odaSayisi) ?? null) : null
                    }
                    m2Araligi={kayit.m2Araligi}
                    fiyatBandi={kayit.fiyatBandi}
                    kiraCarpani={kayit.kiraCarpani}
                    talepAdresi={`/iletisim?tip=alici&mesaj=${encodeURIComponent(
                      `Gizli portföy #${kayit.id} için erişim talep ediyorum.`,
                    )}`}
                  />
                </li>
              ))}
            </ul>

            {/*
              ⚠️ Bakır aksanın iki kullanımından İKİNCİSİ. Kart üzerindeki
              "Erişim talep et" bakır METİN; dolu bakır zemin yalnızca bu
              sayfa düzeyindeki tek çağrıda.
            */}
            <div className="mt-8 flex justify-center">
              <Buton
                href="/iletisim?tip=alici&mesaj=Gizli%20portf%C3%B6ye%20eri%C5%9Fim%20talep%20ediyorum."
                gorunum="aksan"
                boyut="buyuk"
              >
                Erişim talep et
              </Buton>
            </div>
          </>
        ) : (
          <BosDurum
            baslik="Şu anda yayınlanmayan portföyümüz yok"
            neden="Off-market taşınmazlar düzenli olarak değişir. Aradığınız özellikleri bize bırakın; portföyümüze uygun bir taşınmaz girdiğinde ilk siz haberdar olun."
            eylem={<Buton href="/iletisim?tip=alici">Aradığınızı anlatın</Buton>}
          />
        )}
      </Bolum>

      <Bolum zemin="yuzey">
        <div className="max-w-2xl">
          <h2 className="font-serif text-baslik-2-mobil font-medium">Erişim nasıl açılıyor?</h2>
          <ol className="text-metin-2 mt-4 flex flex-col gap-3 text-govde leading-relaxed">
            <li className="flex gap-3">
              <span className="bg-vurgu-zemin text-vurgu rakam flex size-6 shrink-0 items-center justify-center rounded-full text-mikro font-medium">
                1
              </span>
              Erişim talebinde bütçenizi, amacınızı ve zaman ufkunuzu kısaca yazarsınız.
            </li>
            <li className="flex gap-3">
              <span className="bg-vurgu-zemin text-vurgu rakam flex size-6 shrink-0 items-center justify-center rounded-full text-mikro font-medium">
                2
              </span>
              Talebi elle değerlendiriyoruz. Otomatik erişim vermiyoruz — portföyü rakibe açmanın en
              kolay yolu bu olurdu.
            </li>
            <li className="flex gap-3">
              <span className="bg-vurgu-zemin text-vurgu rakam flex size-6 shrink-0 items-center justify-center rounded-full text-mikro font-medium">
                3
              </span>
              Uygunsa sizinle doğrudan iletişime geçip taşınmazın tüm detaylarını paylaşıyoruz.
            </li>
          </ol>

          <div className="mt-6">
            <Buton href="/iletisim?tip=alici">
              Erişim talebinde bulunun
              <OkIkon width={16} height={16} />
            </Buton>
          </div>
        </div>
      </Bolum>
    </>
  )
}
