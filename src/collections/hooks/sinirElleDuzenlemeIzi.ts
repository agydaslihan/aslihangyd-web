import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Mahalle sınırını insan düzelttiyse işaretle.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ELLE DÜZELTİLEN SINIR BİR DAHA EZİLMEZ
 *
 * OpenStreetMap'te mahalle sınırları eksik, kaba ya da yanlış olabilir —
 * gönüllü katkıyla çizilirler ve Türkiye'de admin_level=10 kapsaması
 * düzensizdir. Aslıhan bir sınırı düzelttiğinde bir sonraki içe aktarma
 * onu OSM'deki hâline geri çevirseydi düzeltme emeği çöpe giderdi.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ POI'DEKİ KANCADAN FARKI: İZ HER DÜZENLEMEDE BASILMAZ
 *
 * `osmElleDuzenlemeIzi` bir POI kaydında yapılan HER panel düzenlemesinde
 * iz basar; doğrusu da odur, çünkü o kaydın tek işi OSM'den gelen bilgiyi
 * tutmaktır.
 *
 * Mahalle kaydı öyle değil: içeriği, rakamları, SEO alanları ve yatırım
 * skoru sürekli düzenleniyor ve bunların sınırla hiçbir ilgisi yok. Aynı
 * deseni körü körüne uygulasaydık, mahalle metnini ilk kaydedişte sınır
 * donar ve OSM'deki düzeltmeler bir daha hiç gelmezdi — üstelik kimse
 * sebebini fark etmezdi.
 *
 * Bu yüzden karşılaştırma yapılıyor: iz yalnızca `sinir` ya da `merkez`
 * GERÇEKTEN değiştiğinde basılır.
 * ─────────────────────────────────────────────────────────────────────────
 */
export const sinirElleDuzenlemeIzi: CollectionBeforeChangeHook = ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation !== 'update') return data

  // İçe aktarıcının kendi yazması — iz bırakma.
  if (req.context?.sinirIceAktarma === true) return data

  const onceki = (originalDoc ?? {}) as Record<string, unknown>
  const gelen = data as Record<string, unknown>

  /**
   * ⚠️ "İŞARETİ BİLEREK KALDIRMA" İLE "TAŞINAN DEĞER" AYRIMI
   *
   * Payload kısmi güncellemede kaydın mevcut değerlerini de `data` içinde
   * gönderir. Sadece `data.sinirElleDuzenlendi === false` bakılsaydı her
   * insan düzenlemesi "kullanıcı işareti kaldırdı" sanılırdı. Doğru ayrım:
   * işaret önce true iken şimdi false geldiyse kullanıcı bilerek
   * kaldırmıştır (sınır yeniden OSM'den gelsin istiyor).
   */
  if (onceki.sinirElleDuzenlendi === true && gelen.sinirElleDuzenlendi === false) return data

  // Sınırı hiç OSM'den gelmemiş kayıtta işaretin bir anlamı yok: içe
  // aktarma zaten "yeni sınır" olarak yazacak ve ezecek bir şey olmayacak.
  if (onceki.sinirKaynagi !== 'osm') return data

  if (!sinirVeyaMerkezDegisti(onceki, gelen)) return data

  return { ...data, sinirElleDuzenlendi: true }
}

/**
 * Kısmi güncellemede alan hiç gönderilmemiş olabilir; `undefined` "silindi"
 * değil "dokunulmadı" demektir ve iz basmayı tetiklememelidir.
 */
function sinirVeyaMerkezDegisti(
  onceki: Record<string, unknown>,
  gelen: Record<string, unknown>,
): boolean {
  for (const alan of ['sinir', 'merkez'] as const) {
    if (!(alan in gelen)) continue
    if (!ayniDeger(onceki[alan], gelen[alan])) return true
  }
  return false
}

/**
 * Derin karşılaştırma — GeoJSON iç içe dizi, sığ eşitlik yetmez.
 *
 * `JSON.stringify` yeterli: karşılaştırdığımız değerler ya sayı dizisi ya
 * da düz GeoJSON nesnesi. Anahtar sırası farkı en kötü ihtimalle gereksiz
 * bir iz basar — koruma yönünde, açık bırakma yönünde değil.
 */
function ayniDeger(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || a === undefined || b === null || b === undefined) return false
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}
