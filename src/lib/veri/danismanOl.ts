import 'server-only'

import { cache } from 'react'

import { payloadGetir, ZIYARETCI } from './istemci'

export interface DanismanSayfaIcerigi {
  baslik: string
  aciklama: string
  nedenler: { baslik: string; metin: string }[]
}

/**
 * "Danışman ol" sayfasının içeriği.
 *
 * ⚠️ Varsayılan metinler bilinçli olarak SOMUT ve VAATSİZ. "Yüksek kazanç"
 * gibi bir ifade hem reklam mevzuatı açısından risklidir hem de sitenin
 * her yerinde savunduğumuz "rakamla konuş" tonunu bozar. Aslıhan panelden
 * değiştirebilir; başlangıç değeri onu zor duruma sokmamalı.
 */
const VARSAYILAN: DanismanSayfaIcerigi = {
  baslik: 'Aslıhan GYD ekibinde danışman olarak çalışın',
  aciklama:
    'Çorlu ve çevresinde, veriyle çalışmayı önemseyen danışmanlarla birlikte çalışıyoruz. ' +
    'Başvurunuzu bırakın; uygun bir pozisyon açıldığında sizinle konuşalım.',
  nedenler: [
    {
      baslik: 'Portföy ve veri altyapısı hazır',
      metin:
        'Mahalle verileri, kira çarpanı hesapları ve değerleme araçları elinizin altında. ' +
        'Müşteriye rakamla konuşmak için ayrıca hazırlık yapmanız gerekmiyor.',
    },
    {
      baslik: 'EİDS ve mevzuat süreci merkezden yürür',
      metin:
        'Yetki belgesi, ilan doğrulama ve yasal takip işletme tarafından yönetilir; ' +
        'siz danışmanlık tarafına odaklanırsınız.',
    },
    {
      baslik: 'Açık çalışma koşulları',
      metin: 'Çalışma modeli ve koşullar görüşmede yazılı olarak paylaşılır.',
    },
  ],
}

export const danismanIceriginiGetir = cache(async (): Promise<DanismanSayfaIcerigi> => {
  try {
    const payload = await payloadGetir()
    const icerik = await payload.findGlobal({ slug: 'danisman-ol', ...ZIYARETCI })

    const nedenler = (icerik.nedenler ?? [])
      .filter((neden) => typeof neden.baslik === 'string' && neden.baslik.trim() !== '')
      .map((neden) => ({ baslik: neden.baslik, metin: neden.metin ?? '' }))

    return {
      baslik: icerik.baslik?.trim() || VARSAYILAN.baslik,
      aciklama: icerik.aciklama?.trim() || VARSAYILAN.aciklama,
      nedenler: nedenler.length > 0 ? nedenler : VARSAYILAN.nedenler,
    }
  } catch {
    return VARSAYILAN
  }
})
