/**
 * Rapor sayfalarının URL parametrelerini çözer.
 *
 * Raporlar hesaplayıcı girdilerini sorgu dizesinden alır. Bunun üç faydası
 * var: rapor paylaşılabilir bir URL olur, sunucuda aynı motorlarla yeniden
 * hesaplanır (istemciden gelen SONUCA güvenilmez), ve SMTP kurulduğunda
 * aynı rota e-postaya iliştirmek için sunucuda render edilebilir.
 *
 * ⚠️ Sonuç değil, GİRDİ taşınır. İstemcinin hesapladığı rakamı URL'den alıp
 * rapora basmak, adres çubuğunu düzenleyen herkese "aslihangyd.com raporu"
 * görünümlü uydurma bir belge üretme imkânı verirdi.
 */

export type SorguParametreleri = Record<string, string | string[] | undefined>

function tekDeger(parametreler: SorguParametreleri, anahtar: string): string | undefined {
  const deger = parametreler[anahtar]
  return Array.isArray(deger) ? deger[0] : deger
}

/**
 * Sayısal parametre. Geçersiz veya eksikse `null` — sıfır DEĞİL.
 *
 * Bu ayrım motorların temel varsayımı: "girilmemiş" ile "sıfır" farklı
 * şeylerdir ve karıştırılırsa rapor sessizce yanlış çıkar.
 */
export function sayiParametresi(parametreler: SorguParametreleri, anahtar: string): number | null {
  const ham = tekDeger(parametreler, anahtar)
  if (ham === undefined || ham.trim() === '') return null

  const sayi = Number(ham)
  return Number.isFinite(sayi) ? sayi : null
}

/** Metin parametresi. Boşsa `null`. */
export function metinParametresi(parametreler: SorguParametreleri, anahtar: string): string | null {
  const ham = tekDeger(parametreler, anahtar)
  return ham === undefined || ham.trim() === '' ? null : ham
}

/**
 * Kapalı listeden seçim parametresi.
 *
 * Listede olmayan değer `null` döner; URL'ye elle yazılan bir değerin
 * motora geçmesine izin verilmez.
 */
export function secimParametresi<T extends string>(
  parametreler: SorguParametreleri,
  anahtar: string,
  gecerliler: readonly T[],
): T | null {
  const ham = tekDeger(parametreler, anahtar)
  return gecerliler.find((gecerli) => gecerli === ham) ?? null
}

/** Girdileri rapor URL'sine çevirir. Boş alanlar sorgu dizesine yazılmaz. */
export function raporAdresi(
  temel: string,
  girdiler: Record<string, string | number | null | undefined>,
): string {
  const sorgu = new URLSearchParams()

  for (const [anahtar, deger] of Object.entries(girdiler)) {
    if (deger === null || deger === undefined || deger === '') continue
    sorgu.set(anahtar, String(deger))
  }

  const dize = sorgu.toString()
  return dize === '' ? temel : `${temel}?${dize}`
}
