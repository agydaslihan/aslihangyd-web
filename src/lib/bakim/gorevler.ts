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

/**
 * Görev anahtarları.
 *
 * ⚠️ Görevlerin AYRI AYRI çağrılabilmesi bir kolaylık değil, arıza
 * yalıtımı.
 *
 * Üçü tek çağrıda koşsaydı ve KVKK silme görevi bozulsaydı (bir veritabanı
 * kısıtı, bir şema değişikliği), uç her gece 500 dönerdi. Bu durumda
 * işletmecinin en olası tepkisi cron satırını susturmak olurdu — ve
 * EİDS kontrolü de onunla birlikte susardı. Yasal riski olan görevin,
 * olmayan bir görevin arızasıyla düşmesi kabul edilemez.
 *
 * Ayrı anahtarlar ayrıca tanı için gerekli: "sadece EİDS'i şimdi çalıştır"
 * demek mümkün oluyor.
 */
export type GorevAnahtari = 'eids-kaldir' | 'eids-uyar' | 'kvkk-sil'

export interface GorevRaporu {
  /** Makine tarafından okunabilir kimlik — nöbetçi betiği bunu arar. */
  anahtar: GorevAnahtari
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
    anahtar: 'eids-kaldir',
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
    anahtar: 'eids-uyar',
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
    anahtar: 'kvkk-sil',
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

/* ══════════════════════════════════════════════════════════════════════════
   Görev kaydı
   ══════════════════════════════════════════════════════════════════════════ */

export interface GorevTanimi {
  anahtar: GorevAnahtari
  ad: string
  /** Cron'da önerilen sıklık — belgeye ve panele aynı yerden yansır. */
  siklik: string
  /**
   * ⚠️ Bu görev çalışmazsa NE OLUR. Belgeye kopyalanan değil, kaynağı
   * burada olan cümle: görevi değiştiren kişi sonucunu da güncellemek
   * zorunda kalsın.
   */
  calismazsaSonuc: string
  /** Yasal yükümlülük mü? Öyleyse aksaması ertelenemez. */
  yasal: boolean
  calistir: (payload: Payload) => Promise<GorevRaporu>
}

export const GOREV_KAYDI: readonly GorevTanimi[] = [
  {
    anahtar: 'eids-kaldir',
    ad: 'EİDS — yetkisi dolan ilanları yayından kaldır',
    siklik: 'Her gün 03:10 (Europe/Istanbul)',
    calismazsaSonuc:
      'Yetki belgesi süresi dolmuş ilan yayında kalır. Bu, Taşınmaz Ticareti ' +
      'Hakkında Yönetmelik kapsamında yetkisiz ilan yayını sayılır; idari yaptırım ' +
      've ilan kaldırma riski doğar. Kancalar yalnızca KAYDETME anında çalıştığı ' +
      'için hiç kimse ilana dokunmazsa yetki sessizce dolar — bu görev o boşluğu ' +
      'kapatan tek mekanizmadır.',
    yasal: true,
    calistir: yetkisiDolanlariKaldir,
  },
  {
    anahtar: 'eids-uyar',
    ad: `EİDS — ${YETKI_UYARI_ESIGI_GUN} gün içinde yetkisi bitecekler`,
    siklik: 'Her gün 08:10 (Europe/Istanbul)',
    calismazsaSonuc:
      'Yaklaşan yetki bitişleri fark edilmez. Yasal ihlal doğurmaz — çünkü ' +
      '"eids-kaldir" ilanı zaten yayından alır — ama portföy sessizce görünmez ' +
      'olur ve yetki yenileme fırsatı kaçar. Etkisi ticari, yasal değil.',
    yasal: false,
    calistir: yetkisiBitecekleriBildir,
  },
  {
    anahtar: 'kvkk-sil',
    ad: 'KVKK — saklama süresi dolan kayıtları sil',
    siklik: 'Her gün 03:40 (Europe/Istanbul)',
    calismazsaSonuc:
      'Saklama süresi dolmuş kişisel veri (talepler ve danışman başvuruları) ' +
      'silinmeden kalır. KVKK md. 7 ve md. 12 kapsamında ihlal; veri sahibinin ' +
      'başvurusu ya da denetim halinde yaptırım riski. Gecikme her gün büyür, ' +
      'kendiliğinden düzelmez.',
    yasal: true,
    calistir: saklamaSuresiDolanlariSil,
  },
]

export function gorevTanimi(anahtar: GorevAnahtari): GorevTanimi {
  const tanim = GOREV_KAYDI.find((aday) => aday.anahtar === anahtar)
  if (tanim === undefined) throw new Error(`Bilinmeyen bakım görevi: ${anahtar}`)
  return tanim
}

export function gecerliGorevMi(deger: string): deger is GorevAnahtari {
  return GOREV_KAYDI.some((gorev) => gorev.anahtar === deger)
}

/**
 * Verilen görevleri sırayla çalıştırır.
 *
 * Sırayla: 3,2 GB RAM'li sunucuda üç ağır sorguyu aynı anda açmak bellek
 * baskısı yaratır ve kazanç ihmal edilebilir.
 *
 * Görevler hata fırlatmaz, rapor döner — birinin başarısızlığı
 * diğerlerini durdurmaz.
 */
export async function bakimCalistir(
  payload: Payload,
  anahtarlar?: readonly GorevAnahtari[],
): Promise<BakimRaporu> {
  const secilenler =
    anahtarlar === undefined
      ? GOREV_KAYDI
      : GOREV_KAYDI.filter((gorev) => anahtarlar.includes(gorev.anahtar))

  const gorevler: GorevRaporu[] = []
  for (const gorev of secilenler) {
    gorevler.push(await gorev.calistir(payload))
  }

  return { calistigiAn: new Date().toISOString(), gorevler }
}

/** Tüm görevleri çalıştırır — elle tam bakım için. */
export async function gunlukBakimiCalistir(payload: Payload): Promise<BakimRaporu> {
  return bakimCalistir(payload)
}
