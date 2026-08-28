import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { whatsappBaglantisi } from '../bicimlendirme'
import {
  ASGARI_PUAN,
  ilanaUygunTalepler,
  ilaniPuanla,
  type IlanOzeti,
  type TalepProfili,
} from './eslestirme'

/**
 * Ters eşleştirme — "bu ilana kim uyar?"
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ EN ÖNEMLİ İDDİA: İKİ YÖN AYNI ÇİFTTE AYNI PUANI VERİYOR.
 *
 * Ters yön için ikinci bir puanlama yazmak cazipti ("ilan tarafından
 * bakınca ağırlıklar farklı olmalı"). Yanlış olurdu: iki motorun aynı
 * talep–ilan çiftinde farklı puan verdiği gün, hangisinin doğru olduğu
 * sorulamaz hâle gelir ve panelde iki sayı gören kişi ikisine de
 * güvenmez.
 *
 * Aşağıdaki test o kararı kilitliyor: ters yön, düz yönün ta kendisi.
 * ─────────────────────────────────────────────────────────────────────────
 */

const dizin = path.dirname(fileURLToPath(import.meta.url))
const KOK = path.resolve(dizin, '../..')

const ILAN: IlanOzeti = {
  id: 7,
  baslik: '3+1 daire',
  tip: 'satilik',
  kategori: 'konut',
  fiyat: 3_000_000,
  mahalleId: 2,
  mahalleAdi: 'Muhittin',
  odaSayisi: '3+1',
  brutM2: 130,
}

function talep(ek: Partial<TalepProfili> = {}): TalepProfili {
  return {
    tip: 'alici',
    butceMin: 2_500_000,
    butceMax: 3_500_000,
    mahalleId: 2,
    ilanId: null,
    mesaj: '3+1 arıyorum',
    ...ek,
  }
}

describe('ters eşleştirme', () => {
  it('düz yönle AYNI puanı veriyor — tek motor, tek doğru', () => {
    const profil = talep()
    const duz = ilaniPuanla(profil, ILAN)
    const ters = ilanaUygunTalepler(ILAN, [{ id: 1, profil }])

    expect(duz).not.toBeNull()
    expect(ters).toHaveLength(1)
    expect(ters[0]!.puan).toBe(duz!.puan)
    expect(ters[0]!.gerekce).toBe(duz!.gerekce)
  })

  it('elenen talep listeye girmiyor', () => {
    /**
     * ⚠️ Sert eleme puanlamadan ÖNCE: kiralık arayan birine satılık bir
     * daire önermek, düşük puanlı bir öneri değil YANLIŞ bir öneridir.
     */
    const kiralikArayan = talep({ tip: 'kiraci' })
    expect(ilanaUygunTalepler(ILAN, [{ id: 1, profil: kiralikArayan }])).toHaveLength(0)
  })

  it('asgari puanın altı listelenmiyor', () => {
    const uzak = talep({ butceMin: 100_000, butceMax: 200_000, mahalleId: 99, mesaj: null })
    const sonuc = ilanaUygunTalepler(ILAN, [{ id: 1, profil: uzak }])
    for (const eslesme of sonuc) expect(eslesme.puan).toBeGreaterThanOrEqual(ASGARI_PUAN)
  })

  it('eşit puanda sıralama KARARLI — liste her açılışta yer değiştirmiyor', () => {
    const profil = talep()
    const sonuc = ilanaUygunTalepler(ILAN, [
      { id: 9, profil },
      { id: 3, profil },
      { id: 5, profil },
    ])
    expect(sonuc.map((e) => e.talepId)).toEqual([3, 5, 9])
  })

  it('adet sınırı uygulanıyor', () => {
    const profil = talep()
    const havuz = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, profil }))
    expect(ilanaUygunTalepler(ILAN, havuz, 8)).toHaveLength(8)
  })
})

describe('ters eşleştirmenin sınırları — kaynak denetimi', () => {
  const kodu = (goreli: string) => readFileSync(path.join(KOK, goreli), 'utf8')
  const govde = (goreli: string) =>
    kodu(goreli)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')

  it('kapanmış talepler havuza GİRMİYOR', () => {
    /**
     * ⚠️ "Kazanıldı" ve "kaybedildi" artık aranacak kişiler değil. Havuza
     * katılsalardı liste her ay biraz daha uzar ve en üstteki öneri altı
     * ay önce evini almış birini gösterirdi — ekran bir kez yanlış kişiyi
     * gösterdiğinde bir daha açılmaz.
     */
    const veri = govde('lib/veri/crmEslestirme.ts')
    expect(veri).toMatch(/KAPALI_DURUMLAR = \['kazanildi', 'kaybedildi'\]/)
    expect(veri).toMatch(/durum: \{ not_in: \[\.\.\.KAPALI_DURUMLAR\] \}/)
  })

  it('yayında olmayan ilanda öneri gösterilmiyor', () => {
    /**
     * ⚠️ Taslak bir ilanı müşteriye anlatmak, EİDS kapısından geçmemiş bir
     * taşınmazı pazarlamak olur (CLAUDE.md kural 1).
     */
    const bilesen = govde('components/panel/IlanEslesmeleri.tsx')
    expect(bilesen).toMatch(/durum !== 'yayinda' && durum !== 'rezerve'/)
  })

  it('oturum kapısı var — müşteri adı ve telefonu sızmıyor', () => {
    const bilesen = govde('components/panel/IlanEslesmeleri.tsx')
    expect(bilesen).toMatch(/if \(!user\) return null/)
  })

  it('WhatsApp bağlantısı AÇIYOR, göndermiyor', () => {
    /**
     * ⚠️ Otomatik gönderim, kişiye kendi rızası dışında ticari ileti
     * göndermek olurdu. `wa.me` bağlantısı yalnızca konuşmayı önceden
     * yazılmış metinle açıyor.
     */
    const bilesen = govde('components/panel/IlanEslesmeleri.tsx')
    expect(bilesen).toContain('whatsappBaglantisi(')
    expect(bilesen).not.toMatch(/fetch\(|sendBeacon|api\/whatsapp/)
  })

  it('WhatsApp metninde FİYAT yok', () => {
    /**
     * ⚠️ Pazarlığa açık ilanlarda fiyat yazmak bağlayıcı bir teklif gibi
     * okunabilir. İlan sayfası zaten doğru yeri gösteriyor.
     */
    const bilesen = kodu('components/panel/IlanEslesmeleri.tsx')
    const mesaj = /function mesajKur[\s\S]*?\n}/.exec(bilesen)?.[0] ?? ''
    expect(mesaj.length).toBeGreaterThan(0)
    /**
     * ⚠️ SÖZCÜK SINIRI ŞART. İlk yazdığım kalıp `/TL/i` idi ve
     * "ölçü**tl**ere" kelimesinde eşleşti — test kendi metnini ihlal
     * sandı. Gevşek bir kalıp, yanlış yerde kırılan bir denetimdir.
     */
    expect(mesaj).not.toMatch(/\bfiyat|paraYaz|\bTL\b|₺/i)
  })

  it('WhatsApp bağlantısı uluslararası biçim üretiyor', () => {
    /**
     * ⚠️ ÖLÇÜMLE YAKALANDI. Müşteri iletişim formuna telefonunu `0536...`
     * diye yazıyor; `wa.me/05364213083` açılıyor ama "numara geçersiz"
     * diyor. Hata GÖRÜNMEZ: bağlantı çalışır, WhatsApp açılır, yalnızca
     * kişi bulunamaz — ve bunu ancak deneyen fark eder.
     */
    expect(whatsappBaglantisi('05364213083')).toBe('https://wa.me/905364213083')
    expect(whatsappBaglantisi('5364213083')).toBe('https://wa.me/905364213083')
    // Ülke kodu zaten varsa dokunulmuyor.
    expect(whatsappBaglantisi('905364213083')).toBe('https://wa.me/905364213083')
    expect(whatsappBaglantisi('+90 536 421 30 83')).toBe('https://wa.me/905364213083')
  })

  it('mesajdaki ilan adresi MUTLAK', () => {
    /**
     * ⚠️ `payload.config.serverURL` bu kurulumda boş ve mesaja
     * `/portfoy/...` gibi göreli bir yol giriyordu — WhatsApp'ta
     * tıklanamayan, işe yaramayan bir metin.
     */
    const bilesen = govde('components/panel/IlanEslesmeleri.tsx')
    expect(bilesen).toContain('mutlakAdres(`/portfoy/${data.slug}`)')
    expect(bilesen).not.toContain('payload.config.serverURL')
  })

  it('eşleştirme motoru kişisel alanları GÖRMÜYOR', () => {
    /**
     * ⚠️ Ad ve telefon ekranda görünüyor ama motora girmiyor: motorun
     * girdisinde olmayan bir veri, çıktısını etkileyemez.
     */
    const motor = govde('lib/crm/eslestirme.ts')
    expect(motor).not.toMatch(/adSoyad|telefon|eposta/)
  })
})

describe('durum geçmişi', () => {
  const talepler = readFileSync(path.join(KOK, 'collections/Talepler.ts'), 'utf8')

  it('durum değişikliği nota yazılıyor', () => {
    /**
     * ⚠️ Bu geçmiş SONRADAN ÜRETİLEMEZ. `updatedAt` yalnızca son dokunuşu
     * biliyor; hangi alanın değiştiğini bilmiyor. Kanca bugün kurulmazsa
     * bugünden itibaren olan her durum değişikliği kaybolur.
     */
    expect(talepler).toMatch(
      /Durum: \$\{durumEtiketi\(oncekiDurum\)\} → \$\{durumEtiketi\(yeniDurum\)\}/,
    )
  })

  it('yalnızca GERÇEK değişimde not düşüyor', () => {
    /**
     * ⚠️ Payload aynı durumu tekrar gönderdiğinde (formu kaydetmek yeterli)
     * not düşülseydi, kayıt birkaç kaydetmede okunmaz hâle gelirdi.
     */
    expect(talepler).toMatch(/yeniDurum !== oncekiDurum/)
  })

  it('nota ETİKET yazılıyor, kod değil', () => {
    /**
     * ⚠️ "Durum: arandi → randevu" satırını altı ay sonra okuyan kişi
     * kodları hatırlamak zorunda kalmamalı.
     */
    expect(talepler).toMatch(/function durumEtiketi/)
    expect(talepler).toMatch(/TALEP_DURUMLARI\.find\(\(d\) => d\.value === deger\)\?\.label/)
  })

  it('ayrı bir geçmiş tablosu AÇILMADI', () => {
    /**
     * ⚠️ Notlar zaten tarihli ve tek bir zaman çizelgesi hâlinde okunuyor;
     * ikinci bir liste aynı olayın iki yerde yarısını gösterirdi.
     */
    expect(talepler).not.toMatch(/name: 'durumGecmisi'/)
  })
})
