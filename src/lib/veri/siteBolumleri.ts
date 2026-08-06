import 'server-only'

import { notFound } from 'next/navigation'
import { cache } from 'react'

import {
  acikBolumler,
  BOLUMLER,
  varsayilanDurumlar,
  type BolumAnahtari,
  type BolumTanimi,
} from '@/lib/siteBolumleri'

import { payloadGetir, ZIYARETCI } from './istemci'

/**
 * Site bölümü durumlarını okur.
 *
 * `cache()` ile istek başına tek sorgu: aynı render'da hem altbilgi hem
 * ana sayfa hem de rota kapısı bu bilgiyi soruyor.
 *
 * ⚠️ Hata durumunda VARSAYILANA düşülür, "hepsi kapalı"ya değil.
 * Veritabanı bir an erişilemez olduğunda sitenin yarısının 404 dönmesi,
 * geçici bir sorunu kalıcı bir görünürlük kaybına çevirirdi.
 */
export const bolumDurumlariniGetir = cache(async (): Promise<Record<BolumAnahtari, boolean>> => {
  const varsayilan = varsayilanDurumlar()

  try {
    const payload = await payloadGetir()
    const ayarlar = (await payload.findGlobal({
      slug: 'site-bolumleri',
      ...ZIYARETCI,
    })) as unknown as Record<string, unknown>

    const durumlar = { ...varsayilan }
    for (const bolum of BOLUMLER) {
      const deger = ayarlar[bolum.anahtar]
      // Alan hiç kaydedilmemişse (global ilk kez okunuyorsa) varsayılan kalır.
      if (typeof deger === 'boolean') durumlar[bolum.anahtar] = deger
    }
    return durumlar
  } catch {
    return varsayilan
  }
})

export async function bolumAcikMi(anahtar: BolumAnahtari): Promise<boolean> {
  return (await bolumDurumlariniGetir())[anahtar]
}

/**
 * Rota kapısı — kapalı bölümün sayfası 404 döner.
 *
 * ⚠️ Sayfanın EN BAŞINDA çağrılır. Aşağıda çağrılırsa veri sorguları
 * boşuna çalışır ve kapalı bölümün verisi RSC yüküne girebilir.
 */
export async function bolumKapisi(anahtar: BolumAnahtari): Promise<void> {
  if (!(await bolumAcikMi(anahtar))) notFound()
}

/** Açık bölümlerin tanımları — altbilgi ve ana sayfa bağlantıları için. */
export async function acikBolumTanimlari(): Promise<BolumTanimi[]> {
  return acikBolumler(await bolumDurumlariniGetir())
}
