'use server'

import { headers } from 'next/headers'

import config from '@payload-config'
import { getPayload, type Payload, type TypedUser } from 'payload'

import { yoneticiMi } from '@/lib/erisim'

import { googlePlacesEtkinMi } from './ayarlar'
import { yerAra, type GoogleAdayi } from './istemci'

/**
 * Google Places — sunucu eylemleri.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ İKİ AYRI KAPI, İKİ AYRI KİTLE
 *
 * · Eşleştirme (arama, kimlik yazma) → YALNIZCA YÖNETİCİ. Para harcayan ve
 *   veri yazan iş.
 * · Detay gösterimi → ziyaretçiye açık, ama yalnızca sistemde KAYITLI bir
 *   yer kimliği için. Ziyaretçi hangi kimliğin sorulacağını seçemez;
 *   seçebilseydi sitemiz Google Places'in ücretsiz vekil sunucusu olurdu
 *   ve faturayı biz öderdik.
 * ─────────────────────────────────────────────────────────────────────────
 */

const YETKI_YOK = 'Oturumunuz sona ermiş ya da yetkiniz yok. Bu işlem yalnızca yöneticiye açık.'

async function yoneticiOturumu(): Promise<{ payload: Payload; user: TypedUser } | null> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user || !yoneticiMi(user)) return null
  return { payload, user }
}

export interface AramaCevabi {
  basarili: boolean
  mesaj?: string
  adaylar?: GoogleAdayi[]
}

/** Bir POI için Google'da aday arar — yazmaz. */
export async function googleAdaylariAra(poiId: number): Promise<AramaCevabi> {
  const oturum = await yoneticiOturumu()
  if (!oturum) return { basarili: false, mesaj: YETKI_YOK }

  if (!(await googlePlacesEtkinMi())) {
    return { basarili: false, mesaj: 'Google Places katmanı kapalı.' }
  }

  try {
    const poi = await oturum.payload.findByID({
      collection: 'ilgi-noktalari',
      id: poiId,
      depth: 0,
      user: oturum.user,
      overrideAccess: false,
    })

    const konum = Array.isArray(poi.konum) && poi.konum.length >= 2 ? poi.konum : null
    const boylam = typeof konum?.[0] === 'number' ? konum[0] : null
    const enlem = typeof konum?.[1] === 'number' ? konum[1] : null

    const sonuc = await yerAra(
      oturum.payload,
      String(poi.ad ?? ''),
      boylam !== null && enlem !== null ? { boylam, enlem } : undefined,
    )

    if (sonuc.durum === 'kapali') {
      return { basarili: false, mesaj: 'Google Places anahtarı tanımlı değil.' }
    }
    if (sonuc.durum === 'hata') return { basarili: false, mesaj: sonuc.mesaj }

    return { basarili: true, adaylar: sonuc.veri }
  } catch (hata) {
    return {
      basarili: false,
      mesaj: hata instanceof Error ? hata.message : 'Arama yapılamadı.',
    }
  }
}

export interface EslestirmeCevabi {
  basarili: boolean
  mesaj?: string
}

/**
 * Bir POI'ye Google yer kimliğini bağlar.
 *
 * ⚠️ Yazılan TEK ŞEY yer kimliği. Google'ın döndürdüğü ad, adres ve konum
 * bilinçli olarak KAYDEDİLMİYOR: lisans buna izin vermiyor ve kaydedilen
 * bir işletme adı birkaç ay içinde eskir. Noktanın adı ve konumu bizim
 * (ya da OpenStreetMap'in) verisi olarak kalır.
 */
export async function googleKimligiBagla(
  poiId: number,
  placeId: string,
): Promise<EslestirmeCevabi> {
  const oturum = await yoneticiOturumu()
  if (!oturum) return { basarili: false, mesaj: YETKI_YOK }

  const temiz = placeId.trim()
  if (temiz !== '' && !/^[A-Za-z0-9_-]+$/.test(temiz)) {
    return { basarili: false, mesaj: 'Geçersiz Google yer kimliği.' }
  }

  try {
    await oturum.payload.update({
      collection: 'ilgi-noktalari',
      id: poiId,
      data: { googlePlaceId: temiz === '' ? null : temiz },
      user: oturum.user,
      overrideAccess: false,
      /**
       * ⚠️ Bu bir OSM içe aktarması DEĞİL ama `osmElleDuzenlemeIzi`
       * kancasının izini basmasını da istemiyoruz: yer kimliği bağlamak
       * noktanın adını ya da konumunu düzeltmek değildir. İz basılsaydı
       * OSM içe aktarması bu noktayı bir daha hiç güncelleyemezdi.
       */
      context: { osmIceAktarma: true },
    })

    return { basarili: true }
  } catch (hata) {
    return {
      basarili: false,
      mesaj: hata instanceof Error ? hata.message : 'Kimlik bağlanamadı.',
    }
  }
}

/**
 * ⚠️ Ziyaretçiye açık detay çağrısı BU DOSYADA DEĞİL —
 * `lib/google/detayEylemi.ts` içinde.
 *
 * Ayrı durması bilinçli: buradaki her eylem yönetici kapısının arkasında,
 * o değil. İkisi aynı dosyada olsaydı güvenlik denetimi (ve
 * `formKorumasi.test.ts`) tek bir sınıf görürdü — oysa iki ayrı saldırı
 * yüzeyi var ve ziyaretçiye açık olanın ayrıca hız sınırı gerekiyor.
 */
