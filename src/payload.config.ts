import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { tr } from '@payloadcms/translations/languages/tr'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { Ilanlar } from '@/collections/Ilanlar'
import { Kullanicilar } from '@/collections/Kullanicilar'
import { Mahalleler } from '@/collections/Mahalleler'
import { Medya } from '@/collections/Medya'
import { Sayfalar } from '@/collections/Sayfalar'
import { Talepler } from '@/collections/Talepler'
import { KurumsalBilgiler } from '@/globals/KurumsalBilgiler'

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
    meta: {
      titleSuffix: '— Aslıhan GYD Yönetim',
    },
  },

  collections: [Ilanlar, Mahalleler, Talepler, Sayfalar, Medya, Kullanicilar],

  globals: [KurumsalBilgiler],

  editor: lexicalEditor(),

  // Görsel boyutlandırma (Medya koleksiyonundaki imageSizes) için gerekli.
  sharp,

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
