import type { Metadata } from 'next'
import Link from 'next/link'

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
    <div className="kapsayici py-10 sm:py-14">
      <article className="max-w-2xl">
        <h1 className="text-[2rem] leading-tight sm:text-[2.5rem]">
          Çorlu Konut Endeksi — metodoloji
        </h1>

        <p className="text-murekkep-2 mt-4 text-lg leading-relaxed">
          Bir rakam yayınlamak, o rakamın arkasında durmak demektir. Bu sayfa endeksin nasıl
          hesaplandığını, hangi sınırları olduğunu ve neyi ölçmediğini anlatır.
        </p>

        <section className="mt-10">
          <h2 className="font-sans text-[1.375rem] leading-tight">Ne ölçüyoruz?</h2>
          <p className="text-murekkep-2 mt-3 leading-relaxed">
            Çorlu&apos;da konutların{' '}
            <strong className="text-murekkep font-medium">istenen fiyatlarının</strong> aylık
            seyrini. Gözlemler ilan fiyatlarına dayanır. İlan fiyatları pazarlık payı içerir; bu
            yüzden endeksin adında &quot;istenen fiyat&quot; geçer ve gerçekleşen satış fiyatlarıyla
            karıştırılmaz.
          </p>
          <p className="text-murekkep-2 mt-3 leading-relaxed">
            Kendi işlemlerimizden ve meslektaş ağımızdan gelen gerçekleşen fiyatları ayrı bir seri
            olarak tutuyoruz. İkisini birleştirmek endeksi sistematik olarak şişirirdi.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-sans text-[1.375rem] leading-tight">Nasıl hesaplıyoruz?</h2>

          <h3 className="mt-6 font-sans text-base font-semibold">1. Katmanlara ayırma</h3>
          <p className="text-murekkep-2 mt-2 leading-relaxed">
            Çorlu&apos;yu <strong className="text-murekkep font-medium">mahalle × oda tipi</strong>{' '}
            katmanlarına bölüyoruz. Muhittin 3+1 ile Şeyhsinan 1+1 farklı piyasalardır ve ayrı
            izlenmeleri gerekir.
          </p>

          <h3 className="mt-6 font-sans text-base font-semibold">2. Medyan, ortalama değil</h3>
          <p className="text-murekkep-2 mt-2 leading-relaxed">
            Her katman için o ayın m² fiyat{' '}
            <strong className="text-murekkep font-medium">medyanını</strong> alıyoruz. Medyan aykırı
            değerlere dirençlidir: tek bir çok pahalı ilan ortalamayı uçurur, medyanı etkilemez.
          </p>

          <h3 className="mt-6 font-sans text-base font-semibold">3. Sabit ağırlıklı sepet</h3>
          <p className="text-murekkep-2 mt-2 leading-relaxed">
            Her katmana sabit bir ağırlık veriyoruz. Ağırlıklar{' '}
            <strong className="text-murekkep font-medium">konut stokunu</strong> temsil eder, bizim
            gözlem sayımızı değil.
          </p>
          <p className="text-murekkep-2 mt-3 leading-relaxed">
            Bu adım kritiktir. Ağırlıklar sabit olmasaydı, bir ay tesadüfen daha çok lüks daire
            gözlemlediğimizde endeks fırlardı — oysa piyasada hiçbir şey değişmemiş olurdu. Buna
            &quot;bileşim yanlılığı&quot; denir ve küçük ölçekli veri toplamanın en tehlikeli
            tuzağıdır.
          </p>
          <p className="text-murekkep-2 mt-3 leading-relaxed">
            Ağırlıkları yılda bir kez, Ocak ayında gözden geçiriyoruz. Ay ay değişen bir ağırlık,
            endeksi anlamsız kılar.
          </p>

          <h3 className="mt-6 font-sans text-base font-semibold">4. Minimum gözlem eşiği</h3>
          <p className="text-murekkep-2 mt-2 leading-relaxed">
            Bir katmanda o ay{' '}
            <strong className="text-murekkep font-medium">
              {KATMAN_MINIMUM_GOZLEM} gözlemden az
            </strong>{' '}
            varsa medyan hesaplamıyoruz. Bunun yerine önceki ayın değerini taşıyor ve bunu tabloda{' '}
            <strong className="text-murekkep font-medium">açıkça işaretliyoruz.</strong> Üç gözlemle
            &quot;bu mahallenin medyanı şudur&quot; demek uydurmadır.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-sans text-[1.375rem] leading-tight">
            Endeksi ne zaman yayınlıyoruz?
          </h2>
          <p className="text-murekkep-2 mt-3 leading-relaxed">
            Şu koşulların <strong className="text-murekkep font-medium">hepsi</strong> sağlanmadan
            endeks sayfası açılmaz. Bu kontrol yazılıma gömülüdür; elle atlanamaz:
          </p>
          <ul className="text-murekkep-2 mt-3 list-disc space-y-1.5 pl-5 leading-relaxed">
            <li>En az {ASGARI_AY_SAYISI} tam ay veri</li>
            <li>Toplam en az {ASGARI_TOPLAM_GOZLEM} gözlem</li>
            <li>
              Sepet ağırlığının en az %70&apos;ini kapsayan katmanlarda her ay{' '}
              {KATMAN_MINIMUM_GOZLEM} gözlem
            </li>
            <li>Bu metodoloji sayfasının yayında olması</li>
          </ul>
          <p className="text-murekkep-2 mt-3 leading-relaxed">
            &quot;Bir ay erken açalım&quot; cazibesi güçlüdür ve zararı kalıcıdır. Bir kez yanlış
            rakam yayınlanırsa geri almak zordur.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-sans text-[1.375rem] leading-tight">Şeffaflık kuralları</h2>
          <p className="text-murekkep-2 mt-3 leading-relaxed">
            Her yayında şunlar görünür: toplam gözlem sayısı, hangi katmanların değerinin taşındığı,
            verinin istenen fiyat olduğu ve güncelleme tarihi.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-sans text-[1.375rem] leading-tight">Veriyi nasıl topluyoruz?</h2>
          <p className="text-murekkep-2 mt-3 leading-relaxed">
            Gözlemleri <strong className="text-murekkep font-medium">elle</strong> kaydediyoruz:
            mahalle, oda tipi, metrekare, fiyat ve tarih. Otomatik veri çekme (bot, script)
            kullanmıyoruz — bu, ilan platformlarının kullanım koşullarını ihlal eder ve veri tabanı
            hakkı riski taşır.
          </p>
          <p className="text-murekkep-2 mt-3 leading-relaxed">
            Gözlem seçerken rastgele davranıyoruz: listenin başından, ortasından ve sonundan
            alıyoruz. &quot;İlginç&quot; olanı seçme eğilimi endeksi bozar.
          </p>
          <p className="text-murekkep-2 mt-3 leading-relaxed">
            Tek tek ilanları, ilan metinlerini veya fotoğraflarını asla yayınlamıyoruz; yalnızca
            toplulaştırılmış rakamları.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-sans text-[1.375rem] leading-tight">Kendimizi nasıl denetliyoruz?</h2>
          <p className="text-murekkep-2 mt-3 leading-relaxed">
            Üç ayda bir, endeksimizi TCMB&apos;nin Tekirdağ konut fiyat endeksiyle
            karşılaştırıyoruz. Belirgin bir sapma varsa önce kendi verimizden şüpheleniyoruz.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-sans text-[1.375rem] leading-tight">Bu endeks ne DEĞİLDİR?</h2>
          <ul className="text-murekkep-2 mt-3 list-disc space-y-1.5 pl-5 leading-relaxed">
            <li>Bir gayrimenkul değerleme raporu değildir.</li>
            <li>Belirli bir taşınmazın değerini göstermez.</li>
            <li>Gerçekleşen satış fiyatlarını ölçmez (ayrı seri olarak tutulur).</li>
            <li>Yatırım tavsiyesi değildir.</li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="font-sans text-[1.375rem] leading-tight">Kullanım</h2>
          <p className="text-murekkep-2 mt-3 leading-relaxed">
            Endeksi atıf şartıyla serbestçe kullanabilirsiniz. Sorularınız için{' '}
            <Link href="/iletisim" className="text-lacivert underline underline-offset-2">
              bize yazın
            </Link>
            .
          </p>
        </section>

        <div className="border-cizgi mt-10 border-t pt-6">
          <Feragat ek="Endeks bir istatistiktir; değerleme raporu veya yatırım tavsiyesi değildir." />
        </div>
      </article>
    </div>
  )
}
