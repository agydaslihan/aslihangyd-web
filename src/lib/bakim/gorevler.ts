import 'server-only'

import { alaniDegerlendir } from '@/lib/alan/degerlendirme'
import { alaniSorgula } from '@/lib/alan/sorgu'

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

/**
 * Ölçüm olay ayrıntılarının saklama süresi.
 *
 * ⚠️ Şartnamedeki 90 gün. Değer burada tek yerde ve aydınlatma metniyle
 * (`docs/KVKK-ANALITIK.md`) aynı olmak zorunda: belgede 90 yazıp kodda 180
 * uygulamak, verilen sözü tutmamak olur.
 */
export const OLCUM_AYRINTI_GUN = 90

/**
 * Ölçüm kayıtlarının ayrıntı katmanını 90 gün sonra temizler.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ SATIR SİLİNMİYOR, YALNIZCA AYRINTI DİZİSİ BOŞALTILIYOR.
 *
 * Şartname "ham olay kaydı 90 gün sonra silinir; toplulaştırılmış özetler
 * kalıcı" diyor ve ikisi aynı satırda duruyor: gün satırının kendisi
 * özettir, `olaylar` dizisi ise en ayrıntılı katman. Satırı silmek geçmiş
 * trafiği de silmek olurdu — karşılaştırma yapılamaz hâle gelirdi.
 *
 * ⚠️ Bu görev bir KVKK zorunluluğu değil, verilen sözün tutulması.
 * Silinen şey kişisel veri değil: gün bazında toplanmış sayaçlar tek bir
 * ziyaretçiyi işaret edemez. Aydınlatma metninde 90 gün yazdığı için
 * yapılıyor — ve bu ayrım künyede de yazılı (`yasal: false`).
 * ─────────────────────────────────────────────────────────────────────────
 */
export async function olcumAyrintilariniTemizle(payload: Payload): Promise<GorevRaporu> {
  const rapor: GorevRaporu = {
    anahtar: 'olcum-ayrinti-sil',
    ad: 'Ölçüm — 90 günden eski olay ayrıntılarını temizle',
    islenen: 0,
    detay: [],
  }

  try {
    const sinir = new Date()
    sinir.setUTCDate(sinir.getUTCDate() - OLCUM_AYRINTI_GUN)
    const sinirGunu = sinir.toISOString().slice(0, 10)

    const eskiler = await payload.find({
      collection: 'gozlem-gunluk',
      where: {
        and: [{ gun: { less_than: sinirGunu } }, { ayrintiTemizlendi: { not_equals: true } }],
      },
      limit: 500,
      depth: 0,
      overrideAccess: true,
    })

    for (const kayit of eskiler.docs) {
      await payload.update({
        collection: 'gozlem-gunluk',
        id: (kayit as { id: string | number }).id,
        /**
         * ⚠️ ŞEHİR DE SİLİNİYOR, ÜLKE SİLİNMİYOR — VE FARK KASITLI.
         *
         * Ülke tek başına hiç kimseyi işaret etmez; kalıcı bir
         * toplulaştırılmış sayaç olarak kalabilir. Şehir edebilir: küçük
         * bir yerleşimden gelen tek ziyaret, gün ve sayfayla birleşince
         * "o kişi" demektir. Raporda k-anonimlik eşiği var ama o eşik
         * GÖSTERİMİ kısıtlıyor, SAKLAMAYI değil.
         *
         * 90 gün kuralı bu yüzden şehri de kapsıyor: en ayrıntılı iki
         * katman (`olaylar` ve `sehirler`) siliniyor, geri kalan
         * toplulaştırılmış sayaçlar kalıcı.
         */
        data: { olaylar: [], sehirler: [], ayrintiTemizlendi: true },
        overrideAccess: true,
      })
      rapor.islenen += 1
    }

    if (rapor.islenen > 0) {
      rapor.detay.push(
        `${rapor.islenen} gün kaydının olay ayrıntısı ve şehir kırılımı temizlendi ` +
          `(${OLCUM_AYRINTI_GUN} günden eski). Toplulaştırılmış sayaçlar korundu.`,
      )
    }
  } catch (hata) {
    rapor.hata = hata instanceof Error ? hata.message : 'Bilinmeyen hata'
  }

  return rapor
}

/**
 * Alan adı sağlığını sorgular ve sonucu önbelleğe yazar.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ SORGU GÜNDE BİR KEZ BURADA YAPILIYOR — panel hiç sormuyor.
 *
 * Şartnamenin şartı: kayıt kuruluşunu yorma. Panel şeridi her sayfa
 * açılışında çalışıyor; oradan RDAP sorgulansaydı günde yüzlerce istek
 * giderdi. Sonuç `alan-sagligi` globaline yazılıyor, şerit onu okuyor.
 *
 * ⚠️ Sorgu başarısız olsa bile YAZILIYOR: "sorgulanamadı" da bir bilgi.
 * Sessizce eski sonucu bırakmak, dört gün önceki "sağlıklı" satırının
 * bugünkü gerçek sanılmasına yol açardı.
 * ─────────────────────────────────────────────────────────────────────────
 */
export async function alanSagliginiKontrolEt(payload: Payload): Promise<GorevRaporu> {
  const rapor: GorevRaporu = {
    anahtar: 'alan-sagligi',
    ad: 'Alan adı sağlığı — durum, bitiş tarihi ve dış DNS',
    islenen: 0,
    detay: [],
  }

  try {
    const sorgu = await alaniSorgula()

    if (sorgu === null) {
      /**
       * ⚠️ HATA DEĞİL, ATLAMA.
       *
       * Geliştirme ve hazırlık ortamlarında `SITE_ADRESI` genellikle
       * `localhost` ya da bir IP; o adresin kayıt kuruluşu da DNS kaydı da
       * yok. Bunu hata saymak, geliştiricinin panelinde her gün kırmızı bir
       * satır üretirdi ve gerçek uyarıları gölgelerdi.
       */
      rapor.detay.push(
        'SITE_ADRESI genel bir alan adı değil (localhost, IP ya da yerel uzantı); ' +
          'alan adı kontrolü atlandı.',
      )
      return rapor
    }

    const sonuc = alaniDegerlendir(sorgu)
    rapor.islenen = 1

    await payload.updateGlobal({
      slug: 'alan-sagligi',
      data: {
        alan: sorgu.alan,
        saglik: sonuc.saglik,
        ozet: sonuc.ozet,
        eylem: sonuc.eylem,
        bitisTarihi: sorgu.bitisTarihi,
        kalanGun: sonuc.kalanGun,
        durumlar: (sorgu.durumlar ?? []).join(', '),
        cozumleme:
          sorgu.cozumleme === null
            ? 'sorgulanamadı'
            : Object.entries(sorgu.cozumleme)
                .map(([ad, bulundu]) => `${ad}: ${bulundu ? 'çözülüyor' : 'ÇÖZÜLMÜYOR'}`)
                .join(' · '),
        sorguZamani: sorgu.sorguZamani,
      },
      overrideAccess: true,
    })

    rapor.detay.push(`${sorgu.alan} → ${sonuc.saglik}: ${sonuc.ozet}`)
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
  'olcum-ayrinti-sil': olcumAyrintilariniTemizle,
  'alan-sagligi': alanSagliginiKontrolEt,
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
