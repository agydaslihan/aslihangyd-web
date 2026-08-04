import type { CollectionConfig } from 'payload'

import { herkesOkur, yalnizcaPanel } from '@/lib/erisim'

/**
 * Görsel ve belge deposu.
 *
 * Video BU KOLEKSİYONDA TUTULMAZ. CLAUDE.md: "Video: ASLA self-host etme,
 * CDN (Bunny Stream) üzerinden HLS." 4K drone videosu sunucunun bant
 * genişliğini tüketir ve siteyi düşürür — MIME kısıtı bunu kod seviyesinde
 * engeller.
 */
export const Medya: CollectionConfig = {
  slug: 'medya',
  labels: { singular: 'Görsel', plural: 'Görseller' },

  access: {
    read: herkesOkur,
    create: yalnizcaPanel,
    update: yalnizcaPanel,
    delete: yalnizcaPanel,
  },

  admin: {
    useAsTitle: 'alt',
    description: 'Site görselleri. Video yüklenmez — videolar CDN üzerinden yayınlanır.',
  },

  upload: {
    staticDir: process.env.MEDYA_DIZINI ?? 'medya',

    // Yalnızca görsel ve PDF. Video uzantıları bilinçli olarak dışarıda.
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml'],

    focalPoint: true,

    // Boyutlar mobil öncelikli seçildi (trafiğin ~%75'i mobil).
    // Tarayıcıya AVIF/WebP servis etmeyi next/image üstlenir; burada
    // yalnızca piksel boyutlarını hazırlıyoruz.
    imageSizes: [
      { name: 'kucuk', width: 480, height: undefined, withoutEnlargement: true },
      { name: 'orta', width: 960, height: undefined, withoutEnlargement: true },
      { name: 'buyuk', width: 1600, height: undefined, withoutEnlargement: true },
      // Sosyal medya paylaşım kartı — sabit oran gerekir.
      { name: 'paylasim', width: 1200, height: 630, fit: 'cover' },
    ],
  },

  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Alternatif metin',
      // Erişilebilirlik sonradan eklenen bir şey değil: alt metni olmayan
      // görsel ekran okuyucuda kaybolur ve WCAG AA'yı düşürür.
      required: true,
      admin: {
        description:
          'Görselde ne olduğunu bir cümleyle yaz. Ekran okuyucu kullananlar ve ' +
          'görsel yüklenmediğinde herkes bunu görür. Örn: "Muhittin Mahallesi\'nde 3+1 dairenin salonu".',
      },
    },
    {
      name: 'kaynak',
      type: 'text',
      label: 'Kaynak / telif',
      admin: {
        description:
          'Görsel size ait değilse kaynağını yazın. Boş bırakılırsa kendi çekimimiz sayılır.',
      },
    },
  ],
}
