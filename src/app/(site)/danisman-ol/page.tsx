import type { Metadata } from 'next'

import { BasvuruFormu } from '@/components/danisman/BasvuruFormu'
import { Buton } from '@/components/ui/Buton'
import { turnstileSiteAnahtari } from '@/lib/guvenlik/turnstile'
import { mutlakAdres } from '@/lib/site'
import { danismanIceriginiGetir } from '@/lib/veri/danismanOl'
import { bolumKapisi } from '@/lib/veri/siteBolumleri'

import { danismanBasvuruGonder } from './eylemler'

export const metadata: Metadata = {
  title: 'Danışman ol — Aslıhan GYD ekibine katılın',
  description:
    'Çorlu ve çevresinde gayrimenkul danışmanı olarak çalışmak isteyenler için başvuru sayfası.',
  alternates: { canonical: mutlakAdres('/danisman-ol') },
}

/**
 * Danışman başvuru sayfası.
 *
 * ⚠️ Sayfa VARSAYILAN OLARAK KAPALI (`SiteBolumleri.danisman_ol`).
 * Kapalıyken 404 döner, altbilgide görünmez, ana sayfada yer almaz.
 *
 * ⚠️ Burada sözleşme, komisyon oranı ya da taahhüt metni YOK. Bu bir
 * davet sayfası; çalışma koşulları görüşmede yazılı olarak paylaşılır
 * (CLAUDE.md kural 3 — hukuki metinleri avukat yazar).
 */
export default async function DanismanOlSayfasi() {
  // ⚠️ Bölüm kapısı EN BAŞTA: kapalıysa hiçbir veri sorgusu çalışmasın
  // ve kapalı bölümün verisi RSC yüküne girmesin.
  await bolumKapisi('danisman_ol')

  const icerik = await danismanIceriginiGetir()

  return (
    <div className="kapsayici py-10 sm:py-14">
      {/* ── Davet bloğu ── */}
      <section className="bg-kakao-yuzey rounded-buyuk px-6 py-10 text-koyu-bant-metin sm:px-10 sm:py-12">
        <div className="flex max-w-2xl flex-col gap-4">
          <h1 className="text-baslik-1">{icerik.baslik}</h1>
          <p className="text-govde opacity-90">{icerik.aciklama}</p>

          {/*
            ⚠️ Bakır buton BİLİNÇLİ OLARAK YOK.

            Şartname bu blokta bakır buton istiyordu, ama bakır kuralı iki
            eylemle sınırlı: "Evimi değerlendir" ve "Erişim talep et".
            Üçüncü bir yerde kullanmak ikisini birden sıradanlaştırırdı —
            ve kural zaten "nadir olduğu için işe yarıyor" diyor. Burada
            sayfa içi bir çapa yeterli: form zaten hemen aşağıda.
          */}
          <div className="mt-2">
            <Buton href="#basvuru" gorunum="ikincil" sinifAdi="!border-white/40 !text-white">
              Başvuru formuna git
            </Buton>
          </div>
        </div>
      </section>

      {/* ── Neden birlikte çalışmalı ── */}
      {icerik.nedenler.length > 0 ? (
        <section className="mt-12" aria-labelledby="nedenler">
          <h2 id="nedenler" className="text-baslik-2 mb-6">
            Neden birlikte çalışmalı
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {icerik.nedenler.map((neden) => (
              <li
                key={neden.baslik}
                className="bg-yuzey rounded-kart flex flex-col gap-2 border-[0.5px] border-kenar p-5"
              >
                <h3 className="text-baslik-3">{neden.baslik}</h3>
                {neden.metin ? (
                  <p className="text-metin-2 text-govde-kucuk">{neden.metin}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── Form ── */}
      <section
        id="basvuru"
        className="mt-12 max-w-2xl scroll-mt-24"
        aria-labelledby="basvuru-basligi"
      >
        <h2 id="basvuru-basligi" className="text-baslik-2 mb-2">
          Başvuru formu
        </h2>
        <p className="text-metin-2 text-govde-kucuk olcu mb-6">
          Formu doldurun; uygun bir pozisyon açıldığında sizinle iletişime geçelim. Yıldızsız
          alanları boş bırakabilirsiniz.
        </p>

        <BasvuruFormu
          eylem={danismanBasvuruGonder}
          turnstileSiteAnahtari={turnstileSiteAnahtari()}
        />
      </section>
    </div>
  )
}
