/**
 * Marka varlıkları — logo ve simge okuma yardımcıları.
 *
 * ⚠️ Sunucu ve panel aynı kuralları okusun diye ayrı dosyada. İki yerde
 * yazılsaydı panel "uygun" der, site başka davranırdı.
 */

/**
 * Logo boyut bütçesi.
 *
 * ⚠️ Logo HER SAYFADA yükleniyor — başlıkta ve altbilgide. Bu yüzden
 * bütçesi kart görselinden çok daha dar. 50 kB, iyi optimize edilmiş bir
 * SVG için fazlasıyla geniş; şişmiş bir PNG içinse dar. Aradaki fark tam
 * olarak uyarının yakalamak istediği şey.
 */
export const LOGO_BUTCE_BAYT = 50 * 1024

/** Favicon üretimi için istenen en küçük kenar. */
export const ASGARI_SIMGE_KENARI = 512

export function baytYaz(bayt: number): string {
  if (bayt < 1024) return `${bayt} B`
  if (bayt < 1024 * 1024) return `${Math.round(bayt / 1024)} kB`
  return `${(bayt / (1024 * 1024)).toFixed(1)} MB`
}

interface MedyaKaydi {
  id?: unknown
  filename?: unknown
  filesize?: unknown
  mimeType?: unknown
  width?: unknown
  height?: unknown
  url?: unknown
  alt?: unknown
}

/** Yüklenmiş bir medya alanını normalize eder (id ya da nesne olabilir). */
export function medyayiCoz(deger: unknown): MedyaKaydi | null {
  if (deger === null || deger === undefined) return null
  if (typeof deger === 'number' || typeof deger === 'string') return null
  if (typeof deger !== 'object') return null
  return deger as MedyaKaydi
}

export interface LogoDurumu {
  var: boolean
  ad: string
  bayt: number
  boyutMetni: string
  asildi: boolean
}

export function logoDurumu(deger: unknown): LogoDurumu {
  const kayit = medyayiCoz(deger)
  if (!kayit) return { var: false, ad: '', bayt: 0, boyutMetni: '', asildi: false }

  const bayt = typeof kayit.filesize === 'number' ? kayit.filesize : 0
  return {
    var: true,
    ad: typeof kayit.filename === 'string' ? kayit.filename : 'logo',
    bayt,
    boyutMetni: baytYaz(bayt),
    asildi: bayt > LOGO_BUTCE_BAYT,
  }
}

export interface SimgeDurumu {
  var: boolean
  ad: string
  olcu: string
  /** Kare değil ya da çok küçükse sebebi; uygunsa `null`. */
  uyari: string | null
}

/**
 * Simge kaynağını değerlendirir.
 *
 * ⚠️ SVG'de genişlik/yükseklik olmayabilir ve bu bir sorun değil: vektör
 * her ölçüye açılır. Kare/asgari ölçü şartı yalnızca piksel görsellerde
 * anlamlı; SVG'yi o şartla reddetmek, en iyi kaynağı reddetmek olurdu.
 */
export function simgeDurumu(deger: unknown): SimgeDurumu {
  const kayit = medyayiCoz(deger)
  if (!kayit) return { var: false, ad: '', olcu: '', uyari: null }

  const ad = typeof kayit.filename === 'string' ? kayit.filename : 'simge'
  const svg = kayit.mimeType === 'image/svg+xml'
  const en = typeof kayit.width === 'number' ? kayit.width : null
  const boy = typeof kayit.height === 'number' ? kayit.height : null

  if (svg) return { var: true, ad, olcu: 'SVG (ölçekten bağımsız)', uyari: null }
  if (en === null || boy === null) return { var: true, ad, olcu: '', uyari: null }

  const olcu = `${en}×${boy}`

  if (en !== boy) {
    return { var: true, ad, olcu, uyari: 'Kare değil — ikonlar kırpılarak üretilir' }
  }
  if (en < ASGARI_SIMGE_KENARI) {
    return {
      var: true,
      ad,
      olcu,
      uyari: `En az ${ASGARI_SIMGE_KENARI}×${ASGARI_SIMGE_KENARI} önerilir — küçük kaynak bulanık ikon üretir`,
    }
  }

  return { var: true, ad, olcu, uyari: null }
}
