import type { ReactNode } from 'react'

import { Sahne } from '@/components/hareket/Sahne'

/**
 * İç sayfaların açılış bandı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: LİSTE SAYFALARININ AÇILIŞI YOKTU.
 *
 * `/portfoy` ve `/mahalleler` doğrudan küçük, ortalanmış bir başlıkla
 * başlayıp hemen kart ızgarasına giriyordu. Sayfa "açılmıyor", içeriğin
 * ortasına düşüyordunuz: ne bulunduğunuz yeri söyleyen bir zemin vardı ne
 * de listenin ne olduğunu anlatan bir nefes.
 *
 * Bant, ana sayfadaki vitrinin sakin kardeşi: aynı krem zemin, aynı gold
 * sıcaklığı, aynı serif başlık — ama sahne yok. İç sayfada gösteri değil,
 * konum duygusu gerekiyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ BAŞLIK BURADA ÇİZİLMİYOR, `cocuklar` OLARAK GELİYOR.
 *
 * Sayfa başlıkları CMS'ten düzenlenebiliyor (`SayfaBasligi`) ve bu bileşen
 * onu kendi içinde yeniden kursaydı, düzenlenebilirlik zinciri kopardı.
 * Bant yalnızca zemin, ritim ve giriş hareketi veriyor.
 *
 * ⚠️ `<h1>` BASMIYOR. Sayfanın tek `<h1>`i içeriden geliyor; bant kendi
 * başlığını eklerse sayfada iki tane olurdu — ana sayfada tam olarak bu
 * tuzağa düşülmüştü.
 */
export function SayfaVitrini({
  children,
  yan,
  genis = false,
}: {
  children: ReactNode
  /** Sağda duran özet/eylem. Mobilde başlığın altına iner. */
  yan?: ReactNode
  /** Metin bloğu tam genişliğe yayılsın mı — uzun açıklamalı sayfalar için. */
  genis?: boolean
}) {
  return (
    <section className="bg-zemin border-kenar relative isolate overflow-hidden border-b-[0.5px]">
      {/* ⚠️ Ana sayfadakinin yarısı kadar yoğun (%18 → %10) ve daha yukarıda.
          İç sayfa bir liste taşıyor; zemin dikkat çekerse listeyle yarışır. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 60% at 82% 18%, color-mix(in oklab, var(--color-gold-400) 10%, transparent), transparent 66%)',
        }}
      />

      <div className="kapsayici py-12 sm:py-16 lg:py-20">
        <div
          className={
            yan !== undefined
              ? 'flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-12'
              : ''
          }
        >
          <Sahne className={genis ? '' : 'max-w-2xl'}>{children}</Sahne>

          {yan !== undefined ? (
            <Sahne gecikme={80} className="shrink-0">
              {yan}
            </Sahne>
          ) : null}
        </div>
      </div>
    </section>
  )
}

/**
 * Bandın sağındaki rakam özeti.
 *
 * ⚠️ DEĞER `null` OLABİLİR VE BU BİR ÖZELLİK.
 *
 * Sıfır yazmak yanlış bilgi, hücreyi gizlemek düzeni bozar (aynı gerekçe
 * ana sayfanın güven şeridinde de yazılı). Veri yoksa hücre kendi boş
 * durumunu gösteriyor.
 */
export function VitrinOzeti({
  ogeler,
}: {
  ogeler: readonly { etiket: string; deger: string | null }[]
}) {
  return (
    <dl className="divide-kenar border-kenar flex divide-x-[0.5px] border-[0.5px] rounded-kart bg-yuzey">
      {ogeler.map((oge) => (
        <div key={oge.etiket} className="flex flex-col gap-1 px-5 py-4 sm:px-6">
          <dt className="text-metin-3 text-mikro uppercase">{oge.etiket}</dt>
          <dd
            className={
              oge.deger === null
                ? 'text-metin-3 text-govde-kucuk'
                : 'text-metin font-serif text-rakam font-medium'
            }
          >
            {oge.deger ?? 'Veri bekleniyor'}
          </dd>
        </div>
      ))}
    </dl>
  )
}
