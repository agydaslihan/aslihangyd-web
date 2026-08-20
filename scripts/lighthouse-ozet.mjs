#!/usr/bin/env node
/**
 * Lighthouse JSON raporlarını okunabilir bir Markdown tablosuna çevirir.
 *
 * CI iş özetinde (GITHUB_STEP_SUMMARY) görünür — böylece skorları görmek
 * için rapor dosyasını indirmek gerekmez.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ MEDYAN ALINIYOR — TEK KOŞUM YANILTICIYDI.
 *
 * 7 Ağustos 2026: aynı kod tabanı dört ayrı koşumda anasayfa için 100, 96,
 * 81 ve 77 performans skoru üretti. Sebep kodda bir değişiklik değil,
 * runner hızıydı — TBT eşiğin tam kenarında oturuyor ve `benchmarkIndex`
 * %5 oynayınca skor 20 puan sıçrıyor:
 *
 *     benchmarkIndex 2994 → TBT   0 ms → 100
 *     benchmarkIndex 2106 → TBT 163 ms →  96
 *     benchmarkIndex 2014 → TBT 494 ms →  77
 *
 * Tek koşumluk sayıya bakıp "performans düştü" demek, o gün hangi
 * makineye düştüğümüzü tartışmaktan ibaret olurdu. Bir PR'ın gerçekten
 * yavaşlatıp yavaşlatmadığını ancak tekrar edilmiş ölçüm söyler.
 *
 * Medyan HER ÖLÇÜT İÇİN AYRI alınıyor, "medyan koşum" seçilmiyor.
 * Gerekçe: erişilebilirlik/SEO/en-iyi-uygulamalar denetimleri deterministik,
 * üç koşumda da aynı çıkıyor; oynayan tek şey performans ailesi. Ölçüt
 * bazında medyan, o tek gürültülü aileyi sakinleştirirken diğerlerini
 * olduğu gibi bırakıyor. Yayılım (en düşük–en yüksek) da basılıyor —
 * gizlenmiş bir gürültü, olmayan bir gürültüden daha tehlikeli.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Beklenen dosya adı: `<cihaz>-<sayfa>-<koşum>.report.json`
 *   örn. `mobil-anasayfa-2.report.json`
 * Eski düz adlandırma (`anasayfa.report.json`) da okunur; o durumda tek
 * koşum varmış gibi davranır ve yayılım gösterilmez.
 *
 * Hedefler `docs/AURORA-LUXURY.md` §4'ten. ⚠️ CİHAZA GÖRE FARKLI ve bu
 * bilinçli bir indirim değil, ölçülmüş bir gerçek: mobil performans skoru
 * simüle edilmiş 4G + 4× CPU yavaşlatmayla hesaplanıyor ve hareket kodu
 * taşıyan bir sitede 95 gerçekçi değil. Taban 75; altına düşerse hangi
 * bölüm, hangi animasyon, kaç kB sorusu sorulur.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const HEDEFLER = {
  masaustu: {
    performance: 90,
    accessibility: 95,
    'best-practices': 100,
    seo: 100,
  },
  mobil: {
    performance: 75,
    accessibility: 95,
    'best-practices': 100,
    seo: 100,
  },
}

/** Bilinmeyen cihaz anahtarı için masaüstü eşiği — daha sıkı olan. */
function hedefler(cihaz) {
  return HEDEFLER[cihaz] ?? HEDEFLER.masaustu
}

/** Cihaz anahtarından başlık. Bilinmeyen anahtar olduğu gibi yazılır. */
const CIHAZ_ADI = { masaustu: 'Masaüstü', mobil: 'Mobil' }

const dizin = process.argv[2]
if (!dizin) {
  console.error('Kullanım: lighthouse-ozet.mjs <rapor-dizini>')
  process.exit(1)
}

let dosyalar = []
try {
  dosyalar = readdirSync(dizin).filter((ad) => ad.endsWith('.report.json'))
} catch {
  console.log('## Lighthouse\n\nRapor dizini okunamadı.')
  process.exit(0)
}

if (dosyalar.length === 0) {
  console.log('## Lighthouse\n\nRapor üretilemedi.')
  process.exit(0)
}

/**
 * `mobil-anasayfa-2.report.json` → { cihaz: 'mobil', sayfa: 'anasayfa' }
 *
 * ⚠️ Sayfa adı tire içerebilir (`yatirim-skoru`), bu yüzden ilk parça cihaz,
 * son parça koşum sırası, ORTADAKİ HER ŞEY sayfa adı sayılıyor. Naif bir
 * `split('-')` çok parçalı sayfa adlarını bölerdi.
 */
function ayristir(dosyaAdi) {
  const govde = dosyaAdi.replace('.report.json', '')
  const parcalar = govde.split('-')
  if (parcalar.length >= 3 && /^\d+$/.test(parcalar.at(-1))) {
    return { cihaz: parcalar[0], sayfa: parcalar.slice(1, -1).join('-') }
  }
  return { cihaz: '', sayfa: govde }
}

/** Sayı dizisinin medyanı. Çift sayıda eleman varsa ortadaki ikisinin ortalaması. */
function medyan(sayilar) {
  const s = [...sayilar].sort((a, b) => a - b)
  const orta = Math.floor(s.length / 2)
  return s.length % 2 ? s[orta] : (s[orta - 1] + s[orta]) / 2
}

// Koşumları (cihaz, sayfa) çiftine göre topla.
const gruplar = new Map()
for (const dosya of dosyalar) {
  let rapor
  try {
    rapor = JSON.parse(readFileSync(join(dizin, dosya), 'utf8'))
  } catch {
    continue
  }
  const { cihaz, sayfa } = ayristir(dosya)
  const anahtar = `${cihaz}\u0000${sayfa}`
  if (!gruplar.has(anahtar)) gruplar.set(anahtar, { cihaz, sayfa, raporlar: [] })
  gruplar.get(anahtar).raporlar.push(rapor)
}

if (gruplar.size === 0) {
  console.log('## Lighthouse\n\nOkunabilir rapor bulunamadı.')
  process.exit(0)
}

const cihazlar = [...new Set([...gruplar.values()].map((g) => g.cihaz))].sort()
const sayilar = [...gruplar.values()].map((g) => g.raporlar.length)
const enAz = Math.min(...sayilar)
const enCok = Math.max(...sayilar)

console.log('## Lighthouse ölçümü\n')

/**
 * ⚠️ Başlık, koşum sayısını OLDUĞU GİBİ söylemek zorunda.
 *
 * Önce "en az koşum > 1 mi" diye bakılıyordu; bir sayfa tek koşumla
 * bittiğinde başlık tablonun tamamı için "tek koşum" diyordu ve üç koşumla
 * alınmış medyanlar gürültülü sanılıyordu. Karışık durum artık karışık
 * olduğu söylenerek yazılıyor.
 */
if (enAz === enCok) {
  console.log(
    enCok > 1
      ? `Her sayfa ve cihaz için **${enCok} koşum**; aşağıdaki değerler **medyan**.\n`
      : 'Tek koşum — bu sayılar gürültülüdür, tek başına karşılaştırma için kullanılmamalı.\n',
  )
} else {
  console.log(
    `Koşum sayısı sayfaya göre değişiyor (**${enAz}–${enCok}**); değerler medyan. ` +
      'Tek koşumla ölçülen satırlar gürültülüdür.\n',
  )
}

for (const cihaz of cihazlar) {
  const grup = [...gruplar.values()].filter((g) => g.cihaz === cihaz)
  if (cihaz) console.log(`### ${CIHAZ_ADI[cihaz] ?? cihaz}\n`)

  console.log('| Sayfa | Performans | Erişilebilirlik | En iyi uygulamalar | SEO |')
  console.log('| --- | --- | --- | --- | --- |')

  for (const { sayfa, raporlar } of grup.sort((a, b) => a.sayfa.localeCompare(b.sayfa))) {
    const cihazHedefi = hedefler(cihaz)
    const hucreler = Object.keys(cihazHedefi).map((anahtar) => {
      const puanlar = raporlar
        .map((r) => r.categories?.[anahtar]?.score)
        .filter((p) => typeof p === 'number')
        .map((p) => Math.round(p * 100))
      if (puanlar.length === 0) return '—'

      const orta = Math.round(medyan(puanlar))
      const isaret = orta >= cihazHedefi[anahtar] ? '✅' : '⚠️'
      const dusuk = Math.min(...puanlar)
      const yuksek = Math.max(...puanlar)
      // Yayılım yalnızca gerçekten oynadıysa yazılıyor; her hücreye
      // "(100–100)" basmak tabloyu okunmaz hale getirirdi.
      const yayilim = dusuk === yuksek ? '' : ` <sub>${dusuk}–${yuksek}</sub>`
      return `${isaret} ${orta}${yayilim}`
    })
    console.log(`| \`${sayfa}\` | ${hucreler.join(' | ')} |`)
  }
  console.log('')
}

console.log('### Core Web Vitals\n')
console.log('| Cihaz | Sayfa | LCP (hedef < 2,5 sn) | CLS (hedef < 0,1) | TBT |')
console.log('| --- | --- | --- | --- | --- |')

for (const cihaz of cihazlar) {
  const grup = [...gruplar.values()].filter((g) => g.cihaz === cihaz)
  for (const { sayfa, raporlar } of grup.sort((a, b) => a.sayfa.localeCompare(b.sayfa))) {
    const olc = (anahtar, bicim) => {
      const degerler = raporlar
        .map((r) => r.audits?.[anahtar]?.numericValue)
        .filter((d) => typeof d === 'number')
      if (degerler.length === 0) return '—'
      return bicim(medyan(degerler))
    }
    const sn = (ms) => `${(ms / 1000).toFixed(1)} sn`
    const ms = (v) => `${Math.round(v)} ms`
    const ondalik = (v) => v.toFixed(3)

    console.log(
      `| ${CIHAZ_ADI[cihaz] ?? (cihaz || '—')} | \`${sayfa}\` | ` +
        `${olc('largest-contentful-paint', sn)} | ` +
        `${olc('cumulative-layout-shift', ondalik)} | ` +
        `${olc('total-blocking-time', ms)} |`,
    )
  }
}

/**
 * ⚠️ BAYT DÖKÜMÜ — CPU'DAN BAĞIMSIZ TEK KANIT.
 *
 * Skorlar runner hızına duyarlı: aynı kod tabanı benchmarkIndex 2465'te
 * 89, 2904'te 94 aldı. İki koşumu skorla karşılaştırmak, o gün hangi
 * makineye düştüğümüzü tartışmak oluyor.
 *
 * Bayt sayıları böyle değil: kaç bayt indiği makinenin hızından bağımsız.
 * Bir değişikliğin sayfayı gerçekten hafifletip hafifletmediğini ancak
 * bunlar söyler. Bu yüzden her özette türe göre ayrı ayrı basılıyor.
 */
function baytDokumu(raporlar) {
  const turler = { gorsel: 0, javascript: 0, yaziTipi: 0, css: 0, belge: 0, diger: 0 }
  let sayilan = 0

  for (const rapor of raporlar) {
    /*
     * ⚠️ `network-requests` kullanılıyor, `total-byte-weight` DEĞİL.
     *
     * `total-byte-weight` yalnızca EN BÜYÜK ~10 kaynağı listeliyor. İlk
     * sürümde onu kullandım ve /portfoy masaüstünde "Görseller 0 kB"
     * çıktı — görseller listeye girememişti. Eksik sayan bir döküm,
     * olmayandan kötüdür: yanlış bir güvence verir.
     */
    const ogeler = rapor.audits?.['network-requests']?.details?.items
    if (!Array.isArray(ogeler)) continue
    sayilan += 1

    for (const oge of ogeler) {
      const adres = String(oge.url ?? '')
      // Aktarım boyutu = sıkıştırılmış hâli; ziyaretçinin gerçekten indirdiği.
      const bayt = Number(oge.transferSize ?? 0)
      const tur = String(oge.resourceType ?? '')

      if (adres.includes('/_next/image')) turler.gorsel += bayt
      else if (tur === 'Font' || adres.includes('/_next/static/media/')) turler.yaziTipi += bayt
      else if (tur === 'Script') turler.javascript += bayt
      else if (tur === 'Stylesheet') turler.css += bayt
      else if (tur === 'Document') turler.belge += bayt
      else turler.diger += bayt
    }
  }

  if (sayilan === 0) return null
  for (const anahtar of Object.keys(turler)) turler[anahtar] = Math.round(turler[anahtar] / sayilan)
  return turler
}

const TUR_ADI = {
  gorsel: 'Görseller',
  javascript: 'JavaScript',
  yaziTipi: 'Yazı tipleri',
  css: 'CSS',
  belge: 'Belge (HTML/RSC)',
  diger: 'Diğer',
}

console.log('\n### Aktarılan bayt (koşum başına)\n')
console.log(
  '> ⚠️ Skorlar runner hızına duyarlı; **bu sayılar değil**. İki koşumu ' +
    'karşılaştırırken önce buraya bak.\n',
)
console.log(`| Cihaz | Sayfa | ${Object.values(TUR_ADI).join(' | ')} | Toplam |`)
console.log(
  `| --- | --- | ${Object.keys(TUR_ADI)
    .map(() => '---')
    .join(' | ')} | --- |`,
)

for (const cihaz of cihazlar) {
  const grup = [...gruplar.values()].filter((g) => g.cihaz === cihaz)
  for (const { sayfa, raporlar } of grup.sort((a, b) => a.sayfa.localeCompare(b.sayfa))) {
    const dokum = baytDokumu(raporlar)
    if (dokum === null) continue
    const hucreler = Object.keys(TUR_ADI).map((anahtar) => baytYaz(dokum[anahtar]))
    const toplam = Object.values(dokum).reduce((a, b) => a + b, 0)
    console.log(
      `| ${CIHAZ_ADI[cihaz] ?? (cihaz || '—')} | \`${sayfa}\` | ${hucreler.join(' | ')} | ` +
        `**${baytYaz(toplam)}** |`,
    )
  }
}

/** kB olarak, tabular hizalanacak biçimde. */
function baytYaz(bayt) {
  return `${Math.round(bayt / 1024).toLocaleString('tr-TR')} kB`
}

/**
 * ⚠️ Runner hızı basılıyor.
 *
 * İki koşumun skorlarını karşılaştırırken ilk sorulacak soru "aynı hızda
 * makinelerde mi ölçüldü?" olmalı. `benchmarkIndex` bunu tek sayıyla
 * söylüyor; olmadığında iki farklı runner'ın sayıları sanki aynı koşulda
 * alınmış gibi yan yana konur.
 */
const endeksler = [...gruplar.values()]
  .flatMap((g) => g.raporlar.map((r) => r.environment?.benchmarkIndex))
  .filter((d) => typeof d === 'number')

if (endeksler.length > 0) {
  const enDusuk = Math.min(...endeksler)
  const enYuksek = Math.max(...endeksler)
  const ortaEndeks = Math.round(medyan(endeksler))

  /**
   * ⚠️ %10'U AŞAN YAYILIM KARŞILAŞTIRMAYI GEÇERSİZ KILAR.
   *
   * Bu projede aynı kod tabanı benchmarkIndex 2465'te 89, 2904'te 94 aldı.
   * Yani runner hızı %18 oynayınca skor 5 puan oynadı. Bir PR'ın skoru
   * yükseldi diye "hızlandırdık" demek, o gün daha hızlı bir makineye
   * düştüğümüzü söylemekten farksız olabilir.
   *
   * Eşik %10: altında kalan farkın skora etkisi ölçüm gürültüsünün içinde
   * kalıyor, üstünde kalmıyor. Uyarı KOŞUMU DÜŞÜRMÜYOR — ölçüm hâlâ
   * raporlayıcı; yalnızca sayıya bakan kişiyi durduruyor.
   */
  const yayilimYuzde = enDusuk === 0 ? 0 : ((enYuksek - enDusuk) / enDusuk) * 100

  console.log(
    `\n> Runner hız göstergesi (benchmarkIndex): medyan ${ortaEndeks}, ` +
      `aralık ${Math.round(enDusuk)}–${Math.round(enYuksek)}.`,
  )

  if (yayilimYuzde > 10) {
    console.log(
      `>\n> ⚠️ **BU KOŞUMUN SKORLARI KENDİ İÇİNDE KARŞILAŞTIRILABİLİR DEĞİL.** ` +
        `Runner hızı koşumlar arasında %${yayilimYuzde.toFixed(0)} oynadı (eşik %10). ` +
        `Sayfalar farklı hızda makinelerde ölçüldü; aralarındaki skor farkı koddan ` +
        `değil makineden geliyor olabilir. **Yukarıdaki bayt tablosuna bakın** — ` +
        `o sayılar CPU hızından bağımsız.`,
    )
  }

  console.log(
    `>\n> Başka bir koşumla karşılaştırırken: iki koşumun medyan ` +
      `benchmarkIndex farkı %10'u aşıyorsa skorları değil **baytları** kıyaslayın.`,
  )
}

console.log(
  '\n> Ölçüm DEMO veriyle yapıldı. Görseller temsili boyutta ama sentetik ' +
    '(hero ~72 kB, kart ~28 kB); metinler yer tutucu. Gerçek içerik ve ' +
    'fotoğraflar girdiğinde sayılar değişecektir.',
)
