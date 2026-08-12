import type { Payload, TypedUser } from 'payload'

import { merkezlerdenKutu, kutuMakulMu, overpassCevabiniCoz, overpassSorgusu } from './sorgu'
import type { CozumlemeOzeti, Kutu, OsmAdayi } from './sorgu'

/**
 * OpenStreetMap POI içe aktarma — çekirdek.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ LİSANS — ODbL, ATIF ZORUNLU
 *
 * OpenStreetMap verisi Open Database License altında. Türetilmiş veriyi
 * yayınlamak serbest ama **atıf zorunlu**: POI verisinin göründüğü her
 * yerde "© OpenStreetMap katkıcıları" ibaresi var ve lisans açıklaması
 * `/veri-kaynaklari` sayfasında yayınlanıyor.
 *
 * ⚠️ Bu, CLAUDE.md kural 6'daki scraping yasağıyla çelişmez. Yasak, ilan
 * platformlarının kullanım koşullarını ihlal eden otomatik veri çekmeye
 * ait. OSM açık veridir ve yeniden kullanım için lisanslanmıştır; üstelik
 * Overpass API bu iş için yapılmış resmî arayüzdür.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ELLE DÜZELTİLEN KAYIT EZİLMEZ
 *
 * OSM'de eksik ve yanlış kayıt olur. Bir noktanın adını ya da konumunu
 * düzelttiğinizde, bir sonraki içe aktarma onu OSM'deki hâline geri
 * çevirseydi düzeltme emeği her seferinde çöpe giderdi.
 *
 * `elleDuzenlendi` işaretli kayıtlar ATLANIR ve raporda "korundu" olarak
 * sayılır. İşaret, kaydı panelden düzenleyen ilk kişide kendiliğinden
 * konur (`osmElleDuzenlemeIzi` kancası).
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Overpass'ın herkese açık uç noktası. */
const OVERPASS_ADRESI = process.env.OVERPASS_ADRESI ?? 'https://overpass-api.de/api/interpreter'

/** Tek seferde alınacak azami POI — kaza koruması. */
export const AZAMI_ADAY = 3_000

/** Ağ zaman aşımı. Overpass yoğunken yavaş olabilir. */
const ZAMAN_ASIMI_MS = 90_000

export type IceAktarmaDurumu =
  | { durum: 'merkez_yok' }
  | { durum: 'kutu_gecersiz'; mesaj: string }
  | { durum: 'hata'; mesaj: string }
  | { durum: 'hazir'; onizleme: Onizleme }

export interface OnizlemeSatiri {
  aday: OsmAdayi
  /** `yeni` eklenecek · `guncellenecek` üzerine yazılacak · `korunacak` elle düzeltilmiş */
  islem: 'yeni' | 'guncellenecek' | 'korunacak'
  /** Mevcut kaydın kimliği (varsa). */
  mevcutId?: number
}

export interface Onizleme {
  kutu: Kutu
  satirlar: OnizlemeSatiri[]
  yeniSayisi: number
  guncellenecekSayisi: number
  korunacakSayisi: number
  ozet: CozumlemeOzeti
  /** Sorgu, panelde gösterilir — ne sorduğumuz görünür olsun. */
  sorgu: string
}

/** Mahalle merkezlerinden kutu kurar. */
export async function kutuyuHesapla(
  payload: Payload,
  user: TypedUser,
  marjMetre?: number,
): Promise<Kutu | null> {
  const mahalleler = await payload.find({
    collection: 'mahalleler',
    limit: 500,
    depth: 0,
    user,
    overrideAccess: false,
  })

  const noktalar = mahalleler.docs
    .map((m) => m.merkez)
    .filter((m): m is [number, number] => Array.isArray(m) && m.length >= 2)
    .map(([boylam, enlem]) => ({ boylam, enlem }))

  return merkezlerdenKutu(noktalar, marjMetre)
}

/** Overpass'a sorar ve cevabı çözer. */
async function overpasstanGetir(sorgu: string): Promise<CozumlemeOzeti> {
  const kontrol = new AbortController()
  const zamanlayici = setTimeout(() => kontrol.abort(), ZAMAN_ASIMI_MS)

  try {
    const cevap = await fetch(OVERPASS_ADRESI, {
      method: 'POST',
      // Overpass gövdede `data=` bekliyor.
      body: new URLSearchParams({ data: sorgu }),
      headers: {
        // ⚠️ Overpass kullanım politikası kendini tanıtmayı istiyor.
        'User-Agent': 'aslihangyd.com POI ice aktarma (iletisim: site sahibi)',
      },
      signal: kontrol.signal,
    })

    if (!cevap.ok) {
      throw new Error(`Overpass ${cevap.status} döndü.`)
    }

    return overpassCevabiniCoz(await cevap.json())
  } finally {
    clearTimeout(zamanlayici)
  }
}

/**
 * Önizleme hazırlar — hiçbir şey yazmaz.
 *
 * CSV içe aktarmadaki ilkenin aynısı: önce gör, sonra yaz.
 */
export async function onizlemeHazirla(
  payload: Payload,
  user: TypedUser,
  marjMetre?: number,
): Promise<IceAktarmaDurumu> {
  const kutu = await kutuyuHesapla(payload, user, marjMetre)

  if (!kutu) return { durum: 'merkez_yok' }

  if (!kutuMakulMu(kutu)) {
    return {
      durum: 'kutu_gecersiz',
      mesaj:
        'Mahalle merkezlerinden hesaplanan alan olağandışı büyük. Bir mahallenin merkez ' +
        'noktası yanlış girilmiş olabilir (örn. Çorlu yerine başka bir il). ' +
        'Mahalleler → Konum sekmesinden merkezleri kontrol edin.',
    }
  }

  const sorgu = overpassSorgusu(kutu)

  let ozet: CozumlemeOzeti
  try {
    ozet = await overpasstanGetir(sorgu)
  } catch (hata) {
    return {
      durum: 'hata',
      mesaj:
        hata instanceof Error && hata.name === 'AbortError'
          ? 'OpenStreetMap sunucusu zamanında yanıt vermedi. Birkaç dakika sonra tekrar deneyin.'
          : `OpenStreetMap sunucusuna ulaşılamadı: ${hata instanceof Error ? hata.message : 'bilinmeyen hata'}`,
    }
  }

  if (ozet.adaylar.length > AZAMI_ADAY) {
    return {
      durum: 'kutu_gecersiz',
      mesaj:
        `Sorgu ${ozet.adaylar.length} nokta döndürdü; tek seferde en fazla ${AZAMI_ADAY} ` +
        'aktarılıyor. Marjı küçültüp tekrar deneyin.',
    }
  }

  const satirlar = await satirlariEslestir(payload, user, ozet.adaylar)

  return {
    durum: 'hazir',
    onizleme: {
      kutu,
      sorgu,
      ozet,
      satirlar,
      yeniSayisi: satirlar.filter((s) => s.islem === 'yeni').length,
      guncellenecekSayisi: satirlar.filter((s) => s.islem === 'guncellenecek').length,
      korunacakSayisi: satirlar.filter((s) => s.islem === 'korunacak').length,
    },
  }
}

/** Her adayı mevcut kayıtlarla eşleştirir. */
async function satirlariEslestir(
  payload: Payload,
  user: TypedUser,
  adaylar: readonly OsmAdayi[],
): Promise<OnizlemeSatiri[]> {
  if (adaylar.length === 0) return []

  const mevcutlar = await payload.find({
    collection: 'ilgi-noktalari',
    where: { osmKimlik: { in: adaylar.map((a) => a.osmKimlik) } },
    limit: AZAMI_ADAY,
    depth: 0,
    user,
    overrideAccess: false,
  })

  const kimlikHaritasi = new Map(
    mevcutlar.docs
      .filter((k) => typeof k.osmKimlik === 'string')
      .map((k) => [k.osmKimlik as string, k]),
  )

  return adaylar.map((aday) => {
    const mevcut = kimlikHaritasi.get(aday.osmKimlik)

    if (!mevcut) return { aday, islem: 'yeni' as const }

    // ⚠️ Elle düzeltilmiş kayıt ezilmez.
    if (mevcut.elleDuzenlendi === true) {
      return { aday, islem: 'korunacak' as const, mevcutId: mevcut.id as number }
    }

    return { aday, islem: 'guncellenecek' as const, mevcutId: mevcut.id as number }
  })
}

export interface YazmaSonucu {
  eklenen: number
  guncellenen: number
  korunan: number
  hatalar: { ad: string; mesaj: string }[]
}

/**
 * Önizlemedeki satırları yazar.
 *
 * ⚠️ `context.osmIceAktarma = true`: bu bayrak olmadan
 * `osmElleDuzenlemeIzi` kancası içe aktarıcının kendi yazmasını "insan
 * düzenlemesi" sanır ve her kaydı elle düzeltilmiş işaretlerdi — ikinci
 * içe aktarmada hiçbir şey güncellenmezdi.
 */
export async function satirlariYaz(
  payload: Payload,
  user: TypedUser,
  satirlar: readonly OnizlemeSatiri[],
): Promise<YazmaSonucu> {
  const sonuc: YazmaSonucu = { eklenen: 0, guncellenen: 0, korunan: 0, hatalar: [] }

  for (const satir of satirlar) {
    if (satir.islem === 'korunacak') {
      sonuc.korunan += 1
      continue
    }

    const veri = {
      ad: satir.aday.ad,
      tip: satir.aday.tip,
      konum: [satir.aday.boylam, satir.aday.enlem] as [number, number],
      onemli: satir.aday.onemli,
      kaynak: 'osm' as const,
      osmKimlik: satir.aday.osmKimlik,
    }

    try {
      if (satir.islem === 'yeni') {
        await payload.create({
          collection: 'ilgi-noktalari',
          data: veri,
          user,
          overrideAccess: false,
          context: { osmIceAktarma: true },
        })
        sonuc.eklenen += 1
      } else if (satir.mevcutId !== undefined) {
        await payload.update({
          collection: 'ilgi-noktalari',
          id: satir.mevcutId,
          data: veri,
          user,
          overrideAccess: false,
          context: { osmIceAktarma: true },
        })
        sonuc.guncellenen += 1
      }
    } catch (hata) {
      sonuc.hatalar.push({
        ad: satir.aday.ad,
        mesaj: hata instanceof Error ? hata.message : 'bilinmeyen hata',
      })
    }
  }

  return sonuc
}
