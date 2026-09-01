/**
 * Mahallenin niteliksel profili — ARAŞTIRMAYLA DOLDURULAMAZ.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU BÖLÜM NEDEN OTOMATİK ÜRETİLMİYOR.
 *
 * "Hangi sokak sessiz", "kim oturuyor", "son üç yılda ne değişti" —
 * bunların hiçbiri hiçbir kaynakta yok. Web araştırması, PostGIS ya da
 * OSM bu soruları cevaplayamaz. Cevabı yalnızca mahalleyi gezen,
 * müşteriyle konuşan, orada ev gösteren kişi biliyor.
 *
 * Bu modülün işi o bilgiyi ÜRETMEK değil, girilmesini KOLAYLAŞTIRMAK ve
 * girilmediğinde ortaya bir şey UYDURMAMAK.
 *
 * ⚠️ Aslıhan doldurmadan bölüm çizilmiyor. Mevcut boş durum metni
 * ("gerçekten işinize yarayacak olanı yazmayı tercih ediyoruz") doğru
 * şeyi söylüyor ve korunuyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

export const KIMLER_ICIN = [
  { value: 'aile', label: 'Aileler' },
  { value: 'ogrenci', label: 'Öğrenciler' },
  { value: 'yatirimci', label: 'Yatırımcılar' },
  { value: 'isci', label: 'Sanayide çalışanlar' },
  { value: 'emekli', label: 'Emekliler' },
] as const

export type KimlerIcin = (typeof KIMLER_ICIN)[number]['value']

export const SOKAK_DOKULARI = [
  { value: 'sessiz', label: 'Sessiz' },
  { value: 'orta', label: 'Orta' },
  { value: 'islek', label: 'İşlek' },
] as const

export type SokakDokusu = (typeof SOKAK_DOKULARI)[number]['value']

/**
 * Panelde tamamlanma yüzdesinin paydası.
 *
 * ⚠️ `icerik` (uzun analiz metni) BU LİSTEDE YOK ve bu bilinçli: yüzde,
 * "yapılandırılmış alanlar ne kadar doldu" sorusunu ölçüyor. Uzun metni
 * de saymak, tek bir paragraf yazan kişiye "%60 tamam" derdi.
 */
export const NITELIK_ALANLARI = [
  { anahtar: 'kimlerIcin', etiket: 'Kimler için uygun' },
  { anahtar: 'sokakDokusu', etiket: 'Sokak dokusu' },
  { anahtar: 'sonUcYil', etiket: 'Son 3 yılda ne değişti' },
  { anahtar: 'dikkatEdilmeli', etiket: 'Neye dikkat etmeli' },
  { anahtar: 'oneCikanOzellikler', etiket: 'Öne çıkan özellikler' },
] as const

export interface NitelikVerisi {
  kimlerIcin?: unknown
  kimlerIcinNotu?: unknown
  sokakDokusu?: unknown
  sonUcYil?: unknown
  dikkatEdilmeli?: unknown
  oneCikanOzellikler?: unknown
}

function doluMu(deger: unknown): boolean {
  if (Array.isArray(deger)) return deger.length > 0
  if (typeof deger === 'string') return deger.trim() !== ''
  return deger !== null && deger !== undefined
}

/** Kaç alan dolu / toplam. */
export function nitelikDolulugu(veri: NitelikVerisi): {
  dolu: number
  toplam: number
  yuzde: number
} {
  const toplam = NITELIK_ALANLARI.length
  const dolu = NITELIK_ALANLARI.filter((alan) =>
    doluMu((veri as Record<string, unknown>)[alan.anahtar]),
  ).length
  return { dolu, toplam, yuzde: Math.round((dolu / toplam) * 100) }
}

/** Henüz doldurulmamış alanların etiketleri — panelde liste olarak görünür. */
export function eksikNitelikler(veri: NitelikVerisi): string[] {
  return NITELIK_ALANLARI.filter(
    (alan) => !doluMu((veri as Record<string, unknown>)[alan.anahtar]),
  ).map((alan) => alan.etiket)
}

export interface NitelikBlogu {
  baslik: string
  /** Etiket listesi — çoktan seçmeli alanlar. */
  etiketler?: string[]
  /** Serbest metin — paragraflara bölünmüş. */
  paragraflar?: string[]
}

/**
 * Görünür bloklara çevirir.
 *
 * ⚠️ BOŞ ALAN BLOK ÜRETMİYOR. Yarım doldurulmuş bir profilde "Neye dikkat
 * etmeli: —" satırı, bilgi değil eksiklik ilanıdır.
 */
export function nitelikBloklari(veri: NitelikVerisi): NitelikBlogu[] {
  const bloklar: NitelikBlogu[] = []

  const kimler = Array.isArray(veri.kimlerIcin) ? (veri.kimlerIcin as string[]) : []
  const kimlerNotu = typeof veri.kimlerIcinNotu === 'string' ? veri.kimlerIcinNotu.trim() : ''
  if (kimler.length > 0 || kimlerNotu !== '') {
    bloklar.push({
      baslik: 'Kimler için uygun?',
      etiketler: kimler.flatMap((deger) => {
        const etiket = KIMLER_ICIN.find((k) => k.value === deger)?.label
        return etiket === undefined ? [] : [etiket as string]
      }),
      paragraflar: kimlerNotu === '' ? undefined : [kimlerNotu],
    })
  }

  const doku = typeof veri.sokakDokusu === 'string' ? veri.sokakDokusu : ''
  const dokuEtiketi = SOKAK_DOKULARI.find((d) => d.value === doku)?.label
  if (dokuEtiketi !== undefined) {
    bloklar.push({ baslik: 'Sokak dokusu', etiketler: [dokuEtiketi] })
  }

  const metinBloklari: [string, unknown][] = [
    ['Son 3 yılda ne değişti?', veri.sonUcYil],
    ['Neye dikkat etmeli?', veri.dikkatEdilmeli],
  ]

  for (const [baslik, ham] of metinBloklari) {
    const metin = typeof ham === 'string' ? ham.trim() : ''
    if (metin === '') continue
    bloklar.push({
      baslik,
      paragraflar: metin
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter((p) => p !== ''),
    })
  }

  return bloklar
}
