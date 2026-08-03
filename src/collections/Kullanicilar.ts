import type { CollectionConfig } from 'payload'

/**
 * Yönetim paneline giriş yapan kullanıcılar.
 *
 * Faz 1.1 kapsamında yalnızca kimlik doğrulama için gereken asgari alanlar
 * bulunur. Rol/yetki modeli sonraki adımlarda genişletilecektir.
 *
 * İlk yönetici hesabı koda gömülmez; panel ilk açıldığında oluşturulur.
 */
export const Kullanicilar: CollectionConfig = {
  slug: 'kullanicilar',
  labels: {
    singular: 'Kullanıcı',
    plural: 'Kullanıcılar',
  },
  admin: {
    useAsTitle: 'adSoyad',
    defaultColumns: ['adSoyad', 'email', 'updatedAt'],
  },
  auth: true,
  fields: [
    {
      name: 'adSoyad',
      type: 'text',
      label: 'Ad Soyad',
      required: true,
    },
  ],
}
