/**
 * Çerez onayı — KVKK kural 8'in veri modeli.
 *
 * ⚠️ Tasarımın özü: onay bilgisi **çerezde** tutulur, localStorage'da değil.
 * Sebebi, banner göstermenin yetmemesi. Analitik betiğinin sayfaya hiç
 * eklenmemesi gerekiyor; bunun için sunucunun, HTML'i üretirken onayı
 * bilmesi şart. localStorage'a yalnızca tarayıcı erişebilir — bu durumda
 * betik önce eklenir, sonra JavaScript ile kaldırılmaya çalışılırdı ki bu
 * gerçek bir engel değildir.
 *
 * Onay çerezinin kendisi "zorunlu çerez" kategorisindedir: kullanıcının
 * tercihini hatırlamak için gereklidir ve onay gerektirmez.
 */

export const CEREZ_ONAY_ADI = 'aslihangyd_cerez_onayi'

/**
 * Onay metni veya kategori tanımları değişirse bu numara artırılır ve
 * kullanıcıdan onay yeniden istenir. Eski onayı yeni kapsamda saymak
 * KVKK açısından geçersizdir.
 */
export const ONAY_SURUMU = 1

/** Onayın geçerlilik süresi. Süresiz onay kabul edilmez. */
export const ONAY_GECERLILIK_GUN = 365

export interface CerezOnayi {
  surum: number
  /** Sitenin çalışması için gerekli çerezler — her zaman açık, kapatılamaz. */
  zorunlu: true
  /** Umami gibi ziyaret ölçümleri. */
  analitik: boolean
  /** Yeniden pazarlama / reklam piksel ve betikleri. */
  pazarlama: boolean
  /** Onayın verildiği an (ISO). İspat yükümlülüğü için saklanır. */
  tarih: string
}

/** Hiçbir isteğe bağlı kategoriye izin verilmemiş durum. */
export function bosOnay(tarih: string = new Date().toISOString()): CerezOnayi {
  return { surum: ONAY_SURUMU, zorunlu: true, analitik: false, pazarlama: false, tarih }
}

export function onayYaz(onay: CerezOnayi): string {
  return encodeURIComponent(JSON.stringify(onay))
}

/**
 * Çerez değerini güvenle çözer.
 *
 * Bozuk, eski sürümlü veya süresi geçmiş onay `null` döner — yani
 * "onay yok" sayılır. Şüphe halinde izin VERMEMEK doğru varsayılandır.
 */
export function onayCoz(
  ham: string | null | undefined,
  simdi: Date = new Date(),
): CerezOnayi | null {
  if (!ham) return null

  let veri: unknown
  try {
    veri = JSON.parse(decodeURIComponent(ham))
  } catch {
    return null
  }

  if (typeof veri !== 'object' || veri === null) return null
  const kayit = veri as Record<string, unknown>

  if (kayit.surum !== ONAY_SURUMU) return null
  if (typeof kayit.analitik !== 'boolean' || typeof kayit.pazarlama !== 'boolean') return null
  if (typeof kayit.tarih !== 'string') return null

  const verildigi = Date.parse(kayit.tarih)
  if (Number.isNaN(verildigi)) return null

  const gecenGun = (simdi.getTime() - verildigi) / 86_400_000
  // Gelecek tarihli onay = kurcalanmış çerez.
  if (gecenGun < 0 || gecenGun > ONAY_GECERLILIK_GUN) return null

  return {
    surum: ONAY_SURUMU,
    zorunlu: true,
    analitik: kayit.analitik,
    pazarlama: kayit.pazarlama,
    tarih: kayit.tarih,
  }
}

/** Belirli bir kategoriye izin verilmiş mi? Onay yoksa daima `false`. */
export function izinVarMi(onay: CerezOnayi | null, kategori: 'analitik' | 'pazarlama'): boolean {
  return onay?.[kategori] === true
}
