'use client'

import { useRef, type ReactNode } from 'react'

/**
 * İşaretçiyi takip eden 3B eğilme.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN three.js DEĞİL — ölçülebilir bir gerekçe.
 *
 * Gerçek bir 3B motoru (three.js ~150 kB gzip, Spline daha fazlası) bu
 * sitede iki sert kuralı birden çiğnerdi: ana sayfa istemci JS bütçesi
 * 220 kB gzip ve mobil LCP hedefi 2,5 sn. İkisi de CI'da ölçülüyor.
 *
 * Kartlara derinlik hissini veren şey model değil PERSPEKTİF: `perspective`
 * + `rotateX/rotateY` gerçek bir 3B dönüşüm ve tarayıcının kendi
 * derleyicisinde, GPU'da koşuyor. Sıfır bayt.
 *
 * Sitenin gerçek 3B gösterisi zaten var ve yerinde duruyor: `/harita`
 * sayfasındaki MapLibre `fill-extrusion` sütunları. Gösteriyi oraya
 * bırakıp vitrini hafif tutmak, ikisini birden ağırlaştırmaktan iyi.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ AÇI KÜÇÜK (azami 6°). Büyük açı "oyuncak" hissi verir ve kartın
 * içindeki metni okunmaz hâle getirir; burada amaç kartın YÜZEY olduğunu
 * hissettirmek, onu döndürmek değil.
 *
 * ⚠️ Dönüşüm doğrudan öğeye yazılıyor, CSS değişkenine DEĞİL. Değişken
 * kalıtsal: üst öğede değiştirmek bütün çocukların stilini yeniden
 * hesaplatır ve işaretçi hareketinde bu her karede olur.
 */
export function EgilenKart({
  children,
  className,
  azamiAci = 6,
}: {
  children: ReactNode
  className?: string
  azamiAci?: number
}) {
  const dugumRef = useRef<HTMLDivElement>(null)
  const kareRef = useRef<number | null>(null)

  const egil = (olay: React.PointerEvent<HTMLDivElement>) => {
    const dugum = dugumRef.current
    if (dugum === null) return
    // ⚠️ Yalnızca gerçek işaretçi: dokunmatikte parmak zaten kartın üstünde
    // ve eğilme, kaydırmayı bozan bir titremeye dönüşüyor.
    if (olay.pointerType !== 'mouse') return

    if (kareRef.current !== null) cancelAnimationFrame(kareRef.current)
    const { clientX, clientY } = olay

    kareRef.current = requestAnimationFrame(() => {
      const kutu = dugum.getBoundingClientRect()
      // Merkeze göre -0,5 … 0,5
      const x = (clientX - kutu.left) / kutu.width - 0.5
      const y = (clientY - kutu.top) / kutu.height - 0.5

      dugum.style.transform =
        `perspective(900px) rotateX(${(-y * azamiAci).toFixed(2)}deg) ` +
        `rotateY(${(x * azamiAci).toFixed(2)}deg) translateZ(0)`
    })
  }

  const birak = () => {
    const dugum = dugumRef.current
    if (dugum === null) return
    if (kareRef.current !== null) cancelAnimationFrame(kareRef.current)
    // Boş dizge: satır içi dönüşüm kalkıyor ve CSS'teki geçiş onu
    // yumuşakça sıfıra oturtuyor.
    dugum.style.transform = ''
  }

  return (
    <div
      ref={dugumRef}
      onPointerMove={egil}
      onPointerLeave={birak}
      /**
       * ⚠️ Geçiş SÜREKLİ açık ve kısa (140 ms). İşaretçi hareketinde bu
       * yumuşatma görevi görüyor — her kare tam hedefe atlamak yerine
       * yaklaşıyor, yani yay hissi veriyor. Ayrılışta da aynı geçiş kartı
       * geri oturtuyor: ayrı bir "geri dön" animasyonu gerekmiyor.
       *
       * ⚠️ `transition: transform` — `all` DEĞİL. `all`, gölge ve renk gibi
       * pahalı özellikleri de her karede canlandırırdı.
       */
      className={`[transition:transform_140ms_var(--cikis)] [transform-style:preserve-3d] motion-reduce:!transform-none motion-reduce:transition-none ${className ?? ''}`}
    >
      {children}
    </div>
  )
}
