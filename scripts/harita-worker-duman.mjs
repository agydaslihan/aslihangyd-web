#!/usr/bin/env node
/**
 * Harita worker duman testi — üretim derlemesine ve çalışan sunucuya karşı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: CI YEŞİLKEN HARİTA ÜRETİMDE TAMAMEN KIRIKTI.
 *
 * `pnpm typecheck && lint && test && build` dördü de temiz geçiyordu.
 * Kırılan şey tipte, sözdiziminde ya da birim davranışında değildi:
 * MapLibre'nin worker adresi PAKETLEME SIRASINDA boş dizgeye düşüyordu ve
 * bu ancak tarayıcı worker'ı istediğinde görünüyordu.
 *
 * Kaynak koda bakan hiçbir test bunu yakalayamazdı — kaynak kod doğruydu.
 * Bu yüzden burada üç şey ÖLÇÜLÜYOR, varsayılmıyor:
 *
 *   1. Derlenmiş çıktı worker adresini gerçekten taşıyor mu
 *   2. O adres sunucudan JavaScript olarak mı geliyor (HTML değil)
 *   3. Worker'ın kendi içe aktarımı da JavaScript olarak mı geliyor
 *
 * Üçüncüsü ayrı bir tuzağı kapatıyor: worker dosyası tek başına
 * kopyalanırsa yüklenir ama ilk satırındaki
 * `import "./maplibre-gl-shared.mjs"` 404 alır ve worker yine ölür.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Kullanım:  node scripts/harita-worker-duman.mjs http://127.0.0.1:3000
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { GEREKEN_DOSYALAR, maplibreSurumu, workerAdresi } from './maplibre-worker-hazirla.mjs'

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const taban = (process.argv[2] ?? 'http://127.0.0.1:3000').replace(/\/+$/, '')

const hatalar = []
const basarili = []

function gecti(mesaj) {
  basarili.push(mesaj)
}

function kaldi(mesaj) {
  hatalar.push(mesaj)
}

/* ── 1. Kopyalanan dosyalar ──────────────────────────────────────────── */

const surum = maplibreSurumu()
const dizin = path.join(KOK, 'public', 'maplibre', surum)

for (const dosya of GEREKEN_DOSYALAR) {
  const yol = path.join(dizin, dosya)
  if (!existsSync(yol)) {
    kaldi(
      `public/maplibre/${surum}/${dosya} yok. ` +
        '`node scripts/maplibre-worker-hazirla.mjs` derleme adımına bağlı mı?',
    )
    continue
  }
  const kaynak = path.join(KOK, 'node_modules', 'maplibre-gl', 'dist', dosya)
  if (readFileSync(yol).equals(readFileSync(kaynak))) {
    gecti(`${dosya} kopyası node_modules ile birebir aynı`)
  } else {
    kaldi(`${dosya} kopyası node_modules'takinden FARKLI — bayat kopya.`)
  }
}

/**
 * ⚠️ Worker'ın göreli içe aktarımı yanındaki dosyaya düşmeli.
 *
 * Turbopack'in `.next/static/media/` altına attığı kopya tam olarak burada
 * kırılıyor: dosya orada ama `maplibre-gl-shared.mjs` yanında yok.
 */
const workerDosyasi = path.join(dizin, 'maplibre-gl-worker.mjs')
if (existsSync(workerDosyasi)) {
  const govde = readFileSync(workerDosyasi, 'utf8')
  for (const [, hedef] of govde.matchAll(/from\s*["'](\.[^"']+)["']/g)) {
    if (existsSync(path.join(dizin, hedef))) {
      gecti(`worker'ın içe aktarımı yanında: ${hedef}`)
    } else {
      kaldi(`worker "${hedef}" içe aktarıyor ama dosya yanında YOK — yüklenince 404 alır.`)
    }
  }
}

/* ── 2. Derlenmiş çıktı (YEREL .next) ────────────────────────────────── */

/**
 * ⚠️ ASIL ARIZAYI YAKALAYAN DENETİM BU.
 *
 * Kaynakta `setWorkerUrl(...)` çağrısı olması yetmez; önemli olan
 * paketleyicinin onu çıktıya GERÇEKTEN koyup koymadığı. Kırık hâlde
 * derlenmiş paketin içinde hiçbir worker adresi yoktu — MapLibre'nin
 * `import.meta.url` yolu boş dizgeye düşüyordu.
 */
const adres = workerAdresi(surum)
const parcaDizini = path.join(KOK, '.next', 'static', 'chunks')

/**
 * ⚠️ TAM ADRES ARANMIYOR, ATAMA ARANIYOR.
 *
 * Adres kodda `` `/maplibre/${getVersion()}/…` `` biçiminde kuruluyor;
 * küçültücü sürümü bir değişkene alıyor ve çıktıda çözülmüş dizge
 * bulunmuyor:
 *
 *     t$.WORKER_URL = `/maplibre/${cR}/maplibre-gl-worker.mjs`
 *
 * Çözülmüş adresi arayan bir denetim, ÇALIŞAN derlemede kırmızı verirdi —
 * ve o yanlış alarm ilk hafta kapatılırdı.
 */
const ATAMA_DESENI = /WORKER_URL\s*=\s*[`"']\/maplibre\//

if (!existsSync(parcaDizini)) {
  kaldi('.next/static/chunks yok — önce `pnpm build` çalıştırın.')
} else {
  const parcalar = readdirSync(parcaDizini).filter((ad) => ad.endsWith('.js'))
  const bulunan = parcalar.some((ad) =>
    ATAMA_DESENI.test(readFileSync(path.join(parcaDizini, ad), 'utf8')),
  )
  if (bulunan) {
    gecti('yerel derleme çıktısı worker adresini atıyor (WORKER_URL = /maplibre/…)')
  } else {
    kaldi(
      'Yerel derleme çıktısının (.next) hiçbir yerinde WORKER_URL ataması yok. ' +
        'setWorkerUrl çağrısı paketlemede düşmüş olabilir — harita üretimde çizmez. ' +
        '(Bu denetim YEREL .next dizinine bakar; uzak bir sunucuyu sınıyorsanız önce `pnpm build`.)',
    )
  }
}

/* ── 3. Sunucudan gerçekten ne geliyor ───────────────────────────────── */

function javascriptMi(tur) {
  return /javascript|ecmascript/i.test(tur ?? '')
}

async function adresiDene(yol, etiket) {
  let yanit
  try {
    yanit = await fetch(`${taban}${yol}`)
  } catch (hata) {
    kaldi(`${etiket} istenemedi (${yol}): ${hata.message}`)
    return null
  }

  if (!yanit.ok) {
    kaldi(`${etiket} ${yanit.status} döndü (${yol}).`)
    return null
  }

  const tur = yanit.headers.get('content-type')
  const govde = await yanit.text()

  /**
   * ⚠️ Yaşanan arıza tam olarak buydu: adres 200 dönüyordu ama gelen şey
   * SAYFANIN HTML'İ idi. Yalnızca durum koduna bakan bir test bunu
   * "başarılı" sayardı.
   */
  if (!javascriptMi(tur)) {
    kaldi(`${etiket} JavaScript olarak sunulmuyor (${yol}) — content-type: ${tur}`)
    return null
  }
  if (/^\s*</.test(govde)) {
    kaldi(`${etiket} gövdesi HTML gibi başlıyor (${yol}).`)
    return null
  }

  gecti(`${etiket} JavaScript olarak geliyor (${tur})`)
  return govde
}

const workerGovdesi = await adresiDene(adres, 'worker')

if (workerGovdesi !== null) {
  for (const [, hedef] of workerGovdesi.matchAll(/from\s*["'](\.[^"']+)["']/g)) {
    const cozulen = new URL(hedef, `http://x${adres}`).pathname
    await adresiDene(cozulen, `worker içe aktarımı (${hedef})`)
  }
}

/**
 * Sayfanın kendisi hâlâ HTML dönmeli — worker adresi sayfayı gölgelemiş
 * olmasın diye.
 */
try {
  const sayfa = await fetch(`${taban}/harita`)
  if (sayfa.ok && /text\/html/i.test(sayfa.headers.get('content-type') ?? '')) {
    gecti('/harita sayfası HTML olarak geliyor')
  } else {
    kaldi(`/harita beklenen HTML'i döndürmedi (${sayfa.status}).`)
  }
} catch (hata) {
  kaldi(`/harita istenemedi: ${hata.message}`)
}

/* ── Sonuç ───────────────────────────────────────────────────────────── */

for (const satir of basarili) console.log(`  ✓ ${satir}`)
for (const satir of hatalar) console.error(`  ✗ ${satir}`)

if (hatalar.length > 0) {
  console.error(`\n✗ Harita worker duman testi başarısız (${hatalar.length} sorun).`)
  process.exit(1)
}

console.log(`\n✓ Harita worker duman testi temiz (maplibre-gl ${surum}).`)
