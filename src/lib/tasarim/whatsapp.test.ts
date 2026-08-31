import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { jeton, kontrastOrani, temalariCoz } from './kontrast'

/**
 * WhatsApp marka rengi — palet dışı, ama denetimsiz değil.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU RENK PALETE AİT DEĞİL VE MARKA PANELİNDEN DEĞİŞTİRİLEMEZ.
 *
 * Aurora'nın nötr+altın skalası markanın kendi sesi; WhatsApp yeşili
 * BAŞKA BİR MARKANIN tanınma rengi. İkisini aynı skalada tutmak, paleti
 * değiştiren kişinin farkında olmadan WhatsApp'ın rengini de bozması
 * demekti.
 *
 * ⚠️ PALET DIŞI OLMAK, KONTRAST KAPISINDAN MUAF OLMAK DEĞİL.
 *
 * Marka paneli kaydedilen paletleri WCAG AA'ya karşı ölçüyor; bu iki
 * jeton o kapıdan geçmiyor çünkü panele hiç girmiyorlar. Boşluk burada
 * kapatılıyor: aynı eşikler, aynı hesap, bu sefer testle.
 *
 * ⚠️ ÖLÇÜM BEYAZ VARSAYIMINI ÇÜRÜTTÜ. "WhatsApp yeşili + beyaz metin"
 * yaygın bir refleks ve 1,98:1 veriyor — AA'nın yarısından az. Aynı
 * yeşil üzerine mürekkep 7,56:1. Doğru cevap rengi koyulaştırmak değil,
 * ön planı değiştirmekti.
 * ─────────────────────────────────────────────────────────────────────────
 */

const dizin = path.dirname(fileURLToPath(import.meta.url))
const KOK = path.resolve(dizin, '../..')

const CSS = readFileSync(path.join(KOK, 'app/(site)/globals.css'), 'utf8')
const temalar = temalariCoz(CSS)

/** Metin için WCAG AA. */
const METIN_ESIGI = 4.5
/** Bileşen sınırı için WCAG 1.4.11. */
const SINIR_ESIGI = 3

describe('WhatsApp jetonları', () => {
  it('üç jeton da tanımlı', () => {
    for (const ad of [
      '--color-whatsapp-yesil',
      '--color-whatsapp-kenar',
      '--color-whatsapp-uzeri',
    ]) {
      expect(() => jeton(temalar.acik, ad), `${ad} tanımsız`).not.toThrow()
    }
  })

  it('marka yeşili DEĞİŞMEDİ — tanınırlık bu renge bağlı', () => {
    /**
     * ⚠️ Sayı burada kilitli çünkü bu bir tasarım tercihi değil, başka bir
     * markanın kimliği. Değiştirmek gerekiyorsa bilinçli olsun.
     */
    expect(jeton(temalar.acik, '--color-whatsapp-yesil').toLowerCase()).toBe('#25d366')
  })

  it('buton metni yeşil zeminde AA geçiyor', () => {
    const zemin = jeton(temalar.acik, '--color-whatsapp-yesil')
    const on = jeton(temalar.acik, '--color-whatsapp-uzeri')
    const oran = kontrastOrani(on, zemin)

    expect(
      oran,
      `WhatsApp butonunun metni ${oran.toFixed(2)}:1 — AA için ${METIN_ESIGI} gerekiyor.\n` +
        'Beyaz metin bu zeminde 1,98:1 verir; mürekkep 7,56:1.',
    ).toBeGreaterThanOrEqual(METIN_ESIGI)
  })

  it('BEYAZ metin bu zeminde GEÇMİYOR — refleks yanlış', () => {
    /**
     * ⚠️ Bu iddia bir davranışı değil bir GEREKÇEYİ koruyor. Biri
     * "WhatsApp butonu beyaz yazılı olmalı" derse, ölçü burada duruyor.
     */
    const zemin = jeton(temalar.acik, '--color-whatsapp-yesil')
    expect(kontrastOrani('#ffffff', zemin)).toBeLessThan(METIN_ESIGI)
  })

  it('kenarlık, butonun sınırını iki temada da görünür kılıyor', () => {
    /**
     * ⚠️ Zeminin KENDİSİ yetmiyor: #25D366 açık sayfa zemininden 1,86:1
     * ayrışıyor. Kenarlık olmadan buton, ışık yansıyan bir ekranda nerede
     * bittiği görünmeyen bir leke oluyor — altın butonda yaşanan sorunun
     * aynısı.
     */
    for (const [ad, tema] of [
      ['açık', temalar.acik],
      ['koyu', temalar.koyu],
    ] as const) {
      const kenar = jeton(tema, '--color-whatsapp-kenar')
      const sayfa = jeton(tema, '--color-zemin')
      const oran = kontrastOrani(kenar, sayfa)

      expect(
        oran,
        `${ad} temada WhatsApp butonunun kenarlığı ${oran.toFixed(2)}:1 — ` +
          `WCAG 1.4.11 için ${SINIR_ESIGI} gerekiyor.`,
      ).toBeGreaterThanOrEqual(SINIR_ESIGI)
    }
  })

  it('marka panelinin palet yuvalarına GİRMİYOR', () => {
    /**
     * ⚠️ Palet skalasına karışırsa, rengi değiştiren kişi farkında olmadan
     * WhatsApp'ın tanınma rengini de bozar. Ayrılık kodla bağlı olmalı.
     */
    const yuvalar = readFileSync(path.join(KOK, 'lib/marka/yuvalar.ts'), 'utf8')
    expect(yuvalar).not.toMatch(/whatsapp/i)
  })

  it('yeşili kullanan her yer ÜÇÜNÜ BİRDEN kullanıyor', () => {
    /**
     * ─────────────────────────────────────────────────────────────────────
     * ⚠️ BU TEST BİR KEZ YANLIŞ YAZILDI VE BİR ARIZAYI ÜRETTİ.
     *
     * İlk hâli "yeşil YALNIZCA `Buton` bileşeninde geçebilir" diyordu.
     * Gerekçesi makuldü — üzerindeki metnin mürekkep olması gerektiği
     * bilgisi tek yerde dursun. Sonucu değildi: yüzen WhatsApp düğmesi bir
     * `Buton` DEĞİL (sabit, dairesel bir bağlantı) ve kural onu jetondan
     * men etti. #92 birleşti, jetonlar yayına çıktı ve sitedeki en görünür
     * WhatsApp dokunuş noktası nötr cam yüzeyinde kaldı: "hâlâ eski".
     *
     * Doğru değişmez "nerede" değil, "birlikte": yeşil zemini kullanan her
     * yer, üzerindeki ön planı ve kenarlığı da aynı üçlüden almak zorunda.
     * Yeni bir WhatsApp yüzeyi eklemek artık serbest — eksik eklemek değil.
     * ─────────────────────────────────────────────────────────────────────
     */
    const adaylar = [
      'components/ui/Buton.tsx',
      'components/duzen/YuzenWhatsapp.tsx',
      'components/duzen/Baslik.tsx',
      'components/duzen/UstSerit.tsx',
      'components/duzen/Altbilgi.tsx',
      'app/(site)/page.tsx',
      'app/(site)/iletisim/page.tsx',
    ]
    const eksikler: string[] = []

    for (const goreli of adaylar) {
      const icerik = readFileSync(path.join(KOK, goreli), 'utf8')
      if (!icerik.includes('--color-whatsapp-yesil')) continue
      if (!icerik.includes('--color-whatsapp-uzeri')) eksikler.push(`${goreli}: ön plan yok`)
      if (!icerik.includes('--color-whatsapp-kenar')) eksikler.push(`${goreli}: kenarlık yok`)
    }

    expect(eksikler, 'WhatsApp yeşili eksik eşlikçiyle kullanılmış').toEqual([])
  })

  it('yüzen düğme marka yeşilini KULLANIYOR — jeton üretip bağlamamak sayılmaz', () => {
    /**
     * ⚠️ Bu iddia doğrudan bir kullanıcı şikâyetinden doğdu: "PR birleşti
     * ama canlıda değişiklik yok". Jeton canlıdaydı; onu kullanan hiçbir
     * görünür yüzey yoktu. Bir jetonun tanımlı olması, uygulanmış olması
     * demek değil.
     */
    const yuzen = readFileSync(path.join(KOK, 'components/duzen/YuzenWhatsapp.tsx'), 'utf8')
    expect(yuzen).toContain('--color-whatsapp-yesil')
    // Eski nötr cam yüzey geri gelmesin.
    expect(yuzen).not.toMatch(/'cam text-metin fixed/)
  })

  it('gerçek WhatsApp çağrıları `whatsapp` görünümünü kullanıyor', () => {
    /**
     * ⚠️ Görünüm yalnızca stil rehberinde ve eşleştirme testinde
     * kullanılıyordu; ilan, mahalle, iletişim ve ticari sayfalarındaki
     * asıl çağrılar varsayılan altın butondaydı.
     */
    const sayfalar = [
      'app/(site)/portfoy/[slug]/page.tsx',
      'app/(site)/mahalleler/[slug]/page.tsx',
      'app/(site)/iletisim/page.tsx',
      'app/(site)/ticari/page.tsx',
    ]
    const bagsizlar = sayfalar.filter((goreli) => {
      const icerik = readFileSync(path.join(KOK, goreli), 'utf8')
      return icerik.includes('href={whatsapp}') && !icerik.includes('gorunum="whatsapp"')
    })
    expect(bagsizlar, 'WhatsApp çağrısı var ama görünümü bağlanmamış').toEqual([])
  })
})
