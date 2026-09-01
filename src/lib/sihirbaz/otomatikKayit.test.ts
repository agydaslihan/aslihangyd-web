import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { ADIMLAR } from './sema'

/**
 * Sihirbazın genişletilmiş hâlinin kuralları — kaynak seviyesinde.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ OTOMATİK KAYDETME BİR RİSK AÇTI VE O RİSK BURADA KAPALI TUTULUYOR.
 *
 * Eski sihirbaz yalnızca `create` yapıyordu; kimlik taşımıyordu ve yanlış
 * bir kaydı ezmesi mümkün değildi. Otomatik kaydetme, kimliği istemcide
 * tutmayı zorunlu kıldı — ve istemcide tutulan her kimlik, değiştirilebilir
 * bir kimliktir.
 *
 * Yayındaki bir ilanın kimliği gönderilseydi otomatik kaydetme onu sessizce
 * ezerdi: fiyat, açıklama, fotoğraflar. Aşağıdaki iddialar o kapıyı kapalı
 * tutuyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const oku = (goreli: string) => readFileSync(path.join(KOK, goreli), 'utf8')

/**
 * Yorumları soyulmuş kaynak.
 *
 * ⚠️ ŞART. İlk hâlde `overrideAccess: true` iddiası, o ifadeyi YASAKLAYAN
 * bir yorum satırında eşleşti ve test kendi belgesini ihlal sandı. Bu
 * projede aynı tuzağa daha önce de düşüldü; gevşek bir kalıp, yanlış yerde
 * kırılan bir denetimdir.
 */
const govde = (goreli: string) =>
  oku(goreli)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

describe('taslak dışı kayıt korunuyor', () => {
  const eylem = govde('lib/sihirbaz/eylemler.ts')

  it('güncellemeden ÖNCE kayıt okunuyor', () => {
    expect(eylem).toContain('payload.findByID')
  })

  it('taslak olmayan kayıt REDDEDİLİYOR', () => {
    expect(eylem).toMatch(/mevcut\.durum !== 'taslak'/)
  })

  it('okuma da erişim kurallarına tabi', () => {
    // `overrideAccess: false` olmadan başkasının kaydı da okunabilirdi.
    expect(eylem).not.toContain('overrideAccess: true')
  })
})

describe('durum alanı istemciden gelmiyor', () => {
  it('şemada `durum` yok', () => {
    const sema = govde('lib/sihirbaz/sema.ts')
    expect(sema).not.toMatch(/^\s*durum:/m)
  })

  it('eşleme `durum`u SABİT yazıyor', () => {
    const cevir = govde('lib/sihirbaz/veriyeCevir.ts')
    expect(cevir).toContain("durum: 'taslak'")
    expect(cevir).not.toMatch(/durum: veri\./)
  })
})

describe('adımlar ve şartname karşılığı', () => {
  /**
   * ⚠️ Şartname sekiz adım sayıyor. Bir adımın sessizce düşmesi, o adıma
   * ait alanların panelde hiç doldurulamaması demek.
   */
  it('adım sırası şartnamedeki gibi — dokuz adım', () => {
    expect(ADIMLAR.map((a) => a.anahtar)).toEqual([
      'kategori',
      'temel',
      'tapu',
      'nitelikler',
      'fiyat',
      'gorseller',
      'aciklama',
      'medya',
      'onizleme',
      'yayin',
    ])
  })
})

describe('sahada kullanım', () => {
  const bilesen = govde('components/sihirbaz/PortfoySihirbazi.tsx')

  it('otomatik kaydetme var ve aralığı yazılı', () => {
    expect(bilesen).toContain('OTOMATIK_KAYIT_MS')
    expect(bilesen).toContain('30_000')
  })

  it('otomatik kaydetme MAHALLE seçilmeden çalışmıyor', () => {
    /**
     * ⚠️ Mahalle, kaydı açmanın tek şartı. Seçilmeden atılan bir otomatik
     * kayıt, kullanıcı henüz hiçbir şey yapmamışken her 30 saniyede bir
     * aynı hatayı gösterirdi.
     */
    expect(bilesen).toMatch(/if \(\(formRef\.current\.mahalle as string\) === ''\) return/)
  })

  it('kaydedilmemiş değişiklikte çıkış uyarısı var', () => {
    expect(bilesen).toContain('beforeunload')
  })

  it('çıkış uyarısı YALNIZCA kirli formda', () => {
    // Her ayrılışta soran bir uyarı refleksle kapatılır ve gerçekten
    // gerektiğinde de kapatılır.
    expect(bilesen).toMatch(/if \(!kirli \|\| bitti\) return\n\s+const uyar/)
  })

  it('konum GPS’ten alınabiliyor', () => {
    expect(bilesen).toContain('navigator.geolocation')
  })

  it('fotoğraf girişi kamerayı kapatmıyor', () => {
    /**
     * ⚠️ `capture` yazmak galeriyi kapatıp yalnızca kamerayı açar. Sahada
     * çekilen fotoğraf kadar, önceden çekilmiş fotoğraf da yükleniyor.
     *
     * ⚠️ Bu iddia HAM kaynağa bakıyor: `accept="image/*"` ifadesindeki
     * `/*`, yorum soyucusunu yanıltıp dosyanın yarısını yutuyordu. Ölçüm
     * aracının kendi tuzağı, ölçülen şeyin arızası gibi görünüyordu.
     */
    const ham = oku('components/sihirbaz/PortfoySihirbazi.tsx')
    expect(ham).toContain('accept="image/')
    expect(ham).not.toContain('capture=')
  })

  it('görsel sıralaması klavyeyle de yapılabiliyor', () => {
    // Sürükle-bırak klavyeyle kullanılamıyor; yukarı/aşağı düğmeleri şart.
    expect(bilesen).toContain('fotoğrafı yukarı taşı')
    expect(bilesen).toContain('fotoğrafı aşağı taşı')
  })

  it('adımlar arası gezinme serbest', () => {
    // Adım başlıkları buton; sıralı zorlama yok.
    expect(bilesen).toMatch(/onClick=\{\(\) => adimaGit\(sira\)\}/)
  })
})

describe('yayın adımı kapı değil ayna', () => {
  const bilesen = govde('components/sihirbaz/PortfoySihirbazi.tsx')

  it('EİDS kararını kendi üretmiyor, motordan alıyor', () => {
    expect(bilesen).toContain('eidsDegerlendir')
    expect(bilesen).toContain('eids.yayinlanabilir')
  })

  it('sihirbazdan yayına alınamıyor', () => {
    // 'yayinda' dizgisi hiçbir yere yazılmıyor.
    expect(bilesen).not.toContain("'yayinda'")
  })
})
