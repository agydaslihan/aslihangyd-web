'use server'

import { headers } from 'next/headers'

import config from '@payload-config'
import { getPayload, type Payload, type TypedUser } from 'payload'

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
 * Gözlem CSV içe aktarma — sunucu eylemleri.
 *
 * Bu dosya bilinçli olarak ince: tek işi oturumu çözmek ve çekirdeğe
 * devretmek. İş mantığı `iceAktarmaCekirdegi.ts` içinde ve orada test
 * edilebiliyor (`'use server'` dosyaları `headers()` bağımlılığı yüzünden
 * doğrudan test edilemez).
 *
 * ⚠️ Oturum kapısı burada. Kapı olmadan bu iki eylem, giriş yapmamış
 * herkesin çağırabileceği açık uç noktalara dönüşürdü.
 */

async function oturumAc(): Promise<{ payload: Payload; user: TypedUser } | null> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) return null
  return { payload, user }
}

const OTURUM_YOK = 'Oturumunuz sona ermiş görünüyor. Sayfayı yenileyip tekrar giriş yapın.'

/** Önizleme: hiçbir şey yazmaz. */
export async function gozlemOnizlemesiHazirla(girdi: OnizlemeGirdisi): Promise<OnizlemeSonucu> {
  const oturum = await oturumAc()
  if (!oturum) return { basarili: false, genelHata: OTURUM_YOK }

  try {
    return await cozumle(girdi, oturum.payload, oturum.user)
  } catch (hata) {
    return { basarili: false, genelHata: hataMesaji(hata) }
  }
}

/** İçe aktarma: sunucu yeniden çözümler, yalnızca kendi ürettiğini yazar. */
export async function gozlemleriIceAktar(girdi: IceAktarmaGirdisi): Promise<IceAktarmaSonucu> {
  const oturum = await oturumAc()
  if (!oturum) return { basarili: false, genelHata: OTURUM_YOK }

  try {
    return await satirlariYaz(girdi, oturum.payload, oturum.user)
  } catch (hata) {
    return { basarili: false, genelHata: hataMesaji(hata) }
  }
}
