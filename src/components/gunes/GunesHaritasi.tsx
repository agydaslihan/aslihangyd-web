import { Feragat } from '@/components/ui/Feragat'
import { cepheOzetleri, saatYaz, type CepheYonu } from '@/lib/gunes/cephe'
import { GUNES_KISIT_METNI, gunesGunu } from '@/lib/gunes/hesap'

/**
 * Güneş Haritası — ilan ve mahalle sayfalarında.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ SUNUCUDA HESAPLANIYOR, DIŞ API YOK.
 *
 * Hesap saf ve hafif (72 nokta × birkaç trigonometrik işlem); istemciye
 * kod göndermenin karşılığı yok. Grafik düz SVG — ek kütüphane
 * eklenmiyor, ana sayfa JS bütçesi etkilenmiyor.
 *
 * ⚠️ CEPHE YÖNÜ YOKSA GÜNEŞ VERİSİ YİNE GÖSTERİLİR.
 *
 * Gün doğumu, batımı ve gündüz süresi KONUMA bağlı, cepheye değil.
 * Cephe girilmemişse yalnızca cephe analizi bölümü boş durum gösteriyor;
 * bütün bileşeni gizlemek, konuma bağlı doğru bilgiyi de saklamak olurdu.
 * ─────────────────────────────────────────────────────────────────────────
 */
export function GunesHaritasi({
  enlem,
  boylam,
  cepheler,
  baslik = 'Güneş haritası',
}: {
  enlem: number
  boylam: number
  /** Boş dizi = cephe yönü girilmemiş. TAHMİN EDİLMEZ. */
  cepheler: readonly CepheYonu[]
  baslik?: string
}) {
  /**
   * ⚠️ Referans gün BUGÜN değil, sabit iki gündönümü ve bugün.
   *
   * "Bugün" değişken bir çıktı üretir ve sayfa her gün farklı rakam
   * gösterir; karşılaştırma için gündönümleri sabit çapa. Üst şerit
   * bugünü, cephe analizi gündönümlerini gösteriyor.
   */
  const bugun = new Date()
  const gun = gunesGunu(enlem, boylam, bugun)
  const ozetler = cepheOzetleri(enlem, boylam, cepheler, bugun.getUTCFullYear())

  return (
    <section aria-labelledby="gunes-haritasi" className="mt-10">
      <h2 id="gunes-haritasi" className="text-baslik-3 mb-1 font-medium">
        {baslik}
      </h2>
      <p className="text-metin-3 text-govde-kucuk mb-4">
        Bugünün güneş verileri ve cephe analizi. Türkiye&apos;de cephe yönü, alım kararının
        merkezindeki bilgilerden biri.
      </p>

      {/* ── Üst şerit: dört kart ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kart etiket="Gün doğumu" deger={gun.gunDogumu} />
        <Kart etiket="Gün batımı" deger={gun.gunBatimi} />
        <Kart
          etiket="Gündüz süresi"
          deger={gun.gunduzDakika === null ? null : sureYaz(gun.gunduzDakika)}
        />
        <Kart etiket="Öğle güneş yüksekliği" deger={`${gun.ogleYuksekligi}°`} />
      </div>

      <YorungeGrafigi gun={gun} />

      {/* ── ⭐ Cephe analizi ── */}
      <div className="border-gold-cizgi rounded-kart mt-6 border p-4 sm:p-5">
        <h3 className="text-govde mb-3 font-medium">Cephe analizi</h3>

        {ozetler.length === 0 ? (
          /**
           * ⚠️ BOŞ DURUM — cephe TAHMİN EDİLMİYOR.
           *
           * Bir dairenin cephesi koordinattan çıkarılamaz. "Muhtemelen
           * güney" demek, alım kararı doğrudan bu bilgiye dayandığı için
           * uydurma veri yasağının en pahalı ihlali olurdu.
           */
          <p className="text-metin-2 text-govde-kucuk">
            Cephe yönü girilmemiş. Yukarıdaki güneş verileri konuma bağlıdır ve geçerlidir; cephe
            analizi için taşınmazın hangi yöne baktığı gerekiyor. Tahmin etmiyoruz.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {ozetler.map((ozet) => (
              <li key={ozet.yon} className="flex flex-wrap items-baseline justify-between gap-x-4">
                <span className="text-metin text-govde font-medium">{ozet.etiket} cephe</span>
                <span className="text-metin-2 text-govde-kucuk">
                  Yazın <span className="rakam">{saatYaz(ozet.yazDakika)}</span> · Kışın{' '}
                  <span className="rakam">{saatYaz(ozet.kisDakika)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className="text-metin-3 text-mikro mt-3">
          Süreler 21 Haziran (en uzun gün) ve 21 Aralık (en kısa gün) içindir.
        </p>
      </div>

      {/* ⚠️ KISIT METNİ ZORUNLU — güneş verisinin göründüğü her yerde. */}
      <Feragat sinifAdi="mt-4" ek={GUNES_KISIT_METNI} />
    </section>
  )
}

function Kart({ etiket, deger }: { etiket: string; deger: string | null }) {
  return (
    <div className="border-kenar bg-yuzey-2 rounded-kart border-[0.5px] p-3">
      <p className="text-metin-3 text-eyebrow font-medium uppercase">{etiket}</p>
      {deger === null ? (
        <p className="text-metin-3 mt-1 text-govde-kucuk">hesaplanamadı</p>
      ) : (
        <p className="rakam text-metin mt-1 text-baslik-3 font-medium">{deger}</p>
      )}
    </div>
  )
}

function sureYaz(dakika: number): string {
  const saat = Math.floor(dakika / 60)
  const dk = dakika % 60
  return `${saat} sa ${String(dk).padStart(2, '0')} dk`
}

/**
 * Günün güneş yörüngesi — yükseklik / saat eğrisi.
 *
 * ⚠️ Düz SVG, ek kütüphane yok. Ufuk çizgisi (0°) belirgin: eğrinin altına
 * düşen kısım gece demek ve bu, grafiğin tek gerçek okuma anahtarı.
 *
 * ⚠️ `role="img"` + `aria-label`: eğri tek başına bilgi taşıyor ve ekran
 * okuyucuya özet veriliyor. Ayrıntı zaten üstteki dört kartta metin olarak
 * duruyor.
 */
function YorungeGrafigi({ gun }: { gun: ReturnType<typeof gunesGunu> }) {
  const genislik = 720
  const yukseklik = 160
  const enCok = 90

  // Yalnızca ufkun üstündeki kısım çiziliyor; gece düz çizgi olurdu.
  const noktalar = gun.yorunge
    .map((nokta) => {
      const x = (nokta.dakika / 1440) * genislik
      const y = yukseklik - (Math.max(0, nokta.yukseklik) / enCok) * yukseklik
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <div className="border-kenar bg-yuzey rounded-kart mt-3 border-[0.5px] p-4">
      <svg
        viewBox={`0 0 ${genislik} ${yukseklik + 20}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Güneşin gün içindeki yüksekliği. Öğle vakti en yüksek nokta ${gun.ogleYuksekligi} derece.`}
      >
        {/* Ufuk çizgisi */}
        <line
          x1={0}
          y1={yukseklik}
          x2={genislik}
          y2={yukseklik}
          stroke="currentColor"
          strokeWidth={1}
          className="text-kenar-guclu"
        />
        <polyline
          points={noktalar}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-aksan-metin"
        />
        {[0, 6, 12, 18, 24].map((saat) => (
          <text
            key={saat}
            x={(saat / 24) * genislik}
            y={yukseklik + 16}
            textAnchor={saat === 0 ? 'start' : saat === 24 ? 'end' : 'middle'}
            className="fill-current text-metin-3"
            fontSize={11}
          >
            {String(saat).padStart(2, '0')}:00
          </text>
        ))}
      </svg>
    </div>
  )
}
