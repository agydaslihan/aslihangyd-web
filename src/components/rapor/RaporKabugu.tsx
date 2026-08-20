import type { ReactNode } from 'react'

import { Buton } from '@/components/ui/Buton'
import { Feragat } from '@/components/ui/Feragat'
import { YazdirButonu } from '@/components/rapor/YazdirButonu'
import { tarihiYaz } from '@/lib/tarih'

/**
 * Rapor kabuğu — yazdırılabilir/PDF çıktı alınabilir sonuç sayfası.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN PDF KÜTÜPHANESİ YOK
 *
 * PDF üretimi için `pdf-lib` ve `@react-pdf/renderer` ölçüldü:
 *
 *  - `pdf-lib` diskte 23 MB; `@react-pdf/renderer` 71 paket / 56 MB.
 *  - Daha önemlisi: `pdf-lib`'in standart fontları WinAnsi kodlamalıdır ve
 *    **Türkçe karakterleri kodlayamaz** (`WinAnsi cannot encode "ğ"`).
 *    Çalışması için `fontkit` + depoya gömülü bir TTF (~700 KB ikili dosya)
 *    gerekir. Kullanıcıya görünen her şeyin Türkçe olduğu bir projede bu,
 *    kütüphanenin en temel işini yapamaması demek.
 *  - Sunucu 3,2 GB RAM ve derleme süresi 87 sn (eşik 90 sn).
 *
 * Bunun yerine yazdırma yolu kullanılıyor: tarayıcının "PDF olarak kaydet"
 * seçeneği **gerçek bir PDF dosyası** üretir. Kullanıcının eline geçen
 * çıktı aynıdır; Türkçe sistem fontlarıyla kusursuz çıkar, sıfır bağımlılık
 * ekler ve derleme süresini artırmaz.
 *
 * Ayrıca bu sayfa bir URL'dir: paylaşılabilir, yer imine eklenebilir ve
 * SMTP kurulduğunda sunucuda aynı rota render edilerek e-postaya
 * iliştirilebilir.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ Rapor bal küpü kuralına tabidir (CLAUDE.md 6b): raporu görmek ve
 * indirmek için iletişim bilgisi İSTENMEZ.
 */
export function RaporKabugu({
  baslik,
  altBaslik,
  girdiOzeti,
  children,
  geriAdres,
  geriEtiket,
  vergiIcerir = false,
  parametreTarihi,
}: {
  baslik: string
  altBaslik: string
  /** Raporun hangi girdilerle üretildiği — çıktının tek başına anlaşılması için şart. */
  girdiOzeti: { etiket: string; deger: string }[]
  children: ReactNode
  geriAdres: string
  geriEtiket: string
  vergiIcerir?: boolean
  parametreTarihi?: string | null
}) {
  const uretimTarihi = new Date().toISOString()

  return (
    <div className="kapsayici py-8 sm:py-12">
      <div className="mx-auto max-w-3xl" data-rapor>
        <div
          className="mb-6 flex flex-wrap items-center justify-between gap-3"
          data-yazdirma="gizle"
        >
          <Buton href={geriAdres} gorunum="hayalet" boyut="kucuk">
            ← {geriEtiket}
          </Buton>
          <YazdirButonu />
        </div>

        <header className="border-kenar border-b-[0.5px] pb-5">
          <h1 className="font-baslik text-baslik-2-mobil font-medium sm:text-baslik-2">{baslik}</h1>
          <p className="text-metin-2 mt-2 leading-relaxed">{altBaslik}</p>
          <p className="text-metin-3 text-mikro mt-3">
            Rapor tarihi: {tarihiYaz(uretimTarihi)} · aslihangyd.com
          </p>
        </header>

        {girdiOzeti.length > 0 ? (
          <section className="mt-6">
            <h2 className="font-sans text-govde font-medium">Girdiğiniz bilgiler</h2>
            <dl className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">
              {girdiOzeti.map((satir) => (
                <div
                  key={satir.etiket}
                  className="border-kenar/60 flex items-baseline justify-between gap-4 border-b-[0.5px] py-1.5"
                >
                  <dt className="text-metin-2 text-govde-kucuk">{satir.etiket}</dt>
                  <dd className="rakam shrink-0 text-govde-kucuk font-medium">{satir.deger}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {children}

        <footer className="border-kenar mt-10 border-t-[0.5px] pt-6">
          {parametreTarihi ? (
            <p className="text-metin-3 text-mikro mb-3">
              Vergi ve harç oranları <strong>{tarihiYaz(parametreTarihi)}</strong> itibarıyla
              güncellenmiştir.
            </p>
          ) : null}

          <Feragat
            ek={
              vergiIcerir
                ? 'Vergi hesabı basitleştirilmiştir ve kişisel durumunuza göre değişir; mali müşavirinize danışın.'
                : undefined
            }
          />

          <p className="text-metin-3 text-mikro mt-4 leading-relaxed">
            Bu rapor girdiğiniz bilgilerden anlık olarak üretildi ve hiçbir yere kaydedilmedi.
            Raporu görmek için iletişim bilgisi istemiyoruz.
          </p>
        </footer>
      </div>
    </div>
  )
}

/** Rapor içinde başlıklı bölüm — yazdırmada sayfa ortasından bölünmez. */
export function RaporBolumu({
  baslik,
  aciklama,
  children,
}: {
  baslik: string
  aciklama?: string
  children: ReactNode
}) {
  return (
    <section className="mt-8">
      <h2 className="text-baslik-3 font-medium">{baslik}</h2>
      {aciklama ? (
        <p className="text-metin-2 mt-1.5 text-govde-kucuk leading-relaxed">{aciklama}</p>
      ) : null}
      <div className="mt-3">{children}</div>
    </section>
  )
}

/** Rapor satırı — etiket solda, değer sağda. */
export function RaporSatiri({
  etiket,
  deger,
  aciklama,
  vurgulu = false,
}: {
  etiket: string
  deger: string | null
  aciklama?: string
  vurgulu?: boolean
}) {
  return (
    <div
      className={
        vurgulu
          ? 'border-kenar flex items-baseline justify-between gap-4 border-t-[0.5px] py-2.5'
          : 'border-kenar/60 flex items-baseline justify-between gap-4 border-b-[0.5px] py-2'
      }
    >
      <div className="min-w-0">
        <dt className={vurgulu ? 'text-govde-kucuk font-medium' : 'text-metin-2 text-govde-kucuk'}>
          {etiket}
        </dt>
        {aciklama ? <p className="text-metin-3 text-mikro">{aciklama}</p> : null}
      </div>
      <dd
        className={
          vurgulu
            ? 'rakam shrink-0 text-govde font-medium'
            : 'rakam shrink-0 text-govde-kucuk font-medium'
        }
      >
        {deger ?? '—'}
      </dd>
    </div>
  )
}
