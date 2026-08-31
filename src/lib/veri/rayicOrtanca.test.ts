import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { sokaklariTopla } from './rayic'

/**
 * Rayiç: sokak kayıtlarından mahalle rakamı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ÜRETİMDE ÖLÇÜLEN DURUM — 31 Ağustos 2026.
 *
 * Veritabanında 3.366 rayiç kaydı vardı, hepsi mahallelerle DOĞRU
 * eşleşmişti, yılları doluydu — ve site yirmi altı mahallenin hepsinde
 * "Rayiç bedel henüz girilmedi" diyordu.
 *
 * Sebep okuma yolundaydı: yalnızca sokağı BOŞ olan kayıt aranıyordu ve
 * belediye tablosu sokak sokak geliyor. Hiçbir kayıt mahalle geneli
 * değildi.
 * ─────────────────────────────────────────────────────────────────────────
 */

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const kayit = (bina: number | null, yil = 2026, sokak = 'X SK.') => ({
  mahalle: 1,
  yil,
  sokak,
  metrekareRayicBedel: bina,
  arsaRayicBedel: bina,
  kaynak: 'belediye',
})

describe('sokak kayıtları toplulaştırılıyor', () => {
  it('ortanca alınıyor, ortalama DEĞİL', () => {
    /**
     * ⚠️ Dağılım çok geniş: üretimde 24 ₺/m² tarla ile 35.000 ₺/m² cadde
     * aynı mahallede. Ortalama birkaç cadde tarafından yukarı çekilir;
     * ortanca çekilmez.
     */
    const sonuc = sokaklariTopla(
      [kayit(1000), kayit(2000), kayit(3000), kayit(4000), kayit(90_000)],
      1,
    )
    expect(sonuc?.metrekareRayicBedel).toBe(3000)
    // Ortalama 20.000 olurdu — tek bir caddenin ürünü.
  })

  it('çift sayıda kayıtta iki ortanın ortalaması', () => {
    expect(sokaklariTopla([kayit(1000), kayit(3000)], 1)?.metrekareRayicBedel).toBe(2000)
  })

  it('kaç kayda dayandığı (n) ve aralık taşınıyor', () => {
    const sonuc = sokaklariTopla([kayit(1000), kayit(5000), kayit(9000)], 1)
    expect(sonuc?.kayitSayisi).toBe(3)
    expect(sonuc?.enDusuk).toBe(1000)
    expect(sonuc?.enYuksek).toBe(9000)
    expect(sonuc?.kapsam).toBe('sokak_ortancasi')
  })

  it('yalnızca EN SON yılın kayıtları', () => {
    /**
     * ⚠️ Farklı yılların rakamlarını aynı ortancaya katmak, zamla gelen
     * artışı mahalle içi fark sanmak olurdu.
     */
    const sonuc = sokaklariTopla(
      [kayit(1000, 2024), kayit(2000, 2024), kayit(9000, 2026), kayit(11_000, 2026)],
      1,
    )
    expect(sonuc?.yil).toBe(2026)
    expect(sonuc?.metrekareRayicBedel).toBe(10_000)
    expect(sonuc?.kayitSayisi).toBe(2)
  })

  it('boş liste null', () => {
    expect(sokaklariTopla([], 1)).toBeNull()
  })

  it('rakamı olmayan kayıtlar null üretiyor', () => {
    expect(sokaklariTopla([kayit(null), kayit(null)], 1)).toBeNull()
  })
})

describe('mahalle geneli kaydı öncelikli', () => {
  const kaynak = readFileSync(path.join(KOK, 'lib/veri/rayic.ts'), 'utf8')

  it('önce mahalle geneli aranıyor', () => {
    /**
     * ⚠️ Elle girilmiş bir "mahalle geneli" kaydı kasıtlıdır; onu
     * yüzlerce sokak kaydının ortancasında eritmek, insanın verdiği
     * kararı yok saymak olurdu.
     */
    expect(kaynak).toContain('sokak: { exists: false }')
    expect(kaynak).toContain('if (kayit) return kayitCoz')
  })

  it('mahalle geneli kayıtta kapsam doğru işaretleniyor', () => {
    expect(kaynak).toContain("kapsam: 'mahalle_geneli'")
  })

  it('hesaplayıcı listesi de aynı mantığı kullanıyor', () => {
    // Sayfa ve hesaplayıcı aynı veriye farklı cevap vermemeli.
    expect(kaynak).toContain('sokaklariTopla(sokakBasina.get(mahalleId) ?? [], mahalleId)')
  })
})

describe('kapsam ekranda yazılı', () => {
  const bilesen = readFileSync(path.join(KOK, 'components/mahalle/RayicPiyasaOrani.tsx'), 'utf8')

  it('n ve kapsam gösteriliyor', () => {
    expect(bilesen).toContain('sokak kaydının ortancası')
    expect(bilesen).toContain('mahalle geneli kaydı')
  })

  it('sokaklar arası aralık gösteriliyor', () => {
    // Mahalle içindeki fark, ortancanın kendisi kadar bilgi.
    expect(bilesen).toContain('Sokaklar arası')
  })

  it('ortalama DEĞİL ortanca olduğu yazılı', () => {
    expect(bilesen).toContain('ortalama değil')
  })
})

describe('bina = arsa tuzağı', () => {
  const cekirdek = readFileSync(path.join(KOK, 'lib/rayic/iceAktarmaCekirdegi.ts'), 'utf8')

  it('aynı sütun iki alana bağlanırsa uyarı çıkıyor', () => {
    /**
     * ⚠️ Üretimde 3.366 kaydın HEPSİNDE bina ile arsa birebir aynıydı:
     * tek değer sütunu ikisine birden bağlanmıştı. Satır bazlı hiçbir
     * hata yoktu — iki alan da doluydu. Eşleme düzeyinde bakmadan
     * görülemezdi.
     */
    expect(cekirdek).toContain('binaSutun === arsaSutun')
    expect(cekirdek).toContain('eslemeUyarilari')
  })
})
