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
} from './iceAktarmaCekirdegi'

/**
 * Rayiç bedel CSV içe aktarma — sunucu eylemleri.
 *
 * ⚠️ YALNIZCA YÖNETİCİ. Rayiç bedel alım maliyeti hesaplayıcısını ve
 * mahalle sayfasındaki rayiç/piyasa oranını besliyor; yanlış girilmiş bir
 * rakam ziyaretçiye yanlış vergi hesabı gösterir. Vergi parametrelerinde
 * olduğu gibi bu da yöneticide kalıyor.
 */

const YETKI_YOK = 'Oturumunuz sona ermiş ya da yetkiniz yok. Bu ekran yalnızca yöneticiye açık.'

async function yoneticiOturumu(): Promise<{ payload: Payload; user: TypedUser } | null> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user || !yoneticiMi(user)) return null
  return { payload, user }
}

export async function rayicOnizle(girdi: OnizlemeGirdisi): Promise<OnizlemeSonucu> {
  const oturum = await yoneticiOturumu()
  if (!oturum) return { basarili: false, genelHata: YETKI_YOK }

  try {
    return await cozumle(girdi, oturum.payload, oturum.user)
  } catch (hata) {
    return { basarili: false, genelHata: hataMesaji(hata) }
  }
}

export async function rayicIceAktar(girdi: IceAktarmaGirdisi): Promise<IceAktarmaSonucu> {
  const oturum = await yoneticiOturumu()
  if (!oturum) return { basarili: false, genelHata: YETKI_YOK }

  try {
    return await satirlariYaz(girdi, oturum.payload, oturum.user)
  } catch (hata) {
    return { basarili: false, genelHata: hataMesaji(hata) }
  }
}
