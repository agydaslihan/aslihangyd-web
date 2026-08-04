import type { CollectionConfig } from 'payload'

import { yalnizcaPanel, yayimlananlariHerkesOkur } from '@/lib/erisim'

import { seoAlanlari, slugAlani } from './ortakAlanlar'

/**
 * Serbest içerik sayfaları — özellikle hukuki metinler.
 *
 * ⚠️ CLAUDE.md kural 3: KVKK, gizlilik ve kullanım koşulları metinlerini
 * agent YAZMAZ. Bu koleksiyon iskeleti sağlar; içeriği avukat verir.
 * Seed betiği bu sayfaları "içerik bekleniyor" durumunda oluşturur, metin
 * uydurmaz.
 */
export const Sayfalar: CollectionConfig = {
  slug: 'sayfalar',
  labels: { singular: 'Sayfa', plural: 'Sayfalar' },

  access: {
    read: yayimlananlariHerkesOkur,
    create: yalnizcaPanel,
    update: yalnizcaPanel,
    delete: yalnizcaPanel,
  },

  admin: {
    useAsTitle: 'baslik',
    defaultColumns: ['baslik', 'slug', 'yayinda', 'updatedAt'],
    description: 'Kurumsal ve hukuki metin sayfaları.',
  },

  fields: [
    {
      name: 'yayinda',
      type: 'checkbox',
      label: 'Yayında',
      defaultValue: false,
      index: true,
      admin: { position: 'sidebar' },
    },
    slugAlani('baslik'),
    {
      name: 'hukukiMetin',
      type: 'checkbox',
      label: 'Hukuki metin',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          'İşaretliyse sayfanın üstünde son güncelleme tarihi gösterilir ve arama motoruna ' +
          'öne çıkarılmaması bildirilir.',
      },
    },
    {
      name: 'baslik',
      type: 'text',
      label: 'Sayfa başlığı',
      required: true,
    },
    {
      name: 'ozet',
      type: 'textarea',
      label: 'Kısa açıklama',
      maxLength: 300,
    },
    {
      name: 'icerik',
      type: 'richText',
      label: 'İçerik',
    },
    seoAlanlari,
  ],
}
