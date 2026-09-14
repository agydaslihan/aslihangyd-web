#!/usr/bin/env node
/**
 * Ana sayfanın istemciye indirdiği JavaScript'i ölçer.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN SUNUCUYU AYAĞA KALDIRIP HTML OKUYOR.
 *
 * Daha kolay bir yol var gibi görünüyor: `.next` altındaki manifest'leri
 * okuyup rota başına chunk listesini almak. Turbopack ile o manifest
 * (`app-build-manifest.json`) ÜRETİLMİYOR ve kalanların biçimi Next
 * sürümleri arasında değişiyor — ölçüm sessizce yanlışlaşır ya da bir gün
 * sıfır döner. Sıfır dönen bir eşik kontrolü, olmayan bir eşik kontrolüdür.
 *
 * Bu betik bunun yerine gerçekten yüklenen sayfayı okuyor: tarayıcının
 * indireceği dosyaların aynısını sayıyor. Next'in iç yapısına değil,
 * HTML'in kendisine bağlı.
 *
 * ⚠️ İKİ SINIR VAR (14 Eylül 2026'dan beri):
 *   · TREND EŞİĞİ (220 kB) — aşılınca uyarı düşer, koşu sürer.
 *   · BÜTÇE (320 kB, CLAUDE.md) — aşılınca koşu DÜŞER.
 * Bütçe daha önce hiçbir yerde denetlenmiyordu: CLAUDE.md "≤320 kB"
 * diyordu, betik 220'de yalnızca uyarıyordu. Aynı gün ana sayfa CLS'inin
 * iki hafta raporlayıcı bir kapıda sessizce 0,088'de kaldığı bulundu.
 * Bayt belirlenimci — runner hızına bağlı değil — o yüzden bütçe kapı.
 *
 * ⚠️ TREND EŞİĞİ AŞILDIĞINDA KOŞU BAŞARISIZ OLMAZ, uyarı düşer.
 *
 * Paket boyutu bir kalite kapısı değil, bir trend göstergesi. Testleri
 * geçen bir PR'ı birkaç kilobayt yüzünden bloklamak, kapının kendisini
 * anlamsızlaştırır ve eşiği yükseltme alışkanlığı doğurur. Amaç, sessizce
 * iki katına çıkmasını engellemek.
 *
 * Kullanım:
 *   node scripts/paket-olcumu.mjs [temel-adres] [rota...]
 * ─────────────────────────────────────────────────────────────────────────
 */

import { gzipSync } from 'node:zlib'

/**
 * Eşik: ana sayfa istemci JS'i, gzip.
 *
 * 198,7 kB ölçülmüş referans (Faz 2 sonu). 220 kB, yaklaşık %10 pay
 * bırakıyor: normal gelişme gürültüsü uyarı üretmesin, ama bir kütüphane
 * sessizce eklendiğinde görülsün.
 *
 * ⚠️ Bu sayıyı yükseltmek bir karardır, bir bakım işi değil. Yükseltmeden
 * önce neyin büyüdüğüne bakın — genellikle cevap "kaldırılabilir".
 */
const ESIK_BAYT = 220 * 1024

/**
 * Bütçe: CLAUDE.md → "Bundle: ana sayfa ≤320 kB gzip". AŞILIRSA KOŞU DÜŞER.
 *
 * ⚠️ İkiz sayı: `src/lib/olcum/paketButcesi.test.ts` CLAUDE.md ile bu
 * satırın aynı kaldığını denetliyor. Bütçeyi değiştiren ikisini birden
 * değiştirir.
 */
const BUTCE_BAYT = 320 * 1024

const temelAdres = (process.argv[2] ?? 'http://127.0.0.1:3000').replace(/\/$/, '')
const rotalar = process.argv.length > 3 ? process.argv.slice(3) : ['/']

/** HTML'den `_next/static` altındaki betik adreslerini toplar. */
function betikAdresleri(html) {
  const adresler = new Set()

  // <script src="..."> ve <link rel="preload" as="script" href="...">
  for (const eslesme of html.matchAll(/(?:src|href)="([^"]*\/_next\/static\/[^"]+\.js)"/g)) {
    const adres = eslesme[1]
    if (adres !== undefined) adresler.add(adres)
  }

  return [...adresler]
}

async function rotayiOlc(rota) {
  const yanit = await fetch(temelAdres + rota)
  if (!yanit.ok) throw new Error(`${rota} → HTTP ${yanit.status}`)

  const html = await yanit.text()
  const adresler = betikAdresleri(html)

  if (adresler.length === 0) {
    // Sessizce sıfır dönmek, ölçümün en tehlikeli başarısızlığı.
    throw new Error(
      `${rota} içinde hiç betik bulunamadı. HTML biçimi değişmiş olabilir — ` +
        'ölçüm yanlış, eşik kontrolü anlamsız.',
    )
  }

  /**
   * ⚠️ GELİŞTİRME SUNUCUSUNA KARŞI ÖLÇÜM YAPMA.
   *
   * Bu kontrol bir "olur da" değil: yazılırken tam olarak bu oldu.
   * 3000 portunda unutulmuş bir `pnpm dev` vardı, `next start` "adres
   * kullanımda" diyip düştü ve ölçüm sessizce geliştirme paketini saydı.
   * Sonuç 804 kB çıktı — gerçek değerin dört katı. Rakam inandırıcı
   * olmadığı için fark edildi; %10 sapsaydı fark edilmez ve eşik
   * kalıcı olarak yanlış bir zemine oturmuş olurdu.
   */
  const gelistirmeIzleri = adresler.filter((adres) =>
    /next-devtools|hmr-client|react-refresh/.test(adres),
  )
  if (gelistirmeIzleri.length > 0) {
    throw new Error(
      `${rota} GELİŞTİRME paketi sunuyor (${gelistirmeIzleri.length} geliştirme parçası: ` +
        `${gelistirmeIzleri[0]?.split('/').pop()}). Ölçüm anlamsız — ` +
        `${temelAdres} adresinde bir \`next dev\` sunucusu çalışıyor olabilir. ` +
        '`pnpm build && pnpm start` ile üretim derlemesine karşı ölçün.',
    )
  }

  let hamToplam = 0
  let gzipToplam = 0

  for (const adres of adresler) {
    const tam = adres.startsWith('http') ? adres : temelAdres + adres
    const dosya = await fetch(tam)
    if (!dosya.ok) throw new Error(`${adres} → HTTP ${dosya.status}`)

    const govde = Buffer.from(await dosya.arrayBuffer())
    hamToplam += govde.length
    gzipToplam += gzipSync(govde, { level: 9 }).length
  }

  return { rota, dosyaSayisi: adresler.length, hamToplam, gzipToplam }
}

function kb(bayt) {
  return `${(bayt / 1024).toFixed(1)} kB`
}

const sonuclar = []
for (const rota of rotalar) {
  sonuclar.push(await rotayiOlc(rota))
}

const satirlar = [
  '### İstemci JavaScript',
  '',
  '| Rota | Dosya | Sıkıştırılmamış | gzip |',
  '| --- | ---: | ---: | ---: |',
  ...sonuclar.map(
    (s) => `| \`${s.rota}\` | ${s.dosyaSayisi} | ${kb(s.hamToplam)} | **${kb(s.gzipToplam)}** |`,
  ),
  '',
  `Trend eşiği (ana sayfa): ${kb(ESIK_BAYT)} gzip · Bütçe (engelleyici): ${kb(BUTCE_BAYT)} gzip`,
]

const anaSayfa = sonuclar.find((s) => s.rota === '/')
let asildi = false

if (anaSayfa !== undefined && anaSayfa.gzipToplam > ESIK_BAYT) {
  asildi = true
  const fazla = anaSayfa.gzipToplam - ESIK_BAYT
  satirlar.push(
    '',
    `⚠️ **Eşik aşıldı: ${kb(anaSayfa.gzipToplam)} > ${kb(ESIK_BAYT)}** (+${kb(fazla)})`,
    '',
    'Koşu başarısız sayılmadı — bu bir trend göstergesi. Ama neyin',
    'büyüdüğüne bakın: yeni bir kütüphane istemci paketine mi girdi,',
    "yoksa bir bileşen gereksiz yere `'use client'` mi oldu?",
  )
}

const butceAsildi = anaSayfa !== undefined && anaSayfa.gzipToplam > BUTCE_BAYT
if (butceAsildi) {
  satirlar.push(
    '',
    `❌ **BÜTÇE AŞILDI: ${kb(anaSayfa.gzipToplam)} > ${kb(BUTCE_BAYT)}** — koşu düştü (CLAUDE.md).`,
  )
}

console.log(satirlar.join('\n'))

if (process.env.GITHUB_STEP_SUMMARY !== undefined) {
  const { appendFileSync } = await import('node:fs')
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, satirlar.join('\n') + '\n')
}

if (asildi && process.env.GITHUB_ACTIONS !== undefined && anaSayfa !== undefined) {
  console.log(
    `::warning title=İstemci JS eşiği aşıldı::${kb(anaSayfa.gzipToplam)} > ${kb(ESIK_BAYT)} gzip. ` +
      'Koşu bloklanmadı; docs/ILERLEME.md içindeki ölçüm notunu güncelleyin.',
  )
}

if (butceAsildi) {
  console.error(
    `::error title=İstemci JS bütçesi aşıldı::${kb(anaSayfa.gzipToplam)} > ${kb(BUTCE_BAYT)} gzip (CLAUDE.md bütçesi).`,
  )
  process.exit(1)
}

// ⚠️ Trend eşiği aşılsa bile 0 dönülür — o bir uyarı; bütçe yukarıda.
process.exit(0)
