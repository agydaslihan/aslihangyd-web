/**
 * İlişkili Medya belgelerinden hangi alanların çekileceği.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: MEDYA BELGELERİ TAMAMEN RSC YÜKÜNE SERİLEŞİYORDU.
 *
 * `depth: 1` ile çekilen her görsel, belgenin TAMAMINI getiriyordu: dört
 * boyut varyantının her biri için url/width/height/mimeType/filesize/
 * filename, üstüne `focalX`, `focalY`, `kaynak`, `kullanim` ve bütçe
 * ölçümü alanları. Bileşenlerin kullandığı ise yalnızca üç alan.
 *
 * Ölçüm: `/portfoy` belgesi görsellerle birlikte 125,6 → 161,0 kB'a çıktı
 * (aktarım 30,5 → 39,5 kB). Fark, 12 görsel referansının taşıdığı
 * kullanılmayan meta veri.
 *
 * ⚠️ Asıl mesele bugünkü 9 kB değil, BÜYÜME BİÇİMİ. Bu israf ilan sayısıyla
 * doğrusal artıyor: 100 ilanlı bir portföyde aynı oran ciddi bir rakam
 * eder ve o gün "neden bu sayfa bu kadar ağır?" sorusunun cevabı
 * bulunmaz.
 *
 * ⚠️ Buraya alan eklerken bileşenlerin gerçekten okuduğundan emin ol.
 * Eksik alan sessizce `undefined` gelir: görsel kaybolur, alt metni boş
 * kalır ve hiçbir hata görünmez.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Görsel bileşenlerinin okuduğu alanlar:
 *   · `url`         — `next/image` kaynağı
 *   · `alt`         — erişilebilirlik, zorunlu
 *   · `bulanikVeri` — `placeholder="blur"` verisi
 *
 * ⚠️ `filename` VE `mimeType` DE GEREKLİ — okunmadıkları hâlde.
 *
 * `url` yüklemeli koleksiyonlarda TÜRETİLMİŞ bir alan: Payload onu
 * `filename` üzerinden kuruyor. İlk sürümde yalnızca üç alan istendi ve
 * `url` sessizce `undefined` döndü — sayfadaki on iki ilan kartının
 * hepsi "Fotoğraf yakında" boş durumuna düştü. Hiçbir hata görünmedi;
 * kartlar görselsiz ama "çalışır" haldeydi.
 *
 * Bu, bu dosyanın başındaki uyarının kendi başıma gelmiş hâli. Alan
 * listesini daraltırken türetilmiş alanların nereden beslendiğini
 * kontrol etmek zorunlu.
 *
 * `id` Payload tarafından her zaman döner, listelemeye gerek yok.
 */
export const MEDYA_ALANLARI = {
  url: true,
  alt: true,
  bulanikVeri: true,
  filename: true,
  mimeType: true,
} as const

/** `payload.find` çağrılarına yayılacak hazır seçenek. */
export const MEDYA_POPULATE = { medya: MEDYA_ALANLARI } as const
