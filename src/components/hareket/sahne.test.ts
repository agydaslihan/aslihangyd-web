import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const KAYNAK = readFileSync(path.join(dirname, 'Sahne.tsx'), 'utf8')

/** Yorumları düşürür — gerekçe metni kuralın kendisini tetiklemesin. */
function kodu(icerik: string): string {
  return icerik.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

const KOD = kodu(KAYNAK)

/**
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ SAHNE GEÇİŞİNİN İKİ SESSİZ TUZAĞI VAR; İKİSİ DE YAŞANDI.
 *
 * 1. İçeriğin animasyona bağlanması. Öğe CSS'te gizlenip JS ile
 *    gösterilseydi, tek bir betik hatası sayfayı boş bırakırdı.
 *
 * 2. İlk ekranın gizlenmesi. LCP, öğenin BOYANDIĞI anı ölçüyor; `opacity: 0`
 *    boyanmamış sayılıyor ve bu durumu JavaScript veriyor. Kart ızgaraları
 *    sahneye alınınca `/portfoy` mobil LCP'si 2,8 s → 3,6 s'ye çıktı.
 *
 * İkisi de ekranda hiçbir hata bırakmadan geçer. Bu yüzden testle bağlı.
 * ─────────────────────────────────────────────────────────────────────────
 */
describe('sahne geçişi', () => {
  it('öğe varsayılan olarak görünür — gizleme JS ile veriliyor', () => {
    // Sunucunun bastığı öznitelik boş: CSS'te `[data-sahne]` → opacity 1.
    expect(KOD).toContain('data-sahne=""')
    expect(KOD).toContain("dugum.dataset.sahne = 'bekliyor'")
  })

  /**
   * ⚠️ ASIL DENETİM BU. Ölçüm kutusu alınıp görünürlük kontrol edilmeden
   * `bekliyor` verilirse ilk ekran gizlenmiş olur.
   */
  it('zaten görünen öğe gizlenmiyor', () => {
    expect(KOD).toContain('getBoundingClientRect()')
    expect(
      /kutu\.top\s*<\s*window\.innerHeight[\s\S]{0,40}return/.test(KOD),
      'Görüş alanındaki öğe için erken çıkış yok: ilk ekran `opacity: 0` ile ' +
        'başlar ve LCP, paket inip hidrasyon bitene kadar gecikir.',
    ).toBe(true)

    // Erken çıkış, gizlemeden ÖNCE olmalı.
    expect(KOD.indexOf('getBoundingClientRect()')).toBeLessThan(
      KOD.indexOf("dugum.dataset.sahne = 'bekliyor'"),
    )
  })

  it('hareket azaltma tercihinde hiç sahneye alınmıyor', () => {
    expect(KOD).toContain("matchMedia('(prefers-reduced-motion: reduce)').matches")
  })

  /** Tekrar oynayan giriş, ikinci görüşte gösterişe dönüşür ve okumayı böler. */
  it('gözlemci ilk girişten sonra sökülüyor', () => {
    expect(KOD).toContain('gozlemci.disconnect()')
  })

  /** Gözlemci yoksa içerik yine görünür kalmalı. */
  it('IntersectionObserver yoksa erken çıkılıyor', () => {
    expect(KOD).toContain("typeof IntersectionObserver === 'undefined'")
  })
})
