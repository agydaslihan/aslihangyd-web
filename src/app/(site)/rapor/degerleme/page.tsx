import type { Metadata } from 'next'

import { RaporBolumu, RaporKabugu, RaporSatiri } from '@/components/rapor/RaporKabugu'
import { BosDurum } from '@/components/ui/BosDurum'
import { Buton } from '@/components/ui/Buton'
import { m2Yaz, paraYaz, sayiYaz } from '@/lib/bicimlendirme'
import {
  BINA_DURUMLARI,
  degerlemeYap,
  GUVEN_ETIKETLERI,
  KAT_TIPLERI,
  type BinaDurumu,
  type KatTipi,
} from '@/lib/degerleme/motor'
import {
  metinParametresi,
  sayiParametresi,
  secimParametresi,
  type SorguParametreleri,
} from '@/lib/rapor/parametreler'
import { mutlakAdres } from '@/lib/site'
import { bolumKapisi } from '@/lib/veri/siteBolumleri'
import { degerlemeKatsayilariniGetir } from '@/lib/veri/degerleme'
import { mahalleleriGetir } from '@/lib/veri/mahalleler'

export const metadata: Metadata = {
  title: 'Değerleme raporu',
  description: 'Taşınmazınızın tahmini değer aralığı ve hesabın tam dökümü.',
  alternates: { canonical: mutlakAdres('/rapor/degerleme') },
  robots: { index: false, follow: false },
}

const ARAC_ADRESI = '/degerleme'
const KAT_DEGERLERI = KAT_TIPLERI.map((tip) => tip.value)
const DURUM_DEGERLERI = BINA_DURUMLARI.map((tip) => tip.value)

function katEtiketi(deger: KatTipi | null): string {
  return KAT_TIPLERI.find((tip) => tip.value === deger)?.label ?? 'Belirtilmedi'
}

function durumEtiketi(deger: BinaDurumu | null): string {
  return BINA_DURUMLARI.find((tip) => tip.value === deger)?.label ?? 'Belirtilmedi'
}

export default async function DegerlemeRaporu({
  searchParams,
}: {
  searchParams: Promise<SorguParametreleri>
}) {
  // ⚠️ Bölüm kapısı EN BAŞTA: kapalıysa hiçbir veri sorgusu çalışmasın
  // ve kapalı bölümün verisi RSC yüküne girmesin.
  await bolumKapisi('raporlar')

  const [parametreler, mahalleler, katsayilar] = await Promise.all([
    searchParams,
    mahalleleriGetir(),
    degerlemeKatsayilariniGetir(),
  ])

  const mahalleSlug = metinParametresi(parametreler, 'mahalle')
  const mahalle = mahalleler.find((aday) => aday.slug === mahalleSlug) ?? null

  const kat = secimParametresi<KatTipi>(parametreler, 'kat', KAT_DEGERLERI)
  const durum = secimParametresi<BinaDurumu>(parametreler, 'durum', DURUM_DEGERLERI)
  const brutM2 = sayiParametresi(parametreler, 'm2')
  const binaYasi = sayiParametresi(parametreler, 'yas')

  const sonuc = degerlemeYap(
    {
      // ⚠️ m² fiyatı URL'den DEĞİL, mahalle kaydından okunuyor. Taban fiyatı
      // sorgu dizesinden almak, adres çubuğunu düzenleyen herkese istediği
      // değeri veren bir "aslihangyd.com raporu" üretme imkânı verirdi.
      mahalleM2Fiyati: mahalle?.ortalamaM2Satis ?? null,
      gozlemSayisi: mahalle?.gozlemSayisi ?? null,
      brutM2,
      kat,
      binaYasi,
      durum,
    },
    katsayilar,
  )

  if (sonuc.durum !== 'hesaplandi') {
    return (
      <div className="kapsayici py-10 sm:py-14">
        <div className="mx-auto max-w-2xl">
          <BosDurum
            baslik="Rapor üretilemedi"
            neden={
              sonuc.durum === 'veri_yok' && sonuc.sebep === 'mahalle_verisi_yok'
                ? 'Bu mahalle için henüz yeterli fiyat gözlemi biriktirmedik. Gerçek gözleme dayanmayan bir rakam üretmiyoruz — bu bilinçli bir kapı.'
                : 'Bu rapor için gereken bilgiler bağlantıda eksik. Değerleme aracına dönüp bilgileri girdikten sonra rapor bağlantısı yeniden oluşacak.'
            }
            eylem={
              <div className="flex flex-wrap justify-center gap-3">
                <Buton href={ARAC_ADRESI}>Değerlemeye dön</Buton>
                <Buton href="/iletisim?tip=degerleme" gorunum="ikincil">
                  Yerinde değerleme isteyin
                </Buton>
              </div>
            }
          />
        </div>
      </div>
    )
  }

  const veri = sonuc.veri

  return (
    <RaporKabugu
      baslik="Değerleme raporu"
      altBaslik={`${mahalle?.ad ?? 'Mahalle'} · ${m2Yaz(brutM2) ?? ''} — tahmini değer aralığı ve hesabın tam dökümü.`}
      geriAdres={ARAC_ADRESI}
      geriEtiket="Değerlemeye dön"
      girdiOzeti={[
        { etiket: 'Mahalle', deger: mahalle?.ad ?? '—' },
        { etiket: 'Brüt alan', deger: m2Yaz(brutM2) ?? '—' },
        { etiket: 'Bulunduğu kat', deger: katEtiketi(kat) },
        { etiket: 'Bina yaşı', deger: binaYasi === null ? 'Belirtilmedi' : `${binaYasi}` },
        { etiket: 'Yapının durumu', deger: durumEtiketi(durum) },
        {
          etiket: 'Mahalle m² fiyatı',
          deger: paraYaz(mahalle?.ortalamaM2Satis) ?? '—',
        },
      ]}
    >
      <RaporBolumu baslik="Tahmini değer aralığı">
        <div className="border-kenar bg-yuzey rounded-kart border-[0.5px] p-5">
          <p className="rakam text-[1.5rem] leading-tight font-medium sm:text-[1.75rem]">
            {paraYaz(veri.altDeger)} – {paraYaz(veri.ustDeger)}
          </p>
          <p className="text-metin-2 mt-2 text-govde-kucuk leading-relaxed">
            Güven düzeyi: <strong>{GUVEN_ETIKETLERI[veri.guvenDuzeyi]}</strong>
            {veri.gozlemSayisi !== null ? (
              <>
                {' '}
                · bu mahallede <strong className="rakam">{sayiYaz(veri.gozlemSayisi)}</strong>{' '}
                gözleme dayanıyor
              </>
            ) : (
              ' · gözlem sayısı kayıtlı değil'
            )}
          </p>
          <p className="text-metin-3 text-mikro mt-3 leading-relaxed">
            Nokta değer değil <strong>aralık</strong> veriyoruz. &quot;Eviniz tam olarak şu kadar
            eder&quot; demek, sahip olmadığımız bir kesinliği iddia etmek olur. Veri azaldıkça
            aralık genişler ve güven düzeyi düşer — bu bir kusur değil, dürüstlüğün gereği.
          </p>
        </div>
      </RaporBolumu>

      <RaporBolumu
        baslik="Hesap nasıl yapıldı?"
        aciklama="Model çarpımsal ve tamamen şeffaftır; makine öğrenmesi kullanılmaz. Açıklanamayan bir değerleme, güven değil şüphe üretir."
      >
        <dl>
          <RaporSatiri
            etiket="Mahalle medyan m² fiyatı"
            deger={paraYaz(mahalle?.ortalamaM2Satis)}
            aciklama="Kendi gözlem verimizden"
          />
          {veri.etkiler.map((etki) => (
            <RaporSatiri
              key={etki.ad}
              etiket={etki.ad}
              deger={`× ${etki.katsayi.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`}
              aciklama={etki.aciklama}
            />
          ))}
          <RaporSatiri etiket="Düzeltilmiş m² birim fiyatı" deger={paraYaz(veri.m2BirimFiyati)} />
          <RaporSatiri
            etiket={`Değer aralığı (±%${veri.aralikYuzdesi.toLocaleString('tr-TR')})`}
            deger={`${paraYaz(veri.altDeger)} – ${paraYaz(veri.ustDeger)}`}
            vurgulu
          />
        </dl>
      </RaporBolumu>

      {veri.katilmayanFaktorler.length > 0 ? (
        <RaporBolumu
          baslik="Hesaba katılamayan faktörler"
          aciklama="Katsayısı tanımlı olmayan bir faktör 1,00 sayılmaz — bu, ayarlama yapılmış izlenimi verirdi. O faktör hesaba hiç girmez ve burada adıyla belirtilir."
        >
          <ul className="text-metin-2 list-disc space-y-1.5 pl-5 text-govde-kucuk leading-relaxed">
            {veri.katilmayanFaktorler.map((faktor) => (
              <li key={faktor}>{faktor}</li>
            ))}
          </ul>
        </RaporBolumu>
      ) : null}

      <RaporBolumu baslik="Bu raporun sınırları">
        <ul className="text-metin-2 list-disc space-y-1.5 pl-5 text-govde-kucuk leading-relaxed">
          <li>
            <strong>
              Bu tahmin bilgilendirme amaçlıdır; SPK lisanslı gayrimenkul değerleme raporu yerine
              geçmez.
            </strong>
          </li>
          <li>
            Model mahalle seviyesinde çalışır. Aynı mahallede iki sokak, hatta aynı binada iki daire
            arasında ciddi fark olabilir.
          </li>
          <li>
            Manzara, cephe, otopark, asansör, site içi olma ve iç mekân kalitesi hesaba
            katılmamıştır.
          </li>
          <li>
            Fiyat verisi <strong>istenen fiyatlara</strong> dayanır; gerçekleşen satış fiyatı
            genellikle bunun altındadır.
          </li>
        </ul>
      </RaporBolumu>

      <div className="mt-8" data-yazdirma="gizle">
        <div className="border-kenar bg-vurgu-zemin rounded-kart border-[0.5px] p-5">
          <p className="text-govde-kucuk leading-relaxed">
            Bu aralığı daraltmak için taşınmazı yerinde görmek gerekir: cephe, manzara, iç durum ve
            binanın kendisi rakamı ciddi biçimde değiştirir.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Buton href="/iletisim?tip=degerleme" boyut="kucuk">
              Yerinde değerleme isteyin
            </Buton>
            <Buton href="/araclar/kira-getirisi" gorunum="ikincil" boyut="kucuk">
              Kira getirisini hesaplayın
            </Buton>
          </div>
        </div>
      </div>
    </RaporKabugu>
  )
}
