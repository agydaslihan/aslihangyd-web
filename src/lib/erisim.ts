/**
 * Paylaşılan erişim kuralları (Payload `access`).
 *
 * Varsayılan duruş: **kapalı.** Bir koleksiyon açıkça herkese açılmadıkça
 * yalnızca giriş yapmış kullanıcılar okuyabilir. Yeni koleksiyon eklerken
 * `access` yazmayı unutmak, veriyi kazara internete açmanın en yaygın yoludur.
 */

import type { Access } from 'payload'

import { HERKESE_ACIK_DURUMLAR } from '@/lib/eids'

/** Yalnızca giriş yapmış panel kullanıcıları. */
export const yalnizcaPanel: Access = ({ req }) => Boolean(req.user)

/** Herkese açık okuma (hukuki metinler, mahalle içeriği gibi). */
export const herkesOkur: Access = () => true

/**
 * Ziyaretçi yalnızca yayındaki kayıtları görür; panel kullanıcısı hepsini.
 *
 * Bu, EİDS engelinin ikinci savunma hattıdır: hook bir şekilde atlansa bile
 * `durum` alanı `yayinda`/`rezerve` olmayan ilan API'den okunamaz.
 */
export const yayindakileriHerkesOkur: Access = ({ req }) => {
  if (req.user) return true
  return { durum: { in: [...HERKESE_ACIK_DURUMLAR] } }
}

/** Yayımlanmış (taslak olmayan) içerik herkese açık. */
export const yayimlananlariHerkesOkur: Access = ({ req }) => {
  if (req.user) return true
  return { yayinda: { equals: true } }
}

/**
 * Kimse okuyamaz (panel kullanıcısı hariç) — kişisel veri içeren
 * koleksiyonlar için. KVKK: veri minimizasyonu ve erişim sınırlaması.
 */
export const kimseOkuyamaz: Access = ({ req }) => Boolean(req.user)

/** Herkes oluşturabilir (form gönderimi), kimse okuyamaz/güncelleyemez. */
export const herkesOlusturur: Access = () => true

/** Hiç kimse — panel kullanıcısı dahil. Salt okunur türetilmiş kayıtlar için. */
export const kimseDegistiremez: Access = () => false
