import 'server-only'

import type { Payload } from 'payload'

import { HERKESE_ACIK_DURUMLAR, YETKI_UYARI_ESIGI_GUN, yetkiyeKalanGun } from '@/lib/eids'
import { bugununAnahtari, tarihiYaz } from '@/lib/tarih'

/**
 * Günlük bakım görevleri.
 *
 * İki yasal yükümlülüğü otomatikleştirir:
 *
 * 1. **EİDS** — yetkisi dolan ilan yayında kalamaz. Yayın engeli kancası
 *    kaydetme anında çalışır; ama hiç kimse kaydetmezse yetki sessizce
 *    dolar ve ilan yayında kalır. Bu görev o boşluğu kapatır.
 *
 * 2. **KVKK** — saklama süresi dolan kişisel veri silinir. "Sonra
 *    temizleriz" bir uyum stratejisi değildir.
 *
 * Fonksiyonlar rapor döner, hata fırlatmaz: bir görevin başarısız olması
 * diğerlerini engellememelidir.
 */

export interface GorevRaporu {
  ad: string
  islenen: number
  detay: string[]
  hata?: string
}

export interface BakimRaporu {
  calistigiAn: string
  gorevler: GorevRaporu[]
}

/**
 * Yetkisi dolmuş ilanları yayından kaldırır.
 *
 * Durum `yetki_bitti` yapılır, `taslak` değil: aradaki fark, ilanın neden
 * yayından düştüğünün panelde görünmesi. "Taslak"a çekmek bilgiyi yok eder
 * ve Aslıhan ilanın kendi kendine kaybolduğunu sanır.
 */
export async function yetkisiDolanlariKaldir(payload: Payload): Promise<GorevRaporu> {
  const rapor: GorevRaporu = {
    ad: 'EİDS — yetkisi dolan ilanları yayından kaldır',
    islenen: 0,
    detay: [],
  }

  try {
    const bugun = bugununAnahtari()

    const sonuc = await payload.find({
      collection: 'ilanlar',
      where: {
        and: [
          { durum: { in: [...HERKESE_ACIK_DURUMLAR] } },
          // Bitiş tarihi bugünden önce olanlar. Bugün bitenler hâlâ geçerli.
          { eidsYetkiBitis: { less_than: `${bugun}T00:00:00.000Z` } },
        ],
      },
      limit: 500,
      depth: 0,
    })

    for (const ilan of sonuc.docs) {
      await payload.update({
        collection: 'ilanlar',
        id: ilan.id,
        data: { durum: 'yetki_bitti' },
      })

      rapor.islenen += 1
      rapor.detay.push(
        `#${ilan.id} "${ilan.baslik}" — yetki ${tarihiYaz(ilan.eidsYetkiBitis)} tarihinde doldu`,
      )
    }
  } catch (hata) {
    rapor.hata = hata instanceof Error ? hata.message : 'Bilinmeyen hata'
  }

  return rapor
}

/**
 * Yetkisi yakında bitecek ilanları raporlar.
 *
 * Şimdilik yalnızca listeler; e-posta bildirimi SMTP bilgileri girildiğinde
 * eklenecek (bkz. docs/SENDEN-BEKLENENLER.md). Rapor çıktısı bugün bile
 * işe yarıyor: bakım ucu tarayıcıdan çağrılıp okunabilir.
 */
export async function yetkisiBitecekleriBildir(payload: Payload): Promise<GorevRaporu> {
  const rapor: GorevRaporu = {
    ad: `EİDS — ${YETKI_UYARI_ESIGI_GUN} gün içinde yetkisi bitecekler`,
    islenen: 0,
    detay: [],
  }

  try {
    const sonuc = await payload.find({
      collection: 'ilanlar',
      where: { durum: { in: [...HERKESE_ACIK_DURUMLAR] } },
      limit: 500,
      depth: 0,
    })

    for (const ilan of sonuc.docs) {
      const kalan = yetkiyeKalanGun(ilan.eidsYetkiBitis)
      if (kalan === null || kalan < 0 || kalan > YETKI_UYARI_ESIGI_GUN) continue

      rapor.islenen += 1
      rapor.detay.push(
        `#${ilan.id} "${ilan.baslik}" — ${kalan} gün kaldı (${tarihiYaz(ilan.eidsYetkiBitis)})`,
      )
    }
  } catch (hata) {
    rapor.hata = hata instanceof Error ? hata.message : 'Bilinmeyen hata'
  }

  return rapor
}

/**
 * KVKK — saklama süresi dolan talepleri siler.
 *
 * Silme geri alınamaz ve bilinçlidir: KVKK, amaç ortadan kalktıktan sonra
 * veriyi saklamayı yasaklar. Kaydın içeriği günlüğe YAZILMAZ — silinen
 * kişisel veriyi günlük dosyasında bırakmak, silmeyi anlamsız kılar.
 */
export async function saklamaSuresiDolanlariSil(payload: Payload): Promise<GorevRaporu> {
  const rapor: GorevRaporu = {
    ad: 'KVKK — saklama süresi dolan kayıtları sil',
    islenen: 0,
    detay: [],
  }

  try {
    const bugun = bugununAnahtari()
    const kosul = { saklamaBitis: { less_than: `${bugun}T00:00:00.000Z` } }

    /**
     * ⚠️ Danışman başvuruları da silinir.
     *
     * Ayrı bir koleksiyon olması, KVKK yükümlülüğünün ayrı olması demek
     * değil — aksine, ayrı olduğu için burada AYRICA hatırlanması gerekiyor.
     * Yeni bir kişisel veri koleksiyonu eklendiğinde bu listeye eklenmezse
     * veriler süresiz saklanır.
     */
    const [talepler, basvurular] = await Promise.all([
      payload.delete({ collection: 'talepler', where: kosul }),
      payload.delete({ collection: 'danisman-basvurulari', where: kosul }),
    ])

    rapor.islenen = talepler.docs.length + basvurular.docs.length

    // Yalnızca sayı — ad, telefon, e-posta kesinlikle yazılmaz.
    if (talepler.docs.length > 0) {
      rapor.detay.push(`${talepler.docs.length} talep kaydı saklama süresi dolduğu için silindi`)
    }
    if (basvurular.docs.length > 0) {
      rapor.detay.push(
        `${basvurular.docs.length} danışman başvurusu saklama süresi dolduğu için silindi`,
      )
    }
  } catch (hata) {
    rapor.hata = hata instanceof Error ? hata.message : 'Bilinmeyen hata'
  }

  return rapor
}

export async function gunlukBakimiCalistir(payload: Payload): Promise<BakimRaporu> {
  // Sırayla çalıştırılıyor: 3.2 GB RAM'li sunucuda üç ağır sorguyu aynı anda
  // açmak bellek baskısı yaratır ve kazanç ihmal edilebilir.
  const gorevler = [
    await yetkisiDolanlariKaldir(payload),
    await yetkisiBitecekleriBildir(payload),
    await saklamaSuresiDolanlariSil(payload),
  ]

  return { calistigiAn: new Date().toISOString(), gorevler }
}
