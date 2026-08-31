import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { medyaCoz } from './coz'
import { turAlanlari } from './turAlanlari'

/**
 * 360° tur — panorama, dış servis ve boş durum.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU BÖLÜMÜN EN PAHALI HATASI "YAKINDA" KUTUSUDUR.
 *
 * Mahalle sayfasında yıllardır "360° tur çekimi planlanıyor" yazan bir
 * kutu duruyordu. Her mahalle sayfasında duran ve hiç dolmayan bir vaat,
 * boş durum tasarımı değil gürültüdür — ve ziyaretçiye sitenin yarım
 * olduğunu söyler.
 * ─────────────────────────────────────────────────────────────────────────
 */

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const oku = (goreli: string) => readFileSync(path.join(KOK, goreli), 'utf8')

describe('tur alanları', () => {
  it('iki koleksiyonda da AYNI tanımdan geliyor', () => {
    /**
     * ⚠️ Elle tekrarlansaydı yardım metni, çekim talimatı ve alan adı er
     * geç ayrışırdı — ve ayrışan taraf, sorunu ilk yaşayan kişinin baktığı
     * taraf olmazdı.
     */
    expect(oku('collections/Ilanlar.ts')).toContain("turAlanlari('ilan')")
    expect(oku('collections/Mahalleler.ts')).toContain("turAlanlari('mahalle')")
  })

  it('panorama ve dış servis adresi birlikte var', () => {
    const adlar = turAlanlari('ilan').map((alan) => (alan as { name?: string }).name)
    expect(adlar).toEqual(['sanalTurPanoramasi', 'sanalTurUrl'])
  })

  it('panel yardımı çekim biçimini SAYIYLA söylüyor', () => {
    /**
     * ⚠️ "Panorama yükleyin" demek yetmiyor: equirectangular olmayan bir
     * görsel oynatıcıda eğri bir dünya üretiyor ve sebebi hiçbir yerde
     * yazmıyor. Oran ve çözünürlük yazılı olmak zorunda.
     */
    const yardim = JSON.stringify(turAlanlari('mahalle'))
    expect(yardim).toContain('Equirectangular')
    expect(yardim).toContain('2:1')
    expect(yardim).toContain('6000×3000')
  })

  it('panoramanın dış servisin önüne geçtiği YAZILI', () => {
    // Sıra belirsiz kalsaydı "hangisi görünüyor?" sorusunun cevabı olmazdı.
    expect(JSON.stringify(turAlanlari('ilan'))).toContain('panorama yüklendiyse O kullanılır')
  })
})

describe('medyaCoz', () => {
  it('nesne olmayan değer için null', () => {
    // `depth: 0` ile okunan kayıtta alan bir SAYI oluyor.
    expect(medyaCoz(12)).toBeNull()
    expect(medyaCoz(null)).toBeNull()
    expect(medyaCoz(undefined)).toBeNull()
  })

  it('adressiz kayıt için null', () => {
    expect(medyaCoz({ alt: 'bir şey' })).toBeNull()
    expect(medyaCoz({ url: '' })).toBeNull()
  })

  it('adres ve alt metni çıkarıyor', () => {
    expect(medyaCoz({ url: '/medya/a.jpg', alt: 'salon' })).toEqual({
      url: '/medya/a.jpg',
      alt: 'salon',
    })
  })
})

describe('oynatıcı', () => {
  const oynatici = oku('components/medya/PanoramaTuru.tsx')
  const yonlendirici = oku('components/medya/SanalTur.tsx')

  it('Pannellum TIKLAMADAN ÖNCE inmiyor', () => {
    /**
     * ⚠️ ~18 kB kütüphane + birkaç megabaytlık panorama. Sayfa açılışında
     * yüklemek, turu hiç açmayacak ziyaretçinin verisini harcamak ve
     * LCP'yi bozmak olurdu.
     */
    expect(oynatici).toContain("await import('pannellum/build/pannellum.js')")
    expect(oynatici).not.toMatch(/^import .*pannellum/m)
  })

  it('yönlendirici oynatıcıyı da tembel yüklüyor', () => {
    // Dış servis turu kullanan sayfalara Pannellum sokulmamalı.
    expect(yonlendirici).toContain("import('./PanoramaTuru')")
    expect(yonlendirici).toContain('ssr: false')
  })

  it('WebGL bağlamı kapatılıyor', () => {
    /**
     * ⚠️ Bırakılan her sahne bir GPU bağlamı tutuyor ve tarayıcının bağlam
     * sınırı düşük; birkaç tur açıp kapatan ziyaretçide sonraki turlar
     * sessizce açılmaz olurdu.
     */
    expect(oynatici).toContain('destroy()')
  })

  it('otomatik dönüş KAPALI', () => {
    // Kendiliğinden dönen sahne, az hareket tercihi için rahatsız edici.
    expect(oynatici).toContain('autoRotate: 0')
  })

  it('jiroskop varsayılan olarak kapalı — izin reddedilse de tur çalışır', () => {
    expect(oynatici).toContain('orientationOnByDefault: false')
  })
})

describe('boş durum', () => {
  it('ikisi de boşsa yönlendirici null döndürüyor', () => {
    expect(oku('components/medya/SanalTur.tsx')).toMatch(/return null\n}/)
  })

  it('mahalle sayfasındaki "yakında" kutusu KALDIRILDI', () => {
    const sayfa = oku('app/(site)/mahalleler/[slug]/page.tsx')
    expect(sayfa).not.toContain('360° tur çekimi planlanıyor')
    expect(sayfa).toContain('turPanoramasi !== null || mahalle.sanalTurUrl')
  })

  it('ilan sayfası da aynı kuralı uyguluyor', () => {
    const sayfa = oku('app/(site)/portfoy/[slug]/page.tsx')
    expect(sayfa).toContain('ilanPanoramasi !== null || ilan.sanalTurUrl')
  })
})
