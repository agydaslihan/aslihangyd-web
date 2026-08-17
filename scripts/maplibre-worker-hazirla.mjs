#!/usr/bin/env node
/**
 * MapLibre worker dosyalarını `public/maplibre/<sürüm>/` altına kopyalar.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: HARİTA ÜRETİMDE TAMAMEN KIRIKTI VE SEBEBİ BUYDU.
 *
 * MapLibre GL JS v6 worker'ını AYRI bir dosyadan yüklüyor ve o dosyanın
 * adresini şöyle buluyor (`maplibre-gl.mjs`):
 *
 *     function di() {
 *       let e = import.meta.url
 *       if (!/^https?:/.test(e)) return ''          // ← boş dizge
 *       return new URL('./maplibre-gl-worker.mjs', e).href
 *     }
 *
 * Turbopack paketlemede `import.meta.url` yerine bir DOSYA yolu koyuyor.
 * Derlenmiş çıktıdan birebir:
 *
 *     ck = { get url() { return `file://${…/maplibre-gl.mjs}` } }
 *
 * `file://…` ifadesi `/^https?:/` testini geçmiyor → adres BOŞ DİZGE
 * oluyor → MapLibre `new Worker('', { type: 'module' })` çağırıyor →
 * boş adres belgenin kendi adresine çözülüyor → tarayıcı worker olarak
 * `/harita` SAYFASINI istiyor → sunucu HTML dönüyor → tarayıcı reddediyor:
 *
 *     Failed to load module script: non-JavaScript MIME type of text/html
 *
 * Worker hiç başlamıyor. MapLibre worker olmadan tek bir karo bile
 * çizemiyor: harita boş kalıyor. Caddy günlüğünde bu, `"uri":"/harita"` +
 * `"Sec-Fetch-Dest":["worker"]` satırı olarak görünüyordu.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ TURBOPACK'İN KENDİ KOPYASI KULLANILAMAZ.
 *
 * Turbopack worker dosyasını `.next/static/media/` altına atıyor — ama
 * HAM KOPYA olarak: içindeki `import "./maplibre-gl-shared.mjs"` satırı
 * olduğu gibi duruyor ve orada `maplibre-gl-shared.mjs` diye bir dosya
 * yok (yanındaki kopyanın adı karma içeriyor). Worker yüklense bile
 * ilk satırında 404 alırdı.
 *
 * Bu yüzden İKİ dosya birlikte kopyalanıyor ve worker'ın göreli içe
 * aktarımı yanındaki dosyaya düşüyor.
 *
 * ⚠️ ADRESTE SÜRÜM VAR. `public/` altındaki dosyalar içerik karması
 * taşımıyor; sürüm yolda olmasaydı MapLibre yükseltmesinden sonra
 * tarayıcı eski worker'ı önbellekten sunardı — ve yeni ana paketle
 * konuşamayan bir worker, boş bir haritadan daha kötü teşhis edilir.
 *
 * Sürüm, kütüphanenin KENDİ `getVersion()` değeriyle aynı kaynaktan
 * geliyor (`package.json`), böylece adres ile kütüphane ayrışamaz.
 */

import { copyFileSync, mkdirSync, readFileSync, rmSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Worker'ın çalışması için gereken dosyalar — ikisi de yan yana olmalı. */
export const GEREKEN_DOSYALAR = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']

export function maplibreSurumu() {
  const paket = JSON.parse(
    readFileSync(path.join(KOK, 'node_modules', 'maplibre-gl', 'package.json'), 'utf8'),
  )
  return paket.version
}

/** Tarayıcının isteyeceği adres. Kod ve betik aynı yardımcıyı kullanır. */
export function workerAdresi(surum) {
  return `/maplibre/${surum}/maplibre-gl-worker.mjs`
}

export function hedefDizin(surum) {
  return path.join(KOK, 'public', 'maplibre', surum)
}

function hazirla() {
  const surum = maplibreSurumu()
  const kaynak = path.join(KOK, 'node_modules', 'maplibre-gl', 'dist')
  const hedef = hedefDizin(surum)

  /**
   * ⚠️ Eski sürüm dizinleri siliniyor. Kalsalardı `public/` her
   * yükseltmede biraz daha şişerdi ve imaja ölü dosya taşınırdı.
   */
  const ust = path.join(KOK, 'public', 'maplibre')
  if (existsSync(ust)) rmSync(ust, { recursive: true, force: true })
  mkdirSync(hedef, { recursive: true })

  for (const dosya of GEREKEN_DOSYALAR) {
    copyFileSync(path.join(kaynak, dosya), path.join(hedef, dosya))
  }

  console.log(`✓ MapLibre worker hazır: public/maplibre/${surum}/ (${GEREKEN_DOSYALAR.join(', ')})`)
}

// Doğrudan çalıştırıldığında kopyala; içe aktarıldığında yalnızca
// yardımcıları ver (test bunları okuyor).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  hazirla()
}
