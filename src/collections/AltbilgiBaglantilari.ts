import type { CollectionConfig } from 'payload'

import { herkesOkur, yalnizcaYonetici } from '@/lib/erisim'

/** Altbilgi sütunları — şartnamedeki dört sütun. */
export const ALTBILGI_SUTUNLARI = [
  { value: 'kurumsal', label: 'Kurumsal' },
  { value: 'faydali', label: 'Faydalı bağlantılar' },
  { value: 'hukuksal', label: 'Hukuksal metinler' },
  { value: 'iletisim', label: 'İletişim' },
] as const

export type AltbilgiSutunu = (typeof ALTBILGI_SUTUNLARI)[number]['value']

/**
 * Altbilgi bağlantıları.
 *
 * Koleksiyon olmasının sebebi: bağlantı sayısı zamanla artacak ve sıralama
 * elle değişecek. Global içindeki bir dizi, 30 satıra çıktığında panelde
 * yönetilemez hale gelir.
 *
 * ⚠️ Dış bağlantılarda `target="_blank"` ve `rel="noopener noreferrer"`
 * OTOMATİK eklenir — elle yazılmasına bırakılmaz. `noopener` olmadan açılan
 * sekme `window.opener` üzerinden bu sayfayı yönlendirebilir.
 */
export const AltbilgiBaglantilari: CollectionConfig = {
  slug: 'altbilgi-baglantilari',

  labels: {
    singular: 'Altbilgi Bağlantısı',
    plural: 'Altbilgi Bağlantıları',
  },

  admin: {
    group: 'Ayarlar',
    useAsTitle: 'baslik',
    defaultColumns: ['baslik', 'sutun', 'url', 'siraNo', 'aktif'],
    description: 'Altbilgideki dört sütunun içeriği. Sıra numarası küçük olan üstte görünür.',
  },

  access: {
    read: herkesOkur,
    create: yalnizcaYonetici,
    update: yalnizcaYonetici,
    // ⚠️ Yalnızca yönetici: sitenin altbilgisi — editoryal/kurumsal karar.
    delete: yalnizcaYonetici,
  },

  defaultSort: 'siraNo',

  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'sutun',
          type: 'select',
          label: 'Sütun',
          required: true,
          options: ALTBILGI_SUTUNLARI.map((sutun) => ({ ...sutun })),
        },
        {
          name: 'siraNo',
          type: 'number',
          label: 'Sıra',
          defaultValue: 10,
        },
      ],
    },
    {
      name: 'baslik',
      type: 'text',
      label: 'Görünen metin',
      required: true,
    },
    {
      name: 'url',
      type: 'text',
      label: 'Adres',
      required: true,
      admin: {
        description:
          'Site içi bağlantı için "/mahalleler" gibi yol; dış bağlantı için tam adres ' +
          '("https://…"). Dış bağlantılarda güvenlik öznitelikleri otomatik eklenir.',
      },
    },
    {
      name: 'dahiliMi',
      type: 'checkbox',
      label: 'Site içi bağlantı',
      defaultValue: true,
      admin: {
        description:
          'İşaretliyse aynı sekmede açılır. İşaretli değilse yeni sekmede açılır ve ' +
          'yanında dış bağlantı ikonu görünür.',
      },
    },
    {
      name: 'aktif',
      type: 'checkbox',
      label: 'Görünsün',
      defaultValue: true,
    },
  ],

  timestamps: true,
}
