#!/usr/bin/env node
/**
 * Gezinme duman testi — "site tıklanabiliyor mu?"
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: 24 AĞUSTOS 2026'DA SİTE KULLANILAMAZ HÂLDEYDİ VE HİÇBİR
 *    DENETİM BUNU GÖRMEDİ.
 *
 * ScrollTrigger'ın sabitleme (`pin`) özelliği anasayfadaki yatay anlatıyı
 * kendi ürettiği `<div class="pin-spacer">` içine TAŞIYORDU. React o
 * düğümün ebeveynini hâlâ `<main>` sanıyordu; ziyaretçi menüden bir
 * bağlantıya bastığında `main.removeChild(bölüm)` çağrısı
 * `NotFoundError` fırlatıyor, hata `commit` aşamasında düştüğü için React
 * kökün tamamını söküyordu. Ekran boşalıyor, tarayıcı "sayfa yüklenemedi"
 * diyordu. F5 çalışıyordu.
 *
 * O gün yeşil olanlar: tüm rotalar 200, 101 test dosyası, Lighthouse
 * masaüstü 100 / mobil 92, CLS 0,000. Hiçbiri BİR BAĞLANTIYA TIKLAMIYORDU.
 *
 * ⚠️ İKİ ŞART BİRDEN OLMADAN ARIZA GÖRÜNMEZ:
 *
 *   1. `prefers-reduced-motion: no-preference` — az hareket açıkken
 *      GSAP hiç inmiyor, sabitleme hiç kurulmuyor.
 *   2. `(pointer: fine)` — headless Chrome bu sorguya VARSAYILAN OLARAK
 *      `false` diyor. `masaustuMu()` false dönüyor ve hareket kodunun
 *      tamamı atlanıyor.
 *
 * İkincisi bu arızayı üç ayrı denemede gizledi: tarayıcı "her şey
 * çalışıyor" diyordu çünkü kırılan kod yolu hiç çalıştırılmamıştı.
 * Bu yüzden aşağıda `matchMedia` yamalanıyor — testin en kritik satırı bu,
 * kaldırmayın.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Kullanım:
 *   node scripts/gezinme-dumani.mjs [taban-adres] [--cdp=ADRES] [--chrome=YOL]
 *
 *   --cdp     hazır bir Chrome'un DevTools ucu (örn. http://127.0.0.1:9222).
 *             Verilmezse betik kendi Chrome'unu başlatır.
 *   --chrome  Chrome çalıştırılabiliri (varsayılan: bilinen yollarda aranır)
 *
 * ⚠️ Ayarlar ORTAM DEĞİŞKENİ DEĞİL, BAYRAK. `src/lib/ortam.test.ts` kodun
 * okuduğu her ortam değişkeninin `.env.example` ve `compose.prod.yml` ile
 * kaba ulaşmasını şart koşuyor — haklı olarak. Bunlar uygulama ayarı değil
 * test aracı ayarı; oralara yazmak o denetimi anlamsızlaştırırdı.
 *
 * Bağımlılık yok: CDP'ye Node 22'nin yerleşik `WebSocket`'i ile bağlanıyor.
 */

import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const bayraklar = process.argv.slice(2)
const bayrak = (ad) => bayraklar.find((a) => a.startsWith(`--${ad}=`))?.slice(ad.length + 3) ?? null

const TABAN = (bayraklar.find((a) => !a.startsWith('--')) ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
)
const CDP_ADRESI = bayrak('cdp')
const CHROME_YOLU = bayrak('chrome')

/**
 * ⚠️ En az üç rota — talimat böyle. Ana sayfadan çıkış ilk sırada, çünkü
 * sabitlenen bölüm orada ve arıza yalnızca oradan çıkarken görünüyordu.
 */
const ROTALAR = ['/portfoy', '/mahalleler', '/araclar']

const uyu = (ms) => new Promise((c) => setTimeout(c, ms))

function chromeBul() {
  if (CHROME_YOLU) return CHROME_YOLU
  const adaylar = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/opt/google/chrome/chrome',
  ]
  const bulunan = adaylar.find((y) => existsSync(y))
  if (!bulunan) {
    throw new Error(
      'Chrome bulunamadı. --chrome=YOL ile yol verin ya da --cdp=ADRES ile hazır bir tarayıcıya bağlanın.',
    )
  }
  return bulunan
}

async function tarayiciyaBaglan() {
  if (CDP_ADRESI) {
    const s = await (await fetch(`${CDP_ADRESI}/json/version`)).json()
    return { wsAdresi: s.webSocketDebuggerUrl, kapat: () => {} }
  }

  const port = 9333
  const profil = mkdtempSync(path.join(tmpdir(), 'gezinme-dumani-'))
  const surec = spawn(
    chromeBul(),
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profil}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  )

  for (let deneme = 0; deneme < 40; deneme++) {
    await uyu(500)
    try {
      const s = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()
      return { wsAdresi: s.webSocketDebuggerUrl, kapat: () => surec.kill() }
    } catch {
      /* tarayıcı henüz ayakta değil */
    }
  }
  surec.kill()
  throw new Error('Chrome DevTools ucu 20 saniyede açılmadı.')
}

/** Minimal CDP istemcisi. */
async function oturumAc(wsAdresi) {
  const ws = new WebSocket(wsAdresi)
  await new Promise((c, r) => {
    ws.onopen = c
    ws.onerror = () => r(new Error('CDP bağlantısı kurulamadı.'))
  })

  let sayac = 0
  const bekleyen = new Map()
  const olaylar = []
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    if (m.id && bekleyen.has(m.id)) {
      const { c, r } = bekleyen.get(m.id)
      bekleyen.delete(m.id)
      m.error ? r(new Error(JSON.stringify(m.error))) : c(m.result)
    } else if (m.method) {
      olaylar.push(m)
    }
  }
  const cagir = (method, params = {}, sessionId) =>
    new Promise((c, r) => {
      const id = ++sayac
      bekleyen.set(id, { c, r })
      ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
    })

  return { ws, cagir, olaylar }
}

/**
 * Tek bir gezinme turu.
 *
 * @param {'hareketli'|'az-hareket'} kip
 * @returns {Promise<string[]>} bulunan sorunlar (boşsa geçti)
 */
async function tur(wsAdresi, kip) {
  const { ws, cagir, olaylar } = await oturumAc(wsAdresi)
  const sorunlar = []

  const { targetId } = await cagir('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await cagir('Target.attachToTarget', { targetId, flatten: true })
  const S = (m, p) => cagir(m, p, sessionId)

  await S('Page.enable')
  await S('Runtime.enable')
  await S('Network.enable')

  const azHareket = kip === 'az-hareket'
  await S('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: azHareket ? 'reduce' : 'no-preference' }],
  })
  await S('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  })

  if (!azHareket) {
    // ⚠️ TESTİN EN KRİTİK SATIRI. Başlıktaki gerekçeyi okumadan silmeyin:
    // headless Chrome `(pointer: fine)` için false diyor ve hareket kodunun
    // TAMAMI atlanıyor. Bu yama olmadan test, kırılan yolu hiç denemeden
    // "geçti" der.
    await S('Page.addScriptToEvaluateOnNewDocument', {
      source: `(() => {
        const asil = window.matchMedia.bind(window);
        window.matchMedia = (q) =>
          (typeof q === 'string' && q.includes('pointer: fine'))
            ? asil('(min-width: 1px)')
            : asil(q);
      })()`,
    })
  }

  const deger = async (ifade) => {
    const r = await S('Runtime.evaluate', {
      expression: ifade,
      awaitPromise: true,
      returnByValue: true,
    })
    if (r.exceptionDetails) return null
    return r.result.value
  }

  const yakalananIstisnalar = () =>
    olaylar
      .filter((e) => e.method === 'Runtime.exceptionThrown')
      .map(
        (e) =>
          (
            e.params.exceptionDetails.exception?.description ?? e.params.exceptionDetails.text
          ).split('\n')[0],
      )

  await S('Page.navigate', { url: `${TABAN}/` })
  // Hareket kodu LCP'den SONRA iniyor; kapının üç kademesinin en yavaşı
  // 3 sn zaman aşımı. 6 sn, sabitlemenin kurulmuş olmasını garantiler.
  await uyu(6000)

  const acilis = yakalananIstisnalar()
  if (acilis.length > 0) sorunlar.push(`ana sayfa açılışında istisna: ${acilis[0]}`)
  olaylar.length = 0

  for (const rota of ROTALAR) {
    const hedef = await deger(`(() => {
      const a = [...document.querySelectorAll('a[href]')]
        .filter((x) => new URL(x.href, location.origin).pathname === ${JSON.stringify(rota)})
        .find((x) => {
          const r = x.getBoundingClientRect()
          return r.width > 0 && r.height > 0 && x.offsetParent !== null
        })
      if (!a) return null
      a.scrollIntoView({ block: 'center' })
      const r = a.getBoundingClientRect()
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
    })()`)

    if (!hedef) {
      sorunlar.push(`${rota}: menüde görünür bir bağlantı yok`)
      continue
    }

    // ⚠️ `a.click()` DEĞİL, gerçek fare olayları: üstteki katmanlar (cam
    // örtü, imleç ışığı, zoom kabı) tıklamayı yutuyorsa yalnızca böyle
    // görünür. Bu sınıf bir arıza 20 Ağustos'ta ilan kartlarında yaşandı.
    const fare = (type) =>
      S('Input.dispatchMouseEvent', {
        type,
        x: hedef.x,
        y: hedef.y,
        button: type === 'mouseMoved' ? 'none' : 'left',
        clickCount: type === 'mouseMoved' ? 0 : 1,
      })
    await fare('mouseMoved')
    await uyu(40)
    await fare('mousePressed')
    await uyu(50)
    await fare('mouseReleased')

    await uyu(4000)

    const adres = String((await deger('location.href')) ?? '')
    const baslik = String((await deger('document.title')) ?? '')
    const icerikVar = await deger(
      '!!document.querySelector("main") && document.body.innerText.trim().length > 200',
    )
    const istisnalar = yakalananIstisnalar()

    if (!adres.endsWith(rota)) sorunlar.push(`${rota}: adres değişmedi (${adres || 'boş'})`)
    if (!baslik) sorunlar.push(`${rota}: sayfa başlığı boş — React ağacı çökmüş olabilir`)
    if (!icerikVar) sorunlar.push(`${rota}: sayfa gövdesi boş`)
    if (istisnalar.length > 0) sorunlar.push(`${rota}: yakalanmamış istisna → ${istisnalar[0]}`)

    olaylar.length = 0

    // Sıradaki rota için ana sayfaya geri dön — arıza ANA SAYFADAN
    // ÇIKARKEN oluşuyordu, her rotayı oradan denemek şart.
    await S('Page.navigate', { url: `${TABAN}/` })
    await uyu(5000)
    olaylar.length = 0
  }

  await cagir('Target.closeTarget', { targetId })
  ws.close()
  return sorunlar
}

const { wsAdresi, kapat } = await tarayiciyaBaglan()
let hataliMi = false

try {
  for (const kip of ['hareketli', 'az-hareket']) {
    const etiket = kip === 'hareketli' ? 'hareket AÇIK' : 'az hareket'
    const sorunlar = await tur(wsAdresi, kip)
    if (sorunlar.length === 0) {
      console.log(`✓ ${etiket.padEnd(12)} — ${ROTALAR.length} rota, hepsi açıldı`)
    } else {
      hataliMi = true
      console.error(`✗ ${etiket.padEnd(12)} — ${sorunlar.length} sorun:`)
      for (const s of sorunlar) console.error(`    · ${s}`)
    }
  }
} finally {
  kapat()
}

if (hataliMi) {
  console.error(
    '\nUygulama içi gezinme kırık. Sunucu 200 dönüyor olabilir; sorun istemcide.\n' +
      'Bu betiğin başındaki nota bakın: geçmişte sebep, React ağacını arkasından\n' +
      'değiştiren bir hareket kütüphanesiydi.',
  )
  process.exit(1)
}

console.log('\nGezinme sağlam.')
