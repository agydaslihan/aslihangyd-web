import type { GlobalConfig } from 'payload'

import { herkesOkur, yalnizcaYonetici } from '@/lib/erisim'

/**
 * "Danışman ol" sayfasının içeriği.
 *
 * ⚠️ Sayfanın AÇIK olup olmadığı buradan değil `SiteBolumleri`'nden
 * yönetilir. İçerik ile görünürlük ayrı: metni hazırlarken sayfayı kapalı
 * tutabilmek gerekiyor.
 *
 * ⚠️ Buraya sözleşme, yetkilendirme taslağı ya da hukuki taahhüt metni
 * YAZILMAZ. Bu bir davet sayfası; hukuki metinler avukattan gelir
 * (CLAUDE.md kural 3).
 */
export const DanismanOl: GlobalConfig = {
  slug: 'danisman-ol',
  label: 'Danışman Ol Sayfası',

  access: {
    read: herkesOkur,
    // ⚠️ Yalnızca yönetici: danışman ilanı metni — kurumsal karar.
    update: yalnizcaYonetici,
  },

  admin: {
    group: 'İçerik',
    description:
      'Sayfanın davet metni. Sayfanın açık/kapalı olması Ayarlar → Site Bölümleri altında.',
  },

  fields: [
    {
      name: 'baslik',
      type: 'text',
      label: 'Başlık',
      admin: { description: 'Boşsa varsayılan başlık kullanılır.' },
    },
    {
      name: 'aciklama',
      type: 'textarea',
      label: 'Açıklama',
      admin: { description: 'Davet bloğunda başlığın altında görünür.' },
    },
    {
      name: 'nedenler',
      type: 'array',
      label: '"Neden birlikte çalışmalı" maddeleri',
      labels: { singular: 'Madde', plural: 'Maddeler' },
      admin: {
        description:
          '⚠️ Kazanç vaadi ya da garanti içeren ifade yazma — reklam mevzuatı açısından ' +
          'risklidir. Somut ve doğrulanabilir maddeler kullan.',
      },
      fields: [
        { name: 'baslik', type: 'text', label: 'Madde başlığı', required: true },
        { name: 'metin', type: 'textarea', label: 'Açıklama' },
      ],
    },
  ],
}
