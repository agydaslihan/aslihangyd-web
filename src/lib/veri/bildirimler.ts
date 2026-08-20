import 'server-only'

import { semaDurumu } from '@/lib/sema/denetim'

import type { Payload } from 'payload'

import { eksikAyarlar, eskiAdlaOkunanlar } from '@/lib/ayarlar'
import { GOREV_KUNYELERI } from '@/lib/bakim/kunye'
import {
  type AlanSagligiGirdisi,
  bildirimleriUret,
  GOZLEMSIZ_MAHALLE_GUN,
  ILGISIZ_PORTFOY_GUN,
  type Bildirim,
  type BakimGorevDurumu,
} from '@/lib/bildirim/motor'
import { HERKESE_ACIK_DURUMLAR, YETKI_UYARI_ESIGI_GUN } from '@/lib/eids'
import { SITE_ADRESI } from '@/lib/site'

/**
 * Panel bildirimleri için sayım katmanı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ HER SORGU `limit: 0` + SAYIM.
 *
 * Bu kod panelin ana ekranında, HER açılışta çalışıyor. Belgeleri çekip
 * uzunluğuna bakmak (`docs.length`) altı ilanla fark ettirmez ama beş yüz
 * ilanla paneli açılmaz hale getirir. `payload.count` yalnızca
 * `SELECT count(*)` üretir; `depth` ve ilişki çözümü devreye girmez.
 *
 * ⚠️ TEK İSTİSNA: ilgisiz portföy. Orada "talebi OLMAYAN ilan" aranıyor
 * ve Payload'ın sorgu dili ilişkinin yokluğunu sayamıyor. Sebebi ve
 * sınırı aşağıda.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Bugünden N gün sonrasının ISO anı. */
function gunSonra(gun: number, simdi: Date): string {
  return new Date(simdi.getTime() + gun * 86_400_000).toISOString()
}

/** Bugünden N gün öncesinin ISO anı. */
function gunOnce(gun: number, simdi: Date): string {
  return new Date(simdi.getTime() - gun * 86_400_000).toISOString()
}

/**
 * Bakım görevlerinin son durumu.
 *
 * `bakim-durumu` global'i hiç yazılmamışsa Payload boş bir belge döndürür;
 * bu durumda tüm görevler "hiç çalışmadı" sayılır — doğrusu da bu, çünkü
 * cron kurulmamışsa kayıt gerçekten yoktur.
 */
async function bakimDurumunuGetir(payload: Payload): Promise<BakimGorevDurumu[]> {
  let satirlar: {
    anahtar?: string | null
    sonBasariliCalisma?: string | null
    sonHata?: string | null
  }[] = []

  try {
    const durum = await payload.findGlobal({ slug: 'bakim-durumu', depth: 0 })
    satirlar = durum.gorevler ?? []
  } catch {
    // Global henüz göç edilmemişse okuma hata verir. Bu, bildirim şeridinin
    // tamamını düşürmek için bir sebep değil — görevler "hiç çalışmadı"
    // görünür ve bu zaten doğru cevap.
    satirlar = []
  }

  return GOREV_KUNYELERI.map((kunye) => {
    const satir = satirlar.find((aday) => aday.anahtar === kunye.anahtar)
    return {
      anahtar: kunye.anahtar,
      ad: kunye.ad,
      yasal: kunye.yasal,
      sonBasariliCalisma: satir?.sonBasariliCalisma ?? null,
      sonHata: satir?.sonHata ?? null,
    }
  })
}

/**
 * 60 gündür hiç talep almamış yayındaki ilan sayısı.
 *
 * ⚠️ İKİ SORGU, ÇÜNKÜ "OLMAYANI" SAYMAK GEREKİYOR.
 *
 * Payload'ın `where` dili "bu ilana bağlı talep yok" diye bir koşul
 * kuramıyor; ilişki yokluğu ancak iki kümenin farkıyla bulunuyor.
 * Bu yüzden yalnızca kimlikler çekiliyor (`depth: 0`, tek alan) ve fark
 * bellekte alınıyor.
 *
 * ⚠️ Yeni eklenen ilan sayılmaz: 60 günden genç bir ilanın "60 gündür
 * ilgi görmemesi" mantıksal olarak imkânsız, ama tarih karşılaştırması
 * yapılmazsa her yeni ilan ilk gününde bu uyarıyı tetiklerdi.
 */
async function ilgisizPortfoyuSay(payload: Payload, simdi: Date): Promise<number> {
  const esik = gunOnce(ILGISIZ_PORTFOY_GUN, simdi)

  const [ilanlar, talepler] = await Promise.all([
    payload.find({
      collection: 'ilanlar',
      where: {
        and: [{ durum: { in: [...HERKESE_ACIK_DURUMLAR] } }, { createdAt: { less_than: esik } }],
      },
      // `id` her zaman döner; `select` yalnızca EK alanları belirtir. Tek bir
      // ucuz sütun seçmek, tüm belgeyi çekmenin önüne geçiyor.
      select: { durum: true },
      depth: 0,
      limit: 1000,
      pagination: false,
    }),
    payload.find({
      collection: 'talepler',
      where: {
        and: [{ createdAt: { greater_than: esik } }, { ilgiliIlan: { exists: true } }],
      },
      select: { ilgiliIlan: true },
      depth: 0,
      limit: 2000,
      pagination: false,
    }),
  ])

  const ilgiGorenler = new Set<number>()
  for (const talep of talepler.docs) {
    const ilan = talep.ilgiliIlan
    if (typeof ilan === 'number') ilgiGorenler.add(ilan)
    else if (ilan !== null && ilan !== undefined) ilgiGorenler.add(ilan.id)
  }

  return ilanlar.docs.filter((ilan) => !ilgiGorenler.has(ilan.id)).length
}

/**
 * 45 gündür gözlem girilmemiş yayındaki mahalle sayısı.
 *
 * Aynı "olmayanı sayma" sorunu; aynı çözüm. Mahalle sayısı otuzlarla
 * ölçüldüğü için bellekteki fark ihmal edilebilir.
 */
async function gozlemsizMahalleSay(payload: Payload, simdi: Date): Promise<number> {
  const esik = gunOnce(GOZLEMSIZ_MAHALLE_GUN, simdi)

  const [mahalleler, gozlemler] = await Promise.all([
    payload.find({
      collection: 'mahalleler',
      where: { yayinda: { equals: true } },
      select: { yayinda: true },
      depth: 0,
      limit: 500,
      pagination: false,
    }),
    payload.find({
      collection: 'gozlemler',
      where: { gozlemTarihi: { greater_than: esik } },
      select: { mahalle: true },
      depth: 0,
      limit: 5000,
      pagination: false,
    }),
  ])

  const gozlemliler = new Set<number>()
  for (const gozlem of gozlemler.docs) {
    const mahalle = gozlem.mahalle
    if (typeof mahalle === 'number') gozlemliler.add(mahalle)
    else if (mahalle !== null && mahalle !== undefined) gozlemliler.add(mahalle.id)
  }

  return mahalleler.docs.filter((mahalle) => !gozlemliler.has(mahalle.id)).length
}

/**
 * Panelde gösterilecek bildirimleri üretir.
 *
 * ⚠️ Tek bir sorgunun patlaması şeridi tamamen düşürmemeli: yasal uyarının
 * görünmemesi, gösterilmemesinden daha kötü değil — daha kötüsü, şeridin
 * boş görünüp "her şey yolunda" izlenimi vermesi. Bu yüzden hata halinde
 * boş liste değil, sebebi söyleyen bir bildirim döner.
 */
/**
 * @param yoneticiMi Onay kuyruğu bildirimi yalnızca yöneticiye gösterilir.
 *                   Danışman kuyruğa bakıp bir şey yapamaz; ona göstermek
 *                   üzerinde işlem yapamayacağı bir uyarı biriktirir ve
 *                   şeridin tamamını görmezden gelmeyi öğretir.
 */
/**
 * Global kaydını bildirim girdisine çevirir.
 *
 * ⚠️ Kayıt hiç yoksa ya da sağlık alanı boşsa `null` — "sorun yok" DEĞİL.
 * Hiç sorgulanmamış bir kontrolü sağlıklı saymak, kontrolün olmadığı
 * durumu gizlemek olurdu.
 */
function alanSagligiGirdisi(ham: unknown): AlanSagligiGirdisi | null {
  if (ham === null || typeof ham !== 'object') return null
  const kayit = ham as Record<string, unknown>

  const saglik = kayit.saglik
  if (
    saglik !== 'saglikli' &&
    saglik !== 'uyari' &&
    saglik !== 'kritik' &&
    saglik !== 'bilinmiyor'
  ) {
    return null
  }

  return {
    saglik,
    ozet: typeof kayit.ozet === 'string' ? kayit.ozet : 'Alan adı durumu',
    eylem: typeof kayit.eylem === 'string' ? kayit.eylem : '',
    sorguZamani: typeof kayit.sorguZamani === 'string' ? kayit.sorguZamani : null,
  }
}

export async function bildirimleriGetir(
  payload: Payload,
  simdi: Date = new Date(),
  yoneticiMi = true,
): Promise<Bildirim[]> {
  try {
    const [
      yetkisiBitecek,
      yetkisiDolmus,
      bakimGorevleri,
      ilgisizPortfoy,
      gozlemsizMahalle,
      kurumsal,
      alanKaydi,
      onayBekleyen,
    ] = await Promise.all([
      payload.count({
        collection: 'ilanlar',
        where: {
          and: [
            { durum: { in: [...HERKESE_ACIK_DURUMLAR] } },
            { eidsYetkiBitis: { greater_than_equal: simdi.toISOString() } },
            { eidsYetkiBitis: { less_than: gunSonra(YETKI_UYARI_ESIGI_GUN, simdi) } },
          ],
        },
      }),
      payload.count({
        collection: 'ilanlar',
        where: {
          and: [
            { durum: { in: [...HERKESE_ACIK_DURUMLAR] } },
            { eidsYetkiBitis: { less_than: simdi.toISOString() } },
          ],
        },
      }),
      bakimDurumunuGetir(payload),
      ilgisizPortfoyuSay(payload, simdi),
      gozlemsizMahalleSay(payload, simdi),
      payload.findGlobal({ slug: 'kurumsal-bilgiler', depth: 0 }),
      /**
       * ⚠️ Alan adı sağlığı BURADA SORGULANMIYOR, yalnızca okunuyor.
       *
       * Kayıt kuruluşuna giden istek günde bir kez `alan-sagligi` bakım
       * göreviyle yapılıyor. Şerit her sayfa açılışında çalıştığı için
       * buradan sorulsaydı günde yüzlerce istek giderdi — şartnamenin
       * "nazik ol" şartının tam tersi.
       */
      payload.findGlobal({ slug: 'alan-sagligi', depth: 0 }).catch(() => null),
      // Danışmana gösterilmeyecekse sorguyu hiç çalıştırma.
      yoneticiMi
        ? payload.count({
            collection: 'ilanlar',
            where: { durum: { equals: 'onay_bekliyor' } },
          })
        : Promise.resolve({ totalDocs: 0 }),
    ])

    const belgeNo = kurumsal.yetkiBelgesiNo
    const yetkiBelgesiVar = typeof belgeNo === 'string' && belgeNo.trim() !== ''

    return bildirimleriUret(
      {
        yetkisiBitecekIlan: yetkisiBitecek.totalDocs,
        yetkisiDolmusYayindaIlan: yetkisiDolmus.totalDocs,
        bakimGorevleri,
        ilgisizPortfoy,
        gozlemsizMahalle,
        yetkiBelgesiVar,
        onayBekleyenIlan: onayBekleyen.totalDocs,
        /**
         * ⚠️ Ayar durumu VERİTABANINDAN DEĞİL ortamdan geliyor ve bu
         * bilinçli: yapılandırma arızası tam da veritabanına hiç
         * ulaşamadığımız durumda da görünmeli.
         */
        eksikAyarlar: eksikAyarlar().map((durum) => ({
          ad: durum.ad,
          aciklama: durum.tanim.aciklama,
          eksikseNeOlur: durum.tanim.eksikseNeOlur,
          kritik: durum.tanim.kritik === true,
        })),
        eskiAdliAyarlar: eskiAdlaOkunanlar().map((durum) => ({
          ad: durum.ad,
          aciklama: durum.tanim.aciklama,
        })),
        siteAdresindePortVar: /:\d+$/.test(SITE_ADRESI),
        alanSagligi: alanSagligiGirdisi(alanKaydi ?? null),
        /**
         * ⚠️ Burada SORGU YAPILMIYOR, açılışta yapılan denetimin sonucu
         * okunuyor. Şerit her sayfa açılışında çalışıyor; buradan 63
         * tablo sorgulansaydı her panel görüntülemesine bir şema sorgusu
         * eklenirdi.
         */
        semaDurumu: semaDurumu(),
      },
      simdi,
    )
  } catch (hata) {
    return [
      {
        anahtar: 'bildirim-hatasi',
        oncelik: 'yasal',
        baslik: 'Bildirimler hesaplanamadı',
        aciklama:
          'Bu şerit EİDS yetki bitişlerini ve bakım görevlerini izliyor; şu an ' +
          'hesaplanamadığı için AÇIK UYARI OLMADIĞI ANLAMINA GELMEZ. Sebep: ' +
          (hata instanceof Error ? hata.message : 'bilinmeyen hata'),
      },
    ]
  }
}
