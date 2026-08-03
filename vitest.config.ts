import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // ⚠️ TEKNİK BORÇ — FAZ 1.4'TE KALDIRILACAK.
    // Faz 1.1'de henüz hiç test yoktu ve vitest boş çalıştırmada exit 1
    // döndürüp "her faz sonunda pnpm test temiz" kapısını boşuna kırıyordu.
    // Faz 1.4'te EİDS testleri (src/lib/eids) yazılınca bu satır SİLİNMELİ;
    // aksi halde testlerin yanlışlıkla hiç çalışmaması sessizce gizlenir.
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
    },
  },
})
