import 'server-only'

import type { Payload } from 'payload'

import { GOREV_KUNYELERI, gorevKunyesi, type GorevAnahtari, type GorevKunyesi } from './kunye'

import { HERKESE_ACIK_DURUMLAR, YETKI_UYARI_ESIGI_GUN, yetkiyeKalanGun } from '@/lib/eids'
import { bugununAnahtari, tarihiYaz } from '@/lib/tarih'

export { gecerliGorevMi, GOREV_KUNYELERI, gorevKunyesi } from './kunye'
export type { GorevAnahtari, GorevKunyesi } from './kunye'

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

export interface GorevTanimi extends GorevKunyesi {
  calistir: (payload: Payload) => Promise<GorevRaporu>
}

/**
 * Anahtar → çalıştırıcı.
 *
 * ⚠️ `Record<GorevAnahtari, …>` bilinçli: künyeye yeni bir görev eklenip
 * çalıştırıcısı yazılmazsa derleme kırılır. `find` ile eşleştirseydik
 * eksik görev çalışma zamanında sessizce atlanırdı — yasal bir görevin
 * sessizce atlanması, bu dosyanın önlemeye çalıştığı şeyin ta kendisi.
 */
const CALISTIRICILAR: Record<GorevAnahtari, (payload: Payload) => Promise<GorevRaporu>> = {
  'eids-kaldir': yetkisiDolanlariKaldir,
  'eids-uyar': yetkisiBitecekleriBildir,
  'kvkk-sil': saklamaSuresiDolanlariSil,
}

export const GOREV_KAYDI: readonly GorevTanimi[] = GOREV_KUNYELERI.map((kunye) => ({
  ...kunye,
  calistir: CALISTIRICILAR[kunye.anahtar],
}))

export function gorevTanimi(anahtar: GorevAnahtari): GorevTanimi {
  return { ...gorevKunyesi(anahtar), calistir: CALISTIRICILAR[anahtar] }
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

  const calistigiAn = new Date().toISOString()
  await durumuYaz(payload, calistigiAn, gorevler)

  return { calistigiAn, gorevler }
}

/**
 * Koşu sonucunu `bakim-durumu` global'ine yazar.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: cron'un çalışmadığını kimse fark etmiyordu.
 *
 * Görev sonuçları yalnızca `/srv/aslihangyd/logs/bakim.log` dosyasına
 * gidiyordu. Cron satırı hiç kurulmadıysa o dosya hiç oluşmuyor — yani
 * "hiç çalışmadı" durumu, "kimsenin bakmadığı bir dosyanın yokluğu"
 * olarak temsil ediliyordu. Buraya yazınca panel şeridi görebiliyor.
 *
 * ⚠️ `sonBasariliCalisma` yalnızca hata YOKSA ilerler. Her koşuda
 * ilerletseydik, üç aydır hata veren bir görev panelde "bugün çalıştı"
 * görünürdü — teknik olarak doğru, işletme açısından yalan.
 *
 * ⚠️ Yazma hatası koşuyu düşürmez. Bu kayıt bir gözlem defteri; defteri
 * tutamamak, defterin konusu olan yasal görevi geçersiz kılmaz.
 * ─────────────────────────────────────────────────────────────────────────
 */
async function durumuYaz(
  payload: Payload,
  calistigiAn: string,
  gorevler: readonly GorevRaporu[],
): Promise<void> {
  try {
    const oncekiler = (await payload.findGlobal({ slug: 'bakim-durumu', depth: 0 })).gorevler ?? []

    const satirlar = GOREV_KUNYELERI.map((kunye) => {
      const yeni = gorevler.find((rapor) => rapor.anahtar === kunye.anahtar)
      const onceki = oncekiler.find((satir) => satir.anahtar === kunye.anahtar)

      // Bu koşuda çalışmayan görevin kaydına dokunulmaz: tek bir görevi elle
      // çalıştırmak, diğerlerinin geçmişini silmemeli.
      if (yeni === undefined) {
        return {
          anahtar: kunye.anahtar,
          sonCalisma: onceki?.sonCalisma ?? null,
          sonBasariliCalisma: onceki?.sonBasariliCalisma ?? null,
          sonHata: onceki?.sonHata ?? null,
          sonIslenen: onceki?.sonIslenen ?? null,
        }
      }

      const basarili = yeni.hata === undefined
      return {
        anahtar: kunye.anahtar,
        sonCalisma: calistigiAn,
        sonBasariliCalisma: basarili ? calistigiAn : (onceki?.sonBasariliCalisma ?? null),
        sonHata: yeni.hata ?? null,
        sonIslenen: yeni.islenen,
      }
    })

    await payload.updateGlobal({
      slug: 'bakim-durumu',
      data: { gorevler: satirlar },
      depth: 0,
    })
  } catch (hata) {
    console.error(
      '[bakim] Durum kaydı yazılamadı — görevler çalıştı, panel şeridi eski veriyi gösterecek:',
      hata instanceof Error ? hata.message : hata,
    )
  }
}

/** Tüm görevleri çalıştırır — elle tam bakım için. */
export async function gunlukBakimiCalistir(payload: Payload): Promise<BakimRaporu> {
  return bakimCalistir(payload)
}
