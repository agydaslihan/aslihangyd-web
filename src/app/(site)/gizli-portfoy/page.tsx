import type { Metadata } from 'next'

import { Bolum } from '@/components/ui/Bolum'
import { BosDurum } from '@/components/ui/BosDurum'
import { Buton } from '@/components/ui/Buton'
import { AlanIkon, KonumIkon, OdaIkon, OkIkon } from '@/components/ui/Ikon'
import { Rozet } from '@/components/ui/Rozet'
import { carpanYaz, sayiYaz } from '@/lib/bicimlendirme'
import { etiketBul, ILAN_KATEGORILERI, ILAN_TIPLERI, ODA_SAYILARI } from '@/lib/secenekler'
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
      <section className="border-cizgi border-b">
        <div className="kapsayici py-12 sm:py-16">
          <div className="max-w-3xl">
            <p className="text-pirinc-koyu text-mikro font-semibold tracking-[0.1em] uppercase">
              Off-market
            </p>

            <h1 className="mt-4 text-[2rem] leading-tight sm:text-[2.75rem]">
              Yayınlanmayan portföy
            </h1>

            {sayi > 0 ? (
              <p className="text-murekkep-2 mt-4 text-lg">
                Şu anda{' '}
                <strong className="rakam text-murekkep font-semibold">{sayiYaz(sayi)}</strong>{' '}
                taşınmaz — hiçbir ilan sitesinde yok.
              </p>
            ) : null}

            <p className="text-murekkep-2 mt-4 max-w-2xl leading-relaxed">
              Bazı mülk sahipleri taşınmazlarının ilan sitelerinde görünmesini istemez: kiracısı
              bilmesin, komşusu duymasın, iş ortakları öğrenmesin. Bu taşınmazları yayınlamıyoruz —
              ama var olduklarını söylüyoruz.
            </p>

            <p className="text-murekkep-3 mt-3 max-w-2xl text-sm leading-relaxed">
              Aşağıda mahalle, kategori, büyüklük aralığı ve fiyat bandını görüyorsunuz. Tam adres,
              fotoğraflar ve kat planı yalnızca erişim talebi onaylandıktan sonra paylaşılır. Onay
              adımı elle yapılır ve bu bilinçlidir.
            </p>
          </div>
        </div>
      </section>

      <Bolum>
        {kayitlar.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {kayitlar.map((kayit) => (
              <li
                key={kayit.id}
                className="border-cizgi bg-yuzey rounded-yumusak flex flex-col gap-3 border p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Rozet ton="lacivert">{etiketBul(ILAN_TIPLERI, kayit.tip)}</Rozet>
                  <Rozet>{etiketBul(ILAN_KATEGORILERI, kayit.kategori)}</Rozet>
                </div>

                <div className="flex flex-col gap-1.5">
                  {kayit.mahalleAdi ? (
                    <p className="flex items-center gap-1.5 font-medium">
                      <KonumIkon width={15} height={15} className="shrink-0" />
                      {kayit.mahalleAdi} Mah.
                    </p>
                  ) : null}

                  <p className="text-murekkep-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    {kayit.odaSayisi ? (
                      <span className="inline-flex items-center gap-1.5">
                        <OdaIkon width={14} height={14} />
                        {etiketBul(ODA_SAYILARI, kayit.odaSayisi)}
                      </span>
                    ) : null}
                    {kayit.m2Araligi ? (
                      <span className="inline-flex items-center gap-1.5">
                        <AlanIkon width={14} height={14} />
                        {kayit.m2Araligi}
                      </span>
                    ) : null}
                  </p>
                </div>

                <p className="rakam text-lg font-semibold">
                  {kayit.fiyatBandi ?? (
                    <span className="text-murekkep-2 text-base font-normal">
                      Fiyat görüşmeye açık
                    </span>
                  )}
                </p>

                {kayit.kiraCarpani !== null ? (
                  <Rozet ton="lacivert">Kira çarpanı ~{carpanYaz(kayit.kiraCarpani)}</Rozet>
                ) : null}

                {/* Kilitli alanlar — sunucudan hiç gönderilmiyor, burada
                    yalnızca neyin gizli olduğu anlatılıyor. */}
                <div className="border-cizgi text-murekkep-3 mt-auto border-t pt-3 text-mikro">
                  <p>🔒 Adres, fotoğraflar ve kat planı kilitli</p>
                </div>

                <Buton
                  href={`/iletisim?tip=alici&mesaj=${encodeURIComponent(`Gizli portföy #${kayit.id} için erişim talep ediyorum.`)}`}
                  gorunum="ikincil"
                  boyut="kucuk"
                  tamGenislik
                >
                  Erişim talep et
                </Buton>
              </li>
            ))}
          </ul>
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
          <h2 className="text-[1.5rem] leading-tight">Erişim nasıl açılıyor?</h2>
          <ol className="text-murekkep-2 mt-4 flex flex-col gap-3 text-[0.9375rem] leading-relaxed">
            <li className="flex gap-3">
              <span className="bg-lacivert-acik text-lacivert rakam flex size-6 shrink-0 items-center justify-center rounded-full text-mikro font-semibold">
                1
              </span>
              Erişim talebinde bütçenizi, amacınızı ve zaman ufkunuzu kısaca yazarsınız.
            </li>
            <li className="flex gap-3">
              <span className="bg-lacivert-acik text-lacivert rakam flex size-6 shrink-0 items-center justify-center rounded-full text-mikro font-semibold">
                2
              </span>
              Talebi elle değerlendiriyoruz. Otomatik erişim vermiyoruz — portföyü rakibe açmanın en
              kolay yolu bu olurdu.
            </li>
            <li className="flex gap-3">
              <span className="bg-lacivert-acik text-lacivert rakam flex size-6 shrink-0 items-center justify-center rounded-full text-mikro font-semibold">
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
