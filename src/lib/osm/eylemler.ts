'use server'

import { headers } from 'next/headers'

import config from '@payload-config'
import { getPayload, type Payload, type TypedUser } from 'payload'

import { yoneticiMi } from '@/lib/erisim'

import {
  onizlemeHazirla,
  poiHazirligiBaslat,
  poiKutusunuGetir,
  satirlariYaz,
  type IceAktarmaDurumu,
  type OnizlemeSatiri,
  type PoiGrupDurumu,
  type PoiHazirlikDurumu,
  type YazmaSonucu,
} from './iceAktarma'

/**
 * OSM POI içe aktarma — sunucu eylemleri.
 *
 * ⚠️ YALNIZCA YÖNETİCİ. İçe aktarma yüzlerce kayıt oluşturuyor ve dış bir
 * servise sorgu atıyor; danışmanın günlük işi değil. Oturum kapısına ek
 * olarak rol kapısı var.
 */

const OTURUM_YOK = 'Oturumunuz sona ermiş görünüyor. Sayfayı yenileyip tekrar giriş yapın.'
const YETKI_YOK = 'Bu işlem yalnızca yöneticiye açık.'

async function yoneticiOturumu(): Promise<{ payload: Payload; user: TypedUser } | null> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user || !yoneticiMi(user)) return null
  return { payload, user }
}

/**
 * 1. adım — kutuları hesaplar. AĞ İSTEĞİ YOK.
 */
export async function poiHazirliginiBaslat(marjMetre?: number): Promise<PoiHazirlikDurumu> {
  const oturum = await yoneticiOturumu()
  if (!oturum) return { durum: 'kutu_gecersiz', mesaj: `${OTURUM_YOK} ${YETKI_YOK}` }

  try {
    return await poiHazirligiBaslat(oturum.payload, oturum.user, marjMetre)
  } catch (hata) {
    return {
      durum: 'kutu_gecersiz',
      mesaj: hata instanceof Error ? hata.message : 'Hazırlık başlatılamadı.',
    }
  }
}

/**
 * 2. adım — tek kutunun POI'leri.
 *
 * ⚠️ Sonuç istemciye dönmüyor; sunucudaki hazırlıkta birikiyor. İstemci
 * yalnızca kaç kayıt geldiğini görüyor.
 */
export async function poiKutusunuIndir(
  kutuSirasi: number,
  denemeSirasi = 1,
): Promise<PoiGrupDurumu> {
  const oturum = await yoneticiOturumu()
  if (!oturum) return { durum: 'hata', mesaj: `${OTURUM_YOK} ${YETKI_YOK}` }

  try {
    return await poiKutusunuGetir(oturum.user, kutuSirasi, denemeSirasi)
  } catch (hata) {
    return {
      durum: 'hata',
      mesaj: hata instanceof Error ? hata.message : 'Kutu indirilemedi.',
    }
  }
}

export async function osmOnizlemesiHazirla(): Promise<IceAktarmaDurumu> {
  const oturum = await yoneticiOturumu()
  if (!oturum) return { durum: 'hata', mesaj: `${OTURUM_YOK} ${YETKI_YOK}` }

  try {
    return await onizlemeHazirla(oturum.payload, oturum.user)
  } catch (hata) {
    return {
      durum: 'hata',
      mesaj: hata instanceof Error ? hata.message : 'İçe aktarma hazırlanamadı.',
    }
  }
}

export interface YazmaCevabi {
  basarili: boolean
  mesaj?: string
  sonuc?: YazmaSonucu
}

/**
 * ⚠️ Satırlar istemciden geliyor ama **ad, tip ve konum dışında hiçbir şey
 * istemcinin sözüne bırakılmıyor**: `kaynak` ve `osmKimlik` sunucuda
 * sabitleniyor, `elleDuzenlendi` hiç yazılmıyor. En kötü ihtimalle
 * kullanıcı kendi gördüğü listeden farklı bir POI yazdırabilir — bu bir
 * yetki aşımı değil, zaten yönetici olan birinin elle de yapabileceği şey.
 */
export async function osmSatirlariniYaz(satirlar: OnizlemeSatiri[]): Promise<YazmaCevabi> {
  const oturum = await yoneticiOturumu()
  if (!oturum) return { basarili: false, mesaj: `${OTURUM_YOK} ${YETKI_YOK}` }

  if (!Array.isArray(satirlar) || satirlar.length === 0) {
    return { basarili: false, mesaj: 'Yazılacak satır yok.' }
  }

  try {
    const sonuc = await satirlariYaz(oturum.payload, oturum.user, satirlar)
    return { basarili: true, sonuc }
  } catch (hata) {
    return {
      basarili: false,
      mesaj: hata instanceof Error ? hata.message : 'İçe aktarma tamamlanamadı.',
    }
  }
}
