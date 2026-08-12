import type { Payload, TypedUser } from 'payload'

import { csvAyristir, type Ayirici } from '@/lib/csv/ayristir'
import { MUKERRER_GUN_PENCERESI, mukerrerKontrol } from '@/lib/endeks/kalite'
import type { GozlemKaynagi, GuvenSeviyesi } from '@/lib/endeks/tipler'

import {
  eksikZorunluAlanlar,
  eslenmemisSutunlar,
  satirlariCozumle,
  sutunlariEslestir,
  type CozulmusSatir,
  type SutunEslemesi,
} from './iceAktarma'

/**
 * Gözlem CSV içe aktarma — çekirdek.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * NEDEN SUNUCU EYLEMİNDEN AYRI BİR DOSYA
 *
 * `'use server'` dosyaları yalnızca async fonksiyon dışa aktarabilir ve her
 * dışa aktarım bir uç noktaya dönüşür. Çekirdeği orada tutmak iki şeyi
 * bozardı: entegrasyon testi `headers()` olmadan çağıramaz, ve iç yardımcı
 * fonksiyonlar istemeden dışarıya açılırdı.
 *
 * Bu dosya `payload` ve `user`'ı **parametre olarak** alır; oturumu
 * çözmek eylemin işidir.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ İSTEMCİNİN ÇÖZÜMLEDİĞİ VERİYE GÜVENİLMEZ
 *
 * Önizleme ekranı satırları tarayıcıda gösterir, ama içe aktarma **o
 * gösterilen değerleri kabul etmez.** Sunucu; CSV metnini, eşlemeyi ve
 * ayarları yeniden çözümler ve yalnızca kendi ürettiği veriyi yazar.
 *
 * Aksi hâlde ağ isteğini düzenleyen biri, önizlemede gördüğünden bambaşka
 * rakamları endeksin ham verisine yazdırabilirdi. Kullanıcının seçebildiği
 * tek şey **hangi satırların dışarıda kalacağı**; değerler değil.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Dosya boyutu tavanı — 3,2 GB'lık sunucuda bellek koruması. */
export const AZAMI_CSV_KARAKTER = 2_000_000

/** Tek seferde işlenecek azami satır. Üstü için dosyayı bölmek gerekir. */
export const AZAMI_SATIR = 5_000

export interface IceAktarmaAyarlari {
  varsayilanKaynak: GozlemKaynagi
  varsayilanGuven: GuvenSeviyesi
}

export interface OnizlemeGirdisi {
  csvMetni: string
  /** Belirtilmezse sezilir. */
  ayirici?: Ayirici
  /** Belirtilmezse başlıklardan tahmin edilir. */
  eslesme?: SutunEslemesi
  ayarlar: IceAktarmaAyarlari
}

export interface OnizlemeSonucu {
  basarili: boolean
  genelHata?: string
  basliklar?: string[]
  ayirici?: Ayirici
  eslesme?: SutunEslemesi
  satirlar?: CozulmusSatir[]
  hazirSayisi?: number
  uyariliSayisi?: number
  hataliSayisi?: number
  /** Eşlenmemiş sütunlar — sessizce atılmadığını göstermek için. */
  kullanilmayanSutunlar?: { sira: number; baslik: string }[]
  /** Eşlenmemiş zorunlu alanlar — doluysa içe aktarma yapılamaz. */
  eksikAlanlar?: string[]
  atlananBosSatir?: number
}

export interface IceAktarmaGirdisi extends OnizlemeGirdisi {
  /** Kullanıcının dışarıda bırakmayı seçtiği satır numaraları. */
  atlanacakSatirlar: number[]
}

export interface IceAktarmaSonucu {
  basarili: boolean
  genelHata?: string
  olusturulan?: number
  /** Kullanıcının elediği satır sayısı. */
  atlanan?: number
  /** Hata nedeniyle aktarılamayan satır sayısı. */
  hatali?: number
  /** Yazma sırasında oluşan beklenmedik hatalar — satır numarasıyla. */
  yazmaHatalari?: { satirNo: number; mesaj: string }[]
}

/** Sistemdeki mahalleler — ad eşleştirmesi için. */
async function mahalleleriGetir(payload: Payload, user: TypedUser) {
  const sonuc = await payload.find({
    collection: 'mahalleler',
    limit: 500,
    depth: 0,
    sort: 'ad',
    user,
    overrideAccess: false,
  })

  return sonuc.docs
    .filter((m) => typeof m.slug === 'string' && m.slug !== '')
    .map((m) => ({ id: m.id as number, ad: m.ad, slug: m.slug as string }))
}

/**
 * CSV'yi çözümler — önizleme ve içe aktarma AYNI yolu kullanır.
 *
 * İki ayrı çözümleme yolu olsaydı, önizlemede görülenle yazılanın
 * ayrışması an meselesiydi.
 */
export async function cozumle(
  girdi: OnizlemeGirdisi,
  payload: Payload,
  user: TypedUser,
): Promise<OnizlemeSonucu> {
  if (typeof girdi.csvMetni !== 'string' || girdi.csvMetni.trim() === '') {
    return { basarili: false, genelHata: 'CSV içeriği boş.' }
  }

  if (girdi.csvMetni.length > AZAMI_CSV_KARAKTER) {
    return {
      basarili: false,
      genelHata:
        `Dosya çok büyük (${Math.round(girdi.csvMetni.length / 1000)} bin karakter). ` +
        'Dosyayı bölüp parça parça aktarın.',
    }
  }

  const cikti = csvAyristir(girdi.csvMetni, girdi.ayirici)

  if (cikti.basliklar.length === 0) {
    return { basarili: false, genelHata: 'Başlık satırı okunamadı.' }
  }

  if (cikti.satirlar.length === 0) {
    return {
      basarili: false,
      genelHata: 'Dosyada başlık dışında satır yok.',
      basliklar: cikti.basliklar,
      ayirici: cikti.ayirici,
    }
  }

  if (cikti.satirlar.length > AZAMI_SATIR) {
    return {
      basarili: false,
      genelHata:
        `Dosyada ${cikti.satirlar.length} satır var; tek seferde en fazla ${AZAMI_SATIR} ` +
        'satır aktarılabilir.',
    }
  }

  const eslesme = girdi.eslesme ?? sutunlariEslestir(cikti.basliklar)
  const mahalleler = await mahalleleriGetir(payload, user)

  const cozum = satirlariCozumle(cikti.satirlar, eslesme, {
    mahalleler,
    varsayilanKaynak: girdi.ayarlar.varsayilanKaynak,
    varsayilanGuven: girdi.ayarlar.varsayilanGuven,
  })

  // ── Veritabanına karşı mükerrer kontrolü ──
  // Dosya içi mükerrer `satirlariCozumle` içinde yakalanıyor; bu, daha önce
  // GİRİLMİŞ kayıtlara karşı olan kontrol. İkisi ayrı sorunlar.
  await veritabaniMukerrerleriIsaretle(cozum.satirlar, payload, user, mahalleler)

  return {
    basarili: true,
    basliklar: cikti.basliklar,
    ayirici: cikti.ayirici,
    eslesme,
    satirlar: cozum.satirlar,
    hazirSayisi: cozum.satirlar.filter((s) => s.veri !== null && s.uyarilar.length === 0).length,
    uyariliSayisi: cozum.satirlar.filter((s) => s.veri !== null && s.uyarilar.length > 0).length,
    hataliSayisi: cozum.hataliSayisi,
    kullanilmayanSutunlar: eslenmemisSutunlar(cikti.basliklar, eslesme),
    eksikAlanlar: eksikZorunluAlanlar(eslesme),
    atlananBosSatir: cikti.atlananBosSatir,
  }
}

/**
 * Daha önce girilmiş kayıtlarla mükerrer kontrolü.
 *
 * Uyarı üretir, engellemez: gerçekten iki ayrı taşınmaz aynı mahallede aynı
 * m² ve aynı fiyatla listelenmiş olabilir. Kararı insan verir
 * (`endeks/kalite.ts` içindeki ilkeyle aynı).
 */
async function veritabaniMukerrerleriIsaretle(
  satirlar: CozulmusSatir[],
  payload: Payload,
  user: TypedUser,
  mahalleler: readonly { id: number; slug: string }[],
): Promise<void> {
  const ilgiliMahalleler = [
    ...new Set(
      satirlar.map((s) => s.veri?.mahalleId).filter((id): id is number => id !== undefined),
    ),
  ]
  if (ilgiliMahalleler.length === 0) return

  const pencereBaslangici = new Date()
  pencereBaslangici.setDate(pencereBaslangici.getDate() - MUKERRER_GUN_PENCERESI)

  const mevcutlar = await payload.find({
    collection: 'gozlemler',
    where: {
      and: [
        { mahalle: { in: ilgiliMahalleler } },
        { gozlemTarihi: { greater_than_equal: pencereBaslangici.toISOString() } },
      ],
    },
    limit: 2_000,
    depth: 0,
    user,
    overrideAccess: false,
  })

  const slugById = new Map(mahalleler.map((m) => [m.id, m.slug]))
  const bugun = Date.now()

  const kayitlar = mevcutlar.docs.map((kayit) => {
    const mahalleId = typeof kayit.mahalle === 'object' ? kayit.mahalle?.id : kayit.mahalle
    const tarih =
      typeof kayit.gozlemTarihi === 'string' ? Date.parse(kayit.gozlemTarihi) : Number.NaN

    return {
      mahalleSlug: slugById.get(Number(mahalleId)) ?? '',
      odaTipi: String(kayit.odaTipi ?? ''),
      tip: String(kayit.tip ?? ''),
      m2: Number(kayit.m2 ?? 0),
      fiyat: Number(kayit.fiyat ?? 0),
      gunOnce: Number.isFinite(tarih)
        ? Math.floor((bugun - tarih) / 86_400_000)
        : Number.MAX_SAFE_INTEGER,
    }
  })

  for (const satir of satirlar) {
    if (!satir.veri) continue

    const uyari = mukerrerKontrol(
      {
        mahalleSlug: satir.veri.mahalleSlug,
        odaTipi: satir.veri.odaTipi,
        tip: satir.veri.tip,
        m2: satir.veri.m2,
        fiyat: satir.veri.fiyat,
        m2Fiyati: satir.veri.m2Fiyati,
      },
      kayitlar,
    )

    if (uyari) satir.uyarilar.push(`Sistemde zaten olabilir — ${uyari.mesaj}`)
  }
}

/**
 * Çözümlenmiş satırları yazar.
 *
 * ⚠️ Kayıtlar Local API ile, `overrideAccess: false` ve gerçek kullanıcıyla
 * oluşturulur. Böylece `Gozlemler` koleksiyonunun erişim kuralları ve
 * `beforeChange` kancası (m² fiyatı, ay, özet) aynen çalışır. Toplu yazma,
 * kancaları atlamak için bir bahane değildir.
 */
export async function satirlariYaz(
  girdi: IceAktarmaGirdisi,
  payload: Payload,
  user: TypedUser,
): Promise<IceAktarmaSonucu> {
  const cozum = await cozumle(girdi, payload, user)

  if (!cozum.basarili || !cozum.satirlar) {
    return { basarili: false, genelHata: cozum.genelHata ?? 'Dosya çözümlenemedi.' }
  }

  if ((cozum.eksikAlanlar?.length ?? 0) > 0) {
    return {
      basarili: false,
      genelHata: `Şu zorunlu alanlar bir sütuna bağlanmadı: ${cozum.eksikAlanlar?.join(', ')}.`,
    }
  }

  const atlanacak = new Set(
    Array.isArray(girdi.atlanacakSatirlar) ? girdi.atlanacakSatirlar.map(Number) : [],
  )

  const yazmaHatalari: { satirNo: number; mesaj: string }[] = []
  let olusturulan = 0
  let atlanan = 0

  for (const satir of cozum.satirlar) {
    if (!satir.veri) continue
    if (atlanacak.has(satir.satirNo)) {
      atlanan += 1
      continue
    }

    try {
      await payload.create({
        collection: 'gozlemler',
        data: {
          mahalle: satir.veri.mahalleId,
          tip: satir.veri.tip,
          odaTipi: satir.veri.odaTipi,
          m2: satir.veri.m2,
          fiyat: satir.veri.fiyat,
          // ⚠️ Tarih gün hassasiyetinde; UTC öğlen yazılıyor. Gece yarısı
          // yazılsaydı, saat dilimi kayması gözlemi bir önceki aya taşıyıp
          // endeks katmanını sessizce değiştirebilirdi.
          gozlemTarihi: `${satir.veri.gozlemTarihi}T12:00:00.000Z`,
          kaynak: satir.veri.kaynak,
          guvenSeviyesi: satir.veri.guvenSeviyesi,
          binaYasi: satir.veri.binaYasi ?? undefined,
          kat: satir.veri.kat ?? undefined,
          notlar: satir.veri.notlar ?? undefined,
        },
        user,
        overrideAccess: false,
      })
      olusturulan += 1
    } catch (hata) {
      yazmaHatalari.push({ satirNo: satir.satirNo, mesaj: hataMesaji(hata) })
    }
  }

  return {
    basarili: true,
    olusturulan,
    atlanan,
    hatali: cozum.hataliSayisi ?? 0,
    yazmaHatalari,
  }
}

export function hataMesaji(hata: unknown): string {
  if (hata instanceof Error && hata.message.trim() !== '') return hata.message
  return 'İşlem tamamlanamadı. Bilgileri kontrol edip tekrar deneyin.'
}
