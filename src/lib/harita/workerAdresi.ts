import { getVersion, setWorkerUrl } from 'maplibre-gl'

/**
 * MapLibre worker adresi — YAN ETKİLİ MODÜL.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ HARİTA ÜRETİMDE TAMAMEN KIRIKTI VE DÖRT KAPI DA YEŞİLDİ.
 *
 * MapLibre v6 worker adresini `import.meta.url`den türetiyor; Turbopack
 * oraya bir `file://` yolu koyuyor, kütüphanenin `/^https?:/` denetimi
 * düşüyor ve adres BOŞ DİZGE oluyor. `new Worker('')` boş adresi belgenin
 * kendi adresine çözüyor: tarayıcı worker olarak SAYFAYI istiyor, HTML
 * geliyor, "non-JavaScript MIME type" hatasıyla reddediliyor. Worker hiç
 * başlamıyor ve MapLibre worker olmadan tek bir karo çizemiyor.
 *
 * ⚠️ BU DOSYA NEDEN AYRI: 13 Eylül 2026'da panele ikinci bir harita
 * (koordinat seçici) eklendi. Kurulum `Harita3B` içinde kalsaydı, yeni
 * bileşen onu içe aktarmadığı sürece worker'sız kalırdı — yani harita
 * yine sessizce boş çizerdi. Aynı arıza, ikinci kez.
 *
 * Artık MapLibre kullanan her bileşen bu modülü ÖNCE içe aktarıyor.
 *
 * ⚠️ Sürüm `getVersion()`den geliyor: elle yazılsaydı bir `pnpm update`
 * sonrası adres sessizce 404'e düşerdi.
 *
 * Dosyalar `scripts/maplibre-worker-hazirla.mjs` ile `public/maplibre/`
 * altına kopyalanıyor; kopyalama `dev` ve `build` betiklerine bağlı.
 *
 * Doğrulama: `scripts/harita-worker-duman.mjs` + `src/lib/harita/worker.test.ts`
 * ─────────────────────────────────────────────────────────────────────────
 */
setWorkerUrl(`/maplibre/${getVersion()}/maplibre-gl-worker.mjs`)

/**
 * İçe aktarımın ağaç sarsmayla (tree shaking) düşmesini engelleyen işaret.
 *
 * ⚠️ Yalnızca yan etkisi için içe aktarılan bir modül, paketleyici
 * tarafından "kullanılmıyor" sayılıp atılabilir. Bileşenler bu sabiti
 * okuyarak bağı görünür kılıyor.
 */
export const WORKER_HAZIR = true
