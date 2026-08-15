import type { Payload, TypedUser } from 'payload'

import { CORLU_MAHALLELERI, mahalleSlugu, type CorluMahallesi } from './corluMahalleleri'

/**
 * Çorlu mahalle listesi içe aktarma — çekirdek.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ SADECE AD VE TÜR YAZILIR
 *
 * Kayıt `yayinda: false` açılır ve içindeki her rakam, koordinat ve metin
 * boş kalır. Bu bir eksiklik değil tasarım: mahalle adı bir olgudur,
 * nüfusu ve m² fiyatı ise veridir (CLAUDE.md kural 2).
 *
 * Kayıt açmak yine de işin büyük kısmını hallediyor — 27 mahallenin adını
 * ve slug'ını elle girmek yarım saatlik, hata yapmaya açık bir iş.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ MEVCUT KAYDIN ÜZERİNE YAZILMAZ
 *
 * Aynı slug'a sahip mahalle varsa atlanır. Tek istisna: yerleşim türü hiç
 * girilmemişse o alan doldurulur — bu alan bu listenin kendi bilgisi ve
 * boş bir alanı doldurmak bir şeyi ezmek değildir.
 */

export type ListeIslemi =
  /** Kayıt yok — açılacak. */
  | 'yeni'
  /** Kayıt var, yerleşim türü boş — yalnızca o alan doldurulacak. */
  | 'tur_eklenecek'
  /** Kayıt var ve tam — dokunulmayacak. */
  | 'mevcut'

export interface ListeSatiri {
  mahalle: CorluMahallesi
  slug: string
  islem: ListeIslemi
  /** Mevcut kaydın kimliği — panelde bağlantı olarak gösterilir. */
  mevcutId?: number
  /** Mevcut kaydın adı; listemizdekinden farklı yazılmış olabilir. */
  mevcutAd?: string
}

export interface ListeOnizlemesi {
  satirlar: ListeSatiri[]
  yeniSayisi: number
  turEklenecekSayisi: number
  mevcutSayisi: number
  /**
   * Sistemde olup listemizde olmayan mahalleler.
   *
   * ⚠️ Sessizce görmezden gelinmiyor: burada Velimeşe gibi yanlış ilçeye ait
   * bir kayıt ya da elle açılmış bir mahalle görünür. Karar Aslıhan'ın —
   * içe aktarma hiçbir kaydı SİLMEZ.
   */
  listeDisiKayitlar: { id: number; ad: string; slug: string }[]
}

/** Sistemdeki mahalleleri slug'a göre indeksler. */
async function mevcutMahalleler(payload: Payload, user: TypedUser) {
  const sonuc = await payload.find({
    collection: 'mahalleler',
    limit: 500,
    depth: 0,
    sort: 'ad',
    user,
    overrideAccess: false,
  })

  return sonuc.docs.map((kayit) => ({
    id: kayit.id as number,
    ad: String(kayit.ad ?? ''),
    slug: String(kayit.slug ?? ''),
    yerlesimTuru: kayit.yerlesimTuru ?? null,
  }))
}

/**
 * Önizleme hazırlar — hiçbir şey yazmaz.
 *
 * CSV ve OSM içe aktarmalarındaki ilkenin aynısı: önce gör, sonra yaz.
 */
export async function listeOnizlemesi(payload: Payload, user: TypedUser): Promise<ListeOnizlemesi> {
  const mevcutlar = await mevcutMahalleler(payload, user)
  const slugHaritasi = new Map(mevcutlar.map((kayit) => [kayit.slug, kayit]))

  const satirlar: ListeSatiri[] = CORLU_MAHALLELERI.map((mahalle) => {
    const slug = mahalleSlugu(mahalle.ad)
    const mevcut = slugHaritasi.get(slug)

    if (!mevcut) return { mahalle, slug, islem: 'yeni' as const }

    return {
      mahalle,
      slug,
      islem: mevcut.yerlesimTuru ? ('mevcut' as const) : ('tur_eklenecek' as const),
      mevcutId: mevcut.id,
      mevcutAd: mevcut.ad,
    }
  })

  const listeSluglari = new Set(satirlar.map((satir) => satir.slug))

  return {
    satirlar,
    yeniSayisi: satirlar.filter((satir) => satir.islem === 'yeni').length,
    turEklenecekSayisi: satirlar.filter((satir) => satir.islem === 'tur_eklenecek').length,
    mevcutSayisi: satirlar.filter((satir) => satir.islem === 'mevcut').length,
    listeDisiKayitlar: mevcutlar
      .filter((kayit) => !listeSluglari.has(kayit.slug))
      .map(({ id, ad, slug }) => ({ id, ad, slug })),
  }
}

export interface ListeYazmaSonucu {
  eklenen: number
  turEklenen: number
  atlanan: number
  hatalar: { ad: string; mesaj: string }[]
}

/**
 * Eksik mahalleleri açar.
 *
 * ⚠️ Satırlar istemciden GELMİYOR — liste sunucudaki sabitten okunuyor ve
 * mevcut kayıtlar sunucuda yeniden sorgulanıyor. İstemcinin tek etkisi
 * düğmeye basmak; hangi adların yazılacağına karar veremez.
 *
 * ⚠️ Yazma Local API + `overrideAccess: false`: koleksiyonun erişim
 * kuralları ve slug kancası aynen çalışır.
 */
export async function listeyiYaz(payload: Payload, user: TypedUser): Promise<ListeYazmaSonucu> {
  const onizleme = await listeOnizlemesi(payload, user)
  const sonuc: ListeYazmaSonucu = { eklenen: 0, turEklenen: 0, atlanan: 0, hatalar: [] }

  for (const satir of onizleme.satirlar) {
    try {
      if (satir.islem === 'yeni') {
        await payload.create({
          collection: 'mahalleler',
          data: {
            ad: satir.mahalle.ad,
            /**
             * ⚠️ Slug açıkça veriliyor, kancaya bırakılmıyor.
             *
             * Kanca boş slug'ı zaten üretirdi ama önizlemede gösterdiğimiz
             * adres ile yazılan adresin aynı fonksiyondan geldiğine emin
             * olmak istiyoruz: "zaten var mı" kontrolü slug üzerinden
             * yapılıyor ve ikisi ayrışsaydı içe aktarma mevcut mahallelerin
             * kopyasını açardı.
             */
            slug: satir.slug,
            yerlesimTuru: satir.mahalle.tur,
            // ⚠️ İçerik metni yazılmadan yayına ALINMAZ: 800 kelimeden kısa
            // sayfa arama motorunda "zayıf içerik" sayılır ve tüm siteyi
            // aşağı çeker.
            yayinda: false,
          },
          user,
          overrideAccess: false,
        })
        sonuc.eklenen += 1
      } else if (satir.islem === 'tur_eklenecek' && satir.mevcutId !== undefined) {
        await payload.update({
          collection: 'mahalleler',
          id: satir.mevcutId,
          data: { yerlesimTuru: satir.mahalle.tur },
          user,
          overrideAccess: false,
        })
        sonuc.turEklenen += 1
      } else {
        sonuc.atlanan += 1
      }
    } catch (hata) {
      sonuc.hatalar.push({
        ad: satir.mahalle.ad,
        mesaj: hata instanceof Error ? hata.message : 'bilinmeyen hata',
      })
    }
  }

  return sonuc
}
