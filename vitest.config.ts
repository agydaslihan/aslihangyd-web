import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Faz 1.1'de henüz test yok; boş çalıştırma faz kapısını kırmasın.
    // İlk gerçek testler (src/lib/eids) eklendiğinde bu satır kaldırılmalı.
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
    },
  },
})
