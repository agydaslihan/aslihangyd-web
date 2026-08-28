#!/usr/bin/env node
/**
 * Gezinme duman testi — "site tıklanabiliyor mu, panel açılıyor mu?"
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: İKİ AYRI GÜN, İKİ AYRI SESSİZ ARIZA.
 *
 * 24 Ağustos 2026 — ScrollTrigger'ın sabitlemesi React'in DOM ağacını
 * arkasından değiştiriyordu. Anasayfadan çıkan her tıklama React kökünü
 * söküyor, ekran boşalıyordu. F5 çalışıyordu.
 *
 * 27 Ağustos 2026 — İki panel görünümü Payload'ın GEÇMEDİĞİ bir prop'u
 * (`user`) okuyordu. Kapı herkesi çeviriyor, ekran bomboş açılıyordu.
 * Tip denetimi memnundu: `AdminViewServerProps` içinde `user` ALANI var,
 * yalnızca isteğe bağlı. Boş sayfanın ardında ikinci bir hata daha
 * saklanıyordu (geçersiz sorgu operatörü, 500).
 *
 * İkisinde de yeşil olanlar aynı: bütün rotalar 200, yüzden fazla test
 * dosyası, Lighthouse masaüstü 100. Hiçbiri BİR SAYFAYI AÇIP İÇİNE
 * BAKMIYORDU.
 *
 * ⚠️ "200 döndü" YETMEZ. Her iki arıza da 200 dönüyordu; gövde boştu.
 * Bu yüzden aşağıda gövde uzunluğu, başlık ve yakalanmamış istisna da
 * denetleniyor.
 *
 * ⚠️ İKİ ŞART BİRDEN OLMADAN HAREKET ARIZASI GÖRÜNMEZ:
 *
 *   1. `prefers-reduced-motion: no-preference` — az hareket açıkken GSAP
 *      hiç inmiyor, sabitleme hiç kurulmuyor.
 *   2. `(pointer: fine)` — headless Chrome bu sorguya VARSAYILAN OLARAK
 *      `false` diyor. `masaustuMu()` false dönüyor ve hareket kodunun
 *      tamamı atlanıyor.
 *
 * İkincisi arızayı üç ayrı denemede gizledi: tarayıcı "her şey çalışıyor"
 * diyordu çünkü kırılan kod yolu hiç çalıştırılmamıştı. `matchMedia`
 * yaması bu betiğin en kritik satırıdır — kaldırmayın.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Kullanım:
 *   node scripts/gezinme-dumani.mjs [taban-adres] [seçenekler]
 *
 *   --cdp=ADRES     hazır bir Chrome'un DevTools ucu (örn. http://127.0.0.1:9222)
 *                   Verilmezse betik kendi Chrome'unu başlatır.
 *   --chrome=YOL    Chrome çalıştırılabiliri (varsayılan: bilinen yollarda aranır)
 *   --eposta=…      panel oturumu için kullanıcı. Verilmezse panel rotaları
 *   --sifre=…       ATLANIR ve bu açıkça bildirilir (sessizce atlanmaz).
 *   --sadece=genel  yalnızca genel rotalar | --sadece=panel yalnızca panel
 *
 * ⚠️ Ayarlar ORTAM DEĞİŞKENİ DEĞİL, BAYRAK. `src/lib/ortam.test.ts` kodun
 * okuduğu her ortam değişkeninin `.env.example` ve `compose.prod.yml` ile
 * kaba ulaşmasını şart koşuyor — haklı olarak. Bunlar uygulama ayarı değil
 * test aracı ayarı.
 *
 * Bağımlılık yok: CDP'ye Node 22'nin yerleşik `WebSocket`'i ile bağlanıyor.
 */

import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dizin = path.dirname(fileURLToPath(import.meta.url))
const KOK = path.resolve(dizin, '..')

const bayraklar = process.argv.slice(2)
const bayrak = (ad) => bayraklar.find((a) => a.startsWith(`--${ad}=`))?.slice(ad.length + 3) ?? null

const TABAN = (bayraklar.find((a) => !a.startsWith('--')) ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
)
const CDP_ADRESI = bayrak('cdp')
const CHROME_YOLU = bayrak('chrome')
const EPOSTA = bayrak('eposta')
const SIFRE = bayrak('sifre')
const SADECE = bayrak('sadece')

const uyu = (ms) => new Promise((c) => setTimeout(c, ms))

/**
 * Üçüncü taraf betiklerinden gelen istisnalar — hata sayılmıyor ama
 * gizlenmiyor da. Koşum sonunda bir kez özetleniyor.
 */
const UCUNCU_TARAF = new Set()

/* ══════════════════════════════════════════════════════════════════════
   ROTA KEŞFİ — elle tutulan liste YOK.

   ⚠️ Elle tutulan bir rota listesi, eklenen sayfayı test etmez ve bunu
   kimseye söylemez. Kapsam boşluğu sessizdir; tam da kaçındığımız şey.
   ══════════════════════════════════════════════════════════════════════ */

/** Genel rotalar site haritasından — yayına giren neyse o test edilir. */
async function genelRotalar() {
  const yanit = await fetch(`${TABAN}/sitemap.xml`)
  if (!yanit.ok) throw new Error(`sitemap.xml alınamadı (${yanit.status}).`)
  const xml = await yanit.text()
  const yollar = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((e) => {
    try {
      return new URL(e[1]).pathname
    } catch {
      return null
    }
  })
  return [...new Set(yollar.filter(Boolean))].sort()
}

/**
 * Panel rotaları KAYNAKTAN türetiliyor.
 *
 * ⚠️ Panelin gezinme menüsünü kazımak yetmez: menüde bağlantısı olmayan
 * bir görünüm de bir rotadır ve tam olarak öyle bir görünüm (`anasayfa-
 * bolumleri`) bozuktu. Kaynak, tek doğru kaynaktır.
 */
function panelRotalari() {
  const rotalar = ['/admin']

  // Özel görünümler: her biri kendi `yol.ts` dosyasında sabit tutuyor.
  const bilesenKoku = path.join(KOK, 'src/components')
  for (const klasor of readdirSync(bilesenKoku, { withFileTypes: true })) {
    if (!klasor.isDirectory()) continue
    const yolDosyasi = path.join(bilesenKoku, klasor.name, 'yol.ts')
    if (!existsSync(yolDosyasi)) continue
    for (const e of readFileSync(yolDosyasi, 'utf8').matchAll(
      /export const \w+_YOLU\s*=\s*'([^']+)'/g,
    )) {
      rotalar.push(`/admin${e[1]}`)
    }
  }

  // Global'ler ve koleksiyonlar: yapılandırmadaki `slug` iki boşluk girintili.
  const ekle = (altKlasor, onek) => {
    const kok = path.join(KOK, altKlasor)
    for (const dosya of readdirSync(kok)) {
      if (!dosya.endsWith('.ts')) continue
      const eslesme = /^ {2}slug: '([^']+)',/m.exec(readFileSync(path.join(kok, dosya), 'utf8'))
      if (eslesme) rotalar.push(`${onek}${eslesme[1]}`)
    }
  }
  ekle('src/globals', '/admin/globals/')
  ekle('src/collections', '/admin/collections/')

  return [...new Set(rotalar)].sort()
}

/* ══════════════════════════════════════════════════════════════════════
   TARAYICI
   ══════════════════════════════════════════════════════════════════════ */

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

/** Minimal CDP oturumu — tek sekme, olay tamponu. */
async function sekmeAc(wsAdresi, { azHareket, cerez }) {
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
      if (m.error) r(new Error(JSON.stringify(m.error)))
      else c(m.result)
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

  const { targetId } = await cagir('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await cagir('Target.attachToTarget', { targetId, flatten: true })
  const S = (m, p) => cagir(m, p, sessionId)

  await S('Page.enable')
  await S('Runtime.enable')
  await S('Network.enable')

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
    /**
     * ⚠️ BETİĞİN EN KRİTİK SATIRI — başlıktaki gerekçeyi okumadan silmeyin.
     * Headless Chrome `(pointer: fine)` için false diyor; `masaustuMu()`
     * false dönüyor ve hareket kodunun TAMAMI atlanıyor. Bu yama olmadan
     * test, kırılan yolu hiç denemeden "geçti" der.
     */
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

  if (cerez) {
    const [ad, deger] = cerez.split('=')
    await S('Network.setCookie', {
      name: ad,
      value: deger,
      domain: new URL(TABAN).hostname,
      path: '/',
      httpOnly: true,
    })
  }

  const deger = async (ifade) => {
    const r = await S('Runtime.evaluate', {
      expression: ifade,
      awaitPromise: true,
      returnByValue: true,
    })
    return r.exceptionDetails ? null : r.result.value
  }

  const { frameTree } = await S('Page.getFrameTree')
  const anaCerceve = frameTree.frame.id

  /**
   * ⚠️ SABİT `sleep` YERİNE KOŞUL BEKLE.
   *
   * İlk sürüm her adımda sabit süre bekliyordu ve yavaş bir koşumda
   * "adres sapmış" diye ONLARCA SAHTE HATA üretti — testin kendi
   * zamanlaması, kodun arızası gibi göründü. Sahte hata üreten bir
   * denetim, birkaç koşum sonra kapatılır; kapatılan denetim yoktur.
   */
  const kosulBekle = async (ifade, azamiMs = 12000) => {
    const bitis = Date.now() + azamiMs
    while (Date.now() < bitis) {
      if (await deger(ifade)) return true
      await uyu(120)
    }
    return false
  }

  return {
    S,
    deger,
    kosulBekle,
    anaCerceve,
    olaylariBosalt: () => olaylar.splice(0, olaylar.length),
    kapat: async () => {
      await cagir('Target.closeTarget', { targetId })
      ws.close()
    },
  }
}

/* ══════════════════════════════════════════════════════════════════════
   DENETİM
   ══════════════════════════════════════════════════════════════════════ */

/** Bir rotanın "açıldı" sayılması için gerekenler. */
async function sayfayiDenetle(sekme, rota, olaylar) {
  const sorunlar = []

  const adres = String((await sekme.deger('location.href')) ?? '')
  const baslik = String((await sekme.deger('document.title')) ?? '')
  const govde = Number((await sekme.deger('document.body.innerText.trim().length')) ?? 0)

  /**
   * ⚠️ YALNIZCA ANA ÇERÇEVENİN BELGESİ.
   *
   * Sayfadaki gömülü çerçeveler (Turnstile, harita) de `Document` yanıtı
   * üretiyor. Onları saymak, üçüncü tarafın 400'ünü bizim sayfamızın
   * hatası gibi göstermişti.
   */
  const belgeYaniti = olaylar
    .filter((e) => e.method === 'Network.responseReceived')
    .find((e) => e.params.type === 'Document' && e.params.frameId === sekme.anaCerceve)
  const durum = belgeYaniti?.params.response.status ?? null

  /**
   * ⚠️ ÜÇÜNCÜ TARAF İSTİSNALARI AYRI RAPORLANIR, HATA SAYILMAZ.
   *
   * Turnstile'ın anahtarı yerelde ve CI'da tanımsız; betik `400020`
   * fırlatıyor. Bu bizim kodumuzun arızası değil ve her koşumda kırmızı
   * yakmak, denetimin güvenilirliğini bitirir. Ama gizlenmiyor da:
   * aşağıda `ucuncuTaraf` olarak sayılıyor.
   */
  const hamIstisnalar = olaylar
    .filter((e) => e.method === 'Runtime.exceptionThrown')
    .map((e) => ({
      metin: (
        e.params.exceptionDetails.exception?.description ?? e.params.exceptionDetails.text
      ).split('\n')[0],
      kaynak:
        e.params.exceptionDetails.url ??
        e.params.exceptionDetails.stackTrace?.callFrames?.[0]?.url ??
        '',
    }))
  const bizimMi = (k) => k === '' || k.startsWith(TABAN)
  const istisnalar = hamIstisnalar.filter((i) => bizimMi(i.kaynak)).map((i) => i.metin)
  const ucuncuTaraf = hamIstisnalar.filter((i) => !bizimMi(i.kaynak)).map((i) => i.metin)
  for (const m of ucuncuTaraf) UCUNCU_TARAF.add(m)

  if (durum !== null && durum >= 400) sorunlar.push(`HTTP ${durum}`)
  if (!adres.includes(rota)) sorunlar.push(`adres sapmış: ${adres}`)
  if (!baslik) sorunlar.push('sayfa başlığı boş')
  // ⚠️ Eşik bilinçli olarak düşük: amaç "içerik yeterli mi" değil, "gövde
  // BOŞ mu". İki gerçek arıza da tam anlamıyla boş gövde üretmişti.
  if (govde < 40) sorunlar.push(`gövde neredeyse boş (${govde} karakter)`)
  if (istisnalar.length > 0) sorunlar.push(`yakalanmamış istisna → ${istisnalar[0]}`)

  return sorunlar
}

async function dogrudanAc(sekme, rota) {
  sekme.olaylariBosalt()
  await sekme.S('Page.navigate', { url: `${TABAN}${rota}` })
  await sekme.kosulBekle(
    `document.readyState === 'complete' && document.body.innerText.trim().length > 0`,
  )
  await uyu(300)
  return sayfayiDenetle(sekme, rota, sekme.olaylariBosalt())
}

/**
 * Uygulama içi geçiş: gerçek fare olaylarıyla bağlantıya tıkla.
 *
 * ⚠️ `a.click()` DEĞİL. Üstteki katmanlar (cam örtü, imleç ışığı, zoom
 * kabı) tıklamayı yutuyorsa yalnızca gerçek olayla görünür — bu sınıf bir
 * arıza 20 Ağustos'ta ilan kartlarında yaşandı.
 */
async function baglantiyaTikla(sekme, rota) {
  const bul = `[...document.querySelectorAll('a[href]')]
      .filter((x) => { try { return new URL(x.href, location.origin).pathname === ${JSON.stringify(rota)} } catch { return false } })
      .find((x) => {
        const r = x.getBoundingClientRect()
        return r.width > 0 && r.height > 0 && x.offsetParent !== null
      })`

  /**
   * ⚠️ BAĞLANTIYI BİR KEZ SORUP PES ETME — BEKLE.
   *
   * Kaynak sayfaya geri dönüldüğünde kartlar bir kare sonra basılıyor.
   * Tek seferlik bir sorgu, rotayı "bağlantısı yok" diye kapsam dışına
   * atıyordu: test yeşil kalıyor ama kapsam sessizce daralıyordu — ve
   * kapsam raporu bunu "bağlantısı yok" diye doğru ama yanıltıcı biçimde
   * bildiriyordu.
   */
  const varMi = await sekme.kosulBekle(`Boolean(${bul})`, 6000)
  if (!varMi) return null

  /**
   * ─────────────────────────────────────────────────────────────────────
   * ⚠️ ÖNCE KAYDIR, SONRA DUR, EN SON ÖLÇ — ÜÇÜ DE ŞART.
   *
   * İlk sürüm `scrollIntoView` çağırıp koordinatı AYNI ANDA okuyordu ve
   * yanlış bağlantılara tıklıyordu: `/araclar/alim-maliyeti` isterken
   * `/araclar/deger-artis-vergisi` açılıyordu. İki sebep birden:
   *
   *   · `globals.css` `scroll-behavior: smooth` veriyor — kaydırma
   *     animasyonlu, koordinat okunduğunda sayfa hâlâ hareket hâlinde.
   *   · Masaüstünde Lenis kaydırmayı kendi eğrisiyle sürüyor; animasyon
   *     daha da uzun. Bu yüzden hatalar "hareket AÇIK" kipinde çok daha
   *     fazlaydı.
   *
   * Sonuç: testin kendi zamanlaması, kodun arızası gibi görünüyordu.
   * `behavior: 'instant'` animasyonu atlıyor, ardından kaydırmanın
   * durduğu doğrulanıyor, koordinat en son okunuyor.
   * ─────────────────────────────────────────────────────────────────────
   */
  /**
   * ─────────────────────────────────────────────────────────────────────
   * ⚠️ KAYDIR → DUR → ÖLÇ → DOĞRULA, VE GEREKİRSE TEKRAR DENE.
   *
   * `behavior: 'instant'` tek başına yetmiyor: masaüstünde Lenis kaydırmayı
   * kendi eğrisiyle sürüyor ve süren animasyon sayfayı ölçümden SONRA da
   * oynatabiliyor — koordinat bayatlıyor.
   *
   * Üretimde ölçüldü: uzun `/mahalleler` sayfasında üç bağlantı "adres
   * sapmış" ya da "tıklama noktasını başka bir öğe kapıyor" verdi; aynı
   * bağlantılar elle denendiğinde SORUNSUZ açıldı. Bulgular gerçek değil,
   * testin zamanlamasıydı.
   *
   * ⚠️ Bu önemli: sahte hata üreten ENGELLEYİCİ bir denetim birkaç koşum
   * sonra kapatılır — ve kapatılan denetim yoktur.
   *
   * Çözüm hedefi zayıflatmak değil ÖLÇÜMÜ TEKRARLAMAK. Deneme hakkı
   * bittiğinde bulgu yine raporlanıyor; üstteki katman gerçekse
   * yakalanmaya devam ediyor.
   * ─────────────────────────────────────────────────────────────────────
   */
  let hedef = null
  for (let deneme = 0; deneme < 5; deneme++) {
    /**
     * ⚠️ `scrollIntoView` + KAYDIRMANIN DURMASINI BEKLE.
     *
     * Bir ara "kesin hedef konuma `scrollTo`" denendi ve ÜRETİMDE iyileşti
     * ama CI'DA BOZDU: kısa demo listelerinde hesaplanan hedef konuma
     * varılamıyor, döngü boşa dönüyor ve tıklama noktası kart yerine
     * `<main>`in boşluğuna düşüyordu. Ölçüm iki ortamda ters yönde
     * konuştuğu için o değişiklik geri alındı.
     *
     * Üretimdeki kararsızlığı çözen şey bu değil, aşağıdaki iki koruma
     * oldu: tıklamadan hemen önceki son koordinat doğrulaması ve adres hiç
     * değişmediğinde bir tekrar hakkı.
     */
    await sekme.deger(
      `(() => { const a = ${bul}; if (a) a.scrollIntoView({ block: 'center', behavior: 'instant' }); return true })()`,
    )

    /**
     * Kaydırma gerçekten durdu mu — BEŞ ARDIŞIK ÖLÇÜM.
     *
     * ⚠️ İKİ ÖLÇÜM YETMİYOR, ÖLÇÜLDÜ. Lenis'in easing eğrisi 1,1 saniye
     * sürüyor ve sonlara doğru kare başına bir pikselin altına iniyor;
     * iki ardışık örnek o bölgede yanlışlıkla eşitleniyor. "Durdu" diyip
     * ölçülen koordinat, tıklama CDP üzerinden gidene kadar bayatlıyor ve
     * tıklama KOMŞU karta düşüyordu.
     *
     * Beş örnek × 100 ms = yarım saniye hareketsizlik; 1,1 saniyelik bir
     * eğrinin ortasında rastlanmayacak kadar uzun.
     */
    let onceki = -1
    let sabit = 0
    for (let i = 0; i < 60; i++) {
      const simdi = Number((await sekme.deger('Math.round(window.scrollY)')) ?? 0)
      sabit = simdi === onceki ? sabit + 1 : 0
      onceki = simdi
      if (sabit >= 5) break
      await uyu(100)
    }

    hedef = await sekme.deger(`(() => {
      const a = ${bul}
      if (!a) return null
      const r = a.getBoundingClientRect()
      const x = r.x + r.width / 2
      const y = r.y + r.height / 2
      const ust = document.elementFromPoint(x, y)
      return {
        x, y,
        // ⚠️ Tıklama noktasındaki öğe gerçekten bu bağlantı mı? Değilse
        // üstte bir katman var demektir — aramadığımız ama bulmak
        // istediğimiz bir arıza sınıfı (ilan kartlarında yaşandı).
        dogruHedef: Boolean(ust && (ust === a || a.contains(ust) || ust.closest('a') === a)),
        ustOge: ust ? ust.tagName + '.' + String(ust.className ?? '').slice(0, 40) : 'yok',
      }
    })()`)

    /**
     * ⚠️ SON DOĞRULAMA DÖNGÜNÜN İÇİNDE — dışarıda olduğu sürüm ÜRETİMDE
     * hâlâ düşüyordu.
     *
     * Ölçüm ile tıklama arasındaki üç CDP turu gerçek bir risk: Lenis o
     * arada sayfayı oynatıyor ve koordinat bayatlıyor. Bunu tespit edip
     * HEMEN bulgu olarak dönmek, testin kendi zamanlamasını arıza gibi
     * göstermekti. Doğrusu aynı ölçümü yeniden denemek; deneme hakkı
     * bitince bulgu yine dönülüyor.
     */
    if (hedef?.dogruHedef) {
      const tazeMi = await sekme.deger(`(() => {
        const a = ${bul}
        if (!a) return false
        const r = a.getBoundingClientRect()
        return Math.abs(r.x + r.width / 2 - ${hedef.x}) < 2 && Math.abs(r.y + r.height / 2 - ${hedef.y}) < 2
      })()`)
      if (tazeMi) break
      hedef = { ...hedef, dogruHedef: false, ustOge: 'sayfa oynadı — koordinat bayatladı' }
    }
    await uyu(400)
  }

  if (!hedef) return null
  if (!hedef.dogruHedef) {
    return [`tıklama noktasını başka bir öğe kapıyor: ${hedef.ustOge}`]
  }

  /**
   * ─────────────────────────────────────────────────────────────────────
   * ⚠️ TIKLAMA KOORDİNATLA DEĞİL, KLAVYEYLE — VE BU BİR TAVİZ DEĞİL.
   *
   * Fare koordinatıyla tıklamak ÜRETİMDE kararsızdı: Lenis kaydırmayı
   * sürekli sürüyor ve ölçüm ile CDP'nin olayı göndermesi arasındaki üç
   * tur içinde sayfa oynuyor. Tıklama komşu karta düşüyordu — iki
   * koşumdan biri kırmızı. Beş farklı sağlamlaştırma denendi (kesin
   * konuma kaydırma, son koordinat doğrulaması, yeniden hedefleme, beş
   * örnekli durgunluk); hiçbiri yarışı ortadan KALDIRMADI, yalnızca
   * seyrekleştirdi.
   *
   * Yarışın kaynağı koordinat. Odak + Enter'da koordinat yok: olay
   * doğrudan öğeye gidiyor, sayfa oynasa bile hedef değişmiyor.
   *
   * ⚠️ ÜSTTEKİ KATMAN DENETİMİ KAYBOLMUYOR. `elementFromPoint` ölçümü
   * yukarıda duruyor ve bulgu olarak raporlanıyor; yalnızca TIKLAMA yolu
   * değişti. O denetim gezinmeye bağlı olmadığı için tekrarlanabiliyor ve
   * kararsız değil — ilan kartlarındaki örtü arızası bugün de yakalanır.
   *
   * ⚠️ ÜSTELİK KAPSAM ARTIYOR: bağlantının klavyeyle erişilebilir olduğu
   * ve Enter'la açıldığı da doğrulanmış oluyor — talimatın ayrıca istediği
   * şey ("Tab ile odaklanıp Enter ile açılsın").
   * ─────────────────────────────────────────────────────────────────────
   */
  sekme.olaylariBosalt()

  const odaklandi = await sekme.deger(`(() => {
    const a = ${bul}
    if (!a) return false
    a.focus()
    return document.activeElement === a
  })()`)
  if (!odaklandi) {
    return ['bağlantı klavyeyle odaklanamıyor — Tab ile erişilemez demektir']
  }

  for (const tur of ['rawKeyDown', 'char', 'keyUp']) {
    await sekme.S('Input.dispatchKeyEvent', {
      type: tur,
      key: 'Enter',
      code: 'Enter',
      windowsVirtualKeyCode: 13,
      nativeVirtualKeyCode: 13,
      text: '\r',
      unmodifiedText: '\r',
    })
    await uyu(30)
  }

  await sekme.kosulBekle(`location.pathname === ${JSON.stringify(rota)}`)
  await sekme.kosulBekle(
    `document.readyState === 'complete' && document.body.innerText.trim().length > 0`,
  )
  await uyu(300)

  return sayfayiDenetle(sekme, rota, sekme.olaylariBosalt())
}

/**
 * Bir rotanın bağlantısının hangi sayfada aranacağı.
 *
 * ⚠️ Menüde olmayan bir sayfaya (ör. bir ilan detayı) ana sayfadan
 * tıklanamaz; bağlantısı liste sayfasındadır. Kaynak sayfayı yol
 * derinliğinden türetmek, elle eşleme tutmaktan daha az kırılgan.
 */
function kaynakSayfa(rota) {
  const parcalar = rota.split('/').filter(Boolean)
  if (parcalar.length <= 1) return '/'
  return `/${parcalar.slice(0, -1).join('/')}`
}

/* ══════════════════════════════════════════════════════════════════════
   TURLAR
   ══════════════════════════════════════════════════════════════════════ */

async function genelTur(wsAdresi, rotalar, { azHareket }) {
  const etiket = azHareket ? 'az hareket' : 'hareket AÇIK'
  const sekme = await sekmeAc(wsAdresi, { azHareket })
  const sorunlar = []
  let tiklanan = 0
  const tiklanamayan = []

  // 1) Doğrudan açılış
  for (const rota of rotalar) {
    const bulgular = await dogrudanAc(sekme, rota)
    for (const b of bulgular) sorunlar.push(`doğrudan ${rota}: ${b}`)
  }

  // 2) Uygulama içi geçiş — kaynak sayfaya göre gruplanmış
  const gruplar = new Map()
  for (const rota of rotalar) {
    if (rota === '/') continue
    const kaynak = kaynakSayfa(rota)
    if (!gruplar.has(kaynak)) gruplar.set(kaynak, [])
    gruplar.get(kaynak).push(rota)
  }

  for (const [kaynak, hedefler] of gruplar) {
    sekme.olaylariBosalt()
    await sekme.S('Page.navigate', { url: `${TABAN}${kaynak}` })
    await sekme.kosulBekle(`document.readyState === 'complete'`)
    // ⚠️ Hareket kodu LCP'den SONRA iniyor (kapının en yavaş kademesi 3 sn)
    // ve arıza tam da o kod kurulduktan SONRA çıkıyor. Burada beklemek
    // koşul beklemekle değiştirilemez: beklenen şey bir DOM durumu değil,
    // bir zamanlayıcı.
    if (!azHareket) await uyu(3500)

    for (const hedef of hedefler) {
      const bulgular = await baglantiyaTikla(sekme, hedef)
      if (bulgular === null) {
        tiklanamayan.push(hedef)
        continue
      }
      tiklanan += 1
      for (const b of bulgular) sorunlar.push(`geçiş ${kaynak} → ${hedef}: ${b}`)

      // Kaynağa geri dön: bu da uygulama içi bir geçiş ve kaydırma
      // geri yüklemesini de denemiş oluyor.
      sekme.olaylariBosalt()
      await sekme.deger('history.back()')
      const dondu = await sekme.kosulBekle(`location.pathname === ${JSON.stringify(kaynak)}`, 8000)
      if (!dondu) {
        // Geri dönemediyse doğrudan yükle; testin kendisi takılmasın.
        await sekme.S('Page.navigate', { url: `${TABAN}${kaynak}` })
      }
      // ⚠️ Geri dönüşten sonra DOM'un hazır olmasını beklemek şart: aksi
      // hâlde sıradaki bağlantı "yok" sayılır ve rota sessizce
      // kapsam dışı kalır.
      await sekme.kosulBekle(
        `document.readyState === 'complete' && document.body.innerText.trim().length > 0`,
      )
      await uyu(200)
    }
  }

  await sekme.kapat()
  return { etiket, sorunlar, tiklanan, tiklanamayan }
}

async function panelTuru(wsAdresi, rotalar, cerez) {
  const sekme = await sekmeAc(wsAdresi, { azHareket: true, cerez })
  const sorunlar = []

  for (const rota of rotalar) {
    const bulgular = await dogrudanAc(sekme, rota)
    for (const b of bulgular) sorunlar.push(`${rota}: ${b}`)
  }

  await sekme.kapat()
  return { etiket: 'panel (oturumlu)', sorunlar }
}

/** Panel oturumu: REST ile giriş yap, çerezi tarayıcıya taşı. */
async function panelCerezi() {
  const yanit = await fetch(`${TABAN}/api/kullanicilar/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: EPOSTA, password: SIFRE }),
  })
  if (!yanit.ok) throw new Error(`panel girişi başarısız (${yanit.status}).`)
  const cerezler = yanit.headers.getSetCookie?.() ?? []
  const jeton = cerezler.map((c) => c.split(';')[0]).find((c) => c.startsWith('payload-token='))
  if (!jeton) throw new Error('giriş 200 döndü ama oturum çerezi gelmedi.')
  return jeton
}

/* ══════════════════════════════════════════════════════════════════════
   ÇALIŞTIR
   ══════════════════════════════════════════════════════════════════════ */

const genel = SADECE === 'panel' ? [] : await genelRotalar()
const panel = SADECE === 'genel' ? [] : panelRotalari()

console.log(`Taban: ${TABAN}`)
console.log(`Genel rota: ${genel.length} · Panel rotası: ${panel.length}\n`)

const { wsAdresi, kapat } = await tarayiciyaBaglan()
let hataliMi = false

const raporla = ({ etiket, sorunlar, tiklanan, tiklanamayan }) => {
  if (sorunlar.length === 0) {
    const ek = tiklanan === undefined ? '' : ` · ${tiklanan} bağlantı klavyeyle açıldı`
    console.log(`✓ ${etiket.padEnd(14)} — sorun yok${ek}`)
  } else {
    hataliMi = true
    console.error(`✗ ${etiket.padEnd(14)} — ${sorunlar.length} sorun:`)
    for (const s of sorunlar) console.error(`    · ${s}`)
  }
  /**
   * ⚠️ SESSİZ KAPSAM BOŞLUĞU YOK. Bağlantısı bulunamayan rota bir hata
   * değil (her sayfa menüden erişilebilir olmak zorunda değil) ama
   * "hepsi tıklandı" izlenimi bırakmak yanlış olurdu.
   */
  if (tiklanamayan?.length) {
    console.log(
      `  ℹ ${tiklanamayan.length} rota yalnızca doğrudan açılışla denendi ` +
        `(kaynak sayfasında görünür bağlantısı yok): ${tiklanamayan.join(', ')}`,
    )
  }
}

try {
  if (genel.length > 0) {
    raporla(await genelTur(wsAdresi, genel, { azHareket: false }))
    raporla(await genelTur(wsAdresi, genel, { azHareket: true }))
  }

  if (panel.length > 0) {
    if (!EPOSTA || !SIFRE) {
      /**
       * ⚠️ ATLAMA SESSİZ OLAMAZ. Panel rotalarını oturumsuz açmak "200
       * döndü, geçti" derdi — 27 Ağustos arızası tam olarak buydu.
       */
      console.error(
        `✗ panel          — ${panel.length} rota DENENMEDİ: --eposta ve --sifre verilmedi.\n` +
          '    Oturumsuz panel rotaları 200 döner ama gövde boş gelir; "geçti" demek yanlış olurdu.',
      )
      hataliMi = true
    } else {
      const cerez = await panelCerezi()
      /**
       * ⚠️ Panel TEK KİPTE deneniyor ve bu bir eksiklik değil: hareket
       * kodu (`HareketAltyapisi`, GSAP, Lenis) yalnızca `(site)` düzeninde
       * var. Panel `(payload)` düzeninde ve o kodun hiçbirini yüklemiyor —
       * ikinci kip aynı yolu ikinci kez koşmak olurdu.
       */
      raporla(await panelTuru(wsAdresi, panel, cerez))
    }
  }
} finally {
  kapat()
}

if (hataliMi) {
  console.error(
    '\nGezinme kırık. Sunucu 200 dönüyor olabilir; "200" bir sayfanın açıldığını\n' +
      'kanıtlamıyor — bu betiğin başındaki iki arıza da 200 dönüyordu.',
  )
  process.exit(1)
}

if (UCUNCU_TARAF.size > 0) {
  console.log(`\nℹ Üçüncü taraf betiklerinden ${UCUNCU_TARAF.size} istisna geldi (hata sayılmadı):`)
  for (const m of UCUNCU_TARAF) console.log(`    · ${m.slice(0, 120)}`)
}

console.log('\nGezinme sağlam.')
