import type { Metadata } from 'next'
import Link from 'next/link'

import { POI_TIPLERI, type PoiTipi } from '@/collections/IlgiNoktalari'
import { BILINCLI_DISARIDA, ESLEME_KURALLARI } from '@/lib/osm/eslesme'
import { mutlakAdres } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Veri kaynakları ve lisanslar',
  description:
    'Sitedeki çevre noktası, mesafe ve gözlem verilerinin kaynakları, lisansları ve ' +
    'OpenStreetMap kategori eşlemesi.',
  alternates: { canonical: mutlakAdres('/veri-kaynaklari') },
}

const TIP_ETIKETLERI = new Map(POI_TIPLERI.map((t) => [t.value, t.label]))

/**
 * Veri kaynakları ve lisanslar.
 *
 * ⚠️ ODbL ATIF YÜKÜMLÜLÜĞÜ — bu sayfa yasal bir gerekliliktir.
 *
 * OpenStreetMap verisi Open Database License altında. Türetilmiş veriyi
 * yayınlamak serbest ama atıf zorunlu ve lisansın belirtilmesi gerekiyor.
 * Atıf ayrıca POI verisinin göründüğü her yerde (mahalle sayfası, ilan
 * detayı) satır içinde de basılıyor.
 *
 * ⚠️ Kategori eşleme tablosu buraya ELLE yazılmıyor; `ESLEME_KURALLARI`den
 * okunuyor. İki yerde ayrı yazılsaydı biri değişip diğeri kalırdı ve
 * yayınlanan metodoloji sessizce yalan söylerdi.
 */
export default function VeriKaynaklariSayfasi() {
  // Tipe göre grupla — okuyucu "okul nereden geliyor" diye bakar.
  const tipeGore = new Map<PoiTipi, typeof ESLEME_KURALLARI>()
  for (const kural of ESLEME_KURALLARI) {
    tipeGore.set(kural.tip, [...(tipeGore.get(kural.tip) ?? []), kural])
  }

  return (
    <div className="kapsayici py-10 sm:py-14">
      <article className="max-w-2xl">
        <h1 className="text-[2rem] leading-tight sm:text-[2.5rem]">Veri kaynakları ve lisanslar</h1>

        <p className="text-metin-2 text-baslik-3 mt-4 leading-relaxed">
          Sitedeki her rakamın bir kaynağı var ve o kaynağı söylemek zorundayız — hem lisans gereği
          hem de bir yatırım sitesinin borcu olduğu için. Bu sayfa hangi verinin nereden geldiğini
          anlatır.
        </p>

        <section className="mt-10">
          <h2 className="font-sans text-[1.375rem] leading-tight">
            Çevre noktaları — OpenStreetMap
          </h2>

          <p className="text-metin-2 mt-3 leading-relaxed">
            Mahalle ve ilan sayfalarındaki &quot;çevre ve erişim&quot; listelerinde görünen okul,
            sağlık, market, park, sanayi ve ulaşım noktalarının bir bölümü{' '}
            <a
              href="https://www.openstreetmap.org/"
              target="_blank"
              rel="noreferrer"
              className="text-vurgu underline underline-offset-2"
            >
              OpenStreetMap
            </a>{' '}
            verisinden alınmıştır.
          </p>

          <p className="text-metin-2 mt-3 leading-relaxed">
            <strong className="text-metin font-medium">© OpenStreetMap katkıcıları</strong> — veri{' '}
            <a
              href="https://opendatacommons.org/licenses/odbl/"
              target="_blank"
              rel="noreferrer"
              className="text-vurgu underline underline-offset-2"
            >
              Open Database License (ODbL)
            </a>{' '}
            altında lisanslanmıştır. Lisans metni:{' '}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              className="text-vurgu underline underline-offset-2"
            >
              openstreetmap.org/copyright
            </a>
          </p>

          <p className="text-metin-2 mt-3 leading-relaxed">
            Noktaların bir kısmı da bizim kendi saha gözlemimizle elle girildi. OpenStreetMap
            kaynaklı olanlar sistemde ayrıca işaretlidir; elle düzelttiğimiz kayıtlar sonraki
            güncellemelerde korunur.
          </p>

          <p className="text-metin-3 text-govde-kucuk mt-3">
            ⚠️ OpenStreetMap gönüllü katkıyla büyüyen bir veri tabanıdır; eksik ya da güncel olmayan
            kayıt bulunabilir. Listede görünmeyen bir donatı, o donatının olmadığı anlamına gelmez.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-sans text-[1.375rem] leading-tight">Kategori eşlemesi</h2>

          <p className="text-metin-2 mt-3 leading-relaxed">
            OpenStreetMap etiketlerini kendi kategorilerimize şöyle çeviriyoruz. Bu eşleme bir ölçüm
            değil, bizim yargımız — bu yüzden yayınlıyoruz.
          </p>

          <div className="mt-4 flex flex-col gap-5">
            {[...tipeGore.entries()].map(([tip, kurallar]) => (
              <div key={tip}>
                <h3 className="font-sans text-govde font-medium">
                  {TIP_ETIKETLERI.get(tip) ?? tip}
                </h3>
                <ul className="text-metin-2 mt-1.5 list-disc space-y-1 pl-5 leading-relaxed">
                  {kurallar.map((kural) => (
                    <li key={`${kural.anahtar}=${kural.deger}`}>
                      <code className="text-mikro">
                        {kural.anahtar}={kural.deger}
                      </code>{' '}
                      — {kural.gerekce}
                      {kural.onemli ? (
                        <span className="text-metin-3"> · öne çıkan nokta sayılır</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="text-metin-3 text-govde-kucuk mt-4">
            Bu listede olmayan etiketler (fırın, banka, kuaför gibi) içe aktarılmıyor. Karşılığı
            olmayan kayıtlar sessizce atılmıyor; içe aktarma raporunda sayılarıyla listeleniyor ve o
            rapor her içe aktarmada okunuyor — eczane ve çocuk oyun alanı tam olarak böyle eklendi.
          </p>

          <h3 className="mt-6 font-sans text-govde font-medium">Bilinçli olarak almadıklarımız</h3>
          <p className="text-metin-2 mt-1.5 leading-relaxed">
            Raporda düzenli görünen ama almamaya karar verdiğimiz türler. Kararı burada yazıyoruz ki
            hem siz hem biz her seferinde baştan tartışmayalım.
          </p>
          <ul className="text-metin-2 mt-2 list-disc space-y-1 pl-5 leading-relaxed">
            {BILINCLI_DISARIDA.map((kural) => (
              <li key={`${kural.anahtar}=${kural.deger}`}>
                <code className="text-mikro">
                  {kural.anahtar}={kural.deger}
                </code>{' '}
                — {kural.gerekce}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="font-sans text-[1.375rem] leading-tight">Mesafeler</h2>
          <p className="text-metin-2 mt-3 leading-relaxed">
            Tüm mesafeler <strong className="text-metin font-medium">kuş uçuşudur</strong>. Sürüş
            süresi için yol ağı verisi ve rotalama motoru gerekir; elimizde yok. Mesafeyi varsayılan
            bir hıza bölüp &quot;10 dakika&quot; yazmak, bilmediğimiz bir şeyi iddia etmek olurdu.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-sans text-[1.375rem] leading-tight">Fiyat ve kira gözlemleri</h2>
          <p className="text-metin-2 mt-3 leading-relaxed">
            Mahalle rakamları kendi tuttuğumuz gözlem kayıtlarından gelir. Yöntem, eşikler ve gözlem
            sayıları{' '}
            <Link href="/endeks-metodolojisi" className="text-vurgu underline underline-offset-2">
              endeks metodolojisi
            </Link>{' '}
            sayfasında. Yatırım skorunun bileşenleri ve eğrileri{' '}
            <Link
              href="/yatirim-skoru-metodolojisi"
              className="text-vurgu underline underline-offset-2"
            >
              yatırım skoru metodolojisi
            </Link>{' '}
            sayfasında yayınlanır.
          </p>
        </section>
      </article>
    </div>
  )
}
