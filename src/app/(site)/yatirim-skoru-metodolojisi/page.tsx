import type { Metadata } from 'next'
import Link from 'next/link'

import { Feragat } from '@/components/ui/Feragat'
import { mesafeYaz } from '@/lib/bicimlendirme'
import { mutlakAdres } from '@/lib/site'
import {
  ASGARI_KAPSAM,
  BILESEN_ACIKLAMALARI,
  BILESEN_ETIKETLERI,
  SKOR_AGIRLIKLARI,
  type SkorBileseniAdi,
} from '@/lib/skorlama/yatirimSkoru'
// ⚠️ Eğriler ve ağırlıklar motorun kendisinden okunuyor — yayınlanan
// metodoloji ile çalışan hesap tek kaynaktan gelsin diye.
import {
  ASGARI_KARSILASTIRMA,
  SANAYI_EGRISI,
  SOSYAL_DONATI_AGIRLIKLARI,
  ULASIM_KALEMLERI,
} from '@/lib/yakinlik/motor'
import { YOGUNLUK_YARICAPI_METRE } from '@/lib/yakinlik/tipler'

export const metadata: Metadata = {
  title: 'Yatırım Skoru metodolojisi',
  description:
    'Mahalle Yatırım Skoru nasıl hesaplanır? Altı bileşen, ağırlıkları, veri kaynakları ' +
    've skorun sınırları.',
  alternates: { canonical: mutlakAdres('/yatirim-skoru-metodolojisi') },
}

/**
 * Yatırım Skoru metodolojisi.
 *
 * ⚠️ "Bu mahalle 87/100" demek, gerekçesi yoksa hem güvenilmez hem hukuken
 * risklidir (PROJE-PLANI.md §1.5). Bu sayfa o gerekçedir ve skorun
 * gösterildiği her yerden buraya link verilir.
 */
export default function SkorMetodolojisiSayfasi() {
  const bilesenler = Object.keys(SKOR_AGIRLIKLARI) as SkorBileseniAdi[]

  return (
    <div className="kapsayici py-10 sm:py-14">
      <article className="max-w-2xl">
        <h1 className="font-serif text-baslik-1-mobil font-medium sm:text-baslik-1">
          Yatırım Skoru metodolojisi
        </h1>

        <p className="text-metin-2 mt-4 text-baslik-3 leading-relaxed">
          Bir mahalleye puan vermek kolaydır; o puanın arkasında durmak zordur. Bu sayfa skorun
          nasıl hesaplandığını, hangi verilerden beslendiğini ve neyi ölçmediğini anlatır.
        </p>

        <section className="mt-10">
          <h2 className="text-baslik-3 font-medium">Altı bileşen</h2>
          <p className="text-metin-2 mt-3 leading-relaxed">
            Skor 0–100 arasıdır ve altı bileşenin ağırlıklı ortalamasıdır. Her bileşen kendi içinde
            0–100&apos;e ölçeklenir.
          </p>

          <div className="border-kenar rounded-kart mt-5 overflow-x-auto border-[0.5px]">
            <table className="w-full min-w-[30rem] border-collapse text-govde-kucuk">
              <caption className="yalnizca-okuyucu">
                Yatırım skoru bileşenleri ve ağırlıkları
              </caption>
              <thead>
                <tr className="border-kenar bg-yuzey-2 border-b-[0.5px]">
                  <th scope="col" className="px-4 py-3 text-left font-medium">
                    Bileşen
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Ağırlık
                  </th>
                </tr>
              </thead>
              <tbody className="divide-kenar divide-y">
                {bilesenler.map((ad) => (
                  <tr key={ad}>
                    <td className="px-4 py-3">
                      <span className="font-medium">{BILESEN_ETIKETLERI[ad]}</span>
                      <span className="text-metin-3 block text-mikro leading-snug">
                        {BILESEN_ACIKLAMALARI[ad]}
                      </span>
                    </td>
                    <td className="rakam px-4 py-3 text-right font-medium align-top">
                      %{SKOR_AGIRLIKLARI[ad]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-baslik-3 font-medium">Bazı bileşenler ters yönlüdür</h2>
          <p className="text-metin-2 mt-3 leading-relaxed">
            <strong className="text-metin font-medium">Kira çarpanı:</strong> düşük çarpan yatırımcı
            lehinedir (taşınmaz kendini daha kısa sürede öder), bu yüzden düşük çarpan yüksek puan
            alır.
          </p>
          <p className="text-metin-2 mt-3 leading-relaxed">
            <strong className="text-metin font-medium">Arz baskısı:</strong> çok sayıda devam eden
            inşaat projesi, gelecekte yüksek arz ve fiyat baskısı demektir — düşük puan alır.
          </p>
        </section>

        {/*
          ⚠️ Bu bölümdeki rakamlar sabit yazılmadı; motorun kendisinden
          okunuyor. Eğri kodda değişirse bu sayfa da değişir. Metodoloji
          sayfası ile hesabın ayrı ayrı yaşaması, yayınlanan metodolojinin
          en sık görülen sessiz yalanıdır.
        */}
        <section className="mt-10">
          <h2 className="text-baslik-3 font-medium">
            Konum bileşenleri mesafeden nasıl türetilir?
          </h2>
          <p className="text-metin-2 mt-3 leading-relaxed">
            Sanayi yakınlığı, ulaşım ve sosyal donatı bileşenleri için sisteme girilmiş ilgi
            noktalarının koordinatlarından{' '}
            <strong className="text-metin font-medium">kuş uçuşu</strong> mesafe hesaplanır.
          </p>
          <p className="text-metin-2 mt-3 leading-relaxed">
            <strong className="text-metin font-medium">Süre (dakika) vermiyoruz.</strong> Sürüş
            süresi için yol ağı verisi ve rotalama gerekir; elimizde yok. Mesafeyi varsayılan bir
            hıza bölüp &quot;10 dakika&quot; yazmak, bilmediğimiz bir şeyi iddia etmek olurdu.
          </p>

          <h3 className="font-sans text-govde mt-6 font-medium">
            Sanayi yakınlığı: yakın iyidir, çok yakın değildir
          </h3>
          <p className="text-metin-2 mt-2 leading-relaxed">
            Bu bileşen sanayiyi bir <em>kira talebi motoru</em> olarak ölçer: OSB&apos;ye işe
            gidilebilir mesafede olmak değerlidir. Ama OSB&apos;nin dibinde oturmak gürültü, ağır
            araç trafiği ve hava kalitesi demektir. Bu yüzden eğri monoton değildir — en yüksek puan
            orta banttadır.
          </p>
          <ul className="text-metin-2 mt-3 list-disc space-y-1.5 pl-5 leading-relaxed">
            {SANAYI_EGRISI.map((nokta) => (
              <li key={nokta.metre}>
                <span className="tabular-nums">{mesafeYaz(nokta.metre)}</span> →{' '}
                <strong className="text-metin font-medium tabular-nums">{nokta.puan} puan</strong>
              </li>
            ))}
          </ul>
          <p className="text-metin-3 text-govde-kucuk mt-2">
            Ara mesafelerde doğrusal geçiş yapılır; ilk noktanın altında ve son noktanın üstünde
            puan sabittir.
          </p>

          <h3 className="font-sans text-govde mt-6 font-medium">
            Ulaşım: üç kalemin ağırlıklı ortalaması
          </h3>
          <ul className="text-metin-2 mt-2 list-disc space-y-1.5 pl-5 leading-relaxed">
            {(Object.keys(ULASIM_KALEMLERI) as (keyof typeof ULASIM_KALEMLERI)[]).map((tip) => {
              const kalem = ULASIM_KALEMLERI[tip]
              const ilk = kalem.egri[0]
              const son = kalem.egri[kalem.egri.length - 1]
              return (
                <li key={tip}>
                  <strong className="text-metin font-medium">{kalem.etiket}</strong> — ağırlık %
                  {kalem.agirlik}
                  {ilk && son ? (
                    <span className="text-metin-3">
                      {' '}
                      · {mesafeYaz(ilk.metre)} ve yakınında {ilk.puan} puan, {mesafeYaz(son.metre)}{' '}
                      ve ötesinde {son.puan} puan
                    </span>
                  ) : null}
                </li>
              )
            })}
          </ul>
          <p className="text-metin-2 mt-3 leading-relaxed">
            Verisi olmayan kalem puanı <strong className="text-metin font-medium">düşürmez</strong>;
            hesaptan çıkarılır ve mevcut kalemler kendi içinde normalize edilir.
          </p>

          <h3 className="font-sans text-govde mt-6 font-medium">
            Sosyal donatı: mutlak eşik yerine karşılaştırma
          </h3>
          <p className="text-metin-2 mt-2 leading-relaxed">
            &quot;1 km içinde 8 donatı iyidir&quot; gibi bir eşik kullanmıyoruz — böyle bir eşiği
            biz uydurmuş oluruz. Bunun yerine puan iki parçadan oluşur:{' '}
            <strong className="text-metin font-medium">yoğunluk</strong> (%
            {SOSYAL_DONATI_AGIRLIKLARI.yogunluk}) en yoğun mahalleye oranla, ve{' '}
            <strong className="text-metin font-medium">çeşitlilik</strong> (%
            {SOSYAL_DONATI_AGIRLIKLARI.cesitlilik}) verisi olan donatı türlerinden kaçının{' '}
            {YOGUNLUK_YARICAPI_METRE / 1000} km içinde bulunduğu.
          </p>
          <p className="text-metin-2 mt-3 leading-relaxed">
            Karşılaştırmalı puanlama en az {ASGARI_KARSILASTIRMA} mahalle ister. Daha azıyla
            &quot;en yoğun olan 100 puan&quot; demek kıyas değil, etiketleme olurdu.
          </p>

          <h3 className="font-sans text-govde mt-6 font-medium">
            Kayıt yokluğu, donatı yokluğu değildir
          </h3>
          <p className="text-metin-2 mt-2 leading-relaxed">
            Bu hesap yalnızca <em>sisteme girilmiş</em> noktaları görür. Bir mahalleye henüz okul
            girilmediyse, hesap onu &quot;donatısı zayıf&quot; sanır. Bu yüzden mesafeden çıkan
            puanlar skora <strong className="text-metin font-medium">otomatik yazılmaz</strong>:
            sistem öneri üretir, danışman değerlendirir ve alanı kendisi doldurur. Veri eksikliğinin
            sessizce olguya dönüşmesine izin vermiyoruz.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-baslik-3 font-medium">Fiyat trendi neden göreli ölçülüyor?</h2>
          <p className="text-metin-2 mt-3 leading-relaxed">
            Yüksek enflasyon ortamında her mahallenin fiyatı yükselir. Mutlak artışı puanlasaydık,
            her mahalleye yüksek puan verirdik ve skor hiçbir şey ayırt etmezdi.
          </p>
          <p className="text-metin-2 mt-3 leading-relaxed">
            Bunun yerine mahallenin değişimi{' '}
            <strong className="text-metin font-medium">diğer Çorlu mahalleleriyle</strong>{' '}
            karşılaştırılarak puanlanır: benzer performansta 50 puan, üstünde yüksek, altında düşük.
          </p>
          {/*
            ⚠️ Buradaki ifade bilinçli olarak "karşılaştırıyoruz" değil
            "karşılaştırılarak puanlanır".

            Sistem şu an bir "Çorlu ortalaması" HESAPLAMIYOR: karşılaştırmayı
            danışman yapıyor ve sonucu 0–100 olarak giriyor. Bunu
            "karşılaştırıyoruz" diye yazmak, yapmadığımız bir hesabı
            yaptığımızı iddia etmek olurdu.

            Ortalamayı otomatik hesaplamak için yeterli mahalle verisi yok;
            aynı ilkeyi bölge radarı da uyguluyor ve az sayıda mahallenin
            medyanını "Çorlu ortalaması" diye sunmayı reddediyor.
          */}
          <p className="text-metin-3 text-govde-kucuk mt-3">
            Bu karşılaştırmayı şu an danışman yapıyor; sistem kendiliğinden bir Çorlu ortalaması
            hesaplamıyor. Yeterli mahalle verisi biriktiğinde otomatikleşecek.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-baslik-3 font-medium">Yetersiz veriyle skor vermiyoruz</h2>
          <p className="text-metin-2 mt-3 leading-relaxed">
            Bir mahallenin skoru, bileşenlerin en az{' '}
            <strong className="text-metin font-medium">%{ASGARI_KAPSAM * 100}</strong>
            &apos;lik ağırlığı için veri varsa hesaplanır. Altındaysa skor hiç gösterilmez.
          </p>
          <p className="text-metin-2 mt-3 leading-relaxed">
            Eksik bir bileşeni sıfır saymak mahalleyi haksız yere cezalandırırdı; ortalama saymak
            ise veri uydurmak olurdu. İkisini de yapmıyoruz.
          </p>
          <p className="text-metin-2 mt-3 leading-relaxed">
            Skor gösterildiğinde{' '}
            <strong className="text-metin font-medium">
              altı bileşenin kırılımı da her zaman gösterilir
            </strong>{' '}
            — hangi bileşende veri olmadığı dahil. Kara kutu puan yayınlamıyoruz.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-baslik-3 font-medium">Veri kaynakları</h2>
          <ul className="text-metin-2 mt-3 list-disc space-y-1.5 pl-5 leading-relaxed">
            <li>
              <strong className="text-metin font-medium">Fiyat trendi ve kira çarpanı:</strong>{' '}
              kendi gözlem kayıtlarımız (bkz.{' '}
              <Link href="/endeks-metodolojisi" className="text-vurgu underline underline-offset-2">
                endeks metodolojisi
              </Link>
              )
            </li>
            <li>
              <strong className="text-metin font-medium">Sanayi yakınlığı ve ulaşım:</strong>{' '}
              coğrafi mesafe hesabı
            </li>
            <li>
              <strong className="text-metin font-medium">Sosyal donatı:</strong> ilgi noktası (POI)
              yoğunluğu
            </li>
            <li>
              <strong className="text-metin font-medium">Arz baskısı:</strong> devam eden projelerin
              elle girilen kayıtları
            </li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-baslik-3 font-medium">Bu skor ne DEĞİLDİR?</h2>
          <ul className="text-metin-2 mt-3 list-disc space-y-1.5 pl-5 leading-relaxed">
            <li>Belirli bir taşınmazın değerini veya getirisini göstermez.</li>
            <li>Gelecekteki fiyat hareketini tahmin etmez.</li>
            <li>Bir gayrimenkul değerleme raporu değildir.</li>
            <li>
              Yaşam kalitesi ölçmez — yatırım perspektifinden bakar. Oturmak için en iyi mahalle ile
              yatırım için en iyi mahalle aynı olmayabilir.
            </li>
            <li>Yatırım tavsiyesi değildir.</li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-baslik-3 font-medium">Ağırlıklar değişir mi?</h2>
          <p className="text-metin-2 mt-3 leading-relaxed">
            Ağırlıkları değiştirirsek bunu bu sayfada tarih vererek duyururuz. Sessizce değiştirilen
            bir metodoloji, metodoloji değildir.
          </p>
        </section>

        <div className="border-kenar mt-10 border-t-[0.5px] pt-6">
          <Feragat />
        </div>
      </article>
    </div>
  )
}
