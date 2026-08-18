import type { GlobalConfig } from 'payload'

import { sinirliEditor } from '@/lib/icerik/alanlar'

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
        {
          name: 'gorsel',
          type: 'upload',
          relationTo: 'medya',
          label: 'Küçük görsel (isteğe bağlı)',
          admin: {
            description:
              'Maddenin üstünde kare olarak görünür. Boşsa madde yalnızca metinle çizilir — ' +
              'mevcut tasarımın aynısı. ⚠️ Kare kırpılıyor; 400×400 piksel yeterli.',
          },
        },
      ],
    },

    {
      name: 'heroGorseli',
      type: 'upload',
      relationTo: 'medya',
      label: 'Üst bant görseli',
      admin: {
        description:
          'Sayfanın en üstündeki koyu bandın arka planı. Boşsa mevcut düz koyu bant kalır. ' +
          "⚠️ Sayfanın en büyük görseli budur ve LCP'yi belirler: yatay, en az 1600 piksel. " +
          'Medya kaydında kullanım türünü seçerseniz panel bütçe durumunu gösterir.',
      },
    },

    {
      name: 'formUstuMetin',
      type: 'richText',
      label: 'Başvuru formunun üstündeki metin',
      editor: sinirliEditor,
      admin: {
        description:
          'Formdan hemen önce görünür; boşsa mevcut metin kalır. ⚠️ Çalışma koşulu, ' +
          'komisyon oranı ya da taahhüt YAZMAYIN — bunlar sözleşme konusu ve görüşmede ' +
          'yazılı olarak paylaşılıyor (CLAUDE.md kural 3).',
      },
    },

    {
      name: 'ekGorseller',
      type: 'array',
      label: 'Sayfa içi görseller',
      labels: { singular: 'Görsel', plural: 'Görseller' },
      admin: {
        description: 'Maddelerin altında ızgara olarak görünür. Boşsa hiç çizilmez.',
      },
      fields: [
        { name: 'gorsel', type: 'upload', relationTo: 'medya', label: 'Görsel', required: true },
        { name: 'aciklama', type: 'text', label: 'Açıklama (altyazı)' },
      ],
    },
  ],
}
