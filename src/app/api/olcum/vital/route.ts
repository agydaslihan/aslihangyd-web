import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { CEREZ_ONAY_ADI, izinVarMi, onayCoz } from '@/lib/kvkk/onay'
import { cihazSinifi } from '@/lib/olcum/tipler'
import { onayliIstekSay, vitalSay } from '@/lib/olcum/tampon'
import { gecerliVitalMi, kovaSirasi } from '@/lib/olcum/vital'

/**
 * Core Web Vitals alan verisi ucu.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ KATMAN B — ONAY OLMADAN ÇALIŞMAZ.
 *
 * Web Vitals toplamak bir istemci betiği gerektiriyor; CLAUDE.md kural 8
 * "onay alınmadan analitik betiği YÜKLENMEZ" diyor. Ölçülen şeyin teknik
 * bir zamanlama olması bu kuralı gevşetmiyor: kural betiğin niteliğine
 * değil varlığına bakıyor.
 *
 * ⚠️ SONUCU: ÖRNEKLEM ONAY VERENLERLE SINIRLI VE BU PANELDE YAZIYOR.
 * Onay vermeyen ziyaretçilerin cihazları sistematik olarak farklı olabilir;
 * sapmayı gizlemek, ölçümün kendisinden daha zararlı olurdu.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ HAM DEĞER TAMPONA HİÇ ULAŞMIYOR.
 *
 * Gelen sayı burada bir kova sırasına çevriliyor ve tampona yalnızca kova
 * gidiyor. "LCP = 2.431 ms" tek bir ziyarete ait bir kayıt olurdu; kovaya
 * düşen sayaç kimseye ait değil. Gerekçenin tamamı `lib/olcum/vital.ts`.
 *
 * ⚠️ ROTA GÖNDERİLMİYOR. Metrik + rota + cihaz + zaman birleşimi, az
 * ziyaretçili bir sayfada tek bir kişiyi işaret edebilirdi. Site geneli
 * dağılım, "hangi sayfa yavaş" sorusunu kaybettiriyor ama o soruyu
 * laboratuvar ölçümü zaten cevaplıyor; alan verisinden beklenen "gerçek
 * cihazlarda gerçekten ne oluyor".
 *
 * ⚠️ Yanıt daima 204, gövdesiz — ölçüm ucunun ziyaretçiye söyleyeceği bir
 * şey yok ve hata ayrıntısı dönmek uca istek atana bilgi verirdi.
 */

const Govde = z.object({
  ad: z.string().max(8),
  /**
   * ⚠️ Üst sınır var: `Number.MAX_VALUE` gönderip histogramı bozmak
   * mümkün olmasın. 600 sn'den uzun bir LCP zaten ölçüm hatasıdır.
   */
  deger: z.number().finite().min(0).max(600_000),
})

/** Bir istekte gönderilebilecek azami ölçüm — üç metrik var, pay bırakıldı. */
const AZAMI_OLCUM = 6

export async function POST(istek: NextRequest): Promise<NextResponse> {
  const onay = onayCoz(istek.cookies.get(CEREZ_ONAY_ADI)?.value)
  if (!izinVarMi(onay, 'analitik')) {
    return new NextResponse(null, { status: 204 })
  }

  let ham: unknown
  try {
    ham = await istek.json()
  } catch {
    return new NextResponse(null, { status: 204 })
  }

  const cihaz = cihazSinifi(istek.headers.get('user-agent'))
  const liste = Array.isArray(ham) ? ham.slice(0, AZAMI_OLCUM) : [ham]

  for (const oge of liste) {
    const sonuc = Govde.safeParse(oge)
    if (!sonuc.success) continue

    // ⚠️ Sözlük dışı ad sayılmaz: uydurma metrik adıyla panel kirletilmesin.
    if (!gecerliVitalMi(sonuc.data.ad)) continue

    const kova = kovaSirasi(sonuc.data.ad, sonuc.data.deger)
    if (kova === null) continue

    vitalSay(sonuc.data.ad, cihaz, kova)
  }

  onayliIstekSay()

  return new NextResponse(null, { status: 204 })
}
