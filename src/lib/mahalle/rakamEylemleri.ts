'use server'

import { headers } from 'next/headers'

import config from '@payload-config'
import { getPayload, type Payload, type TypedUser } from 'payload'

import { yoneticiMi } from '@/lib/erisim'

import {
  cozumle,
  hataMesaji,
  satirlariYaz,
  type IceAktarmaGirdisi,
  type IceAktarmaSonucu,
  type OnizlemeGirdisi,
  type OnizlemeSonucu,
} from './rakamIceAktarmaCekirdegi'

/**
 * Mahalle rakamları CSV içe aktarma — sunucu eylemleri.
 *
 * ⚠️ YALNIZCA YÖNETİCİ. Bu rakamlar yatırım skorunu, mahalle
 * karşılaştırmasını ve sitedeki her "ortalama m²" ifadesini besliyor.
 * Yanlış girilmiş bir rakam ziyaretçiye yanlış yatırım kararı aldırır;
 * rayiç ve vergi parametrelerinde olduğu gibi bu da yöneticide kalıyor.
 */

const YETKI_YOK = 'Oturumunuz sona ermiş ya da yetkiniz yok. Bu ekran yalnızca yöneticiye açık.'

async function yoneticiOturumu(): Promise<{ payload: Payload; user: TypedUser } | null> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user || !yoneticiMi(user)) return null
  return { payload, user }
}

export async function mahalleRakamlariniOnizle(girdi: OnizlemeGirdisi): Promise<OnizlemeSonucu> {
  const oturum = await yoneticiOturumu()
  if (!oturum) return { basarili: false, genelHata: YETKI_YOK }

  try {
    return await cozumle(girdi, oturum.payload, oturum.user)
  } catch (hata) {
    return { basarili: false, genelHata: hataMesaji(hata) }
  }
}

export async function mahalleRakamlariniAktar(girdi: IceAktarmaGirdisi): Promise<IceAktarmaSonucu> {
  const oturum = await yoneticiOturumu()
  if (!oturum) return { basarili: false, genelHata: YETKI_YOK }

  try {
    return await satirlariYaz(girdi, oturum.payload, oturum.user)
  } catch (hata) {
    return { basarili: false, genelHata: hataMesaji(hata) }
  }
}
