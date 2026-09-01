import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Göç anlık görüntüsü denetimi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ 31 AĞUSTOS 2026: İKİ DAL, İKİ GÖÇ, KAYBOLAN İKİ TABLO
 *
 * `payload migrate:create` ayrışmayı veritabanına değil, **en son göçün
 * `.json` şema anlık görüntüsüne** bakarak buluyor. Her göç, üretildiği
 * dalın gördüğü şemanın TAMAMINI yazıyor.
 *
 * İki dal paralel ilerlediğinde bu sessizce kırılıyor:
 *
 *   A dalı → `olcek_duzeltmeleri` koleksiyonu + göçü (73 → 75 tablo)
 *   B dalı → `corluAnlatisi` global'i + göçü (72 → 73 tablo, A'yı görmüyor)
 *   B sonra merge oldu → en son anlık görüntü A'nın iki tablosunu KAYBETTİ
 *
 * Sonuç: göç dosyası doğru, veritabanı doğru, ama CI'ın göç tazeliği kapısı
 * her koşumda "eksik göç var" diyerek main'i kırmızıya çeviriyor.
 *
 * Bu test o kaybı doğrudan yakalıyor: bir tablo anlık görüntüden ancak bir
 * göç onu gerçekten DÜŞÜRÜYORSA çıkabilir.
 * ─────────────────────────────────────────────────────────────────────────
 */

const DIZIN = join(process.cwd(), 'src', 'migrations')

const gocAdlari = readdirSync(DIZIN)
  .filter((ad) => ad.endsWith('.json'))
  .sort()

const tablolar = (ad: string): Set<string> => {
  const icerik = JSON.parse(readFileSync(join(DIZIN, ad), 'utf-8')) as {
    tables?: Record<string, unknown>
  }
  return new Set(Object.keys(icerik.tables ?? {}))
}

/** Göçlerin `up` gövdesinde gerçekten düşürülen tablolar. */
const dusurulenler = (): Set<string> => {
  const kume = new Set<string>()
  for (const ad of readdirSync(DIZIN).filter((a) => a.endsWith('.ts'))) {
    const kaynak = readFileSync(join(DIZIN, ad), 'utf-8')
    const up = kaynak.slice(0, kaynak.indexOf('export async function down'))
    for (const eslesme of up.matchAll(/DROP TABLE (?:IF EXISTS )?"([^"]+)"/g)) {
      kume.add(eslesme[1] as string)
    }
  }
  return kume
}

describe('göç anlık görüntüleri', () => {
  it('en az iki göç var (test anlamlı olsun)', () => {
    expect(gocAdlari.length).toBeGreaterThan(1)
  })

  /**
   * ⚠️ ASIL KURAL — CI'ın göç tazeliği kapısı yalnızca EN SON anlık
   * görüntüye bakıyor. Ara bir görüntüde kaybolup sonra geri gelen tablo
   * kapıyı kırmıyor; en sonda eksik olan kırıyor.
   *
   * ⚠️ Ara görüntülerde bu daha önce DÖRT KEZ oldu ve kendiliğinden
   * düzeldi: `portfoy_bolumleri` (+ `_siralar`) 6 Ağustos'ta,
   * `hakkimizda` (+ `_ek_gorseller`) 16 Ağustos'ta. Bu yüzden test ara
   * adımları değil, son durumu kilitliyor — geçmişi yeniden yazamayız,
   * ama bundan sonrasını garanti edebiliriz.
   */
  it('en son anlık görüntü tüm tabloları taşıyor', () => {
    const hepsi = new Set<string>()
    for (const ad of gocAdlari) for (const tablo of tablolar(ad)) hepsi.add(tablo)

    const son = tablolar(gocAdlari[gocAdlari.length - 1] as string)
    const dusen = dusurulenler()
    const eksik = [...hepsi].filter(
      (tablo) => !son.has(tablo) && !dusen.has(tablo.replace(/^public\./, '')),
    )

    expect(eksik).toEqual([])
  })
})
