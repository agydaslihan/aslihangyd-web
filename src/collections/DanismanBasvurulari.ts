import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'

import { herkesOlusturur, kimseOkuyamaz, yalnizcaPanel, yalnizcaYoneticiSiler } from '@/lib/erisim'
import { DENEYIM_SECENEKLERI } from '@/lib/danisman/secenekler'
import { saklamaBitisi } from '@/lib/kvkk/saklama'

/**
 * Danışman başvuruları.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ TALEPLER KOLEKSİYONUNA KARIŞTIRILMAZ.
 *
 * Bu bir İŞ BAŞVURUSUDUR, müşteri talebi değil. Ayrı tutulmasının üç
 * somut sebebi var:
 *
 * 1. KVKK açısından farklı veri kategorisi ve farklı işleme amacı.
 *    Aydınlatma metni de farklı olmak zorunda.
 * 2. Saklama süresi farklı: bir müşteri talebi görüşme bitince anlamını
 *    kaybeder, başvuru ise ileride değerlendirilebilir.
 * 3. Lead skorlaması burada anlamsız — hatta zararlı. Bir insanı iş
 *    başvurusunda "puanlamak" hem yanlış hem ayrımcılık riski.
 *
 * İkisini tek koleksiyonda birleştirmek, CRM ekranında müşterilerle iş
 * başvurularının aynı listede görünmesi demekti.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ Saklama süresi ve aydınlatma metni Aslıhan'ın avukatından gelecek;
 * şu an müşteri talepleriyle aynı varsayılan (24 ay) kullanılıyor ve bu
 * docs/SENDEN-BEKLENENLER.md içinde soru olarak yazılı.
 */
export const DanismanBasvurulari: CollectionConfig = {
  slug: 'danisman-basvurulari',

  labels: {
    singular: 'Danışman Başvurusu',
    plural: 'Danışman Başvuruları',
  },

  admin: {
    group: 'CRM',
    useAsTitle: 'ad',
    defaultColumns: ['ad', 'deneyim', 'durum', 'createdAt'],
    description:
      'Ekibe katılmak isteyenlerin başvuruları. Müşteri taleplerinden ayrı tutulur — ' +
      'farklı veri kategorisi, farklı saklama süresi.',
  },

  access: {
    // Herkes başvurabilir; kimse okuyamaz.
    create: herkesOlusturur,
    read: kimseOkuyamaz,
    update: yalnizcaPanel,
    // ⚠️ Silme yalnızca yöneticide — bkz. lib/erisim.ts gerekçesi.
    delete: yalnizcaYoneticiSiler,
  },

  hooks: {
    beforeChange: [
      ({ data, operation, originalDoc }) => {
        const kayit = { ...(originalDoc ?? {}), ...data } as Record<string, unknown>

        if (operation === 'create') {
          /**
           * Açık rıza olmadan kişisel veri işlenmez.
           *
           * ⚠️ Bu kontrol arayüzdeki onay kutusundan BAĞIMSIZDIR: sunucu
           * eylemi atlanıp REST API'ye doğrudan istek atılsa da geçerli.
           */
          if (kayit.kvkkOnay !== true) {
            throw new APIError(
              'Başvurunuzu alabilmemiz için kişisel verilerin işlenmesine ilişkin ' +
                'aydınlatma metnini onaylamanız gerekiyor.',
              400,
              undefined,
              true,
            )
          }

          const onayAni = new Date()
          return {
            ...data,
            durum: 'yeni',
            kvkkOnayTarihi: onayAni.toISOString(),
            saklamaBitis: saklamaBitisi(onayAni).toISOString(),
          }
        }

        // Onay bilgileri geçmişe dönük değiştirilemez.
        return {
          ...data,
          kvkkOnay: originalDoc?.kvkkOnay ?? data.kvkkOnay,
          kvkkOnayTarihi: originalDoc?.kvkkOnayTarihi ?? data.kvkkOnayTarihi,
          saklamaBitis: originalDoc?.saklamaBitis ?? data.saklamaBitis,
        }
      },
    ],
  },

  fields: [
    {
      name: 'durum',
      type: 'select',
      label: 'Durum',
      defaultValue: 'yeni',
      options: [
        { value: 'yeni', label: 'Yeni' },
        { value: 'gorusuldu', label: 'Görüşüldü' },
        { value: 'olumlu', label: 'Olumlu' },
        { value: 'olumsuz', label: 'Olumsuz' },
      ],
      admin: { position: 'sidebar' },
    },

    {
      name: 'ad',
      type: 'text',
      label: 'Ad soyad',
      required: true,
    },
    {
      type: 'row',
      fields: [
        { name: 'telefon', type: 'text', label: 'Telefon', required: true },
        { name: 'email', type: 'email', label: 'E-posta', required: true },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'deneyim',
          type: 'select',
          label: 'Gayrimenkul deneyimi',
          required: true,
          options: DENEYIM_SECENEKLERI.map((secenek) => ({
            value: secenek.value,
            label: secenek.label,
          })),
        },
        {
          name: 'mykBelgesi',
          type: 'checkbox',
          label: 'MYK belgesi var',
          admin: {
            description: 'Taşınmaz Ticareti / Emlak Danışmanı mesleki yeterlilik belgesi.',
          },
        },
      ],
    },
    {
      name: 'mesaj',
      type: 'textarea',
      label: 'Mesajı',
    },

    {
      name: 'notlar',
      type: 'textarea',
      label: 'İç notlar',
      admin: {
        description: '⚠️ Yalnızca panel kullanıcıları görür. Başvurucuya gösterilmez.',
      },
    },

    // ── KVKK ──────────────────────────────────────────────────────────
    {
      name: 'kvkkOnay',
      type: 'checkbox',
      label: 'KVKK aydınlatma metni onaylandı',
      required: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Onay olmadan kayıt oluşturulamaz.',
      },
    },
    {
      name: 'kvkkOnayTarihi',
      type: 'date',
      label: 'Onay tarihi',
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'saklamaBitis',
      type: 'date',
      label: 'Saklama süresi bitişi',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Bu tarihten sonra bakım görevi kaydı siler.',
      },
    },
  ],

  timestamps: true,
}
