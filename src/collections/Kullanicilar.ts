import type { CollectionConfig } from 'payload'

import {
  alanYalnizcaYonetici,
  kendiKaydiniOkur,
  yalnizcaYonetici,
  yeniKullanicininRolu,
} from '@/lib/erisim'

/**
 * Yönetim paneline giriş yapan kullanıcılar.
 *
 * İlk yönetici hesabı koda gömülmez; panel ilk açıldığında oluşturulur.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ YETKİ YÜKSELTME KAPISI
 *
 * Bu koleksiyonun erişim kuralları, rol ayrımının tamamını taşıyor. Üç
 * kapıdan biri açık kalırsa diğer bütün kısıtlamalar anlamsızlaşır:
 *
 *  1. **create** yöneticide değilse → danışman kendine ikinci bir yönetici
 *     hesabı açar.
 *  2. **`rol` alanı** yöneticiye kilitli değilse → danışman kendi kaydını
 *     güncelleyip kendini yönetici yapar. (Kendi kaydını güncelleyebilmesi
 *     gerekiyor: şifre ve telefon kendi bilgisi.)
 *  3. **delete** yöneticide değilse → danışman tek yöneticiyi siler ve
 *     sistemde yönetici kalmaz.
 * ─────────────────────────────────────────────────────────────────────────
 */
export const Kullanicilar: CollectionConfig = {
  slug: 'kullanicilar',
  labels: {
    singular: 'Kullanıcı',
    plural: 'Kullanıcılar',
  },

  access: {
    // Yönetici herkesi görür; danışman yalnızca kendi kaydını.
    read: kendiKaydiniOkur,
    create: yalnizcaYonetici,
    // Danışman kendi kaydını güncelleyebilir (şifre, telefon, fotoğraf) —
    // ama `rol` alanı ayrıca kilitli (aşağıda).
    update: kendiKaydiniOkur,
    delete: yalnizcaYonetici,
    // Panele giriş rol ayrımı yapmaz; ikisi de girer.
    admin: ({ req }) => Boolean(req.user),
  },

  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation !== 'create') return data

        // Kural ve gerekçesi `lib/erisim.ts` içinde, saf fonksiyon olarak
        // test ediliyor: sistemdeki ilk kullanıcı daima yönetici olur.
        const mevcut = await req.payload.count({ collection: 'kullanicilar' })
        return { ...data, rol: yeniKullanicininRolu(mevcut.totalDocs, data.rol) }
      },
    ],
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
      /**
       * ⚠️ Bu alanı YALNIZCA yönetici değiştirebilir.
       *
       * Danışman kendi kaydını güncelleyebiliyor (şifre, telefon). Bu alan
       * açık kalsaydı aynı formdan kendini yönetici yapabilirdi — tek
       * tıkla yetki yükseltme.
       */
      access: { update: alanYalnizcaYonetici },
      admin: {
        description:
          'Yönetici her şeye erişir. Danışman günlük portföy ve talep işini yapar; ' +
          'ayarlara, hukuki metinlere, vergi oranlarına dokunamaz ve kayıt silemez. ' +
          'Bu alanı yalnızca yönetici değiştirebilir.',
        // Danışman için alan zaten salt okunur; gizlemek yerine görünür
        // bırakıyoruz ki kendi rolünü bilsin.
        condition: () => true,
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
