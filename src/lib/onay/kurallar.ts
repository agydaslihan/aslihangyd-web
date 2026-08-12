import type { Rol } from '@/lib/erisim'
import { ILAN_DURUM_ETIKETLERI, type IlanDurumu } from '@/lib/eids'

/**
 * İlan yayın onayı — durum geçiş kuralları.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN ONAY ADIMI VAR
 *
 * Taşınmaz Ticareti Yetki Belgesi **Aslıhan'ın adına.** Yetkisiz bir ilanın
 * yayınlanmasının idari sorumlusu o; danışman değil. Ama danışmanı tamamen
 * kilitlemek operasyonu durdururdu.
 *
 * Çözüm: danışman ilanı hazırlar ve **yayına gönderir**; ilan
 * `onay_bekliyor` durumunda bekler (ziyaretçiye görünmez). Yönetici EİDS
 * alanlarını doğrular ve yayınlar.
 *
 * ⚠️ ONAY, EİDS KANCASININ YERİNE GEÇMEZ — ÜSTÜNE BİNER.
 *
 * `eidsYayinEngeli` kancası aynen çalışmaya devam eder: yönetici bile
 * EİDS koşulları sağlanmadan yayına alamaz. Onay adımı ikinci bir kapıdır,
 * birincinin ikamesi değil.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Danışmanın seçebileceği durumlar.
 *
 * `taslak` — hazırlık ve **geri çekme** (onay kuyruğundan çıkarma)
 * `onay_bekliyor` — yayına gönderme
 *
 * Diğer durumların hepsi (`yayinda`, `rezerve`, `satildi`, `yetki_bitti`)
 * yöneticide: ilki yasal sorumluluk, ikincisi ticari durum bildirimi,
 * sonuncusu otomatik bakım görevinin işi.
 */
export const DANISMAN_DURUMLARI = ['taslak', 'onay_bekliyor'] as const

export type OnayKarari = { gecerli: true } | { gecerli: false; mesaj: string }

/**
 * Bir durum değişikliği bu rol tarafından yapılabilir mi?
 *
 * @param rol     `null` = sunucu içi çağrı (bakım cron'u, içe aktarma,
 *                seed). Bunlar güvenilen yollardır ve kısıtlanmaz —
 *                aksi hâlde yetkisi dolan ilanı yayından kaldıran görev
 *                çalışamaz hale gelirdi.
 * @param onceki  Kaydın mevcut durumu. Yeni kayıtta `null`.
 * @param hedef   Kaydedildikten sonraki durum.
 */
export function durumDegisikligiGecerliMi(
  rol: Rol | null,
  onceki: IlanDurumu | null,
  hedef: IlanDurumu,
): OnayKarari {
  // ⚠️ KURAL DEĞERE DEĞİL, DEĞİŞİKLİĞE BAKAR.
  //
  // Bu satır olmasaydı danışman yayındaki bir ilanın fiyatını bile
  // düzenleyemezdi: kısmi güncellemede hedef durum yine "yayinda" gelir ve
  // salt değere bakan bir kural her kaydetmeyi reddederdi.
  if (onceki === hedef) return { gecerli: true }

  if (rol === null || rol === 'yonetici') return { gecerli: true }

  if ((DANISMAN_DURUMLARI as readonly string[]).includes(hedef)) return { gecerli: true }

  return {
    gecerli: false,
    mesaj:
      `İlanı "${ILAN_DURUM_ETIKETLERI[hedef]}" durumuna almak yöneticinin işidir.\n\n` +
      'Taşınmaz Ticareti Yetki Belgesi işletme sahibinin adına ve yetkisiz ilan ' +
      'yayınının idari sorumlusu odur; bu yüzden yayın kararı onda kalıyor.\n\n' +
      'Yapmanız gereken: durumu "Onay bekliyor" seçip kaydedin. İlan onay ' +
      'kuyruğuna düşer, yönetici EİDS bilgilerini doğrulayıp yayınlar. ' +
      'Vazgeçerseniz "Taslak"a geri çekebilirsiniz.',
  }
}

/**
 * İlan onay kuyruğuna mı gönderiliyor?
 *
 * Bildirim şeridi ve kuyruk sayacı bunu kullanır.
 */
export function onayBekliyorMu(durum: unknown): boolean {
  return durum === 'onay_bekliyor'
}
