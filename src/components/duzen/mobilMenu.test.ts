import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const KOK = path.resolve(path.join(import.meta.dirname, '..', '..'))
const KAYNAK = readFileSync(path.join(KOK, 'components/duzen/Baslik.tsx'), 'utf8')

/**
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: MOBİL MENÜ AÇILMIYORDU VE CI YEŞİLDİ.
 *
 * Hamburger düğmesine basılıyor, durum değişiyor, panel DOM'a giriyordu —
 * ama görünmüyordu. Mobil ziyaretçi sitede hiçbir yere gidemiyordu.
 *
 * SEBEP BİR CSS İÇEREN BLOK KURALI:
 *
 *   · Panel `position: fixed`
 *   · Header `backdrop-blur-md` taşıyor → `backdrop-filter` uyguluyor
 *   · `backdrop-filter` (tıpkı `filter` ve `transform` gibi) uygulandığı
 *     öğeyi, `fixed` konumlu torunları için İÇEREN BLOK yapıyor
 *
 * Panel header'ın içindeyken `top-18 bottom-0` görüntü alanına değil 72
 * piksellik header kutusuna göre çözülüyordu:
 *
 *     top: 72px + bottom: 0 + içeren blok 72px  →  YÜKSEKLİK 0
 *
 * ⚠️ BU HATAYI jsdom TABANLI BİR ETKİLEŞİM TESTİ DE YAKALAYAMAZDI.
 *
 * "Düğmeye bas, panel DOM'da mı" diye soran bir test YEŞİL verirdi: panel
 * gerçekten DOM'daydı. jsdom yerleşim (layout) hesaplamıyor, dolayısıyla
 * yüksekliğin sıfır olduğunu göremez. Bu sınıf hatayı ancak gerçek bir
 * tarayıcı ya da — burada olduğu gibi — KURALIN KENDİSİNİ denetleyen
 * yapısal bir test yakalar.
 *
 * Bu yüzden aşağıdaki denetimler "tıkla ve bak" değil "kural bozulmuş mu"
 * biçiminde. Kural: `fixed` bir örtü, `backdrop-filter`/`filter`/`transform`
 * uygulayan bir atanın içinde duramaz.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** JSX'te `<header>` … `</header>` arasındaki gövde. */
function headerGovdesi(): string {
  const bas = KAYNAK.indexOf('<header')
  const son = KAYNAK.indexOf('</header>')
  expect(bas, 'Baslik.tsx içinde <header> bulunamadı').toBeGreaterThan(-1)
  expect(son, 'Baslik.tsx içinde </header> bulunamadı').toBeGreaterThan(bas)
  return KAYNAK.slice(bas, son)
}

describe('mobil menü — içeren blok tuzağı', () => {
  /**
   * ⚠️ ASIL DENETİM BU. Panel header'ın dışında çizilmeli.
   */
  it('mobil menü paneli header’ın içinde çizilmiyor', () => {
    expect(
      headerGovdesi().includes('<MobilMenu'),
      'MobilMenu <header> içinde çiziliyor. Header `backdrop-filter` uyguluyor ve ' +
        '`fixed` torunları için içeren blok oluyor: panelin yüksekliği sıfıra düşer, ' +
        'düğme çalışır ama menü görünmez.',
    ).toBe(false)
  })

  /**
   * Kuralın genel hâli: header hâlâ bulanıklık uyguluyorsa içinde `fixed`
   * bir öğe olamaz. Bulanıklığı kaldırmak da bir çözüm ama yapışkan
   * başlığın okunurluğunu bozar; hangisi seçilirse seçilsin ikisi bir arada
   * duramaz.
   */
  it('header bulanıklık uyguluyorsa içinde fixed öğe yok', () => {
    const govde = headerGovdesi()
    const bulaniklik = /backdrop-blur|backdrop-filter|\bfilter-|\btransform\b/.test(govde)
    if (!bulaniklik) return

    expect(
      /\bfixed\b/.test(govde),
      'Header `backdrop-filter`/`transform` uyguluyor ve içinde `fixed` bir öğe var. ' +
        'O öğe görüntü alanına göre değil header kutusuna göre konumlanır.',
    ).toBe(false)
  })
})

describe('mobil menü — açılıp kapanma', () => {
  it('düğme durumu çeviriyor', () => {
    expect(KAYNAK).toContain('onClick={() => setAcik((onceki) => !onceki)}')
    expect(KAYNAK).toContain('{acik ? (')
  })

  /** ⚠️ Ekran okuyucu düğmenin bir menü açtığını bilmeli. */
  it('düğme aria ile panele bağlı', () => {
    expect(KAYNAK).toContain('aria-expanded={acik}')
    expect(KAYNAK).toContain('aria-controls="mobil-gezinme"')
    expect(KAYNAK).toContain('id="mobil-gezinme"')
  })

  it('sayfa değişince menü kapanıyor', () => {
    expect(KAYNAK).toContain('if (yol !== oncekiYol) {')
    expect(KAYNAK).toContain('setAcik(false)')
  })

  /** Menü öğeleri gerçekten çiziliyor — boş bir panel açılmış sayılmaz. */
  it('menü öğeleri ve mega alt öğeleri panelde çiziliyor', () => {
    const panel = KAYNAK.slice(KAYNAK.indexOf('function MobilMenu'))
    expect(panel).toContain('menu.map((oge)')
    expect(panel).toContain('oge.mega.map((alt)')
  })
})

describe('mobil menü — klavye ve odak', () => {
  it('Escape kapatıyor', () => {
    expect(KAYNAK).toContain("if (olay.key !== 'Escape') return")
  })

  /**
   * ⚠️ ODAK TUZAĞI ZORUNLU: panel görüntü alanını kaplıyor ve arka plan
   * kilitli. Tuzak olmasaydı Tab, ziyaretçiyi GÖRÜNMEYEN bağlantılar
   * arasında dolaştırırdı — klavye kullanıcısı için menü kapalıya eşdeğer.
   */
  it('odak tuzağı var ve iki yönde sarıyor', () => {
    const panel = KAYNAK.slice(KAYNAK.indexOf('function MobilMenu'))
    expect(panel).toContain("if (olay.key !== 'Tab') return")
    expect(panel).toContain('olay.shiftKey && document.activeElement === ilk')
    expect(panel).toContain('!olay.shiftKey && document.activeElement === son')
  })

  it('açılışta odak panele taşınıyor, kapanışta düğmeye dönüyor', () => {
    const panel = KAYNAK.slice(KAYNAK.indexOf('function MobilMenu'))
    expect(panel).toContain('odaklanabilirler()[0]?.focus()')
    expect(panel).toContain('acan?.focus()')
  })

  /**
   * ⚠️ ODAK TUZAĞI, BAŞLIKTAKİ KAPATMA DÜĞMESİNİ ULAŞILMAZ YAPIYOR.
   *
   * Tuzak eklenirken fark edildi: X düğmesi panelin dışında kaldığı için
   * Tab ile ulaşılamaz hâle geldi. Escape bir çıkış yolu ama tek çıkış yolu
   * olamaz — dokunmatik ekran okuyucu kullanan biri Escape'e basamaz.
   */
  it('panelin içinde kapatma düğmesi var', () => {
    const panel = KAYNAK.slice(KAYNAK.indexOf('function MobilMenu'))
    expect(panel).toContain('onClick={onKapat}')
    expect(panel).toContain('Menüyü kapat')
  })

  /** Örtü menüsü diyalog semantiği taşımalı. */
  it('panel diyalog olarak işaretli', () => {
    const panel = KAYNAK.slice(KAYNAK.indexOf('function MobilMenu'))
    expect(panel).toContain('role="dialog"')
    expect(panel).toContain('aria-modal="true"')
    expect(panel).toContain('aria-label=')
  })

  /** Arka plan kaydırması kilitleniyor — açık menü altında sayfa kaymamalı. */
  it('menü açıkken gövde kaydırması kilitli', () => {
    expect(KAYNAK).toContain("document.body.style.overflow = 'hidden'")
    expect(KAYNAK).toContain("document.body.style.overflow = ''")
  })
})
