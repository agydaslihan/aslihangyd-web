import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: LIGHTBOX EN KOLAY KÜTÜPHANE EKLENEN YERDİR.
 *
 * Hazır bir lightbox 15–30 kB getiriyor ve getirdiği şeylerin çoğunu
 * tarayıcı zaten veriyor: `<dialog>` odak tuzağını, Escape'i ve arka planın
 * erişilebilirlik ağacından düşmesini bedavaya yapıyor.
 *
 * Aynı disiplin framer-motion'ı düşürürken uygulandı; bu test onu galeri
 * tarafında tutuyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

const KOK = path.resolve(path.join(import.meta.dirname, '..', '..'))
const oku = (yol: string) => readFileSync(path.join(KOK, yol), 'utf8')

const galeri = oku('components/ilan/GaleriIzgarasi.tsx')

describe('galeri büyütme', () => {
  it('native dialog kullanıyor', () => {
    expect(galeri).toContain('<dialog')
    expect(galeri).toContain('showModal()')
  })

  /**
   * ⚠️ Klavye ok tuşları OLMADAN büyütme yalnızca fareyle gezilebilir
   * olurdu; `<dialog>` odağı içeride tutuyor ama gezinmeyi vermiyor.
   */
  it('ok tuşlarıyla gezinme var', () => {
    expect(galeri).toContain("olay.key === 'ArrowRight'")
    expect(galeri).toContain("olay.key === 'ArrowLeft'")
  })

  /**
   * ⚠️ Büyütülen görsel ANCAK AÇILINCA render ediliyor. Hepsini baştan
   * basmak, ilan sayfasına görünmeyen tam boy görseller eklerdi.
   */
  it('büyütülen görsel yalnızca açıkken çiziliyor', () => {
    expect(galeri).toContain('{acik ? (')
  })

  it('arka plana tıklayınca kapanıyor', () => {
    expect(galeri).toContain('olay.target === dialogRef.current')
  })

  /**
   * ⚠️ Uçta durup hiçbir şey yapmayan bir düğme bozuk sanılıyor; gezinme
   * dairesel.
   */
  it('gezinme dairesel', () => {
    expect(galeri).toContain('% gorseller.length')
  })

  it('lightbox kütüphanesi eklenmemiş', () => {
    const paket = JSON.parse(readFileSync(path.join(KOK, '..', 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>
    }
    const adaylar = [
      'yet-another-react-lightbox',
      'photoswipe',
      'react-image-lightbox',
      'fslightbox-react',
    ]
    const bulunan = adaylar.filter((ad) => Object.keys(paket.dependencies ?? {}).includes(ad))

    expect(bulunan, 'Büyütme native <dialog> ile yazıldı; kütüphane eklemeden önce ölçün.').toEqual(
      [],
    )
  })
})

describe('portföy listesi katman sırası', () => {
  const sayfa = oku('app/(site)/portfoy/(liste)/page.tsx')

  /**
   * ⚠️ KATMAN SIRASI BİR KEZ KARIŞIRSA SESSİZCE BOZULUR.
   *
   * Yapışkan sonuç şeridi kartların üstünde olmalı ama başlığın (z-40) ve
   * mobil filtre sheet'inin (z-50) altında kalmalı. Şerit z-40'a çıkarsa
   * mobilde menünün üstüne biner ve kimse fark etmez — menü zaten nadiren
   * açılıyor.
   */
  it('sonuç şeridi başlığın altında kalıyor', () => {
    expect(sayfa).toContain('sticky top-20 z-20')
  })

  it('sonuç şeridi cam yüzey', () => {
    const satir = sayfa.slice(sayfa.indexOf('sticky top-20 z-20') - 60)
    expect(satir.slice(0, 120)).toContain('cam')
  })
})
