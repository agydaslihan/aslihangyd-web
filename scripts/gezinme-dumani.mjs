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
 *   --sadece=davranis  yalnızca panel davranışı (form, sayaç, rozet, kontrast)
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

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  VİTRİN ÇAĞRI BUTONLARI — İLK EKRAN, KAYDIRMASIZ
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ⚠️ NEDEN AYRI BİR DENETİM: DİĞER HER ŞEY BU ARIZAYI YEŞİL GEÇİRDİ.
 *
 * 31 Ağustos 2026: ana sayfanın iki çağrı butonu ("Portföyü incele",
 * "Ücretsiz değerleme") tıklanmıyordu. Çerez onay bandı tam genişlikte bir
 * sarmalayıcıydı (`inset-x-0`) ama görünen kartı ortada ve 48rem idi;
 * aradaki şeffaf alan hiçbir şey çizmeden her tıklamayı yutuyordu.
 * Ölçüldüğünde bant y=649–885, butonlar y=666–718 aralığındaydı.
 *
 * Mevcut denetimlerin hiçbiri görmedi:
 *   · rota 200 dönüyordu,
 *   · `baglantiyaTikla` bağlantıyı önce görünür alana KAYDIRIYOR — kaydırma
 *     butonu bandın dışına çıkarıyor ve tıklama başarılı oluyor,
 *   · Lighthouse ve birim testleri DOM yığılmasına bakmıyor.
 *
 * Bu yüzden buradaki denetim bilerek KAYDIRMIYOR: ziyaretçi sayfayı açtığı
 * anda gördüğü iki butona tıklıyor. Kullanıcının yaptığı da bu.
 *
 * ⚠️ ÇEREZ ÇEREZİ TEMİZLENİYOR — EN KÖTÜ DURUM ÖLÇÜLMELİ. Onay verilmiş bir
 * tarayıcıda bant hiç çizilmiyor ve denetim hiçbir şey kanıtlamıyor.
 */
async function vitrinKontrolu(sekme) {
  const sorunlar = []

  // İlk ziyaret koşulları: onay yok, yani bant açık.
  await sekme.S('Network.clearBrowserCookies')
  await sekme.S('Page.navigate', { url: `${TABAN}/` })
  await sekme.kosulBekle(`document.readyState === 'complete'`)
  // Hareket kodu LCP'den sonra iniyor; bant yüksekliği de o sırada ölçülüyor.
  await uyu(3500)

  const hedefler = await sekme.deger(`(() => {
    const vitrin = document.querySelector('main section') ?? document.querySelector('section')
    if (!vitrin) return null
    return [...vitrin.querySelectorAll('a[href]')].map((el) => {
      const k = el.getBoundingClientRect()
      if (k.width === 0 || k.height === 0) return null
      const mx = Math.round(k.left + k.width / 2)
      const my = Math.round(k.top + k.height / 2)
      // Görünür alanın dışındaysa bu denetimin konusu değil.
      if (my < 0 || my > window.innerHeight) return null
      const ust = document.elementFromPoint(mx, my)
      const ad = (n) => n ? n.tagName.toLowerCase() + (typeof n.className === 'string' && n.className ? '.' + n.className.trim().split(/\s+/)[0] : '') : 'yok'
      return {
        yol: new URL(el.href, location.origin).pathname,
        metin: (el.textContent || '').trim().slice(0, 30),
        merkez: [mx, my],
        kendisiMi: ust === el || el.contains(ust),
        ustteki: ad(ust),
      }
    }).filter(Boolean)
  })()`)

  if (!Array.isArray(hedefler) || hedefler.length === 0) {
    sorunlar.push('vitrinde görünür çağrı butonu bulunamadı')
    return sorunlar
  }

  for (const hedef of hedefler) {
    if (!hedef.kendisiMi) {
      sorunlar.push(
        `vitrin "${hedef.metin}" (${hedef.yol}) ilk ekranda tıklanamıyor — ` +
          `${hedef.merkez.join(',')} noktasında üstte ${hedef.ustteki} var`,
      )
      continue
    }

    // Üstte olmak yetmez: gerçekten gezindiğini de görelim.
    await sekme.S('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: hedef.merkez[0],
      y: hedef.merkez[1],
      button: 'left',
      buttons: 1,
      clickCount: 1,
    })
    await sekme.S('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: hedef.merkez[0],
      y: hedef.merkez[1],
      button: 'left',
      buttons: 0,
      clickCount: 1,
    })
    const gitti = await sekme.kosulBekle(`location.pathname === ${JSON.stringify(hedef.yol)}`, 8000)
    if (!gitti) {
      const nerede = await sekme.deger('location.pathname')
      sorunlar.push(`vitrin "${hedef.metin}" tıklandı ama ${hedef.yol} açılmadı (adres: ${nerede})`)
    }

    await sekme.S('Page.navigate', { url: `${TABAN}/` })
    await sekme.kosulBekle(`document.readyState === 'complete'`)
    await uyu(3500)
  }

  return sorunlar
}

async function genelTur(wsAdresi, rotalar, { azHareket }) {
  const etiket = azHareket ? 'az hareket' : 'hareket AÇIK'
  const sekme = await sekmeAc(wsAdresi, { azHareket })
  const sorunlar = []
  let tiklanan = 0
  const tiklanamayan = []

  // 0) Vitrinin çağrı butonları — ilk ekran, kaydırmasız
  for (const b of await vitrinKontrolu(sekme)) sorunlar.push(b)

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

/* ══════════════════════════════════════════════════════════════════════
   PANEL DAVRANIŞI — form, EİDS sayacı, rozet, çizilen kontrast
   ══════════════════════════════════════════════════════════════════════ */

/**
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: "SAYFA AÇILDI" BİR FORMUN ÇALIŞTIĞINI KANITLAMIYOR.
 *
 * 14 Eylül 2026'da panelin koordinat alanı yazılanı SİLİYORDU: yeni ilanda
 * enlem yazıp boylama geçince enlem boşalıyor, kayıtlı ilanda "41." yazmak
 * iki kutuyu birden temizliyordu. Bütün panel rotaları bu betikte 200 ve
 * dolu gövdeyle geçiyordu; hiçbir denetim bir kutuya YAZMIYORDU.
 *
 * Aynı gün sayaç "0’si" yazıyordu ve ilerleme çubuğunun dolgusu izinden
 * ayırt edilemiyordu (2,7:1). Kontrast testi jetonları hesaplıyor; çizilen
 * hâli (tema değişkeni + gerçek zemin) hiçbir şey ölçmüyordu.
 *
 * Bu tur üçünü de gerçek tarayıcıda, iki temada ölçüyor. Kalıcı: CI'da her
 * PR'da koşuyor ve kayıt bırakıyor.
 *
 * ⚠️ Yazma GERÇEK KLAVYE OLAYIYLA (`Input.insertText`, `Tab`). Değeri
 * `input.value = …` ile basmak React'in olay yolunu atlar ve silme hatası
 * tam da o yolda yaşanıyordu.
 *
 * ⚠️ Deneme kaydı `DUMAN-DAVRANIS` önekiyle REST'ten açılıyor ve `finally`
 * içinde siliniyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

const DAVRANIS_ONEKI = 'DUMAN-DAVRANIS'

/**
 * Tarayıcı içinde kontrast ölçer. Renk biçimi ne olursa olsun (rgb, oklch,
 * color-mix) kanvasa boyanıp sRGB olarak geri okunuyor; zemin, ata zinciri
 * boyunca yarı saydam katmanlar üst üste bindirilerek bulunuyor.
 */
const KONTRAST_OLCER = `(() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1
  const cx = cv.getContext('2d', { willReadFrequently: true })
  const rgba = (renk) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = renk; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255] }
  const saydam = (renk) => renk === 'transparent' || /rgba\\([^)]*,\\s*0\\)$/.test(renk)
  const parlaklik = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
  const oran = (a, b) => { const [x, y] = [parlaklik(a), parlaklik(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
  const zemin = (el) => {
    const katman = []
    for (let e = el; e; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor; if (!saydam(b)) { const c = rgba(b); katman.push(c); if (c[3] >= 1) break } }
    katman.push([255, 255, 255, 1])
    let [r, g, b] = katman[katman.length - 1]
    for (let i = katman.length - 2; i >= 0; i--) { const [kr, kg, kb, ka] = katman[i]; r = kr * ka + r * (1 - ka); g = kg * ka + g * (1 - ka); b = kb * ka + b * (1 - ka) }
    return [r, g, b]
  }
  const yuvarla = (x) => Math.round(x * 100) / 100
  return {
    metin: (secici) => {
      const el = document.querySelector(secici)
      if (!el) return null
      const st = getComputedStyle(el)
      const px = parseFloat(st.fontSize)
      const buyuk = px >= 24 || (Number(st.fontWeight) >= 700 && px >= 18.66)
      return { oran: yuvarla(oran(rgba(st.color), zemin(el))), esik: buyuk ? 3 : 4.5 }
    },
    cubuk: (secici) => {
      const iz = document.querySelector(secici)
      const dolgu = iz?.firstElementChild
      if (!iz || !dolgu) return null
      const izRengi = rgba(getComputedStyle(iz).backgroundColor)
      return {
        dolguIz: yuvarla(oran(rgba(getComputedStyle(dolgu).backgroundColor), izRengi)),
        cerceveZemin: yuvarla(oran(rgba(getComputedStyle(iz).borderTopColor), zemin(iz.parentElement))),
      }
    },
  }
})()`

async function davranisTuru(wsAdresi, cerez) {
  const sorunlar = []
  const bilgi = []
  const api = async (yol, yontem = 'GET', govde) => {
    const yanit = await fetch(`${TABAN}${yol}`, {
      method: yontem,
      headers: { 'content-type': 'application/json', cookie: cerez },
      body: govde === undefined ? undefined : JSON.stringify(govde),
    })
    return { durum: yanit.status, veri: await yanit.json().catch(() => null) }
  }

  const sekmeyleCalis = async (is) => {
    const sekme = await sekmeAc(wsAdresi, { azHareket: true, cerez })
    try {
      return await is(sekme)
    } finally {
      await sekme.kapat()
    }
  }
  const git = async (sekme, rota, kosul) => {
    await sekme.S('Page.navigate', { url: `${TABAN}${rota}` })
    return sekme.kosulBekle(kosul, 20000)
  }

  /** Gerçek klavye: odakla, içeriği seç, metni tuş olayı olarak yaz. */
  const klavyeyleYaz = async (sekme, secici, metin) => {
    const odak = await sekme.deger(
      `(() => { const i = document.querySelector(${JSON.stringify(secici)}); if (!i) return false; i.focus(); i.select?.(); return document.activeElement === i })()`,
    )
    if (!odak) return false
    await sekme.S('Input.insertText', { text: metin })
    return true
  }
  const tabBas = async (sekme) => {
    const tus = { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 }
    await sekme.S('Input.dispatchKeyEvent', { type: 'keyDown', ...tus })
    await sekme.S('Input.dispatchKeyEvent', { type: 'keyUp', ...tus })
  }
  /** Tarih ve seçim kutuları klavyeyle yazılamıyor — React'in değer yolu. */
  const degerVer = (sekme, etiket, deger) =>
    sekme.deger(`(() => {
      const l = [...document.querySelectorAll('label')].find((x) => x.textContent.trim().startsWith(${JSON.stringify(etiket)}))
      const alan = (l?.closest('.sihirbaz-alan') ?? l?.parentElement)?.querySelector('input, select')
      if (!alan) return false
      const ayarla = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(alan), 'value').set
      ayarla.call(alan, ${JSON.stringify(deger)})
      alan.dispatchEvent(new Event('input', { bubbles: true }))
      alan.dispatchEvent(new Event('change', { bubbles: true }))
      return true
    })()`)
  const etiketliGirdi = (etiket) =>
    `(() => { const l = [...document.querySelectorAll('label')].find((x) => x.textContent.trim().startsWith(${JSON.stringify(etiket)})); const i = (l?.closest('.sihirbaz-alan') ?? l?.parentElement)?.querySelector('input'); if (i && !i.id) i.id = 'duman-' + Math.random().toString(36).slice(2); return i ? '#' + CSS.escape(i.id) : null })()`

  /**
   * Payload sekmesine KALICI geçiş.
   *
   * ⚠️ PAYLOAD YARIŞI — 14 Eylül 2026'da CI'da ölçüldü, kaynağında
   * doğrulandı (`@payloadcms/ui` Tabs alanı + Preferences sağlayıcısı).
   * Sayfa açılınca Tabs alanı kayıtlı sekmeyi `/api/payload-preferences/…`
   * isteğiyle soruyor. İstek dönmeden sekmeye tıklanırsa tıklama sekmeyi
   * değiştiriyor, sonra AYNI isteği bekliyor; istek dönünce önce açılış
   * etkisi ESKİ sekmeyi geri yüklüyor. Sonuç: kutular bir an görünüp
   * kayboluyor ya da hiç görünmüyor — istisna yok.
   *
   * İlk koşumlarda tıklama sayfa açılır açılmaz yapılıyordu ve iddia üç
   * koşumda üç farklı sonuç verdi (geçti / "41." sonrası [] / kutular hiç
   * yok). Kodumuzun hatası değildi; testin zamanlamasıydı.
   *
   * Şimdi: tercih isteğinin bitmesi bekleniyor, tıklanıyor, sekme 1 sn
   * GÖZLEM penceresi boyunca etkin kalmalı (bu hazır olmayı değil geri
   * dönüşü bekliyor); dönerse yeniden deneniyor. Deneme sayısı günlüğe.
   */
  const sekmeyeGec = async (sekme, ad, hazirKosulu) => {
    await sekme.kosulBekle(
      `performance.getEntriesByType('resource').some((e) => e.name.includes('/payload-preferences/'))`,
      5000,
    )
    for (let deneme = 1; deneme <= 3; deneme++) {
      await sekme.deger(
        `[...document.querySelectorAll('[class*="tabs-field__tab-button"]')].find((b) => b.textContent.trim() === ${JSON.stringify(ad)})?.click()`,
      )
      if (!(await sekme.kosulBekle(hazirKosulu, 5000))) continue
      await uyu(1000)
      const etkin = await sekme.deger(
        `document.querySelector('[class*="tabs-field__tab-button--active"]')?.textContent.trim() ?? ''`,
      )
      if (etkin === ad && (await sekme.deger(hazirKosulu))) {
        if (deneme > 1)
          bilgi.push(`"${ad}" sekmesi ${deneme}. denemede kalıcı oldu (Payload tercih yarışı)`)
        return true
      }
    }
    return false
  }

  const temadaOlc = async (sekme, olcumler) => {
    const sonuc = {}
    for (const tema of ['light', 'dark']) {
      await sekme.deger(`document.documentElement.setAttribute('data-theme', '${tema}')`)
      await uyu(250)
      sonuc[tema] = await sekme.deger(
        `(() => { const o = ${KONTRAST_OLCER}; return ${olcumler} })()`,
      )
    }
    return sonuc
  }
  const kontrastDenetle = (ad, olcum) => {
    for (const [tema, deger] of Object.entries(olcum)) {
      if (deger === null) {
        sorunlar.push(`kontrast ${ad} (${tema}): öğe bulunamadı`)
      } else if (deger.oran < deger.esik) {
        sorunlar.push(`kontrast ${ad} (${tema}): ${deger.oran}:1 < ${deger.esik}:1`)
      }
    }
  }

  // ── Deneme kaydı ────────────────────────────────────────────────────
  const ALIPASA = { enlem: 41.14893, boylam: 27.827424 }
  let mahalleId = (await api('/api/mahalleler?limit=1&depth=0')).veri?.docs?.[0]?.id ?? null
  let geciciMahalle = null
  if (mahalleId === null) {
    const m = await api('/api/mahalleler', 'POST', {
      ad: `${DAVRANIS_ONEKI} Mahallesi`,
      slug: 'duman-davranis-mahallesi',
      yayinda: false,
    })
    geciciMahalle = m.veri?.doc?.id ?? null
    mahalleId = geciciMahalle
  }
  const olusan = await api('/api/ilanlar', 'POST', {
    baslik: `${DAVRANIS_ONEKI} deneme ilanı`,
    tip: 'satilik',
    kategori: 'konut',
    durum: 'taslak',
    mahalle: mahalleId,
    konum: [ALIPASA.boylam, ALIPASA.enlem],
  })
  const ilanId = olusan.veri?.doc?.id ?? null
  if (ilanId === null) {
    return {
      etiket: 'panel davranışı',
      sorunlar: [`deneme ilanı açılamadı (HTTP ${olusan.durum})`],
    }
  }

  try {
    // ── 1. Koordinat alanı — yeni ilan: enlem yaz, boylama geç ─────────
    await sekmeyleCalis(async (sekme) => {
      const hazir = await git(
        sekme,
        '/admin/collections/ilanlar/create',
        `document.querySelector('[class*="tabs-field__tab-button"]') !== null`,
      )
      if (!hazir) return void sorunlar.push('yeni ilan formu açılmadı')
      if (
        !(await sekmeyeGec(
          sekme,
          'Konum ve tapu',
          `document.querySelectorAll('.konum-kutu input').length === 2`,
        ))
      ) {
        return void sorunlar.push('koordinat kutuları bulunamadı (Konum ve tapu sekmesi, 3 deneme)')
      }
      if (!(await klavyeyleYaz(sekme, '.konum-kutu:nth-child(1) input', '41.1'))) {
        return void sorunlar.push('koordinat (yeni ilan): enlem kutusuna odaklanılamadı')
      }
      await tabBas(sekme)
      const odak = await sekme.deger(`document.activeElement?.id ?? ''`)
      if (!String(odak).endsWith('-boylam'))
        sorunlar.push(`koordinat: Tab boylama geçmedi (odak: "${odak}")`)
      await sekme.S('Input.insertText', { text: '27.8' })
      // Koşul bekle — sabit süre değil; ulaşılmazsa son hâl raporlanıyor.
      await sekme.kosulBekle(
        `JSON.stringify([...document.querySelectorAll('.konum-kutu input')].map((i) => i.value)) === '["41.1","27.8"]'`,
        3000,
      )
      const kutular = await sekme.deger(
        `[...document.querySelectorAll('.konum-kutu input')].map((i) => i.value)`,
      )
      if (kutular?.[0] !== '41.1' || kutular?.[1] !== '27.8') {
        sorunlar.push(
          `koordinat (yeni ilan): enlem yazılıp boylama geçilince kutular ${JSON.stringify(kutular)} — beklenen ["41.1","27.8"]`,
        )
      }
    })

    // ── 2. Koordinat alanı — kayıtlı ilan: "41." ─────────────────────────
    await sekmeyleCalis(async (sekme) => {
      const hazir = await git(
        sekme,
        `/admin/collections/ilanlar/${ilanId}`,
        `document.querySelector('[class*="tabs-field__tab-button"]') !== null`,
      )
      if (!hazir) return void sorunlar.push('kayıtlı ilan formu açılmadı')
      if (
        !(await sekmeyeGec(
          sekme,
          'Konum ve tapu',
          `document.querySelector('.konum-kutu input')?.value === '${ALIPASA.enlem}'`,
        ))
      ) {
        return void sorunlar.push(
          'kayıtlı ilanın enlemi kutuya gelmedi (Konum ve tapu sekmesi, 3 deneme)',
        )
      }
      if (!(await klavyeyleYaz(sekme, '.konum-kutu:nth-child(1) input', '41.'))) {
        return void sorunlar.push('koordinat (kayıtlı ilan): enlem kutusuna odaklanılamadı')
      }

      /**
       * ⚠️ SABİT BEKLEME YOK, ZAMAN ÇİZELGESİ VAR. İlk CI koşumunda (#114)
       * bu iddia 500 ms sonra kutuları `[]` — sayfada HİÇ kutu yok — buldu;
       * aynı kod #115'te geçti. Kutular ya kısa süre kaybolup aynı değerle
       * dönüyor (alan yeniden çiziliyor: test zamanlaması) ya da dönünce
       * yazılan değer gitmiş oluyor (kod hatası). 3 sn boyunca 50 ms'de bir
       * örnek alınıyor, iddia SON duruma bakıyor ve çizelge her koşumda
       * günlüğe yazılıyor.
       */
      const beklenen = JSON.stringify(['41.', String(ALIPASA.boylam)])
      const cizelge = await sekme.deger(`new Promise((bitir) => {
        const ornekler = []
        const t0 = performance.now()
        const al = () => {
          const kutular = JSON.stringify([...document.querySelectorAll('.konum-kutu input')].map((i) => i.value))
          const etkin = document.querySelector('[class*="tabs-field__tab-button--active"]')?.textContent.trim() ?? '?'
          const imza = kutular + ' @' + etkin
          const son = ornekler[ornekler.length - 1]
          if (!son || son.imza !== imza) ornekler.push({ ms: Math.round(performance.now() - t0), imza, kutular })
          if (performance.now() - t0 < 3000) setTimeout(al, 50)
          else bitir(ornekler)
        }
        al()
      })`)
      const ozet = (cizelge ?? []).map((o) => `${o.ms}ms ${o.imza}`).join(' → ')
      const son = cizelge?.[cizelge.length - 1]?.kutular ?? 'null'
      bilgi.push(`koordinat (kayıtlı ilan) "41." sonrası kutular: ${ozet}`)
      // Kutular bir çökmeyle kayboluyorsa istisna burada görünür.
      const istisnalar = sekme
        .olaylariBosalt()
        .filter((e) => e.method === 'Runtime.exceptionThrown')
        .map(
          (e) =>
            (
              e.params.exceptionDetails.exception?.description ?? e.params.exceptionDetails.text
            ).split('\n')[0],
        )
      if (istisnalar.length > 0)
        bilgi.push(`koordinat (kayıtlı ilan) istisnalar: ${istisnalar.join(' | ')}`)
      if (son !== beklenen) {
        sorunlar.push(
          `koordinat (kayıtlı ilan): "41." yazıldıktan 3 sn sonra kutular ${son} — beklenen ${beklenen} · çizelge: ${ozet}`,
        )
      }
    })

    // ── 3. Liste rozeti ─────────────────────────────────────────────────
    const rozetOku = (sekme) =>
      sekme.deger(
        `(() => { const s = [...document.querySelectorAll('tr')].find((t) => t.textContent.includes(${JSON.stringify(DAVRANIS_ONEKI)})); const h = s?.querySelector('.ilan-durum-hucre'); return h ? { hucre: h.textContent.replace(/\\s+/g, ' ').trim(), rozet: h.querySelector('.ilan-durum-rozet')?.textContent.trim() ?? null } : null })()`,
      )
    const listeRotasi = `/admin/collections/ilanlar?limit=100&where[baslik][like]=${DAVRANIS_ONEKI}`
    await sekmeyleCalis(async (sekme) => {
      const hazir = await git(
        sekme,
        listeRotasi,
        `[...document.querySelectorAll('tr')].some((t) => t.textContent.includes(${JSON.stringify(DAVRANIS_ONEKI)}))`,
      )
      if (!hazir) return void sorunlar.push('ilan listesinde deneme ilanı görünmedi')
      const ilk = await rozetOku(sekme)
      if (!ilk?.hucre.startsWith('Taslak') || ilk?.rozet !== 'EİDS eksik (6)') {
        sorunlar.push(
          `rozet: boş EİDS'li taslakta ${JSON.stringify(ilk)} — beklenen "Taslak" + "EİDS eksik (6)"`,
        )
      }
      kontrastDenetle('rozet', await temadaOlc(sekme, `o.metin('.ilan-durum-rozet')`))

      await api(`/api/ilanlar/${ilanId}`, 'PATCH', { ada: '1847' })
      await git(
        sekme,
        `${listeRotasi}&_=${Date.now()}`,
        `document.querySelector('.ilan-durum-rozet')?.textContent.trim() === 'EİDS eksik (5)'`,
      )
      const ikinci = await rozetOku(sekme)
      if (ikinci?.rozet !== 'EİDS eksik (5)')
        sorunlar.push(`rozet: ada girilince ${JSON.stringify(ikinci)} — beklenen "EİDS eksik (5)"`)

      // Yayındaki ilanda rozet olmamalı — varsa tohum verisinden.
      await git(
        sekme,
        '/admin/collections/ilanlar?limit=100',
        `document.querySelector('.ilan-durum-hucre') !== null`,
      )
      const yayindaRozet = await sekme.deger(
        `[...document.querySelectorAll('.ilan-durum-hucre')].filter((h) => /^(Yayında|Rezerve)/.test(h.textContent.trim()) && h.querySelector('.ilan-durum-rozet')).length`,
      )
      const yayindaSayisi = await sekme.deger(
        `[...document.querySelectorAll('.ilan-durum-hucre')].filter((h) => /^(Yayında|Rezerve)/.test(h.textContent.trim())).length`,
      )
      if (yayindaRozet > 0)
        sorunlar.push(`rozet: ${yayindaRozet} yayındaki/rezerve ilanda rozet var`)
      if (yayindaSayisi === 0)
        bilgi.push('yayında ilan yok — "yayında rozet yok" iddiası denenemedi')
    })

    // ── 4. EİDS sayacı, iyelik eki, sihirbaz kontrastı ───────────────────
    await sekmeyleCalis(async (sekme) => {
      const hazir = await git(
        sekme,
        '/admin/portfoy-sihirbazi',
        `document.querySelectorAll('.sihirbaz-adimlar li').length > 3`,
      )
      if (!hazir) return void sorunlar.push('sihirbaz açılmadı')

      // Adım göstergesi kontrastı — ilk adımdayken (etkin + bekleyen hâller)
      const adim = await temadaOlc(
        sekme,
        `({ etkin: o.metin('.sihirbaz-adimlar button.etkin .sihirbaz-adim-ad'), bekleyen: o.metin('.sihirbaz-adimlar button:not(.etkin):not(.tamam) .sihirbaz-adim-ad'), bekleyenNo: o.metin('.sihirbaz-adimlar button:not(.etkin):not(.tamam) .sihirbaz-adim-no'), ilerleme: o.metin('.sihirbaz-ilerleme-metin') })`,
      )
      for (const parca of ['etkin', 'bekleyen', 'bekleyenNo', 'ilerleme']) {
        kontrastDenetle(`adım göstergesi/${parca}`, {
          light: adim.light?.[parca] ?? null,
          dark: adim.dark?.[parca] ?? null,
        })
      }

      await sekme.deger(`document.querySelectorAll('.sihirbaz-adimlar button')[1]?.click()`)
      if (
        !(await sekme.kosulBekle(
          `[...document.querySelectorAll('label')].some((l) => l.textContent.trim().startsWith('Parsel'))`,
        ))
      ) {
        return void sorunlar.push('sihirbaz: Tapu ve EİDS adımı açılmadı')
      }
      const sayac = () =>
        sekme.deger(
          `(() => { const c = document.querySelector('.sihirbaz-eids-cubuk'); return { ozet: document.querySelector('.sihirbaz-eids-sayac > span')?.textContent.trim() ?? null, simdi: c?.getAttribute('aria-valuenow') ?? null, eksik: document.querySelectorAll('.sihirbaz-eids-liste:not(.uyari) li').length } })()`,
        )
      const bekle = async (adimAdi, beklenen) => {
        const tuttu = await sekme.kosulBekle(
          `document.querySelector('.sihirbaz-eids-sayac > span')?.textContent.trim() === ${JSON.stringify(beklenen.ozet)}`,
          6000,
        )
        const gorulen = await sayac()
        if (!tuttu || gorulen.simdi !== beklenen.simdi || gorulen.eksik !== beklenen.eksik) {
          sorunlar.push(
            `sayaç (${adimAdi}): ${JSON.stringify(gorulen)} — beklenen ${JSON.stringify(beklenen)}`,
          )
        }
      }

      await bekle('boş', { ozet: 'EİDS: 6 eksikten 0’ı tamamlandı', simdi: '0', eksik: 6 })

      const bugun = new Date()
      const gun = (fark) => new Date(bugun.getTime() + fark * 86_400_000).toISOString().slice(0, 10)
      const adimlar = [
        ['Ada', '1847', { ozet: 'EİDS: 6 eksikten 1’i tamamlandı', simdi: '1', eksik: 5 }],
        ['Parsel', '12', { ozet: 'EİDS: 6 eksikten 2’si tamamlandı', simdi: '2', eksik: 4 }],
        [
          'Taşınmaz numarası',
          '1234567',
          { ozet: 'EİDS: 6 eksikten 3’ü tamamlandı', simdi: '3', eksik: 3 },
        ],
      ]
      for (const [etiket, metin, beklenen] of adimlar) {
        const secici = await sekme.deger(etiketliGirdi(etiket))
        if (!secici || !(await klavyeyleYaz(sekme, secici, metin))) {
          sorunlar.push(`sihirbaz: "${etiket}" kutusuna yazılamadı`)
          continue
        }
        await bekle(etiket, beklenen)
      }
      await degerVer(sekme, 'EİDS yetki durumu', 'yetkili')
      await bekle('yetki durumu', { ozet: 'EİDS: 6 eksikten 4’ü tamamlandı', simdi: '4', eksik: 2 })
      await degerVer(sekme, 'Yetki başlangıcı', gun(-1))
      await bekle('yetki başlangıcı', {
        ozet: 'EİDS: 6 eksikten 5’i tamamlandı',
        simdi: '5',
        eksik: 1,
      })

      // Çubuk ve metin kontrastı — eksik varken (panel "eksik" zemininde)
      const eids = await temadaOlc(
        sekme,
        `({ cubuk: o.cubuk('.sihirbaz-eids-cubuk'), sayac: o.metin('.sihirbaz-eids-sayac > span'), kaynak: o.metin('.sihirbaz-eids-kaynak'), ipucu: o.metin('.sihirbaz-ipucu') })`,
      )
      for (const parca of ['sayac', 'kaynak', 'ipucu']) {
        kontrastDenetle(`sihirbaz/${parca}`, {
          light: eids.light?.[parca] ?? null,
          dark: eids.dark?.[parca] ?? null,
        })
      }
      for (const tema of ['light', 'dark']) {
        const c = eids[tema]?.cubuk
        if (!c) sorunlar.push(`kontrast ilerleme çubuğu (${tema}): öğe bulunamadı`)
        else {
          if (c.dolguIz < 3)
            sorunlar.push(`kontrast ilerleme çubuğu dolgu–iz (${tema}): ${c.dolguIz}:1 < 3:1`)
          if (c.cerceveZemin < 3)
            sorunlar.push(
              `kontrast ilerleme çubuğu çerçeve–zemin (${tema}): ${c.cerceveZemin}:1 < 3:1`,
            )
        }
      }

      await degerVer(sekme, 'Yetki bitişi', gun(200))
      await bekle('yetki bitişi', {
        ozet: 'EİDS: 6 koşulun hepsi tamamlandı',
        simdi: '6',
        eksik: 0,
      })
    })
  } finally {
    await api(`/api/ilanlar/${ilanId}`, 'DELETE')
    if (geciciMahalle !== null) await api(`/api/mahalleler/${geciciMahalle}`, 'DELETE')
  }

  for (const b of bilgi) console.log(`  ℹ ${b}`)
  return { etiket: 'panel davranışı', sorunlar }
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

const genel = SADECE === 'panel' || SADECE === 'davranis' ? [] : await genelRotalar()
const panel = SADECE === 'genel' || SADECE === 'davranis' ? [] : panelRotalari()
const davranis = SADECE !== 'genel'

console.log(`Taban: ${TABAN}`)
console.log(
  `Genel rota: ${genel.length} · Panel rotası: ${panel.length} · Panel davranışı: ${davranis ? 'evet' : 'hayır'}\n`,
)

const { wsAdresi, kapat } = await tarayiciyaBaglan()
let hataliMi = false

/**
 * ⚠️ HER TURUN SÜRESİ YAZILIYOR. Panel davranışı turu eklendiğinde CI
 * süresinin ne kadar uzadığı ölçülmek zorundaydı; tahmin değil. Toplam
 * 15 dakikayı aşarsa turlar paralelleştirilmeli (her tur kendi sekmesini
 * açıyor, ortak durum yok).
 */
const baslangic = Date.now()
const sureYaz = (ms) => `${Math.round(ms / 1000)} sn`
const zamanla = async (is) => {
  const t0 = Date.now()
  const sonuc = await is()
  return { ...sonuc, sure: Date.now() - t0 }
}

const raporla = ({ etiket, sorunlar, tiklanan, tiklanamayan, sure }) => {
  const zaman = sure === undefined ? '' : ` (${sureYaz(sure)})`
  if (sorunlar.length === 0) {
    const ek = tiklanan === undefined ? '' : ` · ${tiklanan} bağlantı klavyeyle açıldı`
    console.log(`✓ ${etiket.padEnd(16)} — sorun yok${ek}${zaman}`)
  } else {
    hataliMi = true
    console.error(`✗ ${etiket.padEnd(16)} — ${sorunlar.length} sorun${zaman}:`)
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
    raporla(await zamanla(() => genelTur(wsAdresi, genel, { azHareket: false })))
    raporla(await zamanla(() => genelTur(wsAdresi, genel, { azHareket: true })))
  }

  if (panel.length > 0 || davranis) {
    if (!EPOSTA || !SIFRE) {
      /**
       * ⚠️ ATLAMA SESSİZ OLAMAZ. Panel rotalarını oturumsuz açmak "200
       * döndü, geçti" derdi — 27 Ağustos arızası tam olarak buydu.
       */
      console.error(
        `✗ panel            — ${panel.length} rota ve panel davranışı DENENMEDİ: --eposta ve --sifre verilmedi.\n` +
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
      if (panel.length > 0) raporla(await zamanla(() => panelTuru(wsAdresi, panel, cerez)))
      if (davranis) raporla(await zamanla(() => davranisTuru(wsAdresi, cerez)))
    }
  }
} finally {
  kapat()
}

if (hataliMi) {
  console.error(`\nToplam süre: ${sureYaz(Date.now() - baslangic)}`)
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

console.log(`\nToplam süre: ${sureYaz(Date.now() - baslangic)}`)
console.log('\nGezinme sağlam.')
