import { describe, expect, it } from 'vitest'

import { turAdresiniDenetle } from './turAdresi'

/**
 * 360° tur adresi denetimi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ÜRETİMDE ÖLÇÜLEN ARIZA — 31 Ağustos 2026.
 *
 * Alipaşa'nın tur adresi `https://maps.app.goo.gl/…` idi: bir Google Maps
 * PAYLAŞIM linki. Eski kontrol yalnızca protokole bakıyordu ve adres
 * https olduğu için geçti; Google `X-Frame-Options` ile gömülmeyi
 * reddetti ve ziyaretçi boş/kırık bir çerçeve gördü — sebebi hiçbir
 * yerde yazmadan.
 *
 * `https` olmak, gömülebilir olmak değildir.
 * ─────────────────────────────────────────────────────────────────────────
 */

describe('gömülemeyen adresler eleniyor', () => {
  it('Google Maps paylaşım linki — üretimdeki gerçek adres', () => {
    const durum = turAdresiniDenetle('https://maps.app.goo.gl/mT9Myj3mUaxGpeWy6')
    expect(durum.gecerli).toBe(false)
    expect(durum.sorun).toBe('gomulemez')
    expect(durum.mesaj).toMatch(/gömülemiyor/)
  })

  it('normal Google Maps sayfası', () => {
    expect(turAdresiniDenetle('https://www.google.com/maps/place/Corlu').gecerli).toBe(false)
  })

  it('Instagram, Facebook ve Drive', () => {
    for (const adres of [
      'https://www.instagram.com/p/abc/',
      'https://www.facebook.com/foo',
      'https://drive.google.com/file/d/abc/view',
    ]) {
      expect(turAdresiniDenetle(adres).gecerli, adres).toBe(false)
    }
  })
})

describe('gömülebilen adresler geçiyor', () => {
  it('Google Maps EMBED biçimi elenmiyor', () => {
    /**
     * ⚠️ Beyaz liste değil kara liste kullanılmasının sebebi bu:
     * Google'ın gömülebilir biçimi geçerli ve elenmemeli.
     */
    expect(turAdresiniDenetle('https://www.google.com/maps/embed?pb=!1m18').gecerli).toBe(true)
  })

  it('tur servisleri geçiyor', () => {
    for (const adres of [
      'https://kuula.co/share/abc',
      'https://my.matterport.com/show/?m=abc',
      'https://momento360.com/e/u/abc',
      'https://aslihangyd.com/turlar/muhittin',
    ]) {
      expect(turAdresiniDenetle(adres).gecerli, adres).toBe(true)
    }
  })
})

describe('temel kontroller', () => {
  it('http reddediliyor', () => {
    const durum = turAdresiniDenetle('http://kuula.co/share/abc')
    expect(durum.gecerli).toBe(false)
    expect(durum.sorun).toBe('https_degil')
  })

  it('okunamayan adres reddediliyor', () => {
    expect(turAdresiniDenetle('kuula').gecerli).toBe(false)
    expect(turAdresiniDenetle('').gecerli).toBe(false)
  })

  it('her ret için Türkçe açıklama var', () => {
    // "Geçersiz" demek kullanıcıya ne yapacağını söylemiyor.
    for (const adres of ['', 'http://a.co', 'https://maps.app.goo.gl/x']) {
      expect(turAdresiniDenetle(adres).mesaj, adres).toBeTruthy()
    }
  })
})
