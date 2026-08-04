/**
 * Tarih yardımcıları — hepsi Türkiye saat diliminde çalışır.
 *
 * Neden ayrı bir modül: EİDS yetki süresi kontrolü *gün* hassasiyetinde bir
 * karardır. Sunucu UTC'de çalıştığı için `new Date()` ile doğrudan
 * karşılaştırma yapmak, Türkiye'de gece yarısından sonraki ilk 3 saatte bir
 * gün ileri/geri kayma üretir. Bu, yetkisi bugün biten bir ilanın bir gün
 * fazla yayında kalması demektir — kabul edilemez.
 *
 * Çözüm: tüm karşılaştırmalar 'YYYY-MM-DD' biçimli **gün anahtarı** üzerinden
 * yapılır. Gün anahtarları sözlük sırasıyla karşılaştırılabilir.
 */

export const ZAMAN_DILIMI = 'Europe/Istanbul'

/** 'YYYY-MM-DD' biçimli gün anahtarı. Sözlük sırası = kronolojik sıra. */
export type GunAnahtari = string

const gunBicimlendirici = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZAMAN_DILIMI,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const GUN_MS = 86_400_000
const GUN_ANAHTARI_DESENI = /^\d{4}-\d{2}-\d{2}$/

/**
 * Bir tarihi Türkiye saatindeki gün anahtarına çevirir.
 * Geçersiz girdide `null` döner — çağıran taraf bunu eksik veri sayar.
 */
export function gunAnahtari(deger: Date | string | number | null | undefined): GunAnahtari | null {
  if (deger === null || deger === undefined || deger === '') return null

  // Zaten gün anahtarı biçimindeyse dönüştürme yapma: '2026-08-04' değerini
  // Date'e verip geri almak, saat dilimi kaymasıyla bir gün geri atabilir.
  if (typeof deger === 'string' && GUN_ANAHTARI_DESENI.test(deger)) return deger

  const tarih = deger instanceof Date ? deger : new Date(deger)
  if (Number.isNaN(tarih.getTime())) return null

  return gunBicimlendirici.format(tarih)
}

/** Türkiye saatiyle bugünün gün anahtarı. */
export function bugununAnahtari(simdi: Date = new Date()): GunAnahtari {
  // `simdi` geçerli bir Date olduğu sürece format asla başarısız olmaz.
  return gunBicimlendirici.format(simdi)
}

/**
 * İki gün anahtarı arasındaki tam gün farkı (bitis - baslangic).
 * Her iki uç da UTC gece yarısı kabul edilir; bu sayede yaz saati
 * geçişleri sonucu etkilemez.
 */
export function gunFarki(baslangic: GunAnahtari, bitis: GunAnahtari): number {
  const a = Date.parse(`${baslangic}T00:00:00Z`)
  const b = Date.parse(`${bitis}T00:00:00Z`)
  if (Number.isNaN(a) || Number.isNaN(b)) {
    throw new TypeError(`Geçersiz gün anahtarı: "${baslangic}" / "${bitis}"`)
  }
  return Math.round((b - a) / GUN_MS)
}

/** Kullanıcıya gösterilecek tarih: "4 Ağustos 2026". */
const uzunTarihBicimlendirici = new Intl.DateTimeFormat('tr-TR', {
  timeZone: ZAMAN_DILIMI,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

export function tarihiYaz(deger: Date | string | number | null | undefined): string | null {
  const anahtar = gunAnahtari(deger)
  if (anahtar === null) return null
  return uzunTarihBicimlendirici.format(new Date(`${anahtar}T12:00:00Z`))
}
