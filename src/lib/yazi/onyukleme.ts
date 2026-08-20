import 'server-only'

import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Gövde fontunun ön yükleme adresi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: NEXT FONTU ÖN YÜKLÜYOR AMA HTML'E DEĞİL.
 *
 * Üretilen sayfalarda tek bir `<link rel="preload" as="font">` yoktu.
 * `next/font/local` `preload: true` ile çağrılıyor (varsayılan da öyle),
 * derleme çıktısındaki dosya adı Next'in ön yükleme işaretini taşıyor
 * (`plus_jakarta_sans_turkce-s.p.0-….woff2`) ve `next-font-manifest.json` her sayfa
 * için doğru dosyaları listeliyor.
 *
 * Sebep ölçümle bulundu — Next'in çalışma zamanına sonda konup istek
 * atıldı:
 *
 *     [PROBE] yol= …/(site)/layout.tsx   → bulundu= false
 *     [PROBE] yol= …/(site)/portfoy/page.tsx → bulundu= TRUE
 *
 * Yani arama isabet ediyor ve `ReactDOM.preload` gerçekten çağrılıyor. Ama
 * React bunu sunucu bileşeni render'ı içinde alıyor ve HTML `<head>`ine
 * değil, RSC akışına bir ipucu olarak yazıyor:
 *
 *     :HL["/_next/static/media/inter_turkce-s.p.0-….woff2","font",{…}]
 *
 * `<link>` öğesini bu ipucundan istemci çalışma zamanı üretiyor — yani font
 * isteği ancak paket inip akış ayrıştırıldıktan SONRA başlıyor. Ön
 * yüklemenin bütün amacı olan "HTML ayrıştırılırken başlat" kazancı
 * kayboluyor.
 *
 * ⚠️ `preload: true` AÇIKÇA YAZILIP DENENDİ — hiçbir şey değişmedi.
 * Davranış Next 16 + Turbopack tarafında; kendi head'imize basmak dışında
 * bir kolumuz yok.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ YALNIZCA GÖVDE FONTU (Plus Jakarta Sans) ÖN YÜKLENİYOR, İKİSİ BİRDEN DEĞİL.
 *
 * İki font ~57,5 kB ediyor ve mobilde ön yükleme, LCP görseliyle aynı bant
 * genişliği için yarışıyor. Metin LCP'sini geciktiren de gövde fontu:
 * başlıklar daha küçük alan kaplıyor. Başlık fontu `@font-face` üzerinden
 * normal sırasında iniyor ve `display: swap` sayesinde metin zaten yedek
 * fontla boyanıyor.
 *
 * ⚠️ SESSİZCE BAŞARISIZ OLUR. Manifest bulunamazsa `null` dönüyor: ön
 * yükleme bir iyileştirme, varlık şartı değil. Next dosyanın yerini
 * değiştirirse sayfa çalışmaya devam eder — ama `onyukleme.test.ts` bunu
 * yakalar.
 */

/** Kaynak dosya adından türeyen önek: `src/fonts/plus-jakarta-sans-turkce.woff2`. */
const GOVDE_FONTU_ONEKI = 'plus_jakarta_sans_turkce'

/** Modül ömrü boyunca bir kez okunuyor; her istekte disk okuması olmaz. */
let cozulmus: { adres: string | null } | null = null

function manifestiOku(): Record<string, string[]> | null {
  try {
    /**
     * ⚠️ Yol `process.cwd()`e göre. Standalone çıktıda sunucu `.next/standalone`
     * içinden koşuyor ve manifest orada da bulunuyor — üretim imajında
     * doğrulandı.
     */
    const yol = path.join(process.cwd(), '.next', 'server', 'next-font-manifest.json')
    const ham = JSON.parse(readFileSync(yol, 'utf8')) as { app?: Record<string, string[]> }
    return ham.app ?? null
  } catch {
    return null
  }
}

/**
 * Ön yüklenecek gövde fontunun adresi — yoksa `null`.
 *
 * ⚠️ Manifest sayfa bazında listeliyor ama bu sitede bütün sayfalar aynı iki
 * dosyayı kullanıyor; birleşimden gövde fontu seçiliyor. Birden çok aday
 * çıkarsa hiçbiri seçilmiyor: yanlış dosyayı ön yüklemek, hiç yüklememekten
 * kötü (boşa inen 50 kB).
 */
export function govdeFontuAdresi(): string | null {
  if (cozulmus !== null) return cozulmus.adres

  const app = manifestiOku()
  if (app === null) {
    cozulmus = { adres: null }
    return null
  }

  const adaylar = new Set<string>()
  for (const dosyalar of Object.values(app)) {
    for (const dosya of dosyalar) {
      if (dosya.includes(GOVDE_FONTU_ONEKI)) adaylar.add(dosya)
    }
  }

  const tek = adaylar.size === 1 ? [...adaylar][0] : undefined
  cozulmus = { adres: tek === undefined ? null : `/_next/${tek}` }
  return cozulmus.adres
}

/** Yalnızca test için — modül önbelleğini sıfırlar. */
export function onbellegiSifirla(): void {
  cozulmus = null
}
