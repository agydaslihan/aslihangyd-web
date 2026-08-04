/**
 * Test ortamı hazırlığı.
 *
 * Next.js `.env` dosyasını kendi yükler; vitest yüklemez. Entegrasyon
 * testleri gerçek veritabanına bağlandığı için `DATABASE_URI` ve
 * `PAYLOAD_SECRET` değerlerinin ortamda olması gerekir.
 */

import { existsSync } from 'node:fs'

// CI'da değişkenler doğrudan ortamdan gelir; yerelde .env dosyasından.
if (!process.env.DATABASE_URI && existsSync('.env')) {
  process.loadEnvFile('.env')
}
