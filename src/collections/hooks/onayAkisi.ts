import { APIError } from 'payload'
import type { CollectionBeforeChangeHook } from 'payload'

import type { IlanDurumu } from '@/lib/eids'
import { rolAl } from '@/lib/erisim'
import { durumDegisikligiGecerliMi } from '@/lib/onay/kurallar'

/**
 * İlan yayın onayı — durum geçiş kapısı.
 *
 * ⚠️ Bu kanca `eidsYayinEngeli`nin YERİNE GEÇMEZ, ÖNÜNE geçer. Sıra
 * bilinçli: bir danışman EİDS'i eksik bir ilanı doğrudan yayına almaya
 * çalıştığında "EİDS eksik" değil "bu yönetici işi, onaya gönderin"
 * mesajını görmeli — ikincisi eyleme dönük olan.
 *
 * ⚠️ Kullanıcısı olmayan çağrılar (bakım cron'u, içe aktarma, seed)
 * kısıtlanmaz. Kısıtlansaydı yetkisi dolan ilanı yayından kaldıran görev
 * çalışamaz hale gelir ve yasal engel kendi kendini kilitlerdi.
 */
export const onayAkisi: CollectionBeforeChangeHook = ({ data, originalDoc, req }) => {
  const hedef = (data as { durum?: unknown }).durum as IlanDurumu | undefined
  if (!hedef) return data

  const onceki = ((originalDoc ?? {}) as { durum?: unknown }).durum as IlanDurumu | undefined

  const karar = durumDegisikligiGecerliMi(rolAl(req.user), onceki ?? null, hedef)
  if (karar.gecerli) return data

  throw new APIError(karar.mesaj, 403, undefined, true)
}
