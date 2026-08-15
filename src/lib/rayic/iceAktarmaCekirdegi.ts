import type { Payload, TypedUser } from 'payload'

import { csvAyristir, type Ayirici } from '@/lib/csv/ayristir'

import {
  eksikZorunluAlanlar,
  eslenmemisSutunlar,
  satirlariCozumle,
  sutunlariEslestir,
  type CozulmusSatir,
  type SutunEslemesi,
} from './iceAktarma'
import type { RayicKaynagi } from './tipler'

/**
 * Rayiç bedel CSV içe aktarma — çekirdek.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ İSTEMCİNİN ÇÖZÜMLEDİĞİ VERİYE GÜVENİLMEZ
 *
 * Önizleme ekranı satırları tarayıcıda gösterir, ama içe aktarma o
 * gösterilen değerleri kabul etmez: sunucu CSV metnini, eşlemeyi ve
 * ayarları yeniden çözümler ve yalnızca kendi ürettiği veriyi yazar.
 * Kullanıcının seçebildiği tek şey hangi satırların dışarıda kalacağı.
 *
 * Gözlem içe aktarmasındaki ilkenin aynısı; gerekçesi orada uzun uzun
 * yazılı (`gozlem/iceAktarmaCekirdegi.ts`).
 * ─────────────────────────────────────────────────────────────────────────
 */

export const AZAMI_CSV_KARAKTER = 2_000_000
export const AZAMI_SATIR = 5_000

export interface RayicAyarlari {
  varsayilanYil: number
  varsayilanKaynak: RayicKaynagi
  /** Tablonun alındığı tarih (ISO 'YYYY-MM-DD'); boş bırakılabilir. */
  guncellemeTarihi?: string | null
}

export interface OnizlemeGirdisi {
  csvMetni: string
  ayirici?: Ayirici
  eslesme?: SutunEslemesi
  ayarlar: RayicAyarlari
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
  kullanilmayanSutunlar?: { sira: number; baslik: string }[]
  eksikAlanlar?: string[]
  atlananBosSatir?: number
}

export interface IceAktarmaGirdisi extends OnizlemeGirdisi {
  atlanacakSatirlar: number[]
}

export interface IceAktarmaSonucu {
  basarili: boolean
  genelHata?: string
  olusturulan?: number
  guncellenen?: number
  atlanan?: number
  hatali?: number
  yazmaHatalari?: { satirNo: number; mesaj: string }[]
}

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
    .map((m) => ({ id: m.id as number, ad: String(m.ad ?? ''), slug: m.slug as string }))
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
    varsayilanYil: girdi.ayarlar.varsayilanYil,
    varsayilanKaynak: girdi.ayarlar.varsayilanKaynak,
    guncellemeTarihi: girdi.ayarlar.guncellemeTarihi ?? null,
  })

  return {
    basarili: true,
    basliklar: cikti.basliklar,
    ayirici: cikti.ayirici,
    eslesme,
    satirlar: cozum.satirlar,
    hazirSayisi: cozum.hazirSayisi,
    uyariliSayisi: cozum.uyariliSayisi,
    hataliSayisi: cozum.hataliSayisi,
    kullanilmayanSutunlar: eslenmemisSutunlar(cikti.basliklar, eslesme),
    eksikAlanlar: eksikZorunluAlanlar(eslesme),
    atlananBosSatir: cikti.atlananBosSatir,
  }
}

/**
 * Çözümlenmiş satırları yazar.
 *
 * ⚠️ AYNI MAHALLE + SOKAK + YIL VARSA ÜZERİNE YAZILIR, KOPYA AÇILMAZ.
 *
 * Belediye tabloları düzeltmeyle yeniden yayınlanıyor ve aynı dosya iki kez
 * aktarılabiliyor. Her seferinde yeni kayıt açsaydık, aynı mahalle için üç
 * farklı rayiç bedel görünür ve hangisinin geçerli olduğu belirsizleşirdi —
 * rayiç/piyasa oranı da hangisini kullanacağını bilemezdi.
 *
 * ⚠️ Kayıtlar Local API ile, `overrideAccess: false` ve gerçek kullanıcıyla
 * yazılır: koleksiyonun erişim kuralları ve `beforeChange` kancası aynen
 * çalışır. Toplu yazma, kancaları atlamak için bir bahane değildir.
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
  let guncellenen = 0
  let atlanan = 0

  for (const satir of cozum.satirlar) {
    if (!satir.veri) continue
    if (atlanacak.has(satir.satirNo)) {
      atlanan += 1
      continue
    }

    const veri = satir.veri

    try {
      const mevcut = await payload.find({
        collection: 'rayic-degerler',
        where: {
          and: [
            { mahalle: { equals: veri.mahalleId } },
            { yil: { equals: veri.yil } },
            veri.sokak === null ? { sokak: { exists: false } } : { sokak: { equals: veri.sokak } },
          ],
        },
        limit: 1,
        depth: 0,
        user,
        overrideAccess: false,
      })

      const alanlar = {
        mahalle: veri.mahalleId,
        sokak: veri.sokak ?? undefined,
        yil: veri.yil,
        metrekareRayicBedel: veri.metrekareRayicBedel ?? undefined,
        arsaRayicBedel: veri.arsaRayicBedel ?? undefined,
        kaynak: veri.kaynak,
        notlar: veri.notlar ?? undefined,
        guncellemeTarihi: veri.guncellemeTarihi ?? undefined,
      }

      const eski = mevcut.docs[0]
      if (eski) {
        await payload.update({
          collection: 'rayic-degerler',
          id: eski.id,
          data: alanlar,
          user,
          overrideAccess: false,
        })
        guncellenen += 1
      } else {
        await payload.create({
          collection: 'rayic-degerler',
          data: alanlar,
          user,
          overrideAccess: false,
        })
        olusturulan += 1
      }
    } catch (hata) {
      yazmaHatalari.push({ satirNo: satir.satirNo, mesaj: hataMesaji(hata) })
    }
  }

  return {
    basarili: true,
    olusturulan,
    guncellenen,
    atlanan,
    hatali: cozum.hataliSayisi ?? 0,
    yazmaHatalari,
  }
}

export function hataMesaji(hata: unknown): string {
  if (hata instanceof Error && hata.message.trim() !== '') return hata.message
  return 'İşlem tamamlanamadı. Bilgileri kontrol edip tekrar deneyin.'
}
