import type { CollectionConfig } from 'payload'

import { yalnizcaYonetici } from '@/lib/erisim'

/**
 * Ölçek düzeltme partileri — GERİ ALMANIN KAYNAĞI.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ "1000'E BÖLEREK GERİ AL" YETMEZDİ.
 *
 * Toplu çarpma işleminin matematiksel tersi bölme; ama bir kayıt aradan
 * geçen sürede elle düzeltilmişse bölmek onu da bozar. Geri alma, "eski
 * değer neydi" sorusuna bakmak zorunda — tahmin etmeye değil.
 *
 * Bu yüzden her parti eski ve yeni değeriyle birlikte yazılıyor. Yan
 * ürünü bir denetim izi: hangi rakam, ne zaman, kim tarafından, neyden
 * neye çevrildi.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ Yalnızca yönetici görür ve yazar. Bu kayıtlar siteye hiç çıkmaz;
 * `read` bile yöneticiye kapalı tutuluyor çünkü içinde düzeltilmeden
 * önceki yanlış rakamlar duruyor.
 */
export const OlcekDuzeltmeleri: CollectionConfig = {
  slug: 'olcek-duzeltmeleri',
  labels: { singular: 'Ölçek düzeltmesi', plural: 'Ölçek düzeltmeleri' },

  access: {
    read: yalnizcaYonetici,
    create: yalnizcaYonetici,
    update: yalnizcaYonetici,
    delete: yalnizcaYonetici,
  },

  admin: {
    group: 'Sistem',
    useAsTitle: 'ozet',
    defaultColumns: ['ozet', 'geriAlindi', 'createdAt'],
    description:
      'Toplu ölçek düzeltmelerinin kaydı. Geri alma bu kayıtlardan okunur; ' +
      'silmeyin — silinen bir parti geri alınamaz.',
  },

  fields: [
    {
      name: 'ozet',
      type: 'text',
      label: 'Özet',
      admin: { readOnly: true, description: 'Otomatik üretilir.' },
    },
    {
      name: 'geriAlindi',
      type: 'checkbox',
      label: 'Geri alındı',
      defaultValue: false,
      admin: { readOnly: true },
    },
    {
      name: 'geriAlinmaTarihi',
      type: 'date',
      label: 'Geri alınma tarihi',
      admin: { readOnly: true },
    },
    {
      name: 'satirlar',
      type: 'array',
      label: 'Değiştirilen alanlar',
      admin: { readOnly: true },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'koleksiyon',
              type: 'select',
              label: 'Koleksiyon',
              options: [
                { value: 'mahalleler', label: 'Mahalleler' },
                { value: 'ilanlar', label: 'İlanlar' },
              ],
              required: true,
              admin: { width: '25%' },
            },
            {
              name: 'kayitId',
              type: 'number',
              label: 'Kayıt',
              required: true,
              admin: { width: '15%' },
            },
            { name: 'alan', type: 'text', label: 'Alan', required: true, admin: { width: '25%' } },
            {
              name: 'eskiDeger',
              type: 'number',
              label: 'Eski değer',
              required: true,
              admin: { width: '17%' },
            },
            {
              name: 'yeniDeger',
              type: 'number',
              label: 'Yeni değer',
              required: true,
              admin: { width: '18%' },
            },
          ],
        },
        { name: 'kayitAdi', type: 'text', label: 'Kaydın adı' },
      ],
    },
  ],
}
