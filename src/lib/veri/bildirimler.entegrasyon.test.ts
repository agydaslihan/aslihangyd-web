/**
 * Panel bildirimlerinin gerçek veritabanına karşı doğrulanması.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN BİRİM TESTİ YETMEZ.
 *
 * `motor.test.ts` motorun verilen SAYILARDAN doğru bildirim ürettiğini
 * kanıtlıyor. Ama asıl risk sayıların kendisinde: yanlış bir `where`
 * koşulu, yetkisi dolmuş bir ilanı sıfır sayar ve motor sessiz kalır —
 * yani şerit "her şey yolunda" der. Yanlış susan bir yasal uyarı, hiç
 * olmayan bir uyarıdan daha tehlikeli, çünkü güven veriyor.
 *
 * Bu dosya sayıların KAYNAĞINI sınar.
 * ─────────────────────────────────────────────────────────────────────────
 */

import config from '@payload-config'
import { getPayload, type Payload, type RequiredDataFromCollectionSlug } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { bakimCalistir } from '@/lib/bakim/gorevler'

import { bildirimleriGetir } from './bildirimler'

let payload: Payload
let mahalleId: number

const ONEK = 'TEST-BILDIRIM'
/**
 * ⚠️ GERÇEK SAAT — sabit bir tarih OLAMAZ.
 *
 * Bu dosya iki ayrı saate bağlı: sorgular `SIMDI`yi parametre olarak alıyor
 * ama ilanları oluşturan `eidsYayinEngeli` kancası gerçek `Date.now()`
 * okuyor ve devre dışı bırakılamıyor (yasal kural, CLAUDE.md §1).
 *
 * `SIMDI` bir süre `2026-08-07`ye sabitliydi. `gunSonra(5)` o tarihten tam
 * beş gün sonra — 12 Ağustos 2026'da — geçmişe düştü; kanca "yetki süresi
 * 1 gün önce doldu" diyerek ilanı reddetti ve test o gün kendiliğinden
 * kırıldı. Kimse bir şey değiştirmemişti, yalnızca takvim ilerlemişti.
 *
 * Gerçek saati kullanmak sabit tarihten daha belirleyici: fikstürler
 * kancanın gördüğü saatle aynı eksende üretiliyor.
 */
const SIMDI = new Date()

/** Bugünden N gün sonrası — yetki bitişlerini konumlandırmak için. */
function gunSonra(gun: number): string {
  return new Date(SIMDI.getTime() + gun * 86_400_000).toISOString()
}

function ilan(ek: Record<string, unknown> = {}): RequiredDataFromCollectionSlug<'ilanlar'> {
  return {
    baslik: `${ONEK} ilan`,
    tip: 'satilik',
    kategori: 'konut',
    il: 'Tekirdağ',
    ilce: 'Çorlu',
    mahalle: mahalleId,
    durum: 'taslak',
    eidsDurum: 'yetkili',
    tasinmazNo: `${ONEK}-1`,
    ada: '1',
    parsel: '1',
    eidsYetkiBaslangic: '2026-01-01T00:00:00.000Z',
    eidsYetkiBitis: '2099-12-31T00:00:00.000Z',
    ...ek,
  } as RequiredDataFromCollectionSlug<'ilanlar'>
}

function anahtarlar(bildirimler: { anahtar: string }[]): string[] {
  return bildirimler.map((b) => b.anahtar)
}

beforeAll(async () => {
  payload = await getPayload({ config })
  const mahalle = await payload.create({
    collection: 'mahalleler',
    data: { ad: `${ONEK} Mahallesi`, slug: `${ONEK.toLowerCase()}-mah`, yayinda: false },
  })
  mahalleId = mahalle.id as number
})

afterAll(async () => {
  if (!payload) return
  await payload.delete({ collection: 'ilanlar', where: { baslik: { like: ONEK } } })
  await payload.delete({ collection: 'mahalleler', where: { ad: { like: ONEK } } })
  await payload.destroy?.()
})

describe('EİDS sayımı', () => {
  it('15 gün içinde bitecek yayındaki ilanı sayar', async () => {
    const oncesi = await bildirimleriGetir(payload, SIMDI)
    const oncekiBaslik = oncesi.find((b) => b.anahtar === 'eids-bitiyor')?.baslik

    await payload.create({
      collection: 'ilanlar',
      data: ilan({
        durum: 'yayinda',
        baslik: `${ONEK} yakinda bitecek`,
        eidsYetkiBitis: gunSonra(5),
      }),
    })

    const sonrasi = await bildirimleriGetir(payload, SIMDI)
    const bildirim = sonrasi.find((b) => b.anahtar === 'eids-bitiyor')

    expect(bildirim).toBeDefined()
    // Sayı gerçekten arttı: bildirim zaten varsa metni değişmiş olmalı.
    expect(bildirim?.baslik).not.toBe(oncekiBaslik)
    expect(bildirim?.oncelik).toBe('yasal')
  })

  it('yetki bitişi uzak olan ilan sayıma girmez', async () => {
    const oncesi = await bildirimleriGetir(payload, SIMDI)
    const oncekiBaslik = oncesi.find((b) => b.anahtar === 'eids-bitiyor')?.baslik

    await payload.create({
      collection: 'ilanlar',
      data: ilan({
        durum: 'yayinda',
        baslik: `${ONEK} uzak bitis`,
        tasinmazNo: `${ONEK}-uzak`,
        eidsYetkiBitis: gunSonra(200),
      }),
    })

    const sonrasi = await bildirimleriGetir(payload, SIMDI)
    expect(sonrasi.find((b) => b.anahtar === 'eids-bitiyor')?.baslik).toBe(oncekiBaslik)
  })

  /**
   * ⚠️ En ağır durum. Kayıt kancası bunu engellediği için ancak zamanın
   * geçmesiyle oluşabilir; testte de tam olarak o taklit ediliyor —
   * doğrudan veritabanına yazarak.
   */
  it('yetkisi dolmuş ama hâlâ yayındaki ilanı yakalar', async () => {
    const kayit = await payload.create({
      collection: 'ilanlar',
      data: ilan({
        durum: 'yayinda',
        baslik: `${ONEK} dolmus yayinda`,
        tasinmazNo: `${ONEK}-dolmus`,
      }),
    })

    await payload.db.updateOne({
      collection: 'ilanlar',
      where: { id: { equals: kayit.id } },
      data: { eidsYetkiBitis: '2020-01-01T00:00:00.000Z' },
    })

    const bildirimler = await bildirimleriGetir(payload, SIMDI)
    const bildirim = bildirimler.find((b) => b.anahtar === 'eids-dolmus-yayinda')

    expect(bildirim).toBeDefined()
    expect(bildirim?.oncelik).toBe('yasal')

    /**
     * ⚠️ Bu bildirim YASAL önceliklilerin en üstünde olmalı; altına düşerse
     * görünmez olur.
     *
     * Eskiden listenin mutlak ilk sırası kontrol ediliyordu. 18 Ağustos
     * 2026'da `erisim` önceliği eklendi ve o kontrol kırıldı — haklı
     * olarak: site erişilemezse yasal uyarıyı okuyacak panel de yok.
     * Denetim mutlak sıradan KENDİ SINIFI içindeki sıraya çevrildi;
     * "yasal uyarılar arasında ilk" iddiası hâlâ korunuyor.
     */
    const yasalAnahtarlar = bildirimler.filter((b) => b.oncelik === 'yasal').map((b) => b.anahtar)
    expect(yasalAnahtarlar[0]).toBe('eids-dolmus-yayinda')

    // Temizlik: sonraki testler bu kaydın gölgesinde koşmasın.
    await payload.db.updateOne({
      collection: 'ilanlar',
      where: { id: { equals: kayit.id } },
      data: { eidsYetkiBitis: '2099-12-31T00:00:00.000Z' },
    })
  })

  it('taslak ilan sayıma girmez', async () => {
    const oncesi = await bildirimleriGetir(payload, SIMDI)
    const oncekiBaslik = oncesi.find((b) => b.anahtar === 'eids-bitiyor')?.baslik

    await payload.create({
      collection: 'ilanlar',
      data: ilan({
        durum: 'taslak',
        baslik: `${ONEK} taslak bitecek`,
        tasinmazNo: `${ONEK}-taslak`,
        eidsYetkiBitis: gunSonra(3),
      }),
    })

    const sonrasi = await bildirimleriGetir(payload, SIMDI)
    expect(sonrasi.find((b) => b.anahtar === 'eids-bitiyor')?.baslik).toBe(oncekiBaslik)
  })
})

describe('ilgisiz portföy sayımı', () => {
  /**
   * ⚠️ Bu sayım "ilişkinin YOKLUĞUNU" arıyor ve Payload'ın sorgu dili bunu
   * ifade edemiyor; iki kümenin farkı elle alınıyor. Elle alınan her fark,
   * sessizce sıfır dönme riski taşır — sıfır dönen bir uyarı, hiç olmayan
   * bir uyarıdır. Bu yüzden hem "sayıyor" hem "saymıyor" hâli sınanıyor.
   */
  it('60 günden eski, talebi olmayan ilanı sayar; yeni ilanı saymaz', async () => {
    const eski = await payload.create({
      collection: 'ilanlar',
      data: ilan({
        durum: 'yayinda',
        baslik: `${ONEK} eski ilgisiz`,
        tasinmazNo: `${ONEK}-eski`,
      }),
    })

    // Yeni ilan: aynı koşullarda ama bugün eklenmiş.
    await payload.create({
      collection: 'ilanlar',
      data: ilan({
        durum: 'yayinda',
        baslik: `${ONEK} yeni ilgisiz`,
        tasinmazNo: `${ONEK}-yeni`,
      }),
    })

    const yeniHali = await bildirimleriGetir(payload, SIMDI)
    const yeniSayi = yeniHali.find((b) => b.anahtar === 'ilgisiz-portfoy')?.baslik

    /**
     * ⚠️ `createdAt` doğrudan veritabanına yazılıyor: Payload bu alanı
     * kendisi yönetiyor ve `update` ile geriye alınamıyor. Testin taklit
     * ettiği şey zaten zamanın geçmesi — takvimi ileri saramadığımız için
     * kaydı geriye alıyoruz.
     */
    await payload.db.updateOne({
      collection: 'ilanlar',
      where: { id: { equals: eski.id } },
      data: { createdAt: '2026-01-01T00:00:00.000Z' },
    })

    const eskiHali = await bildirimleriGetir(payload, SIMDI)
    const eskiSayi = eskiHali.find((b) => b.anahtar === 'ilgisiz-portfoy')?.baslik

    // Geriye alınan ilan sayıma girdi, yeni eklenen girmedi.
    expect(eskiSayi).toBeDefined()
    expect(eskiSayi).not.toBe(yeniSayi)
  })
})

describe('bakım durumu kaydı', () => {
  /**
   * ⚠️ Asıl kanıt bu: cron çalıştığında panel ONU GÖRÜYOR mu.
   *
   * Görev sonuçları bugüne kadar yalnızca günlük dosyasına gidiyordu;
   * cron hiç kurulmadıysa dosya hiç oluşmuyordu. Yani "hiç çalışmadı"
   * durumu, kimsenin bakmadığı bir dosyanın yokluğuyla temsil ediliyordu.
   */
  it("bakım koşusu global'e yazar ve uyarı susar", async () => {
    // Önce kaydı sıfırla — "hiç çalışmadı" durumunu kur.
    await payload.updateGlobal({ slug: 'bakim-durumu', data: { gorevler: [] }, depth: 0 })

    const oncesi = await bildirimleriGetir(payload, SIMDI)
    expect(anahtarlar(oncesi)).toContain('bakim-hic-eids-kaldir')

    await bakimCalistir(payload, ['eids-kaldir'])

    // Koşu ŞİMDİ gerçekleşti; bildirim gerçek zamana göre değerlendirilmeli.
    const sonrasi = await bildirimleriGetir(payload, new Date())
    expect(anahtarlar(sonrasi)).not.toContain('bakim-hic-eids-kaldir')
    expect(anahtarlar(sonrasi)).not.toContain('bakim-gecikti-eids-kaldir')
  })

  /**
   * ⚠️ Tek bir görevi elle çalıştırmak diğerlerinin geçmişini silmemeli:
   * silseydi, "sadece EİDS'i şimdi çalıştır" demek KVKK görevinin
   * kaydını sıfırlar ve panelde yanlış bir "hiç çalışmadı" belirirdi.
   */
  it('tek görev koşusu diğer görevlerin kaydını bozmaz', async () => {
    await bakimCalistir(payload, ['kvkk-sil'])
    const kvkkAni = (await payload.findGlobal({ slug: 'bakim-durumu', depth: 0 })).gorevler?.find(
      (g) => g.anahtar === 'kvkk-sil',
    )?.sonBasariliCalisma

    expect(kvkkAni).toBeTruthy()

    await bakimCalistir(payload, ['eids-kaldir'])
    const sonra = (await payload.findGlobal({ slug: 'bakim-durumu', depth: 0 })).gorevler?.find(
      (g) => g.anahtar === 'kvkk-sil',
    )?.sonBasariliCalisma

    expect(sonra).toBe(kvkkAni)
  })
})

describe('şerit dayanıklılığı', () => {
  /**
   * ⚠️ Şerit hiçbir koşulda "sessizce boş" kalmamalı. Boş bir şerit
   * "her şey yolunda" demektir; hesaplanamayan bir şerit için bu yalandır.
   */
  it('bildirim üretimi hata fırlatmaz', async () => {
    await expect(bildirimleriGetir(payload, SIMDI)).resolves.toBeInstanceOf(Array)
  })
})
