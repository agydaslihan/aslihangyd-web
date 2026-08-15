'use server'

import { headers } from 'next/headers'

import config from '@payload-config'
import { getPayload, type Payload, type TypedUser } from 'payload'

import { yoneticiMi } from '@/lib/erisim'

import {
  listeOnizlemesi,
  listeyiYaz,
  type ListeOnizlemesi,
  type ListeYazmaSonucu,
} from './listeIceAktarma'
import {
  sinirOnizlemesiHazirla,
  sinirlariYaz,
  type SinirDurumu,
  type SinirYazmaSonucu,
} from './sinirIceAktarma'

/**
 * Mahalle verisi kurulumu — sunucu eylemleri.
 *
 * ⚠️ YALNIZCA YÖNETİCİ. Bu ekran yirmiden fazla kayıt açıyor, mahalle
 * sınırlarını topluca değiştiriyor ve dış bir servise ağır sorgu atıyor;
 * danışmanın günlük işi değil. Oturum kapısına ek olarak rol kapısı var.
 */

const YETKI_YOK =
  'Oturumunuz sona ermiş ya da yetkiniz yok. Bu ekran yalnızca yöneticiye açık; ' +
  'sayfayı yenileyip tekrar giriş yapın.'

async function yoneticiOturumu(): Promise<{ payload: Payload; user: TypedUser } | null> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user || !yoneticiMi(user)) return null
  return { payload, user }
}

export interface ListeOnizlemeCevabi {
  basarili: boolean
  mesaj?: string
  onizleme?: ListeOnizlemesi
}

export async function mahalleListesiniOnizle(): Promise<ListeOnizlemeCevabi> {
  const oturum = await yoneticiOturumu()
  if (!oturum) return { basarili: false, mesaj: YETKI_YOK }

  try {
    return { basarili: true, onizleme: await listeOnizlemesi(oturum.payload, oturum.user) }
  } catch (hata) {
    return {
      basarili: false,
      mesaj: hata instanceof Error ? hata.message : 'Önizleme hazırlanamadı.',
    }
  }
}

export interface ListeYazmaCevabi {
  basarili: boolean
  mesaj?: string
  sonuc?: ListeYazmaSonucu
}

/**
 * ⚠️ Yazılacak adlar İSTEMCİDEN GELMİYOR: liste sunucudaki sabitten
 * okunuyor ve mevcut kayıtlar sunucuda yeniden sorgulanıyor. İstemcinin
 * tek etkisi düğmeye basmak.
 */
export async function mahalleListesiniYaz(): Promise<ListeYazmaCevabi> {
  const oturum = await yoneticiOturumu()
  if (!oturum) return { basarili: false, mesaj: YETKI_YOK }

  try {
    return { basarili: true, sonuc: await listeyiYaz(oturum.payload, oturum.user) }
  } catch (hata) {
    return {
      basarili: false,
      mesaj: hata instanceof Error ? hata.message : 'Mahalleler açılamadı.',
    }
  }
}

export async function mahalleSinirlariniOnizle(): Promise<SinirDurumu> {
  const oturum = await yoneticiOturumu()
  if (!oturum) return { durum: 'hata', mesaj: YETKI_YOK }

  try {
    return await sinirOnizlemesiHazirla(oturum.payload, oturum.user)
  } catch (hata) {
    return {
      durum: 'hata',
      mesaj: hata instanceof Error ? hata.message : 'Sınır önizlemesi hazırlanamadı.',
    }
  }
}

export interface SinirYazmaCevabi {
  basarili: boolean
  mesaj?: string
  sonuc?: SinirYazmaSonucu
}

export async function mahalleSinirlariniYaz(): Promise<SinirYazmaCevabi> {
  const oturum = await yoneticiOturumu()
  if (!oturum) return { basarili: false, mesaj: YETKI_YOK }

  try {
    return await sinirlariYaz(oturum.payload, oturum.user)
  } catch (hata) {
    return {
      basarili: false,
      mesaj: hata instanceof Error ? hata.message : 'Sınırlar yazılamadı.',
    }
  }
}
