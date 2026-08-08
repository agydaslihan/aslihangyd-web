import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import {
  baytYaz,
  BUTCE_BAYT,
  butceDurumu,
  gorselButcesiniOlc,
  OLCUM_GENISLIKLERI,
} from './gorselButcesi'

/**
 * Görsel bütçe ölçümünün gerçekten ölçtüğünü sınar.
 *
 * ⚠️ Bu testin asıl işi, "ölçüm" adı altında sabit bir sayı döndürmediğini
 * kanıtlamak. Bütçe rozeti panelde bir hüküm veriyor; o hüküm kodlanmış bir
 * tahmine dayansaydı, Aslıhan'a yanlış bilgiyle karar verdirirdi.
 */

/** Fotoğraf benzeri, sıkıştırılması kolay olmayan bir test görseli. */
async function testGorseli(genislik: number, yukseklik: number, gurultu: number): Promise<Buffer> {
  const veri = Buffer.allocUnsafe(genislik * yukseklik * 3)
  let durum = 12345
  const rastgele = () => {
    durum = (durum * 1664525 + 1013904223) >>> 0
    return durum / 0xffffffff
  }
  for (let i = 0; i < veri.length; i += 3) {
    const taban = 90 + (i / veri.length) * 80
    const sapma = (rastgele() * 2 - 1) * gurultu
    veri[i] = Math.max(0, Math.min(255, taban + sapma))
    veri[i + 1] = Math.max(0, Math.min(255, taban * 0.9 + sapma))
    veri[i + 2] = Math.max(0, Math.min(255, taban * 0.7 + sapma))
  }
  return sharp(veri, { raw: { width: genislik, height: yukseklik, channels: 3 } })
    .jpeg({ quality: 92 })
    .toBuffer()
}

describe('görsel bütçe ölçümü', () => {
  it('üç genişlik için de bayt üretir ve bulanık veri döner', async () => {
    const gorsel = await testGorseli(1400, 900, 30)
    const olcum = await gorselButcesiniOlc(gorsel)

    expect(olcum).not.toBeNull()
    expect(olcum!.kartBayt).toBeGreaterThan(0)
    expect(olcum!.mobilBayt).toBeGreaterThan(0)
    expect(olcum!.masaustuBayt).toBeGreaterThan(0)
    expect(olcum!.bulanikVeri).toMatch(/^data:image\/webp;base64,/)
  })

  /**
   * ⚠️ Sıralama testi, ölçümün gerçekten yapıldığının kanıtı.
   * Sabit bir sayı döndürülse bu bağıntı tutmazdı.
   */
  it('daha geniş sürüm daha çok bayt eder', async () => {
    const gorsel = await testGorseli(1400, 900, 30)
    const olcum = (await gorselButcesiniOlc(gorsel))!

    expect(olcum.kartBayt).toBeLessThan(olcum.mobilBayt)
    expect(olcum.mobilBayt).toBeLessThan(olcum.masaustuBayt)
  })

  it('gürültülü görsel düz görselden ağır çıkar', async () => {
    const duz = (await gorselButcesiniOlc(await testGorseli(1400, 900, 0)))!
    const gurultulu = (await gorselButcesiniOlc(await testGorseli(1400, 900, 60)))!

    expect(gurultulu.mobilBayt).toBeGreaterThan(duz.mobilBayt)
  })

  /**
   * ⚠️ Küçük görsel BÜYÜTÜLMEMELİ.
   * Büyütüp ölçmek, olmayan bir maliyeti raporlamak olurdu.
   */
  it('ölçüm genişliğinden dar görselde boyutlar birbirine yaklaşır', async () => {
    const kucuk = await testGorseli(300, 200, 30)
    const olcum = (await gorselButcesiniOlc(kucuk))!

    expect(olcum.mobilBayt).toBe(olcum.masaustuBayt)
  })

  /**
   * ⚠️ Bozuk dosya yüklemeyi ENGELLEMEMELİ.
   * Ölçüm bir kolaylık; tek bir kodlama hatası içerik girişini durdurmamalı.
   */
  it('görsel olmayan veride null döner, hata fırlatmaz', async () => {
    const olcum = await gorselButcesiniOlc(Buffer.from('bu bir görsel değil', 'utf8'))
    expect(olcum).toBeNull()
  })

  it('ölçüm genişlikleri next/image cihaz boyutlarıyla hizalı', () => {
    expect(OLCUM_GENISLIKLERI).toEqual({ kart: 480, mobil: 828, masaustu: 1920 })
  })
})

describe('bütçe hükmü', () => {
  it('eşiğin altı uygun, %80 üstü sınırda, üstü aşıldı', () => {
    const butce = 100
    expect(butceDurumu(50, butce)).toBe('uygun')
    expect(butceDurumu(85, butce)).toBe('sinirda')
    expect(butceDurumu(101, butce)).toBe('asildi')
  })

  it('tam eşik henüz aşılmış sayılmaz', () => {
    expect(butceDurumu(100, 100)).toBe('sinirda')
  })

  it('bütçeler CLAUDE.md hedefleriyle tutarlı', () => {
    expect(BUTCE_BAYT.mobilHero).toBe(80 * 1024)
    expect(BUTCE_BAYT.masaustuHero).toBe(200 * 1024)
    expect(BUTCE_BAYT.kart).toBe(30 * 1024)
  })
})

describe('bayt biçimlendirme', () => {
  it('kilobayta çevirir', () => {
    expect(baytYaz(512)).toBe('512 B')
    expect(baytYaz(80 * 1024)).toBe('80 kB')
  })
})
