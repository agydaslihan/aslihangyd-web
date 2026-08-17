import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { onayliIstekSay, olaySay } from '@/lib/olcum/tampon'
import { gecerliOlayMi, olayNiyeti } from '@/lib/olcum/sozluk'
import { CEREZ_ONAY_ADI, izinVarMi, onayCoz } from '@/lib/kvkk/onay'

/**
 * Katman B olay ucu.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ONAY BURADA DA KONTROL EDİLİYOR — istemciye güvenilmiyor.
 *
 * Betiğin yalnızca onay varsa sayfaya eklenmesi (CLAUDE.md kural 8) ilk
 * kapı. Bu ikinci kapı, uca doğrudan istek atılması durumunu kapatıyor:
 * onay çerezi yoksa olay SAYILMAZ. Tek kapılı bir tasarımda, betiği elle
 * çağıran bir istek onaysız veri üretebilirdi.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ BU UÇ HİÇBİR ŞEY SAKLAMAZ, YALNIZCA SAYAÇ ARTIRIR.
 *
 * Gövdede IP, oturum kimliği, serbest metin yok; olay adı sözlükten
 * doğrulanıyor ve ayrıntı alanı kısaltılıyor. Veritabanına giden şey gün
 * bazında toplanmış bir sayı.
 *
 * ⚠️ Yanıt daima 204 ve gövdesiz. Hata ayrıntısı dönmek, uca istek atan
 * birine sözlüğü keşfetme imkânı verirdi; ayrıca ölçüm ucunun ziyaretçiye
 * söyleyecek hiçbir şeyi yok.
 */

const Govde = z.object({
  ad: z.string().max(40),
  /**
   * ⚠️ Ayrıntı SERBEST METİN DEĞİL: 40 karakter, yalnızca harf/rakam/
   * tire/nokta/eğik çizgi. Arama kutusuna yazılan cümlenin buraya
   * sızmasını yapısal olarak engelliyor.
   */
  ayrinti: z
    .string()
    .max(40)
    .regex(/^[\p{L}\p{N}._/-]*$/u)
    .optional(),
})

/** Tek istekte gönderilebilecek azami olay — beacon toplu gönderim yapıyor. */
const AZAMI_OLAY = 20

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

  const liste = Array.isArray(ham) ? ham.slice(0, AZAMI_OLAY) : [ham]

  for (const oge of liste) {
    const sonuc = Govde.safeParse(oge)
    if (!sonuc.success) continue

    // ⚠️ Sözlükte olmayan ad sayılmaz: uca uydurma olay adı gönderip
    // paneli kirletmek mümkün olmasın.
    if (!gecerliOlayMi(sonuc.data.ad)) continue

    olaySay(sonuc.data.ad, sonuc.data.ayrinti ?? null, olayNiyeti(sonuc.data.ad))
  }

  onayliIstekSay()

  return new NextResponse(null, { status: 204 })
}
