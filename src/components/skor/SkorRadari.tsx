import { sinif } from '@/lib/sinif'
import type { BilesenSonucu } from '@/lib/skorlama/yatirimSkoru'

/**
 * Yatırım skoru radar grafiği.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Tasarım kararları
 *
 * **Neden radar?** CLAUDE.md açıkça radar istiyor. Radar, altı bileşenin
 * *profilini* — mahallenin şeklini — tek bakışta okutur. Zayıf yanı, alan
 * yanılsaması nedeniyle değerleri kesin karşılaştırmaya elverişsiz olması.
 * Bu yüzden radar **tek başına bırakılmadı**: hemen altında her bileşenin
 * sayısal değeri çubukla ve rakamla veriliyor. Şekil radardan, kesin okuma
 * listeden gelir.
 *
 * **Tek seri, tek renk.** Altı eksen tek bir mahalleyi anlatır; kategorik
 * palet ve gösterge (legend) gerekmez — başlık zaten neyi gösterdiğini
 * söylüyor. Çubuklara değere göre renk vermek (koyu = yüksek) çubuk
 * uzunluğunu ikinci kez kodlamak olurdu.
 *
 * **Kütüphane yok.** Bir grafik kütüphanesi bu iş için ~50 kB gzip ekler.
 * Altı köşeli bir çokgen, 40 satır SVG.
 *
 * **Erişilebilirlik:** SVG dekoratif işaretlenir (`aria-hidden`); anlam,
 * altındaki listede metin olarak yaşar. Ekran okuyucu kullanan biri hiçbir
 * şey kaybetmez.
 *
 * Koyu tema: renkler CSS değişkenlerinden gelir, otomatik ters çevirme yok.
 * ─────────────────────────────────────────────────────────────────────────
 */

const BOYUT = 260
const MERKEZ = BOYUT / 2
const YARICAP = 92
/** Izgara halkaları — 25/50/75/100 seviyeleri. */
const HALKALAR = [0.25, 0.5, 0.75, 1]

export function SkorRadari({
  bilesenler,
  sinifAdi,
}: {
  bilesenler: BilesenSonucu[]
  sinifAdi?: string
}) {
  // Verisi olmayan bileşen radarda 0 olarak çizilemez — bu, mahalleyi
  // olduğundan kötü gösterirdi. Yalnızca verisi olanlar çizilir ve
  // eksikler listede ayrıca belirtilir.
  const cizilecekler = bilesenler.filter((bilesen) => bilesen.hamPuan !== null)

  if (cizilecekler.length < 3) {
    // Üçten az köşeyle çokgen olmaz.
    return null
  }

  const acilar = cizilecekler.map(
    (_, sira) => (sira / cizilecekler.length) * Math.PI * 2 - Math.PI / 2,
  )

  const nokta = (sira: number, oran: number) => {
    const aci = acilar[sira]!
    return {
      x: MERKEZ + Math.cos(aci) * YARICAP * oran,
      y: MERKEZ + Math.sin(aci) * YARICAP * oran,
    }
  }

  const veriNoktalari = cizilecekler.map((bilesen, sira) =>
    nokta(sira, (bilesen.hamPuan as number) / 100),
  )

  const veriYolu = veriNoktalari.map((n) => `${n.x.toFixed(1)},${n.y.toFixed(1)}`).join(' ')

  return (
    <svg
      viewBox={`0 0 ${BOYUT} ${BOYUT}`}
      className={sinif('h-auto w-full max-w-[17rem]', sinifAdi)}
      // Grafik dekoratiftir; anlam yanındaki listede.
      aria-hidden="true"
      focusable="false"
    >
      {/* Izgara halkaları — geri planda kalmalı */}
      {HALKALAR.map((oran) => (
        <polygon
          key={oran}
          points={cizilecekler
            .map((_, sira) => {
              const n = nokta(sira, oran)
              return `${n.x.toFixed(1)},${n.y.toFixed(1)}`
            })
            .join(' ')}
          fill="none"
          stroke="var(--color-kenar)"
          strokeWidth={1}
        />
      ))}

      {/* Eksen çizgileri */}
      {cizilecekler.map((bilesen, sira) => {
        const uc = nokta(sira, 1)
        return (
          <line
            key={bilesen.ad}
            x1={MERKEZ}
            y1={MERKEZ}
            x2={uc.x}
            y2={uc.y}
            stroke="var(--color-kenar)"
            strokeWidth={1}
          />
        )
      })}

      {/* Veri çokgeni — tek seri, tek renk */}
      <polygon
        points={veriYolu}
        fill="var(--color-gosterge)"
        fillOpacity={0.14}
        stroke="var(--color-gosterge)"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Köşe işaretleri — en az 8px dokunma/görme hedefi */}
      {veriNoktalari.map((n, sira) => (
        <circle
          key={cizilecekler[sira]!.ad}
          cx={n.x}
          cy={n.y}
          r={4}
          fill="var(--color-gosterge)"
          stroke="var(--color-yuzey)"
          strokeWidth={2}
        />
      ))}
    </svg>
  )
}

/**
 * Skorun sayısal kırılımı.
 *
 * ⚠️ Radar tek başına yayınlanmaz. Kesin değerler burada okunur; bu aynı
 * zamanda grafiğin erişilebilir karşılığıdır.
 */
export function SkorKirilimi({ bilesenler }: { bilesenler: BilesenSonucu[] }) {
  return (
    <dl className="flex flex-col gap-3">
      {bilesenler.map((bilesen) => (
        <div key={bilesen.ad} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-govde-kucuk font-medium">
              {bilesen.etiket}
              <span className="text-metin-3 ml-1.5 font-normal">(ağırlık %{bilesen.agirlik})</span>
            </dt>
            <dd className="rakam shrink-0 text-govde-kucuk font-medium">
              {bilesen.hamPuan === null ? (
                <span className="text-metin-3 font-normal">Veri yok</span>
              ) : (
                `${bilesen.hamPuan} / 100`
              )}
            </dd>
          </div>

          {/* Çubuk — tek renk; değere göre renklendirmek uzunluğu ikinci
              kez kodlamak olurdu. */}
          <div className="bg-yuzey-2 h-1.5 overflow-hidden rounded-full">
            {bilesen.hamPuan === null ? null : (
              <div
                className="bg-koyu-bant h-full rounded-full"
                style={{ width: `${bilesen.hamPuan}%` }}
              />
            )}
          </div>

          <p className="text-metin-3 text-mikro leading-snug">{bilesen.aciklama}</p>
        </div>
      ))}
    </dl>
  )
}
