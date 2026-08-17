import { readFileSync } from 'node:fs'
import path from 'node:path'

import { beforeEach, describe, expect, it } from 'vitest'

import {
  DOGRUDAN,
  rotaAnahtari,
  sayilirMi,
  ulkeKodu,
  utmOku,
  yonlendirenAlanAdi,
} from './kimliksizlestirme'
import {
  AZAMI_ANAHTAR,
  BOSALTMA_ARALIGI_MS,
  bosalt,
  DIGER,
  gunAnahtari,
  olayAnahtari,
  olayAnahtariniCoz,
  olaySay,
  sayfaSay,
  tamponuOku,
  tamponuSifirla,
} from './tampon'
import { gecerliOlayMi, olayNiyeti, OLAYLAR, YUKSEK_NIYETLI_OLAYLAR } from './sozluk'
import { cihazSinifi, DEGERLEME_ALANLARI, fiyatBandi, fiyatBandiEtiketi } from './tipler'

const KOK = path.resolve(path.join(import.meta.dirname, '..', '..', '..'))
const oku = (yol: string) => readFileSync(path.join(KOK, yol), 'utf8')

/**
 * Yorumları çıkarır.
 *
 * ⚠️ ZORUNLU VE SEBEBİ ÖĞRETİCİ: bu dosyanın "IP okunmuyor" denetimleri ilk
 * yazıldığında KIRMIZI verdi — çünkü `proxy.ts` içindeki açıklama bloğu
 * "`x-forwarded-for` okuması YOK" cümlesini birebir içeriyor. Yani testi
 * kıran şey, testin doğruladığı kararın gerekçesiydi.
 *
 * Doğru cevap gerekçeyi silmek değil, denetimi KODA bakacak hâle getirmek.
 */
function kodu(yol: string): string {
  return oku(yol)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '')
}

/**
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU DOSYA KVKK KARARLARININ TESTİ — ÜRÜN DAVRANIŞININ DEĞİL.
 *
 * Ölçümün doğru saydığını görmek kolay; ölçmemesi gerekeni ölçmediğini
 * görmek zor. Aşağıdaki denetimlerin çoğu "şu alan YOK" biçiminde ve
 * bilinçli: bir gün biri IP eklemeye kalkarsa test kırılır ve kararın
 * gerekçesi karşısına çıkar.
 * ─────────────────────────────────────────────────────────────────────────
 */

describe('Katman A — çerezsiz ve IP’siz', () => {
  const proxy = kodu('src/proxy.ts')

  /**
   * ⚠️ ŞARTNAMENİN SERT KURALI: IP SAKLANMAZ.
   *
   * Kaynak düzeyinde aranıyor çünkü çalışma zamanında "IP okunmadı"yı
   * kanıtlamak mümkün değil: okunup atılmış olabilir. Okuma çağrısının hiç
   * bulunmaması ise kanıtlanabilir.
   */
  it('proxy IP adresine hiç dokunmuyor', () => {
    expect(proxy).not.toMatch(/\bx-forwarded-for\b/i)
    expect(proxy).not.toMatch(/\bx-real-ip\b/i)
    expect(proxy).not.toMatch(/\.ip\b/)
    expect(proxy).not.toMatch(/\bremoteAddress\b/)
  })

  /** ⚠️ Çerez YAZILMIYOR. Onay çerezi yalnızca okunuyor. */
  it('proxy hiçbir çerez yazmıyor', () => {
    expect(proxy).not.toMatch(/cookies\.set/)
    expect(proxy).not.toMatch(/Set-Cookie/i)
  })

  /** ⚠️ Oturum ya da ziyaretçi kimliği ÜRETİLMİYOR. */
  it('proxy kimlik üretmiyor', () => {
    expect(proxy).not.toMatch(/randomUUID|crypto\.|Math\.random|createHash/)
  })

  /**
   * ⚠️ User-Agent SAKLANMIYOR, iki kovaya çevriliyor. Kaynakta doğrudan
   * `ua` alanına yazan bir satır olmadığı denetleniyor.
   */
  it('User-Agent yalnızca cihaz sınıfına çevriliyor', () => {
    expect(proxy).toContain('cihazSinifi(basliklar.get(')
    expect(tamponuOku()).toBeUndefined()
  })

  /** ⚠️ Tampon şemasında kimliğe yakın hiçbir alan yok. */
  it('tampon şemasında ip/oturum alanı yok', () => {
    const tampon = kodu('src/lib/olcum/tampon.ts')
    expect(tampon).not.toMatch(/\bip\s*:/)
    expect(tampon).not.toMatch(/oturum(Id|Kimlik)/i)
  })

  /** ⚠️ Koleksiyon şemasında da yok — kod incelemesinden güçlü güvence. */
  it('koleksiyon şemasında ip/oturum alanı yok', () => {
    const koleksiyon = kodu('src/collections/GozlemGunluk.ts')
    expect(koleksiyon).not.toMatch(/name: 'ip'/)
    expect(koleksiyon).not.toMatch(/oturum/i)
    expect(koleksiyon).not.toMatch(/userAgent/i)
  })
})

describe('Katman B — onay olmadan çalışmıyor', () => {
  /**
   * ⚠️ İKİ KAPI BİRDEN, ikisi de gerekli.
   *
   * 1. Betik onay yoksa sayfaya HİÇ eklenmiyor (CLAUDE.md kural 8)
   * 2. Uç, onay çerezi yoksa olayı SAYMIYOR
   *
   * İkincisi olmasaydı uca doğrudan istek atan biri onaysız veri
   * üretebilirdi; birincisi olmasaydı betik indirilir ve "yükle sonra sus"
   * sahte bir engel olurdu.
   */
  it('bileşen sunucuda onay kapısından geçiyor', () => {
    const kapi = kodu('src/components/olcum/KatmanB.tsx')
    expect(kapi).toContain("izinVarMi(onay, 'analitik')")
    expect(kapi).toContain('return null')
    expect(kapi).toContain("import('./OlayIzleyici')")
  })

  /**
   * ⚠️ GÜVENCE BAYTTA DEĞİL, DAVRANIŞTA — ölçülerek öğrenildi.
   *
   * `next/dynamic` ayrı parça istiyor ama Turbopack izleyiciyi çerez
   * bandıyla aynı parçaya koydu; o parça her ziyaretçide yükleniyor.
   * Onaylı ve onaysız istek karşılaştırıldı, ikisinde de aynı parça
   * HTML'de görünüyor (ölçülen modül bedeli: 0,85 kB gzip).
   *
   * Dolayısıyla "tek bayt inmiyor" DENETLENEMEZ ve denetlenmemeli — yanlış
   * bir garantiyi test etmek onu doğru yapmaz. Denetlenen şey davranış:
   * bütün yan etkiler `useEffect` içinde, yani bileşen render edilmedikçe
   * hiçbir dinleyici takılmıyor ve hiçbir istek gitmiyor.
   */
  it('izleyicinin bütün yan etkileri render’a bağlı', () => {
    const izleyici = kodu('src/components/olcum/OlayIzleyici.tsx')

    // Modül düzeyinde dinleyici ya da gönderim olmamalı.
    const modulDuzeyi = izleyici.slice(0, izleyici.indexOf('export function OlayIzleyici'))
    expect(modulDuzeyi).not.toMatch(/addEventListener|sendBeacon|fetch\(/)

    // `window.__gozlemOlay` yalnızca etki içinde tanımlanıyor.
    expect(izleyici.indexOf('useEffect')).toBeLessThan(izleyici.indexOf('window.__gozlemOlay ='))
  })

  it('olay ucu onay çerezini sunucuda doğruluyor', () => {
    const uc = oku('src/app/api/olcum/olay/route.ts')
    expect(uc).toContain("izinVarMi(onay, 'analitik')")
    expect(uc).toContain('status: 204')
  })

  /**
   * ⚠️ Bileşenler kendi `fetch`'ini yazmıyor: gönderme tek yerde ve o yer
   * yalnızca onay varsa yükleniyor.
   */
  it('istemci yardımcısında ağ kodu yok', () => {
    const istemci = kodu('src/lib/olcum/istemci.ts')
    expect(istemci).not.toMatch(/fetch\(|sendBeacon/)
    expect(istemci).toContain('window.__gozlemOlay?.(')
  })

  /**
   * ⚠️ OTURUM KİMLİĞİ SUNUCUYA GİTMİYOR. Tekilleştirme tarayıcıda
   * (`sessionStorage`) yapılıyor; gövdede kimlik alanı yok.
   */
  it('olay gövdesi yalnızca ad ve ayrıntı taşıyor', () => {
    const uc = kodu('src/app/api/olcum/olay/route.ts')
    const govde = uc.slice(uc.indexOf('const Govde'), uc.indexOf('const AZAMI_OLAY'))
    expect(govde).toContain('ad:')
    expect(govde).toContain('ayrinti:')
    expect(govde).not.toMatch(/oturum|session|kimlik|id:/i)
  })

  /** ⚠️ Ayrıntı serbest metin olamaz — arama sorgusu sızmasın. */
  it('ayrıntı alanı desenle kısıtlı', () => {
    expect(oku('src/app/api/olcum/olay/route.ts')).toMatch(/regex\(\/\^\[\\p\{L\}/)
  })
})

describe('istek başına veritabanı yazma yok', () => {
  /**
   * ⚠️ ŞARTNAMENİN SERT KURALI. Proxy'de ya da sayaçta bir veritabanı
   * çağrısı belirirse bu test kırılır — ve o çağrı, ölçümün ölçtüğü şeyi
   * bozmaya başladığı andır.
   */
  it('proxy ve tampon veritabanına dokunmuyor', () => {
    for (const dosya of ['src/proxy.ts', 'src/lib/olcum/tampon.ts']) {
      const kaynak = kodu(dosya)
      expect(kaynak, dosya).not.toMatch(/getPayload|payload\.(create|update|find)|db\.execute/)
    }
  })

  it('yazma yalnızca zamanlayıcıdan ve kapanıştan tetikleniyor', () => {
    const kancalar = oku('src/instrumentation.ts')
    expect(kancalar).toContain('setInterval')
    expect(kancalar).toContain('tamponuYaz')
    // Aralık makul: dakikadan sık yazmak istek başına yazmaya yaklaşırdı.
    expect(BOSALTMA_ARALIGI_MS).toBeGreaterThanOrEqual(60_000)
  })

  /** ⚠️ `unref()` olmadan süreç kapanmaz ve dağıtım kilitlenir. */
  it('zamanlayıcı süreci canlı tutmuyor', () => {
    expect(oku('src/instrumentation.ts')).toContain('.unref()')
  })
})

describe('tampon', () => {
  beforeEach(() => tamponuSifirla())

  const kayit = (rota: string) => ({
    rota,
    yonlendiren: 'instagram.com',
    cihaz: 'mobil' as const,
    ulke: 'TR',
    utmKaynak: null,
    sureMs: 12,
    hataMi: false,
  })

  it('sayar ve boşaltınca sıfırlanır', () => {
    sayfaSay(kayit('/portfoy'))
    sayfaSay(kayit('/portfoy'))
    sayfaSay(kayit('/'))

    const icerik = bosalt()
    expect(icerik?.toplamIstek).toBe(3)
    expect(icerik?.sayfaGoruntuleme.get('/portfoy')).toBe(2)

    // Boşaltma sonrası yeni tampon boş.
    expect(bosalt()).toBeNull()
  })

  /**
   * ⚠️ ANAHTAR SINIRI BİR GÜVENLİK ÖNLEMİ.
   *
   * Yönlendiren başlığı dışarıdan geliyor; sınırsız bir `Map` uydurma
   * başlıklarla doldurulup belleği tüketebilirdi. Sınır aşıldığında sayım
   * DOĞRU kalıyor, yalnızca ayrıntı "diğer" kovasına düşüyor.
   */
  it('anahtar sınırı aşıldığında toplam bozulmuyor', () => {
    const adet = AZAMI_ANAHTAR + 50
    for (let i = 0; i < adet; i += 1) {
      sayfaSay({ ...kayit('/x'), yonlendiren: `saldiri-${i}.example` })
    }

    const icerik = bosalt()
    expect(icerik?.toplamIstek).toBe(adet)
    expect(icerik?.yonlendiren.size).toBeLessThanOrEqual(AZAMI_ANAHTAR + 1)
    expect(icerik?.yonlendiren.get(DIGER)).toBe(50)

    const toplam = [...(icerik?.yonlendiren.values() ?? [])].reduce((t, s) => t + s, 0)
    expect(toplam).toBe(adet)
  })

  it('olay anahtarı kurulup aynı şekilde çözülüyor', () => {
    const anahtar = olayAnahtari('filtre_uygulandi', 'mahalle', 'orta')
    expect(olayAnahtariniCoz(anahtar)).toEqual({
      ad: 'filtre_uygulandi',
      ayrinti: 'mahalle',
      niyet: 'orta',
    })
  })

  /** ⚠️ Ayırıcı ayrıntıda geçemez; geçerse anahtar bölünüp bozulurdu. */
  it('ayrıntıdaki ayırıcı temizleniyor', () => {
    const cozum = olayAnahtariniCoz(olayAnahtari('filtre_uygulandi', 'a|b', 'orta'))
    expect(cozum.ayrinti).toBe('a/b')
    expect(cozum.niyet).toBe('orta')
  })

  it('olaylar niyetiyle birlikte sayılıyor', () => {
    olaySay('whatsapp_tikla', null, 'yuksek')
    olaySay('whatsapp_tikla', null, 'yuksek')
    const icerik = bosalt()
    expect(icerik?.niyet.get('yuksek')).toBe(2)
  })

  /** ⚠️ Gün anahtarı Europe/Istanbul — UTC gün sınırı raporu kaydırırdı. */
  it('gün anahtarı yerel gün', () => {
    // 31 Aralık 22:00 UTC → Türkiye'de 1 Ocak.
    expect(gunAnahtari(new Date('2026-12-31T22:00:00Z'))).toBe('2027-01-01')
    expect(gunAnahtari(new Date('2026-08-17T10:00:00Z'))).toBe('2026-08-17')
  })
})

describe('kimliksizleştirme', () => {
  /** ⚠️ Tam URL değil, yalnızca alan adı. */
  it('yönlendirenden yalnızca alan adı alınıyor', () => {
    expect(yonlendirenAlanAdi('https://www.instagram.com/p/xyz?u=1', 'aslihangyd.com')).toBe(
      'instagram.com',
    )
    expect(yonlendirenAlanAdi('https://t.co/abc', 'aslihangyd.com')).toBe('t.co')
  })

  /** İç gezinme bir kaynak değil. */
  it('kendi alan adı doğrudan sayılıyor', () => {
    expect(yonlendirenAlanAdi('https://aslihangyd.com/portfoy', 'aslihangyd.com')).toBe(DOGRUDAN)
    expect(yonlendirenAlanAdi('https://www.aslihangyd.com/x', 'aslihangyd.com')).toBe(DOGRUDAN)
    expect(yonlendirenAlanAdi(null, 'aslihangyd.com')).toBe(DOGRUDAN)
    expect(yonlendirenAlanAdi('bozuk', 'aslihangyd.com')).toBe(DOGRUDAN)
  })

  /** ⚠️ Sorgu dizesi atılıyor: filtreli adres tek başına ayırt edici olabilir. */
  it('rota anahtarı sorgusuz ve tekilleştirilmiş', () => {
    expect(rotaAnahtari('/portfoy?tip=satilik')).toBe('/portfoy')
    expect(rotaAnahtari('/portfoy/')).toBe('/portfoy')
    expect(rotaAnahtari('/')).toBe('/')
  })

  /** Panel, API ve varlıklar ziyaret değildir. */
  it('sayılmayacak yollar süzülüyor', () => {
    expect(sayilirMi('/portfoy')).toBe(true)
    expect(sayilirMi('/mahalleler/muhittin')).toBe(true)
    expect(sayilirMi('/admin')).toBe(false)
    expect(sayilirMi('/admin/globals/marka-gorunum')).toBe(false)
    expect(sayilirMi('/api/olcum/olay')).toBe(false)
    expect(sayilirMi('/_next/static/x.js')).toBe(false)
    expect(sayilirMi('/favicon.ico')).toBe(false)
    expect(sayilirMi('/robots.txt')).toBe(false)
  })

  /** ⚠️ UTM etiketleri kısaltılıyor: etikete kimlik gömülmesin. */
  it('UTM okunuyor ve kısaltılıyor', () => {
    const sorgu = new URLSearchParams({
      utm_source: 'Instagram',
      utm_medium: 'story',
      utm_campaign: 'x'.repeat(80),
      utm_term: 'gizli',
    })
    const utm = utmOku(sorgu)
    expect(utm.kaynak).toBe('instagram')
    expect(utm.ortam).toBe('story')
    expect(utm.kampanya?.length).toBe(40)
    // `utm_term` bilinçli olarak okunmuyor.
    expect(Object.keys(utm)).toEqual(['kaynak', 'ortam', 'kampanya'])
  })

  it('ülke kodu doğrulanıyor', () => {
    expect(ulkeKodu('tr')).toBe('TR')
    expect(ulkeKodu(null)).toBe('XX')
    expect(ulkeKodu('uydurma')).toBe('XX')
  })

  it('cihaz sınıfı iki kovaya ayrılıyor', () => {
    expect(cihazSinifi('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')).toBe('mobil')
    expect(cihazSinifi('Mozilla/5.0 (X11; Linux x86_64)')).toBe('masaustu')
    expect(cihazSinifi(null)).toBe('masaustu')
  })
})

describe('olay sözlüğü', () => {
  /** ⚠️ Uydurma olay adı sayılmaz — panel kirletilemez. */
  it('yalnızca sözlükteki adlar geçerli', () => {
    expect(gecerliOlayMi('whatsapp_tikla')).toBe(true)
    expect(gecerliOlayMi('uydurma_olay')).toBe(false)
    expect(gecerliOlayMi(42)).toBe(false)
  })

  it('niyet sınıfı sözlükten geliyor', () => {
    expect(olayNiyeti('whatsapp_tikla')).toBe('yuksek')
    expect(olayNiyeti('kaydirma_derinligi')).toBe('dusuk')
  })

  it('adlar benzersiz', () => {
    const adlar = OLAYLAR.map((olay) => olay.ad)
    expect(new Set(adlar).size).toBe(adlar.length)
  })

  it('yüksek niyet listesi sözlükten türetiliyor', () => {
    expect(YUKSEK_NIYETLI_OLAYLAR).toContain('whatsapp_tikla')
    expect(YUKSEK_NIYETLI_OLAYLAR).not.toContain('kaydirma_derinligi')
  })

  /**
   * ⚠️ SÖZLÜKTEKİ HER OLAY GERÇEKTEN GÖNDERİLİYOR OLMALI.
   *
   * Hiç gönderilmeyen bir olay panelde "0" olarak görünür ve okuyan kişi
   * "bu hiç olmuyor" sonucuna varır — oysa ölçülmüyordur. Yanlış sıfır,
   * eksik satırdan tehlikeli.
   */
  it('her olay kaynakta en az bir yerden gönderiliyor', () => {
    const kaynaklar = [
      'src/components/olcum/OlayIzleyici.tsx',
      'src/components/degerleme/DegerlemeSihirbazi.tsx',
      'src/components/eslestirme/EslestirmeTesti.tsx',
      'src/components/talep/TalepFormu.tsx',
      'src/components/harita/HaritaSahnesi.tsx',
      'src/components/hero/HeroKumandasi.tsx',
      'src/components/ilan/IlanFiltreleri.tsx',
      'src/components/ilan/FiltrePaneli.tsx',
      'src/components/ilan/IlanKarti.tsx',
      'src/components/hesaplayici/Kabuk.tsx',
      'src/components/olcum/KullanimIsareti.tsx',
      'src/components/ui/KilitliKart.tsx',
      'src/components/duzen/Baslik.tsx',
      'src/components/duzen/UstSerit.tsx',
      'src/components/duzen/Altbilgi.tsx',
      'src/app/(site)/portfoy/page.tsx',
      'src/app/(site)/portfoy/[slug]/page.tsx',
    ]
      .map((yol) => oku(yol))
      .join('\n')

    const eksik = OLAYLAR.filter((olay) => !kaynaklar.includes(olay.ad)).map((olay) => olay.ad)
    expect(
      eksik,
      'Bu olaylar sözlükte var ama hiçbir yerden gönderilmiyor; panelde yanlış bir "0" ' +
        'olarak görünürler.',
    ).toEqual([])
  })
})

describe('değerleme alanları', () => {
  /**
   * ⚠️ HUNİ SIRASI FORMUN SIRASIYLA AYNI OLMAK ZORUNDA.
   *
   * Ayrışırsa huni yanlış yerde düşüş gösterir ve yanlış alan düzeltilir —
   * ölçümün en pahalı hata türü, çünkü yanlış işe kaynak harcatır.
   */
  it('sıra formdaki alan sırasıyla aynı', () => {
    const form = oku('src/components/degerleme/DegerlemeSihirbazi.tsx')
    const blok = form.slice(form.indexOf('const alanlar:'), form.indexOf('for (const [anahtar'))

    const formSirasi = [...blok.matchAll(/\['([a-zA-Z0-9]+)',/g)].map((eslesme) => eslesme[1])
    expect(formSirasi).toEqual(DEGERLEME_ALANLARI.map((alan) => alan.anahtar))
  })
})

describe('fiyat bantları', () => {
  /** ⚠️ Tam değer değil bant: mahalle ve zamanla birleşince ayırt edici olurdu. */
  it('değer doğru banda düşüyor', () => {
    expect(fiyatBandi(500_000)?.anahtar).toBe('b0-1')
    expect(fiyatBandi(4_237_500)?.anahtar).toBe('b3-5')
    expect(fiyatBandi(50_000_000)?.anahtar).toBe('b10ust')
    expect(fiyatBandi(-1)).toBeNull()
    expect(fiyatBandi(Number.NaN)).toBeNull()
  })

  /**
   * ⚠️ Olayla ANAHTAR gidiyor, etiket değil: etiketler "₺" ve tire içeriyor
   * ve ayrıntı süzgeci onları temizlediğinde "35mn" gibi anlamsız satırlar
   * üretiliyordu.
   */
  it('anahtarlar süzgeçten geçebilir', () => {
    for (const bant of [fiyatBandi(1), fiyatBandi(10_000_000)]) {
      expect(bant?.anahtar).toMatch(/^[\p{L}\p{N}._/-]+$/u)
    }
    expect(fiyatBandiEtiketi('b3-5')).toBe('3–5 mn ₺')
    expect(fiyatBandiEtiketi('bilinmeyen')).toBe('bilinmeyen')
  })
})

/**
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BOŞ PANEL BİR CEVAP DEĞİL, BİR SORU DOĞURUR.
 *
 * Panel ilk açıldığında boş geldi ve akla gelen ilk soru "bozuk mu?" oldu.
 * Cevabı vermek için sunucuya bağlanıp tabloya bakmak gerekti — yani
 * panelin var olma sebebiyle çelişen bir iş.
 *
 * Ölçüldü: Katman A hem yerelde hem ÜRETİM İMAJINDA (standalone) doğru
 * sayıyor — 14 istek gönderildi, 14'ü yazıldı. Yani arıza yoktu, ekran
 * ayırt edemiyordu.
 * ─────────────────────────────────────────────────────────────────────────
 */
describe('boş durum tanısı', () => {
  const gorunum = oku('src/components/olcum/OlcumGorunumu.tsx')
  const rapor = oku('src/lib/olcum/rapor.ts')

  it('rapor tanı bilgisi taşıyor', () => {
    for (const alan of [
      'sonYazma',
      'gunKaydi',
      'bekleyenIstek',
      'bekleyenOlay',
      'yazmaAraligiSn',
    ]) {
      expect(rapor, alan).toContain(alan)
    }
  })

  /**
   * ⚠️ ASIL AYIRT EDİCİ BU: bellekte bekleyen sayı, veritabanı boşken bile
   * "ölçüm çalışıyor" diyebilmenin tek doğrudan yolu. Yalnızca son yazma
   * zamanına bakılsaydı, hiç yazılmamış bir sistemle bozuk bir sistem aynı
   * görünürdü.
   */
  it('tanı bellekteki tamponu okuyor', () => {
    expect(rapor).toContain('tamponuOku()')
  })

  it('boş durum beklenen metni ve tanıyı gösteriyor', () => {
    expect(gorunum).toContain('Henüz veri toplanmadı')
    expect(gorunum).toContain('saniyede bir')
    expect(gorunum).toContain('Son yazma')
    expect(gorunum).toContain('Bellekte bekleyen')
  })

  /** Boş durumda rakam yığını çizilmemeli — asıl şikâyet buydu. */
  it('veri yokken diğer bölümler çizilmiyor', () => {
    expect(gorunum).toContain('{rapor.bos ? <BosDurum tani={rapor.tani} /> : null}')
    expect(gorunum).toContain('{rapor.bos ? null : (')
  })

  /** ⚠️ Saat yerel olmalı; UTC göstermek "yazılmıyor" izlenimi verirdi. */
  it('zaman Europe/Istanbul ile yazılıyor', () => {
    expect(gorunum).toContain("timeZone: 'Europe/Istanbul'")
  })
})
