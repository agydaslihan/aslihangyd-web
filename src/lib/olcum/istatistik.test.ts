import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  DERINLIK_BANTLARI,
  DERINLIK_TEMSILCISI,
  EKRAN_BANTLARI,
  YOL_ADIM_SINIRI,
  derinlikBandi,
  ekranBandi,
  yolAdimi,
  yolDizisi,
} from './bantlar'
import {
  KAYNAK_TURU_ETIKETI,
  aramaMotoruAdi,
  girisMi,
  kaynakTuru,
  saatKovasi,
  sehirAdi,
  tarayiciAilesi,
  SEHIR_BILINMIYOR,
} from './kimliksizlestirme'
import { ASGARI_SEHIR, ASGARI_YOL, kAnonim } from './rapor'
import { OLAYLAR } from './sozluk'

/**
 * Web istatistikleri raporlarının KVKK sınırları.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU DOSYA BİR ÖZELLİK TESTİ DEĞİL, BİR SINIR TESTİ.
 *
 * Eklenen her yeni rapor (giriş/çıkış sayfası, yol dizisi, şehir, tarayıcı,
 * ekran) tek başına masum. Tehlike birleşimde: çözünürlük + tarayıcı +
 * saat + gezinme sırası, literatürde tarayıcı parmak izi diye geçen şeyin
 * ta kendisi ve tek bir ziyaretçiyi ayırt etmeye yeter.
 *
 * Bu yüzden her boyut ya BANT ya da k-anonimlik eşiğine tabi. Aşağıdaki
 * iddialar o kararların kodla bağlı olduğunu doğruluyor — bir gün biri
 * "ham değer daha faydalı olur" derse test kırılsın.
 * ─────────────────────────────────────────────────────────────────────────
 */

const dizin = path.dirname(fileURLToPath(import.meta.url))
const KOK = path.resolve(dizin, '../../..')
const kodu = (goreli: string) => readFileSync(path.join(KOK, goreli), 'utf8')

/**
 * ⚠️ YORUMLAR ÇIKARILIYOR — bu tuzağa daha önce iki kez düşüldü.
 *
 * `proxy.ts` başında "burada bilinçli olarak BULUNMAYAN şeyler" diye bir
 * liste var ve içinde `x-forwarded-for` geçiyor. Ham metinde arayan bir
 * denetim, yasağı ANLATAN cümleyi ihlal sanıyor. Aynı hata `soft404` ve
 * `pinYalitimi` testlerinde de yaşandı.
 */
const govde = (goreli: string) =>
  kodu(goreli)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

describe('tarayıcı ailesi — sürüm taşımıyor', () => {
  it.each([
    ['Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/141.0.0.0 Safari/537.36', 'chrome'],
    ['Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15', 'safari'],
    ['Mozilla/5.0 (X11; Linux) Gecko/20100101 Firefox/130.0', 'firefox'],
    ['Mozilla/5.0 (Windows NT 10.0) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', 'edge'],
    ['Mozilla/5.0 (Linux; Android 14) SamsungBrowser/23.0 Chrome/115 Safari/537.36', 'samsung'],
    ['curl/8.5.0', 'diger'],
    [null, 'diger'],
  ])('%s → %s', (ua, beklenen) => {
    expect(tarayiciAilesi(ua)).toBe(beklenen)
  })

  it('döndürdüğü değer hiçbir zaman sürüm numarası içermiyor', () => {
    /**
     * ⚠️ Sürüm + çözünürlük + saat = parmak izi. Kova sayısı altı ve
     * hiçbiri rakam taşımıyor.
     */
    const ornekler = [
      'Chrome/141.0.7390.54',
      'Safari/605.1.15 Version/17.4.1',
      'Firefox/130.0.1',
      'Edg/141.0.0.0',
    ]
    for (const ua of ornekler) {
      expect(tarayiciAilesi(ua)).not.toMatch(/\d/)
    }
  })
})

describe('şehir adı — serbest metin olamaz', () => {
  it('boş ya da tanımsız değer bilinmiyora düşüyor', () => {
    expect(sehirAdi(null)).toBe(SEHIR_BILINMIYOR)
    expect(sehirAdi('')).toBe(SEHIR_BILINMIYOR)
    expect(sehirAdi('   ')).toBe(SEHIR_BILINMIYOR)
  })

  it('harf ve boşluk dışındaki her şeyi atıyor', () => {
    /**
     * ⚠️ Başlık DIŞARIDAN geliyor. Sahte bir `CF-IPCity` başlığıyla
     * veritabanına serbest metin (hatta kimlik) yazdırmak mümkün olmamalı.
     */
    expect(sehirAdi('Çorlu')).toBe('Çorlu')
    expect(sehirAdi('Tekirdağ ')).toBe('Tekirdağ')
    expect(sehirAdi('user@example.com')).toBe('userexamplecom')
    expect(sehirAdi('192.168.1.1')).toBe(SEHIR_BILINMIYOR)
    expect(sehirAdi('<script>alert(1)</script>')).toBe('scriptalertscript')
  })

  it('uzunluk sınırlı — kimlik gömülemez', () => {
    expect(sehirAdi('A'.repeat(500)).length).toBeLessThanOrEqual(40)
  })
})

describe('giriş sayfası — oturum kimliği olmadan', () => {
  it('yönlendiren yoksa giriş sayılıyor', () => {
    expect(girisMi(null, 'aslihangyd.com')).toBe(true)
    expect(girisMi('', 'aslihangyd.com')).toBe(true)
  })

  it('başka siteden geliyorsa giriş sayılıyor', () => {
    expect(girisMi('https://www.google.com/search?q=corlu', 'aslihangyd.com')).toBe(true)
    expect(girisMi('https://instagram.com/', 'aslihangyd.com')).toBe(true)
  })

  it('kendi sitemizden geliyorsa giriş SAYILMIYOR', () => {
    expect(girisMi('https://aslihangyd.com/portfoy', 'aslihangyd.com')).toBe(false)
    expect(girisMi('https://www.aslihangyd.com/portfoy', 'aslihangyd.com')).toBe(false)
    expect(girisMi('https://aslihangyd.com/', 'www.aslihangyd.com')).toBe(false)
  })

  it('PORT farkı site içi gezinmeyi giriş sanmıyor', () => {
    /**
     * ⚠️ Ölçümle yakalandı. `URL.hostname` portu taşımıyor,
     * `nextUrl.host` taşıyor; ikisi doğrudan karşılaştırıldığında standart
     * olmayan bir portta çalışan her kurulumda site içi gezinme dış
     * yönlendiren sanılıyordu.
     */
    expect(girisMi('http://127.0.0.1:3210/portfoy', '127.0.0.1:3210')).toBe(false)
    expect(girisMi('http://localhost:3000/portfoy', 'localhost:3000')).toBe(false)
  })

  it('bozuk yönlendiren sayfayı kırmıyor', () => {
    expect(girisMi('bu bir url değil', 'aslihangyd.com')).toBe(true)
  })
})

describe('saat kovası', () => {
  it('0–23 aralığında bir tam sayı', () => {
    const saat = saatKovasi(new Date('2026-08-27T12:00:00Z'))
    expect(Number.isInteger(saat)).toBe(true)
    expect(saat).toBeGreaterThanOrEqual(0)
    expect(saat).toBeLessThanOrEqual(23)
  })

  it('yerel saate göre — UTC değil', () => {
    // 21:30 UTC = ertesi gün 00:30 Europe/Istanbul (UTC+3).
    expect(saatKovasi(new Date('2026-08-27T21:30:00Z'))).toBe(0)
  })
})

describe('bantlar — ham değer sunucuya gitmiyor', () => {
  it('ekran genişliği yalnızca tanımlı bantlardan birine düşüyor', () => {
    for (const genislik of [0, 320, 639, 640, 1023, 1024, 1439, 1440, 1919, 1920, 5120]) {
      expect(EKRAN_BANTLARI).toContain(ekranBandi(genislik))
    }
  })

  it('bant sayısı AZ — çok kova ayırt edici olurdu', () => {
    expect(EKRAN_BANTLARI.length).toBeLessThanOrEqual(6)
    expect(DERINLIK_BANTLARI.length).toBeLessThanOrEqual(5)
  })

  it('oturum derinliği bandı doğru kovaya düşüyor', () => {
    expect(derinlikBandi(1)).toBe('1')
    expect(derinlikBandi(0)).toBe('1')
    expect(derinlikBandi(2)).toBe('2-3')
    expect(derinlikBandi(3)).toBe('2-3')
    expect(derinlikBandi(6)).toBe('4-6')
    expect(derinlikBandi(40)).toBe('7-ustu')
  })

  it('her derinlik bandının bir temsilci değeri var', () => {
    for (const bant of DERINLIK_BANTLARI) {
      expect(DERINLIK_TEMSILCISI[bant]).toBeGreaterThan(0)
    }
  })
})

describe('yol dizisi — ziyaretçi izi değil', () => {
  it('tek adım yol sayılmıyor', () => {
    expect(yolDizisi([])).toBeNull()
    expect(yolDizisi(['/portfoy'])).toBeNull()
  })

  it('en fazla üç adım taşıyor', () => {
    const dizi = yolDizisi(['/a', '/b', '/c', '/d', '/e'])
    expect(dizi).not.toBeNull()
    expect(dizi!.split('>')).toHaveLength(YOL_ADIM_SINIRI)
    // Son adımlar korunuyor: nereye gittiği, nereden geldiğinden değerli.
    expect(dizi).toBe('/c>/d>/e')
  })

  it('slug atılıyor — kaba adıma indirgeniyor', () => {
    /**
     * ⚠️ İki sebeple: uzunluk (olay ucu 64 karakter) ve mahremiyet (slug
     * taşıyan diziler tek ziyarete ait olacak kadar seyrekleşir).
     */
    expect(yolAdimi('/')).toBe('/')
    expect(yolAdimi('/portfoy')).toBe('/portfoy')
    expect(yolAdimi('/portfoy/demo-3-1-daire-asansorlu-otoparkli')).toBe('/portfoy.detay')
    expect(yolDizisi(['/', '/portfoy', '/portfoy/uzun-bir-ilan-slugu'])).toBe(
      '/>/portfoy>/portfoy.detay',
    )
  })

  it('aynı bölümde dolaşmak yeni adım saymıyor', () => {
    expect(yolDizisi(['/portfoy/a', '/portfoy/b', '/portfoy/c'])).toBeNull()
  })

  it('üretilen dizi olay ucunun süzgecinden GEÇİYOR', () => {
    /**
     * ⚠️ BU TESTİN SEBEBİ SOMUT: ilk kurulumda ayırıcı `' > '` idi ve olay
     * ucu boşluğa izin vermiyordu. Olay sessizce düşerdi — panelde "veri
     * yok" görünür, sebebi hiçbir yerde yazmazdı.
     */
    const SUZGEC = /^[\p{L}\p{N}._/>-]*$/u
    const dizi = yolDizisi(['/', '/portfoy', '/portfoy/bir-ilan'])
    expect(dizi).not.toBeNull()
    expect(SUZGEC.test(dizi!)).toBe(true)
    expect(dizi!.length).toBeLessThanOrEqual(64)

    for (const bant of DERINLIK_BANTLARI) expect(SUZGEC.test(bant)).toBe(true)
    for (const bant of EKRAN_BANTLARI) expect(SUZGEC.test(bant)).toBe(true)
  })

  it('adım sınırı üçten büyük değil', () => {
    /**
     * ⚠️ Dizi uzadıkça olası kombinasyon sayısı çarpım hızıyla artıyor;
     * yeterince uzun bir dizi tek bir ziyarete ait olacak kadar seyrekleşir
     * ve toplulaştırılmış olmaktan çıkar.
     */
    expect(YOL_ADIM_SINIRI).toBeLessThanOrEqual(3)
  })
})

describe('k-anonimlik', () => {
  it('eşiğin altındaki satırları "diğer"e topluyor, ATMIYOR', () => {
    const harita = new Map([
      ['İstanbul', 120],
      ['Çorlu', 40],
      ['Çerkezköy', 2],
      ['Saray', 1],
    ])
    const sonuc = kAnonim(harita, 5)

    expect(sonuc.get('Çerkezköy')).toBeUndefined()
    expect(sonuc.get('Saray')).toBeUndefined()
    expect(sonuc.get('Diğer')).toBe(3)

    // ⚠️ Toplam korunuyor: ayrıntı gizleniyor, sayı gizlenmiyor.
    const once = [...harita.values()].reduce((t, s) => t + s, 0)
    const sonra = [...sonuc.values()].reduce((t, s) => t + s, 0)
    expect(sonra).toBe(once)
  })

  it('hepsi eşiğin üstündeyse hiçbir şey değişmiyor', () => {
    const harita = new Map([['İstanbul', 10]])
    expect([...kAnonim(harita, 5)]).toEqual([['İstanbul', 10]])
  })

  it('şehir eşiği 5, yol eşiği en az 2', () => {
    /**
     * ⚠️ Bu sayılar "ayar" değil KVKK kararı. Düşürülmesi, kararın
     * gevşetilmesidir; testin kırılması o kararın bilinçli alınmasını
     * zorunlu kılıyor.
     */
    expect(ASGARI_SEHIR).toBeGreaterThanOrEqual(5)
    expect(ASGARI_YOL).toBeGreaterThanOrEqual(2)
  })
})

describe('yeni raporların KVKK sınırı — kaynak denetimi', () => {
  it('kendi alan adı `Host` başlığından okunuyor', () => {
    /**
     * ⚠️ `nextUrl.host` yapılandırılmış ana bilgisayar adını veriyor,
     * isteğin gerçekte hangi adrese yapıldığını değil. Ölçümle yakalandı:
     * site içi geçişlerin tamamı "giriş sayfası" sayılıyordu.
     */
    const proxy = govde('src/proxy.ts')
    expect(proxy).toContain("basliklar.get('host')")
    expect(proxy).toContain("girisMi(basliklar.get('referer'), kendiHost)")
    expect(proxy).toContain("yonlendirenAlanAdi(basliklar.get('referer'), kendiHost)")
  })

  it('proxy ham User-Agent’ı yazmıyor, kovaya çeviriyor', () => {
    const proxy = kodu('src/proxy.ts')
    expect(proxy).toContain('tarayiciAilesi(basliklar.get(')
    // Ham başlık doğrudan bir alana atanmamalı.
    expect(proxy).not.toMatch(/userAgent:\s*basliklar\.get/)
  })

  it('Cloudflare konum başlıklarından YALNIZCA ülke ve şehir okunuyor', () => {
    /**
     * ─────────────────────────────────────────────────────────────────
     * ⚠️ "Add visitor location headers" AÇILINCA GELEN ŞEY ŞEHİRDEN
     *    İBARET DEĞİL.
     *
     * Cloudflare o ayarla birlikte `CF-Region`, `CF-Region-Code`,
     * `CF-Postal-Code`, `CF-IPLatitude`, `CF-IPLongitude`, `CF-Timezone`
     * ve `CF-Metro-Code` başlıklarını da gönderiyor. Hepsi bedava
     * görünüyor ve hiçbiri okunmuyor — bilinçli.
     *
     * ⚠️ POSTA KODU ÇORLU ÖLÇEĞİNDE TEK MAHALLEYİ İŞARET EDER. Gün ve
     * sayfayla birleştiğinde "o mahalledeki o kişi" demektir; k-anonimlik
     * eşiği bile kurtarmaz çünkü sorun toplulaştırmada değil, alanın
     * çözünürlüğünde. Enlem/boylam daha da kötü.
     *
     * Bu iddia, "madem geliyor, kaydedelim" refleksine karşı duruyor.
     * ─────────────────────────────────────────────────────────────────
     */
    const proxy = govde('src/proxy.ts')

    expect(proxy).toContain("basliklar.get('cf-ipcountry')")
    expect(proxy).toContain("basliklar.get('cf-ipcity')")

    const YASAK = [
      'cf-region',
      'cf-region-code',
      'cf-postal-code',
      'cf-iplatitude',
      'cf-iplongitude',
      'cf-timezone',
      'cf-metro-code',
      'cf-ipcontinent',
    ]
    const okunan = YASAK.filter((baslik) => proxy.toLowerCase().includes(baslik))
    expect(
      okunan,
      'Bu Cloudflare başlıkları okunmamalı. Posta kodu ve koordinat, Çorlu\n' +
        'ölçeğinde tek bir mahalleyi — dolayısıyla tek bir kişiyi — işaret\n' +
        'edebilir. Şehir yeterli ve k=5 eşiğiyle korunuyor.',
    ).toEqual([])
  })

  it('şema da posta kodu / bölge / koordinat alanı taşımıyor', () => {
    /**
     * ⚠️ İki kapı: okumamak (proxy) ve saklayacak yer bırakmamak (şema).
     * Biri açılırsa diğeri anlamsızlaşır — kullanıcı yetkilerindeki
     * "üç kapı" kuralının aynısı.
     */
    const koleksiyon = govde('src/collections/GozlemGunluk.ts')
    for (const alan of ['postaKodu', 'bolge', 'enlem', 'boylam', 'koordinat']) {
      expect(koleksiyon, `${alan} alanı eklenmiş`).not.toMatch(new RegExp(`name: '${alan}'`, 'i'))
    }
  })

  it('proxy IP başlıklarını hâlâ okumuyor', () => {
    const proxy = govde('src/proxy.ts')
    expect(proxy).not.toMatch(/x-forwarded-for/i)
    expect(proxy).not.toMatch(/\breq(uest)?\.ip\b/)
    expect(proxy).not.toMatch(/cf-connecting-ip/i)
  })

  it('gezinme dizisi sunucuya değil sessionStorage’a yazılıyor', () => {
    const izleyici = kodu('src/components/olcum/OlayIzleyici.tsx')
    expect(izleyici).toContain('sessionStorage')
    // Dizinin tamamı değil, yalnızca `yolDizisi()` özeti gönderiliyor.
    expect(izleyici).toContain('yolDizisi(iz)')
  })

  it('ekran ölçüsü bant olarak gönderiliyor, ham piksel olarak değil', () => {
    const izleyici = kodu('src/components/olcum/OlayIzleyici.tsx')
    expect(izleyici).toContain('ekranBandi(window.innerWidth)')
    expect(izleyici).not.toMatch(/ayrinti:\s*String\(window\.(inner|screen)/)
  })

  it('90 gün temizliği şehir kırılımını da kapsıyor', () => {
    /**
     * ⚠️ Şehir, ülkeden farklı olarak tek kişiyi işaret edebilir. Raporun
     * k-anonimlik eşiği GÖSTERİMİ kısıtlıyor, SAKLAMAYI değil.
     */
    const bakim = kodu('src/lib/bakim/gorevler.ts')
    expect(bakim).toMatch(/olaylar:\s*\[\],\s*sehirler:\s*\[\]/)
  })

  it('yeni olayların hepsi sözlükte tanımlı ve düşük niyetli', () => {
    const yeniler = ['cikis_sayfasi', 'sayfa_yolu', 'oturum_derinligi', 'ekran_bandi']
    for (const ad of yeniler) {
      const tanim = OLAYLAR.find((olay) => olay.ad === ad)
      expect(tanim, `${ad} sözlükte yok`).toBeDefined()
      /**
       * ⚠️ Bunlar KİTLE ölçümü, niyet sinyali değil. Yüksek niyet
       * işaretlenselerdi huniyi şişirir ve "lead geliyor" yanılsaması
       * üretirlerdi.
       */
      expect(tanim!.niyet, `${ad} niyet sınıfı yanlış`).toBe('dusuk')
    }
  })
})

describe('kaynak türü ayrımı', () => {
  it.each([
    ['dogrudan', 'dogrudan'],
    ['google.com', 'arama'],
    ['www.google.com.tr', 'arama'],
    ['com.google.android.googlequicksearchbox', 'arama'],
    ['bing.com', 'arama'],
    ['yandex.com.tr', 'arama'],
    ['duckduckgo.com', 'arama'],
    ['l.instagram.com', 'sosyal'],
    ['t.co', 'sosyal'],
    ['lm.facebook.com', 'sosyal'],
    ['emlakhaber.example', 'referans'],
  ])('%s → %s', (alan, beklenen) => {
    expect(kaynakTuru(alan)).toBe(beklenen)
  })

  it('alan adının İÇİNDE arama yapmıyor — sonek eşliyor', () => {
    /**
     * ⚠️ `includes('google')` yazmak, `google-analytics-blog.example.com`
     * gibi bir siteyi arama motoru sayardı. Kaynak raporunun tamamı o tek
     * kısayol yüzünden yanlış olurdu.
     */
    expect(kaynakTuru('google-analytics-blog.example.com')).toBe('referans')
    expect(kaynakTuru('instagram-haberleri.example.com')).toBe('referans')
    expect(kaynakTuru('notgoogle.com')).toBe('referans')
  })

  it('arama motoru adları birleştiriliyor', () => {
    expect(aramaMotoruAdi('google.com.tr')).toBe('Google')
    expect(aramaMotoruAdi('www.google.com')).toBe('Google')
    expect(aramaMotoruAdi('yandex.ru')).toBe('Yandex')
  })

  it('tanınmayan arama motoru "diğer"e ATILMIYOR', () => {
    /**
     * ⚠️ Yeni bir motorun trafiği önce ham listede görünsün, sonra sözlüğe
     * eklensin. "Diğer" kovasına atmak, o motoru fark etmemizi engellerdi.
     */
    expect(aramaMotoruAdi('yeni-arama-motoru.example')).toBeNull()
  })

  it('dört kategori var ve hepsinin Türkçe etiketi tanımlı', () => {
    expect(Object.keys(KAYNAK_TURU_ETIKETI).sort()).toEqual([
      'arama',
      'dogrudan',
      'referans',
      'sosyal',
    ])
    for (const etiket of Object.values(KAYNAK_TURU_ETIKETI)) {
      expect(etiket.length).toBeGreaterThan(0)
    }
  })
})
