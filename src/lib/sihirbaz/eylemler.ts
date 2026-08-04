'use server'

import { headers } from 'next/headers'

import config from '@payload-config'
import { getPayload, type RequiredDataFromCollectionSlug } from 'payload'

import { sihirbazSemasi, type SihirbazVerisi } from './sema'

/**
 * Portföy giriş sihirbazının kayıt eylemi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU EYLEM BİR KESTİRME DEĞİL — AYNI KAPIDAN GEÇEN RAHAT BİR YOL.
 *
 * Kayıt Payload **Local API** ile yapılır ve `overrideAccess: false` +
 * gerçek kullanıcı geçirilir. Sonuç:
 *
 *  - `beforeChange` kancaları (`ilanGostergeleri`, `eidsYayinEngeli`)
 *    aynen çalışır.
 *  - Koleksiyonun `access.create` kuralı geçerlidir; oturumu olmayan
 *    biri bu eylemi çağırsa bile kayıt oluşturamaz.
 *  - Alan doğrulamaları Payload tarafından da uygulanır.
 *
 * `overrideAccess: true` yazmak bu üç güvenceyi birden kaldırırdı ve
 * sihirbazı EİDS kapısının etrafından dolaşan bir arka kapıya çevirirdi.
 * (CLAUDE.md kural 1)
 *
 * ⚠️ Kayıt DAİMA `taslak` olarak oluşturulur. `durum` alanı istemciden
 * hiç okunmaz — gövdeye elle `durum: 'yayinda'` eklenerek yayına alma
 * girişimi mümkün olmasın diye. Yayına alma, EİDS kapısının bulunduğu
 * Payload admin'de bilinçli bir eylem olarak kalır.
 * ─────────────────────────────────────────────────────────────────────────
 */

export interface SihirbazSonucu {
  basarili: boolean
  /** Oluşturulan ilanın kimliği — admin'e yönlendirmek için. */
  ilanId?: string
  ilanBasligi?: string
  /** Alan bazlı hatalar. */
  hatalar?: Record<string, string>
  /** Alanla ilişkilendirilemeyen genel hata. */
  genelHata?: string
}

export async function ilanTaslagiOlustur(ham: unknown): Promise<SihirbazSonucu> {
  const sonuc = sihirbazSemasi.safeParse(ham)

  if (!sonuc.success) {
    const hatalar: Record<string, string> = {}
    for (const sorun of sonuc.error.issues) {
      const alan = String(sorun.path[0] ?? '')
      if (alan !== '' && hatalar[alan] === undefined) hatalar[alan] = sorun.message
    }
    return { basarili: false, hatalar }
  }

  const veri = sonuc.data
  const payload = await getPayload({ config })

  // Oturum Payload'ın kendi çerezinden çözülür. Sihirbaz admin panelinin
  // içinde çalıştığı için kullanıcı zaten giriş yapmış olur.
  const { user } = await payload.auth({ headers: await headers() })

  if (!user) {
    return {
      basarili: false,
      genelHata: 'Oturumunuz sona ermiş görünüyor. Sayfayı yenileyip tekrar giriş yapın.',
    }
  }

  // Mahalle ilişkisi sayısal kimlik bekler (Postgres adaptörü). Form değeri
  // dize taşıdığı için burada çözülüyor; çözülemezse alan hatası döner —
  // `NaN` göndermek Payload'da anlaşılmaz bir veritabanı hatası üretirdi.
  const mahalleId = Number(veri.mahalle)
  if (!Number.isInteger(mahalleId) || mahalleId <= 0) {
    return { basarili: false, hatalar: { mahalle: 'Geçerli bir mahalle seçin.' } }
  }

  try {
    const ilan = await payload.create({
      collection: 'ilanlar',
      data: gorunumuVeriyeCevir(veri, mahalleId),
      user,
      // ⚠️ Erişim kuralları ve kancalar devrede kalsın diye `false`.
      overrideAccess: false,
    })

    return {
      basarili: true,
      ilanId: String(ilan.id),
      ilanBasligi: ilan.baslik,
    }
  } catch (hata) {
    // Payload'ın alan doğrulama hataları kullanıcıya aynen gösterilir;
    // beklenmedik hatalarda veritabanı ayrıntısı sızdırılmaz.
    return { basarili: false, genelHata: hataMesaji(hata) }
  }
}

/**
 * Şema çıktısını Payload alan adlarına çevirir.
 *
 * Boş dizeler `undefined`'a düşürülür: Payload'a boş dize yazmak, alanın
 * "girilmiş ama boş" görünmesine yol açar ve EİDS değerlendirmesinde
 * "girilmemiş" ile karışır.
 */
function gorunumuVeriyeCevir(
  veri: SihirbazVerisi,
  mahalleId: number,
): RequiredDataFromCollectionSlug<'ilanlar'> {
  const bosDegilse = (deger: string): string | undefined =>
    deger.trim() === '' ? undefined : deger.trim()

  return {
    // ⚠️ Sabit. İstemciden gelen hiçbir değer bu alana yazılmaz.
    durum: 'taslak',

    // Boş bırakılıyor: `slugAlani` kancası başlıktan üretir ve çakışmayı
    // sayıyla çözer. Burada elle slug üretmek, o mantığın ikinci bir
    // kopyasını doğururdu.
    slug: '',

    baslik: veri.baslik,
    tip: veri.tip,
    kategori: veri.kategori,
    ozet: bosDegilse(veri.ozet),

    il: veri.il,
    ilce: veri.ilce,
    mahalle: mahalleId,
    adres: bosDegilse(veri.adres),
    ada: bosDegilse(veri.ada),
    parsel: bosDegilse(veri.parsel),
    tapuDurumu: veri.tapuDurumu,

    fiyat: veri.fiyat,
    paraBirimi: veri.paraBirimi,
    tahminiKira: veri.tahminiKira,
    aidat: veri.aidat,
    brutM2: veri.brutM2,
    netM2: veri.netM2,
    odaSayisi: veri.odaSayisi,
    bulunduguKat: bosDegilse(veri.bulunduguKat),
    toplamKat: veri.toplamKat,
    binaYasi: veri.binaYasi,

    eidsDurum: veri.eidsDurum,
    tasinmazNo: bosDegilse(veri.tasinmazNo),
    eidsYetkiBaslangic: bosDegilse(veri.eidsYetkiBaslangic),
    eidsYetkiBitis: bosDegilse(veri.eidsYetkiBitis),

    gizliPortfoy: veri.gizliPortfoy,
  }
}

function hataMesaji(hata: unknown): string {
  if (hata instanceof Error && hata.message.trim() !== '') {
    return hata.message
  }
  return 'İlan kaydedilemedi. Bilgileri kontrol edip tekrar deneyin.'
}
