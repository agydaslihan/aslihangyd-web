import sharp from 'sharp'

import { inecekGenislik, KULLANIM_SIZES } from './boyutlar'

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
 * Ölçüm genişlikleri — `sizes` dizelerinden TÜRETİLİYOR.
 *
 * ⚠️ ÖNCEKİ SÜRÜM SABİT SAYI KULLANIYORDU VE YANLIŞTI.
 *
 * 480/828/1920 gömülüydü. Gerçek indirmeler ölçülünce ikisinin tuttuğu
 * görüldü, ikisinin tutmadığı:
 *   · Kart görselleri 640 px iniyor, 480 değil → maliyet %30 düşük
 *     gösteriliyordu
 *   · Hero görselleri 750 px iniyor, 828 değil
 *
 * Artık `sizes` → CSS piksel → piksel oranı → aday genişlik zinciriyle
 * hesaplanıyor (`boyutlar.ts`). `sizes` değişirse rozet kendiliğinden
 * doğru kalıyor; iki gerçeği ayrı ayrı güncellemek zorunda değiliz.
 *
 * Doğrulama: türetilen değerler Lighthouse'un indirdiği genişliklerle
 * birebir aynı çıktı (hero mobil 750, kart mobil 640, hero masaüstü 1920).
 */
export const OLCUM_GENISLIKLERI = {
  kart: inecekGenislik(KULLANIM_SIZES.kart, 'mobil') ?? 640,
  mobil: inecekGenislik(KULLANIM_SIZES.hero, 'mobil') ?? 750,
  masaustu: inecekGenislik(KULLANIM_SIZES.hero, 'masaustu') ?? 1920,
} as const

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
