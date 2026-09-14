import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { korumaKarari, URETIM_ISARETI } from '../../../scripts/sunucu-korumasi.mjs'

type Karar = { izin: boolean; mesaj: string | null }
const karar = (girdi: {
  komut: string
  uretimSunucusu?: boolean
  envProductionVar?: boolean
  nodeEnv?: string
}): Karar =>
  korumaKarari({ uretimSunucusu: false, envProductionVar: false, nodeEnv: undefined, ...girdi })

/**
 * ⚠️ 14 Eylül 2026: üretim sunucusunda ikinci `pnpm build` belleği tüketti
 * ve işletim sistemi derlemeyi durdurdu. Aynı gün yerel `next start`
 * `.env.production`'ı yükleyip üretim veritabanı adresine bağlanmaya
 * çalıştı. Bu dosya iki kapının da açık kalmadığını kanıtlıyor.
 */
describe('derleme koruması', () => {
  it('üretim sunucusunda derleme reddediliyor', () => {
    const sonuc = karar({ komut: 'build', uretimSunucusu: true })
    expect(sonuc.izin).toBe(false)
    expect(sonuc.mesaj).toContain('CI')
  })

  /** ⚠️ Bellek sorunu kipten bağımsız — test kipi derlemeyi serbest bırakmaz. */
  it('NODE_ENV=test üretim sunucusunda derlemeyi serbest bırakmıyor', () => {
    expect(karar({ komut: 'build', uretimSunucusu: true, nodeEnv: 'test' }).izin).toBe(false)
  })

  /** CI ve `docker build` işaret dizinini görmez — orada derleme sürmeli. */
  it('CI ve Docker derlemesi engellenmiyor', () => {
    expect(karar({ komut: 'build' }).izin).toBe(true)
  })

  it('işaret dağıtım dizini', () => {
    expect(URETIM_ISARETI).toBe('/srv/aslihangyd')
  })
})

describe('başlatma koruması — .env.production tuzağı', () => {
  it('.env.production varken üretim kipinde başlatma reddediliyor', () => {
    expect(karar({ komut: 'start', envProductionVar: true, nodeEnv: 'production' }).izin).toBe(
      false,
    )
    expect(karar({ komut: 'start', envProductionVar: true }).izin).toBe(false)
  })

  it('NODE_ENV=test ile yerel doğrulama açılabiliyor', () => {
    expect(karar({ komut: 'start', envProductionVar: true, nodeEnv: 'test' }).izin).toBe(true)
  })

  /** CI'da `.env.production` yok; `pnpm start &` adımları kırılmamalı. */
  it('.env.production yoksa başlatma serbest', () => {
    expect(karar({ komut: 'start', nodeEnv: 'production' }).izin).toBe(true)
  })

  it('bilinmeyen komut sessizce geçmiyor', () => {
    expect(karar({ komut: 'dev' }).izin).toBe(false)
  })
})

describe('paket betikleri korumadan geçiyor', () => {
  const betikler = (
    JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8')) as {
      scripts: Record<string, string>
    }
  ).scripts

  /** ⚠️ Koruma İLK adım olmalı — worker kopyası bile ondan sonra. */
  it('build korumayla başlıyor', () => {
    expect(betikler.build?.startsWith('node scripts/sunucu-korumasi.mjs build && ')).toBe(true)
  })

  it('start korumayla başlıyor', () => {
    expect(betikler.start?.startsWith('node scripts/sunucu-korumasi.mjs start && ')).toBe(true)
  })

  /** Çalışan kap betiğe uğramıyor — koruma üretimi durduramaz. */
  it('üretim kabı paket betiğiyle değil server.js ile başlıyor', () => {
    const dockerfile = readFileSync(join(process.cwd(), 'docker/Dockerfile'), 'utf-8')
    expect(dockerfile).toContain('CMD ["node", "server.js"]')
  })
})
