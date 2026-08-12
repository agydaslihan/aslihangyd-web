import type { CollectionConfig } from 'payload'

import { herkesOkur, yalnizcaYonetici } from '@/lib/erisim'
import { VERGI_PARAMETRELERI } from '@/lib/vergi/parametreler'

/**
 * Vergi ve harç parametreleri.
 *
 * ⚠️ CLAUDE.md kural 4: "Tapu harcı, DASK, istisna tutarları, gelir vergisi
 * dilimleri → hepsi TaxParameters koleksiyonunda, CMS'ten düzenlenebilir."
 *
 * Bu oranlar her yıl değişir. Koda gömülselerdi, her değişiklikte yeni bir
 * sürüm çıkmak gerekirdi ve bir gün mutlaka unutulurdu — hesaplayıcılar
 * sessizce yanlış rakam üretmeye başlardı.
 *
 * Parametre listesi `src/lib/vergi/parametreler.ts` kayıt defterinden gelir;
 * serbest metin değil, seçim listesidir. Yazım hatası yüzünden bulunamayan
 * bir parametre, hesaplayıcının sessizce çalışmaması demek olurdu.
 */
export const VergiParametreleri: CollectionConfig = {
  slug: 'vergi-parametreleri',
  labels: { singular: 'Vergi Parametresi', plural: 'Vergi Parametreleri' },

  access: {
    // Herkese açık: hesaplayıcılar bunları okur ve değerler zaten sitede
    // görünür. Gizli bir bilgi değil, tersine şeffaflığı artıran bir veri.
    read: herkesOkur,
    create: yalnizcaYonetici,
    update: yalnizcaYonetici,
    // ⚠️ Yalnızca yönetici: vergi oranları hesaplayıcıları besliyor; yanlış oran yatırımcıya yanlış rakam gösterir.
    delete: yalnizcaYonetici,
  },

  admin: {
    useAsTitle: 'anahtar',
    defaultColumns: ['anahtar', 'deger', 'gecerlilikYili', 'guncellemeTarihi'],
    description:
      'Hesaplayıcıların kullandığı oran ve tutarlar. Bir parametre girilmemişse ' +
      'ilgili hesaplayıcı çalışmaz ve ziyaretçiye eksik olanı söyler — yanlış rakam üretmez.',
    listSearchableFields: ['anahtar', 'aciklama'],
  },

  fields: [
    {
      name: 'anahtar',
      type: 'select',
      label: 'Parametre',
      required: true,
      unique: true,
      index: true,
      options: VERGI_PARAMETRELERI.map((tanim) => ({
        value: tanim.anahtar,
        label: tanim.etiket,
      })),
      admin: {
        description: 'Hangi oran/tutar olduğunu seçin. Liste kod tarafında tanımlıdır.',
      },
    },
    {
      name: 'deger',
      type: 'number',
      label: 'Değer',
      admin: {
        description:
          'ORAN ise ondalık girin: %2 için 0,02 — %20 için 0,2. ' +
          'TUTAR ise TL olarak girin. Dilim türü parametrede bu alan boş kalır.',
        condition: (_veri, kardes) => kardes?.anahtar !== 'gelir_vergisi_dilimleri',
      },
    },
    {
      name: 'dilimler',
      type: 'array',
      label: 'Vergi dilimleri',
      labels: { singular: 'Dilim', plural: 'Dilimler' },
      admin: {
        description:
          'Artan oranlı tarife. Her dilim için ÜST SINIR ve ORAN girin. ' +
          'Son dilimin üst sınırını BOŞ bırakın ("ve üzeri" anlamına gelir). ' +
          'Sıralama önemli değil, sistem kendisi sıralar.',
        condition: (_veri, kardes) => kardes?.anahtar === 'gelir_vergisi_dilimleri',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'ustSinir',
              type: 'number',
              label: 'Üst sınır (₺)',
              min: 0,
              admin: { width: '50%', description: 'En üst dilimde boş bırakın.' },
            },
            {
              name: 'oran',
              type: 'number',
              label: 'Oran (ondalık)',
              required: true,
              min: 0,
              max: 1,
              admin: { width: '50%', description: '%15 için 0,15' },
            },
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'gecerlilikYili',
          type: 'number',
          label: 'Geçerlilik yılı',
          required: true,
          admin: {
            width: '50%',
            description: 'Bu değer hangi yıl için geçerli? Örn: 2026',
          },
        },
        {
          name: 'guncellemeTarihi',
          type: 'date',
          label: 'Son güncelleme',
          required: true,
          admin: {
            width: '50%',
            date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMMM yyyy' },
            description:
              'Hesaplayıcı sayfalarında "veriler [tarih] itibarıyladır" ibaresinde gösterilir.',
          },
        },
      ],
    },
    {
      name: 'kaynak',
      type: 'text',
      label: 'Kaynak',
      admin: {
        description:
          'Bu değeri nereden aldınız? Örn: "Gelir İdaresi Başkanlığı 2026 tebliği". ' +
          'Bir gazeteci veya müşteri sorduğunda cevabınız net olsun.',
      },
    },
    {
      name: 'aciklama',
      type: 'textarea',
      label: 'Not',
    },
  ],
}
