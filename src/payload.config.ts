import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { tr } from '@payloadcms/translations/languages/tr'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { Degerlemeler } from '@/collections/Degerlemeler'
import { SIHIRBAZ_YOLU } from '@/components/sihirbaz/yol'
import { Gozlemler } from '@/collections/Gozlemler'
import { Ilanlar } from '@/collections/Ilanlar'
import { IlgiNoktalari } from '@/collections/IlgiNoktalari'
import { Kullanicilar } from '@/collections/Kullanicilar'
import { Mahalleler } from '@/collections/Mahalleler'
import { Medya } from '@/collections/Medya'
import { Sayfalar } from '@/collections/Sayfalar'
import { Talepler } from '@/collections/Talepler'
import { VergiParametreleri } from '@/collections/VergiParametreleri'
import { DegerlemeAyarlari } from '@/globals/DegerlemeAyarlari'
import { EndeksAyarlari } from '@/globals/EndeksAyarlari'
import { KurumsalBilgiler } from '@/globals/KurumsalBilgiler'
import { PortfoyBolumleri } from '@/globals/PortfoyBolumleri'

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

    /**
     * Portföy giriş sihirbazı — admin'in İÇİNDE, yanında.
     *
     * Ayrı bir sayfa yerine admin görünümü seçildi: oturum yönetimi
     * Payload'ın kalır, ikinci bir kimlik doğrulama yolu açılmaz ve
     * kullanıcı admin'den çıkmaz.
     *
     * ⚠️ Sihirbaz admin'in yerine geçmez. Kayıtları daima `taslak` olarak
     * oluşturur; yayına alma, EİDS kapısının bulunduğu ilan sayfasında
     * bilinçli bir eylem olarak kalır (CLAUDE.md kural 1).
     */
    components: {
      views: {
        portfoySihirbazi: {
          Component: '@/components/sihirbaz/SihirbazGorunumu#default',
          path: SIHIRBAZ_YOLU,
        },
      },
      // Sihirbaz bir koleksiyon olmadığı için otomatik menüde görünmez;
      // görünmeyen bir araç, olmayan bir araçtır.
      afterNavLinks: ['@/components/sihirbaz/SihirbazNavBaglantisi#SihirbazNavBaglantisi'],
    },
  },

  collections: [
    Ilanlar,
    Mahalleler,
    IlgiNoktalari,
    Talepler,
    Degerlemeler,
    Gozlemler,
    VergiParametreleri,
    Sayfalar,
    Medya,
    Kullanicilar,
  ],

  globals: [KurumsalBilgiler, DegerlemeAyarlari, EndeksAyarlari, PortfoyBolumleri],

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

    /**
     * ⚠️ Şemayı YALNIZCA migration'lar değiştirir.
     *
     * Payload, üretim dışı ortamlarda varsayılan olarak şemayı doğrudan
     * veritabanına "push" eder. Bu, üç somut soruna yol açıyordu:
     *
     * 1. `pnpm test` çalıştırmak veritabanı şemasını sessizce değiştiriyordu.
     * 2. Push ile migration'lar birbirine karışınca `payload migrate`
     *    etkileşimli bir soru sorup CI'da kilitleniyordu.
     * 3. Geliştirme ile üretim şeması ayrışabiliyordu — migration'ın
     *    gerçekten çalıştığı ilk yer üretim oluyordu.
     *
     * Kapalı olması, üretimde çalışacak migration'ın geliştirmede de aynen
     * çalışmasını garanti eder. Şema değişikliği akışı:
     *   pnpm payload migrate:create <ad> && pnpm payload migrate
     */
    push: false,
  }),
})
