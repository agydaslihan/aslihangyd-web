import type { GlobalConfig } from 'payload'

import { herkesOkur, yalnizcaYonetici } from '@/lib/erisim'

/**
 * Kurumsal bilgiler — site genelinde kullanılan tekil ayarlar.
 *
 * Taşınmaz Ticareti Yönetmeliği gereği yetki belgesi numarasının ve işletme
 * bilgilerinin sitede görünmesi gerekir. Bu alanlar boş kaldığı sürece
 * `/hakkimizda` sayfası ilgili bloğu "bilgi bekleniyor" durumunda gösterir —
 * uydurma numara yazılmaz.
 */
export const KurumsalBilgiler: GlobalConfig = {
  slug: 'kurumsal-bilgiler',
  label: 'Kurumsal Bilgiler',

  access: {
    read: herkesOkur,
    // ⚠️ Yalnızca yönetici: yetki belgesi numarası ve yasal kurumsal bilgiler.
    update: yalnizcaYonetici,
  },

  admin: {
    description:
      'Sitenin altbilgisinde ve /hakkimizda sayfasında görünen yasal ve iletişim bilgileri.',
  },

  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Yasal',
          description:
            'Taşınmaz ticareti mevzuatı gereği bu bilgilerin sitede görünür olması zorunludur.',
          fields: [
            {
              name: 'ticaretUnvani',
              type: 'text',
              label: 'Ticaret unvanı',
            },
            {
              name: 'yetkiBelgesiNo',
              type: 'text',
              label: 'Taşınmaz Ticareti Yetki Belgesi numarası',
              admin: {
                description:
                  'Ticaret Bakanlığı tarafından verilen belge numarası. Sitenin altbilgisinde gösterilir.',
              },
            },
            {
              name: 'mersisNo',
              type: 'text',
              label: 'MERSİS numarası',
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'vergiDairesi',
                  type: 'text',
                  label: 'Vergi dairesi',
                  admin: { width: '50%' },
                },
                {
                  name: 'vergiNo',
                  type: 'text',
                  label: 'Vergi numarası',
                  admin: { width: '50%' },
                },
              ],
            },
            {
              name: 'sorumluDanismanBelgeNo',
              type: 'text',
              label: 'Sorumlu Emlak Danışmanı (MYK Seviye 5) belge no',
            },
          ],
        },

        {
          label: 'İletişim',
          fields: [
            {
              name: 'adres',
              type: 'textarea',
              label: 'İş yeri adresi',
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'telefon',
                  type: 'text',
                  label: 'Telefon',
                  admin: { width: '50%' },
                },
                {
                  name: 'eposta',
                  type: 'email',
                  label: 'E-posta',
                  admin: { width: '50%' },
                },
              ],
            },
            {
              name: 'whatsapp',
              type: 'text',
              label: 'WhatsApp numarası',
              admin: {
                description:
                  'Uluslararası biçimde, yalnızca rakam. Örn: 905321234567. ' +
                  'Boşsa sitedeki tüm WhatsApp butonları gizlenir.',
              },
            },
            {
              name: 'calismaSaatleri',
              type: 'text',
              label: 'Çalışma saatleri',
            },
            {
              name: 'sosyalMedya',
              type: 'array',
              label: 'Sosyal medya hesapları',
              labels: { singular: 'Hesap', plural: 'Hesaplar' },
              fields: [
                {
                  name: 'platform',
                  type: 'select',
                  label: 'Platform',
                  required: true,
                  options: [
                    { value: 'instagram', label: 'Instagram' },
                    { value: 'youtube', label: 'YouTube' },
                    { value: 'facebook', label: 'Facebook' },
                    { value: 'linkedin', label: 'LinkedIn' },
                    { value: 'x', label: 'X' },
                  ],
                },
                { name: 'adres', type: 'text', label: 'Profil adresi', required: true },
              ],
            },
          ],
        },

        {
          label: 'KVKK',
          fields: [
            {
              name: 'veriSorumlusu',
              type: 'text',
              label: 'Veri sorumlusu',
              admin: {
                description: 'KVKK kapsamında veri sorumlusu sıfatını taşıyan kişi/işletme.',
              },
            },
            {
              name: 'verbisKayitNo',
              type: 'text',
              label: 'VERBİS kayıt numarası',
              admin: { description: 'Kayıt yükümlülüğünüz varsa. Yoksa boş bırakın.' },
            },
            {
              name: 'kvkkBasvuruEpostasi',
              type: 'email',
              label: 'İlgili kişi başvuru e-postası',
              admin: {
                description: 'Silme/erişim taleplerinin gönderileceği adres.',
              },
            },
          ],
        },
      ],
    },
  ],
}
