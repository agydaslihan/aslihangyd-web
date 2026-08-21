import type { Metadata } from 'next'
import { SayfaBasligi } from '@/components/icerik/SayfaIcerik'
import { sayfaIcerigi } from '@/lib/veri/sayfaIcerikleri'

import { SayfaVitrini, VitrinOzeti } from '@/components/duzen/SayfaVitrini'
import { Sahne } from '@/components/hareket/Sahne'
import { MahalleKarti } from '@/components/mahalle/MahalleKarti'
import { Eyebrow } from '@/components/ui/Bolum'
import { BosDurum } from '@/components/ui/BosDurum'
import { Feragat } from '@/components/ui/Feragat'
import { Buton } from '@/components/ui/Buton'
import { KonumIkon, OkIkon } from '@/components/ui/Ikon'
import { mutlakAdres } from '@/lib/site'
import { IZGARA_MIN_YUKSEKLIK } from '@/lib/duzen/iskelet'
import { mahalleleriGetir } from '@/lib/veri/mahalleler'

/**
 * ⚠️ SAYFA `(liste)` ROTA GRUBUNDA VE BU BİR SEO DÜZELTMESİ.
 *
 * `loading.tsx` bulunduğu segmentin TÜM ALTINA uygulanıyor. Dosya
 * doğrudan `portfoy/` (ya da `mahalleler/`) altındayken `[slug]` sayfası da
 * onu miras alıyordu: Next kabuğu hemen akıtıyor, yanıt **200 olarak
 * başlıyor** ve sonradan çağrılan `notFound()` yalnızca EKRANI
 * değiştirebiliyor — durum kodunu değiştiremiyor.
 *
 * Sonuç: var olmayan bir ilan "İlan bulunamadı" yazıyor ama HTTP 200
 * dönüyordu. Arama motoru için bu bir SOFT 404: adresi geçerli sanıp
 * indeksliyor, içerik bulamayınca site kalitesini düşürüyor.
 *
 * Rota grubu adresi değiştirmiyor (`/portfoy` yine `/portfoy`) ama
 * `loading.tsx`in kapsamını yalnızca liste sayfasına daraltıyor. Deneyle
 * doğrulandı: dosya kaldırılınca detay 404 dönüyor, geri konunca 200.
 */
export const metadata: Metadata = {
  title: 'Çorlu mahalleleri — yatırım rehberi',
  description:
    'Çorlu mahallelerinin ortalama m² fiyatları, kira çarpanları ve yatırım hikâyeleri. ' +
    'Hangi mahalle hangi değer sürücüsünden besleniyor?',
  alternates: { canonical: mutlakAdres('/mahalleler') },
}

export default async function MahallelerSayfasi() {
  const icerik = await sayfaIcerigi('mahalleler')

  const mahalleler = await mahalleleriGetir()

  /**
   * ⚠️ RAKAMLAR SAYILIYOR, YAZILMIYOR (kural 2).
   *
   * "Mahalle" veritabanından geliyor; ortalama m² fiyatı ise ancak yeterli
   * gözlem varsa anlamlı ve o eşik endeks motorunun işi — burada `null`
   * geçiliyor ve hücre kendi boş durumunu gösteriyor.
   */
  const ozet = [
    {
      etiket: 'Mahalle',
      deger: mahalleler.length > 0 ? String(mahalleler.length) : null,
    },
    {
      etiket: 'Pilot bölge',
      deger: mahalleler.length > 0 ? 'Çorlu' : null,
    },
  ] as const

  return (
    <>
      {/*
        ⚠️ BAŞLIK KÜÇÜK VE SOLDA — `h1` ETİKETİ DURUYOR.

        Önceden ortalanmıştı ve sayfa doğrudan ızgarayla başlıyordu. Vitrin
        bandı geldikten sonra ortalama, bandın sağındaki özetle çakışıyor;
        blok sola alındı. Etiket DEĞİŞMEDİ: bu sayfanın arama motoru
        sıralaması ve ekran okuyucu gezinmesi `h1`e bağlı. "Küçük görünsün"
        ile "başlık olmasın" ayrı şeyler; ikincisi sessiz bir SEO kaybı
        olurdu.
      */}
      <SayfaVitrini yan={<VitrinOzeti ogeler={ozet} />}>
        <Eyebrow>Çorlu · Tekirdağ</Eyebrow>
        <SayfaBasligi
          icerik={icerik}
          varsayilanBaslik="Çorlu mahalleleri"
          h1Sinifi="text-metin mt-4 font-baslik text-baslik-1-mobil font-medium sm:text-baslik-1"
          aciklamaSinifi="text-metin-2 mt-5 text-govde leading-relaxed"
          varsayilanAciklama={
            <p className="text-metin-2 mt-5 text-govde leading-relaxed">
              Bir taşınmazın değerini binadan çok mahallesi belirler. Her mahallenin hangi değer
              sürücüsünden beslendiğini — sanayi, ulaşım, eğitim, sağlık — veriyle anlatıyoruz.
            </p>
          }
        />

        {/*
          ⚠️ KARŞILAŞTIRMA ÇAĞRISI BANDA ALINDI.

          Sayfanın en ayırt edici aracı karşılaştırma ve altbilgiye yakın
          bir bağlantı olarak duruyordu; ziyaretçi kartları gezip çıkıyor,
          aracın varlığını hiç görmüyordu. Bant, sayfanın ne sunduğunu
          söylediği yer.
        */}
        <div className="mt-8">
          <Buton href="/mahalleler/karsilastir" gorunum="ikincil">
            Mahalleleri karşılaştır
            <OkIkon width={16} height={16} />
          </Buton>
        </div>
      </SayfaVitrini>

      <div className="kapsayici py-12 sm:py-16">
        {mahalleler.length > 0 ? (
          <>
            <div
              className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5 ${IZGARA_MIN_YUKSEKLIK}`}
            >
              {/*
            ⚠️ Bu sayfada araya bölüm başlığı girmiyor: h1 doğrudan kartlara
            bağlanıyor. Kart varsayılanı h3 olduğu için seviye atlanıyordu.
          */}
              {/* ⚠️ Kademe 60 ms, üst sınır 5 (300 ms). Sabit çarpan uzun
              listede son kartı yarım saniye geciktirir ve "takıldı" gibi
              okunur. */}
              {mahalleler.map((mahalle, sira) => (
                <Sahne key={mahalle.id} gecikme={Math.min(sira, 5) * 60} className="h-full">
                  {/* ⚠️ İLK ÜÇ KART ÖNCELİKLİ. Ölçümde LCP öğesi ilk kartın kapak
                    görseliydi ve `loading="lazy"` taşıyordu: sayfanın en büyük
                    öğesi tarayıcıya "acelesi yok" diye işaretlenmişti. Üçü
                    mobilde ilk ekranda; dördüncüden sonrası tembel kalıyor. */}
                  <MahalleKarti mahalle={mahalle} baslikSeviyesi={2} oncelikli={sira < 3} />
                </Sahne>
              ))}
            </div>

            {/*
              ⚠️ KURAL 5 — YATIRIM SKORU GÖSTERİLEN HER YERDE FERAGAT ZORUNLU.

              Kartlara yatırım skoru rozeti eklendi. Rozet başına feragat
              basmak hem okunmaz hem gürültü olurdu; sayfa seviyesinde tek bir
              ibare o sayfadaki bütün skorları kapsıyor. Kuralın amacı skorun
              kayıtsız görünmemesi ve bu onu karşılıyor.
            */}
            <Feragat sinifAdi="mt-6" />
          </>
        ) : (
          <BosDurum
            baslik="Mahalle sayfaları hazırlanıyor"
            neden="Pilot mahallelerin analiz metinleri üzerinde çalışıyoruz. Bir mahalle sayfasını yayına almadan önce, o mahalleyi gerçekten anlatan özgün bir metnin hazır olmasını bekliyoruz — yarım içerik yayınlamıyoruz."
            ikon={<KonumIkon width={32} height={32} />}
            eylem={
              <Buton href="/iletisim" gorunum="ikincil">
                Merak ettiğiniz mahalleyi sorun
              </Buton>
            }
          />
        )}
      </div>
    </>
  )
}
