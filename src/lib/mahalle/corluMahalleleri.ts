import { slugUret } from '@/lib/slug'

/**
 * Çorlu mahalle listesi — adlar ve yerleşim türü.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU BİR TOHUM (SEED) DEĞİL, BİR KOMUTUN GİRDİSİ
 *
 * Liste `scripts/seed.ts` içine konmadı. Tohum betiği sunucuda kabuk
 * erişimi ister ve ne zaman çalıştığı görünmez; Aslıhan'ın panelden tek
 * tıkla çalıştırabildiği, ne yazacağını önce gösteren bir komut olması
 * gerekiyordu.
 *
 * ⚠️ BURADA YALNIZCA AD VE TÜR VAR.
 *
 * Koordinat, sınır, nüfus, m² fiyatı — hiçbiri yok ve olmayacak. Bunlar
 * veridir; ad ise bir olgudur. CLAUDE.md kural 2 gereği bilmediğimiz rakamı
 * yazmıyoruz, kaydı boş açıp Aslıhan'ın doldurmasını bekliyoruz.
 *
 * Sınırlar ve merkez noktaları elle girilmek zorunda değil: OpenStreetMap
 * sınır içe aktarma ekranı (`/admin/mahalle-sinirlari`) bunları doldurur.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ VELİMEŞE BU LİSTEDE YOK — ERGENE İLÇESİNDE.
 *
 * Erken taslaklarda pilot mahalleler arasında sayılmıştı; Velimeşe Çorlu'ya
 * değil Ergene'ye bağlı. Yanlış ilçedeki bir mahalle için sayfa açmak,
 * sitenin en temel iddiasını ("Çorlu'yu biz biliriz") ilk bakışta çürütür.
 */

export type YerlesimTuru = 'merkez' | 'kirsal'

export interface CorluMahallesi {
  ad: string
  tur: YerlesimTuru
}

/**
 * Merkez mahalleler — Çorlu şehir dokusunun içinde.
 */
const MERKEZ_MAHALLELERI: readonly string[] = [
  'Alipaşa',
  'Cemaliye',
  'Çobançeşme',
  'Cumhuriyet',
  'Esentepe',
  'Hatip',
  'Havuzlar',
  'Hıdırağa',
  'Hürriyet',
  'Kazımiye',
  'Kemalettin',
  'Muhittin',
  'Nusratiye',
  'Reşadiye',
  'Rumeli',
  'Silahtarağa',
  'Şeyhsinan',
  'Zafer',
]

/**
 * Eski köy statüsündeki mahalleler.
 *
 * 6360 sayılı kanunla büyükşehir/ilçe sınırlarındaki köyler mahalleye
 * dönüştü. İdari olarak mahalle olmaları, gayrimenkul açısından merkez
 * mahallelerle aynı oldukları anlamına gelmiyor: arsa ağırlıklı, farklı
 * imar durumu, farklı alıcı profili. Bu yüzden ayrı işaretleniyorlar —
 * ziyaretçi bir "mahalle" listesinde hepsini aynı sanmasın.
 *
 * ⚠️ YEŞİLTEPE BURADAN ÇIKARILDI — 15 Ağustos 2026. Velimeşe'nin aynısı:
 * Ergene ilçesine bağlı. Dört bağımsız kaynak aynı şeyi söylüyor — OSM
 * sınır sorgusu (Çorlu alanında yok), OSM yer düğümü sorgusu (yok),
 * Nominatim (`Yeşiltepe Mahallesi, Ergene, Tekirdağ`) ve posta kodu
 * rehberleri (Ergene / 59930).
 *
 * Belirti şuydu: sınır içe aktarma 26 mahalleyi bulup bir tanesini hiçbir
 * kaynakta bulamıyordu. Eksik veri sanılan şey yanlış kayıttı — 6360 sayılı
 * kanunla Ergene kurulurken oraya geçen iki yerleşimden ikincisi.
 */
const KIRSAL_MAHALLELER: readonly string[] = [
  'Deregündüzlü',
  'Maksutlu',
  'Önerler',
  'Sarılar',
  'Seymen',
  'Şahpaz',
  'Türkgücü',
  'Yenice',
]

export const CORLU_MAHALLELERI: readonly CorluMahallesi[] = [
  ...MERKEZ_MAHALLELERI.map((ad): CorluMahallesi => ({ ad, tur: 'merkez' })),
  ...KIRSAL_MAHALLELER.map((ad): CorluMahallesi => ({ ad, tur: 'kirsal' })),
]

export const YERLESIM_TURU_SECENEKLERI = [
  { value: 'merkez', label: 'Merkez mahalle' },
  { value: 'kirsal', label: 'Kırsal (eski köy)' },
] as const

/** Yerleşim türünün ziyaretçiye gösterilen adı. */
export function yerlesimTuruEtiketi(tur: unknown): string | null {
  const secenek = YERLESIM_TURU_SECENEKLERI.find((aday) => aday.value === tur)
  return secenek?.label ?? null
}

/**
 * Mahalle adını slug'a çevirir.
 *
 * ⚠️ Koleksiyonun `slugAlani` kancasıyla AYNI fonksiyonu kullanır. İki ayrı
 * slug üretimi olsaydı "zaten var mı" kontrolü yanlış cevap verir ve içe
 * aktarma mevcut mahallelerin kopyasını açardı.
 */
export function mahalleSlugu(ad: string): string {
  return slugUret(ad)
}
