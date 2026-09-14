#!/usr/bin/env node
/**
 * Üretim sunucusu koruması — `pnpm build` ve `pnpm start`ın ilk adımı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: 14 EYLÜL 2026'DA DERLEME CANLI SİTEYİ RİSKE ATTI.
 *
 * Geliştirme dizini ile üretim aynı makinede (3,3 GB RAM). Sunucuda
 * `pnpm build` ikinci kez koşulduğunda sistem belleği tükendi ve derleme
 * işletim sistemi tarafından durduruldu; o sırada swap 2,7 GB'taydı ve
 * canlı site aynı belleği paylaşıyordu. Site ayakta kaldı — bu sefer.
 *
 * Kural: derleme CI'da yapılır, sunucu yalnızca hazır imajı çeker.
 *
 * ⚠️ İKİNCİ TUZAK: `.env.production`.
 *
 * Aynı dizinde üretim ayarları duruyor ve `next start` (üretim kipi) onu
 * `.env`'in ÜSTÜNE yüklüyor. Yerel doğrulama için açılan sunucu üretim
 * veritabanı adresine bağlanmaya çalıştı; `postgres` adı kabuktan
 * çözülmediği için ulaşamadı. Çözülseydi yerel deneme canlı veriye
 * yazacaktı. `NODE_ENV=test` iken `@next/env` `.env.production`'ı hiç
 * okumuyor.
 *
 * ⚠️ Docker imajı ETKİLENMEZ: `docker build` izole dosya sisteminde koşar
 * ve `/srv/aslihangyd` orada yoktur; çalışan kap `node server.js` ile
 * başlar, bu betiğe hiç uğramaz. CI'da ne işaret dizini ne
 * `.env.production` var.
 *
 * ⚠️ Koruma paket betiklerinde. `npx next build` doğrudan çağrılırsa
 * atlanır — kural CLAUDE.md'de de yazılı.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Kullanım:  node scripts/sunucu-korumasi.mjs build|start
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

/** Üretim sunucusunun işareti — dağıtım dizini (`compose.prod.yml` burada). */
export const URETIM_ISARETI = '/srv/aslihangyd'

/**
 * Saf karar — dosya sistemine dokunmaz, test edilebilir.
 *
 * @param {{ komut: string, uretimSunucusu: boolean, envProductionVar: boolean, nodeEnv: string | undefined }} girdi
 * @returns {{ izin: boolean, mesaj: string | null }}
 */
export function korumaKarari({ komut, uretimSunucusu, envProductionVar, nodeEnv }) {
  if (komut === 'build') {
    /**
     * ⚠️ `NODE_ENV=test` DERLEMEYİ SERBEST BIRAKMAZ. Bellek sorunu ortam
     * ayarından bağımsız: derleme hangi kipte olursa olsun aynı belleği yer.
     */
    if (uretimSunucusu) {
      return {
        izin: false,
        mesaj:
          '✗ Üretim sunucusunda derleme yapılmaz.\n' +
          "  Bu makine canlı siteyi çalıştırıyor ve 3,3 GB RAM'e sahip; derleme\n" +
          '  belleği tüketip siteyi riske atıyor (14 Eylül 2026).\n' +
          "  Derleme CI'da yapılır, sunucu yalnızca hazır imajı çeker.\n" +
          '  Sunucuda koşabilenler: pnpm typecheck · pnpm lint · pnpm test',
      }
    }
    return { izin: true, mesaj: null }
  }

  if (komut === 'start') {
    if (envProductionVar && nodeEnv !== 'test') {
      return {
        izin: false,
        mesaj:
          "✗ Bu dizinde .env.production var ve `next start` onu .env'in ÜSTÜNE yükler:\n" +
          '  yerel sunucu üretim ayarlarıyla (üretim veritabanı adresiyle) açılır.\n' +
          '  Yerel doğrulama için:  NODE_ENV=test pnpm start -p 3100\n' +
          "  (test kipi .env.production'ı okumaz; .env kullanılır.)",
      }
    }
    return { izin: true, mesaj: null }
  }

  return { izin: false, mesaj: `✗ Bilinmeyen komut: ${komut} (build | start)` }
}

const dogrudanCalisti = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (dogrudanCalisti) {
  const karar = korumaKarari({
    komut: process.argv[2] ?? '',
    uretimSunucusu: existsSync(URETIM_ISARETI),
    envProductionVar: existsSync(join(process.cwd(), '.env.production')),
    nodeEnv: process.env.NODE_ENV,
  })
  if (!karar.izin) {
    console.error(`\n${karar.mesaj}\n`)
    process.exit(1)
  }
}
