import sharp from 'sharp'

/**
 * Görsel bütçesi — yüklenen görselin ziyaretçiye kaç bayt olarak ineceğini ölçer.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ORİJİNAL DOSYA BOYUTU YANLIŞ ÖLÇÜDÜR.
 *
 * Panelde görünen `filesize`, yüklenen JPEG/PNG'nin boyutu. Ziyaretçi onu
 * indirmiyor: `next/image` isteği karşılarken görseli AVIF'e çevirip
 * ekrana uygun genişliğe indiriyor. 3 MB'lık bir JPEG mobilde 60 kB AVIF
 * olarak inebilir.
 *
 * Orijinal boyuta göre uyarı vermek bu yüzden iki yönde de yanlış olurdu:
 * gereksiz alarm üretir, gerçek şişkinliği kaçırır. Uyarı ancak GERÇEKTEN
 * İNECEK bayta bakarsa anlamlı — bu dosya onu ölçüyor.
 *
 * Ölçüm gerçek kodlamayla yapılıyor, tahminle değil: görsel iki hedef
 * genişliğe indirilip AVIF'e çevriliyor ve çıkan baytlar sayılıyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Ölçüm genişlikleri — `next/image`in bu görsel için seçeceği boyutlar.
 *
 * Next varsayılan `deviceSizes` listesinden geliyor:
 * · Mobil  — 390 px genişliğinde bir telefon, 2x piksel yoğunluğu → 780 px
 *   isteniyor, listedeki 828 seçiliyor.
 * · Masaüstü — 1440 px pencerede tam genişlik hero → 1920 seçiliyor.
 *
 * Kart görselleri daha küçük `sizes` bildirdiği için bunlardan azını
 * indirir; yani bu ölçüm EN KÖTÜ DURUMU veriyor. Bütçe aşılmıyorsa
 * gerçek yükleme de aşmaz.
 */
export const OLCUM_GENISLIKLERI = { kart: 480, mobil: 828, masaustu: 1920 } as const

/**
 * `next/image`in varsayılan kalitesi 75. Ölçümü aynı kaliteyle yapmak
 * zorundayız; başka bir değer, panelde gösterilen sayıyı gerçekte inen
 * bayttan kopartırdı.
 */
const KALITE = 75

/** Bütçeler — CLAUDE.md performans hedeflerinden türetildi. */
export const BUTCE_BAYT = {
  /** Mobil hero: LCP öğesi bu. 80 kB, 1,5 Mbps'de ~0,43 sn eder. */
  mobilHero: 80 * 1024,
  /** Masaüstü hero. */
  masaustuHero: 200 * 1024,
  /** Kart ve galeri küçük görselleri — ilk ekranda birden fazlası olabilir. */
  kart: 30 * 1024,
} as const

export interface ButceOlcumu {
  kartBayt: number
  mobilBayt: number
  masaustuBayt: number
  /** 16 piksel genişliğinde, base64 gömülü bulanık önizleme. */
  bulanikVeri: string
}

/**
 * ⚠️ Hata durumunda yükleme ENGELLENMİYOR.
 *
 * Bu ölçüm bir kolaylık, bir kapı değil. Bozuk bir görselde ya da sharp'ın
 * desteklemediği bir biçimde ölçüm başarısız olursa görsel yine yüklenmeli;
 * yalnızca bütçe rozeti "ölçülemedi" der. Aksi halde tek bir kodlama hatası
 * Aslıhan'ın içerik girmesini tamamen durdururdu.
 */
export async function gorselButcesiniOlc(veri: Buffer): Promise<ButceOlcumu | null> {
  try {
    const kaynak = sharp(veri, { failOn: 'none' })
    const bilgi = await kaynak.metadata()
    const gercekGenislik = bilgi.width ?? 0
    if (gercekGenislik === 0) return null

    const avifBayt = async (hedefGenislik: number): Promise<number> => {
      // ⚠️ `withoutEnlargement`: küçük bir görseli büyütüp ölçmek, olmayan
      // bir maliyeti raporlamak olurdu.
      const cikti = await sharp(veri, { failOn: 'none' })
        .resize({ width: Math.min(hedefGenislik, gercekGenislik), withoutEnlargement: true })
        .avif({ quality: KALITE })
        .toBuffer()
      return cikti.length
    }

    const [kartBayt, mobilBayt, masaustuBayt, bulanik] = await Promise.all([
      avifBayt(OLCUM_GENISLIKLERI.kart),
      avifBayt(OLCUM_GENISLIKLERI.mobil),
      avifBayt(OLCUM_GENISLIKLERI.masaustu),
      sharp(veri, { failOn: 'none' })
        .resize({ width: 16, withoutEnlargement: true })
        .webp({ quality: 40 })
        .toBuffer(),
    ])

    return {
      kartBayt,
      mobilBayt,
      masaustuBayt,
      bulanikVeri: `data:image/webp;base64,${bulanik.toString('base64')}`,
    }
  } catch {
    return null
  }
}

export type ButceDurumu = 'uygun' | 'sinirda' | 'asildi'

/** Bütçenin %80'inden sonrası "sınırda" — aşmadan önce uyarmak, aştıktan sonra uyarmaktan iyi. */
export function butceDurumu(bayt: number, butce: number): ButceDurumu {
  if (bayt > butce) return 'asildi'
  if (bayt > butce * 0.8) return 'sinirda'
  return 'uygun'
}

export function baytYaz(bayt: number): string {
  if (bayt < 1024) return `${bayt} B`
  return `${(bayt / 1024).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} kB`
}
