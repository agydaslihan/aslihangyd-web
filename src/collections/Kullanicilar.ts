import type { CollectionConfig } from 'payload'

import { yalnizcaPanel } from '@/lib/erisim'

/**
 * Yönetim paneline giriş yapan kullanıcılar.
 *
 * İlk yönetici hesabı koda gömülmez; panel ilk açıldığında oluşturulur.
 */
export const Kullanicilar: CollectionConfig = {
  slug: 'kullanicilar',
  labels: {
    singular: 'Kullanıcı',
    plural: 'Kullanıcılar',
  },

  access: {
    read: yalnizcaPanel,
    create: yalnizcaPanel,
    update: yalnizcaPanel,
    delete: yalnizcaPanel,
    admin: ({ req }) => Boolean(req.user),
  },

  admin: {
    useAsTitle: 'adSoyad',
    defaultColumns: ['adSoyad', 'email', 'rol', 'updatedAt'],
  },

  auth: {
    // Oturum süresi 8 saat: paylaşılan bir bilgisayarda açık kalan panel riski.
    tokenExpiration: 60 * 60 * 8,
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
  },

  fields: [
    {
      name: 'adSoyad',
      type: 'text',
      label: 'Ad Soyad',
      required: true,
    },
    {
      name: 'rol',
      type: 'select',
      label: 'Rol',
      required: true,
      defaultValue: 'danisman',
      options: [
        { value: 'yonetici', label: 'Yönetici' },
        { value: 'danisman', label: 'Danışman' },
      ],
      admin: {
        description:
          "Rol ayrımı Faz 2B'de (CRM) yetkilendirmeye bağlanacak. Şu an bilgi amaçlıdır.",
      },
    },
    {
      name: 'telefon',
      type: 'text',
      label: 'Telefon',
    },
    {
      name: 'fotograf',
      type: 'upload',
      relationTo: 'medya',
      label: 'Profil fotoğrafı',
    },
  ],
}
