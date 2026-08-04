/**
 * Veri kalitesi korumaları.
 *
 * "Sistem sizi koruyacak" (ENDEKS-VERI-YONETIMI.md §4). Aslıhan haftada
 * ~30 gözlem girecek; kayıt başına hedef 15 saniye. Bu hızda hata kaçınılmaz.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ Bu kontroller UYARIR, ENGELLEMEZ.
 *
 * Bir gözlemi "aykırı" diye reddetmek, veriyi kendi beklentimize göre
 * budamak olur — ve endeksin bozulmasının en sinsi yoludur. Gerçekten özel
 * bir mülk gerçekten aykırı bir fiyata sahip olabilir. Sistem soruyu sorar,
 * kararı insan verir.
 * ─────────────────────────────────────────────────────────────────────────
 */

export interface KaliteUyarisi {
  kod: 'mukerrer' | 'aykiri_deger' | 'bayat_veri' | 'supheli_m2' | 'supheli_fiyat'
  mesaj: string
  /** `true` ise kullanıcıya "emin misiniz?" sorulur. */
  onayIster: boolean
}

/** Bir gözlemin mükerrer sayılması için gereken en fazla gün farkı. */
export const MUKERRER_GUN_PENCERESI = 30

/** Katman medyanından bu oranda sapan gözlem "aykırı" sayılır. */
export const AYKIRI_SAPMA_ORANI = 0.4

/** Bir mahallede bu kadar gün gözlem yoksa "bayat veri" uyarısı çıkar. */
export const BAYAT_VERI_GUNU = 30

export interface GozlemAdayi {
  mahalleSlug: string
  odaTipi: string
  tip: string
  m2: number
  fiyat: number
  m2Fiyati: number
}

export interface MevcutGozlem {
  mahalleSlug: string
  odaTipi: string
  tip: string
  m2: number
  fiyat: number
  /** Kaç gün önce girildi. */
  gunOnce: number
}

/**
 * Mükerrer kayıt kontrolü.
 *
 * Aynı mahalle + oda tipi + m² + fiyat kombinasyonu kısa süre içinde iki kez
 * girilmişse büyük ihtimalle aynı ilandır. Aynı ilanı iki kez saymak,
 * o katmanın medyanını o ilana doğru çeker.
 */
export function mukerrerKontrol(
  aday: GozlemAdayi,
  mevcutlar: readonly MevcutGozlem[],
): KaliteUyarisi | null {
  const eslesme = mevcutlar.find(
    (mevcut) =>
      mevcut.gunOnce <= MUKERRER_GUN_PENCERESI &&
      mevcut.mahalleSlug === aday.mahalleSlug &&
      mevcut.odaTipi === aday.odaTipi &&
      mevcut.tip === aday.tip &&
      mevcut.m2 === aday.m2 &&
      mevcut.fiyat === aday.fiyat,
  )

  if (!eslesme) return null

  return {
    kod: 'mukerrer',
    mesaj:
      `Bu gözlem mükerrer olabilir: aynı mahalle, ${aday.m2} m², ` +
      `${aday.fiyat.toLocaleString('tr-TR')} ₺ — ${eslesme.gunOnce} gün önce girilmiş.`,
    onayIster: true,
  }
}

/**
 * Aykırı değer kontrolü.
 *
 * Katman medyanından belirgin sapan gözlemi işaretler. Medyan bilinmiyorsa
 * (katmanda henüz veri yok) kontrol yapılmaz — karşılaştırılacak bir şey yok.
 */
export function aykiriDegerKontrol(
  m2Fiyati: number,
  katmanMedyani: number | null,
): KaliteUyarisi | null {
  if (katmanMedyani === null || katmanMedyani <= 0) return null

  const sapma = (m2Fiyati - katmanMedyani) / katmanMedyani
  if (Math.abs(sapma) < AYKIRI_SAPMA_ORANI) return null

  const yon = sapma > 0 ? 'üstünde' : 'altında'
  const yuzde = Math.abs(Math.round(sapma * 100))

  return {
    kod: 'aykiri_deger',
    mesaj:
      `${Math.round(m2Fiyati).toLocaleString('tr-TR')} TL/m², bu katmanın medyanının ` +
      `%${yuzde} ${yon}. Doğru mu?`,
    onayIster: true,
  }
}

/**
 * Girdi akla yatkınlık kontrolü.
 *
 * Bunlar aykırı değer değil, **tuş hatası** yakalar: 1350 yerine 135 yazmak,
 * fiyata bir sıfır fazla eklemek gibi. Eşikler geniş tutuldu — amaç
 * daraltmak değil, açık hatayı yakalamak.
 */
export function girdiAklaYatkinMi(aday: GozlemAdayi): KaliteUyarisi[] {
  const uyarilar: KaliteUyarisi[] = []

  if (aday.m2 < 20 || aday.m2 > 2000) {
    uyarilar.push({
      kod: 'supheli_m2',
      mesaj: `${aday.m2} m² olağandışı görünüyor. Rakamı kontrol eder misiniz?`,
      onayIster: true,
    })
  }

  // m² fiyatı hem çok düşük hem çok yüksek olamaz; tuş hatası genellikle
  // 10 kat sapma üretir.
  if (aday.m2Fiyati < 1_000) {
    uyarilar.push({
      kod: 'supheli_fiyat',
      mesaj:
        `m² fiyatı ${Math.round(aday.m2Fiyati).toLocaleString('tr-TR')} TL çıkıyor. ` +
        'Fiyat eksik girilmiş olabilir.',
      onayIster: true,
    })
  }

  return uyarilar
}

/**
 * Bayat veri kontrolü — hangi mahallelerde uzun süredir gözlem yok?
 *
 * Haftalık rutinin en kolay atlanan kısmı, ilgi çekmeyen mahalledir. Bu
 * kontrol, endeksin sessizce tek taraflı beslenmesini engeller.
 */
export function bayatVeriKontrol(
  mahalleler: readonly { slug: string; ad: string; sonGozlemGunOnce: number | null }[],
): KaliteUyarisi[] {
  return mahalleler
    .filter(
      (mahalle) => mahalle.sonGozlemGunOnce === null || mahalle.sonGozlemGunOnce > BAYAT_VERI_GUNU,
    )
    .map((mahalle) => ({
      kod: 'bayat_veri' as const,
      mesaj:
        mahalle.sonGozlemGunOnce === null
          ? `${mahalle.ad} Mahallesi'nde hiç gözlem yok.`
          : `${mahalle.ad} Mahallesi'nde ${mahalle.sonGozlemGunOnce} gündür gözlem yok.`,
      onayIster: false,
    }))
}

/** m² fiyatı — giriş anında hesaplanır ki yanlış giriş hemen fark edilsin. */
export function m2FiyatiHesapla(fiyat: number, m2: number): number | null {
  if (!Number.isFinite(fiyat) || !Number.isFinite(m2)) return null
  if (fiyat <= 0 || m2 <= 0) return null
  return Math.round((fiyat / m2) * 100) / 100
}
