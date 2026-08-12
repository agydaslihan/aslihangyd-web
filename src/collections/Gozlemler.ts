import type { CollectionConfig } from 'payload'

import {
  GOZLEM_KAYNAKLARI,
  GOZLEM_TIPLERI,
  GUVEN_SEVIYELERI,
  ODA_TIPLERI,
} from '@/lib/endeks/tipler'
import { m2FiyatiHesapla } from '@/lib/endeks/kalite'
import { yalnizcaPanel, yalnizcaYoneticiSiler } from '@/lib/erisim'

/**
 * Gözlemler — Çorlu Konut Endeksi'nin ham verisi.
 *
 * ⚠️ Bu koleksiyon ziyaretçiye KAPALI. Tek tek gözlemler asla yayınlanmaz;
 * yalnızca toplulaştırılmış göstergeler (medyan, endeks) yayınlanır.
 * (ENDEKS-VERI-YONETIMI.md §8)
 *
 * ⚠️ Veri girişi ELLE yapılır. İlan platformlarından otomatik veri çekme
 * kodu YAZILMAZ (CLAUDE.md kural 6): kullanım koşulu ihlali ve veri tabanı
 * hakkı riski. Sayı toplanır, içerik toplanmaz.
 *
 * Hedef: kayıt başına 15 saniye. Bu yüzden alan sayısı asgaride ve
 * m² fiyatı otomatik hesaplanıyor (yanlış giriş anında fark edilsin).
 */
export const Gozlemler: CollectionConfig = {
  slug: 'gozlemler',
  labels: { singular: 'Gözlem', plural: 'Gözlemler' },

  access: {
    // Hiçbir okuma yolu ziyaretçiye açık değil.
    read: yalnizcaPanel,
    create: yalnizcaPanel,
    update: yalnizcaPanel,
    // ⚠️ Silme yalnızca yöneticide — bkz. lib/erisim.ts gerekçesi.
    delete: yalnizcaYoneticiSiler,
  },

  admin: {
    useAsTitle: 'ozet',
    defaultColumns: ['ozet', 'mahalle', 'tip', 'm2Fiyati', 'gozlemTarihi'],
    description:
      'Endeksin ham verisi. Tek tek kayıtlar asla yayınlanmaz — yalnızca toplulaştırılmış ' +
      'göstergeler yayınlanır. Haftalık hedef: 30 gözlem.',
    listSearchableFields: ['ozet'],
    pagination: { defaultLimit: 50 },
  },

  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        const kayit = { ...(originalDoc ?? {}), ...data } as Record<string, unknown>

        const fiyat = typeof kayit.fiyat === 'number' ? kayit.fiyat : 0
        const m2 = typeof kayit.m2 === 'number' ? kayit.m2 : 0
        const m2Fiyati = m2FiyatiHesapla(fiyat, m2)

        // Endeks ayları üzerinden hesaplanır; gözlem tarihinden türetiyoruz
        // ki motor her seferinde tarih ayrıştırmasın.
        const tarih = typeof kayit.gozlemTarihi === 'string' ? kayit.gozlemTarihi : null
        const ay = tarih ? tarih.slice(0, 7) : null

        const parcalar = [
          typeof kayit.odaTipi === 'string' ? kayit.odaTipi : null,
          m2 > 0 ? `${m2} m²` : null,
          m2Fiyati ? `${Math.round(m2Fiyati).toLocaleString('tr-TR')} TL/m²` : null,
        ].filter(Boolean)

        return {
          ...data,
          m2Fiyati,
          ay,
          ozet: parcalar.join(' · ') || 'Gözlem',
        }
      },
    ],
  },

  fields: [
    // ── Hızlı giriş alanları ──
    // Sıralama bilinçli: mahalle ve tip en üstte çünkü arka arkaya giriş
    // yaparken bunlar sabit kalır (ENDEKS-VERI-YONETIMI.md §4).
    {
      type: 'row',
      fields: [
        {
          name: 'mahalle',
          type: 'relationship',
          relationTo: 'mahalleler',
          label: 'Mahalle',
          required: true,
          index: true,
          admin: { width: '50%' },
        },
        {
          name: 'tip',
          type: 'select',
          label: 'Tip',
          required: true,
          defaultValue: 'satilik',
          index: true,
          options: [...GOZLEM_TIPLERI],
          admin: { width: '50%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'odaTipi',
          type: 'select',
          label: 'Oda tipi',
          required: true,
          index: true,
          options: ODA_TIPLERI.map((oda) => ({ value: oda, label: oda })),
          admin: { width: '33%' },
        },
        {
          name: 'm2',
          type: 'number',
          label: 'Brüt m²',
          required: true,
          min: 1,
          admin: { width: '33%' },
        },
        {
          name: 'fiyat',
          type: 'number',
          label: 'Fiyat (₺)',
          required: true,
          min: 1,
          admin: {
            width: '34%',
            description: 'Kiralıkta aylık kira bedeli.',
          },
        },
      ],
    },
    {
      name: 'm2Fiyati',
      type: 'number',
      label: 'm² fiyatı (₺)',
      admin: {
        readOnly: true,
        description:
          'Otomatik hesaplanır. Beklediğinizden çok farklıysa m² veya fiyatı yanlış girmiş olabilirsiniz.',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'gozlemTarihi',
          type: 'date',
          label: 'Gözlem tarihi',
          required: true,
          index: true,
          defaultValue: () => new Date().toISOString(),
          admin: {
            width: '50%',
            date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMMM yyyy' },
          },
        },
        {
          name: 'kaynak',
          type: 'select',
          label: 'Kaynak',
          required: true,
          defaultValue: 'portal_ilan',
          index: true,
          options: [...GOZLEM_KAYNAKLARI],
          admin: {
            width: '50%',
            description:
              '⚠️ İstenen fiyat ile gerçekleşen fiyat AYRI serilerde hesaplanır. ' +
              'Karıştırmak endeksi sistematik olarak şişirir.',
          },
        },
      ],
    },

    // ── İsteğe bağlı ayrıntılar ──
    {
      type: 'collapsible',
      label: 'Ayrıntılar (isteğe bağlı)',
      admin: { initCollapsed: true },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'binaYasi',
              type: 'number',
              label: 'Bina yaşı',
              min: 0,
              admin: { width: '50%' },
            },
            {
              name: 'kat',
              type: 'text',
              label: 'Kat',
              admin: { width: '50%' },
            },
          ],
        },
        {
          name: 'guvenSeviyesi',
          type: 'select',
          label: 'Güven seviyesi',
          defaultValue: 'orta',
          options: [...GUVEN_SEVIYELERI],
          admin: {
            description:
              'Geriye dönük girilen kayıtları "Düşük" işaretleyin. Grafikte kesikli ' +
              'çizgiyle gösterilir ve gerçek gözlemle karıştırılmaz.',
          },
        },
        {
          name: 'notlar',
          type: 'textarea',
          label: 'Not',
          admin: {
            description:
              'Aykırı bir değer girdiyseniz sebebini yazın — altı ay sonra siz de ' +
              'hatırlamayacaksınız.',
          },
        },
      ],
    },

    // ── Türetilmiş ──
    {
      name: 'ay',
      type: 'text',
      label: 'Ay',
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Endeks hesabı bu alanı kullanır (YYYY-AA).',
      },
    },
    { name: 'ozet', type: 'text', admin: { hidden: true } },
  ],
}
