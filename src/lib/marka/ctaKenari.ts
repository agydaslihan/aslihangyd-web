import { hexCoz, kontrastOrani, type Rgb } from '@/lib/tasarim/kontrast'

/**
 * Dolu eylem butonunun kenarlık rengi — zeminden ayrışması GARANTİ.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN HESAPLANIYOR, JETONDAN OKUNMUYOR.
 *
 * Aurora'da eylem rengi altın ve altın sayfa zemininden yalnızca 2,28:1
 * ayrışıyor. WCAG 1.4.11 bileşen sınırı için 3:1 istiyor: kenarlıksız bir
 * altın buton, ışık yansıyan bir telefon ekranında nerede bittiği
 * görünmeyen bir lekeye dönüşüyor.
 *
 * Sabit bir kenarlık jetonu (gold-600) varsayılan palette bu işi görüyor —
 * ama marka paneli hem buton rengini hem sayfa zeminini değiştirebiliyor.
 * Sabit bir değer, Aslıhan açık bir buton rengi seçtiği anda sessizce
 * yetersiz kalırdı ve bunu kimse fark etmezdi.
 *
 * Bu yüzden kenarlık, butonun KENDİ renginden türetiliyor: zeminden 3:1
 * ayrışana kadar koyulaşıyor (koyu zeminde açılıyor). Ton korunuyor,
 * yalnızca parlaklık kayıyor — yani kenarlık daima "butonun koyu tonu"
 * gibi görünüyor, yabancı bir çizgi gibi değil.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ Ayrışma zaten yeterliyse butonun kendi rengi dönüyor: gereksiz bir
 * kenarlık, sınırı olması gerekenden kalın gösterir.
 */

/** WCAG 1.4.11 — metin dışı bileşen sınırı. */
const ESIK = 3

/**
 * ⚠️ EŞİĞİN TAM ÜSTÜNDE DURULMUYOR — PAY BIRAKILIYOR.
 *
 * Eşiği kıl payı geçen bir değer, bir sonraki küçük düzenlemede sessizce
 * altına düşer. Aynı karar `alternatifOner` içinde de verilmişti; ölçüm
 * bir kez daha haklı çıkardı: pay olmadan altın buton için 3,05 üretiyordu,
 * payla 3,3 üstü.
 */
const PAY = 0.3

/** Her adımda siyaha/beyaza doğru bu oranda karışıyor. */
const ADIM = 0.06

function hexYaz({ r, g, b }: Rgb): string {
  const k = (v: number) =>
    Math.round(Math.min(255, Math.max(0, v)))
      .toString(16)
      .padStart(2, '0')
  return `#${k(r)}${k(g)}${k(b)}`
}

function karistir(renk: Rgb, hedef: Rgb, oran: number): Rgb {
  return {
    r: renk.r + (hedef.r - renk.r) * oran,
    g: renk.g + (hedef.g - renk.g) * oran,
    b: renk.b + (hedef.b - renk.b) * oran,
  }
}

export function ctaKenari(butonZemini: string, sayfaZemini: string): string {
  let buton: Rgb
  let sayfa: Rgb
  try {
    buton = hexCoz(butonZemini)
    sayfa = hexCoz(sayfaZemini)
  } catch {
    // ⚠️ Geçersiz değer geldiğinde kenarlık üretmiyoruz: çağıran taraf
    // jetonu hiç yazmıyor ve globals.css'teki varsayılan yürürlükte kalıyor.
    return butonZemini
  }

  if (kontrastOrani(buton, sayfa) >= ESIK + PAY) return butonZemini

  /**
   * ⚠️ YÖN ZEMİNE GÖRE: açık sayfada koyulaş, koyu sayfada açıl. Tek yön
   * (hep koyulaş) koyu temada butonu zemine yaklaştırır — düzeltmeye
   * çalıştığı sorunu büyütürdü.
   */
  const hedef: Rgb =
    kontrastOrani(sayfa, '#ffffff') < kontrastOrani(sayfa, '#000000')
      ? { r: 0, g: 0, b: 0 }
      : { r: 255, g: 255, b: 255 }

  let sonuc = buton
  for (let adim = 1; adim <= Math.round(1 / ADIM); adim += 1) {
    sonuc = karistir(buton, hedef, ADIM * adim)
    if (kontrastOrani(sonuc, sayfa) >= ESIK + PAY) return hexYaz(sonuc)
  }

  // ⚠️ Uçta bile eşiğe ulaşılamıyorsa (zemin ile buton neredeyse aynı ve
  // ikisi de orta gri) elde kalan en uzak değer dönüyor: hiçbir kenarlık
  // basmamaktan iyidir.
  return hexYaz(sonuc)
}
