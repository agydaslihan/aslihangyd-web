'use server'

import { headers } from 'next/headers'

import config from '@payload-config'
import { getPayload, type Payload, type TypedUser } from 'payload'

import { yoneticiMi } from '@/lib/erisim'

import {
  olcegiDuzelt,
  olcegiTara,
  partiyiGeriAl,
  type SecilenAlan,
  type TaramaSonucu,
  type UygulamaSonucu,
} from './olcekTarama'

/**
 * Ölçek düzeltme — sunucu eylemleri.
 *
 * ⚠️ YALNIZCA YÖNETİCİ. Bu araç tek çağrıda 26 mahallenin rakamlarını
 * bin katına çıkarabiliyor; yanlış elde bir düzeltme aracı, bir bozma
 * aracıdır.
 */

const YETKI_YOK = 'Oturumunuz sona ermiş ya da yetkiniz yok. Bu ekran yalnızca yöneticiye açık.'

async function yoneticiOturumu(): Promise<{ payload: Payload; user: TypedUser } | null> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user || !yoneticiMi(user)) return null
  return { payload, user }
}

export async function olcekTaramasi(): Promise<TaramaSonucu | { hata: string }> {
  const oturum = await yoneticiOturumu()
  if (!oturum) return { hata: YETKI_YOK }
  try {
    return await olcegiTara(oturum.payload, oturum.user)
  } catch (hata) {
    return { hata: hata instanceof Error ? hata.message : 'Tarama başarısız.' }
  }
}

export async function olcekDuzeltmesiUygula(secilenler: SecilenAlan[]): Promise<UygulamaSonucu> {
  const oturum = await yoneticiOturumu()
  if (!oturum) return { basarili: false, genelHata: YETKI_YOK }
  try {
    return await olcegiDuzelt(secilenler, oturum.payload, oturum.user)
  } catch (hata) {
    return {
      basarili: false,
      genelHata: hata instanceof Error ? hata.message : 'Düzeltme başarısız.',
    }
  }
}

export async function olcekDuzeltmesiniGeriAl(partiId: string): Promise<UygulamaSonucu> {
  const oturum = await yoneticiOturumu()
  if (!oturum) return { basarili: false, genelHata: YETKI_YOK }
  try {
    return await partiyiGeriAl(partiId, oturum.payload, oturum.user)
  } catch (hata) {
    return {
      basarili: false,
      genelHata: hata instanceof Error ? hata.message : 'Geri alma başarısız.',
    }
  }
}
