import type { Metadata } from 'next'
import Link from 'next/link'

import { SayfaVitrini } from '@/components/duzen/SayfaVitrini'
import { Eyebrow } from '@/components/ui/Bolum'
import { POI_TIPLERI, type PoiTipi } from '@/collections/IlgiNoktalari'
import { googlePlacesEtkinMi } from '@/lib/google/ayarlar'
import { BILINCLI_DISARIDA, ESLEME_KURALLARI } from '@/lib/osm/eslesme'
import { rayicKaynagiEtiketi } from '@/lib/rayic/tipler'
import { mutlakAdres } from '@/lib/site'
import { tarihiYaz } from '@/lib/tarih'
import { veriKaynaklariOzeti, type KaynakOzeti } from '@/lib/veri/veriKaynaklari'

export const metadata: Metadata = {
  title: 'Veri kaynakları ve lisanslar',
  description:
    'Sitedeki çevre noktası, mesafe ve gözlem verilerinin kaynakları, lisansları ve ' +
    'OpenStreetMap kategori eşlemesi.',
  alternates: { canonical: mutlakAdres('/veri-kaynaklari') },
}

const TIP_ETIKETLERI = new Map(POI_TIPLERI.map((t) => [t.value, t.label]))

/** Tablo satırı — kaynak, sıklık, kayıt sayısı ve gerçek son güncelleme. */
function VeriSatiri({
  ad,
  kaynak,
  siklik,
  ozet,
  ek,
}: {
  ad: string
  kaynak: string
  siklik: string
  ozet: KaynakOzeti
  ek?: string
}) {
  return (
    <tr>
      <th scope="row" className="text-metin px-4 py-2.5 text-left font-medium">
        {ad}
        {ek ? <span className="text-metin-3 text-mikro block font-normal">{ek}</span> : null}
      </th>
      <td className="text-metin-2 px-4 py-2.5">{kaynak}</td>
      <td className="text-metin-2 px-4 py-2.5">{siklik}</td>
      <td className="text-metin-2 px-4 py-2.5 tabular-nums">
        {ozet.kayitSayisi > 0 ? ozet.kayitSayisi.toLocaleString('tr-TR') : '—'}
      </td>
      <td className="text-metin-2 px-4 py-2.5">{tarihiYaz(ozet.sonGuncelleme) ?? '—'}</td>
    </tr>
  )
}

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
export default async function VeriKaynaklariSayfasi() {
  // Tipe göre grupla — okuyucu "okul nereden geliyor" diye bakar.
  const tipeGore = new Map<PoiTipi, typeof ESLEME_KURALLARI>()
  for (const kural of ESLEME_KURALLARI) {
    tipeGore.set(kural.tip, [...(tipeGore.get(kural.tip) ?? []), kural])
  }

  const [ozet, googleAcik] = await Promise.all([veriKaynaklariOzeti(), googlePlacesEtkinMi()])

  return (
    <>
      <SayfaVitrini>
        <Eyebrow>Şeffaflık</Eyebrow>
        <h1 className="text-metin mt-4 font-serif text-baslik-1-mobil font-medium sm:text-baslik-1">
          Veri kaynakları ve lisanslar
        </h1>
        <p className="text-metin-2 mt-5 text-govde leading-relaxed">
          Sitedeki her rakamın bir kaynağı var ve o kaynağı söylemek zorundayız — hem lisans gereği
          hem de bir yatırım sitesinin borcu olduğu için. Bu sayfa hangi verinin nereden geldiğini
          anlatır.
        </p>
      </SayfaVitrini>

      <div className="kapsayici py-12 sm:py-16">
        <article className="max-w-2xl">
          {/*
          ⚠️ EN ÜSTTE VE VURGULU: bu cümle, sitedeki bütün fiyat
          rakamlarının okunma biçimini belirliyor. Aşağıda bir yere
          gömülseydi kimse görmezdi.
        */}
          <p className="border-kenar bg-yuzey-2 rounded-kart text-metin-2 border-[0.5px] p-4 leading-relaxed">
            <strong className="text-metin font-medium">
              Piyasa fiyatları kendi gözlemlerimize dayanır ve istenen fiyattır.
            </strong>{' '}
            Gerçekleşen satış fiyatı değildir; tapuda beyan edilen bedele de erişimimiz yok. İlan
            platformlarından otomatik veri çekmiyoruz — her gözlem elle giriliyor ve kaç gözleme
            dayandığı (n) rakamın yanında yazıyor.
          </p>

          {/* ── Veri türleri tablosu ────────────────────────────────────── */}
          <section className="mt-10">
            <h2 className="text-baslik-3 font-medium">Veri türleri, kaynakları ve tazeliği</h2>

            <p className="text-metin-2 mt-3 leading-relaxed">
              Aşağıdaki tarihler elle yazılmadı; veritabanından okunuyor. Bir veri türü uzun süredir
              güncellenmediyse bunu burada görürsünüz.
            </p>

            <div className="border-kenar rounded-kart mt-4 overflow-x-auto border-[0.5px]">
              <table className="w-full text-govde-kucuk">
                <thead>
                  <tr className="border-kenar divide-kenar border-b-[0.5px]">
                    <th scope="col" className="text-metin-3 px-4 py-2.5 text-left font-medium">
                      Veri
                    </th>
                    <th scope="col" className="text-metin-3 px-4 py-2.5 text-left font-medium">
                      Kaynak
                    </th>
                    <th scope="col" className="text-metin-3 px-4 py-2.5 text-left font-medium">
                      Güncelleme sıklığı
                    </th>
                    <th scope="col" className="text-metin-3 px-4 py-2.5 text-left font-medium">
                      Kayıt
                    </th>
                    <th scope="col" className="text-metin-3 px-4 py-2.5 text-left font-medium">
                      Son güncelleme
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-kenar divide-y-[0.5px]">
                  <VeriSatiri
                    ad="Çevre noktaları (OSM)"
                    kaynak="OpenStreetMap · ODbL"
                    siklik="Elle tetiklenen içe aktarma"
                    ozet={ozet.osmNoktalari}
                  />
                  <VeriSatiri
                    ad="Çevre noktaları (kendi kaydımız)"
                    kaynak="Saha gözlemimiz"
                    siklik="Sürekli"
                    ozet={ozet.elleNoktalar}
                  />
                  <VeriSatiri
                    ad="Mahalle sınırları"
                    kaynak="OpenStreetMap · ODbL"
                    siklik="Elle tetiklenen içe aktarma"
                    ozet={ozet.osmSinirlari}
                    ek={
                      ozet.elleSinirlar > 0
                        ? `${ozet.elleSinirlar} sınır elle çizildi/düzeltildi`
                        : undefined
                    }
                  />
                  <VeriSatiri
                    ad="Fiyat ve kira gözlemleri"
                    kaynak="Kendi gözlem kayıtlarımız (istenen fiyat)"
                    siklik="Haftalık"
                    ozet={ozet.gozlemler}
                    ek="Tek tek gözlemler yayınlanmaz; yalnızca toplulaştırılmış göstergeler."
                  />
                  <VeriSatiri
                    ad="Rayiç bedeller"
                    kaynak={
                      ozet.rayicler.kaynaklar.length > 0
                        ? ozet.rayicler.kaynaklar
                            .map((kaynak) => rayicKaynagiEtiketi(kaynak) ?? kaynak)
                            .join(', ')
                        : 'Belediye takdir komisyonu'
                    }
                    siklik="Yılda bir (yeniden değerleme)"
                    ozet={ozet.rayicler}
                    ek={
                      ozet.rayicler.yillar.length > 0
                        ? `Kayıtlardaki yıllar: ${ozet.rayicler.yillar.join(', ')}`
                        : undefined
                    }
                  />
                  {googleAcik ? (
                    <VeriSatiri
                      ad="İşletme bilgisi ve çalışma saatleri"
                      kaynak="Google Places"
                      siklik="İstek anında — saklanmıyor"
                      ozet={{
                        kayitSayisi: ozet.googleBagliNoktalar,
                        sonGuncelleme: null,
                      }}
                      ek="Yalnızca yer kimliği saklanır; içerik gösterildiği anda çekilir."
                    />
                  ) : null}
                </tbody>
              </table>
            </div>

            <p className="text-metin-3 text-govde-kucuk mt-3">
              &quot;Son güncelleme&quot; boşsa o veri türünde henüz kayıt yok. Sayılar ziyaretçinin
              erişebildiği kayıtları gösterir.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-baslik-3 font-medium">
              Çevre noktaları ve mahalle sınırları — OpenStreetMap
            </h2>

            <p className="text-metin-2 mt-3 leading-relaxed">
              Haritalardaki <strong className="text-metin font-medium">mahalle sınırları</strong>{' '}
              ile mahalle ve ilan sayfalarındaki &quot;çevre ve erişim&quot; listelerinde görünen
              okul, sağlık, market, park, sanayi ve ulaşım noktalarının bir bölümü{' '}
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
              ⚠️ OpenStreetMap gönüllü katkıyla büyüyen bir veri tabanıdır; eksik ya da güncel
              olmayan kayıt bulunabilir. Listede görünmeyen bir donatı, o donatının olmadığı
              anlamına gelmez. Mahalle sınırları için de aynısı geçerli: sınırlar idari kaynağın
              kendisi değil, gönüllülerin çizdiği hâlidir ve kaba olabilir. Yanlış gördüğümüz
              sınırları elle düzeltiyoruz; düzeltilenler sonraki içe aktarmalarda korunuyor.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-baslik-3 font-medium">Kategori eşlemesi</h2>

            <p className="text-metin-2 mt-3 leading-relaxed">
              OpenStreetMap etiketlerini kendi kategorilerimize şöyle çeviriyoruz. Bu eşleme bir
              ölçüm değil, bizim yargımız — bu yüzden yayınlıyoruz.
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
              olmayan kayıtlar sessizce atılmıyor; içe aktarma raporunda sayılarıyla listeleniyor ve
              o rapor her içe aktarmada okunuyor — eczane ve çocuk oyun alanı tam olarak böyle
              eklendi.
            </p>

            <h3 className="mt-6 font-sans text-govde font-medium">
              Bilinçli olarak almadıklarımız
            </h3>
            <p className="text-metin-2 mt-1.5 leading-relaxed">
              Raporda düzenli görünen ama almamaya karar verdiğimiz türler. Kararı burada yazıyoruz
              ki hem siz hem biz her seferinde baştan tartışmayalım.
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
            <h2 className="text-baslik-3 font-medium">Mesafeler</h2>
            <p className="text-metin-2 mt-3 leading-relaxed">
              Tüm mesafeler <strong className="text-metin font-medium">kuş uçuşudur</strong>. Sürüş
              süresi için yol ağı verisi ve rotalama motoru gerekir; elimizde yok. Mesafeyi
              varsayılan bir hıza bölüp &quot;10 dakika&quot; yazmak, bilmediğimiz bir şeyi iddia
              etmek olurdu.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-baslik-3 font-medium">Fiyat ve kira gözlemleri</h2>
            <p className="text-metin-2 mt-3 leading-relaxed">
              Mahalle rakamları kendi tuttuğumuz gözlem kayıtlarından gelir. Yöntem, eşikler ve
              gözlem sayıları{' '}
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
            <p className="text-metin-2 mt-3 leading-relaxed">
              <strong className="text-metin font-medium">Bunlar istenen fiyatlardır.</strong>{' '}
              Gerçekleşen satış fiyatına da, tapuda beyan edilen bedele de erişimimiz yok. İstenen
              fiyat, piyasanın yönünü gösterir ama pazarlık payını içerir.
            </p>
          </section>

          {/* ── Rayiç bedeller ──────────────────────────────────────────── */}
          <section className="mt-10">
            <h2 className="text-baslik-3 font-medium">Rayiç bedeller</h2>

            <p className="text-metin-2 mt-3 leading-relaxed">
              Rayiç bedel, belediyenin takdir komisyonunca belirlenen ve emlak vergisi ile tapu
              harcına esas alınan <strong className="text-metin font-medium">asgari</strong>{' '}
              değerdir. Kamuya açık ve resmî bir veridir.
            </p>

            <p className="text-metin-2 mt-3 leading-relaxed">
              <strong className="text-metin font-medium">Piyasa fiyatı değildir</strong> ve
              piyasanın çoğu yerde altındadır. İkisini karıştırmak sitedeki en yanıltıcı okuma
              olurdu; bu yüzden rayiç bedelin göründüğü her yerde kaynağı ve yılı birlikte yazıyor.
            </p>

            {ozet.rayicler.kayitSayisi > 0 ? (
              <p className="text-metin-2 mt-3 leading-relaxed">
                Şu anda {ozet.rayicler.kayitSayisi.toLocaleString('tr-TR')} rayiç kaydı var.
                {ozet.rayicler.yillar.length > 0
                  ? ` Kayıtlardaki yıllar: ${ozet.rayicler.yillar.join(', ')}.`
                  : ''}{' '}
                Kaynak:{' '}
                {ozet.rayicler.kaynaklar
                  .map((kaynak) => rayicKaynagiEtiketi(kaynak) ?? kaynak)
                  .join(', ')}
                .
              </p>
            ) : (
              <p className="text-metin-3 text-govde-kucuk mt-3">
                Henüz rayiç bedel girilmedi. Belediye tabloları elimize geçtikçe mahalle mahalle
                giriyoruz; tahmin etmiyoruz.
              </p>
            )}

            <p className="text-metin-3 text-govde-kucuk mt-3">
              ⚠️ Rayiç bedeller her yıl yeniden değerleme oranıyla artar. Yılı yazılmayan bir rayiç
              rakamı anlamsızdır; bu yüzden yıl zorunlu bir alan.
            </p>
          </section>

          {/* ── Google Places ───────────────────────────────────────────── */}
          {googleAcik ? (
            <section className="mt-10">
              <h2 className="text-baslik-3 font-medium">İşletme bilgisi — Google Places</h2>

              <p className="text-metin-2 mt-3 leading-relaxed">
                Bazı çevre noktalarının güncel işletme adı ve çalışma saatleri{' '}
                <strong className="text-metin font-medium">Google Places</strong> üzerinden
                gösteriliyor. OpenStreetMap işletme saatlerinde zayıf; bu katman o boşluğu
                dolduruyor.
              </p>

              <p className="text-metin-2 mt-3 leading-relaxed">
                <strong className="text-metin font-medium">Bu bilgi bizde saklanmıyor.</strong>{' '}
                Veritabanımızda tuttuğumuz tek şey Google&apos;ın yer kimliği; ad, adres ve çalışma
                saati siz &quot;çalışma saatleri&quot; dediğiniz anda çekiliyor ve hiçbir yere
                yazılmıyor. Bu hem lisans gereği hem de doğru olan: saklanan bir çalışma saati
                birkaç ay içinde yanlışa dönüşür.
              </p>

              <p className="text-metin-3 text-govde-kucuk mt-3">
                Veriler Google&apos;dan alınmıştır. Google ve Google Haritalar, Google LLC&apos;nin
                ticari markalarıdır. Katman, resmî ve ücretli Places API üzerinden, kendi
                anahtarımızla çalışır — hiçbir siteden otomatik veri çekilmez.
              </p>
            </section>
          ) : null}
        </article>
      </div>
    </>
  )
}
