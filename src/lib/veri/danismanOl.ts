import 'server-only'

import { cache } from 'react'

import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

import { doluIcerik, type IcerikGorseli } from './sayfaIcerikleri'
import { payloadGetir, ZIYARETCI } from './istemci'

export interface DanismanSayfaIcerigi {
  baslik: string
  aciklama: string
  nedenler: { baslik: string; metin: string; gorsel: IcerikGorseli | null }[]
  /** Üst bandın arka plan görseli — yoksa düz koyu bant. */
  heroGorseli: IcerikGorseli | null
  /**
   * Hero görselinin karartma oranı (%).
   *
   * ⚠️ Değer kümesi kapalı ve alt sınır ÖLÇÜLDÜ: %65'in altında, bembeyaz
   * bir fotoğrafın üstünde beyaz metin WCAG AA eşiğini (4,5:1) geçmiyor.
   * Tanınmayan bir değer varsayılana düşüyor — eski kayıt sayfayı okunmaz
   * yapmasın.
   */
  heroKarartmasi: 65 | 75 | 85
  formUstuMetin: SerializedEditorState | null
  ekGorseller: IcerikGorseli[]
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
      gorsel: null,
    },
    {
      baslik: 'EİDS ve mevzuat süreci merkezden yürür',
      metin:
        'Yetki belgesi, ilan doğrulama ve yasal takip işletme tarafından yönetilir; ' +
        'siz danışmanlık tarafına odaklanırsınız.',
      gorsel: null,
    },
    {
      baslik: 'Açık çalışma koşulları',
      metin: 'Çalışma modeli ve koşullar görüşmede yazılı olarak paylaşılır.',
      gorsel: null,
    },
  ],
  heroGorseli: null,
  heroKarartmasi: 75,
  formUstuMetin: null,
  ekGorseller: [],
}

/**
 * Yükleme alanını görsele çevirir.
 *
 * ⚠️ Görsel YOKSA `null` — yer tutucu üretilmiyor. Şartnamenin şartı:
 * görsel eklenmemişse mevcut düz tasarım yedek kalmalı. Gri bir kutu
 * çizmek, tasarımı "eksik" göstermek olurdu.
 */
function gorsel(ham: unknown, aciklama?: unknown): IcerikGorseli | null {
  if (ham === null || typeof ham !== 'object') return null
  const kayit = ham as { url?: unknown; alt?: unknown; width?: unknown; height?: unknown }
  if (typeof kayit.url !== 'string' || kayit.url === '') return null

  const metin = typeof aciklama === 'string' && aciklama.trim() !== '' ? aciklama.trim() : null

  return {
    url: kayit.url,
    alt: typeof kayit.alt === 'string' ? kayit.alt : '',
    aciklama: metin,
    en: typeof kayit.width === 'number' ? kayit.width : null,
    boy: typeof kayit.height === 'number' ? kayit.height : null,
  }
}

export const danismanIceriginiGetir = cache(async (): Promise<DanismanSayfaIcerigi> => {
  try {
    const payload = await payloadGetir()
    const icerik = await payload.findGlobal({ slug: 'danisman-ol', ...ZIYARETCI })

    const nedenler = (icerik.nedenler ?? [])
      .filter((neden) => typeof neden.baslik === 'string' && neden.baslik.trim() !== '')
      .map((neden) => ({
        baslik: neden.baslik,
        metin: neden.metin ?? '',
        gorsel: gorsel(neden.gorsel),
      }))

    const ekGorseller = (icerik.ekGorseller ?? [])
      .map((satir) => gorsel(satir.gorsel, satir.aciklama))
      .filter((deger): deger is IcerikGorseli => deger !== null)

    return {
      baslik: icerik.baslik?.trim() || VARSAYILAN.baslik,
      aciklama: icerik.aciklama?.trim() || VARSAYILAN.aciklama,
      /**
       * ⚠️ Liste ya TAMAMEN panelden ya TAMAMEN koddan.
       *
       * Yarısı panelden yarısı koddan gelen bir liste tutarsız görünürdü
       * ve "neden bu maddeyi silemiyorum" sorusunu doğururdu.
       */
      nedenler: nedenler.length > 0 ? nedenler : VARSAYILAN.nedenler,
      heroGorseli: gorsel(icerik.heroGorseli),
      heroKarartmasi:
        icerik.heroKarartmasi === '65' ? 65 : icerik.heroKarartmasi === '85' ? 85 : 75,
      formUstuMetin: doluIcerik(icerik.formUstuMetin),
      ekGorseller,
    }
  } catch {
    return VARSAYILAN
  }
})
