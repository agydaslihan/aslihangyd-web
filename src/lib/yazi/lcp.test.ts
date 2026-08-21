import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const KOK = path.resolve(dirname, '../..')
const oku = (yol: string) => readFileSync(path.join(KOK, yol), 'utf8')

/**
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: LCP ÖĞESİ TEMBEL YÜKLENEN BİR GÖRSEL OLABİLİYOR.
 *
 * `/mahalleler` ölçüldüğünde sayfanın en büyük öğesi ilk mahalle kartının
 * kapak görseli çıktı — ve o görsel `loading="lazy"` taşıyordu. Yani
 * sayfanın LCP öğesi, tarayıcıya "acelesi yok" diye işaretlenmişti. Mobilde
 * kart görüş alanının içinde duruyordu (üst kenar 533 px).
 *
 * Bu, ekranda hiçbir iz bırakmayan türden bir gerileme: sayfa doğru görünür,
 * yalnızca geç görünür. Ancak alan ölçümüyle ya da Lighthouse'la yakalanır.
 *
 * ⚠️ Tembel yükleme YANLIŞ DEĞİL, varsayılan olarak doğru: 26 kartın 23'ü
 * ekranın altında. Kural "hepsi öncelikli olsun" değil, "ilk ekrandakiler
 * öncelikli olsun".
 * ─────────────────────────────────────────────────────────────────────────
 */
describe('ilk ekrandaki görseller öncelikli', () => {
  it('mahalle kartı öncelik alabiliyor', () => {
    const kart = oku('components/mahalle/MahalleKarti.tsx')
    expect(kart).toContain('oncelikli?: boolean')
    expect(kart).toContain('priority={oncelikli}')
  })

  it('mahalleler listesi ilk kartlara öncelik veriyor', () => {
    expect(oku('app/(site)/mahalleler/(liste)/page.tsx')).toContain('oncelikli={sira < 3}')
  })

  /**
   * ⚠️ ANA SAYFADA MAHALLE KARTLARI ÖNCELİKSİZ VE BU BİLİNÇLİ.
   *
   * Orada kartlar sayfanın çok altında: önce vitrin, güven kartları, slider
   * bandı, arama, üç yol ayrımı, yaklaşım, portföy ızgarası geliyor. Öncelik
   * vermek, gerçek LCP adayı olan vitrin sahnesinin bant genişliğini yerdi.
   *
   * Aynı ders `/portfoy` ızgarasında da ölçülmüştü: iki `preload` etiketi
   * çıkmış ve ikisi de AYNI dosyayı işaret ediyordu.
   */
  it('ana sayfada mahalle kartları önceliksiz', () => {
    const sayfa = oku('app/(site)/page.tsx')
    const bolum = sayfa.slice(sayfa.indexOf('mahalleler.slice(0, 6)'))
    const kartCagrisi = bolum.slice(0, bolum.indexOf('</Sahne>'))
    expect(
      kartCagrisi.includes('oncelikli'),
      'Ana sayfada mahalle kartlarına öncelik verilmiş: vitrin sahnesinin ' +
        'bant genişliğini yer ve gerçek LCP öğesini geciktirir.',
    ).toBe(false)
  })
})
