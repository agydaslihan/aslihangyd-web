import type { CollectionConfig } from 'payload'

import { herkesOkur, yalnizcaPanel } from '@/lib/erisim'

/**
 * İlgi noktaları (POI) — okul, sağlık, market, park, sanayi, ulaşım.
 *
 * Mahalle sayfalarındaki "çevre" katmanını ve PostGIS yakınlık sorgularını
 * ("sanayiye 10 dakika") besler.
 *
 * ⚠️ Konum verisi elle veya resmî/açık kaynaklardan girilir. İlan
 * platformlarından otomatik veri çekilmez (CLAUDE.md kural 6).
 */

export const POI_TIPLERI = [
  { value: 'okul', label: 'Okul' },
  { value: 'universite', label: 'Üniversite' },
  { value: 'hastane', label: 'Hastane / sağlık' },
  { value: 'market', label: 'Market' },
  { value: 'avm', label: 'AVM' },
  { value: 'park', label: 'Park / yeşil alan' },
  { value: 'sanayi', label: 'Sanayi / OSB' },
  { value: 'durak', label: 'Toplu taşıma durağı' },
  { value: 'istasyon', label: 'Tren istasyonu' },
  { value: 'havalimani', label: 'Havalimanı' },
  { value: 'resmi', label: 'Resmî kurum' },
] as const

export type PoiTipi = (typeof POI_TIPLERI)[number]['value']

/** Yatırım skorunda "sosyal donatı" bileşenine giren tipler (Faz 4). */
export const SOSYAL_DONATI_TIPLERI = ['okul', 'hastane', 'market', 'avm', 'park'] as const

/** "Ulaşım" bileşenine giren tipler. */
export const ULASIM_TIPLERI = ['durak', 'istasyon', 'havalimani'] as const

export const IlgiNoktalari: CollectionConfig = {
  slug: 'ilgi-noktalari',
  labels: { singular: 'İlgi Noktası', plural: 'İlgi Noktaları' },

  access: {
    read: herkesOkur,
    create: yalnizcaPanel,
    update: yalnizcaPanel,
    delete: yalnizcaPanel,
  },

  admin: {
    useAsTitle: 'ad',
    defaultColumns: ['ad', 'tip', 'mahalle', 'updatedAt'],
    description:
      'Haritadaki katmanlar ve mesafe hesapları bu kayıtlardan beslenir. ' +
      'Konum girilmemiş kayıtlar haritada gösterilmez.',
    listSearchableFields: ['ad'],
  },

  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'ad',
          type: 'text',
          label: 'Ad',
          required: true,
          admin: { width: '60%' },
        },
        {
          name: 'tip',
          type: 'select',
          label: 'Tip',
          required: true,
          index: true,
          options: [...POI_TIPLERI],
          admin: { width: '40%' },
        },
      ],
    },
    {
      name: 'konum',
      type: 'point',
      label: 'Konum',
      required: true,
      admin: {
        description: 'Haritadan seçin veya koordinat girin. Mesafe hesapları bu noktayı kullanır.',
      },
    },
    {
      name: 'mahalle',
      type: 'relationship',
      relationTo: 'mahalleler',
      label: 'Bulunduğu mahalle',
      index: true,
      admin: {
        description:
          'İsteğe bağlı. Mahalle sınırı tanımlıysa sistem bunu ileride otomatik belirleyebilir.',
      },
    },
    {
      name: 'onemli',
      type: 'checkbox',
      label: 'Öne çıkan nokta',
      defaultValue: false,
      admin: {
        description:
          'Şehir hastanesi, OSB, tren istasyonu gibi bölgenin değerini belirleyen noktalar. ' +
          'Mahalle sayfasında ayrıca vurgulanır.',
      },
    },
    {
      name: 'detay',
      type: 'textarea',
      label: 'Açıklama',
    },
  ],
}
