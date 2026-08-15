import type { ReactNode } from 'react'

import { sinif } from '@/lib/sinif'

/**
 * Güven şeridi — dört rakam, gold ince çizgilerle ayrılmış.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ RAKAM UYDURULMAZ (CLAUDE.md kural 2).
 *
 * "Aktif portföy 47" yazan bir şerit, portföyde 3 ilan varken kurumsal
 * değil sahte görünür — ve bu bir yatırım sitesinde itibar riskidir.
 * Bu yüzden `deger` `null` olabiliyor ve o hücre boş durumunu gösteriyor.
 *
 * Sayılabilir olanlar (portföy adedi, mahalle sayısı) veritabanından
 * gelir. Sayılamayanlar (ortalama işlem süresi) Aslıhan'ın gireceği
 * veriye bağlı; gelene kadar boş durur.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ Gold çizgiler DEKORATİF: hücreleri ayırıyorlar, bilgi taşımıyorlar.
 * Mobilde ızgara tek sütuna indiği için dikey ayraçlar yatay olur —
 * `divide-*` bunu kendiliğinden yapmıyor, bu yüzden kenarlık yönü kırılım
 * noktasında değişiyor.
 */

export interface GuvenOgesi {
  /** Üstteki küçük etiket. */
  etiket: string
  /**
   * Gösterilecek değer. `null` ise veri henüz yok — hücre boş durumunu
   * gösterir, sıfır ya da tahmin YAZMAZ.
   */
  deger: string | null
  /** Değerin altındaki tek satırlık açıklama. */
  aciklama?: string
}

export function GuvenSeridi({ ogeler }: { ogeler: readonly GuvenOgesi[] }) {
  if (ogeler.length === 0) return null

  return (
    <section aria-label="Kurumsal göstergeler" className="bg-yuzey-2 border-kenar border-y-[0.5px]">
      <div className="kapsayici">
        <dl
          className={sinif(
            'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
            // Gold ayraçlar: mobilde yatay, masaüstünde dikey.
            'divide-gold-cizgi divide-y lg:divide-x lg:divide-y-0',
          )}
        >
          {ogeler.map((oge) => (
            <Hucre key={oge.etiket} oge={oge} />
          ))}
        </dl>
      </div>
    </section>
  )
}

function Hucre({ oge }: { oge: GuvenOgesi }) {
  return (
    <div className="flex flex-col gap-1.5 px-0 py-8 lg:px-8 lg:first:pl-0 lg:last:pr-0">
      <dt className="text-metin-3 text-eyebrow font-medium uppercase">{oge.etiket}</dt>

      {oge.deger === null ? (
        /**
         * ⚠️ Boş durum tasarlandı, gizlenmedi.
         *
         * Hücreyi hiç göstermemek şeridi üç sütuna düşürür ve düzeni bozar;
         * "0" yazmak ise yanlış bilgi verir. "Hazırlanıyor" ikisini de
         * yapmadan durumu dürüstçe söylüyor.
         */
        /**
         * ⚠️ Renk `metin-pasif` DEĞİL — Lighthouse yakaladı.
         *
         * O jeton DEVRE DIŞI BİLEŞENLER için ve WCAG 1.4.3'ün muafiyeti
         * de yalnızca onları kapsıyor. "Hazırlanıyor" ise gerçek içerik:
         * krem üzerinde 2,42:1 veriyordu ve muafiyet burada geçerli
         * değildi. `metin-3` aynı zeminde 6,12.
         */
        <dd className="text-metin-3 text-govde-kucuk">Hazırlanıyor</dd>
      ) : (
        <dd className="text-rakam rakam text-metin font-medium">{oge.deger}</dd>
      )}

      {/*
        ⚠️ AÇIKLAMA <p> DEĞİL İKİNCİ BİR <dd>.
        
        `<dl>` içindeki bir `<div>` yalnızca `<dt>` ve `<dd>` taşıyabilir;
        `<p>` geçersizdi ve Lighthouse'un `definition-list` denetimi bunu
        her sayfada düşürüyordu. Bir terimin birden fazla açıklaması
        olabilir — ikinci `<dd>` hem geçerli hem anlamca doğru.
      */}
      {oge.aciklama ? <dd className="text-metin-3 text-mikro">{oge.aciklama}</dd> : null}
    </div>
  )
}

/** Şeridin içinde kullanılabilen serbest içerik hücresi (yetki belgesi gibi). */
export function GuvenHucresi({ etiket, children }: { etiket: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 px-0 py-8 lg:px-8 lg:first:pl-0 lg:last:pr-0">
      <dt className="text-metin-3 text-eyebrow font-medium uppercase">{etiket}</dt>
      <dd className="text-govde-kucuk text-metin-2">{children}</dd>
    </div>
  )
}
