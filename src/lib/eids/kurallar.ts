/**
 * EİDS yayınlama kuralları — projenin tek pazarlığa kapalı iş kuralı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️  BU DOSYAYA BYPASS EKLENMEZ.
 *
 * "Geliştirme ortamında atla", "yönetici zorlayabilsin", "ortam değişkeni
 * ile kapatılsın" türü hiçbir kaçış yolu eklenmemelidir. Yaptırımı yetki
 * belgesinin iptaline kadar giden bir yükümlülüktür; test verisi üretmek
 * gerekiyorsa geçerli EİDS alanlarına sahip test verisi üretilir.
 * (CLAUDE.md — İhlal edilemez kural 1)
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Mevzuat özeti: Mülk sahibi e-Devlet üzerinden "EİDS Taşınmaz İlanı
 * Yetkilendirme İşlemleri" ile işletmeyi yetkilendirir. Yetkisi olmayan
 * taşınmazın ilanı yayınlanamaz; bu, kendi web sitemizdeki ilanları da
 * kapsar.
 */

import { bugununAnahtari, gunAnahtari, gunFarki, type GunAnahtari } from '@/lib/tarih'

import type { EidsDegerlendirmesi, EidsEngeli, EidsGirdisi, EidsUyarisi } from './types'

/** Yetki bitişine bu kadar gün kalınca uyarı üretilir (günlük görev bunu kullanır). */
export const YETKI_UYARI_ESIGI_GUN = 15

/** Mevzuatın öngördüğü asgari yetkilendirme süresi. */
export const ASGARI_YETKI_SURESI_GUN = 90

/**
 * Bir ilanın EİDS açısından yayınlanabilir olup olmadığını değerlendirir.
 *
 * @param girdi  İlanın EİDS ve tapu alanları.
 * @param simdi  Testler için enjekte edilebilir "şimdi". Üretimde verilmez.
 *
 * Kapsam notu: Kural, ilan tipine (satılık/kiralık) bakılmaksızın TÜM
 * ilanlara uygulanır. Mevzuat metni satılık taşınmazı açıkça sayar; kiralık
 * tarafın kapsamı ise yoruma açıktır. Daha katı davranmak hiçbir hukuki risk
 * üretmez, gevşek davranmak üretir — bu yüzden katı taraf seçilmiştir.
 * Avukat görüşüyle kapsam daraltılacaksa bu karar bilinçli olarak ve
 * SENDEN-BEKLENENLER.md üzerinden alınmalıdır.
 */
export function eidsDegerlendir(girdi: EidsGirdisi, simdi: Date = new Date()): EidsDegerlendirmesi {
  const engeller: EidsEngeli[] = []
  const uyarilar: EidsUyarisi[] = []

  const bugun = bugununAnahtari(simdi)

  // ── 1. Yetki durumu ────────────────────────────────────────────────────
  if (!girdi.eidsDurum) {
    engeller.push({
      kod: 'durum_secilmemis',
      mesaj: 'EİDS yetki durumu seçilmemiş. İlanın yayınlanabilmesi için bu alan zorunludur.',
    })
  } else if (girdi.eidsDurum !== 'yetkili') {
    engeller.push({
      kod: 'durum_yetkili_degil',
      mesaj:
        'EİDS yetki durumu "Yetkili" değil. Mülk sahibinin e-Devlet üzerinden ' +
        '"EİDS Taşınmaz İlanı Yetkilendirme İşlemleri" ile işletmeyi yetkilendirmesi gerekir.',
    })
  }

  // ── 2. Taşınmaz kimliği ────────────────────────────────────────────────
  if (!bosDegil(girdi.tasinmazNo)) {
    engeller.push({
      kod: 'tasinmaz_no_yok',
      mesaj:
        'EİDS taşınmaz numarası girilmemiş. Bu numara ilan sayfasında ' +
        '"Doğrulanmış İlan" rozetiyle birlikte gösterilmek zorundadır.',
    })
  }

  if (!bosDegil(girdi.ada)) {
    engeller.push({
      kod: 'ada_yok',
      mesaj: 'Tapu ada bilgisi girilmemiş. Yetkilendirmenin taşınmaza bağlanması için zorunludur.',
    })
  }

  if (!bosDegil(girdi.parsel)) {
    engeller.push({
      kod: 'parsel_yok',
      mesaj:
        'Tapu parsel bilgisi girilmemiş. Yetkilendirmenin taşınmaza bağlanması için zorunludur.',
    })
  }

  // ── 3. Yetki süresi ────────────────────────────────────────────────────
  const baslangic = gunAnahtari(girdi.eidsYetkiBaslangic)
  const bitis = gunAnahtari(girdi.eidsYetkiBitis)

  if (baslangic === null) {
    engeller.push({
      kod: 'yetki_baslangic_yok',
      mesaj: 'EİDS yetki başlangıç tarihi girilmemiş.',
    })
  }

  if (bitis === null) {
    engeller.push({
      kod: 'yetki_bitis_yok',
      mesaj:
        'EİDS yetki bitiş tarihi girilmemiş. Yetki süresi takip edilemediği için ilan yayınlanamaz.',
    })
  }

  const kalanGun = bitis === null ? null : gunFarki(bugun, bitis)

  if (bitis !== null) {
    if (kalanGun !== null && kalanGun < 0) {
      engeller.push({
        kod: 'yetki_suresi_dolmus',
        mesaj:
          `EİDS yetki süresi ${Math.abs(kalanGun)} gün önce doldu. ` +
          'İlan yayında kalamaz; mülk sahibinden yeni yetkilendirme alınmalıdır.',
      })
    } else if (kalanGun !== null && kalanGun <= YETKI_UYARI_ESIGI_GUN) {
      uyarilar.push({
        kod: 'yetki_yakinda_bitiyor',
        mesaj:
          `EİDS yetki süresinin bitmesine ${kalanGun} gün kaldı. ` +
          'Süre dolduğunda ilan otomatik olarak yayından kaldırılır.',
      })
    }
  }

  if (baslangic !== null && bitis !== null) {
    const sure = gunFarki(baslangic, bitis)

    if (sure < 0) {
      engeller.push({
        kod: 'yetki_tarihleri_tutarsiz',
        mesaj: 'EİDS yetki bitiş tarihi, başlangıç tarihinden önce olamaz.',
      })
    } else if (sure < ASGARI_YETKI_SURESI_GUN) {
      // Engel değil uyarı: yetkinin süresini biz belirlemiyoruz, e-Devlet
      // belirliyor. Kısa görünen bir süre büyük ihtimalle veri giriş hatasıdır.
      uyarilar.push({
        kod: 'yetki_suresi_uc_aydan_kisa',
        mesaj:
          `Yetki süresi ${sure} gün görünüyor. Mevzuat asgari 3 ay öngörür — ` +
          'tarihleri kontrol edin.',
      })
    }

    if (gunFarki(bugun, baslangic) > 0) {
      engeller.push({
        kod: 'yetki_baslamamis',
        mesaj: 'EİDS yetki başlangıç tarihi gelecekte. Yetki başlamadan ilan yayınlanamaz.',
      })
    }
  }

  return {
    yayinlanabilir: engeller.length === 0,
    engeller,
    uyarilar,
    kalanGun,
  }
}

/**
 * Kısa yol: yalnızca "yayınlanabilir mi?" sorusuna cevap verir.
 * Gerekçeye ihtiyaç duymayan çağıranlar için.
 */
export function eidsYayinaUygunMu(girdi: EidsGirdisi, simdi: Date = new Date()): boolean {
  return eidsDegerlendir(girdi, simdi).yayinlanabilir
}

/**
 * Yetkinin bitmesine kalan gün. Süre dolmuşsa negatif, tarih yoksa `null`.
 * Günlük bakım görevi ve yönetim paneli rozeti bunu kullanır.
 */
export function yetkiyeKalanGun(
  eidsYetkiBitis: Date | string | null | undefined,
  simdi: Date = new Date(),
): number | null {
  const bitis: GunAnahtari | null = gunAnahtari(eidsYetkiBitis)
  if (bitis === null) return null
  return gunFarki(bugununAnahtari(simdi), bitis)
}

/** Engelleri tek bir okunabilir metne çevirir (hata mesajı için). */
export function engelleriYaz(engeller: readonly EidsEngeli[]): string {
  return engeller.map((engel) => `• ${engel.mesaj}`).join('\n')
}

function bosDegil(deger: string | null | undefined): deger is string {
  return typeof deger === 'string' && deger.trim().length > 0
}
