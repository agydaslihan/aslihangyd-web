import type { Metadata } from 'next'
import Link from 'next/link'

import { SayfaVitrini } from '@/components/duzen/SayfaVitrini'
import { Eyebrow } from '@/components/ui/Bolum'
import { Feragat } from '@/components/ui/Feragat'
import { ASGARI_AY_SAYISI, ASGARI_TOPLAM_GOZLEM, KATMAN_MINIMUM_GOZLEM } from '@/lib/endeks/tipler'
import { mutlakAdres } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Çorlu Konut Endeksi — metodoloji',
  description:
    'Çorlu Konut İstenen Fiyat Endeksi nasıl hesaplanır? Tabakalı medyan, sabit ağırlıklı ' +
    'sepet, minimum gözlem eşiği ve şeffaflık kuralları.',
  alternates: { canonical: mutlakAdres('/endeks-metodolojisi') },
}

/**
 * Metodoloji sayfası.
 *
 * ⚠️ Bu sayfa yayında olmadan endeks yayınlanamaz (kod seviyesinde kontrol).
 * Yöntemi açıklamak hem güven hem koruma sağlar: bir gazeteci "bu rakamı
 * nasıl buldunuz?" diye sorduğunda cevap burada.
 *
 * İçerik, `docs/ENDEKS-VERI-YONETIMI.md` metodolojisinin ziyaretçiye
 * yönelik anlatımıdır. Rakam veya sonuç içermez — yalnızca yöntem.
 */
export default function MetodolojiSayfasi() {
  return (
    <>
      <SayfaVitrini>
        <Eyebrow>Metodoloji</Eyebrow>
        <h1 className="text-metin mt-4 font-serif text-baslik-1-mobil font-medium sm:text-baslik-1">
          Çorlu Konut Endeksi — metodoloji
        </h1>
        <p className="text-metin-2 mt-5 text-govde leading-relaxed">
          Bir rakam yayınlamak, o rakamın arkasında durmak demektir. Bu sayfa endeksin nasıl
          hesaplandığını, hangi sınırları olduğunu ve neyi ölçmediğini anlatır.
        </p>
      </SayfaVitrini>

      <div className="kapsayici py-12 sm:py-16">
        <article className="max-w-2xl">
          <section>
            <h2 className="text-baslik-3 font-medium">Ne ölçüyoruz?</h2>
            <p className="text-metin-2 mt-3 leading-relaxed">
              Çorlu&apos;da konutların{' '}
              <strong className="text-metin font-medium">istenen fiyatlarının</strong> aylık
              seyrini. Gözlemler ilan fiyatlarına dayanır. İlan fiyatları pazarlık payı içerir; bu
              yüzden endeksin adında &quot;istenen fiyat&quot; geçer ve gerçekleşen satış
              fiyatlarıyla karıştırılmaz.
            </p>
            <p className="text-metin-2 mt-3 leading-relaxed">
              Kendi işlemlerimizden ve meslektaş ağımızdan gelen gerçekleşen fiyatları ayrı bir seri
              olarak tutuyoruz. İkisini birleştirmek endeksi sistematik olarak şişirirdi.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-baslik-3 font-medium">Nasıl hesaplıyoruz?</h2>

            <h3 className="mt-6 font-sans text-govde font-medium">1. Katmanlara ayırma</h3>
            <p className="text-metin-2 mt-2 leading-relaxed">
              Çorlu&apos;yu <strong className="text-metin font-medium">mahalle × oda tipi</strong>{' '}
              katmanlarına bölüyoruz. Muhittin 3+1 ile Şeyhsinan 1+1 farklı piyasalardır ve ayrı
              izlenmeleri gerekir.
            </p>

            <h3 className="mt-6 font-sans text-govde font-medium">2. Medyan, ortalama değil</h3>
            <p className="text-metin-2 mt-2 leading-relaxed">
              Her katman için o ayın m² fiyat{' '}
              <strong className="text-metin font-medium">medyanını</strong> alıyoruz. Medyan aykırı
              değerlere dirençlidir: tek bir çok pahalı ilan ortalamayı uçurur, medyanı etkilemez.
            </p>

            <h3 className="mt-6 font-sans text-govde font-medium">3. Sabit ağırlıklı sepet</h3>
            <p className="text-metin-2 mt-2 leading-relaxed">
              Her katmana sabit bir ağırlık veriyoruz. Ağırlıklar{' '}
              <strong className="text-metin font-medium">konut stokunu</strong> temsil eder, bizim
              gözlem sayımızı değil.
            </p>
            <p className="text-metin-2 mt-3 leading-relaxed">
              Bu adım kritiktir. Ağırlıklar sabit olmasaydı, bir ay tesadüfen daha çok lüks daire
              gözlemlediğimizde endeks fırlardı — oysa piyasada hiçbir şey değişmemiş olurdu. Buna
              &quot;bileşim yanlılığı&quot; denir ve küçük ölçekli veri toplamanın en tehlikeli
              tuzağıdır.
            </p>
            <p className="text-metin-2 mt-3 leading-relaxed">
              Ağırlıkları yılda bir kez, Ocak ayında gözden geçiriyoruz. Ay ay değişen bir ağırlık,
              endeksi anlamsız kılar.
            </p>

            <h3 className="mt-6 font-sans text-govde font-medium">4. Minimum gözlem eşiği</h3>
            <p className="text-metin-2 mt-2 leading-relaxed">
              Bir katmanda o ay{' '}
              <strong className="text-metin font-medium">
                {KATMAN_MINIMUM_GOZLEM} gözlemden az
              </strong>{' '}
              varsa medyan hesaplamıyoruz. Bunun yerine önceki ayın değerini taşıyor ve bunu tabloda{' '}
              <strong className="text-metin font-medium">açıkça işaretliyoruz.</strong> Üç gözlemle
              &quot;bu mahallenin medyanı şudur&quot; demek uydurmadır.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-baslik-3 font-medium">Endeksi ne zaman yayınlıyoruz?</h2>
            <p className="text-metin-2 mt-3 leading-relaxed">
              Şu koşulların <strong className="text-metin font-medium">hepsi</strong> sağlanmadan
              endeks sayfası açılmaz. Bu kontrol yazılıma gömülüdür; elle atlanamaz:
            </p>
            <ul className="text-metin-2 mt-3 list-disc space-y-1.5 pl-5 leading-relaxed">
              <li>En az {ASGARI_AY_SAYISI} tam ay veri</li>
              <li>Toplam en az {ASGARI_TOPLAM_GOZLEM} gözlem</li>
              <li>
                Sepet ağırlığının en az %70&apos;ini kapsayan katmanlarda her ay{' '}
                {KATMAN_MINIMUM_GOZLEM} gözlem
              </li>
              <li>Bu metodoloji sayfasının yayında olması</li>
            </ul>
            <p className="text-metin-2 mt-3 leading-relaxed">
              &quot;Bir ay erken açalım&quot; cazibesi güçlüdür ve zararı kalıcıdır. Bir kez yanlış
              rakam yayınlanırsa geri almak zordur.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-baslik-3 font-medium">Şeffaflık kuralları</h2>
            <p className="text-metin-2 mt-3 leading-relaxed">
              Her yayında şunlar görünür: toplam gözlem sayısı, hangi katmanların değerinin
              taşındığı, verinin istenen fiyat olduğu ve güncelleme tarihi.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-baslik-3 font-medium">Veriyi nasıl topluyoruz?</h2>
            <p className="text-metin-2 mt-3 leading-relaxed">
              Gözlemleri <strong className="text-metin font-medium">elle</strong> kaydediyoruz:
              mahalle, oda tipi, metrekare, fiyat ve tarih. Otomatik veri çekme (bot, script)
              kullanmıyoruz — bu, ilan platformlarının kullanım koşullarını ihlal eder ve veri
              tabanı hakkı riski taşır.
            </p>
            <p className="text-metin-2 mt-3 leading-relaxed">
              Gözlem seçerken rastgele davranıyoruz: listenin başından, ortasından ve sonundan
              alıyoruz. &quot;İlginç&quot; olanı seçme eğilimi endeksi bozar.
            </p>
            <p className="text-metin-2 mt-3 leading-relaxed">
              Tek tek ilanları, ilan metinlerini veya fotoğraflarını asla yayınlamıyoruz; yalnızca
              toplulaştırılmış rakamları.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-baslik-3 font-medium">Kendimizi nasıl denetliyoruz?</h2>
            <p className="text-metin-2 mt-3 leading-relaxed">
              Üç ayda bir, endeksimizi TCMB&apos;nin Tekirdağ konut fiyat endeksiyle
              karşılaştırıyoruz. Belirgin bir sapma varsa önce kendi verimizden şüpheleniyoruz.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-baslik-3 font-medium">Bu endeks ne DEĞİLDİR?</h2>
            <ul className="text-metin-2 mt-3 list-disc space-y-1.5 pl-5 leading-relaxed">
              <li>Bir gayrimenkul değerleme raporu değildir.</li>
              <li>Belirli bir taşınmazın değerini göstermez.</li>
              <li>Gerçekleşen satış fiyatlarını ölçmez (ayrı seri olarak tutulur).</li>
              <li>Yatırım tavsiyesi değildir.</li>
            </ul>
          </section>

          <section className="mt-10">
            <h2 className="text-baslik-3 font-medium">Kullanım</h2>
            <p className="text-metin-2 mt-3 leading-relaxed">
              Endeksi atıf şartıyla serbestçe kullanabilirsiniz. Sorularınız için{' '}
              <Link href="/iletisim" className="text-vurgu underline underline-offset-2">
                bize yazın
              </Link>
              .
            </p>
          </section>

          <div className="border-kenar mt-10 border-t-[0.5px] pt-6">
            <Feragat ek="Endeks bir istatistiktir; değerleme raporu veya yatırım tavsiyesi değildir." />
          </div>
        </article>
      </div>
    </>
  )
}
