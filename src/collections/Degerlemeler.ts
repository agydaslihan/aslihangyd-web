import type { CollectionConfig } from 'payload'

import { BINA_DURUMLARI, KAT_TIPLERI } from '@/lib/degerleme/motor'
import { herkesOlusturur, yalnizcaPanel } from '@/lib/erisim'
import { saklamaBitisi } from '@/lib/kvkk/saklama'

/**
 * Değerleme talepleri — portföy edinme motoru.
 *
 * İki tür kayıt tutar:
 *  1. **İletişimsiz kayıt** — ziyaretçi aracı kullandı, sonucu gördü, iletişim
 *     bırakmadı. Kişisel veri içermez; hangi mahallelerde ne aranıyor
 *     bilgisini verir. Bu, tek başına değerli bir sinyal.
 *  2. **İletişimli kayıt** — ziyaretçi gerçek değerleme istedi. Kişisel veri
 *     içerir ve KVKK kuralları uygulanır.
 *
 * ⚠️ Sonucu görmek için iletişim bilgisi ZORUNLU DEĞİL (CLAUDE.md kural 6b).
 * Kayıt, sonuç gösterildikten sonra ve arka planda oluşturulur.
 */
export const Degerlemeler: CollectionConfig = {
  slug: 'degerlemeler',
  labels: { singular: 'Değerleme', plural: 'Değerlemeler' },

  access: {
    create: herkesOlusturur,
    read: yalnizcaPanel,
    update: yalnizcaPanel,
    delete: yalnizcaPanel,
  },

  admin: {
    useAsTitle: 'ozet',
    defaultColumns: ['ozet', 'mahalle', 'iletisimVar', 'durum', 'createdAt'],
    description:
      'Siteden yapılan değerleme talepleri. İletişim bilgisi olmayan kayıtlar da ' +
      'değerlidir: hangi mahallede ne tür taşınmaz sorgulandığını gösterir.',
  },

  hooks: {
    beforeChange: [
      ({ data, operation, originalDoc }) => {
        const kayit = { ...(originalDoc ?? {}), ...data } as Record<string, unknown>

        // Panelde okunabilir bir başlık — useAsTitle için.
        const parcalar = [
          typeof kayit.brutM2 === 'number' ? `${kayit.brutM2} m²` : null,
          typeof kayit.odaSayisi === 'string' ? kayit.odaSayisi : null,
        ].filter(Boolean)

        const ozet = parcalar.length > 0 ? parcalar.join(' · ') : 'Değerleme talebi'

        if (operation !== 'create') return { ...data, ozet }

        // KVKK: kişisel veri yalnızca iletişim bırakıldığında oluşur;
        // saklama süresi de yalnızca o zaman anlamlıdır.
        const iletisimVar =
          typeof kayit.telefon === 'string' && kayit.telefon.trim() !== ''
            ? true
            : typeof kayit.eposta === 'string' && kayit.eposta.trim() !== ''

        if (!iletisimVar) {
          return { ...data, ozet, iletisimVar: false }
        }

        const onayAni = new Date()
        return {
          ...data,
          ozet,
          iletisimVar: true,
          kvkkOnayTarihi: onayAni.toISOString(),
          saklamaBitis: saklamaBitisi(onayAni).toISOString(),
        }
      },
    ],
  },

  fields: [
    {
      name: 'durum',
      type: 'select',
      label: 'Takip durumu',
      defaultValue: 'yeni',
      index: true,
      options: [
        { value: 'yeni', label: 'Yeni' },
        { value: 'incelendi', label: 'İncelendi' },
        { value: 'arandi', label: 'Arandı' },
        { value: 'randevu', label: 'Randevu verildi' },
        { value: 'portfoye_alindi', label: 'Portföye alındı' },
        { value: 'kapandi', label: 'Kapandı' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'iletisimVar',
      type: 'checkbox',
      label: 'İletişim bilgisi bırakıldı',
      defaultValue: false,
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'İşaretsiz kayıtlar anonimdir; yalnızca talep sinyali taşır.',
      },
    },
    { name: 'ozet', type: 'text', label: 'Özet', admin: { hidden: true } },

    {
      type: 'tabs',
      tabs: [
        {
          label: 'Taşınmaz',
          fields: [
            {
              name: 'mahalle',
              type: 'relationship',
              relationTo: 'mahalleler',
              label: 'Mahalle',
              index: true,
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'brutM2',
                  type: 'number',
                  label: 'Brüt m²',
                  min: 0,
                  admin: { width: '50%' },
                },
                {
                  name: 'odaSayisi',
                  type: 'text',
                  label: 'Oda sayısı',
                  admin: { width: '50%' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'kat',
                  type: 'select',
                  label: 'Kat',
                  options: [...KAT_TIPLERI],
                  admin: { width: '33%' },
                },
                {
                  name: 'binaYasi',
                  type: 'number',
                  label: 'Bina yaşı',
                  min: 0,
                  admin: { width: '33%' },
                },
                {
                  name: 'yapiDurumu',
                  type: 'select',
                  label: 'Yapı durumu',
                  options: [...BINA_DURUMLARI],
                  admin: { width: '34%' },
                },
              ],
            },
            {
              name: 'adresNotu',
              type: 'text',
              label: 'Adres notu (ziyaretçinin yazdığı)',
            },
          ],
        },

        {
          label: 'Sonuç',
          description: 'Ziyaretçiye gösterilen tahmin. Sonradan değiştirilmez.',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'tahminiAlt',
                  type: 'number',
                  label: 'Tahmini alt değer (₺)',
                  admin: { width: '50%', readOnly: true },
                },
                {
                  name: 'tahminiUst',
                  type: 'number',
                  label: 'Tahmini üst değer (₺)',
                  admin: { width: '50%', readOnly: true },
                },
              ],
            },
            {
              name: 'guvenDuzeyi',
              type: 'text',
              label: 'Güven düzeyi',
              admin: { readOnly: true },
            },
            {
              name: 'gerceklesenDeger',
              type: 'number',
              label: 'Gerçekleşen değer (₺)',
              admin: {
                description:
                  'İşlem gerçekleştiyse buraya yazın. Bu, modelin ne kadar isabetli ' +
                  'olduğunu ölçmenin tek yolu — zamanla katsayıları buna göre düzeltin.',
              },
            },
            {
              name: 'notlar',
              type: 'textarea',
              label: 'Notlar',
            },
          ],
        },

        {
          label: 'İletişim (KVKK)',
          description:
            'Ziyaretçi iletişim bilgisi bırakmadıysa bu sekme boştur — ve bu normaldir. ' +
            'Sonucu görmek için iletişim bilgisi istemiyoruz.',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'adSoyad', type: 'text', label: 'Ad soyad', admin: { width: '50%' } },
                { name: 'telefon', type: 'text', label: 'Telefon', admin: { width: '50%' } },
              ],
            },
            { name: 'eposta', type: 'email', label: 'E-posta' },
            {
              name: 'kvkkOnay',
              type: 'checkbox',
              label: 'Aydınlatma metni onaylandı',
              defaultValue: false,
              admin: { readOnly: true },
            },
            {
              name: 'kvkkOnayTarihi',
              type: 'date',
              label: 'Onay tarihi',
              admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
            },
            {
              name: 'saklamaBitis',
              type: 'date',
              label: 'Saklama süresi bitişi',
              index: true,
              admin: {
                readOnly: true,
                date: { pickerAppearance: 'dayOnly' },
                description: 'Bu tarihten sonra kişisel veriler otomatik silinir.',
              },
            },
          ],
        },
      ],
    },
  ],
}
