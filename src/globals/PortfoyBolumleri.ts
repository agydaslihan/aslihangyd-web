import type { GlobalConfig } from 'payload'

import { herkesOkur, yalnizcaPanel } from '@/lib/erisim'
import { OLCUTLER } from '@/lib/portfoy/bolumler'

/**
 * Portföy sayfasının tema sıraları.
 *
 * ⚠️ ÖLÇÜT KODDA, METİN CMS'TE.
 *
 * Yatırım skorunda ve mahalle eşleştirmede uygulanan ayrımın aynısı:
 * bir sıranın hangi ilanları seçtiği METODOLOJİDİR ve denetlenebilir
 * olması için kodda durur (`src/lib/portfoy/bolumler.ts`, testli). Başlık,
 * alt başlık ve sıralama ise editoryal karardır ve buradan yönetilir.
 *
 * Tersini yapmak — ölçütü CMS'e taşımak — "hangi ilanlar öne çıkıyor?"
 * sorusunun cevabını bir metin kutusuna hapsederdi.
 */
export const PortfoyBolumleri: GlobalConfig = {
  slug: 'portfoy-bolumleri',
  label: 'Portföy Bölümleri',

  access: {
    read: herkesOkur,
    update: yalnizcaPanel,
  },

  admin: {
    group: 'Ayarlar',
    description:
      'Portföy sayfasındaki tema sıraları. Ölçüt kodda tanımlıdır; buradan ' +
      'başlığı, açıklamayı, kaç taşınmaz görüneceğini ve sırayı yönetirsin.',
  },

  fields: [
    {
      name: 'siralar',
      type: 'array',
      label: 'Tema sıraları',
      labels: { singular: 'Sıra', plural: 'Sıralar' },
      admin: {
        description:
          'Sıralar buradaki düzende gösterilir. ⚠️ Bir taşınmaz yalnızca ilk ' +
          'girdiği sırada görünür — yukarıdaki sıra onu "kapar".',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'olcut',
          type: 'select',
          label: 'Ölçüt',
          required: true,
          options: OLCUTLER.map((olcut) => ({ value: olcut.anahtar, label: olcut.etiket })),
          admin: {
            description: 'Hangi taşınmazların bu sıraya gireceğini belirler.',
          },
        },
        {
          name: 'aktif',
          type: 'checkbox',
          label: 'Sıra açık',
          defaultValue: true,
        },
        {
          name: 'baslik',
          type: 'text',
          label: 'Başlık',
          admin: {
            description:
              'Boş bırakılırsa ölçütün varsayılan başlığı kullanılır. ' +
              '⚠️ Emoji kullanma; başlık ölçüt söylemeli.',
          },
        },
        {
          name: 'altBaslik',
          type: 'text',
          label: 'Alt satır — ölçütü açıklar',
          admin: {
            description:
              'Ziyaretçiye "neye göre bu sırada?" sorusunun cevabını verir. ' +
              'Boş bırakılırsa varsayılan açıklama kullanılır.',
          },
        },
        {
          name: 'adet',
          type: 'number',
          label: 'En fazla kaç taşınmaz',
          defaultValue: 8,
          min: 2,
          max: 20,
          admin: {
            description: 'Yatay sıra kaydırmalıdır; 8–12 arası hem doyurucu hem hızlı kalır.',
          },
        },
      ],
    },
  ],
}
