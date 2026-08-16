import 'server-only'

import type { Payload, TypedUser } from 'payload'

import { eslesmeyiOzetle, mahalleleriEslestir, type EslesmeOzeti } from './mahalleEslesme'

/**
 * Mevcut POI kayıtlarını geriye dönük mahallelere eşleştirir.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN AYRI: SINIRLAR POI'LERDEN SONRA GELDİ.
 *
 * POI'ler mahalle sınırları henüz yokken içe aktarılmıştı; o sırada nokta-
 * poligon testi yapılamıyordu. Sınırlar sonradan geldi ama eski kayıtlar
 * mahallesiz kaldı. Yeniden içe aktarma bunu çözerdi ama Overpass'a
 * gereksiz yük bindirirdi — veri zaten elimizde, eksik olan yalnızca
 * ilişki.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ ELLE DÜZELTİLMİŞ KAYITLAR ATLANIYOR. `elleDuzenlendi` işaretli bir
 * kayıt panelden düzenlenmiş demektir ve mahalle ilişkisi de elle verilmiş
 * olabilir. İçe aktarmadaki korumanın aynısı; burada delinirse koruma
 * "bazen geçerli" olur ki bu korumasızlıktır.
 */

export interface GeriyeDonukSonuc {
  /** İncelenen kayıt sayısı. */
  incelenen: number
  /** Mahallesi değişen kayıt sayısı. */
  guncellenen: number
  /** Elle düzeltildiği için atlanan. */
  korunan: number
  /** Zaten doğru eşleşmiş, dokunulmayan. */
  degismeyen: number
  ozet: EslesmeOzeti
  hatalar: { ad: string; mesaj: string }[]
}

/** Tek turda işlenecek kayıt sayısı — bellek ve sorgu boyutu koruması. */
const YIGIN = 500

export async function poileriMahallelereEslestir(
  payload: Payload,
  user: TypedUser,
): Promise<GeriyeDonukSonuc> {
  const sonuc: GeriyeDonukSonuc = {
    incelenen: 0,
    guncellenen: 0,
    korunan: 0,
    degismeyen: 0,
    ozet: { kesin: 0, yaklasik: 0, eslesmeyen: 0 },
    hatalar: [],
  }

  let sayfa = 1
  for (;;) {
    const kayitlar = await payload.find({
      collection: 'ilgi-noktalari',
      limit: YIGIN,
      page: sayfa,
      depth: 0,
      user,
      overrideAccess: false,
    })

    if (kayitlar.docs.length === 0) break

    const adaylar: {
      sira: number
      boylam: number
      enlem: number
      kayit: (typeof kayitlar.docs)[number]
    }[] = []

    for (const kayit of kayitlar.docs) {
      sonuc.incelenen += 1

      if (kayit.elleDuzenlendi === true) {
        sonuc.korunan += 1
        continue
      }

      const konum = kayit.konum
      if (!Array.isArray(konum) || konum.length < 2) continue

      const boylam = Number(konum[0])
      const enlem = Number(konum[1])
      if (!Number.isFinite(boylam) || !Number.isFinite(enlem)) continue

      adaylar.push({ sira: adaylar.length, boylam, enlem, kayit })
    }

    const eslesmeler = await mahalleleriEslestir(
      payload,
      adaylar.map(({ sira, boylam, enlem }) => ({ sira, boylam, enlem })),
    )

    const yiginOzeti = eslesmeyiOzetle(eslesmeler.values())
    sonuc.ozet.kesin += yiginOzeti.kesin
    sonuc.ozet.yaklasik += yiginOzeti.yaklasik
    sonuc.ozet.eslesmeyen += yiginOzeti.eslesmeyen

    for (const { sira, kayit } of adaylar) {
      const eslesme = eslesmeler.get(sira)
      if (!eslesme) continue

      const mevcutId =
        typeof kayit.mahalle === 'number'
          ? kayit.mahalle
          : ((kayit.mahalle as { id?: number } | null)?.id ?? null)

      // ⚠️ Değişmeyen kayda yazma yapılmıyor: gereksiz güncelleme hem
      // `updatedAt`i kirletir hem kancaları boşuna çalıştırır.
      if (mevcutId === eslesme.mahalleId && kayit.mahalleYaklasik === eslesme.yaklasik) {
        sonuc.degismeyen += 1
        continue
      }

      try {
        await payload.update({
          collection: 'ilgi-noktalari',
          id: kayit.id,
          data: { mahalle: eslesme.mahalleId, mahalleYaklasik: eslesme.yaklasik },
          user,
          overrideAccess: false,
          // ⚠️ Bu bayrak olmadan `osmElleDuzenlemeIzi` kancası bizi insan
          // sanar ve her kaydı "elle düzeltildi" işaretler — bir sonraki
          // içe aktarma hiçbir şeyi güncelleyemezdi.
          context: { osmIceAktarma: true },
        })
        sonuc.guncellenen += 1
      } catch (hata) {
        sonuc.hatalar.push({
          ad: String(kayit.ad ?? kayit.id),
          mesaj: hata instanceof Error ? hata.message : 'bilinmeyen hata',
        })
      }
    }

    if (!kayitlar.hasNextPage) break
    sayfa += 1
  }

  return sonuc
}
