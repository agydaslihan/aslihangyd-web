/**
 * Türkçe font alt kümelerini üretir.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * KULLANIM
 *
 *   pnpm font:altkume            → src/fonts/*.woff2 dosyalarını yeniler
 *   pnpm font:altkume --kontrol  → yeniden üretmeden farkı bildirir
 *
 * ⚠️ Bu betik SIK ÇALIŞMAZ. Yalnızca iki durumda gerekir:
 *   1. `src/lib/tipografi/alfabe.ts` içine yeni karakter eklendiğinde
 *   2. Font sürümü yükseltilmek istendiğinde
 * Ayrıntılı yordam: docs/ISLETME-REHBERI.md → "Font alt kümeleri".
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ⚠️ NEDEN KENDİ BARINDIRIYORUZ (`next/font/local`, `next/font/google` değil)
 *
 * Google'ın `latin` + `latin-ext` alt kümeleri iki aile için 226.684 bayt
 * ediyordu ve mobil LCP'nin %51'i buydu. `latin-ext`ten bize lazım olan
 * yalnızca beş harf: İ ğ Ğ ş Ş. Gerisi Latin Extended-A/B, IPA fonetik
 * alfabesi ve Latin Extended Additional — hiç kullanmıyoruz.
 *
 * `next/font/google` özel alt küme üretemiyor; `subsets` seçeneği yalnızca
 * Google'ın hazır unicode-range bloklarından seçim yapıyor. Bu yüzden alt
 * kümeyi burada üretip dosyaları depoya koyuyoruz.
 *
 * ⚠️ AĞIRLIK EKSENİ DARALTILAMIYOR — denendi.
 *
 * `wght@400;500` istemek dosyayı küçültmüyor: Google değişken fontu
 * gliflere göre alt kümeliyor ama `wght` eksenini olduğu gibi bırakıyor
 * (Inter 100–900, Source Serif 200–900 olarak geliyor; fontkit ile
 * doğrulandı). Kazancın tamamı glif alt kümesinden geliyor.
 */

import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ALFABE } from '../src/lib/tipografi/alfabe.ts'

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..')
const HEDEF_DIZIN = join(KOK, 'src', 'fonts')

/**
 * ⚠️ Tarayıcı kimliği ZORUNLU.
 *
 * Google Fonts CSS API'si yanıtı istemciye göre değiştiriyor: bilinmeyen
 * bir kimlikle `woff2` yerine eski biçimler dönebiliyor. Modern Chrome
 * kimliği en küçük ve en geniş desteklenen biçimi getiriyor.
 */
const TARAYICI_KIMLIGI =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'

interface Aile {
  /** Google Fonts'taki tam aile adı. */
  ad: string
  /** Üretilecek dosya adı (uzantısız). */
  dosya: string
  /** İstenen ağırlıklar — tasarım sisteminde yalnızca 400 ve 500 var. */
  agirliklar: string
}

const AILELER: readonly Aile[] = [
  { ad: 'Manrope', dosya: 'manrope-turkce', agirliklar: '400;500' },
  { ad: 'Plus Jakarta Sans', dosya: 'plus-jakarta-sans-turkce', agirliklar: '400;500' },
]

async function cssGetir(aile: Aile): Promise<string> {
  const adres = new URL('https://fonts.googleapis.com/css2')
  adres.searchParams.set('family', `${aile.ad}:wght@${aile.agirliklar}`)
  adres.searchParams.set('text', ALFABE)
  adres.searchParams.set('display', 'swap')

  const yanit = await fetch(adres, { headers: { 'User-Agent': TARAYICI_KIMLIGI } })
  if (!yanit.ok) throw new Error(`${aile.ad}: CSS alınamadı (HTTP ${yanit.status})`)

  const govde = await yanit.text()
  // ⚠️ Google hata durumunda 200 ile HTML sayfası döndürebiliyor. Ölçüm
  // sırasında tam bunu yaşadık ve "0 dosya" sonucunu font hatası sandık.
  if (!govde.includes('@font-face')) {
    throw new Error(`${aile.ad}: yanıt CSS değil (muhtemelen hata sayfası)`)
  }
  return govde
}

/** Google'ın yayımladığı sürüm etiketi (`/s/inter/v20` → `v20`). */
async function surumGetir(aile: Aile): Promise<string> {
  const adres = new URL('https://fonts.googleapis.com/css2')
  adres.searchParams.set('family', `${aile.ad}:wght@${aile.agirliklar}`)
  adres.searchParams.set('display', 'swap')
  const govde = await (await fetch(adres, { headers: { 'User-Agent': TARAYICI_KIMLIGI } })).text()
  return /fonts\.gstatic\.com\/s\/[a-z0-9]+\/(v\d+)/.exec(govde)?.[1] ?? 'bilinmiyor'
}

function adresleriAyikla(css: string): string[] {
  const bulunan = [...css.matchAll(/url\((https:\/\/[^)]+)\)/g)].map((m) => m[1]!)
  return [...new Set(bulunan)]
}

const kontrolModu = process.argv.includes('--kontrol')

mkdirSync(HEDEF_DIZIN, { recursive: true })
console.log(`Alfabe: ${[...ALFABE].length} karakter\n`)

let degisenVar = false
const kunye: string[] = []

for (const aile of AILELER) {
  const css = await cssGetir(aile)
  const adresler = adresleriAyikla(css)

  // ⚠️ Tek dosya bekleniyor: `text=` alt kümesi unicode-range'e bölünmüyor.
  // Birden fazla dosya gelirse varsayım bozulmuş demektir; sessizce ilkini
  // almak yerine durup söylüyoruz.
  if (adresler.length !== 1) {
    throw new Error(`${aile.ad}: 1 dosya bekleniyordu, ${adresler.length} geldi`)
  }

  const yanit = await fetch(adresler[0]!, { headers: { 'User-Agent': TARAYICI_KIMLIGI } })
  if (!yanit.ok) throw new Error(`${aile.ad}: woff2 indirilemedi (HTTP ${yanit.status})`)
  const veri = Buffer.from(await yanit.arrayBuffer())

  const hedef = join(HEDEF_DIZIN, `${aile.dosya}.woff2`)
  let oncekiOzet = ''
  try {
    oncekiOzet = createHash('sha256').update(readFileSync(hedef)).digest('hex')
  } catch {
    oncekiOzet = ''
  }
  const yeniOzet = createHash('sha256').update(veri).digest('hex')
  const surum = await surumGetir(aile)

  if (oncekiOzet !== yeniOzet) degisenVar = true
  const durum = oncekiOzet === '' ? 'YENİ' : oncekiOzet === yeniOzet ? 'aynı' : 'DEĞİŞTİ'

  if (!kontrolModu) writeFileSync(hedef, veri)

  console.log(`${aile.ad}`)
  console.log(`  dosya   : src/fonts/${aile.dosya}.woff2`)
  console.log(`  boyut   : ${veri.length.toLocaleString('tr-TR')} bayt`)
  console.log(`  sürüm   : ${surum}`)
  console.log(`  sha256  : ${yeniOzet.slice(0, 16)}…`)
  console.log(`  durum   : ${durum}${kontrolModu ? ' (kontrol modu — yazılmadı)' : ''}\n`)

  kunye.push(`${aile.ad} ${surum} — sha256:${yeniOzet}`)
}

if (kontrolModu && degisenVar) {
  console.error('⚠️ Alt kümeler güncel değil. `pnpm font:altkume` çalıştır.')
  process.exit(1)
}

/**
 * ⚠️ Alfabenin özeti dosyaya yazılıyor — testin bayat fontu yakalaması için.
 *
 * Alfabeye karakter eklenip bu betik çalıştırılmazsa, içerik testi yeşile
 * döner (karakter artık alfabede) ama fontta glif yoktur ve site sessizce
 * yedek fonta düşer. `alfabe.test.ts` bu özeti güncel alfabeyle
 * karşılaştırarak o boşluğu kapatıyor.
 */
if (!kontrolModu) {
  const kunyeIcerigi = {
    aciklama:
      'pnpm font:altkume tarafından üretildi — elle düzenlemeyin. ' +
      'Ayrıntı: src/fonts/OKUBENI.md',
    uretimTarihi: new Date().toISOString().slice(0, 10),
    alfabeKarakterSayisi: [...ALFABE].length,
    alfabeOzeti: createHash('sha256').update(ALFABE).digest('hex'),
    dosyalar: kunye,
  }
  writeFileSync(join(HEDEF_DIZIN, 'uretim.json'), `${JSON.stringify(kunyeIcerigi, null, 2)}\n`)
}

console.log('Künye:')
for (const satir of kunye) console.log(`  ${satir}`)
