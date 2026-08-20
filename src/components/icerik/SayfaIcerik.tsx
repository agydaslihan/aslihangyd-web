import type { ReactNode } from 'react'

import { ZenginMetin } from '@/components/ui/ZenginMetin'
import type { SayfaIcerigi } from '@/lib/veri/sayfaIcerikleri'

/**
 * Panelden gelen başlık ve açıklama — yoksa koddaki metin.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ YEDEK METİN ÇAĞIRAN TARAFTA DURUYOR, BURADA DEĞİL.
 *
 * Varsayılanları bu bileşene taşımak altı sayfanın metnini tek dosyada
 * toplardı ve o dosya sayfaların hiçbirine ait olmazdı. Sayfa kendi
 * varsayılanını taşıyor; bileşen yalnızca "panelden geldiyse onu kullan"
 * kuralını uyguluyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ `h1` seviyesi sabit ve tek. İçerik editöründe `h1` kapalı olduğu için
 * sayfada ikinci bir `h1` oluşamıyor.
 */
export function SayfaBasligi({
  icerik,
  varsayilanBaslik,
  varsayilanAciklama,
  h1Sinifi = 'font-baslik text-baslik-1-mobil font-medium sm:text-baslik-1',
  aciklamaSinifi = 'text-metin-2 leading-relaxed',
}: {
  icerik: SayfaIcerigi
  varsayilanBaslik: string
  varsayilanAciklama?: ReactNode
  h1Sinifi?: string
  aciklamaSinifi?: string
}) {
  return (
    <>
      <h1 className={h1Sinifi}>{icerik.baslik ?? varsayilanBaslik}</h1>

      {icerik.altBaslik !== null ? (
        <p className={`${aciklamaSinifi} whitespace-pre-line`}>{icerik.altBaslik}</p>
      ) : (
        varsayilanAciklama
      )}
    </>
  )
}

/**
 * Panelden gelen serbest metin ve görseller.
 *
 * ⚠️ İçerik yoksa HİÇBİR ŞEY çizilmiyor — boş bölüm ya da boşluk
 * bırakmıyor. "Düzenlenebilir yaptık" diye içerik girilene kadar tasarımı
 * bozmak, kazançtan çok kayıp olurdu.
 */
export function SayfaGovdesi({ icerik }: { icerik: SayfaIcerigi }) {
  if (icerik.icerik === null && icerik.gorseller.length === 0) return null

  return (
    <div className="mt-10 flex flex-col gap-8">
      <ZenginMetin veri={icerik.icerik} />

      {icerik.gorseller.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {icerik.gorseller.map((gorsel) => (
            <figure key={gorsel.url} className="flex flex-col gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- medya kaydı zaten AVIF/WebP üretiyor. */}
              <img
                src={gorsel.url}
                alt={gorsel.alt}
                width={gorsel.en ?? undefined}
                height={gorsel.boy ?? undefined}
                loading="lazy"
                className="rounded-kart w-full object-cover"
              />
              {gorsel.aciklama !== null ? (
                <figcaption className="text-metin-3 text-mikro">{gorsel.aciklama}</figcaption>
              ) : null}
            </figure>
          ))}
        </div>
      ) : null}
    </div>
  )
}
