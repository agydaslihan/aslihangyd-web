import type { CollectionBeforeChangeHook } from 'payload'

/**
 * OSM kaynaklı bir kaydı insan düzenlediyse işaretle.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ELLE DÜZELTİLEN KAYIT BİR DAHA EZİLMEZ
 *
 * OpenStreetMap'te eksik ve yanlış kayıt olur. Aslıhan bir noktanın adını
 * ya da konumunu düzelttiğinde, bir sonraki içe aktarma onu OSM'deki hâline
 * geri çevirseydi düzeltme emeği her seferinde çöpe gider ve sistem
 * güvenilmez olurdu.
 *
 * ⚠️ İÇE AKTARMAYI İNSANDAN AYIRAN ŞEY `req.context`.
 *
 * İçe aktarma da panel üzerinden, gerçek bir kullanıcıyla çalışıyor —
 * yani "kullanıcı var mı" sorusu ikisini ayıramaz. İçe aktarıcı yazma
 * çağrılarına `context.osmIceAktarma = true` koyuyor; bu kanca yalnızca
 * o bayrak YOKKEN işareti basıyor.
 *
 * Bayrağa güvenmek güvenli: `context` istemciden gelmez, sunucu içinde
 * Local API çağrısına elle konur.
 * ─────────────────────────────────────────────────────────────────────────
 */
export const osmElleDuzenlemeIzi: CollectionBeforeChangeHook = ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation !== 'update') return data

  // İçe aktarıcının kendi yazması — iz bırakma.
  if (req.context?.osmIceAktarma === true) return data

  const kayit = { ...(originalDoc ?? {}), ...data } as Record<string, unknown>
  if (kayit.kaynak !== 'osm') return data

  /**
   * ⚠️ "İŞARETİ BİLEREK KALDIRMA" İLE "TAŞINAN DEĞER" AYRIMI
   *
   * İlk yazımda yalnızca `data.elleDuzenlendi === false` kontrol
   * ediliyordu ve bu **korumanın tamamını devre dışı bırakıyordu**:
   * Payload kısmi güncellemede kaydın mevcut `false` değerini de `data`
   * içinde gönderiyor, dolayısıyla her insan düzenlemesi "kullanıcı
   * işareti kaldırdı" sanılıp iz basılmadan geçiyordu.
   *
   * Doğru ayrım öncekiyle karşılaştırmak: işaret **daha önce true idi ve
   * şimdi false geldiyse** kullanıcı bilerek kaldırmıştır (kayıt yeniden
   * OSM'den güncellensin istiyor). Zaten false olan bir kayıtta gelen
   * false, taşınan değerdir ve iz basılmalıdır.
   *
   * Entegrasyon testi yakaladı.
   */
  const oncekiIsaret = (originalDoc as { elleDuzenlendi?: unknown } | undefined)?.elleDuzenlendi
  const gelenIsaret = (data as { elleDuzenlendi?: unknown }).elleDuzenlendi

  if (oncekiIsaret === true && gelenIsaret === false) return data

  return { ...data, elleDuzenlendi: true }
}
