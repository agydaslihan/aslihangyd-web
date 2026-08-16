import { readFileSync } from 'node:fs'
import path from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { stiliCoz, stilMesaji, yerelStil, type StilSonucu } from './stil'

const KOK = path.resolve(path.join(import.meta.dirname, '..', '..'))

afterEach(() => {
  vi.unstubAllGlobals()
})

function cevapVer(secenekler: { status?: number; govde?: unknown; atar?: boolean }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      if (secenekler.atar) throw new Error('ağ koptu')
      return {
        ok: (secenekler.status ?? 200) < 400,
        status: secenekler.status ?? 200,
        json: async () => secenekler.govde,
      }
    }),
  )
}

const GECERLI_STIL = { version: 8, sources: {}, layers: [] }

describe('stiliCoz — hata sınıflandırması', () => {
  /**
   * ⚠️ ÜÇ ARIZA ÜÇ AYRI SONUÇ VERMELİ.
   *
   * "Harita yüklenemedi" tek mesajı, anahtarı hiç girmemiş biriyle origin
   * kısıtına takılan birini aynı yere bakmaya gönderirdi — oysa ikisinin
   * yapması gereken bambaşka.
   */
  it('anahtar yoksa ağ isteği bile yapılmıyor', async () => {
    const sahte = vi.fn()
    vi.stubGlobal('fetch', sahte)

    const sonuc = await stiliCoz(null)

    expect(sonuc.durum).toBe('anahtar_yok')
    expect(sahte).not.toHaveBeenCalled()
  })

  it('401 ve 403 "reddedildi" — origin kısıtına yönlendiriyor', async () => {
    for (const kod of [401, 403]) {
      cevapVer({ status: kod })
      const sonuc = await stiliCoz('https://ornek.test/style.json')

      expect(sonuc.durum, String(kod)).toBe('reddedildi')
      expect((sonuc as { kod: number }).kod).toBe(kod)
      expect(stilMesaji(sonuc)).toContain('origin')
    }
  })

  it('ağ hatası "ulaşılamadı"', async () => {
    cevapVer({ atar: true })
    const sonuc = await stiliCoz('https://ornek.test/style.json')

    expect(sonuc.durum).toBe('ulasilamadi')
    expect(stilMesaji(sonuc)).toContain('ulaşılamadı')
  })

  it('diğer HTTP hataları da "ulaşılamadı"', async () => {
    cevapVer({ status: 500 })
    expect((await stiliCoz('https://ornek.test/style.json')).durum).toBe('ulasilamadi')
  })

  /**
   * ⚠️ HTTP 200 HER ZAMAN STİL DEMEK DEĞİL.
   *
   * Yanlış yapılandırılmış bir vekil sunucu ya da yakalama portalı 200 ile
   * HTML döndürebilir. Biçim kontrolü olmadan MapLibre'ye çöp verilir ve
   * hata anlaşılmaz bir yerde patlar.
   */
  it('200 ama stil olmayan yanıt "ulaşılamadı"', async () => {
    for (const govde of [null, '<html>', { version: 7 }, { version: 8 }]) {
      cevapVer({ status: 200, govde })
      const sonuc = await stiliCoz('https://ornek.test/style.json')
      expect(sonuc.durum, JSON.stringify(govde)).toBe('ulasilamadi')
    }
  })

  it('geçerli stil "uzak" olarak dönüyor ve mesaj üretmiyor', async () => {
    cevapVer({ status: 200, govde: GECERLI_STIL })
    const sonuc = await stiliCoz('https://ornek.test/style.json')

    expect(sonuc.durum).toBe('uzak')
    expect(stilMesaji(sonuc)).toBeNull()
  })
})

describe('yerel stil — altlıksız çizim', () => {
  /**
   * ─────────────────────────────────────────────────────────────────────
   * ⚠️ ALTLIK GELMESE BİLE HARİTA KURULABİLMELİ.
   *
   * MapLibre `load` olayını yalnızca stil başarıyla yüklendiğinde
   * ateşliyor ve katmanlarımız o olayın içinde kuruluyor. Uzak stil
   * doğrudan MapLibre'ye verilirse, MapTiler 401 döndüğünde `load` hiç
   * gelmez ve MAHALLE SINIRLARI DA ÇİZİLMEZ.
   *
   * Poligonlar bizim verimiz; MapTiler yalnızca taban görüntü. Her arıza
   * sonucu geçerli bir yerel stil içermek zorunda.
   * ─────────────────────────────────────────────────────────────────────
   */
  it('her arıza sonucu kullanılabilir bir stil taşıyor', async () => {
    const sonuclar: StilSonucu[] = []

    sonuclar.push(await stiliCoz(null))
    cevapVer({ status: 403 })
    sonuclar.push(await stiliCoz('https://ornek.test/style.json'))
    cevapVer({ atar: true })
    sonuclar.push(await stiliCoz('https://ornek.test/style.json'))

    for (const sonuc of sonuclar) {
      expect(sonuc.stil.version, sonuc.durum).toBe(8)
      expect(Array.isArray(sonuc.stil.layers), sonuc.durum).toBe(true)
      expect(sonuc.stil.layers.length, sonuc.durum).toBeGreaterThan(0)
    }
  })

  /**
   * ⚠️ YEREL STİL HİÇBİR DIŞ İSTEK YAPMAMALI.
   *
   * Yedek stilin amacı dış servise bağımlılığı kesmek. İçine bir karo ya
   * da yazı tipi kaynağı sızarsa, altlık arızası sırasında ikinci bir
   * arıza doğar ve yedeğin anlamı kalmaz.
   */
  it('yerel stil dış kaynak içermiyor', () => {
    const stil = yerelStil()
    expect(Object.keys(stil.sources)).toEqual([])
    expect(stil.glyphs).toBeUndefined()
    expect(stil.sprite).toBeUndefined()
    expect(JSON.stringify(stil)).not.toContain('http')
  })

  it('yerel stil bir zemin katmanı çiziyor', () => {
    const stil = yerelStil()
    expect(stil.layers[0]?.type).toBe('background')
  })
})

/**
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ KURULUM SIRASI KORUNMALI.
 *
 * Bu testler dizeye bakıyor çünkü korunacak şey bir davranış değil bir
 * SIRA: stil önce çözülmeli, harita sonra kurulmalı. Biri MapLibre'ye
 * doğrudan adres verirse (eski hâli), altlık arızasında sınırlar yine
 * kaybolur ve hiçbir birim testi bunu yakalamaz.
 * ─────────────────────────────────────────────────────────────────────────
 */
describe('harita kurulum sırası', () => {
  const kaynak = readFileSync(path.join(KOK, 'components/harita/Harita3B.tsx'), 'utf8')

  it('MapLibre’ye adres değil çözülmüş stil NESNESİ veriliyor', () => {
    expect(kaynak).toContain('style: stilSonucu.stil')
    expect(kaynak).not.toContain('style: stilAdresi')
  })

  it('stil çözülmeden harita kurulmuyor', () => {
    expect(kaynak).toContain('if (stilSonucu === null) return')
  })

  it('yedek kipte metin katmanları eklenmiyor', () => {
    // `glyphs` yok; metin katmanı eklemek her karo için hata üretirdi.
    expect(kaynak).toContain('if (!secenekler.etiketler) return')
  })

  /**
   * ⚠️ Sahne artık haritayı KOŞULLU render ETMİYOR. Eski hâlinde anahtar
   * yokken haritanın yerine boş durum kutusu konuyordu; poligonlar da
   * onunla birlikte kayboluyordu.
   */
  it('sahne anahtar yokken haritayı gizlemiyor', () => {
    const sahne = readFileSync(path.join(KOK, 'components/harita/HaritaSahnesi.tsx'), 'utf8')
    expect(sahne).not.toContain('Etkileşimli harita hazırlanıyor')
    expect(sahne).toContain('onAltlikDurumu')
  })
})
