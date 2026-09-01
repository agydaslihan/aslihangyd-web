import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * Modal akış — erişilebilirlik ve EİDS kapısı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ EN ÖNEMLİ İDDİA: PASİF DÜĞME BİR KAPI DEĞİL.
 *
 * Son adımdaki "Yayına al" düğmesi EİDS eksikken pasif. Ama pasiflik
 * DOM'dan kaldırılabilir ve sunucu eylemi doğrudan çağrılabilir. Gerçek
 * kapı `eidsYayinEngeli` kancası olmak zorunda; sihirbaz onu ATLAMIYOR,
 * ÇAĞIRIYOR.
 * ─────────────────────────────────────────────────────────────────────────
 */

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const oku = (goreli: string) => readFileSync(path.join(KOK, goreli), 'utf8')
const govde = (goreli: string) =>
  oku(goreli)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

describe('⚠️ EİDS kapısı atlanmıyor', () => {
  const eylem = govde('lib/sihirbaz/eylemler.ts')

  it('`durum` istemciden GELMİYOR — sunucuda sabit', () => {
    expect(eylem).toContain("data: { durum: 'yayinda' }")
    expect(govde('lib/sihirbaz/sema.ts')).not.toMatch(/^\s*durum:/m)
  })

  it('yazma kancalardan geçiyor', () => {
    expect(eylem).toContain('overrideAccess: false')
    expect(eylem).not.toContain('overrideAccess: true')
  })

  it('kancanın hata mesajı AYNEN gösteriliyor', () => {
    /**
     * ⚠️ İkinci bir metin yazmak, iki mesajın ayrıştığı bir gün üretirdi;
     * hangi EİDS koşulunun eksik olduğunu en iyi kanca biliyor.
     */
    expect(eylem).toContain('genelHata: hataMesaji(hata)')
  })
})

describe('modal erişilebilirliği', () => {
  const modal = oku('components/sihirbaz/SihirbazModali.tsx')

  it('dialog rolü ve modal işareti var', () => {
    expect(modal).toContain('role="dialog"')
    expect(modal).toContain('aria-modal="true"')
    expect(modal).toContain('aria-labelledby')
  })

  it('odak tuzağı iki yönde de kapalı', () => {
    // Shift+Tab ilkten sona dönmeli; tek yönlü tuzak tuzak değildir.
    expect(modal).toContain('olay.shiftKey && document.activeElement === ilk')
    expect(modal).toContain('!olay.shiftKey && document.activeElement === son')
  })

  it('odak geri veriliyor', () => {
    /**
     * ⚠️ Odak geri verilmezse ekran okuyucu kullanan kişi sayfanın başına
     * düşer ve nerede kaldığını kaybeder.
     */
    expect(modal).toContain('oncekiOdakRef.current?.focus()')
  })

  it('ESC kapatıyor ama ÖNCE soruyor', () => {
    expect(modal).toContain("olay.key === 'Escape'")
    expect(modal).toContain('kapatmadanOnceSor')
  })

  it('arka plan kaydırması kilitleniyor', () => {
    expect(modal).toContain("document.body.style.overflow = 'hidden'")
  })

  it('örtüye basınca kapanıyor ama sürükleme kapatmıyor', () => {
    // İçeriden başlayıp dışarıda biten bir metin seçimi kapatmamalı.
    expect(modal).toContain('olay.target === olay.currentTarget')
  })
})

describe('ikinci sihirbaz yazılmadı', () => {
  it('modal aynı bileşeni sarıyor', () => {
    const dugme = oku('components/sihirbaz/IlanVerDugmesi.tsx')
    expect(dugme).toContain('<PortfoySihirbazi')
    expect(dugme).toContain('<SihirbazModali')
  })

  it('sayfa rotası duruyor — derin bağlantı korunuyor', () => {
    expect(oku('payload.config.ts')).toContain('SIHIRBAZ_YOLU')
  })

  it('modal kapanınca sihirbaz sıfırlanıyor', () => {
    /**
     * ⚠️ Yarım bırakılıp kapatılan bir formun ikinci açılışta eski hâliyle
     * gelmesi, "yeni ilan" diyen kişiye eski ilanı gösterirdi.
     */
    expect(oku('components/sihirbaz/IlanVerDugmesi.tsx')).toContain('key={oturum}')
  })
})

describe('görsel dil', () => {
  const bilesen = oku('components/sihirbaz/PortfoySihirbazi.tsx')
  const stil = oku('components/sihirbaz/sihirbaz.css')

  it('tamamlanan adım onay işaretiyle — renk tek taşıyıcı değil', () => {
    // WCAG 1.4.1: rengi göremeyen de hangisinin bittiğini görmeli.
    expect(bilesen).toContain('sihirbaz-adim-onay')
    expect(bilesen).toContain('✓')
  })

  it('kategori seçimi onay işareti ve aria-pressed taşıyor', () => {
    expect(bilesen).toContain('aria-pressed={secenek.value === tip}')
  })

  it('yeni bloklar panel temasının değişkenlerini kullanıyor', () => {
    /**
     * ⚠️ "Daha renkli, canlı" istendi ama palet korunacak; canlılık
     * kontrast, onay işaretleri ve durum renkleriyle geliyor.
     *
     * ⚠️ İDDİA DOSYANIN TAMAMINA DEĞİL, EKLENEN BLOKLARA BAKIYOR. Dosyada
     * bu işten önce de ham renkler vardı; hepsini bu değişikliğe
     * bağlamak, ilgisiz bir borcu bu testin sırtına yıkmak olurdu.
     */
    const yeniBloklar = stil.slice(stil.indexOf('.sihirbaz-modal-ortu'))
    const hamRenkler = (yeniBloklar.match(/#[0-9a-f]{3,8}\b/gi) ?? []).map((r) => r.toLowerCase())
    // Tek istisna: modal örtüsünün siyahı bir palet rengi değil, bir perde.
    expect(hamRenkler.filter((r) => r !== '#000')).toEqual([])
    expect(yeniBloklar).toContain('var(--theme-success-500)')
  })

  it('dokunma hedefleri 44 px', () => {
    expect(stil).toContain('min-height: 44px')
  })

  it('mobilde modal tam ekran', () => {
    expect(stil).toContain('min-height: 100svh')
  })
})

describe('adım göstergesi yalan söylemiyor', () => {
  const bilesen = oku('components/sihirbaz/PortfoySihirbazi.tsx')

  it('doldurulacak alanı olmayan adım yüzde GÖSTERMİYOR', () => {
    /**
     * ⚠️ İlk hâlde "Ön izleme" ve "Yayın" %100 ve yeşil onaylı
     * görünüyordu — kullanıcı oraya hiç gitmemişken. Tamamlanmış görünen
     * bir adım, atlanabilir görünen bir adımdır; üstelik onay işareti
     * burada yalan söylüyordu.
     */
    expect(bilesen).toContain('if (adim.alanlar.length === 0) return null')
    expect(bilesen).toContain('doluluklar[sira] === null ? null')
  })

  it('genel yüzde yalnızca ölçülebilir adımlardan', () => {
    // Ön izleme ve yayını paydaya katmak, hiçbir şey doldurmadan %20
    // göstermek olurdu.
    expect(bilesen).toContain('const olculebilir = doluluklar.filter')
  })
})

describe('taslak kaydet ve çık', () => {
  const bilesen = oku('components/sihirbaz/PortfoySihirbazi.tsx')

  it('her adımda var', () => {
    expect(bilesen).toContain("'Taslak kaydet ve çık'")
  })

  it('modal dışında etiket farklı', () => {
    // Sayfa kabuğunda "çık" diyecek bir yer yok.
    expect(bilesen).toContain("'Taslak kaydet'")
  })
})
