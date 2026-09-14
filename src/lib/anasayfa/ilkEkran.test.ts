import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * İlk ekranın tıklanabilirliği ve panel sırasının gerçekten çizilmesi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU DOSYA, "200 DÖNDÜ DEMEK AÇILDI DEMEK DEĞİL"İN BİR ADIM ÖTESİ:
 *    ÇİZİLDİ DEMEK, TIKLANABİLİR DEMEK DEĞİL.
 *
 * 31 Ağustos 2026'da ana sayfanın iki çağrı butonu da çalışmıyordu. Sayfa
 * 200 dönüyordu, butonlar DOM'daydı, testler yeşildi, Lighthouse yüksekti.
 * Üstlerinde, hiçbir şey çizmeyen, tam genişlikte bir şeffaf katman vardı.
 *
 * Asıl denetim gerçek tarayıcıda (`scripts/gezinme-dumani.mjs`,
 * `vitrinKontrolu`). Buradakiler o denetimin dayandığı KURALLARI kaynak
 * seviyesinde kilitliyor: kural bozulursa hata, CI'da tarayıcı açılmadan
 * önce ve sebebi yazılı olarak çıkıyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

const dizin = path.dirname(fileURLToPath(import.meta.url))
const KOK = path.resolve(dizin, '../..')
const oku = (goreli: string) => readFileSync(path.join(KOK, goreli), 'utf8')

describe('çerez bandı ilk ekranı kilitlemiyor', () => {
  const banner = oku('components/cerez/CerezBanneri.tsx')

  it('tam genişlikteki sarmalayıcı tıklamayı YUTMUYOR', () => {
    /**
     * ⚠️ ÖLÇÜLDÜ: sarmalayıcı 1425 px genişliğinde ve 236 px yüksekliğinde
     * bir tıklama duvarıydı; görünen kart ise ortada, 768 px. Kartın
     * solundaki ve sağındaki alan hiçbir şey çizmeden her tıklamayı
     * yutuyordu — kullanıcının "boşluklara tıklanıyor" dediği şey.
     */
    expect(banner).toMatch(/className="pointer-events-none fixed inset-x-0 bottom-0/)
  })

  it('görünen kart tıklamayı GERİ ALIYOR', () => {
    // Sarmalayıcı kapalıysa kartın açıkça açılması şart; yoksa bandın
    // kendi düğmeleri de tıklanamaz hâle gelirdi.
    expect(banner).toMatch(/pointer-events-auto/)
  })

  /**
   * ⚠️ 14 EYLÜL 2026: ANA SAYFA CLS 0,0876 — İKİ HAFTA FARK EDİLMEDİ.
   *
   * Bayrak ve yükseklik hidrasyondan SONRA yazılıyordu; vitrin çizildikten
   * sonra kısalıyor ve bütün ilk ekran 57 px kayıyordu. Artık bayrak
   * sunucuda, kompakt yükseklik CSS'te; tarayıcıda ölçüm yalnızca
   * kullanıcının açtığı "ayrıntılı" görünümde.
   */
  it('bayrak sunucuda, ilk boyamadan önce konuyor', () => {
    const duzen = oku('app/(site)/layout.tsx')
    expect(duzen).toContain("data-cerez-bandi={onay === null ? 'acik' : undefined}")
    // Bant da aynı sunucu okumasıyla çiziliyor — ikisi ayrışamaz.
    expect(duzen).toContain('<CerezBanneri onayVar={onay !== null} />')
  })

  it("kompakt yükseklik CSS'te, tarayıcı yalnızca ayrıntılı görünümü ölçüyor", () => {
    const css = oku('app/(site)/globals.css')
    expect(css).toMatch(/\[data-cerez-bandi='acik'\] \{\s*--cerez-bandi-yuksekligi: \d+px;/)
    // Ölçüm dalı "ayrıntılı" koşulunun ARKASINDA olmalı.
    const olcumOncesi = banner.slice(0, banner.indexOf('new ResizeObserver'))
    expect(olcumOncesi).toContain('if (!ayrintili) {')
    expect(banner).toContain('getBoundingClientRect')
  })

  it('CSS tahmini hiçbir genişlikte ölçülen yüksekliğin ALTINDA değil', () => {
    /**
     * ⚠️ Altında kalırsa bant vitrinin çağrı butonlarını örter — 31 Ağustos
     * arızasının aynısı. Ölçüm (14 Eylül, yayındaki sürüm, 1 px adım):
     * genişlik aralığı → kompakt bant + 32 px.
     */
    const olculen: [number, number, number][] = [
      [320, 336, 418],
      [337, 398, 393],
      [399, 439, 369],
      [440, 522, 317],
      [523, 625, 293],
      [626, 639, 241],
      [640, 649, 313],
      [650, 752, 261],
      [753, 1920, 236],
    ]
    const css = oku('app/(site)/globals.css')
    const kurallar = [
      ...css.matchAll(
        /@media \(min-width: (\d+)px\) \{\s*\[data-cerez-bandi='acik'\] \{\s*--cerez-bandi-yuksekligi: (\d+)px;/g,
      ),
    ].map((e) => [Number(e[1]), Number(e[2])] as [number, number])
    const taban = Number(
      /\[data-cerez-bandi='acik'\] \{\s*--cerez-bandi-yuksekligi: (\d+)px;/.exec(css)?.[1],
    )
    const cssDegeri = (g: number) =>
      kurallar.filter(([asgari]) => g >= asgari).reduce((_, [, d]) => d, taban)

    expect(kurallar.length).toBeGreaterThan(5)
    const altinda: string[] = []
    for (const [bas, son, yukseklik] of olculen) {
      for (let g = bas; g <= son; g++) {
        if (cssDegeri(g) < yukseklik)
          altinda.push(`${g}px: CSS ${cssDegeri(g)} < ölçülen ${yukseklik}`)
      }
    }
    expect(altinda).toEqual([])
  })

  it('bant kapanınca bıraktığı izi TEMİZLİYOR', () => {
    // Kalan bir değişken, bant kapandıktan sonra da vitrini kısaltırdı.
    expect(banner).toContain("removeProperty('--cerez-bandi-yuksekligi')")
    expect(banner).toContain('delete kok.dataset.cerezBandi')
  })
})

describe('vitrin bandın altında kalmıyor', () => {
  const vitrin = oku('components/hero/SinematikHero.tsx')
  const css = oku('app/(site)/globals.css')

  it('vitrinin boyu bandı hesaba katıyor', () => {
    expect(vitrin).toContain('vitrin-boy')
    expect(css).toContain('calc(100svh - var(--cerez-bandi-yuksekligi, 0px))')
  })

  it('bant yokken davranış AYNI — yedek değer sıfır', () => {
    /**
     * ⚠️ Yedeksiz bir `var()` bandı olmayan her sayfada `min-height`i
     * geçersiz kılar ve vitrin tamamen çöker. Sıfır yedek, kuralı bant
     * kapalıyken `min-height: 100svh` ile birebir aynı yapıyor.
     */
    expect(css).toMatch(/var\(--cerez-bandi-yuksekligi,\s*0px\)/)
  })

  it('bant açıkken vitrin kendi boşluğunu da daraltıyor', () => {
    /**
     * ⚠️ Yalnızca `min-height` kısaltmak 1440×900'ü düzeltti ama 1280×720
     * ve mobili düzeltmedi: vitrinin 192 px'lik dikey boşluğu ve kaydırma
     * göstergesi kalan alanı tek başına aşıyor.
     */
    expect(css).toContain("[data-cerez-bandi='acik'] .vitrin-govde")
    expect(vitrin).toContain('vitrin-govde')
  })
})

describe('panel sırası gerçekten çiziliyor', () => {
  const sayfa = oku('app/(site)/page.tsx')

  it('bölümler kayıttan diziliyor, JSX sırasından değil', () => {
    /**
     * ⚠️ "Kayıt tutuluyor ama çizim onu okumuyor" bu ekranın en olası
     * sessiz arızası: panel kaydeder, sayfa varsayılan sırayı çizer ve
     * hiçbir hata çıkmaz. Döngü kaybolursa bu test kırılır.
     */
    expect(sayfa).toContain('{duzen.map((bolum) => (')
    expect(sayfa).toContain('anaSayfaDuzeniniGetir()')
  })

  it('çizim haritası anahtarla okunuyor', () => {
    expect(sayfa).toContain('bolumCizimleri[bolum.anahtar]')
  })
})

describe('mahalle sayfasının haritası gerçek', () => {
  const mahalle = oku('app/(site)/mahalleler/[slug]/page.tsx')

  it('"hazırlanıyor" kutusu yerine harita çiziliyor', () => {
    /**
     * ⚠️ Bu bir arıza değil EKSİKLİKTİ: mahalle sınırları veritabanında,
     * MapTiler anahtarı çalışır hâldeydi ve sayfaya hiçbir harita bileşeni
     * bağlanmamıştı. Yerinde sabit bir "yakında" kutusu duruyordu.
     */
    expect(mahalle).not.toContain('Etkileşimli harita hazırlanıyor')
    expect(mahalle).toContain('<MiniHarita')
  })

  it('AYNI altyapıyı kullanıyor — ikinci bir harita yazılmadı', () => {
    const mini = oku('components/mahalle/MiniHarita.tsx')
    expect(mini).toContain("import('@/components/harita/Harita3B')")
    expect(mini).toContain('noktaKatmanlari')
  })

  it('MapLibre TEMBEL iniyor', () => {
    /**
     * ⚠️ MapLibre 443 kB gzip. Mahalle sayfasını açıp haritaya hiç
     * kaydırmayan ziyaretçi bu yükü ödememeli.
     */
    const mini = oku('components/mahalle/MiniHarita.tsx')
    expect(mini).toContain('IntersectionObserver')
    expect(mini).toContain('ssr: false')
  })

  it('çizecek bir şey yoksa harita KURULMUYOR', () => {
    expect(mahalle).toContain('haritaCizilebilir')
    expect(mahalle).toContain('haritaStilAdresi() !== null')
  })

  it('katman eşlemesi KOPYALANMADI, paylaşılıyor', () => {
    /**
     * ⚠️ Kopyalanan bir eşleme, POI tipi eklendiğinde bir tarafta sessizce
     * `undefined` döner ve o tip haritadan düşer — hata vermeden.
     */
    expect(mahalle).toContain("from '@/lib/harita/noktaKatmanlari'")
    const harita = oku('app/(site)/harita/page.tsx')
    expect(harita).toContain("from '@/lib/harita/noktaKatmanlari'")
    expect(harita).not.toMatch(/^const POI_GRUPLARI/m)
  })
})
