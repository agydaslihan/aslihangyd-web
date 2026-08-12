import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { ARACLAR } from '@/lib/araclar'
import { BASLIK_EYLEMI, menuyuSuz, UST_MENU_YAPISI } from '@/lib/gezinme'
import { BOLUMLER } from '@/lib/siteBolumleri'

/**
 * Üst menü bağlantılarının gerçek sayfalara gittiğini sınar.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: MENÜ 404'E BAĞLANMIŞTI.
 *
 * Aşama 2'de şartname §4 harfiyen uygulandı ve "Endeks" üst menüye kondu.
 * Öğe site bölümü anahtarına bağlanmıştı — ama `/endeks`in İKİ kapısı var:
 * bölüm anahtarı VE veri eşikleri (CLAUDE.md 6c). Geliştirme
 * veritabanında bölüm açıktı, eşikler sağlanmıyordu; menüde "Endeks"
 * görünüyor ve tıklayan 404 alıyordu. Duman testinde yakalandı.
 *
 * Bu test statik olan kısmı kapatıyor: her menü adresinin karşılığında
 * gerçek bir `page.tsx` var mı. Çalışma zamanı kapıları (bölüm anahtarı,
 * veri eşiği) ayrı; onlar `layout.tsx` içinde tek bir yardımcıya bağlandı.
 * ─────────────────────────────────────────────────────────────────────────
 */

const dirname = path.dirname(fileURLToPath(import.meta.url))
const SITE_KOKU = path.resolve(dirname, '../app/(site)')

/** `/portfoy?tip=satilik` → `/portfoy` */
function yolu(adres: string): string {
  return adres.split('?')[0] ?? adres
}

function rotaVarMi(adres: string): boolean {
  const yol = yolu(adres)
  if (yol === '/') return existsSync(path.join(SITE_KOKU, 'page.tsx'))
  return existsSync(path.join(SITE_KOKU, yol.replace(/^\//, ''), 'page.tsx'))
}

/** Menüdeki tüm adresler — üst seviye + mega öğeler + sağdaki eylem. */
function tumAdresler(): string[] {
  // `as const` yüzünden dizi tipi daralıyor; genişletiyoruz.
  const adresler: string[] = [BASLIK_EYLEMI.adres]
  for (const oge of UST_MENU_YAPISI) {
    adresler.push(oge.adres)
    for (const alt of oge.mega ?? []) adresler.push(alt.adres)
  }
  return adresler
}

describe('üst menü yapısı', () => {
  it('her bağlantının karşılığında gerçek bir sayfa var', () => {
    const kirik = tumAdresler().filter((adres) => !rotaVarMi(adres))

    expect(
      kirik,
      'Bu menü adreslerinin karşılığında `page.tsx` yok — ziyaretçi 404 alır.\n' +
        `Kırık: ${kirik.join(', ')}`,
    ).toEqual([])
  })

  /**
   * ⚠️ Kapalı olabilen her sayfa bir bölüm anahtarı TAŞIMALI.
   *
   * Anahtarsız bir öğe her zaman görünür. Kapatılabilir bir sayfaya
   * anahtarsız bağlantı vermek, bölüm kapatıldığı anda menüyü 404'e
   * bağlamak demek — Endeks'te tam olarak bu oldu.
   */
  it('kapatılabilir sayfalara bağlanan öğeler bölüm anahtarı taşıyor', () => {
    /**
     * ⚠️ Yalnızca `rotalar` — `adres` DEĞİL.
     *
     * `rotalar` bölüm kapalıyken 404 dönen yolları listeler. `adres` ise
     * "özellik nerede yaşıyor" bilgisidir: `ai_arama` bölümünün adresi
     * `/portfoy` ama rotaları boş; kapatıldığında sayfa değil yalnızca
     * arama kutusu kayboluyor. `adres`e bakmak Portföy'ü kapatılabilir
     * sanmak olurdu.
     */
    const kontrolluAdresler = new Map<string, string>()
    for (const bolum of BOLUMLER) {
      for (const adres of bolum.rotalar) {
        if (adres !== '') kontrolluAdresler.set(adres, bolum.anahtar)
      }
    }

    const eksikler: string[] = []
    for (const oge of UST_MENU_YAPISI) {
      const beklenen = kontrolluAdresler.get(yolu(oge.adres))
      if (beklenen !== undefined && oge.bolum !== beklenen) {
        eksikler.push(`${oge.adres} → bölüm anahtarı '${beklenen}' olmalı, '${oge.bolum}' yazılmış`)
      }

      for (const alt of oge.mega ?? []) {
        const altBeklenen = kontrolluAdresler.get(yolu(alt.adres))
        if (altBeklenen !== undefined && alt.bolum !== altBeklenen) {
          eksikler.push(
            `${alt.adres} → bölüm anahtarı '${altBeklenen}' olmalı, '${alt.bolum}' yazılmış`,
          )
        }
      }
    }

    expect(eksikler, `Bölüm anahtarı eksik/yanlış:\n  ${eksikler.join('\n  ')}`).toEqual([])
  })

  /**
   * ⚠️ Hesaplayıcılar tek kaynaktan (`ARACLAR`) türetilmeli.
   *
   * Elle yazılsaydı yeni bir hesaplayıcı eklendiğinde menüye koymayı
   * unutmak kaçınılmazdı ve kimse fark etmezdi — araç sayfası dolu,
   * menü eksik olurdu.
   */
  it('araçlar mega menüsü ARACLAR listesinin tamamını taşıyor', () => {
    const araclarMenusu = UST_MENU_YAPISI.find((oge) => oge.adres === '/araclar')
    expect(araclarMenusu?.mega).toBeDefined()

    const menudekiAdresler = new Set(araclarMenusu!.mega!.map((alt) => alt.adres))
    const eksikler = ARACLAR.filter((arac) => !menudekiAdresler.has(arac.adres)).map((a) => a.adres)

    expect(eksikler, `menüde olmayan araçlar: ${eksikler.join(', ')}`).toEqual([])
  })

  it('her mega öğesinin açıklaması var — boş satır basılmaz', () => {
    const bos: string[] = []
    for (const oge of UST_MENU_YAPISI) {
      for (const alt of oge.mega ?? []) {
        if (alt.aciklama.trim() === '') bos.push(alt.adres)
      }
    }
    expect(bos).toEqual([])
  })
})

describe('menuyuSuz', () => {
  it('kapalı bölümün üst seviye öğesini düşürür', () => {
    const sonuc = menuyuSuz(UST_MENU_YAPISI, new Set(['ticari', 'gizli_portfoy']))
    expect(sonuc.some((oge) => oge.adres === '/endeks')).toBe(false)
  })

  it('kapalı bölümün mega öğesini düşürür, üstünü bırakır', () => {
    const sonuc = menuyuSuz(UST_MENU_YAPISI, new Set([]))
    const portfoy = sonuc.find((oge) => oge.adres === '/portfoy')

    expect(portfoy, 'Portföy kendisi bölüm anahtarı taşımıyor, kalmalı').toBeDefined()
    expect(portfoy?.mega?.some((alt) => alt.adres === '/gizli-portfoy')).toBe(false)
    // Anahtarsız mega öğeleri (Satılık/Kiralık) her zaman kalır.
    expect(portfoy?.mega?.some((alt) => alt.adres.startsWith('/portfoy?'))).toBe(true)
  })

  it('bütün bölümler açıkken hiçbir şey düşmez', () => {
    const hepsi = new Set(BOLUMLER.map((bolum) => bolum.anahtar))
    const sonuc = menuyuSuz(UST_MENU_YAPISI, hepsi)

    expect(sonuc).toHaveLength(UST_MENU_YAPISI.length)
    expect(sonuc.find((oge) => oge.adres === '/araclar')?.mega).toHaveLength(
      UST_MENU_YAPISI.find((oge) => oge.adres === '/araclar')!.mega!.length,
    )
  })
})
