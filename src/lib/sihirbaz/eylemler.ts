'use server'

import { headers } from 'next/headers'

import config from '@payload-config'
import { getPayload } from 'payload'

import { sihirbazSemasi } from './sema'
import { gorunumuVeriyeCevir } from './veriyeCevir'

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
  /** Oluşturulan ya da güncellenen ilanın kimliği. */
  ilanId?: string
  ilanBasligi?: string
  /** Kayıt bu çağrıda mı açıldı? Arayüz "taslak açıldı" der. */
  yeniMi?: boolean
  /** Başlık boş bırakıldığı için geçici ad üretildiyse `true`. */
  baslikUretildi?: boolean
  /** Alan bazlı hatalar. */
  hatalar?: Record<string, string>
  /** Alanla ilişkilendirilemeyen genel hata. */
  genelHata?: string
}

/**
 * Taslağı açar ya da günceller.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ OTOMATİK KAYDETME BU İMZAYI ZORUNLU KILDI.
 *
 * Eski hâl yalnızca `create` yapıyordu; her otomatik kayıt yeni bir taslak
 * açardı ve yarım saatlik bir giriş, otuz kopya taşınmaz üretirdi. İlk
 * çağrı kaydı açıyor, kimliği geri veriyor; sonraki çağrılar aynı kaydı
 * güncelliyor.
 *
 * ⚠️ TASLAK OLMAYAN KAYIT GÜNCELLENMEZ — pazarlıksız.
 *
 * `ilanId` istemciden geliyor. Yayındaki bir ilanın kimliği gönderilseydi,
 * otomatik kaydetme canlı bir ilanı sessizce ezerdi: fiyat, açıklama,
 * fotoğraflar. Kayıt her güncellemede okunuyor ve `durum` `taslak`
 * değilse işlem reddediliyor.
 * ─────────────────────────────────────────────────────────────────────────
 */
export async function ilanTaslaginiKaydet(
  ham: unknown,
  ilanId?: string | null,
): Promise<SihirbazSonucu> {
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
  /**
   * ⚠️ MAHALLE, KAYDI AÇMANIN TEK ŞARTI — VE BU ŞART BİZİM DEĞİL.
   *
   * `Ilanlar.mahalle` koleksiyonda `required` ve varsayılanı yok: mahalle
   * yatırım skorunu, haritayı, eşleştirmeyi ve karşılaştırmayı besliyor.
   * Mahallesiz bir kayıt, bu sistemlerin hiçbirine giremez.
   *
   * Diğer her alan isteğe bağlı; bu biri, alan gerçekten zorunlu olduğu
   * için zorunlu — sihirbazın koyduğu bir engel değil.
   */
  const mahalleId = Number(veri.mahalle)
  if (!Number.isInteger(mahalleId) || mahalleId <= 0) {
    return {
      basarili: false,
      hatalar: {
        mahalle:
          'Kaydı açmak için mahalle gerekli — taşınmazın hangi mahallede olduğu, ' +
          'yatırım skorundan haritaya kadar her şeyin girdisi. Diğer alanları sonra doldurabilirsiniz.',
      },
    }
  }

  /**
   * ⚠️ BAŞLIK BOŞSA GEÇİCİ AD ÜRETİLİYOR — UYDURMA DEĞİL, AÇIKÇA GEÇİCİ.
   *
   * Payload'da `baslik` zorunlu. Sahada girişe fotoğraftan ya da oda
   * sayısından başlayan biri başlığı en sona bırakıyor. Tarihli bir taslak
   * adı, kaydın panelde bulunabilmesini sağlıyor ve ne olduğunu saklamıyor.
   */
  const baslikBos = veri.baslik.trim() === ''
  const baslik = baslikBos
    ? `Taslak — ${new Date().toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' })}`
    : veri.baslik.trim()

  const kimlik = typeof ilanId === 'string' && ilanId.trim() !== '' ? ilanId.trim() : null

  try {
    if (kimlik !== null) {
      /**
       * ⚠️ ÖNCE OKU, SONRA YAZ. Kimlik istemciden geliyor; yayındaki bir
       * ilanın kimliği gönderilseydi otomatik kaydetme onu sessizce ezerdi.
       */
      const mevcut = await payload.findByID({
        collection: 'ilanlar',
        id: kimlik,
        depth: 0,
        user,
        overrideAccess: false,
      })

      if (mevcut.durum !== 'taslak') {
        return {
          basarili: false,
          genelHata:
            'Bu ilan artık taslak değil; sihirbazdan güncellenemez. ' +
            'Yayındaki bir kaydı değiştirmek için Payload panelini kullanın.',
        }
      }

      const ilan = await payload.update({
        collection: 'ilanlar',
        id: kimlik,
        data: gorunumuVeriyeCevir(veri, mahalleId, baslik),
        user,
        overrideAccess: false,
      })

      return {
        basarili: true,
        ilanId: String(ilan.id),
        ilanBasligi: ilan.baslik,
        yeniMi: false,
        baslikUretildi: baslikBos,
      }
    }

    const ilan = await payload.create({
      collection: 'ilanlar',
      data: gorunumuVeriyeCevir(veri, mahalleId, baslik),
      user,
      // ⚠️ Erişim kuralları ve kancalar devrede kalsın diye `false`.
      overrideAccess: false,
    })

    return {
      basarili: true,
      ilanId: String(ilan.id),
      ilanBasligi: ilan.baslik,
      yeniMi: true,
      baslikUretildi: baslikBos,
    }
  } catch (hata) {
    // Payload'ın alan doğrulama hataları kullanıcıya aynen gösterilir;
    // beklenmedik hatalarda veritabanı ayrıntısı sızdırılmaz.
    return { basarili: false, genelHata: hataMesaji(hata) }
  }
}

function hataMesaji(hata: unknown): string {
  if (hata instanceof Error && hata.message.trim() !== '') {
    return hata.message
  }
  return 'İlan kaydedilemedi. Bilgileri kontrol edip tekrar deneyin.'
}

/**
 * Taslağı yayına alır.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU EYLEM EİDS KAPISINI ATLAMIYOR — ONU ÇAĞIRIYOR.
 *
 * Sihirbazın son adımında "Yayına al" düğmesi var ve EİDS eksikse pasif.
 * Ama pasif bir düğme bir kapı değildir: DOM'dan etkinleştirilebilir,
 * eylem doğrudan çağrılabilir.
 *
 * Gerçek kapı yine `eidsYayinEngeli` kancası. Bu eylem `durum`u sunucuda
 * yazıyor ve yazma Local API + `overrideAccess: false` ile gidiyor; kanca
 * koşulları sağlanmıyorsa Payload kaydı reddediyor ve hata mesajı
 * kullanıcıya aynen gösteriliyor.
 *
 * ⚠️ `durum` HÂLÂ İSTEMCİDEN GELMİYOR. İstemci yalnızca "bu ilanı yayına
 * al" diyor; hangi değerin yazılacağına sunucu karar veriyor. Şemada
 * `durum` alanı yok ve olmayacak.
 * ─────────────────────────────────────────────────────────────────────────
 */
export async function ilaniYayinaAl(ilanId: string): Promise<SihirbazSonucu> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!user) {
    return {
      basarili: false,
      genelHata: 'Oturumunuz sona ermiş görünüyor. Sayfayı yenileyip tekrar giriş yapın.',
    }
  }

  const kimlik = typeof ilanId === 'string' ? ilanId.trim() : ''
  if (kimlik === '') {
    return { basarili: false, genelHata: 'Önce taslağı kaydedin.' }
  }

  try {
    const ilan = await payload.update({
      collection: 'ilanlar',
      id: kimlik,
      // ⚠️ Sabit. İstemci hangi duruma geçileceğini seçemiyor.
      data: { durum: 'yayinda' },
      user,
      overrideAccess: false,
    })

    return { basarili: true, ilanId: String(ilan.id), ilanBasligi: ilan.baslik, yeniMi: false }
  } catch (hata) {
    // ⚠️ Kancanın mesajı AYNEN gösteriliyor: hangi EİDS koşulunun eksik
    // olduğunu en iyi o biliyor ve burada ikinci bir metin yazmak, iki
    // mesajın ayrıştığı bir gün üretirdi.
    return { basarili: false, genelHata: hataMesaji(hata) }
  }
}
