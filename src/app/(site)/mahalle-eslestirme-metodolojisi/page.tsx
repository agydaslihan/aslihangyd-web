import type { Metadata } from 'next'
import Link from 'next/link'

import { SayfaVitrini } from '@/components/duzen/SayfaVitrini'
import { Eyebrow } from '@/components/ui/Bolum'
import { Feragat } from '@/components/ui/Feragat'
import { agirliklariHesapla, ASGARI_KAPSAM, ONERI_SAYISI } from '@/lib/eslestirme/motor'
import { OLCUT_ACIKLAMALARI, OLCUT_ETIKETLERI, type OlcutAdi } from '@/lib/eslestirme/tipler'
import { mutlakAdres } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Mahalle Eşleştirme metodolojisi',
  description:
    'Mahalle Eşleştirme Testi nasıl çalışır? Ölçütler, cevaplara göre değişen ağırlıklar, ' +
    'veri kaynakları ve testin sınırları.',
  alternates: { canonical: mutlakAdres('/mahalle-eslestirme-metodolojisi') },
}

/**
 * Eşleştirme metodolojisi.
 *
 * ⚠️ Bir ziyaretçiye "size Şeyhsinan uygun" demek, gerekçesi yayınlanmadan
 * yapılırsa en iyi ihtimalle boş bir iddia, en kötü ihtimalle portföyü öne
 * çıkarmanın örtülü bir yoludur. Bu sayfa o gerekçedir.
 */
export default function EslestirmeMetodolojisiSayfasi() {
  const oturmak = agirliklariHesapla({ amac: 'oturmak', butce: 1 })
  const yatirim = agirliklariHesapla({ amac: 'yatirim', butce: 1 })
  const olcutler = (Object.keys(oturmak) as OlcutAdi[]).sort(
    (a, b) => Math.max(oturmak[b], yatirim[b]) - Math.max(oturmak[a], yatirim[a]),
  )

  return (
    <>
      <SayfaVitrini>
        <Eyebrow>Metodoloji</Eyebrow>
        <h1 className="text-metin mt-4 font-baslik text-baslik-1-mobil font-medium sm:text-baslik-1">
          Mahalle Eşleştirme metodolojisi
        </h1>
        <p className="text-metin-2 mt-5 text-govde leading-relaxed">
          &quot;Size en uygun mahalle Şeyhsinan&quot; cümlesi, arkasındaki hesap gösterilmezse bir
          iddiadan ibarettir. Bu sayfa{' '}
          <Link href="/mahalle-testi" className="text-vurgu underline">
            Mahalle Eşleştirme Testi
          </Link>
          &apos;nin nasıl çalıştığını, neyi ölçtüğünü ve neyi ölçmediğini anlatır.
        </p>
      </SayfaVitrini>

      <div className="kapsayici py-12 sm:py-16">
        <article className="max-w-2xl">
          <section>
            <h2 className="text-baslik-3 font-medium">Önce en önemli iki cümle</h2>
            <div className="border-kenar bg-vurgu-zemin rounded-kart mt-4 border-[0.5px] p-5">
              <p className="leading-relaxed">
                <strong>Eşleştirme, portföyümüzdeki ilanlardan tamamen bağımsızdır.</strong> Bir
                mahallede kaç ilanımız olduğu hesaba hiç girmez. Test, elimizdeki evi satmanın bir
                yolu olsaydı, ilk yanlış öneride hem sizi hem itibarımızı kaybederdik.
              </p>
              <p className="mt-3 leading-relaxed">
                <strong>Sonucu görmek için hiçbir iletişim bilgisi gerekmez.</strong> Cevaplarınız
                tarayıcınızda kalır; siz göndermedikçe bize ulaşmaz.
              </p>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-baslik-3 font-medium">Dokuz ölçüt</h2>
            <p className="text-metin-2 mt-3 leading-relaxed">
              Her mahalle dokuz ölçütte 0–100 arası puanlanır. Ağırlıklar cevaplarınıza göre
              değişir; aşağıdaki tablo iki uç profili gösteriyor. Testi çözdüğünüzde{' '}
              <strong>size özel ağırlıklar sonuç ekranında aynen gösterilir.</strong>
            </p>

            <div className="border-kenar rounded-kart mt-5 overflow-x-auto border-[0.5px]">
              <table className="w-full min-w-[32rem] border-collapse text-govde-kucuk">
                <caption className="yalnizca-okuyucu">
                  Eşleştirme ölçütleri ve iki uç profildeki ağırlıkları
                </caption>
                <thead>
                  <tr className="border-kenar bg-yuzey-2 border-b-[0.5px]">
                    <th scope="col" className="px-4 py-3 text-left font-medium">
                      Ölçüt
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Oturmak
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Yatırım
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-kenar divide-y">
                  {olcutler.map((olcut) => (
                    <tr key={olcut}>
                      <td className="px-4 py-3">
                        <span className="font-medium">{OLCUT_ETIKETLERI[olcut]}</span>
                        <span className="text-metin-3 text-mikro block leading-snug">
                          {OLCUT_ACIKLAMALARI[olcut]}
                        </span>
                      </td>
                      <td className="rakam px-4 py-3 text-right align-top">
                        %{oturmak[olcut].toLocaleString('tr-TR')}
                      </td>
                      <td className="rakam px-4 py-3 text-right align-top">
                        %{yatirim[olcut].toLocaleString('tr-TR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-metin-3 text-mikro mt-3 leading-relaxed">
              Tablodaki yüzdeler bütçe girildiği varsayımıyla hesaplandı. Bütçe girilmezse o ölçüt
              devre dışı kalır ve kalan ağırlıklar yeniden 100&apos;e normalize edilir.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-baslik-3 font-medium">
              Cevaplarınız ağırlıkları nasıl değiştirir?
            </h2>
            <ul className="text-metin-2 mt-3 list-disc space-y-2 pl-5 leading-relaxed">
              <li>
                <strong>Hanede çocuk varsa</strong> okul erişimi ağırlığı belirgin biçimde artar,
                sosyal donatı bir miktar yükselir.
              </li>
              <li>
                <strong>Araç kullanmıyorsanız</strong> toplu taşıma ve merkeze yakınlık öne çıkar;
                kullanıyorsanız ana artere erişim ağır basar.
              </li>
              <li>
                <strong>Sakinlik veya merkez tercihiniz</strong> ilgili ölçütü yükseltirken diğerini
                bir miktar düşürür — bu ikisi Çorlu&apos;da genellikle ters çalışır.
              </li>
              <li>
                <strong>Düzenli gittiğiniz bir nokta seçerseniz</strong> ulaşım puanı, o noktaya
                olan gerçek mesafeyle harmanlanır. &quot;Ulaşımı iyi&quot; genel bir yargıdır;{' '}
                &quot;işinize yakın&quot; kişiseldir.
              </li>
              <li>
                <strong>Zaman ufkunuz eşleştirmeyi etkilemez.</strong> Aceleci olana farklı mahalle
                önermek, aceleye getirmenin örtülü bir yolu olurdu.
              </li>
            </ul>
          </section>

          <section className="mt-10">
            <h2 className="text-baslik-3 font-medium">Bütçe nasıl puanlanıyor?</h2>
            <p className="text-metin-2 mt-3 leading-relaxed">
              Mutlak bir eşik <strong>kullanılmıyor</strong>. &quot;70 m² altı yetersizdir&quot;
              demek, bizim uydurduğumuz bir yaşam standardını size dayatmak olurdu. Bunun yerine
              karşılaştırmalı puanlama yapılıyor: bütçenizle en çok m² alabildiğiniz mahalle 100
              puan, diğerleri ona oranla puanlanır. Kullanılan tek veri mahallelerin gerçek ortalama
              m² fiyatları.
            </p>
            <p className="text-metin-2 mt-3 leading-relaxed">
              Bütçenizi kaydetmiyoruz. Hesap tarayıcınızda yapılır.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-baslik-3 font-medium">Veriler nereden geliyor?</h2>
            <p className="text-metin-2 mt-3 leading-relaxed">
              Dört ölçüt —{' '}
              <Link href="/yatirim-skoru-metodolojisi" className="text-vurgu underline">
                yatırım skorundan
              </Link>{' '}
              yeniden kullanılır: yatırım potansiyeli, sanayi yakınlığı, ulaşım ve sosyal donatı.
              Kalan dördü (toplu taşıma, okul erişimi, sakinlik, merkeze yakınlık) mahalleyi bilen
              birinin saha değerlendirmesidir ve yönetim panelinden girilir.
            </p>
            <p className="text-metin-2 mt-3 leading-relaxed">
              <strong>Bu puanların başlangıç değeri yoktur.</strong> Bizim &quot;makul görünen&quot;
              bir sakinlik puanı yazmamız, tahmini veri kılığında sunmak olurdu. Girilmemiş bir
              öznitelik hesaba katılmaz ve sonuç ekranında adıyla belirtilir.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-baslik-3 font-medium">Ne zaman sonuç üretilmez?</h2>
            <p className="text-metin-2 mt-3 leading-relaxed">
              Bir mahallenin ölçüt ağırlıklarının en az{' '}
              <strong>%{Math.round(ASGARI_KAPSAM * 100)}&apos;i</strong> dolu değilse o mahalle için
              uyum yüzdesi üretilmez ve listede görünmez. Yarım veriyle &quot;%89 uyum&quot; demek,
              uyum yüzdesini değersizleştirir.
            </p>
            <p className="text-metin-2 mt-3 leading-relaxed">
              Eksik bir ölçüt <strong>sıfır sayılmaz</strong> — bu mahalleyi haksız yere
              cezalandırır. Ortalama da sayılmaz — bu veri uydurmaktır. O ölçüt hesaba hiç girmez ve
              kalan ölçütler kendi içinde normalize edilir; hangi verinin eksik olduğu size
              söylenir.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-baslik-3 font-medium">Testin ölçmedikleri</h2>
            <ul className="text-metin-2 mt-3 list-disc space-y-2 pl-5 leading-relaxed">
              <li>
                <strong>Sürüş süresi ölçülmez.</strong> Mesafeler kuş uçuşudur. Gerçek sürüş süresi
                için yol ağı verisi gerekir ve elimizde yok; &quot;12 dakika&quot; demek
                bilmediğimiz bir şeyi iddia etmek olurdu.
              </li>
              <li>
                <strong>Bina bazında bir şey söylemez.</strong> Aynı mahallede iki sokak arasında
                ciddi fark olabilir. Test mahalle seviyesinde çalışır.
              </li>
              <li>
                <strong>Komşuluk, sosyal doku ve güvenlik ölçülmez.</strong> Bunlar sayıya
                indirgenmesi hem zor hem sakıncalı başlıklar.
              </li>
              <li>
                <strong>Okul kalitesi ölçülmez</strong>, yalnızca okula erişim mesafesi ölçülür.
              </li>
            </ul>
            <p className="text-metin-2 mt-4 leading-relaxed">
              Bu yüzden test size {ONERI_SAYISI} mahalle önerir, bir karar vermez. Önerilen
              mahalleleri yerinde görmeden, tercihen farklı saatlerde, karar vermeyin.
            </p>
          </section>

          <div className="mt-12">
            <Feragat ek="Mahalle önerileri kişisel tercihlerinize göre sıralanmış bir yönlendirmedir; yerinde inceleme ve kendi araştırmanızın yerine geçmez." />
          </div>
        </article>
      </div>
    </>
  )
}
