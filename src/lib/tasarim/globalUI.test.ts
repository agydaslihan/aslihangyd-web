import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: GLOBAL UI KURALLARININ HEPSİ SESSİZ.
 *
 * "Cam yüzey mobilde de bulanıklaştırıyor", "imleç ışığı telefona indi",
 * "beyaz metin altın bandın üstünde kaldı" — üçü de sayfayı bozmaz. İlk
 * ikisi yalnızca yavaşlatır, üçüncüsü yalnızca okunmaz yapar; hiçbiri
 * hata vermez.
 *
 * Üçüncüsü bu PR'da GERÇEKTEN yaşandı: palet terracotta'dan altına
 * dönünce `text-white` sınıfları yerinde kaldı ve 4,99:1 olan oran
 * 2,36:1'e düştü. Sınıf doğruydu, renk değişti.
 * ─────────────────────────────────────────────────────────────────────────
 */

const KOK = path.resolve(path.join(import.meta.dirname, '..', '..'))
const CSS = readFileSync(path.join(KOK, 'app/(site)/globals.css'), 'utf8')

function dosyalariTopla(dizin: string, gorece = ''): { yol: string; icerik: string }[] {
  const sonuc: { yol: string; icerik: string }[] = []
  for (const oge of readdirSync(dizin, { withFileTypes: true })) {
    if (oge.name === 'node_modules' || oge.name.startsWith('.')) continue
    const tam = path.join(dizin, oge.name)
    const yol = path.posix.join(gorece, oge.name)
    if (oge.isDirectory()) sonuc.push(...dosyalariTopla(tam, yol))
    else if (/\.tsx?$/.test(oge.name) && !/\.test\.tsx?$/.test(oge.name)) {
      sonuc.push({ yol, icerik: readFileSync(tam, 'utf8') })
    }
  }
  return sonuc
}

/** Yorumları düşürür — gerekçe metni kuralın kendisini tetiklemesin. */
function kodu(icerik: string): string {
  return icerik.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

const dosyalar = dosyalariTopla(KOK)

describe('cam yüzey', () => {
  /**
   * ⚠️ `backdrop-filter` MOBİLDE PAHALI: her karede arkasındaki katmanı
   * yeniden bulanıklaştırıyor. Şartname "ölç, gerekirse mobilde düz renge
   * düş" diyor; kurulum tam tersinden geliyor — varsayılan düz, cam
   * yalnızca geniş ekranda açılıyor.
   */
  it('cam yalnızca geniş ekranda ve @supports arkasında açılıyor', () => {
    const camBlogu = CSS.slice(CSS.indexOf('@media (min-width: 1024px)'))
    const ilkYuzElli = camBlogu.slice(0, 300)

    expect(ilkYuzElli).toContain('@supports (backdrop-filter')
    expect(ilkYuzElli).toContain('backdrop-filter: blur(')
  })

  it('cam sınıfının varsayılanı opak — destek yoksa okunur kalıyor', () => {
    const bas = CSS.indexOf('.cam {')
    const tanim = CSS.slice(bas, CSS.indexOf('}', bas))
    expect(tanim).toContain('background-color:')
    expect(tanim).not.toContain('backdrop-filter')
  })

  /**
   * ⚠️ KURAL YARIÇAPA BAĞLI, ÇÜNKÜ MALİYET ALANA VE YARIÇAPA BAĞLI.
   *
   * `backdrop-filter` maliyeti bulanıklaştırılan ALANLA ve YARIÇAPLA
   * büyüyor. 44 piksellik yuvarlak bir düğmenin arkasındaki 2–4 px
   * bulanıklık ihmal edilebilir; tam genişlikte yapışkan bir başlıkta
   * aynı şey her kaydırma karesinde ekranın tamamını yeniden işlemek
   * demek.
   *
   * Bu yüzden yasak GENİŞ yarıçaplara (`md` ve üstü): geniş yüzey isteyen
   * her yer `.cam` kullanmak zorunda ve `.cam` mobilde kendini kapatıyor.
   * Küçük yüzeylerde `sm` ve altı serbest — ama izinli dosyalarda.
   */
  /**
   * ⚠️ MUAFİYET LİSTESİ EKSİLDİ, ARTMADI: `MahalleKarti` skor rozeti
   * `.cam` sınıfına geçti. Kalan bir muafiyet, kaldırılabildiği hâlde
   * durduğunda kuralı olduğundan gevşek gösterir.
   */
  const KUCUK_CAM_IZINLI = new Set([
    // Fotoğraf üstündeki yuvarlak slider düğmeleri — 44 px.
    'components/hero/HeroKumandasi.tsx',
    // Harita üstündeki ince araç şeridi; harita zaten masaüstü ağırlıklı.
    'components/harita/HaritaSahnesi.tsx',
  ])

  it('geniş yarıçaplı backdrop-blur hiçbir yerde yazılmıyor', () => {
    const ihlaller = dosyalar
      .filter((dosya) => /\bbackdrop-blur-(md|lg|xl|2xl|3xl)\b/.test(kodu(dosya.icerik)))
      .map((dosya) => dosya.yol)

    expect(
      ihlaller,
      'Geniş bulanıklık mobilde her karede ekranın tamamını yeniden işler. ' +
        'Geniş yüzey için `.cam` kullanın — o sınıf mobilde düz renge düşüyor.',
    ).toEqual([])
  })

  it('küçük yarıçaplı backdrop-blur yalnızca izinli küçük yüzeylerde', () => {
    const ihlaller = dosyalar
      .filter((dosya) => !KUCUK_CAM_IZINLI.has(dosya.yol))
      .filter((dosya) => /\bbackdrop-blur-/.test(kodu(dosya.icerik)))
      .map((dosya) => dosya.yol)

    expect(ihlaller, 'Yeni bir cam yüzey için `.cam` sınıfını kullanın.').toEqual([])
  })
})

describe('dolu altın bandın metni', () => {
  /**
   * ⚠️ BU TEST BİR HATADAN DOĞDU.
   *
   * Palet terracotta'dan altına dönünce dolu bandın üstündeki `text-white`
   * sınıfları yerinde kaldı: eski bantta 4,99:1 olan oran altın üzerinde
   * 2,36:1'e düştü. Hiçbir test kırılmadı çünkü kontrast testi JETONLARI
   * ölçüyor, bileşende elle yazılmış sınıfı değil.
   *
   * İzinli dosyalar KOYU zeminler: fotoğraf üstü (mahalle detayı) ve
   * mürekkep bant (danışman ol). Oralarda beyaz doğru cevap.
   */
  const IZINLI = new Set([
    'app/(site)/mahalleler/[slug]/page.tsx',
    'app/(site)/danisman-ol/page.tsx',
  ])

  it('text-white yalnızca koyu zeminli izinli dosyalarda', () => {
    const ihlaller = dosyalar
      .filter((dosya) => !IZINLI.has(dosya.yol))
      .filter((dosya) => /\btext-white\b/.test(kodu(dosya.icerik)))
      .map((dosya) => dosya.yol)

    expect(
      ihlaller,
      'Beyaz metin altın bant üzerinde 2,36:1 verir. Bant kendi metin rengini ' +
        'veriyor (text-vurgu-uzeri); sınıf yazmayın.',
    ).toEqual([])
  })
})

describe('masaüstüne özel hareket', () => {
  /**
   * ⚠️ İmleç ışığı mobilde HİÇ İNMEMELİ. Bileşen kendi içinde de kapı
   * geçiyor ama asıl kazanç kodun paketlenmemesi — bu yüzden yalnızca
   * `next/dynamic` ile yükleniyor.
   */
  it('ImlecIsigi statik olarak içe aktarılmıyor', () => {
    const statik = dosyalar
      .filter((dosya) => dosya.yol !== 'components/hareket/ImlecIsigi.tsx')
      .filter((dosya) => /^\s*import\s[^\n]*ImlecIsigi['"/]/m.test(kodu(dosya.icerik)))
      .map((dosya) => dosya.yol)

    expect(statik, 'ImlecIsigi next/dynamic ile yüklenmeli').toEqual([])
  })

  /**
   * ⚠️ BU KURAL BİR ÖLÇÜMDEN DOĞDU.
   *
   * İmleç ışığı önce doğrudan düzenden `next/dynamic` ile çağrılıyordu ve
   * parçası (21 kB gzip) İLK YÜKE giriyordu: düzen bir sunucu bileşeni,
   * orada `ssr: false` kullanılamıyor ve sunucuda render edilen dinamik
   * bileşenin parçası hidrasyon için baştan isteniyor.
   *
   * Sarmalayıcı `dynamic` çağrısını KOŞULUN ARKASINA alıyor. Koşul
   * kaldırılırsa parça sessizce geri döner — bu test onu tutuyor.
   */
  it('imleç katmanı, ışığı kapı geçilmeden render etmiyor', () => {
    const kaynak = kodu(readFileSync(path.join(KOK, 'components/hareket/ImlecKatmani.tsx'), 'utf8'))

    expect(kaynak).toContain('ssr: false')
    expect(kaynak).toContain('azHareketIsteniyor()')
    expect(kaynak).toContain('masaustuMu()')
    expect(kaynak).toContain('lcpSonrasi(')

    // Koşulsuz render yok: bileşen yalnızca `etkin` olduğunda çiziliyor.
    expect(kaynak).toMatch(/if \(!etkin\) return null/)
  })

  it.each(['ImlecIsigi.tsx', 'Manyetik.tsx'])('%s masaüstü kapısını geçiyor', (ad) => {
    const kaynak = kodu(readFileSync(path.join(KOK, 'components/hareket', ad), 'utf8'))
    expect(kaynak).toContain('azHareketIsteniyor()')
    expect(kaynak).toContain('masaustuMu()')
  })
})

describe('az hareket tercihi global UI’yı da kapsıyor', () => {
  /**
   * ⚠️ Yeni bir hareket sınıfı eklenip `prefers-reduced-motion` bloğuna
   * yazılmazsa, hareket azaltma tercihi kısmen çalışır — ki bu, hiç
   * çalışmamaktan daha yanıltıcıdır: kullanıcı tercihinin uygulandığını
   * sanır.
   */
  const bloklar = CSS.split('@media (prefers-reduced-motion: reduce)').slice(1).join('\n')

  it.each(['view-transition-old', 'imlec-isigi', 'gezinme-isigi', 'zoom-kabi', 'alt-cizgi'])(
    '%s az hareket bloğunda ele alınıyor',
    (parca) => {
      expect(bloklar).toContain(parca)
    },
  )
})

describe('sayfa geçişi tarayıcı API’siyle', () => {
  /**
   * ⚠️ Şartname §5: "View Transitions API varsa onu kullan, JS ile yapma."
   * Bayrak `next.config.ts` içinde; animasyonun kendisi CSS'te. İkisinden
   * biri kaybolursa geçiş sessizce düz gezinmeye döner.
   */
  it('next.config viewTransition bayrağını açıyor', () => {
    const yapilandirma = readFileSync(path.join(KOK, '..', 'next.config.ts'), 'utf8')
    expect(kodu(yapilandirma)).toContain('viewTransition: true')
  })

  it('geçiş animasyonu CSS’te tanımlı ve yalnızca opaklık kullanıyor', () => {
    expect(CSS).toContain('::view-transition-new(root)')

    const gecis = CSS.slice(CSS.indexOf('@keyframes aurora-giris'), CSS.indexOf('/* ── Cam yüzey'))
    // Kayan bir geçiş düzeni oynatır ve CLS ölçümüne girer.
    expect(gecis).not.toContain('translate')
  })
})
