/**
 * Bot ve arama motoru sınıflandırması.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU DOSYA BİR HATA DÜZELTMESİYLE DOĞDU: İNSAN SAYILARI BOT TRAFİĞİNİ
 *    İÇERİYORDU.
 *
 * `proxy.ts` her isteği `sayfaSay()` ile sayıyordu ve bot süzgeci YOKTU.
 * Sonucu ölçüldü: Googlebot'un `User-Agent` dizesi "Chrome" ve "Mobile"
 * kelimelerini taşıyor, yani `tarayiciAilesi()` onu **chrome**,
 * `cihazSinifi()` onu **mobil** sayıyordu. Yani:
 *
 *   · "sayfa görüntüleme" sayacı tarama isteklerini de topluyordu;
 *   · "trafiğin %75'i mobil" varsayımını doğrulamak için bakılan grafik
 *     Googlebot'un mobil tarayıcısını insan sanıyordu;
 *   · dönüşüm oranının PAYDASI şişiyordu — talep sayısı aynı kalırken
 *     görüntüleme arttığı için oran olduğundan KÜÇÜK görünüyordu.
 *
 * Bot trafiği bir arıza değil, sağlıklı bir SEO belirtisi; ama insan
 * davranışıyla aynı kovada durduğu sürece her iki sayı da yanlış.
 *
 * ⚠️ BOT ÖLÇÜMÜ KATMAN A VE ONAY GEREKTİRMİYOR — ve bu teknik bir
 * yorum değil, tanımın kendisi: botlar kişi değil. Çerez yazılmıyor, IP
 * okunmuyor, `User-Agent` HİÇBİR YERE KAYDEDİLMİYOR. Bu dosyanın tek işi
 * ham dizeyi bir kovaya çevirip ATMAK — insan tarafındaki
 * `tarayiciAilesi()` ile aynı disiplin.
 *
 * ⚠️ BU DOSYADA AĞ, VERİTABANI VE `process.env` ERİŞİMİ YOK. Vekil
 * katmanında (Edge) çalışıyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Raporlanan bot sınıfları.
 *
 * ⚠️ `diger` BİR ÇÖP KOVASI DEĞİL: sınıfı `diger` olan her satır ayrıca
 * UA'dan çıkarılmış bir ADLA saklanıyor (`BotKimligi.ad`). Tanınmayan bir
 * tarayıcıyı adsız bir "diğer" toplamına atmak, yeni bir botun trafiğini
 * fark etmemizi engellerdi — arama motoru listesindeki kararın aynısı
 * (`aramaMotoruAdi`).
 */
export type BotSinifi =
  | 'googlebot'
  | 'bingbot'
  | 'yandexbot'
  | 'ahrefsbot'
  | 'semrushbot'
  | 'gptbot'
  | 'claudebot'
  | 'perplexitybot'
  | 'diger'

export const BOT_SINIFLARI: readonly BotSinifi[] = [
  'googlebot',
  'bingbot',
  'yandexbot',
  'ahrefsbot',
  'semrushbot',
  'gptbot',
  'claudebot',
  'perplexitybot',
  'diger',
]

export const BOT_ETIKETI: Record<BotSinifi, string> = {
  googlebot: 'Googlebot',
  bingbot: 'Bingbot',
  yandexbot: 'YandexBot',
  ahrefsbot: 'AhrefsBot',
  semrushbot: 'SemrushBot',
  gptbot: 'GPTBot',
  claudebot: 'ClaudeBot',
  perplexitybot: 'PerplexityBot',
  diger: 'Diğer',
}

/**
 * Botun ne işe yaradığı — panelde sınıfın yanında duruyor.
 *
 * ⚠️ "AhrefsBot 4.200 istek" satırı tek başına karar aldırmıyor: biri
 * arama sonucuna çıkmanın yolu, biri rakip analizi aracı, biri yapay zekâ
 * eğitim toplayıcısı. Üçüne aynı tepkiyi vermek yanlış olur — ve hangisinin
 * hangisi olduğu ancak yazılıysa bilinir.
 */
export const BOT_ACIKLAMASI: Record<BotSinifi, string> = {
  googlebot:
    'Google arama dizini. Taramanın kesilmesi, sayfaların Google’dan düşmesi demektir — ' +
    'bu botun çok gezmesi iyi haberdir.',
  bingbot: 'Bing (ve ChatGPT aramasının bir bölümü) dizini.',
  yandexbot: 'Yandex arama dizini. Türkiye’de azımsanmayacak bir payı var.',
  ahrefsbot:
    'SEO analiz aracı; arama sonucuna katkısı YOK. Bant genişliği tüketir — ' +
    'yoğunlaşırsa robots.txt ile sınırlanabilir.',
  semrushbot: 'SEO analiz aracı; arama sonucuna katkısı YOK.',
  gptbot:
    'OpenAI içerik toplayıcısı (model eğitimi). Arama sonucuna katkısı yok; ' +
    'engellenip engellenmemesi bir İÇERİK HAKKI kararıdır, teknik değil.',
  claudebot: 'Anthropic içerik toplayıcısı. GPTBot ile aynı kararın konusu.',
  perplexitybot: 'Perplexity yanıt motoru; kaynak göstererek atıf yapıyor.',
  diger:
    'Tanınmayan tarayıcılar. Adı satırda yazıyor; sık görünen biri ' +
    'buraya tanımlı sınıf olarak eklenmelidir.',
}

export interface BotKimligi {
  sinif: BotSinifi
  /**
   * Sayaç anahtarının ikinci parçası.
   *
   * ⚠️ Tanınan sınıflarda etiketle aynı; `diger` sınıfında UA'dan çıkarılan
   * jeton (örn. `applebot`). Serbest metin DEĞİL: jeton harf/rakam/tire ile
   * sınırlı ve kırpılıyor — ham UA hiçbir yere yazılmıyor.
   */
  ad: string
}

/**
 * Sınıf eşlemeleri.
 *
 * ⚠️ BİR SINIF, BİR ŞİRKETİN TÜM TARAYICILARI. Google'ın onlarca ajanı var
 * (`Googlebot-Image`, `AdsBot-Google`, `GoogleOther`, `Google-Extended`,
 * `Google-InspectionTool`…). Hepsini ayrı satır yapmak paneli okunmaz
 * hâle getirirdi; "Google bizi ne kadar geziyor" sorusu da cevapsız
 * kalırdı. `googlebot` sınıfı bu yüzden "Google'ın tarayıcıları" demek.
 *
 * ⚠️ SIRA ÖNEMLİ VE ÖZELDEN GENELE. `Google-Extended` dizesi `google`
 * içeriyor; `ChatGPT-User` dizesi `chatgpt` içeriyor. Genel desen önce
 * denenirse özel olanlar hiç eşleşmez — `tarayiciAilesi()` içindeki
 * tuzağın aynısı.
 */
const ESLEMELER: readonly { sinif: BotSinifi; jetonlar: readonly string[] }[] = [
  {
    sinif: 'googlebot',
    jetonlar: [
      'googlebot',
      'adsbot-google',
      'googleother',
      'google-extended',
      'google-inspectiontool',
      'storebot-google',
      'feedfetcher-google',
      'apis-google',
      'google-safety',
    ],
  },
  { sinif: 'bingbot', jetonlar: ['bingbot', 'adidxbot', 'bingpreview', 'msnbot'] },
  {
    sinif: 'yandexbot',
    jetonlar: ['yandexbot', 'yandeximages', 'yandex.com/bots', 'yandexaccessibilitybot'],
  },
  { sinif: 'ahrefsbot', jetonlar: ['ahrefsbot', 'ahrefssiteaudit'] },
  { sinif: 'semrushbot', jetonlar: ['semrushbot', 'semrush'] },
  { sinif: 'gptbot', jetonlar: ['gptbot'] },
  { sinif: 'claudebot', jetonlar: ['claudebot', 'claude-web', 'anthropic-ai'] },
  { sinif: 'perplexitybot', jetonlar: ['perplexitybot', 'perplexity-user'] },
]

/**
 * Tanınan ama kendi sınıfı olmayan tarayıcılar — `diger` sınıfında, ADLA.
 *
 * ⚠️ Liste "bu bir bottur" bilgisini taşıyor, sınıf bilgisini taşımıyor.
 * Biri sık görünmeye başlarsa `ESLEMELER`e taşınır; o güne kadar panelde
 * adıyla duruyor ve sayısı görünüyor.
 */
const DIGER_BOTLAR: readonly string[] = [
  'applebot',
  'duckduckbot',
  'baiduspider',
  'sogou',
  'exabot',
  'facebookexternalhit',
  'facebookbot',
  'meta-externalagent',
  'twitterbot',
  'linkedinbot',
  'whatsapp',
  'telegrambot',
  'slackbot',
  'discordbot',
  'pinterestbot',
  'redditbot',
  'oai-searchbot',
  'chatgpt-user',
  'bytespider',
  'amazonbot',
  'mj12bot',
  'dotbot',
  'petalbot',
  'seznambot',
  'screaming frog',
  'dataforseobot',
  'yisouspider',
  'ia_archiver',
  'archive.org_bot',
  'uptimerobot',
  'pingdom',
  'censysinspect',
  'expanse',
  'zgrab',
  /**
   * ⚠️ HEADLESS CHROME DE BOT SAYILIYOR — ve bu bilinçli.
   *
   * Duman testi ve Lighthouse her PR'da sitede dolaşıyor. O istekler insan
   * değil; insan kovasına girdiklerinde "bu hafta ne oldu?" kutusu CI
   * koşularını trafik sanıyordu.
   */
  'headlesschrome',
  'chrome-lighthouse',
  'lighthouse',
]

/**
 * Jeton olmasa da bot olduğunu söyleyen genel desenler.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ `includes('bot')` YAZILMADI VE BU BİR HATA DÜZELTMESİ.
 *
 * İlk hâl düz bir alt dize aramasıydı ve gerçek telefonları bot sayıyordu:
 * **CUBOT** bir Android marka adı ve `User-Agent` dizesinde geçiyor
 * (`CUBOT_NOTE_20`). Aynı tuzak `honor`, `robot`, `abbott` gibi dizelerde
 * de var. Desen bu yüzden kelime sınırına bakıyor: `bot` ancak harf
 * olmayan bir karakterle çevrelenmişse (`-bot/`, ` bot)`, `bot;`) bot
 * işareti sayılıyor. Tanınan botların kendi jetonları zaten yukarıda.
 *
 * ⚠️ `+http://` DE BİR İŞARET: ciddi tarayıcıların neredeyse tamamı
 * `User-Agent` içinde kendi tanıtım adresini taşıyor. İnsan tarayıcıları
 * taşımıyor.
 * ─────────────────────────────────────────────────────────────────────────
 */
const GENEL_DESENLER: readonly RegExp[] = [
  /(?:^|[^a-z])bot(?:[^a-z]|$)/,
  /crawler|crawling|spider|slurp|scraper|archiver|indexer/,
  /\+https?:\/\//,
  /curl\//,
  /wget/,
  /python-requests|python-urllib|aiohttp/,
  /go-http-client|okhttp|axios\/|node-fetch|got\/|undici/,
  /libwww-perl|apache-httpclient|java\/|jakarta/,
  /postmanruntime|insomnia/,
  /headless|phantomjs|puppeteer|playwright/,
  /uptime|pingdom|monitoring|statuscake/,
]

/**
 * Jeton temizliği — panelde görünecek ad.
 *
 * ⚠️ HAM UA YAZILAMAZ. Tam `User-Agent` dizesi sürüm, işletim sistemi ve
 * derleme numarası taşıyor; bir insan tarayıcısı yanlışlıkla bot sayılırsa
 * o dize veritabanına girmiş olurdu. Ad bu yüzden harf/rakam/tire/nokta
 * ile sınırlı ve 32 karaktere kırpılıyor.
 */
function adiTemizle(ham: string): string {
  const temiz = ham
    .toLowerCase()
    .replace(/[^a-z0-9._ -]/g, '')
    .trim()
    .slice(0, 32)
  return temiz === '' ? 'tanimsiz' : temiz
}

/**
 * `diger` sınıfındaki botun adını UA'dan çıkarır.
 *
 * ⚠️ ÖNCE TANINAN LİSTE, SONRA DESEN. Desen `facebookexternalhit` gibi
 * "bot" kelimesi geçmeyen adları bulamıyor; liste de her yeni botu
 * bilemiyor. İkisi birlikte, ikisi de tek başına yetersiz.
 */
function digerinAdi(ua: string): string {
  for (const bilinen of DIGER_BOTLAR) {
    if (ua.includes(bilinen)) return adiTemizle(bilinen)
  }

  // `Something-Bot/1.2` → `something-bot`
  const desen = /([a-z0-9][a-z0-9._-]{1,30}(?:bot|crawler|spider|fetcher|scraper))/.exec(ua)
  if (desen?.[1] !== undefined) return adiTemizle(desen[1])

  const arac = /^([a-z0-9._-]{2,30})\//.exec(ua)
  if (arac?.[1] !== undefined) return adiTemizle(arac[1])

  return 'tanimsiz'
}

/**
 * İstek bir bottan mı geliyor — geliyorsa hangi sınıftan?
 *
 * `null` dönerse istek İNSAN sayılıyor ve Katman A sayaçlarına giriyor.
 *
 * ⚠️ BOŞ `User-Agent` İNSAN SAYILIYOR, BOT SAYILMIYOR. Gizlilik eklentileri
 * ve bazı uygulama içi tarayıcılar başlığı hiç göndermiyor; onları bot
 * kovasına atmak gerçek ziyaretçileri rapordan düşürürdü. Hata yönü
 * bilinçli: insan sayısını olduğundan BÜYÜK gösterir, bot sayısını küçük —
 * ve bu, tersine göre daha az yanlış karar aldırır.
 */
export function botKimligi(userAgent: string | null | undefined): BotKimligi | null {
  if (typeof userAgent !== 'string') return null
  const ua = userAgent.toLowerCase()
  if (ua.trim() === '') return null

  for (const { sinif, jetonlar } of ESLEMELER) {
    if (jetonlar.some((jeton) => ua.includes(jeton))) {
      return { sinif, ad: BOT_ETIKETI[sinif] }
    }
  }

  if (DIGER_BOTLAR.some((bilinen) => ua.includes(bilinen))) {
    return { sinif: 'diger', ad: digerinAdi(ua) }
  }

  if (GENEL_DESENLER.some((desen) => desen.test(ua))) {
    return { sinif: 'diger', ad: digerinAdi(ua) }
  }

  return null
}

/** Kolaylık: istek insandan mı geliyor? */
export function insanMi(userAgent: string | null | undefined): boolean {
  return botKimligi(userAgent) === null
}

/**
 * Bot sayacının anahtarı — `sinif|ad`.
 *
 * ⚠️ Ayırıcı `tampon.ts` içindeki `OLAY_AYIRICI` ile aynı karakter olmak
 * zorunda DEĞİL ve bilinçli olarak aynı tutulmuyor: bu anahtarı kuran ve
 * bölen kod burada, tek dosyada. Ad temizliği `|` karakterini zaten
 * atıyor.
 */
export const BOT_AYIRICI = '|'

export function botAnahtari(kimlik: BotKimligi): string {
  return `${kimlik.sinif}${BOT_AYIRICI}${kimlik.ad}`
}

export function botAnahtariniCoz(anahtar: string): BotKimligi {
  const [sinif = '', ad = ''] = anahtar.split(BOT_AYIRICI)
  const gecerli = (BOT_SINIFLARI as readonly string[]).includes(sinif)
    ? (sinif as BotSinifi)
    : 'diger'
  return { sinif: gecerli, ad: ad === '' ? BOT_ETIKETI[gecerli] : ad }
}

/**
 * Bot isteklerinde sayılacak yollar.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ İNSAN SÜZGECİNDEN (`sayilirMi`) DAHA GENİŞ — İKİ YOL YÜZÜNDEN.
 *
 * `robots.txt` ve `sitemap.xml` insan için ziyaret değildir; "en çok
 * görüntülenen sayfa" listesinde durmaları anlamsız olurdu. Ama bot için
 * tam tersi: "Googlebot site haritasını en son ne zaman çekti" SEO'nun
 * en doğrudan sorusu ve cevabı yalnızca bu iki istekte var.
 * ─────────────────────────────────────────────────────────────────────────
 */
export const BOT_EK_YOLLARI: readonly string[] = ['/robots.txt', '/sitemap.xml']
