import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { tr } from '@payloadcms/translations/languages/tr'
import { buildConfig } from 'payload'

import { Kullanicilar } from '@/collections/Kullanicilar'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default buildConfig({
  // CLAUDE.md: kullanıcıya görünen HER ŞEY Türkçe — CMS admin paneli dahil.
  i18n: {
    supportedLanguages: { tr },
    fallbackLanguage: 'tr',
  },

  admin: {
    user: Kullanicilar.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },

  collections: [Kullanicilar],

  editor: lexicalEditor(),

  // CLAUDE.md kural 7: sırlar koda girmez, .env'den okunur.
  secret: process.env.PAYLOAD_SECRET ?? '',

  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },

  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI ?? '',
    },
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
})
