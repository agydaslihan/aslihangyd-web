import type { Payload, TypedUser } from 'payload'

import { kayitOlcekSupheleri, type OlcekAlani, type OlcekSuphesi } from './olcek'

/**
 * Ölçek taraması ve toplu düzeltme — çekirdek.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ TARAMA VE UYGULAMA AYNI YOLU KULLANIR.
 *
 * Önizlemede görülenle yazılanın ayrışması, toplu bir işlemde tek tek
 * işlemden çok daha pahalı: yanlışlıkla 26 mahalleyi birden bozmak, bir
 * mahalleyi bozmaktan yirmi altı kat kötü. Uygulama, kullanıcının gördüğü
 * listeyi yeniden ÜRETİYOR ve yalnızca hâlâ şüpheli olan alanları
 * yazıyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

export const TARANAN_KOLEKSIYONLAR = ['mahalleler', 'ilanlar'] as const
export type TarananKoleksiyon = (typeof TARANAN_KOLEKSIYONLAR)[number]

/** Hangi alan hangi koleksiyonda aranacak. */
const KOLEKSIYON_ALANLARI: Record<TarananKoleksiyon, readonly OlcekAlani[]> = {
  mahalleler: ['ortalamaM2Satis', 'ortalamaKira', 'nufus'],
  ilanlar: ['fiyat', 'tahminiKira', 'aidat'],
}

export interface TaramaSatiri {
  koleksiyon: TarananKoleksiyon
  kayitId: number
  kayitAdi: string
  supheler: OlcekSuphesi[]
}

export interface TaramaSonucu {
  satirlar: TaramaSatiri[]
  tarananKayit: number
  supheliAlan: number
}

function kayitAdi(koleksiyon: TarananKoleksiyon, kayit: Record<string, unknown>): string {
  const alan = koleksiyon === 'mahalleler' ? 'ad' : 'baslik'
  const deger = kayit[alan]
  return typeof deger === 'string' && deger !== '' ? deger : `#${String(kayit.id)}`
}

export async function olcegiTara(payload: Payload, user: TypedUser): Promise<TaramaSonucu> {
  const satirlar: TaramaSatiri[] = []
  let taranan = 0

  for (const koleksiyon of TARANAN_KOLEKSIYONLAR) {
    const sonuc = await payload.find({
      collection: koleksiyon,
      limit: 1000,
      depth: 0,
      sort: 'id',
      user,
      overrideAccess: false,
    })

    for (const ham of sonuc.docs) {
      taranan += 1
      const kayit = ham as unknown as Record<string, unknown>

      /**
       * ⚠️ Yalnızca O KOLEKSİYONA AİT alanlar taranıyor. `kiraCarpani`,
       * `degisim12Ay`, `brutM2` ve `gozlemSayisi` bilerek dışarıda:
       * bunların küçük olması normal (12 yıl çarpan, %23 değişim,
       * 145 m²). Hepsini taramak, doğru rakamları şüpheli göstererek
       * uyarıyı değersizleştirirdi.
       */
      const girdi: Partial<Record<OlcekAlani, unknown>> = {}
      for (const alan of KOLEKSIYON_ALANLARI[koleksiyon]) girdi[alan] = kayit[alan]

      const supheler = kayitOlcekSupheleri(girdi)
      if (supheler.length === 0) continue

      satirlar.push({
        koleksiyon,
        kayitId: Number(kayit.id),
        kayitAdi: kayitAdi(koleksiyon, kayit),
        supheler,
      })
    }
  }

  return {
    satirlar,
    tarananKayit: taranan,
    supheliAlan: satirlar.reduce((toplam, satir) => toplam + satir.supheler.length, 0),
  }
}

export interface SecilenAlan {
  koleksiyon: TarananKoleksiyon
  kayitId: number
  alan: OlcekAlani
}

export interface UygulamaSonucu {
  basarili: boolean
  genelHata?: string
  partiId?: string
  degisen?: number
  atlanan?: number
  hatalar?: { kayitAdi: string; mesaj: string }[]
}

/**
 * Seçilen alanları 1000 ile çarpar ve partiyi kaydeder.
 *
 * ⚠️ İSTEMCİNİN GÖNDERDİĞİ DEĞERE GÜVENİLMEZ. İstemci yalnızca HANGİ
 * alanların düzeltileceğini söylüyor; yeni değer sunucuda, kayıttaki
 * güncel değerden hesaplanıyor. Aksi hâlde form üzerinden istenen her
 * sayı yazdırılabilirdi.
 *
 * ⚠️ ARADA DEĞİŞEN KAYIT ATLANIR: alan artık şüpheli değilse (biri elle
 * düzeltmiş olabilir) dokunulmuyor ve sayılıyor.
 */
export async function olcegiDuzelt(
  secilenler: readonly SecilenAlan[],
  payload: Payload,
  user: TypedUser,
): Promise<UygulamaSonucu> {
  if (secilenler.length === 0) {
    return { basarili: false, genelHata: 'Düzeltilecek alan seçilmedi.' }
  }

  const tarama = await olcegiTara(payload, user)
  const guncel = new Map<string, TaramaSatiri>()
  for (const satir of tarama.satirlar) guncel.set(`${satir.koleksiyon}:${satir.kayitId}`, satir)

  const partiSatirlari: {
    koleksiyon: TarananKoleksiyon
    kayitId: number
    kayitAdi: string
    alan: string
    eskiDeger: number
    yeniDeger: number
  }[] = []
  const hatalar: { kayitAdi: string; mesaj: string }[] = []
  let atlanan = 0

  // Kayıt başına grupla: aynı kayda iki ayrı yazma turu atmayalım.
  const kayitBasina = new Map<string, SecilenAlan[]>()
  for (const secim of secilenler) {
    const anahtar = `${secim.koleksiyon}:${secim.kayitId}`
    const liste = kayitBasina.get(anahtar) ?? []
    liste.push(secim)
    kayitBasina.set(anahtar, liste)
  }

  for (const [anahtar, secimler] of kayitBasina) {
    const satir = guncel.get(anahtar)
    if (satir === undefined) {
      atlanan += secimler.length
      continue
    }

    const veri: Record<string, number> = {}
    const yazilanlar: typeof partiSatirlari = []

    for (const secim of secimler) {
      const suphe = satir.supheler.find((s) => s.alan === secim.alan)
      if (suphe === undefined) {
        atlanan += 1
        continue
      }
      veri[secim.alan] = suphe.onerilen
      yazilanlar.push({
        koleksiyon: satir.koleksiyon,
        kayitId: satir.kayitId,
        kayitAdi: satir.kayitAdi,
        alan: secim.alan,
        eskiDeger: suphe.deger,
        yeniDeger: suphe.onerilen,
      })
    }

    if (yazilanlar.length === 0) continue

    try {
      await payload.update({
        collection: satir.koleksiyon,
        id: satir.kayitId,
        data: veri,
        user,
        // ⚠️ Kancalar ve erişim kuralları devrede: kira çarpanı ve brüt
        // getiri yeni fiyatla yeniden hesaplansın.
        overrideAccess: false,
      })
      partiSatirlari.push(...yazilanlar)
    } catch (hata) {
      hatalar.push({
        kayitAdi: satir.kayitAdi,
        mesaj: hata instanceof Error ? hata.message : 'Kaydedilemedi.',
      })
    }
  }

  if (partiSatirlari.length === 0) {
    return { basarili: false, genelHata: 'Hiçbir alan düzeltilmedi.', atlanan, hatalar }
  }

  const parti = await payload.create({
    collection: 'olcek-duzeltmeleri',
    data: {
      ozet: `${partiSatirlari.length} alan ×1000 — ${new Date().toLocaleString('tr-TR')}`,
      geriAlindi: false,
      satirlar: partiSatirlari,
    },
    user,
    overrideAccess: false,
  })

  return {
    basarili: true,
    partiId: String(parti.id),
    degisen: partiSatirlari.length,
    atlanan,
    hatalar,
  }
}

/**
 * Bir partiyi geri alır — ESKİ DEĞERİ YAZARAK, bölerek değil.
 *
 * ⚠️ Aradan geçen sürede elle düzeltilmiş bir kaydı bölmek onu da
 * bozardı. Geri alma "eski değer neydi" sorusuna bakıyor.
 */
export async function partiyiGeriAl(
  partiId: string,
  payload: Payload,
  user: TypedUser,
): Promise<UygulamaSonucu> {
  const parti = await payload.findByID({
    collection: 'olcek-duzeltmeleri',
    id: partiId,
    depth: 0,
    user,
    overrideAccess: false,
  })

  if ((parti as { geriAlindi?: boolean }).geriAlindi === true) {
    return { basarili: false, genelHata: 'Bu parti zaten geri alınmış.' }
  }

  const satirlar = ((parti as { satirlar?: unknown }).satirlar ?? []) as {
    koleksiyon: TarananKoleksiyon
    kayitId: number
    kayitAdi?: string
    alan: string
    eskiDeger: number
  }[]

  const hatalar: { kayitAdi: string; mesaj: string }[] = []
  let degisen = 0

  const kayitBasina = new Map<string, typeof satirlar>()
  for (const satir of satirlar) {
    const anahtar = `${satir.koleksiyon}:${satir.kayitId}`
    const liste = kayitBasina.get(anahtar) ?? []
    liste.push(satir)
    kayitBasina.set(anahtar, liste)
  }

  for (const [, grup] of kayitBasina) {
    const ilk = grup[0]
    if (ilk === undefined) continue
    const veri: Record<string, number> = {}
    for (const satir of grup) veri[satir.alan] = satir.eskiDeger

    try {
      await payload.update({
        collection: ilk.koleksiyon,
        id: ilk.kayitId,
        data: veri,
        user,
        overrideAccess: false,
      })
      degisen += grup.length
    } catch (hata) {
      hatalar.push({
        kayitAdi: ilk.kayitAdi ?? `#${ilk.kayitId}`,
        mesaj: hata instanceof Error ? hata.message : 'Kaydedilemedi.',
      })
    }
  }

  await payload.update({
    collection: 'olcek-duzeltmeleri',
    id: partiId,
    data: { geriAlindi: true, geriAlinmaTarihi: new Date().toISOString() },
    user,
    overrideAccess: false,
  })

  return { basarili: true, partiId, degisen, hatalar }
}
