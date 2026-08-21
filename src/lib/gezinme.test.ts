import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { ARACLAR } from '@/lib/araclar'
import {
  BASLIK_EYLEMI,
  endeksMenudeGorunurMu,
  MENU_SIRA_SECENEKLERI,
  menuyuSirala,
  menuyuSuz,
  UST_MENU_YAPISI,
  VARSAYILAN_MENU_SIRASI,
} from '@/lib/gezinme'
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

/**
 * ⚠️ ROTA GRUPLARI (`(liste)`) ADRESE GİRMİYOR.
 *
 * Next, parantezli klasörleri URL'den düşürüyor: `portfoy/(liste)/page.tsx`
 * dosyası `/portfoy` adresini karşılıyor. Bu denetim önce yalnızca düz
 * yolu arıyordu ve liste sayfaları rota grubuna alınınca "menüdeki adresin
 * sayfası yok" diye kırıldı — oysa sayfa yerindeydi.
 *
 * Rota grubu, `loading.tsx`in kapsamını daraltmak için eklendi: dosya
 * doğrudan segmentte dururken detay sayfası da onu miras alıyor ve
 * `notFound()` 200 dönüyordu (soft 404). Gerekçenin tamamı
 * `lib/dokuman/soft404.test.ts` içinde.
 */
function rotaVarMi(adres: string): boolean {
  const yol = yolu(adres)
  if (yol === '/') return existsSync(path.join(SITE_KOKU, 'page.tsx'))

  const parcalar = yol.replace(/^\//, '').split('/')
  const dizin = path.join(SITE_KOKU, ...parcalar)

  if (existsSync(path.join(dizin, 'page.tsx'))) return true

  // Rota grubu: `<segment>/(grup)/page.tsx` de aynı adresi karşılıyor.
  if (!existsSync(dizin)) return false
  return readdirSync(dizin, { withFileTypes: true }).some(
    (oge) =>
      oge.isDirectory() &&
      oge.name.startsWith('(') &&
      existsSync(path.join(dizin, oge.name, 'page.tsx')),
  )
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

/**
 * Endeksin iki kapısı.
 *
 * ⚠️ Bu kural bir kez ihlal edildi ve menü 404'e bağlandı: bölüm anahtarı
 * açıktı, veri eşikleri sağlanmıyordu, öğe menüde göründü. Kural artık saf
 * bir fonksiyonda ve test ediliyor.
 */
describe('endeksMenudeGorunurMu', () => {
  it('iki kapı da açıksa görünür', () => {
    expect(endeksMenudeGorunurMu(true, true)).toBe(true)
  })

  it('bölüm kapalıysa görünmez — Aslıhan henüz yayınlamak istemiyor', () => {
    expect(endeksMenudeGorunurMu(false, true)).toBe(false)
  })

  /**
   * ⚠️ En kritik hâl: bölüm açık ama veri yetersiz. Sayfa 404 dönüyor;
   * menüde göstermek ziyaretçiyi doğrudan hataya yollamak olurdu.
   */
  it('veri eşiği sağlanmadıysa görünmez, bölüm açık olsa bile', () => {
    expect(endeksMenudeGorunurMu(true, false)).toBe(false)
  })

  it('ikisi de kapalıysa görünmez', () => {
    expect(endeksMenudeGorunurMu(false, false)).toBe(false)
  })
})

/**
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ MENÜ SIRASI PANELDEN GELİYOR — VE MENÜYÜ TANIMLAMIYOR.
 *
 * Ayrım bu testlerin bütün konusu: panel yalnızca DİZER. Bir başlığın
 * menüde OLUP OLMAMASI Site Bölümleri anahtarına bağlı. Sıra listesi
 * içeriği de belirleseydi, kayıtta eksik kalan bir satır bir sayfayı
 * sessizce erişilemez yapardı — ve sebebi hiçbir yerde görünmezdi.
 * ─────────────────────────────────────────────────────────────────────────
 */
describe('menuyuSirala', () => {
  const yapi = UST_MENU_YAPISI

  it('paneldeki sırayı uygular', () => {
    const sirali = menuyuSirala(yapi, ['iletisim', 'harita', 'portfoy'])
    expect(sirali.slice(0, 3).map((oge) => oge.anahtar)).toEqual(['iletisim', 'harita', 'portfoy'])
  })

  /**
   * ⚠️ EN ÖNEMLİ KURAL: listede adı geçmeyen başlık KAYBOLMAZ.
   *
   * Koda yeni bir menü girişi eklendiğinde ya da Aslıhan bir satırı
   * silmiş olduğunda sayfa menüden düşmemeli. Sona iniyor; görünür
   * kalıyor ve yeri panelden düzeltilebiliyor.
   */
  it('listede olmayan başlığı düşürmez, sona alır', () => {
    const sirali = menuyuSirala(yapi, ['iletisim'])
    expect(sirali).toHaveLength(yapi.length)
    expect(sirali[0]?.anahtar).toBe('iletisim')
    expect(new Set(sirali.map((oge) => oge.anahtar))).toEqual(
      new Set(yapi.map((oge) => oge.anahtar)),
    )
  })

  it('listede olmayanlar kod sırasını korur', () => {
    const sirali = menuyuSirala(yapi, ['iletisim'])
    const kalanKodSirasi = yapi
      .map((oge) => oge.anahtar)
      .filter((anahtar) => anahtar !== 'iletisim')
    expect(sirali.slice(1).map((oge) => oge.anahtar)).toEqual(kalanKodSirasi)
  })

  /** ⚠️ Kaldırılmış bir menü girişinin kaydı menüye boş öğe basmamalı. */
  it('tanınmayan anahtarı yok sayar', () => {
    const sirali = menuyuSirala(yapi, ['artik-yok', 'portfoy'])
    expect(sirali[0]?.anahtar).toBe('portfoy')
    expect(sirali).toHaveLength(yapi.length)
  })

  /** ⚠️ Aynı sayfa menüde iki kez duramaz. */
  it('tekrar eden anahtarı bir kez basar', () => {
    const sirali = menuyuSirala(yapi, ['portfoy', 'portfoy', 'iletisim'])
    expect(sirali.filter((oge) => oge.anahtar === 'portfoy')).toHaveLength(1)
    expect(sirali).toHaveLength(yapi.length)
  })

  it('boş liste kod sırasını verir', () => {
    expect(menuyuSirala(yapi, []).map((o) => o.anahtar)).toEqual(yapi.map((o) => o.anahtar))
    expect(menuyuSirala(yapi, [...VARSAYILAN_MENU_SIRASI]).map((o) => o.anahtar)).toEqual(
      yapi.map((o) => o.anahtar),
    )
  })

  /**
   * ⚠️ SÜZME İLE SIRALAMA BİRLİKTE: kapalı bölüm geri gelmemeli.
   *
   * "Listede yoksa sona ekle" kuralı, süzme SONRA çalıştırılsaydı kapalı
   * bir öğeyi menüye geri koyabilirdi. `layout.tsx` önce süzüyor; bu test
   * o sıranın sonucunu kilitliyor.
   */
  it('kapalı bölüm sıralamadan sonra da menüde değil', () => {
    const acik = new Set(
      BOLUMLER.map((bolum) => bolum.anahtar).filter((anahtar) => anahtar !== 'harita'),
    )
    const menu = menuyuSirala(menuyuSuz(UST_MENU_YAPISI, acik), ['harita', 'portfoy'])
    expect(menu.map((oge) => oge.anahtar)).not.toContain('harita')
    expect(menu[0]?.anahtar).toBe('portfoy')
  })

  /** ⚠️ Anahtarlar sıralamanın kimliği: benzersiz ve boş olmamalı. */
  it('menü anahtarları benzersiz', () => {
    const anahtarlar = yapi.map((oge) => oge.anahtar)
    expect(new Set(anahtarlar).size).toBe(anahtarlar.length)
    expect(anahtarlar.every((anahtar) => anahtar.length > 0)).toBe(true)
  })

  /**
   * ⚠️ Panelin seçenek listesi menüden TÜRETİLMELİ. Elle yazılsaydı yeni
   * bir başlık eklendiğinde sıralanamaz olurdu ve kimse fark etmezdi.
   */
  it('panel seçenekleri menüyle birebir aynı', () => {
    expect(MENU_SIRA_SECENEKLERI.map((secenek) => secenek.value)).toEqual(
      yapi.map((oge) => oge.anahtar),
    )
    expect(VARSAYILAN_MENU_SIRASI).toEqual(yapi.map((oge) => oge.anahtar))
  })
})

/**
 * ⚠️ AÇILIP KAPANABİLEN MENÜ ÖĞESİNİN ROTASI DA KAPANMALI.
 *
 * Menüden düşen ama adresi çalışmaya devam eden bir sayfa, "kapattım ama
 * Google hâlâ gösteriyor" durumudur. Şartname Danışman Ol ve Harita için
 * açıkça 404 istiyor; bu test ikisinin de rota tanımını ve sayfadaki
 * kapıyı arıyor.
 */
describe('kapatılabilir menü öğeleri', () => {
  it.each([
    ['danisman_ol', '/danisman-ol', 'danisman-ol'],
    ['harita', '/harita', 'harita'],
  ])('%s bölümü rota taşıyor ve sayfası kapı çağırıyor', (anahtar, adres, klasor) => {
    const bolum = BOLUMLER.find((aday) => aday.anahtar === anahtar)
    expect(bolum?.rotalar).toContain(adres)

    const sayfa = readFileSync(path.join(SITE_KOKU, klasor, 'page.tsx'), 'utf8')
    expect(sayfa).toContain(`bolumKapisi('${anahtar}')`)
  })

  it('ikisi de üst menüde ve bölüm anahtarına bağlı', () => {
    for (const anahtar of ['danisman_ol', 'harita']) {
      const oge = UST_MENU_YAPISI.find((aday) => aday.anahtar === anahtar)
      expect(oge, `${anahtar} üst menüde yok`).toBeDefined()
      expect(oge?.bolum).toBe(anahtar)
    }
  })

  /**
   * ⚠️ ENDEKS'İN İKİNCİ KAPISI SIRALAMADAN SONRA DA DURUYOR.
   *
   * Sıralama eklenirken en kolay hata, süzülmüş listeyi bırakıp ham
   * yapıyı dizmek olurdu. O durumda Endeks veri eşiği sağlanmasa da
   * menüye geri gelirdi — tam olarak bir kez yaşanan hata.
   */
  it('endeks eşik sağlanmadığında sıralamadan sonra da menüde değil', () => {
    const acik = new Set(BOLUMLER.map((bolum) => bolum.anahtar))
    if (!endeksMenudeGorunurMu(true, false)) acik.delete('endeks')

    const menu = menuyuSirala(menuyuSuz(UST_MENU_YAPISI, acik), ['endeks', 'portfoy'])
    expect(menu.map((oge) => oge.anahtar)).not.toContain('endeks')
  })
})
