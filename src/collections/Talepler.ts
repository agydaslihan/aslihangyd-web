import { APIError } from 'payload'
import type { CollectionConfig } from 'payload'

import { herkesOlusturur, yalnizcaPanel } from '@/lib/erisim'
import { talepSkorla } from '@/lib/crm/skorlama'
import { saklamaBitisi } from '@/lib/kvkk/saklama'
import { TALEP_DURUMLARI, TALEP_KAYNAKLARI, TALEP_TIPLERI } from '@/lib/secenekler'

/**
 * Talepler (lead) — site üzerinden gelen iletişim kayıtları.
 *
 * ⚠️ KİŞİSEL VERİ İÇERİR. KVKK gereği:
 *  - Kayıt yalnızca açık rıza (`kvkkOnay`) ile oluşturulabilir — hook zorlar.
 *  - Onay tarihi ve saklama bitiş tarihi otomatik yazılır, elle değiştirilemez.
 *  - Süresi dolan kayıtlar bakım göreviyle silinir.
 *  - `read` erişimi yalnızca panel kullanıcısına açıktır; oluşturma herkese
 *    açıktır ama oluşturan kendi kaydını dahi geri okuyamaz.
 */
export const Talepler: CollectionConfig = {
  slug: 'talepler',
  labels: { singular: 'Talep', plural: 'Talepler' },

  access: {
    // Form gönderimi herkese açık; okuma kesinlikle değil.
    create: herkesOlusturur,
    read: yalnizcaPanel,
    update: yalnizcaPanel,
    delete: yalnizcaPanel,
  },

  admin: {
    useAsTitle: 'adSoyad',
    defaultColumns: ['adSoyad', 'tip', 'durum', 'telefon', 'createdAt'],
    description:
      'Siteden gelen talepler. Kişisel veri içerir — dışarı aktarırken KVKK yükümlülüklerini gözetin.',
    listSearchableFields: ['adSoyad', 'telefon', 'eposta'],
  },

  hooks: {
    beforeChange: [
      ({ data, operation, originalDoc }) => {
        const kayit = { ...(originalDoc ?? {}), ...data } as Record<string, unknown>

        // Skor her kaydetmede yeniden hesaplanır: Aslıhan panelde bütçe veya
        // not eklediğinde skor güncel kalsın.
        const skor = talepSkorla({
          telefon: typeof kayit.telefon === 'string' ? kayit.telefon : null,
          eposta: typeof kayit.eposta === 'string' ? kayit.eposta : null,
          mesaj: typeof kayit.mesaj === 'string' ? kayit.mesaj : null,
          tip: typeof kayit.tip === 'string' ? kayit.tip : null,
          butceMin: typeof kayit.butceMin === 'number' ? kayit.butceMin : null,
          butceMax: typeof kayit.butceMax === 'number' ? kayit.butceMax : null,
          ilgiliIlanVar: kayit.ilgiliIlan !== null && kayit.ilgiliIlan !== undefined,
          ilgiliMahalleVar: kayit.ilgiliMahalle !== null && kayit.ilgiliMahalle !== undefined,
          pazarlamaOnayi: kayit.pazarlamaOnayi === true,
        }).toplam

        if (operation === 'create') {
          // Açık rıza olmadan kişisel veri işlenmez. Bu kontrol arayüzdeki
          // onay kutusundan bağımsızdır: API'ye doğrudan istek atılsa da geçerlidir.
          if (kayit.kvkkOnay !== true) {
            throw new APIError(
              'Talebi alabilmemiz için kişisel verilerin işlenmesine ilişkin aydınlatma metnini ' +
                'onaylamanız gerekiyor.',
              400,
              undefined,
              true,
            )
          }

          const onayAni = new Date()
          return {
            ...data,
            skor,
            kvkkOnayTarihi: onayAni.toISOString(),
            saklamaBitis: saklamaBitisi(onayAni).toISOString(),
          }
        }

        // Güncellemede onay bilgileri korunur — geçmişe dönük değiştirilemez.
        return {
          ...data,
          skor,
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
      label: 'Takip durumu',
      required: true,
      defaultValue: 'yeni',
      index: true,
      options: [...TALEP_DURUMLARI],
      admin: { position: 'sidebar' },
    },
    {
      name: 'skor',
      type: 'number',
      label: 'Talep skoru',
      min: 0,
      max: 100,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description:
          'Otomatik hesaplanır (0-100). Talepleri SIRALAMAK içindir, elemek için değil — ' +
          'en kısa mesajı yazan kişi en hazır müşteri olabilir. Bileşenler: telefon, ' +
          'e-posta, mesaj ayrıntısı, bütçe, hedef belirginliği, talep tipi.',
      },
    },
    {
      name: 'sonTemas',
      type: 'date',
      label: 'Son temas',
      admin: { position: 'sidebar' },
    },

    {
      type: 'tabs',
      tabs: [
        {
          label: 'Talep',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'adSoyad',
                  type: 'text',
                  label: 'Ad soyad',
                  required: true,
                  admin: { width: '50%' },
                },
                {
                  name: 'tip',
                  type: 'select',
                  label: 'Talep tipi',
                  required: true,
                  defaultValue: 'genel',
                  index: true,
                  options: [...TALEP_TIPLERI],
                  admin: { width: '50%' },
                },
              ],
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
              name: 'mesaj',
              type: 'textarea',
              label: 'Mesaj',
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'ilgiliIlan',
                  type: 'relationship',
                  relationTo: 'ilanlar',
                  label: 'İlgili ilan',
                  admin: { width: '50%' },
                },
                {
                  name: 'ilgiliMahalle',
                  type: 'relationship',
                  relationTo: 'mahalleler',
                  label: 'İlgili mahalle',
                  admin: { width: '50%' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'butceMin',
                  type: 'number',
                  label: 'Bütçe — alt sınır (₺)',
                  min: 0,
                  admin: { width: '50%' },
                },
                {
                  name: 'butceMax',
                  type: 'number',
                  label: 'Bütçe — üst sınır (₺)',
                  min: 0,
                  admin: { width: '50%' },
                },
              ],
            },
            {
              name: 'kaynak',
              type: 'select',
              label: 'Geliş kaynağı',
              defaultValue: 'dogrudan',
              options: [...TALEP_KAYNAKLARI],
            },
            {
              name: 'gonderildigiSayfa',
              type: 'text',
              label: 'Formun doldurulduğu sayfa',
              admin: { readOnly: true },
            },
          ],
        },

        {
          label: 'KVKK',
          description:
            'Bu alanlar kaydın hukuki dayanağıdır. Otomatik doldurulur ve sonradan değiştirilemez.',
          fields: [
            {
              name: 'kvkkOnay',
              type: 'checkbox',
              label: 'Aydınlatma metni onaylandı',
              required: true,
              defaultValue: false,
              admin: { readOnly: true },
            },
            {
              name: 'kvkkOnayTarihi',
              type: 'date',
              label: 'Onay tarihi',
              admin: {
                readOnly: true,
                date: { pickerAppearance: 'dayAndTime', displayFormat: 'd MMMM yyyy HH:mm' },
              },
            },
            {
              name: 'saklamaBitis',
              type: 'date',
              label: 'Saklama süresi bitişi',
              index: true,
              admin: {
                readOnly: true,
                date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMMM yyyy' },
                description:
                  'Bu tarihten sonra kayıt otomatik silinir. KVKK: veri, amaç için gerekli süreden ' +
                  'fazla saklanamaz.',
              },
            },
            {
              name: 'pazarlamaOnayi',
              type: 'checkbox',
              label: 'Ticari elektronik ileti (bülten) onayı',
              defaultValue: false,
              admin: {
                readOnly: true,
                description:
                  'Ayrı bir onaydır. İşaretli değilse bu kişiye bülten/kampanya gönderilemez.',
              },
            },
          ],
        },

        {
          label: 'Notlar',
          fields: [
            {
              name: 'notlar',
              type: 'array',
              label: 'Görüşme notları',
              labels: { singular: 'Not', plural: 'Notlar' },
              fields: [
                {
                  name: 'tarih',
                  type: 'date',
                  label: 'Tarih',
                  admin: { date: { pickerAppearance: 'dayAndTime' } },
                },
                { name: 'metin', type: 'textarea', label: 'Not', required: true },
              ],
            },
          ],
        },
      ],
    },
  ],
}
