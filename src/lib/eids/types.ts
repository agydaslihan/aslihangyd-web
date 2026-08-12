/**
 * EİDS (Elektronik İlan Doğrulama Sistemi) tipleri.
 *
 * Bu modül hiçbir Payload/Next.js bağımlılığı içermez — saf TypeScript'tir.
 * Sebebi: EİDS kuralı projenin tek pazarlığa kapalı iş kuralıdır ve
 * çerçeveden bağımsız olarak test edilebilmelidir.
 */

/**
 * Mülk sahibinin e-Devlet üzerinden verdiği yetkinin durumu.
 *
 * Değerler ASCII'dir; veritabanına ve API'ye bu haliyle yazılır.
 * Kullanıcıya gösterilen Türkçe karşılıkları `EIDS_DURUM_ETIKETLERI`de.
 */
export const EIDS_DURUMLARI = [
  'yetkili',
  'suresi_doldu',
  'yetkisiz',
  'tapusuz',
  'yabanci_malik',
] as const

export type EidsDurum = (typeof EIDS_DURUMLARI)[number]

export const EIDS_DURUM_ETIKETLERI: Record<EidsDurum, string> = {
  yetkili: 'Yetkili',
  suresi_doldu: 'Yetki süresi doldu',
  yetkisiz: 'Yetkisiz',
  tapusuz: 'Tapusuz taşınmaz',
  yabanci_malik: 'Yabancı malik',
}

/**
 * İlanın yayın durumu.
 *
 * ⚠️ `onay_bekliyor` bir ONAY KUYRUĞUDUR, yayın durumu değil. Danışman
 * ilanı hazırlayıp bu duruma gönderir; yönetici EİDS alanlarını doğrulayıp
 * yayınlar. Ziyaretçiye GÖRÜNMEZ (bkz. `HERKESE_ACIK_DURUMLAR`).
 * Kurallar: `src/lib/onay/kurallar.ts`
 */
export const ILAN_DURUMLARI = [
  'taslak',
  'onay_bekliyor',
  'yayinda',
  'rezerve',
  'satildi',
  'yetki_bitti',
] as const

export type IlanDurumu = (typeof ILAN_DURUMLARI)[number]

export const ILAN_DURUM_ETIKETLERI: Record<IlanDurumu, string> = {
  taslak: 'Taslak',
  onay_bekliyor: 'Onay bekliyor',
  yayinda: 'Yayında',
  rezerve: 'Rezerve',
  satildi: 'Satıldı',
  yetki_bitti: 'Yetki süresi bitti',
}

/**
 * Ziyaretçiye açık olan durumlar. **EİDS kuralı tam olarak bu kümeye uygulanır.**
 *
 * `rezerve` bilinçli olarak dahildir: rezerve bir ilan hâlâ görünür olmalı
 * (sosyal kanıt üretir) ama yeni talep toplamaz.
 *
 * `satildi` bilinçli olarak HARİÇTİR. Satılan taşınmazın yetkilendirmesi
 * işlemle birlikte anlamını yitirir; yayında tutmak "ilan" sayılıp EİDS
 * kapsamına girme riski doğurur. Satılan kayıtlar iç referans olarak durur,
 * dışarı sızmaz.
 *
 * `taslak`, `onay_bekliyor` ve `yetki_bitti` asla dışarı sızmaz.
 * `onay_bekliyor` özellikle önemli: onay kuyruğundaki ilan, henüz yönetici
 * EİDS doğrulaması yapmamış demektir — yayına açık sayılamaz.
 */
export const HERKESE_ACIK_DURUMLAR = ['yayinda', 'rezerve'] as const

/**
 * EİDS kontrolü için gereken asgari ilan verisi.
 *
 * Payload'ın ürettiği tam `Ilan` tipini kullanmıyoruz; kural fonksiyonları
 * yalnızca ihtiyaç duydukları alanları ister. Bu, testleri kırılgan
 * olmaktan çıkarır ve şema büyüdükçe bu modülü etkilemez.
 */
export interface EidsGirdisi {
  eidsDurum?: EidsDurum | null
  /** EİDS taşınmaz numarası. */
  tasinmazNo?: string | null
  eidsYetkiBaslangic?: Date | string | null
  eidsYetkiBitis?: Date | string | null
  /** Tapu bilgisi — yetkilendirmenin taşınmaza bağlanması için zorunlu. */
  ada?: string | null
  parsel?: string | null
}

export const EIDS_ENGEL_KODLARI = [
  'durum_secilmemis',
  'durum_yetkili_degil',
  'tasinmaz_no_yok',
  'ada_yok',
  'parsel_yok',
  'yetki_baslangic_yok',
  'yetki_bitis_yok',
  'yetki_tarihleri_tutarsiz',
  'yetki_baslamamis',
  'yetki_suresi_dolmus',
] as const

export type EidsEngelKodu = (typeof EIDS_ENGEL_KODLARI)[number]

export interface EidsEngeli {
  kod: EidsEngelKodu
  /** Yönetim panelinde gösterilecek, çözüm önerili Türkçe mesaj. */
  mesaj: string
}

export const EIDS_UYARI_KODLARI = ['yetki_suresi_uc_aydan_kisa', 'yetki_yakinda_bitiyor'] as const

export type EidsUyariKodu = (typeof EIDS_UYARI_KODLARI)[number]

export interface EidsUyarisi {
  kod: EidsUyariKodu
  mesaj: string
}

export interface EidsDegerlendirmesi {
  /** `true` ise ilan yayına alınabilir. Tek karar noktası budur. */
  yayinlanabilir: boolean
  engeller: EidsEngeli[]
  /** Yayını engellemeyen ama dikkat edilmesi gereken durumlar. */
  uyarilar: EidsUyarisi[]
  /**
   * Yetkinin bitmesine kalan gün sayısı.
   * Negatifse süre dolmuş, `null` ise bitiş tarihi okunamadı.
   */
  kalanGun: number | null
}
