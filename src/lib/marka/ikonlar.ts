import 'server-only'

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

import { markaAyarlari } from './sunucu'
import { medyayiCoz } from './varliklar'

/**
 * Site ikonlarının üretimi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: `/favicon.ico` 404 DÖNÜYORDU.
 *
 * Projede hiç ikon dosyası yoktu — ne `src/app/favicon.ico`, ne `public/`
 * altında bir şey. Tarayıcı her sayfada `/favicon.ico` istiyor, 404
 * alıyordu; Lighthouse Best Practices puanı bu yüzden 96'da takılıydı.
 *
 * ⚠️ İKON HER ZAMAN ÜRETİLİR — SİMGE YÜKLENMEMİŞ OLSA BİLE.
 *
 * "Aslıhan bir kare görsel yükleyene kadar 404 devam etsin" demek, sorunu
 * çözmemek olurdu. Simge yoksa site adının baş harfinden marka renkleriyle
 * bir monogram üretiliyor. Böylece favicon ilk günden çalışıyor ve yükleme
 * yapıldığında kendiliğinden gerçek logoya dönüyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Üretilen boyutlar — metadata ve manifest ile aynı listeden beslenir. */
export const IKON_BOYUTLARI = {
  favicon: 32,
  dokunma: 180,
  orta: 192,
  buyuk: 512,
} as const

/**
 * Önbellek ömrü.
 *
 * ⚠️ Kısa tutuldu: Aslıhan simgeyi değiştirdiğinde sonucu makul sürede
 * görmeli. İkon üretimi saniyenin altında; uzun önbellek buradan bir şey
 * kazandırmaz ama "değiştirdim, olmadı" şaşkınlığına yol açar.
 */
export const IKON_ONBELLEK_SANIYE = 300

interface Kaynak {
  veri: Buffer
  /** Önbellek anahtarı — kaynak değişince ikon da değişsin. */
  imza: string
}

/**
 * Yüklenmiş simge kaynağını diskten okur.
 *
 * ⚠️ Dosya adı doğrudan yola eklenmiyor: `path.basename` ile süzülüyor.
 * Medya adları Payload tarafından üretiliyor ama "zaten güvenli" varsaymak,
 * yol geçişi (path traversal) savunmasını tek bir noktaya bağlamak olurdu.
 */
async function simgeyiOku(): Promise<Kaynak | null> {
  const { default: config } = await import('@payload-config')
  const { getPayload } = await import('payload')

  try {
    const payload = await getPayload({ config })
    const marka = (await payload.findGlobal({
      slug: 'marka-gorunum',
      depth: 1,
    })) as unknown as Record<string, unknown>

    const kayit = medyayiCoz(marka.simgeKaynak)
    const dosyaAdi = typeof kayit?.filename === 'string' ? kayit.filename : null
    if (!dosyaAdi) return null

    const dizin = process.env.MEDYA_DIZINI ?? 'medya'
    const yol = path.join(dizin, path.basename(dosyaAdi))

    return { veri: await readFile(yol), imza: dosyaAdi }
  } catch {
    return null
  }
}

/**
 * Simge yokken kullanılan monogram.
 *
 * ⚠️ Renkler marka panelinden geliyor: favicon, sitenin kendisiyle aynı
 * paleti kullanıyor. Sabit bir renk yazsaydık palet değiştiğinde sekme
 * simgesi tek başına eski markada kalırdı.
 */
function monogramSvg(harf: string, zemin: string, metin: string, kenar: number): string {
  const guvenliHarf = harf
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .slice(0, 2)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${kenar}" height="${kenar}" viewBox="0 0 100 100">
<rect width="100" height="100" rx="18" fill="${zemin}"/>
<text x="50" y="50" fill="${metin}" font-family="Georgia,serif" font-size="58" font-weight="700"
      text-anchor="middle" dominant-baseline="central">${guvenliHarf}</text>
</svg>`
}

/**
 * İstenen boyutta PNG üretir.
 *
 * ⚠️ `fit: 'cover'` bilinçli: kare olmayan bir kaynak kırpılıyor, ezilmiyor.
 * Ezilmiş bir logo, kırpılmış bir logodan daha kötü görünür ve marka
 * hatası gibi okunur.
 */
export async function ikonUret(kenar: number): Promise<{ veri: Buffer; imza: string }> {
  const kaynak = await simgeyiOku()

  if (kaynak) {
    const veri = await sharp(kaynak.veri)
      .resize(kenar, kenar, { fit: 'cover', position: 'centre' })
      .png()
      .toBuffer()
    return { veri, imza: `${kaynak.imza}-${kenar}` }
  }

  const marka = await markaAyarlari()
  const ad = marka.siteAdi ?? 'Aslıhan GYD'
  const harf = ad.trim().charAt(0).toLocaleUpperCase('tr-TR')

  // Palet doğrulanmış olsa da burada yedek var: tanımsız bir yuva
  // monogramı çökertmemeli, favicon her koşulda dönmeli.
  const zemin = marka.acik.koyuBantZemin ?? '#3d2b2f'
  const metin = marka.acik.koyuBantMetin ?? '#ffffff'

  const svg = monogramSvg(harf, zemin, metin, kenar)
  const veri = await sharp(Buffer.from(svg)).resize(kenar, kenar).png().toBuffer()

  return { veri, imza: `monogram-${harf}-${zemin}-${kenar}` }
}

/**
 * PNG'yi ICO kabına sarar.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN ELLE SARILIYOR: sharp ICO yazamaz.
 *
 * `/favicon.ico` adresine PNG servis etmek çoğu tarayıcıda çalışır ama
 * "çalışır" ile "doğru" aynı şey değil; bazı istemciler uzantıya göre
 * çözümlüyor. ICO aslında PNG'yi saran 22 baytlık basit bir kap — Vista'dan
 * beri PNG gömülü ICO destekleniyor. Elle yazmak, yeni bir bağımlılık
 * eklemekten hem küçük hem şeffaf.
 *
 * Kap düzeni: 6 baytlık başlık + 16 baytlık dizin girdisi + PNG verisi.
 * ─────────────────────────────────────────────────────────────────────────
 */
export function icoSar(png: Buffer, kenar: number): Buffer {
  const baslik = Buffer.alloc(6)
  baslik.writeUInt16LE(0, 0) // ayrılmış
  baslik.writeUInt16LE(1, 2) // tür: 1 = ikon
  baslik.writeUInt16LE(1, 4) // görsel sayısı

  const girdi = Buffer.alloc(16)
  // 256 piksel `0` olarak yazılır — kabın sınırı bu.
  girdi.writeUInt8(kenar >= 256 ? 0 : kenar, 0)
  girdi.writeUInt8(kenar >= 256 ? 0 : kenar, 1)
  girdi.writeUInt8(0, 2) // palet rengi yok
  girdi.writeUInt8(0, 3) // ayrılmış
  girdi.writeUInt16LE(1, 4) // renk düzlemi
  girdi.writeUInt16LE(32, 6) // piksel başına bit
  girdi.writeUInt32LE(png.length, 8)
  girdi.writeUInt32LE(baslik.length + girdi.length, 12)

  return Buffer.concat([baslik, girdi, png])
}

/** İkon rotalarının ortak yanıtı. */
export function ikonYaniti(veri: Buffer, tur: string, imza: string): Response {
  return new Response(new Uint8Array(veri), {
    headers: {
      'Content-Type': tur,
      'Cache-Control': `public, max-age=${IKON_ONBELLEK_SANIYE}, stale-while-revalidate=86400`,
      ETag: `"${imza}"`,
    },
  })
}
