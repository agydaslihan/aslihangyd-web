import { APIError } from 'payload'
import type { CollectionBeforeChangeHook } from 'payload'

import {
  eidsDegerlendir,
  engelleriYaz,
  HERKESE_ACIK_DURUMLAR,
  ILAN_DURUM_ETIKETLERI,
  type EidsGirdisi,
  type IlanDurumu,
} from '@/lib/eids'

/**
 * EİDS yayın engeli — yasal zorunluluğun kod seviyesindeki uygulaması.
 *
 * ⚠️ Bu hook'a "geliştirme ortamında atla" koşulu EKLENMEZ. (CLAUDE.md kural 1)
 *
 * Neden `beforeChange`: bu kanca yönetim panelinden, REST/GraphQL API'den ve
 * Local API'den (seed betikleri dahil) gelen tüm yazmalarda çalışır. Alan
 * bazlı `validate` yalnızca form gönderimini kapsardı.
 *
 * Kural yalnızca ilan HERKESE AÇIK bir duruma alınırken uygulanır. Taslağa
 * çekmek veya "yetki süresi bitti" olarak işaretlemek her zaman serbesttir —
 * aksi halde yetkisi dolmuş bir ilan yayından kaldırılamaz hale gelirdi.
 */
export const eidsYayinEngeli: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  // Kısmi güncellemede `data` yalnızca değişen alanları taşır; karar
  // kaydın kaydedildikten SONRAKİ hali üzerinden verilmeli.
  const kayit = { ...(originalDoc ?? {}), ...data } as Record<string, unknown> & EidsGirdisi
  const hedefDurum = kayit.durum as IlanDurumu | undefined

  if (!hedefDurum) return data
  if (!(HERKESE_ACIK_DURUMLAR as readonly string[]).includes(hedefDurum)) return data

  const sonuc = eidsDegerlendir(kayit)
  if (sonuc.yayinlanabilir) return data

  throw new APIError(
    `Bu ilan "${ILAN_DURUM_ETIKETLERI[hedefDurum]}" durumuna alınamaz — EİDS koşulları sağlanmıyor.\n\n` +
      `${engelleriYaz(sonuc.engeller)}\n\n` +
      'Eksikleri tamamlayana kadar ilanı "Taslak" olarak kaydedebilirsiniz. ' +
      'Bu kontrol yasal bir zorunluluktur (Taşınmaz Ticareti Yönetmeliği — EİDS) ve devre dışı bırakılamaz.',
    400,
    undefined,
    // Mesaj yönetim panelinde görünsün; içinde kişisel veri yok.
    true,
  )
}
