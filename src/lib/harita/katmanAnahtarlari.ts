/**
 * MapLibre katman anahtarları — TEK KAYNAK, SIFIR BAĞIMLILIK.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN AYRI DOSYA: SABİTİ ALMAK KÜTÜPHANEYİ GETİRİYORDU.
 *
 * Anahtarlar `Harita3B.tsx` içindeydi ve o dosya `maplibre-gl` ile
 * `maplibre-gl.css`i içe aktarıyor. Ana sayfadaki bölüm yalnızca iki
 * dizgi sabiti için oradan import etseydi MapLibre'nin tamamı (443 kB
 * gzip) ana sayfa paketine girerdi — haritayı hiç görmeyen ziyaretçiye de.
 *
 * Bu projede aynı tuzağa bir kez düşüldü: tek bir sabit uğruna zod'un
 * tamamı `/portfoy` paketine giriyordu. Sabitler bağımsız bir modülde
 * durmalı.
 *
 * ⚠️ Elle kopyalamak da çözüm değildi: harita tarafı anahtarı
 * değiştirdiğinde katman sessizce açılmaz, hiçbir hata çıkmazdı.
 * ─────────────────────────────────────────────────────────────────────────
 */

export const KATMAN_SUTUN = 'fiyat-sutunlari'
export const KATMAN_SUTUN_ETIKET = 'fiyat-sutunlari-etiket'
export const KATMAN_MAHALLE_DOLGU = 'mahalle-dolgu'
export const KATMAN_MAHALLE_CIZGI = 'mahalle-sinirlari'
export const KATMAN_MAHALLE_KESIK = 'mahalle-sinirlari-veriyok'
export const KATMAN_MAHALLE_ETIKET = 'mahalle-etiket'
export const KATMAN_BINA = 'binalar'

/** Katman anahtarları — panelle harita arasındaki sözleşme. */
export const KATMAN_ANAHTARLARI = {
  sutunlar: KATMAN_SUTUN,
  sinirlar: KATMAN_MAHALLE_CIZGI,
  binalar: KATMAN_BINA,
} as const
