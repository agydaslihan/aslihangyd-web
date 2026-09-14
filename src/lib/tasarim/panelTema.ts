import { AA_METIN, kontrastOrani, type Rgb } from './kontrast'

/**
 * Panel (Payload admin) renklerinin çözümü ve metin rengi taraması.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: KONTRAST TESTİ PANELİ HİÇ GÖRMÜYORDU.
 *
 * `kontrast.test.ts` sitenin `globals.css` jetonlarını, marka kapısı
 * paleti ölçüyor. Panel bileşenleri ise Payload'ın `--theme-*`
 * değişkenlerini kullanıyor ve onlara bakan hiçbir şey yoktu. Sonuç:
 * aynı soluk ton (`elevation-500`) on dosyaya, AA altı hata kırmızısı
 * (`error-500`) sekiz kurala yayıldı — 14 Eylül 2026'da tek tek bulundu.
 *
 * Bu modül Payload'ın YÜKLÜ sürümünün stil dosyasını okuyup iki temayı
 * çözüyor. Payload sürümü rampayı değiştirirse test yeni değerlerle ölçer.
 *
 * ⚠️ Saf: dosya okumaz, yalnızca verilen metni işler.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type Tema = 'acik' | 'koyu'
export type TemaHaritasi = Record<string, string>

/** Panelin standart zeminleri — kuralın kendi zemini yoksa en kötüsü alınır. */
export const PANEL_ZEMINLERI = [
  '--theme-elevation-0',
  '--theme-elevation-50',
  '--theme-elevation-100',
] as const

const BLOK = /([^{}]+)\{([^{}]*)\}/g
const TANIM = /(--[\w-]+)\s*:\s*([^;]+)/g

function tanimlar(css: string, secerMi: (secici: string) => boolean): TemaHaritasi {
  const harita: TemaHaritasi = {}
  for (const blok of css.matchAll(BLOK)) {
    const secici = (blok[1] ?? '').trim()
    if (!secerMi(secici)) continue
    for (const tanim of (blok[2] ?? '').matchAll(TANIM)) {
      if (tanim[1] !== undefined && tanim[2] !== undefined) harita[tanim[1]] = tanim[2].trim()
    }
  }
  return harita
}

/**
 * Payload stil dosyası (+ panelin kendi jeton dosyaları) → iki tema.
 *
 * ⚠️ Koyu tema açığın ÜSTÜNE biniyor: Payload rampanın ortasını
 * (`elevation-500`, `error-500`) yalnızca `:root`'ta tanımlıyor ve koyu
 * temada ezmiyor. Ayrı haritalar kurulsaydı o tonlar koyu temada
 * "tanımsız" görünür ve sorunun kaynağı gizlenirdi.
 */
export function panelTemalariniCoz(...cssler: string[]): Record<Tema, TemaHaritasi> {
  // ⚠️ Yorum temizlenmeden bloğun "seçicisi" önündeki yorumu da içerir ve
  // `:root` tanınmaz — panel jeton dosyası tam da böyle başlıyor.
  const birlesik = cssler.join('\n').replace(/\/\*[\s\S]*?\*\//g, '')
  const acik = tanimlar(
    birlesik,
    (s) => s === ':root' || s === 'html' || s.includes('data-theme=light'),
  )
  const koyu = { ...acik, ...tanimlar(birlesik, (s) => s.includes('data-theme=dark')) }
  return { acik, koyu }
}

/** `var(--a, yedek)` zincirini somut renge indirger; çözülemezse `null`. */
export function renkCoz(harita: TemaHaritasi, deger: string, derinlik = 0): Rgb | null {
  if (derinlik > 20) return null
  const temiz = deger.trim().replace(/\s*!important$/, '')

  const degisken = /^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/.exec(temiz)
  if (degisken) {
    const ad = degisken[1] ?? ''
    const tanim = harita[ad]
    if (tanim !== undefined) return renkCoz(harita, tanim, derinlik + 1)
    return degisken[2] === undefined ? null : renkCoz(harita, degisken[2], derinlik + 1)
  }

  const rgb = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(temiz)
  if (rgb) return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) }

  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(temiz)
  if (hex) {
    const govde =
      (hex[1] ?? '').length === 3 ? [...(hex[1] ?? '')].map((c) => c + c).join('') : (hex[1] ?? '')
    return {
      r: parseInt(govde.slice(0, 2), 16),
      g: parseInt(govde.slice(2, 4), 16),
      b: parseInt(govde.slice(4, 6), 16),
    }
  }
  return null
}

export interface MetinRengi {
  satir: number
  secici: string
  renk: string
  /** Aynı kuralda zemin tanımlıysa o; yoksa `null` (standart zeminler). */
  zemin: string | null
}

/**
 * Bir CSS dosyasındaki panel metin renklerini bulur.
 *
 * ⚠️ YALNIZCA `color` ÖZELLİĞİ — `border-color` ve `background-color`
 * metin değil. Yalnızca `--theme-*` ya da `--panel-*` jetonuna dayananlar:
 * site bileşenleri kendi jetonlarını kullanıyor ve onları
 * `kontrast.test.ts` ölçüyor.
 */
export function metinRenkleriniBul(css: string): MetinRengi[] {
  const bulunan: MetinRengi[] = []
  const yorumsuz = css.replace(/\/\*[\s\S]*?\*\//g, (yorum) => yorum.replace(/[^\n]/g, ' '))

  for (const blok of yorumsuz.matchAll(BLOK)) {
    const secici = (blok[1] ?? '').trim().split('\n').pop()?.trim() ?? ''
    const govde = blok[2] ?? ''
    const baslangicSatiri = yorumsuz
      .slice(0, (blok.index ?? 0) + (blok[1] ?? '').length)
      .split('\n').length

    const zeminEslesme =
      /(?:^|[;{\s])background(?:-color)?\s*:\s*(var\([^;]+?\))\s*(?:!important)?\s*(?:;|$)/m.exec(
        govde,
      )
    const zemin = zeminEslesme?.[1] ?? null

    for (const bildirim of govde.matchAll(
      /(?:^|[;{\s])color\s*:\s*(var\(--(?:theme|panel)-[^;]+?)\s*(?:!important)?\s*(?:;|$)/gm,
    )) {
      const oncesi = govde.slice(0, bildirim.index ?? 0)
      bulunan.push({
        satir: baslangicSatiri + oncesi.split('\n').length - 1,
        secici,
        renk: (bildirim[1] ?? '').trim(),
        zemin,
      })
    }
  }
  return bulunan
}

export interface KontrastBulgusu {
  tema: Tema
  oran: number | null
  zemin: string
}

/** Bir metin rengini iki temada ölçer; en kötü zemindeki oranı döner. */
export function metinRenginiOlc(
  temalar: Record<Tema, TemaHaritasi>,
  kayit: Pick<MetinRengi, 'renk' | 'zemin'>,
): KontrastBulgusu[] {
  return (['acik', 'koyu'] as const).map((tema) => {
    const harita = temalar[tema]
    const on = renkCoz(harita, kayit.renk)
    const zeminler =
      kayit.zemin === null ? [...PANEL_ZEMINLERI].map((z) => `var(${z})`) : [kayit.zemin]
    let enKotu: KontrastBulgusu = { tema, oran: null, zemin: zeminler[0] ?? '' }
    for (const z of zeminler) {
      const arka = renkCoz(harita, z)
      if (on === null || arka === null) return { tema, oran: null, zemin: z }
      const oran = kontrastOrani(on, arka)
      if (enKotu.oran === null || oran < enKotu.oran) enKotu = { tema, oran, zemin: z }
    }
    return enKotu
  })
}

export const PANEL_METIN_ESIGI = AA_METIN
