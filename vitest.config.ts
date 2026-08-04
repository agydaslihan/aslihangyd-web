import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],

    // Entegrasyon testleri Payload'ı ve veritabanını ayağa kaldırır; ilk
    // derleme birkaç saniye sürebilir.
    testTimeout: 30_000,
    hookTimeout: 60_000,

    // Entegrasyon testleri aynı veritabanını paylaşır — paralel çalışırlarsa
    // birbirlerinin kayıtlarını görürler. Tek süreçte sırayla koşarlar.
    fileParallelism: false,

    // Not: `passWithNoTests` bilinçli olarak YOK. EİDS testleri yazıldığı için
    // (Faz 1.4) teknik borç kapatıldı. Bu bayrağı geri eklemeyin — testlerin
    // hiç çalışmaması sessizce gizlenir.
  },
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
      '@payload-config': path.resolve(dirname, './src/payload.config.ts'),
      // `server-only` react-server koşulu dışındaki her ortamda hata fırlatır;
      // testlerde koruma gereksiz, modülleri import edilemez hale getiriyordu.
      'server-only': path.resolve(dirname, './test/sunucu-only-stub.ts'),
    },
  },
})
