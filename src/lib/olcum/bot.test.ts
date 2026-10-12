import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { beforeEach, describe, expect, it } from 'vitest'

import {
  BOT_ACIKLAMASI,
  BOT_EK_YOLLARI,
  BOT_ETIKETI,
  BOT_SINIFLARI,
  botAnahtari,
  botAnahtariniCoz,
  botKimligi,
  insanMi,
} from './bot'
import { botlariTopla, kapsamiHesapla, robotsDurumunuCoz, satirlariCoz } from './botToplama'
import { sayilirMi } from './kimliksizlestirme'
import { botDurumSay, botSay, bosalt, tamponuOku, tamponuSifirla } from './tampon'
import { cihazSinifi } from './tipler'

/**
 * Bot ve arama motoru istatistikleri.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU DOSYA BİR HATA DÜZELTMESİNİN TESTİ — ÖZELLİĞİN DEĞİL.
 *
 * `proxy.ts` 11 Ekim 2026'ya kadar her isteği `sayfaSay()` ile sayıyordu ve
 * bot süzgeci YOKTU. Googlebot'un `User-Agent` dizesi "Chrome" ve "Mobile"
 * kelimelerini taşıyor; yani tarama istekleri tarayıcı dağılımında
 * **chrome**, cihaz dağılımında **mobil** görünüyordu.
 *
 * Aşağıdaki ilk iddia tam olarak o durumu yakalıyor: Googlebot'un UA'sı
 * hâlâ `cihazSinifi()` tarafından mobil sayılıyor — o fonksiyon
 * değişmedi ve değişmemeli. Hatayı kapatan şey, o fonksiyona hiç
 * ULAŞILMAMASI.
 * ─────────────────────────────────────────────────────────────────────────
 */

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const oku = (yol: string) => readFileSync(path.join(KOK, yol), 'utf8')

/** Yorumları soyar — iddialar KODA baksın, gerekçeye değil. */
function kodu(yol: string): string {
  return oku(yol)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '')
}

/* ── Gerçek `User-Agent` dizeleri ──────────────────────────────────────────
 *
 * ⚠️ UYDURMA DİZE KULLANILMADI. "Googlebot" kelimesini içeren bir dize
 * yazıp onu sınıflandırmak, sınıflandırıcıyı değil kendi varsayımımızı test
 * etmek olurdu. Aşağıdakiler yayımlanmış gerçek dizeler; insan örnekleri de
 * öyle.
 * ──────────────────────────────────────────────────────────────────────── */

const GOOGLEBOT_MOBIL =
  'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/125.0.6422.175 Mobile Safari/537.36 ' +
  '(compatible; Googlebot/2.1; +http://www.google.com/bot.html)'

const GOOGLEBOT_MASAUSTU =
  'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; ' +
  '+http://www.google.com/bot.html) Chrome/125.0.6422.175 Safari/537.36'

const BINGBOT = 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)'

const YANDEX = 'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)'
const AHREFS = 'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)'
const SEMRUSH = 'Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)'
const GPTBOT =
  'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.1; +https://openai.com/gptbot'
const CLAUDEBOT =
  'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)'
const PERPLEXITY =
  'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)'
const APPLEBOT =
  'Mozilla/5.0 (Device; OS) AppleWebKit/600 (KHTML, like Gecko) Version/4.0 Safari/600 (Applebot/0.1; +http://www.apple.com/go/applebot)'

/** İnsan tarayıcıları. */
const MASAUSTU_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/141.0.0.0 Safari/537.36'
const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 ' +
  '(KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'
/**
 * ⚠️ CUBOT BİR TELEFON MARKASI — ve `includes('bot')` bu dizeyi bot sayardı.
 * Gerçek bir Android `User-Agent`'ı; sınıflandırıcı kelime sınırına bakmak
 * zorunda.
 */
const CUBOT_TELEFON =
  'Mozilla/5.0 (Linux; Android 11; CUBOT_NOTE_20 Build/RP1A.200720.011) ' +
  'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.74 Mobile Safari/537.36'

describe('bot tanıma', () => {
  it('Googlebot mobil UA, CİHAZ SINIFLANDIRICISI tarafından hâlâ mobil sayılıyor', () => {
    /**
     * ⚠️ DÜZELTİLEN HATANIN KANITI. `cihazSinifi()` değişmedi ve
     * değişmemeli; onu "bot farkındası" yapmak, iki ayrı yerde iki ayrı
     * bot listesi tutmak olurdu. Hatayı kapatan şey o fonksiyona hiç
     * ulaşılmaması — aşağıdaki "proxy ayrımı" iddiaları onu denetliyor.
     */
    expect(cihazSinifi(GOOGLEBOT_MOBIL)).toBe('mobil')
    expect(botKimligi(GOOGLEBOT_MOBIL)?.sinif).toBe('googlebot')
  })

  it('dokuz sınıfın sekizi gerçek UA ile tanınıyor', () => {
    expect(botKimligi(GOOGLEBOT_MASAUSTU)?.sinif).toBe('googlebot')
    expect(botKimligi(BINGBOT)?.sinif).toBe('bingbot')
    expect(botKimligi(YANDEX)?.sinif).toBe('yandexbot')
    expect(botKimligi(AHREFS)?.sinif).toBe('ahrefsbot')
    expect(botKimligi(SEMRUSH)?.sinif).toBe('semrushbot')
    expect(botKimligi(GPTBOT)?.sinif).toBe('gptbot')
    expect(botKimligi(CLAUDEBOT)?.sinif).toBe('claudebot')
    expect(botKimligi(PERPLEXITY)?.sinif).toBe('perplexitybot')
  })

  it('Google’ın diğer ajanları da Googlebot sınıfında', () => {
    // ⚠️ Sınıf "Googlebot" değil "Google'ın tarayıcıları" demek; onlarca
    // ajanı ayrı satır yapmak paneli okunmaz hâle getirirdi.
    for (const ua of [
      'AdsBot-Google (+http://www.google.com/adsbot.html)',
      'Mozilla/5.0 (compatible; GoogleOther)',
      'Mozilla/5.0 (compatible; Google-InspectionTool/1.0)',
    ]) {
      expect(botKimligi(ua)?.sinif, ua).toBe('googlebot')
    }
  })

  it('tanınmayan bot ADSIZ bir kovaya DÜŞMÜYOR', () => {
    /**
     * ⚠️ Adsız bir "diğer" toplamı, yeni bir botun trafiğini fark etmemizi
     * engellerdi — tanınmayan arama motorunun alan adıyla kalması
     * kararının aynısı (`aramaMotoruAdi`).
     */
    const applebot = botKimligi(APPLEBOT)
    expect(applebot?.sinif).toBe('diger')
    expect(applebot?.ad).toBe('applebot')

    const bilinmeyen = botKimligi('Mozilla/5.0 (compatible; YeniArama-Bot/1.0; +http://x.example)')
    expect(bilinmeyen?.sinif).toBe('diger')
    expect(bilinmeyen?.ad).toContain('bot')
  })

  it('insan tarayıcıları bot SAYILMIYOR', () => {
    expect(botKimligi(MASAUSTU_CHROME)).toBeNull()
    expect(botKimligi(IPHONE_SAFARI)).toBeNull()
    expect(insanMi(MASAUSTU_CHROME)).toBe(true)
  })

  it('CUBOT telefonu bot sayılmıyor — kelime sınırı denetimi', () => {
    /**
     * ⚠️ Düz bir `includes('bot')` bu gerçek Android cihazını bot sayar ve
     * sahibini rapordan düşürürdü. Aynı tuzak `robot`, `abbott` gibi
     * dizelerde de var.
     */
    expect(botKimligi(CUBOT_TELEFON)).toBeNull()
  })

  it('boş ya da eksik UA İNSAN sayılıyor', () => {
    /**
     * ⚠️ Hata yönü bilinçli: gizlilik eklentileri başlığı hiç göndermiyor.
     * Onları bot kovasına atmak gerçek ziyaretçileri rapordan düşürürdü.
     * İnsan sayısını olduğundan büyük göstermek, tersine göre daha az
     * yanlış karar aldırır.
     */
    expect(botKimligi(null)).toBeNull()
    expect(botKimligi(undefined)).toBeNull()
    expect(botKimligi('   ')).toBeNull()
  })

  it('headless Chrome bot sayılıyor — CI trafiği insan değil', () => {
    /**
     * ⚠️ Duman testi ve Lighthouse her PR'da sitede dolaşıyor. İnsan
     * kovasına girdiklerinde "bu hafta ne oldu?" kutusu CI koşularını
     * trafik sanıyordu.
     */
    const ua =
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'HeadlessChrome/131.0.0.0 Safari/537.36'
    expect(botKimligi(ua)?.sinif).toBe('diger')
    expect(botKimligi(ua)?.ad).toBe('headlesschrome')
  })

  it('araç ve betik istekleri bot sayılıyor', () => {
    for (const ua of ['curl/8.5.0', 'python-requests/2.32.3', 'Go-http-client/2.0', 'Wget/1.21']) {
      expect(botKimligi(ua), ua).not.toBeNull()
    }
  })

  it('her sınıfın etiketi VE ne işe yaradığı yazılı', () => {
    /**
     * ⚠️ "AhrefsBot 4.200 istek" satırı tek başına karar aldırmıyor: biri
     * arama sonucuna çıkmanın yolu, biri rakip analizi aracı, biri yapay
     * zekâ eğitim toplayıcısı. Üçüne aynı tepkiyi vermek yanlış olur.
     */
    for (const sinif of BOT_SINIFLARI) {
      expect(BOT_ETIKETI[sinif], sinif).toBeTruthy()
      expect(BOT_ACIKLAMASI[sinif].length, sinif).toBeGreaterThan(30)
    }
  })

  it('anahtar kurma ve çözme simetrik', () => {
    const kimlik = { sinif: 'diger' as const, ad: 'applebot' }
    expect(botAnahtariniCoz(botAnahtari(kimlik))).toEqual(kimlik)
    expect(botAnahtariniCoz(botAnahtari({ sinif: 'googlebot', ad: 'Googlebot' }))).toEqual({
      sinif: 'googlebot',
      ad: 'Googlebot',
    })
  })

  it('ham `User-Agent` koda hiç kaydedilmiyor', () => {
    /**
     * ⚠️ `bot.ts` ham dizeyi bir kovaya çevirip ATIYOR. Ad temizliği
     * harf/rakam/tire ile sınırlı ve 32 karaktere kırpılıyor: bir insan
     * tarayıcısı yanlışlıkla bot sayılsa bile sürüm + işletim sistemi
     * dizesi veritabanına girmiyor.
     */
    const kaynak = kodu('src/lib/olcum/bot.ts')
    expect(kaynak).toContain('.slice(0, 32)')
    expect(kaynak).toMatch(/replace\(\/\[\^a-z0-9/)
  })
})

describe('proxy ayrımı — insan sayaçları bota HİÇ dokunmuyor', () => {
  const proxy = kodu('src/proxy.ts')

  it('bot tanınır tanınmaz erken dönüş var', () => {
    /**
     * ⚠️ `return` ŞART. Bot süzgecinden geçip `sayfaSay()` çağrısına düşen
     * bir istek, düzeltilen hatanın ta kendisidir.
     */
    expect(proxy).toMatch(/const bot = botKimligi\([\s\S]{0,80}?\)\n/)
    expect(proxy).toMatch(/if \(bot !== null\) \{[\s\S]{0,400}?return yanit\n\s*\}/)
  })

  it('bot dalı insan sayaçlarının HİÇBİRİNİ çağırmıyor', () => {
    const basla = proxy.indexOf('if (bot !== null) {')
    const bitir = proxy.indexOf('if (!sayilirMi(yol)) return yanit')
    expect(basla).toBeGreaterThan(-1)
    expect(bitir).toBeGreaterThan(basla)
    const dal = proxy.slice(basla, bitir)
    expect(dal).not.toContain('sayfaSay')
    expect(dal).not.toContain('onayliIstekSay')
    expect(dal).not.toContain('cihazSinifi')
    expect(dal).not.toContain('tarayiciAilesi')
    expect(dal).not.toContain('sehirAdi')
  })

  it('bot ölçümü de çerez yazmıyor, IP okumuyor', () => {
    const kaynak = kodu('src/lib/olcum/bot.ts')
    expect(kaynak).not.toMatch(/x-forwarded-for|remoteAddress|cookies/i)
    expect(kaynak).not.toMatch(/randomUUID|createHash|Math\.random/)
  })

  it('bot sayacı da veritabanına dokunmuyor — aynı tampon, aynı boşaltma', () => {
    /**
     * ⚠️ Şartnamenin sert kuralı: bot istekleri için AYRI DB YAZMASI YOK.
     * Eklenen şey yeni bir yazma yolu değil, yeni bir boyut.
     */
    for (const dosya of ['src/lib/olcum/bot.ts', 'src/lib/olcum/tampon.ts']) {
      const kaynak = kodu(dosya)
      expect(kaynak, dosya).not.toContain('getPayload')
      expect(kaynak, dosya).not.toContain('payload.create')
    }
  })

  it('`robots.txt` ve `sitemap.xml` insan sayacında YOK, bot sayacında VAR', () => {
    /**
     * ⚠️ İnsan için ziyaret değil; bot için en doğrudan SEO sinyali —
     * "Googlebot site haritasını en son ne zaman çekti" sorusunun cevabı
     * yalnızca o iki istekte var.
     */
    expect(sayilirMi('/robots.txt')).toBe(false)
    expect(sayilirMi('/sitemap.xml')).toBe(false)
    expect(BOT_EK_YOLLARI).toContain('/robots.txt')
    expect(BOT_EK_YOLLARI).toContain('/sitemap.xml')
    expect(proxy).toContain('BOT_EK_YOLLARI.includes(rotaAnahtari(yol))')
  })

  it('bot hatası insan hata oranına girmiyor', () => {
    const kaynak = kodu('src/instrumentation.ts')
    const basla = kaynak.indexOf('botKimligi(userAgent)')
    expect(basla).toBeGreaterThan(-1)
    // Bot dalı `botDurumSay` çağırıp DÖNÜYOR; `hataSay` ancak insanda çalışıyor.
    expect(kaynak.slice(basla)).toMatch(/botDurumSay\('5xx'\)[\s\S]{0,60}?return/)
  })
})

describe('tampon — bot sayaçları', () => {
  beforeEach(() => tamponuSifirla())

  it('bot isteği insan sayaçlarını artırmıyor', () => {
    botSay({ rota: '/mahalleler/muhittin', kimlik: { sinif: 'googlebot', ad: 'Googlebot' } })
    const t = tamponuOku()
    expect(t?.botToplam).toBe(1)
    // İnsan tarafı KIPIRDAMADI.
    expect(t?.toplamIstek).toBe(0)
    expect(t?.sayfaGoruntuleme.size).toBe(0)
    expect(t?.cihaz.size).toBe(0)
    expect(t?.tarayici.size).toBe(0)
  })

  it('ilk tarama en küçük, son tarama en büyük zaman', () => {
    const kimlik = { sinif: 'googlebot' as const, ad: 'Googlebot' }
    botSay({ rota: '/portfoy', kimlik, an: 2_000 })
    botSay({ rota: '/portfoy', kimlik, an: 1_000 })
    botSay({ rota: '/portfoy', kimlik, an: 3_000 })
    const ozet = tamponuOku()?.botSayfa.get('/portfoy')
    expect(ozet).toEqual({ adet: 3, ilkMs: 1_000, sonMs: 3_000 })
  })

  it('yalnızca bot gelen gün de boşaltılıyor', () => {
    /**
     * ⚠️ Koşula girmeseydi, yalnızca bot gelen bir günde (yeni site, gece
     * saatleri) tampon hiç boşalmaz ve tarama verisi bellekte birikip
     * yeniden başlatmada giderdi — hem de hatasız görünerek.
     */
    botSay({ rota: '/', kimlik: { sinif: 'bingbot', ad: 'Bingbot' } })
    const icerik = bosalt()
    expect(icerik).not.toBeNull()
    expect(icerik?.botToplam).toBe(1)
  })

  it('durum sayacı yalnızca gözlenebilen kodları taşıyor', () => {
    botDurumSay('404')
    botDurumSay('404')
    botDurumSay('5xx')
    const t = tamponuOku()
    expect(t?.botDurum.get('404')).toBe(2)
    expect(t?.botDurum.get('5xx')).toBe(1)
    // "200" diye bir sayaç YOK: vekil katmanı yanıtı görmüyor, türetiliyor.
    expect(t?.botDurum.has('200')).toBe(false)
  })
})

describe('yazıcı — birleştirme kipleri', () => {
  const yazici = kodu('src/lib/olcum/yazici.ts')

  it('ilk tarama en KÜÇÜK, son tarama en BÜYÜK olarak birleşiyor', () => {
    /**
     * ⚠️ Kural eskiden tek satırdı: `ad === 'enYavasMs' ? max : topla`.
     * `ilkMs` toplanırsa ilk tarama zamanı 1970'in katlarına çıkar.
     */
    expect(yazici).toContain("{ ilkMs: 'enKucuk', sonMs: 'enBuyuk' }")
  })

  it('sıfır "yok" demek — en küçüğü ararken atlanıyor', () => {
    expect(yazici).toMatch(/filter\(\(deger\) => deger > 0\)/)
  })

  it('bot ayrımı bayrağı her yazmada işaretleniyor', () => {
    expect(yazici).toContain('botAyrimi: true')
  })
})

describe('toplama — saf aritmetik', () => {
  const gun = (ek: Partial<ReturnType<typeof satirlariCoz>[number]>) =>
    satirlariCoz([{ gun: '2026-10-01', botAyrimi: true, ...ek }])[0]!

  it('türler ve sayfalar günler arasında toplanıyor', () => {
    const toplam = botlariTopla([
      gun({
        botToplamIstek: 5,
        botIstekleri: [{ tur: 'googlebot', ad: 'Googlebot', adet: 4 }],
        botSayfalari: [{ rota: '/', adet: 4, ilkMs: 2_000, sonMs: 5_000 }],
        botDurumlari: [{ kod: '404', adet: 1 }],
      }),
      gun({
        botToplamIstek: 3,
        botIstekleri: [{ tur: 'googlebot', ad: 'Googlebot', adet: 3 }],
        botSayfalari: [{ rota: '/', adet: 3, ilkMs: 1_000, sonMs: 9_000 }],
        botDurumlari: [],
      }),
    ])

    expect(toplam.toplamIstek).toBe(8)
    expect(toplam.turler).toEqual([
      expect.objectContaining({ tur: 'googlebot', adet: 7, adlar: [] }),
    ])
    expect(toplam.sayfalar[0]?.adet).toBe(7)
    expect(toplam.sayfalar[0]?.ilk).toBe(new Date(1_000).toISOString())
    expect(toplam.sayfalar[0]?.son).toBe(new Date(9_000).toISOString())
    expect(toplam.dort04).toBe(1)
  })

  it('eksik ilk zaman 1970 yazdırmıyor', () => {
    /**
     * ⚠️ Sıfır "yok" demek, "en küçük" demek değil. Düz bir `Math.min`
     * panelde 1 Ocak 1970 yazdırırdı.
     */
    const toplam = botlariTopla([
      gun({ botSayfalari: [{ rota: '/x', adet: 1, ilkMs: 0, sonMs: 0 }] }),
      gun({ botSayfalari: [{ rota: '/x', adet: 1, ilkMs: 7_000, sonMs: 7_000 }] }),
    ])
    expect(toplam.sayfalar[0]?.ilk).toBe(new Date(7_000).toISOString())
  })

  it('`diger` sınıfı AD kırılımı taşıyor, tanınanlar taşımıyor', () => {
    const toplam = botlariTopla([
      gun({
        botIstekleri: [
          { tur: 'diger', ad: 'applebot', adet: 3 },
          { tur: 'diger', ad: 'uptimerobot', adet: 1 },
          { tur: 'bingbot', ad: 'Bingbot', adet: 9 },
        ],
      }),
    ])
    const diger = toplam.turler.find((satir) => satir.tur === 'diger')
    expect(diger?.adet).toBe(4)
    expect(diger?.adlar).toEqual([
      { ad: 'applebot', adet: 3 },
      { ad: 'uptimerobot', adet: 1 },
    ])
    expect(toplam.turler.find((satir) => satir.tur === 'bingbot')?.adlar).toEqual([])
  })

  it('ayrımı yapılmamış gün SAYILIYOR — gizlenmiyor', () => {
    /**
     * ⚠️ 11 Ekim 2026'dan önce yazılan satırlarda insan sayaçları bot
     * trafiğini de içeriyordu ve geriye dönük ayrıştırmak imkânsız.
     * Uyarıyı kaldırmak, karşılaştırmayı sessizce yanlış yapmak olurdu.
     */
    const toplam = botlariTopla([
      gun({ botAyrimi: false, botToplamIstek: 0 }),
      gun({ botAyrimi: false, botToplamIstek: 0 }),
      gun({ botAyrimi: true, botToplamIstek: 4 }),
    ])
    expect(toplam.ayrimsizGun).toBe(2)
  })

  it('bilinmeyen tür `diger`e düşüyor, satır kaybolmuyor', () => {
    const toplam = botlariTopla([gun({ botIstekleri: [{ tur: 'uydurma', ad: 'x', adet: 2 }] })])
    expect(toplam.turler).toEqual([expect.objectContaining({ tur: 'diger', adet: 2 })])
  })
})

describe('tarama kapsamı — ⭐ SEO boşluğu', () => {
  it('haritada olup taranmayan sayfalar listeleniyor', () => {
    const sonuc = kapsamiHesapla(
      ['/', '/portfoy', '/mahalleler/muhittin', '/mahalleler/alipasa'],
      ['/', '/portfoy'],
      [],
    )
    expect(sonuc.taranmamisSayfalar).toEqual(['/mahalleler/alipasa', '/mahalleler/muhittin'])
    expect(sonuc.kapsamYuzde).toBe(50)
  })

  it('robots.txt’te engelli yol SEO boşluğu SAYILMIYOR', () => {
    /**
     * ⚠️ Taramaya kapattığımız bir adresi "taranmamış" diye raporlamak,
     * kendi kararımızı arıza olarak göstermek olurdu — ve her bakışta göz
     * ardı edilen bir uyarı, uyarı olmaktan çıkar.
     */
    const sonuc = kapsamiHesapla(['/', '/stil-rehberi'], ['/'], ['/admin', '/stil-rehberi'])
    expect(sonuc.taranmamisSayfalar).toEqual([])
    expect(sonuc.kapsamYuzde).toBe(100)
  })

  it('taranan ama haritada olmayan adres de raporlanıyor', () => {
    /**
     * ⚠️ Ters yön: ya eski bir adres (yönlendirme gerekir) ya da bir yere
     * koyduğumuz kırık bağlantı.
     */
    const sonuc = kapsamiHesapla(['/', '/portfoy'], ['/', '/eski-ilan-adresi'], [])
    expect(sonuc.haritadaOlmayanlar).toEqual(['/eski-ilan-adresi'])
  })

  it('engellenen yolun ALTINDAKİ adresler de düşüyor', () => {
    const sonuc = kapsamiHesapla(['/'], ['/', '/api/olcum/olay'], ['/api'])
    expect(sonuc.haritadaOlmayanlar).toEqual([])
  })

  it('boş harita yüzde ÜRETMİYOR', () => {
    // ⚠️ Sıfıra bölmek yerine `null`: "%100 kapsam" demek yanıltıcı olurdu.
    expect(kapsamiHesapla([], ['/'], []).kapsamYuzde).toBeNull()
  })
})

describe('robots.txt durumu', () => {
  it('engellenen yollar ve harita adresi okunuyor', () => {
    const durum = robotsDurumunuCoz({
      rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] },
      sitemap: 'https://aslihangyd.com/sitemap.xml',
    })
    expect(durum.engellenenYollar).toEqual(['/admin', '/api/'])
    expect(durum.herSeyKapali).toBe(false)
    expect(durum.haritaAdresi).toBe('https://aslihangyd.com/sitemap.xml')
  })

  it('`Disallow: /` ayrıca işaretleniyor', () => {
    /**
     * ⚠️ Üretim dışı ortamın beklenen davranışı; ama üretimde görülürse
     * "neden kimse bizi taramıyor" sorusunun cevabı burada.
     */
    const durum = robotsDurumunuCoz({ rules: { userAgent: '*', disallow: '/' } })
    expect(durum.herSeyKapali).toBe(true)
    expect(durum.haritaAdresi).toBeNull()
  })
})

describe('saklama — bot verisi 180 gün', () => {
  const gorevler = kodu('src/lib/bakim/gorevler.ts')

  it('eşik 180 ve KVKK eşiğinden ayrı', () => {
    /**
     * ⚠️ İki eşik aynı sayıya çekilmemeli: 90 gün bir KVKK taahhüdü, 180
     * gün bir disk kararı. Birleştirmek, taahhüdü gevşetmek ya da diski
     * gereksiz yere daraltmak olurdu.
     */
    expect(gorevler).toContain('export const BOT_SAKLAMA_GUN = 180')
    expect(gorevler).toContain('export const OLCUM_AYRINTI_GUN = 90')
  })

  it('toplam tarama sayısı SİLİNMİYOR, kırılım siliniyor', () => {
    expect(gorevler).toContain(
      'data: { botIstekleri: [], botSayfalari: [], botDurumlari: [], botTemizlendi: true }',
    )
    expect(gorevler).not.toContain('botToplamIstek: 0')
  })

  it('künye iki eşiği birden söylüyor', () => {
    expect(oku('src/lib/bakim/kunye.ts')).toContain('olay 90, bot 180 gün')
  })
})

describe('panel bölümü', () => {
  const gorunum = oku('src/components/olcum/OlcumGorunumu.tsx')

  it('bot bölümü ayrı bir kutu ve ayrı bir pencere okuyor', () => {
    expect(gorunum).toContain('<BotBolumu')
    expect(gorunum).toContain('botRaporuGetir()')
  })

  it('bot sayılarının ziyaretçi sayılarına EKLENMEDİĞİ ekranda yazılı', () => {
    /**
     * ⚠️ Panelde iki payda yan yana duruyor; hangisinin neyi kapsadığı
     * yazılı olmazsa toplanırlar.
     */
    expect(gorunum).toContain('ziyaretçi sayılarının İÇİNDE DEĞİL')
  })

  it('200’ün türetme olduğu ekranda yazılı', () => {
    expect(gorunum).toContain('bir sayaç değil, bir türetme')
  })

  it('hiç taranmamış sayfalar bölümü var', () => {
    expect(gorunum).toContain('Hiç taranmamış sayfalar')
  })

  it('robots.txt ve site haritası durumu panelde', () => {
    expect(gorunum).toContain('robots.txt ve site haritası')
    expect(gorunum).toContain('engellenenYollar')
    expect(gorunum).toContain('sonGuncelleme')
  })

  it('ayrımsız günler uyarı olarak görünüyor', () => {
    expect(gorunum).toContain('bot.ayrimsizGun > 0')
  })
})
