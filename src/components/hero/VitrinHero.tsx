import type { ReactNode } from 'react'

import { Sahne } from '@/components/hareket/Sahne'
import { Eyebrow } from '@/components/ui/Bolum'
import { Buton } from '@/components/ui/Buton'
import { DogrulanmisIkon } from '@/components/ui/Ikon'

/**
 * Ana sayfa vitrini — slayt yokken çizilen hero.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ METİN FOTOĞRAFIN ÜSTÜNE BASILMIYOR.
 *
 * Klasik "kocaman fotoğraf, üstüne karartma, üstüne beyaz başlık" düzeni
 * burada bilinçli olarak reddedildi: o düzende okunurluk fotoğrafın açık ya
 * da koyu olmasına bağlanıyor ve kontrast, görseli yükleyen kişinin seçtiği
 * karartma oranının eline geçiyor — yani bizim kontrolümüzden çıkıyor. Aynı
 * gerekçe `AramaBolumu`nun notunda da yazılı; orada da kart slaydın üstüne
 * bindirilmemişti.
 *
 * Metin solda, kendi sakin zemininde. Sağdaki `sahne` slotu ise fotoğraf
 * DEĞİL, ürünün kendisi: gerçek bir ilan 3B perspektifte duruyor
 * (`VitrinSahnesi`). Sahne yoksa metin tek sütuna genişliyor — düzen
 * bozulmuyor, sadece sadeleşiyor.
 * ─────────────────────────────────────────────────────────────────────────
 */
export function VitrinHero({
  ustBaslik,
  baslik,
  vurgu,
  baslikDevam,
  aciklama,
  birincilEylem,
  ikincilEylem,
  sahne,
}: {
  ustBaslik: string
  /** Başlığın vurgudan ÖNCEKİ kısmı. */
  baslik: string
  /** Gold ile yazılan kelime. */
  vurgu: string
  /** Vurgudan sonraki kısım. */
  baslikDevam: string
  aciklama: string
  birincilEylem: { ad: string; adres: string }
  ikincilEylem: { ad: string; adres: string }
  /** Sağdaki 3B katman. Yoksa hero tek sütuna düşüyor. */
  sahne?: ReactNode
}) {
  return (
    <section className="bg-zemin relative isolate overflow-hidden">
      {/* ── Zemin dokusu ───────────────────────────────────────────────
          ⚠️ Tek bir radyal degrade. Aradaki gold sıcaklığı buradan geliyor;
          ayrı bir görsel indirilmiyor, dolayısıyla LCP'ye etkisi sıfır.
          ⚠️ `overflow-hidden` üstte: degrade taşıp yatay kaydırma açmasın. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(70% 55% at 78% 28%, color-mix(in oklab, var(--color-gold-400) 18%, transparent), transparent 62%)',
        }}
      />

      <div className="kapsayici relative py-16 sm:py-20 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_auto] lg:gap-16">
          <div className="max-w-xl">
            <Sahne>
              <Eyebrow>{ustBaslik}</Eyebrow>
            </Sahne>

            <Sahne gecikme={60}>
              <h1 className="text-metin mt-5 font-baslik text-baslik-1-mobil leading-[1.05] font-medium sm:text-baslik-1">
                {baslik}{' '}
                {/* ⚠️ Vurgu gold AMA `--color-gold-400` DEĞİL: o, krem zemin
                    üzerinde 1,5:1 ile okunmaz ve "gold asla metin rengi
                    değildir" kuralı mutlak. Koyulaştırılmış `gold-600`
                    kullanılıyor ve kontrast testinde ölçülüyor. */}
                <span className="text-[color:var(--color-gold-600)]">{vurgu}</span> {baslikDevam}
              </h1>
            </Sahne>

            <Sahne gecikme={120}>
              <p className="text-metin-2 mt-6 max-w-lg text-baslik-3 leading-relaxed">{aciklama}</p>
            </Sahne>

            <Sahne gecikme={180}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                {/* ⚠️ DÜĞMELER ELLE YAZILMIYOR, `Buton`DAN GELİYOR.

                    İlk hâlinde sınıflar burada elle kuruluydu ve birincil
                    eylem `bg-aksan` alıyordu. Tasarım disiplini testi haklı
                    olarak kırmızıya döndü: dolu adaçayı zemin YALNIZCA iki
                    eylemin ("Evimi değerlendir", "Erişim talep et") hakkı;
                    üçüncü bir yerde kullanıldığı anda ikisi de sıradanlaşıyor.
                    Vitrinin birincil eylemi portföye götürmek — o iki eylemden
                    biri değil. Dolu kakao aynı görsel ağırlığı veriyor,
                    nadirliği harcamadan. */}
                <Buton href={birincilEylem.adres} gorunum="koyu" boyut="buyuk" sinifAdi="group">
                  {birincilEylem.ad}
                  <OkIkonu />
                </Buton>

                <Buton href={ikincilEylem.adres} gorunum="ikincil" boyut="buyuk" sinifAdi="group">
                  {ikincilEylem.ad}
                  <OkIkonu />
                </Buton>
              </div>
            </Sahne>

            <Sahne gecikme={240}>
              <p className="text-metin-3 mt-8 flex items-center gap-2 text-govde-kucuk">
                <DogrulanmisIkon width={16} height={16} className="shrink-0" />
                Tüm ilanlarımız EİDS doğrulamalıdır ve taşınmaz numarasıyla yayınlanır.
              </p>
            </Sahne>
          </div>

          {/* ⚠️ Sahne mobilde de çiziliyor ama SIRA DEĞİŞMİYOR: başlık her
              zaman önce okunuyor. `order` ile fotoğrafı öne almak LCP'yi
              metinden görsele kaydırırdı. */}
          {sahne !== undefined ? <div className="lg:w-[26rem]">{sahne}</div> : null}
        </div>
      </div>
    </section>
  )
}

/**
 * Hover'da ilerleyen ok.
 *
 * ⚠️ Hareket `transform` ile — `margin` ya da `padding` düzen hesabı
 * tetikler ve 60 fps'i düşürür. Dokunmatikte hover yok; `group-hover`
 * orada zaten devreye girmiyor.
 */
function OkIkonu() {
  return (
    <svg
      viewBox="0 0 20 20"
      width={18}
      height={18}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-[3px] motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
    >
      <path d="M4 10h11M11 6l4 4-4 4" />
    </svg>
  )
}
