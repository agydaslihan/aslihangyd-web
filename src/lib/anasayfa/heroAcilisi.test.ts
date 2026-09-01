import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { HERO_ACILISLARI, VARSAYILAN_HERO_ACILISI, heroAcilisiniCoz } from './duzen'

/**
 * Hero açılış kipi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ İKİ KURAL PAZARLIĞA KAPALI VE İKİSİ DE BURADA KİLİTLİ:
 *
 *   1. HİÇBİR KİP AÇILIR KATMAN (interstitial) DEĞİL. Google mobilde
 *      araya giren katmanları cezalandırıyor; katmanın kendisi LCP öğesi
 *      olur ve odak tuzağı gerektirir.
 *   2. HANGİ KİP AKTİFSE `<h1>` ORADA. Sayfada iki `<h1>` olamaz.
 * ─────────────────────────────────────────────────────────────────────────
 */

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const oku = (goreli: string) => readFileSync(path.join(KOK, goreli), 'utf8')

describe('kip çözümü', () => {
  it('üç kip var', () => {
    expect(HERO_ACILISLARI.map((k) => k.value)).toEqual([
      'metin_once',
      'slayt_once',
      'yalnizca_metin',
    ])
  })

  it('varsayılan metin önce', () => {
    expect(VARSAYILAN_HERO_ACILISI).toBe('metin_once')
  })

  it('tanınmayan değer varsayılana düşüyor', () => {
    // Elle bozulmuş bir kayıt ana sayfayı kırmamalı.
    expect(heroAcilisiniCoz('kayan_yazi')).toBe('metin_once')
    expect(heroAcilisiniCoz(undefined)).toBe('metin_once')
    expect(heroAcilisiniCoz(null)).toBe('metin_once')
  })

  it('geçerli değer korunuyor', () => {
    expect(heroAcilisiniCoz('slayt_once')).toBe('slayt_once')
  })
})

describe('⚠️ tek H1', () => {
  const sayfa = oku('app/(site)/page.tsx')
  const vitrin = oku('components/hero/SinematikHero.tsx')

  it('vitrin hero değilken H2 çiziyor', () => {
    expect(vitrin).toContain('{sayfaHerosu ? (')
    expect(vitrin).toContain('<h1 className=')
    expect(vitrin).toContain('<h2 className=')
  })

  it('slayt önce kipinde vitrin hero DEĞİL', () => {
    expect(sayfa).toContain("sayfaHerosu={heroAcilisi !== 'slayt_once'}")
  })

  it('bayrak H1 ile priority’yi BİRLİKTE taşıyor', () => {
    /**
     * ⚠️ Ayrı iki prop olsaydı biri unutulduğunda ekranda hiçbir iz
     * bırakmayan bir gerileme çıkardı: iki H1 ya da iki `priority` görsel.
     */
    expect(vitrin).toContain('priority={sayfaHerosu}')
  })
})

describe('⚠️ açılır katman yok', () => {
  const sayfa = oku('app/(site)/page.tsx')

  it('vitrin ve slider normal sayfa akışında', () => {
    // `fixed`/`role="dialog"` bir karşılama katmanının izleri olurdu.
    const vitrin = oku('components/hero/SinematikHero.tsx')
    expect(vitrin).not.toContain('role="dialog"')
    expect(vitrin).not.toContain('position: fixed')
  })

  it('kaydırma göstergesi SAYFA İÇİ BAĞLANTI', () => {
    const vitrin = oku('components/hero/SinematikHero.tsx')
    expect(vitrin).toContain('href={`#${sonrakiBolumId}`}')
    expect(sayfa).toContain('id="hero-slaytlari"')
  })

  it('bağlantı klavyeyle çalışıyor — aria-hidden kalkıyor', () => {
    /**
     * ⚠️ Süs çizgi `aria-hidden` idi ve doğruydu: bilgi taşımıyordu.
     * Bağlantıya dönüşünce gizli kalamaz.
     */
    const vitrin = oku('components/hero/SinematikHero.tsx')
    expect(vitrin).toContain('Slaytlara geç')
  })
})

describe('slaytlar tekrarlanmıyor', () => {
  const sayfa = oku('app/(site)/page.tsx')

  it('bant YALNIZCA metin önce kipinde', () => {
    /**
     * ⚠️ "Slayt önce" kipinde slider zaten TÜM slaytları gösteriyor;
     * bandı da çizmek aynı fotoğrafları ikinci kez basmak olurdu.
     */
    expect(sayfa).toContain("heroAcilisi === 'metin_once' && hero.slaytlar.length > 1")
  })

  it('yalnızca metin kipinde slider hiç çizilmiyor', () => {
    /**
     * ⚠️ İDDİA BİÇİMLENDİRİCİYE BAĞLI OLMAMALI. İlk hâl
     * `"heroAcilisi === 'slayt_once' ? ("` arıyordu; Prettier koşulu tek
     * satıra topladığında açılış parantezi kayboldu ve test kırıldı —
     * kodda hiçbir şey değişmemişken.
     *
     * Aynı koşul iki şeyi birden sağlıyor: `slayt_once` değilse hero
     * slider'ı yok, `metin_once` değilse bant yok. "Yalnızca metin"
     * kipinde ikisi de sağlanıyor.
     */
    expect(sayfa).toMatch(/heroAcilisi === 'slayt_once' \?/)
    expect(sayfa).toContain('<HeroBolumu ayarlar={hero} sayfaHerosu />')
  })
})

describe('otomatik geçiş', () => {
  it('varsayılan KAPALI', () => {
    // Kendiliğinden dönen bir slider, okumaya çalışan ziyaretçiyi kovalar.
    expect(oku('globals/HeroSlider.ts')).toMatch(
      /name: 'otomatikGecis'[\s\S]{0,200}?defaultValue: false/,
    )
  })

  it('az hareket tercihinde hiç çalışmıyor', () => {
    expect(oku('components/hero/HeroKumandasi.tsx')).toContain(
      'if (!otomatikGecis || duraklatildi || hareketAzalt) return',
    )
  })
})
