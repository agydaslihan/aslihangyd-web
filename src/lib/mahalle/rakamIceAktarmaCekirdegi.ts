import type { Payload, TypedUser } from 'payload'

import { csvAyristir, type Ayirici } from '@/lib/csv/ayristir'

import {
  eksikZorunluAlanlar,
  eslenmemisSutunlar,
  satirlariCozumle,
  sutunlariEslestir,
  type CozulmusSatir,
  type SutunEslemesi,
} from './rakamIceAktarma'

/**
 * Mahalle rakamları CSV içe aktarma — çekirdek.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ İSTEMCİNİN ÇÖZÜMLEDİĞİ VERİYE GÜVENİLMEZ
 *
 * Önizleme ekranı satırları tarayıcıda gösterir, ama içe aktarma o
 * gösterilen değerleri kabul etmez: sunucu CSV metnini, eşlemeyi ve
 * ayarları yeniden çözümler ve yalnızca kendi ürettiği veriyi yazar.
 * Kullanıcının seçebildiği tek şey hangi satırların dışarıda kalacağı.
 *
 * Rayiç ve gözlem içe aktarmalarındaki ilkenin aynısı.
 * ─────────────────────────────────────────────────────────────────────────
 */

export const AZAMI_CSV_KARAKTER = 2_000_000
export const AZAMI_SATIR = 1_000

export interface RakamAyarlari {
  /** CSV'de tarih sütunu yoksa tüm satırlara yazılacak tarih. */
  varsayilanTarih?: string | null
  /** CSV'de kaynak sütunu yoksa tüm satırlara yazılacak kaynak. */
  varsayilanKaynak?: string | null
}

export interface OnizlemeGirdisi {
  csvMetni: string
  ayirici?: Ayirici
  eslesme?: SutunEslemesi
  ayarlar: RakamAyarlari
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
    varsayilanTarih: girdi.ayarlar.varsayilanTarih ?? null,
    varsayilanKaynak: girdi.ayarlar.varsayilanKaynak ?? null,
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
 * Çözümlenmiş satırları mevcut mahalle kayıtlarına yazar.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ YALNIZCA GÜNCELLER — YENİ MAHALLE AÇMAZ.
 *
 * Eşleşmeyen bir ad, o mahallenin sistemde olmadığını değil, adın farklı
 * yazıldığını gösteriyor olabilir ("Şeyhsinan" / "Seyhsinan" / "Şeyh
 * Sinan"). Kayıt açsaydık ikinci bir mahalle sayfası, ikinci bir slug ve
 * bölünmüş bir portföy elde ederdik. Mahalle açmanın kendi aracı var
 * (`listeIceAktarma`).
 *
 * ⚠️ BOŞ HÜCRE SİLMEZ. CSV'de olmayan bir alan `undefined` geçiliyor;
 * Payload dokunmuyor. Aksi hâlde yalnızca nüfusu güncellemek için hazırlanan
 * bir dosya, m² ve kira rakamlarının hepsini silerdi.
 *
 * ⚠️ Kayıtlar Local API ile, `overrideAccess: false` ve gerçek kullanıcıyla
 * yazılır: erişim kuralları ve kancalar aynen çalışır. Toplu yazma,
 * kancaları atlamak için bir bahane değildir.
 * ─────────────────────────────────────────────────────────────────────────
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
      await payload.update({
        collection: 'mahalleler',
        id: veri.mahalleId,
        data: {
          ortalamaM2Satis: veri.ortalamaM2Satis ?? undefined,
          ortalamaKira: veri.ortalamaKira ?? undefined,
          kiraCarpani: veri.kiraCarpani ?? undefined,
          degisim12Ay: veri.degisim12Ay ?? undefined,
          nufus: veri.nufus ?? undefined,
          gozlemSayisi: veri.gozlemSayisi ?? undefined,
          verilerinTarihi: veri.verilerinTarihi ?? undefined,
          veriKaynagi: veri.veriKaynagi ?? undefined,
        },
        user,
        overrideAccess: false,
      })
      guncellenen += 1
    } catch (hata) {
      yazmaHatalari.push({ satirNo: satir.satirNo, mesaj: hataMesaji(hata) })
    }
  }

  return {
    basarili: true,
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
